// Pipeline evaluation engine, running on a dedicated worker so heavy
// per-pixel processing never blocks the main thread.
//
// Compared to the old main-thread engine:
// - Images travel between stages as ImageBitmaps, so intermediate stages
//   no longer pay a canvas.toDataURL base64 encode + <img> decode round
//   trip per image per stage. Only the final viewer output is encoded.
// - Per-image work (load / transform / encode / AI upload) is bounded so
//   large batches don't exhaust memory.
// - Every new evaluation cooperatively cancels the previous one: stale
//   checks run between images and in-flight fetches are aborted.

import type {
  NodeInputs,
  NodeOutputs,
  PipelineEvaluateMessage,
  PipelineNodeDefinition,
  PipelineProgressPreview,
  PipelineViewerImagePayload,
  PipelineWorkerOutbound,
} from "@/types/types";
import { VIEWER_NODE_TYPES } from "@/types/types";
import { parse } from "exifr";

// ============================================================
// Worker scope
// ============================================================

// The app compiles against the DOM lib (where `self` is Window), so the
// worker's global scope is described structurally here instead.
type WorkerScope = {
  postMessage: (message: PipelineWorkerOutbound) => void;
  onmessage: ((event: MessageEvent<PipelineEvaluateMessage>) => void) | null;
};

const workerScope = self as unknown as WorkerScope;


// ============================================================
// In-worker image representation
// ============================================================

// Inside the worker, images are ImageBitmaps: cheap GPU-side handles
// that can be drawn straight onto an OffscreenCanvas.
type WorkerImage = {
  bitmap: ImageBitmap;
  width: number;
  height: number;
  name?: string;
  exif?: Record<string, unknown>;
  exifSegment?: Uint8Array;
  // Stable identity (thumbnail URL / file fingerprint) used as the
  // AI node result-cache key.
  cacheKey?: string;
};

const DEFAULT_PHASE_CACHE_BYTES = 384 * 1024 * 1024;
const DEFAULT_AI_CACHE_BYTES = 128 * 1024 * 1024;
const aiImageCaches = new Set<Map<string, WorkerImage>>();
const retiredBitmaps = new Set<ImageBitmap>();

function getImageSetKey(image: WorkerImage): string | ImageBitmap {
  return image.cacheKey ?? image.name ?? image.bitmap;
}

// Bounds in-flight image work inside an individual node. The worker-wide
// task queue below limits how many pipeline nodes can run at once.
const DEFAULT_IMAGE_CONCURRENCY = Math.max(
  2,
  Math.min(4, navigator.hardwareConcurrency ?? 4)
);
let imageConcurrencyLimit = DEFAULT_IMAGE_CONCURRENCY;
let phaseCacheLimitBytes = DEFAULT_PHASE_CACHE_BYTES;
let aiCacheLimitBytes = DEFAULT_AI_CACHE_BYTES;
let viewerMaxDimension = 1600;
let progressPreviewMaxDimension = 480;
let progressPreviewQuality = 0.84;

class PipelineTaskQueue {
  private active = 0;
  private readonly waiters: Array<() => void> = [];

  constructor(private readonly limit: number) {}

  async run<T>(evaluationId: number, task: () => Promise<T>): Promise<T> {
    throwIfStale(evaluationId);

    if (this.active >= this.limit) {
      await new Promise<void>((resolve) => this.waiters.push(resolve));
      throwIfStale(evaluationId);
    }

    this.active += 1;

    try {
      return await task();
    } finally {
      this.active -= 1;
      this.waiters.shift()?.();
    }
  }
}

class AIRequestQueue {
  private active = 0;
  private nextStartAt = 0;
  private readonly waiters: Array<() => void> = [];

  constructor(
    private readonly limit: number,
    private readonly delayMs: number
  ) {}

  async run<T>(evaluationId: number, task: () => Promise<T>): Promise<T> {
    throwIfStale(evaluationId);

    if (this.active >= this.limit) {
      await new Promise<void>((resolve) => this.waiters.push(resolve));
      throwIfStale(evaluationId);
    }

    this.active += 1;

    try {
      const now = Date.now();
      const startAt = Math.max(now, this.nextStartAt);
      this.nextStartAt = startAt + this.delayMs;

      if (startAt > now) {
        await new Promise<void>((resolve) => setTimeout(resolve, startAt - now));
        throwIfStale(evaluationId);
      }

      return await task();
    } finally {
      this.active -= 1;
      this.waiters.shift()?.();
    }
  }
}

// ============================================================
// Cooperative cancellation
// ============================================================

class StaleEvaluationError extends Error {
  constructor() {
    super("Pipeline evaluation superseded");
  }
}

let latestEvaluationId = 0;
let activeController: AbortController | null = null;

function throwIfStale(evaluationId: number) {
  if (evaluationId !== latestEvaluationId) {
    throw new StaleEvaluationError();
  }
}

// Promise.all over items with bounded concurrency and a staleness
// check before each item starts.
async function mapWithConcurrency<T, R>(
  items: T[],
  evaluationId: number,
  fn: (item: T) => Promise<R>
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let nextIndex = 0;

  const lanes = Array.from(
    { length: Math.min(imageConcurrencyLimit, items.length) },
    async () => {
      while (nextIndex < items.length) {
        throwIfStale(evaluationId);
        const index = nextIndex++;
        results[index] = await fn(items[index]);
      }
    }
  );

  await Promise.all(lanes);

  return results;
}

