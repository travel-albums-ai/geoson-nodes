import type { NodeOutputs } from "@/types/types";

// Feature count is the memory proxy. Outputs share feature objects, so this
// overestimates real usage, which keeps the cache conservative.
const MAX_CACHED_FEATURES = 250_000;
const MAX_CACHED_PHASES = 64;

type CacheEntry = {
  outputs: NodeOutputs;
  features: number;
};

// Keyed by content signature rather than node id, so equivalent phases are
// shared across runs. Map insertion order doubles as recency order.
const entries = new Map<string, CacheEntry>();
let cachedFeatures = 0;

function countFeatures(outputs: NodeOutputs): number {
  let count = 0;

  for (const value of Object.values(outputs)) {
    if (!Array.isArray(value)) continue;

    for (const collection of value) {
      const features = (collection as { features?: unknown } | null)?.features;

      if (Array.isArray(features)) {
        count += features.length;
      }
    }
  }

  return count;
}

function removeEntry(signature: string) {
  const entry = entries.get(signature);

  if (!entry) return;

  cachedFeatures -= entry.features;
  entries.delete(signature);
}

export function getCachedPhaseOutput(signature: string): NodeOutputs | undefined {
  const entry = entries.get(signature);

  if (!entry) return undefined;

  entries.delete(signature);
  entries.set(signature, entry);

  return entry.outputs;
}

// A phase larger than the whole budget is not cached, so it is recomputed
// rather than pinning memory that could never be reused alongside others.
export function cachePhaseOutput(signature: string, outputs: NodeOutputs) {
  removeEntry(signature);

  const features = countFeatures(outputs);

  if (features > MAX_CACHED_FEATURES) return;

  entries.set(signature, { outputs, features });
  cachedFeatures += features;

  for (const oldestSignature of entries.keys()) {
    if (cachedFeatures <= MAX_CACHED_FEATURES && entries.size <= MAX_CACHED_PHASES) break;

    removeEntry(oldestSignature);
  }
}