const BATCH_INPUT_KEYS = ["image", "image-1", "image-2", "image-3", "image-4"];
const FILE_SOURCE_NODE_TYPES = new Set([
  "source",
  "hot-folder-read",
]);

function getBatchInputKeys(nodeType: string | undefined, inputs: NodeInputs): string[] {
  if (FILE_SOURCE_NODE_TYPES.has(nodeType ?? "")) {
    return ["files"];
  }

  if (nodeType === "selection") {
    return ["photos"];
  }

  return BATCH_INPUT_KEYS.filter((key) => Array.isArray(inputs[key]));
}

async function executeInPhotoBatches(
  definition: PipelineNodeDefinition,
  nodeType: string | undefined,
  inputs: NodeInputs,
  evaluationId: number,
  batchSize: number,
  taskQueue: PipelineTaskQueue
): Promise<NodeOutputs> {
  const batchKeys = getBatchInputKeys(nodeType, inputs);

  if (batchKeys.length === 0) {
    return taskQueue.run(evaluationId, () => definition.execute(inputs));
  }

  const normalizedBatchInputs = batchKeys.map((key) => [
    key,
    Array.isArray(inputs[key]) ? inputs[key] as unknown[] : [],
  ] as const);
  const batchLength = Math.max(
    ...normalizedBatchInputs.map(([, value]) => value.length)
  );
  const merged: NodeOutputs = {};

  for (let start = 0; start < batchLength; start += batchSize) {
    throwIfStale(evaluationId);

    const batchInputs = { ...inputs };
    for (const [key, value] of normalizedBatchInputs) {
      batchInputs[key] = value.slice(start, start + batchSize);
    }
    if (nodeType === "source") {
      batchInputs.sourceProgressOffset = start;
    }

    const result = await taskQueue.run(
      evaluationId,
      () => definition.execute(batchInputs)
    );

    for (const [key, value] of Object.entries(result)) {
      if (Array.isArray(value)) {
        const existing = Array.isArray(merged[key]) ? merged[key] as unknown[] : [];
        merged[key] = [...existing, ...value];
      } else {
        merged[key] = value;
      }
    }
  }

  return merged;
}

// ============================================================
// Image loading / rendering primitives (OffscreenCanvas-based)
// ============================================================

async function blobToWorkerImage(
  blob: Blob,
  name?: string,
  cacheKey?: string,
  exif?: Record<string, unknown>
): Promise<WorkerImage> {
  const bitmap = await createImageBitmap(blob);
  const exifSegment = await extractExifSegment(blob);

  return {
    bitmap,
    width: bitmap.width,
    height: bitmap.height,
    name,
    cacheKey,
    exif,
    exifSegment,
  };
}

async function extractExifSegment(blob: Blob): Promise<Uint8Array | undefined> {
  const bytes = new Uint8Array(await blob.arrayBuffer());

  if (bytes[0] !== 0xff || bytes[1] !== 0xd8) return undefined;

  let offset = 2;

  while (offset + 4 <= bytes.length) {
    if (bytes[offset] !== 0xff) {
      offset += 1;
      continue;
    }

    const marker = bytes[offset + 1];
    if (marker === 0xda || marker === 0xd9) break;

    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) {
      offset += 2;
      continue;
    }

    const segmentLength = (bytes[offset + 2] << 8) | bytes[offset + 3];
    const segmentEnd = offset + 2 + segmentLength;

    if (segmentEnd > bytes.length) break;

    if (
      marker === 0xe1 &&
      segmentLength >= 8 &&
      bytes[offset + 4] === 0x45 &&
      bytes[offset + 5] === 0x78 &&
      bytes[offset + 6] === 0x69 &&
      bytes[offset + 7] === 0x66 &&
      bytes[offset + 8] === 0x00 &&
      bytes[offset + 9] === 0x00
    ) {
      return bytes.slice(offset, segmentEnd);
    }

    offset = segmentEnd;
  }

  return undefined;
}

async function addExifSegment(blob: Blob, exifSegment: Uint8Array | undefined): Promise<Blob> {
  if (!exifSegment) return blob;

  const bytes = new Uint8Array(await blob.arrayBuffer());

  if (bytes[0] !== 0xff || bytes[1] !== 0xd8) return blob;

  return new Blob([
    bytes.slice(0, 2),
    exifSegment,
    bytes.slice(2),
  ], { type: "image/jpeg" });
}

async function loadFileImage(file: File): Promise<WorkerImage> {
  const image = await blobToWorkerImage(
    file,
    file.name,
    `file:${file.name}:${file.size}:${file.lastModified}`
  );

  try {
    image.exif = await parse(file);
  } catch {
    // Some image formats do not contain parseable EXIF data.
  }

  return image;
}

async function loadUrlImage(
  url: string,
  name: string | undefined,
  signal: AbortSignal
): Promise<WorkerImage> {
  const response = await fetch(url, { signal });

  if (!response.ok) {
    throw new Error(`Failed to load image from ${url} (${response.status})`);
  }

  const blob = await response.blob();
  const image = await blobToWorkerImage(blob, name, url);

  try {
    image.exif = await parse(blob);
  } catch {
    // Some image formats do not contain parseable EXIF data.
  }

  return image;
}

function createCanvas(
  width: number,
  height: number
): [OffscreenCanvas, OffscreenCanvasRenderingContext2D] {
  const canvas = new OffscreenCanvas(width, height);
  const ctx = canvas.getContext("2d");

  if (!ctx) {
    throw new Error("Could not create canvas context");
  }

  return [canvas, ctx];
}

// ============================================================
// AI image-edit nodes (photo editor, ...)
// ============================================================

const OPENAI_IMAGES_EDIT_URL = "https://api.openai.com/v1/images/edits";
const AI_IMAGE_EDIT_MODEL = "gpt-image-2";
const OPENAI_CHAT_COMPLETIONS_URL = "https://api.openai.com/v1/chat/completions";
const AI_ASK_MODEL = "gpt-4o-mini";

// Node types that share the passthru/apiKey data shape.
const AI_IMAGE_EDIT_NODE_TYPES = new Set(["ai-photo-editor"]);

function postProgress(
  nodeType: string,
  nodeId: string,
  evaluationId: number,
  runId: number,
  completed: number,
  total: number,
  preview?: PipelineProgressPreview
) {
  workerScope.postMessage({
    type: "progress",
    evaluationId,
    nodeType,
    nodeId,
    runId,
    completed,
    total,
    preview,
  });
}

async function imageToPreview(source: WorkerImage): Promise<PipelineProgressPreview> {
  const scale = Math.min(
    1,
    progressPreviewMaxDimension / Math.max(source.width, source.height)
  );
  const width = Math.max(1, Math.round(source.width * scale));
  const height = Math.max(1, Math.round(source.height * scale));
  const [canvas, ctx] = createCanvas(width, height);

  ctx.drawImage(source.bitmap, 0, 0, width, height);

  return {
    blob: await canvas.convertToBlob({ type: "image/jpeg", quality: progressPreviewQuality }),
    width,
    height,
    name: source.name,
  };
}

async function imageValueToBlob(source: WorkerImage): Promise<Blob> {
  const [canvas, ctx] = createCanvas(source.width, source.height);

  ctx.drawImage(source.bitmap, 0, 0);

  return canvas.convertToBlob({ type: "image/jpeg", quality: 0.92 });
}

async function imageValueToDataUrl(source: WorkerImage): Promise<string> {
  const blob = await imageValueToBlob(source);
  const bytes = new Uint8Array(await blob.arrayBuffer());
  let binary = "";

  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return `data:image/jpeg;base64,${btoa(binary)}`;
}

async function requestOpenAIClassification(
  source: WorkerImage,
  apiKey: string,
  question: string,
  signal: AbortSignal,
  evaluationId: number,
  requestQueue: AIRequestQueue
): Promise<boolean> {
  const imageUrl = await imageValueToDataUrl(source);
  const response = await requestQueue.run(
    evaluationId,
    () => fetch(OPENAI_CHAT_COMPLETIONS_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: AI_ASK_MODEL,
        temperature: 0,
        response_format: { type: "json_object" },
        messages: [{
          role: "user",
          content: [
            {
              type: "text",
              text: [
                "Answer the question about this photo.",
                "Return only valid JSON in exactly this form: {\"match\": true} or {\"match\": false}.",
                "Set match to true when the photo positively satisfies the question, otherwise set it to false.",
                `Question: ${question}`,
              ].join(" "),
            },
            { type: "image_url", image_url: { url: imageUrl, detail: "low" } },
          ],
        }],
      }),
      signal,
    })
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data.error?.message || `OpenAI classification failed (${response.status})`
    );
  }

  const content = data.choices?.[0]?.message?.content;

  if (typeof content !== "string") {
    throw new Error("OpenAI returned no classification");
  }

  const result = JSON.parse(content) as { match?: unknown };

  if (typeof result.match !== "boolean") {
    throw new Error("OpenAI returned an invalid classification");
  }

  return result.match;
}

function createAskAINodeDefinition(): PipelineNodeDefinition {
  let runSeq = 0;
  const cache = new Map<string, boolean>();

  return {
    async execute(inputs) {
      const sources = (inputs.image as WorkerImage[] | undefined) ?? [];

      if (sources.length === 0) return { positive: [], negative: [] };

      const apiKey = inputs.apiKey as string | undefined;
      const question = (inputs.question as string | undefined)?.trim() ?? "";
      const passthru = (inputs.passthru as boolean | undefined) ?? true;
      const nodeId = inputs.nodeId as string;
      const evaluationId = inputs.evaluationId as number;
      const signal = inputs.signal as AbortSignal;
      const requestQueue = inputs.aiRequestQueue as AIRequestQueue;

      if (passthru) {
        return { positive: sources, negative: [] };
      }

      if (!apiKey || !question) {
        console.error(`Ask AI: missing ${!apiKey ? "OpenAI API key" : "question"}`);
        return { positive: [], negative: [] };
      }

      const runId = ++runSeq;
      const total = sources.length;
      let completed = 0;

      postProgress("ask-ai", nodeId, evaluationId, runId, completed, total);

      const matches = await mapWithConcurrency(sources, evaluationId, async (source) => {
        const cacheKey = source.cacheKey
          ? `${source.cacheKey}:question:${question}`
          : undefined;
        let match = cacheKey ? cache.get(cacheKey) : undefined;

        if (match === undefined) {
          match = await requestOpenAIClassification(
            source,
            apiKey,
            question,
            signal,
            evaluationId,
            requestQueue
          );

          if (cacheKey) cache.set(cacheKey, match);
        }

        completed += 1;
        postProgress("ask-ai", nodeId, evaluationId, runId, completed, total);

        return match;
      });

      const positive = sources.filter((_, index) => matches[index]);
      const negative = sources.filter((_, index) => !matches[index]);

      return { positive, negative };
    },
  };
}

async function requestOpenAIImageEdit(
  source: WorkerImage,
  apiKey: string,
  prompt: string,
  signal: AbortSignal,
  evaluationId: number,
  requestQueue: AIRequestQueue
): Promise<WorkerImage> {
  const blob = await imageValueToBlob(source);

  const formData = new FormData();

  formData.append("model", AI_IMAGE_EDIT_MODEL);
  formData.append("prompt", prompt);
  formData.append("image[]", blob, "source.jpg");
  formData.append("size", "auto");
  formData.append("quality", "low");
  formData.append("output_format", "jpeg");
  formData.append("output_compression", "90");

  const response = await requestQueue.run(
    evaluationId,
    () => fetch(OPENAI_IMAGES_EDIT_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
      body: formData,
      signal,
    })
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data.error?.message || `OpenAI image edit failed (${response.status})`
    );
  }

  const base64 = data.data?.[0]?.b64_json;

  if (!base64) {
    throw new Error("OpenAI returned no image");
  }

  // Decode the base64 payload without the main thread's <img> element.
  const resultResponse = await fetch(`data:image/jpeg;base64,${base64}`);

  const image = await blobToWorkerImage(await resultResponse.blob(), source.name);
  image.exif = source.exif;
  image.exifSegment = source.exifSegment;
  return image;
}

// Builds a node definition for an OpenAI image-edit operation (colorize,
// denoise, ...). Each node type gets its own run counter and result
// cache, kept alive across evaluations so re-running the pipeline on an
// already-processed image reuses the cached result instead of calling
// OpenAI again.
function createAIImageEditNodeDefinition(
  nodeType: string,
  label: string,
  prompt: string | ((inputs: NodeInputs, source: WorkerImage) => string)
): PipelineNodeDefinition {
  let runSeq = 0;
  const cache = new Map<string, WorkerImage>();

  async function editImage(
    source: WorkerImage,
    apiKey: string,
    editPrompt: string,
    signal: AbortSignal,
    evaluationId: number,
    requestQueue: AIRequestQueue
  ): Promise<WorkerImage> {
    const cacheKey = source.cacheKey ? `${source.cacheKey}:prompt:${editPrompt}` : undefined;
    const cached = cacheKey ? cache.get(cacheKey) : undefined;

    if (cached) {
      return cached;
    }

    const edited = await requestOpenAIImageEdit(
      source,
      apiKey,
      editPrompt,
      signal,
      evaluationId,
      requestQueue
    );

    if (cacheKey) {
      cache.set(cacheKey, edited);
      evictAIImageCache();
    }

    return edited;
  }

  return {
    async execute(inputs) {
      const sources = (inputs.image as WorkerImage[] | undefined) ?? [];

      if (sources.length === 0) { return { image: [] } }

      const passthru = (inputs.passthru as boolean | undefined) ?? true;
      const nodeId = inputs.nodeId as string;
      const evaluationId = inputs.evaluationId as number;
      const signal = inputs.signal as AbortSignal;
      const requestQueue = inputs.aiRequestQueue as AIRequestQueue;

      if (passthru) {
        return { image: sources };
      }

      const apiKey = inputs.apiKey as string | undefined;

      if (!apiKey) {
        console.error(`${label}: missing OpenAI API key`);
        return { image: sources };
      }

      const runId = ++runSeq;
      const total = sources.length;
      let completed = 0;

      postProgress(nodeType, nodeId, evaluationId, runId, completed, total);

      const image = await mapWithConcurrency(
        sources,
        evaluationId,
        async (source) => {
          try {
            const editPrompt = typeof prompt === "function" ? prompt(inputs, source) : prompt;
            if (!editPrompt.trim()) {
              console.error(`${label}: missing edit prompt`);
              return source;
            }

            const edited = await editImage(
              source,
              apiKey,
              editPrompt,
              signal,
              evaluationId,
              requestQueue
            );

            postProgress(
              nodeType,
              nodeId,
              evaluationId,
              runId,
              completed,
              total,
              await imageToPreview(edited)
            );

            return edited;
          } catch (error) {
            // An aborted run is cancellation, not a per-image failure.
            if (signal.aborted) {
              throw new StaleEvaluationError();
            }

            console.error(`${label} failed for an image:`, error);
            return source;
          } finally {
            completed += 1;
            postProgress(nodeType, nodeId, evaluationId, runId, completed, total);
          }
        }
      );

      return { image };
    },
  };
}

// ============================================================
// Node implementations
// ============================================================

let sourceRunSeq = 0;
let viewerRunSeq = 0;

const nodeDefinitions: Record<string, PipelineNodeDefinition> = {

  source: {
    async execute(inputs) {
      const files = inputs.files as File[] | undefined;

      if (!files || files.length === 0) { return { image: [] } }

      const nodeId = inputs.nodeId as string;
      const evaluationId = inputs.evaluationId as number;
      const runId = (inputs.sourceProgressRunId as number | undefined) ?? ++sourceRunSeq;
      const total = (inputs.sourceProgressTotal as number | undefined) ?? files.length;
      const completedBeforeBatch = (inputs.sourceProgressOffset as number | undefined) ?? 0;
      let completed = 0;

      postProgress("source", nodeId, evaluationId, runId, completedBeforeBatch, total);

      const image = await mapWithConcurrency(
        files,
        inputs.evaluationId as number,
        async (file) => {
          try {
            return await loadFileImage(file);
          } finally {
            completed += 1;
            postProgress("source", nodeId, evaluationId, runId, completedBeforeBatch + completed, total);
          }
        }
      );

      return { image };
    },
  },

  "hot-folder-read": {
    async execute(inputs) {
      const files = inputs.files as File[] | undefined;

      if (!files || files.length === 0) { return { image: [] } }

      const image = await mapWithConcurrency(
        files,
        inputs.evaluationId as number,
        loadFileImage
      );

      return { image };
    },
  },

  selection: {
    async execute(inputs) {
      const photos = inputs.photos as undefined;

      if (!photos || photos.length === 0) { return { image: [] } }

      const signal = inputs.signal as AbortSignal;

      const image = await mapWithConcurrency(
        photos,
        inputs.evaluationId as number,
        (photo) => loadUrlImage(photo, photo.title, signal)
      );

      return { image };
    },
  },

  grouper: {
    async execute(inputs) {
      const imageInputs = ["image-1", "image-2", "image-3", "image-4"];
      const image = imageInputs.flatMap((input) => {
        const photoArray = inputs[input];

        return Array.isArray(photoArray)
          ? photoArray as WorkerImage[]
          : [];
      });

      return { image };
    },
  },

  "array-switch": {
    async execute(inputs) {
      const selectedInput = Number(inputs.selectedInput) === 2 ? "image-2" : "image-1";
      const image = inputs[selectedInput];

      return { image: Array.isArray(image) ? image as WorkerImage[] : [] };
    },
  },

  "array-and": {
    async execute(inputs) {
      const first = Array.isArray(inputs["image-1"]) ? inputs["image-1"] as WorkerImage[] : [];
      const second = Array.isArray(inputs["image-2"]) ? inputs["image-2"] as WorkerImage[] : [];
      const secondKeys = new Set(second.map(getImageSetKey));

      return { image: first.filter((image) => secondKeys.has(getImageSetKey(image))) };
    },
  },

  "array-and-not": {
    async execute(inputs) {
      const first = Array.isArray(inputs["image-1"]) ? inputs["image-1"] as WorkerImage[] : [];
      const second = Array.isArray(inputs["image-2"]) ? inputs["image-2"] as WorkerImage[] : [];
      const secondKeys = new Set(second.map(getImageSetKey));

      return { image: first.filter((image) => !secondKeys.has(getImageSetKey(image))) };
    },
  },

  "array-or": {
    async execute(inputs) {
      const first = Array.isArray(inputs["image-1"]) ? inputs["image-1"] as WorkerImage[] : [];
      const second = Array.isArray(inputs["image-2"]) ? inputs["image-2"] as WorkerImage[] : [];
      const seen = new Set<string | ImageBitmap>();
      const image = [...first, ...second].filter((item) => {
        const key = getImageSetKey(item);

        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });

      return { image };
    },
  },

  "gps-split": {
    async execute(inputs) {
      const images = (inputs.image as WorkerImage[] | undefined) ?? [];
      const hasCoordinate = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value);
      const getCoordinate = (image: WorkerImage, key: string) => image.exif?.[key];
      const withGps = images.filter((image) => {
        const latitude = getCoordinate(image, "latitude") ?? getCoordinate(image, "GPSLatitude");
        const longitude = getCoordinate(image, "longitude") ?? getCoordinate(image, "GPSLongitude");

        return hasCoordinate(latitude) && hasCoordinate(longitude)
          && latitude >= -90 && latitude <= 90
          && longitude >= -180 && longitude <= 180;
      });
      const withoutGps = images.filter((image) => !withGps.includes(image));

      return { withGps, withoutGps };
    },
  },


  "ai-photo-editor": createAIImageEditNodeDefinition(
    "ai-photo-editor",
    "AI Photo Editor",
    (inputs) => (inputs.prompt as string | undefined) ?? ""
  ),

  "ask-ai": createAskAINodeDefinition(),

  // The viewer passes images through; encoding for transport to the
  // main thread happens in the result-posting layer below.
  viewer: {
    async execute(inputs) {
      await Promise.resolve();

      return {
        image: (inputs.image as WorkerImage[] | undefined) ?? [],
      };
    },
  },

  "viewer-single": {
    async execute(inputs) {
      await Promise.resolve();

      return {
        image: (inputs.image as WorkerImage[] | undefined) ?? [],
      };
    },
  },

  "gps-map": {
    async execute(inputs) {
      await Promise.resolve();

      return {
        image: (inputs.image as WorkerImage[] | undefined) ?? [],
      };
    },
  },

  "hot-folder-write": {
    async execute(inputs) {
      await Promise.resolve();

      return {
        image: (inputs.image as WorkerImage[] | undefined) ?? [],
      };
    },
  },
};

// ============================================================
// Transport encoding (viewer output only)
// ============================================================

// JPEG keeps the per-image encode fast and the posted payload small
// for large batches; quality matches the AI upload path.
async function encodeImagesForTransport(
  images: WorkerImage[],
  evaluationId: number,
  batchSize: number,
  nodeId: string,
  jpegQuality: number
): Promise<PipelineViewerImagePayload[]> {
  const payload: PipelineViewerImagePayload[] = [];
  const runId = ++viewerRunSeq;
  const total = images.length;
  let completed = 0;

  postProgress("viewer", nodeId, evaluationId, runId, completed, total);

  for (let start = 0; start < images.length; start += batchSize) {
    throwIfStale(evaluationId);

    const batch = await mapWithConcurrency(
      images.slice(start, start + batchSize),
      evaluationId,
      async (image) => {
        try {
          const scale = Math.min(
            1,
            viewerMaxDimension / Math.max(image.width, image.height)
          );
          const previewWidth = Math.max(1, Math.round(image.width * scale));
          const previewHeight = Math.max(1, Math.round(image.height * scale));
          const [canvas, ctx] = createCanvas(previewWidth, previewHeight);

          ctx.drawImage(image.bitmap, 0, 0, previewWidth, previewHeight);

          const encodedBlob = await canvas.convertToBlob({
            type: "image/jpeg",
            quality: jpegQuality,
          });
          const blob = await addExifSegment(encodedBlob, image.exifSegment);

          return {
            blob,
            width: image.width,
            height: image.height,
            name: image.name,
            exif: image.exif,
          };
        } finally {
          completed += 1;
          postProgress("viewer", nodeId, evaluationId, runId, completed, total);
        }
      }
    );

    payload.push(...batch);
  }

  return payload;
}

// ============================================================
// Pipeline evaluator
// ============================================================

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

type CachedNodeOutput = {
  outputs: NodeOutputs;
};

// Keep phase results by their content signature rather than node id. This
// lets equivalent phases share the same in-worker ImageBitmaps across runs.
const phaseOutputCache = new Map<string, CachedNodeOutput>();

function getCachedPhaseOutput(signature: string): NodeOutputs | undefined {
  const cached = phaseOutputCache.get(signature);

  if (!cached) return undefined;

  // Refresh insertion order so frequently reused phases stay resident.
  phaseOutputCache.delete(signature);
  phaseOutputCache.set(signature, cached);

  return cached.outputs;
}

function cachePhaseOutput(signature: string, outputs: NodeOutputs) {
  const replaced = phaseOutputCache.get(signature);
  phaseOutputCache.delete(signature);
  phaseOutputCache.set(signature, { outputs });

  if (replaced && replaced.outputs !== outputs) {
    retireBitmaps(replaced.outputs);
  }

  while (getBitmapBytes(getCachedBitmapsFromPhaseCache()) > phaseCacheLimitBytes) {
    const oldestSignature = phaseOutputCache.keys().next().value;

    if (oldestSignature === undefined) break;

    const evicted = phaseOutputCache.get(oldestSignature);
    phaseOutputCache.delete(oldestSignature);

    if (evicted) {
      retireBitmaps(evicted.outputs);
    }
  }
}

function getBitmapBytes(bitmaps: Set<ImageBitmap>): number {
  let bytes = 0;

  for (const bitmap of bitmaps) {
    bytes += bitmap.width * bitmap.height * 4;
  }

  return bytes;
}

function outputOnlyReferencesInputs(outputs: NodeOutputs, inputs: NodeInputs): boolean {
  const outputBitmaps = new Set<ImageBitmap>();
  const inputBitmaps = new Set<ImageBitmap>();

  collectBitmaps(outputs, outputBitmaps);

  for (const value of Object.values(inputs)) {
    collectBitmaps(value, inputBitmaps);
  }

  return outputBitmaps.size > 0 && [...outputBitmaps].every((bitmap) => inputBitmaps.has(bitmap));
}

function collectBitmaps(
  value: unknown,
  bitmaps: Set<ImageBitmap>
) {
  if (Array.isArray(value)) {
    for (const item of value) {
      collectBitmaps(item, bitmaps);
    }
    return;
  }

  if (value && typeof value === "object" && "bitmap" in value) {
    const bitmap = (value as { bitmap?: unknown }).bitmap;

    if (bitmap instanceof ImageBitmap) {
      bitmaps.add(bitmap);
    }
  }
}

function getCachedBitmapsFromPhaseCache(): Set<ImageBitmap> {
  const bitmaps = new Set<ImageBitmap>();

  for (const cached of phaseOutputCache.values()) {
    collectBitmaps(cached.outputs, bitmaps);
  }

  return bitmaps;
}

function getCachedBitmaps(): Set<ImageBitmap> {
  const bitmaps = getCachedBitmapsFromPhaseCache();

  for (const cache of aiImageCaches) {
    collectBitmaps([...cache.values()], bitmaps);
  }

  return bitmaps;
}

function getAICacheBytes(): number {
  const bitmaps = new Set<ImageBitmap>();

  for (const cache of aiImageCaches) {
    collectBitmaps([...cache.values()], bitmaps);
  }

  return getBitmapBytes(bitmaps);
}

function evictAIImageCache() {
  while (getAICacheBytes() > aiCacheLimitBytes) {
    let oldestCache: Map<string, WorkerImage> | undefined;
    let oldestKey: string | undefined;

    for (const cache of aiImageCaches) {
      const key = cache.keys().next().value;

      if (key !== undefined) {
        oldestCache = cache;
        oldestKey = key;
        break;
      }
    }

    if (!oldestCache || oldestKey === undefined) break;

    const evicted = oldestCache.get(oldestKey);
    oldestCache.delete(oldestKey);

    if (evicted) {
      retiredBitmaps.add(evicted.bitmap);
    }
  }
}

function retireBitmaps(outputs: NodeOutputs) {
  collectBitmaps(outputs, retiredBitmaps);
}

function closeRetiredBitmaps(activeOutputs: Iterable<NodeOutputs>) {
  const activeBitmaps = getCachedBitmaps();

  for (const output of activeOutputs) {
    collectBitmaps(output, activeBitmaps);
  }

  for (const bitmap of retiredBitmaps) {
    if (!activeBitmaps.has(bitmap)) {
      bitmap.close();
    }
  }

  retiredBitmaps.clear();
}

function getEstimatedCacheBytes(): number {
  let bytes = getBitmapBytes(getCachedBitmaps());

  return bytes;
}

function serializeForCache(value: unknown): string {
  if (value instanceof File) {
    return JSON.stringify({
      type: "File",
      name: value.name,
      size: value.size,
      lastModified: value.lastModified,
      typeName: value.type,
    });
  }

  if (value instanceof Blob) {
    return JSON.stringify({
      type: "Blob",
      size: value.size,
      typeName: value.type,
    });
  }

  if (Array.isArray(value)) {
    return `[${value.map(serializeForCache).join(",")}]`;
  }

  if (value && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, entry]) => `${JSON.stringify(key)}:${serializeForCache(entry)}`);

    return `{${entries.join(",")}}`;
  }

  return JSON.stringify(value);
}

async function runEvaluation(
  message: PipelineEvaluateMessage,
  signal: AbortSignal
): Promise<void> {
  const { evaluationId, nodes, edges } = message;
  const startedAt = performance.now();
  imageConcurrencyLimit = Math.max(
    1,
    Math.min(8, Math.round(message.imageConcurrency) || DEFAULT_IMAGE_CONCURRENCY)
  );
  phaseCacheLimitBytes = Math.max(
    0,
    Math.min(
      1024 * 1024 * 1024,
      Number.isFinite(message.phaseCacheBytes)
        ? Math.round(message.phaseCacheBytes)
        : DEFAULT_PHASE_CACHE_BYTES
    )
  );
  aiCacheLimitBytes = Math.max(
    0,
    Math.min(
      512 * 1024 * 1024,
      Number.isFinite(message.aiCacheBytes)
        ? Math.round(message.aiCacheBytes)
        : DEFAULT_AI_CACHE_BYTES
    )
  );
  viewerMaxDimension = Math.max(
    256,
    Math.min(4096, Math.round(message.viewerMaxDimension) || 1600)
  );
  progressPreviewMaxDimension = Math.max(
    128,
    Math.min(1600, Math.round(message.progressPreviewMaxDimension) || 480)
  );
  progressPreviewQuality = Math.max(
    0.1,
    Math.min(1, message.progressPreviewQuality || 0.84)
  );
  const taskQueue = new PipelineTaskQueue(
    message.sequentialMode
      ? 1
      : Math.max(1, Math.min(32, Math.round(message.maxConcurrentTasks) || 5))
  );
  const aiRequestQueue = new AIRequestQueue(
    Math.max(1, Math.min(32, Math.round(message.maxAIRequests) || 2)),
    Math.max(0, Math.min(10000, Math.round(message.aiCallDelayMs) || 0))
  );

  const outputs = new Map<string, Promise<NodeOutputs>>();
  const signatures = new Map<string, string>();

  const evaluateNode = (nodeId: string): Promise<NodeOutputs> => {
    // Already evaluating?
    const existing = outputs.get(nodeId);

    if (existing) {
      return existing;
    }

    const node = nodes.find((n) => n.id === nodeId);

    if (!node) {
      return Promise.reject(new Error(`Node ${nodeId} not found`));
    }

    const definition = nodeDefinitions[node.type ?? ""];

    if (!definition) {
      return Promise.reject(new Error(`No definition for ${node.type}`));
    }

    const promise = (async () => {
      throwIfStale(evaluationId);

      const incoming = edges.filter((edge) => edge.target === nodeId);

      const inputEntries = message.sequentialMode
        ? await incoming.reduce<Promise<Array<readonly [string, unknown]>>>(
          async (entriesPromise, edge) => {
            const entries = await entriesPromise;
            const upstream = await evaluateNode(edge.source);
            entries.push([
              edge.targetHandle ?? "input",
              upstream[edge.sourceHandle ?? "output"],
            ] as const);
            return entries;
          },
          Promise.resolve([])
        )
        : await Promise.all(
          incoming.map(async (edge) => {
            const upstream = await evaluateNode(edge.source);

            return [
              edge.targetHandle ?? "input",
              upstream[edge.sourceHandle ?? "output"],
            ] as const;
          })
        );

      const inputs = Object.fromEntries(inputEntries);

      const upstreamSignatures = incoming.map((edge) => ({
        sourceHandle: edge.sourceHandle,
        targetHandle: edge.targetHandle,
        signature: signatures.get(edge.source),
      }));

      // Special case:
      // File-backed source nodes get their Files from node.data.
      if (FILE_SOURCE_NODE_TYPES.has(node.type ?? "")) {
        inputs.files = node.data.files;
        inputs.nodeId = node.id;
      }

      // Special case:
      // Selection node gets its GalleryPhotos from node.data.
      if (node.type === "selection") {
        inputs.photos = node.data.photos;
      }

      if (node.type === "array-switch") {
        inputs.selectedInput = node.data.selectedInput;
      }

      // Special case:
      // AI image-edit nodes get their passthru toggle and BYOK key from node.data.
      if (AI_IMAGE_EDIT_NODE_TYPES.has(node.type ?? "")) {
        inputs.passthru = node.data.passthru;
        inputs.apiKey = node.data.apiKey;
        inputs.prompt = node.data.prompt;
        inputs.nodeId = node.id;
      }

      if (node.type === "ask-ai") {
        inputs.passthru = node.data.passthru;
        inputs.apiKey = node.data.apiKey;
        inputs.question = node.data.question;
        inputs.nodeId = node.id;
      }

      if (node.data.skip === true) {
        console.log(`⏭ skipping ${node.id}`);
        signatures.set(nodeId, serializeForCache({
          type: node.type,
          data: node.data,
          upstream: upstreamSignatures,
        }));
        const firstIncomingArray = inputEntries.find(([, value]) => Array.isArray(value))?.[1];
        return inputs.image === undefined && firstIncomingArray !== undefined
          ? { ...inputs, image: firstIncomingArray }
          : inputs;
      }

      const signature = serializeForCache({
        type: node.type,
        data: node.data,
        upstream: upstreamSignatures,
      });
      signatures.set(nodeId, signature);

      const cached = getCachedPhaseOutput(signature);
      if (cached) {
        console.log(`↺ reused ${node.id}`);
        workerScope.postMessage({
          type: "stageStarted",
          evaluationId,
          nodeType: node.type ?? "",
          nodeId: node.id,
        });
        workerScope.postMessage({
          type: "stageTiming",
          evaluationId,
          nodeType: node.type ?? "",
          nodeId: node.id,
          durationMs: 0,
        });
        return cached;
      }

      // Cancellation plumbing available to every node.
      inputs.evaluationId = evaluationId;
      inputs.signal = signal;
      inputs.aiRequestQueue = aiRequestQueue;

      if (FILE_SOURCE_NODE_TYPES.has(node.type ?? "")) {
        inputs.sourceProgressTotal = Array.isArray(inputs.files) ? inputs.files.length : 0;
        inputs.sourceProgressRunId = ++sourceRunSeq;
      }

      console.log(`▶ executing ${node.id}`);

      workerScope.postMessage({
        type: "stageStarted",
        evaluationId,
        nodeType: node.type ?? "",
        nodeId: node.id,
      });

      const startedAt = performance.now();
      const result = await executeInPhotoBatches(
        definition,
        node.type,
        inputs,
        evaluationId,
        Math.max(1, Math.min(100, Math.round(message.photoBatchSize) || 10)),
        taskQueue
      );
      const durationMs = performance.now() - startedAt;

      workerScope.postMessage({
        type: "stageTiming",
        evaluationId,
        nodeType: node.type ?? "",
        nodeId: node.id,
        durationMs,
      });

      console.log(`✓ completed ${node.id}`);

      throwIfStale(evaluationId);

      if (!outputOnlyReferencesInputs(result, inputs)) {
        cachePhaseOutput(signature, result);
      }

      if (node.type === "gps-split") {
        const withGps = result.withGps as WorkerImage[] | undefined ?? [];
        const withoutGps = result.withoutGps as WorkerImage[] | undefined ?? [];

        workerScope.postMessage({
          type: "gpsStats",
          evaluationId,
          nodeId: node.id,
          total: withGps.length + withoutGps.length,
          withGps: withGps.length,
          withoutGps: withoutGps.length,
        });
      }

      return result;
    })();

    outputs.set(nodeId, promise);

    return promise;
  };

  // Post each viewer's result as soon as it is ready instead of
  // waiting for the whole graph to finish.
  const postViewer = async (node: PipelineWorkerNode) => {
    try {
      const nodeOutputs = await evaluateNode(node.id);
      throwIfStale(evaluationId);

      const images = (nodeOutputs.image as WorkerImage[] | undefined) ?? [];
      const payload = await taskQueue.run(
        evaluationId,
        () => encodeImagesForTransport(
          images,
          evaluationId,
          Math.max(1, Math.min(100, Math.round(message.photoBatchSize) || 10)),
          node.id,
          Math.max(0.1, Math.min(1, message.jpegQuality))
        )
      );

      throwIfStale(evaluationId);

      workerScope.postMessage({
        type: "viewer",
        evaluationId,
        nodeId: node.id,
        images: payload,
      });
    } catch (error: unknown) {
      // Staleness is cancellation, not failure.
      if (!(error instanceof StaleEvaluationError)) {
        console.error(`Viewer node "${node.id}" failed:`, error);
      }
    }
  };

  const viewerNodes = nodes.filter((node) => VIEWER_NODE_TYPES.has(node.type ?? ""));

  // Evaluate every node.
  if (message.sequentialMode) {
    for (const node of nodes) {
      await evaluateNode(node.id);
    }
  } else {
    await Promise.all(nodes.map((node) => evaluateNode(node.id)));
  }

  // The transport encode above is async, so without this await the
  // "done" message would overtake the viewer messages; the client
  // resolves still-pending viewers as empty on "done" and the real
  // results would be dropped.
  if (message.sequentialMode) {
    for (const node of viewerNodes) {
      await postViewer(node);
    }
  } else {
    await Promise.all(viewerNodes.map(postViewer));
  }

  closeRetiredBitmaps(await Promise.all(outputs.values()));

  throwIfStale(evaluationId);

  workerScope.postMessage({
    type: "cacheMemory",
    evaluationId,
    bytes: getEstimatedCacheBytes(),
  });

  workerScope.postMessage({
    type: "done",
    evaluationId,
    durationMs: performance.now() - startedAt,
  });
}

workerScope.onmessage = (event) => {
  const message = event.data;

  if (message.type !== "evaluate") {
    return;
  }

  // A new evaluation supersedes whatever is currently running.
  latestEvaluationId = message.evaluationId;
  activeController?.abort();

  const controller = new AbortController();
  activeController = controller;

  runEvaluation(message, controller.signal).catch((error: unknown) => {
    if (error instanceof StaleEvaluationError) {
      return;
    }

    workerScope.postMessage({
      type: "error",
      evaluationId: message.evaluationId,
      message: errorMessage(error),
    });
  });
};
