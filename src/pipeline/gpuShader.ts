// ---------------------------------------------------------------------------
// Per-operation parameter contracts
// ---------------------------------------------------------------------------
// Every operation now has a fixed-shape params tuple instead of a bare
// `number[]`. Passing the wrong count/order of params for an operation is a
// TypeScript error at the call site instead of a silent `uParams[n]` read of
// zero/garbage inside the shader.

type OperationParamsMap = {
  vignette: [amount: number, r: number, g: number, b: number];
  "split-toning": [
    shadowR: number,
    shadowG: number,
    shadowB: number,
    highlightR: number,
    highlightG: number,
    highlightB: number,
    balance: number,
  ];
  "film-base-remover": [maskR: number, maskG: number, maskB: number, strength: number, densityCompensation: number, filmAge: number];
};

export type GpuOperation = {
  [K in keyof OperationParamsMap]: {
    kind: K;
    params: OperationParamsMap[K];
  };
}[keyof OperationParamsMap];

// ---------------------------------------------------------------------------
// Operation IDs — single source of truth
// ---------------------------------------------------------------------------
// These numeric values are UNCHANGED from the original file on purpose: if
// they're ever persisted (saved presets, serialized pipelines) renumbering
// would silently corrupt existing data. I haven't seen the PRESETS/storage
// code, so I'm treating that as a real risk rather than assuming it's safe.
//
// The `satisfies` clause guarantees every GpuOperation["kind"] has an ID and
// every ID maps to a real kind — add a new operation to OperationParamsMap
// without adding it here and TS will fail the build instead of the shader
// silently no-op'ing on an unmapped kind.
export const gpuOperationIds = {
  vignette: 14,
  "split-toning": 19,
  "film-base-remover": 26,
} as const satisfies Record<GpuOperation["kind"], number>;

function toDefineName(kind: string): string {
  return `OP_${kind.toUpperCase().replace(/-/g, "_")}`;
}

// GLSL #define block generated straight from gpuOperationIds. This is the
// fix for the biggest maintenance hazard in the original file: the TS map
// and the shader's branch conditions were maintained by hand in two places
// with nothing checking they agreed. Now there is exactly one place that
// knows the numbers.
const glslOperationDefines = Object.entries(gpuOperationIds)
  .map(([kind, id]) => `#define ${toDefineName(kind)} ${id}`)
  .join("\n");

export const gpuVertexShader = `#version 300 es
in vec2 aPosition;
in vec2 aTexCoord;
out vec2 vTexCoord;

void main() {
  gl_Position = vec4(aPosition, 0.0, 1.0);
  vTexCoord = vec2(aTexCoord.x, 1.0 - aTexCoord.y);
}`;

export const gpuFragmentShader = `#version 300 es
precision highp float;
${glslOperationDefines}

uniform sampler2D uImage;
uniform int uOperation;
uniform float uParams[8];
uniform vec2 uResolution;
in vec2 vTexCoord;
out vec4 outColor;

const float LUM_R = 0.2126;
const float LUM_G = 0.7152;
const float LUM_B = 0.0722;

float lum(vec3 color) {
  return dot(color, vec3(LUM_R, LUM_G, LUM_B));
}

vec3 sampleClamped(ivec2 coordinate) {
  ivec2 size = ivec2(uResolution);
  return texelFetch(uImage, clamp(coordinate, ivec2(0), size - 1), 0).rgb;
}

void main() {
  // NOTE: switched the base sample to texelFetch for pixel-address
  // consistency with sampleClamped, which already assumes 1:1
  // texture-to-output mapping via gl_FragCoord. If
  // that assumption doesn't hold everywhere this shader is used (e.g. a
  // downscaled live-preview pass), this and the original code would both
  // need a different approach — I haven't seen the renderer/pipeline code
  // that calls this shader, so flagging rather than assuming.
  ivec2 texel = ivec2(gl_FragCoord.x, uResolution.y - gl_FragCoord.y);
  vec4 color = vec4(sampleClamped(texel), texture(uImage, vTexCoord).a);
  vec3 rgb = color.rgb;
  float amount = uParams[0];

  switch (uOperation) {
    case OP_VIGNETTE: {
      float strength = amount / 100.0;
      if (strength > 0.0) {
        vec2 centered = (gl_FragCoord.xy - uResolution * 0.5);
        float maxDistance = dot(uResolution * 0.5, uResolution * 0.5);
        float falloff = 1.0 - strength * pow(dot(centered, centered), 1.1) / pow(maxDistance, 1.1);
        rgb = mix(vec3(uParams[1], uParams[2], uParams[3]), rgb, falloff);
      }
      break;
    }
    case OP_SPLIT_TONING: {
      float pixelLum = lum(rgb);
      float shadowWeight = (1.0 - pixelLum) * uParams[6];
      float highlightWeight = pixelLum * uParams[6];
      rgb += (vec3(uParams[0], uParams[1], uParams[2]) - vec3(128.0)) * shadowWeight / 255.0;
      rgb += (vec3(uParams[3], uParams[4], uParams[5]) - vec3(128.0)) * highlightWeight / 255.0;
      break;
    }
    case OP_FILM_BASE_REMOVER: {
      float maskLuminance = dot(vec3(uParams[0], uParams[1], uParams[2]), vec3(LUM_R, LUM_G, LUM_B));
      float blend = clamp(uParams[3], 0.0, 1.0);
      vec3 correction = maskLuminance / max(vec3(1.0 / 255.0), vec3(uParams[0], uParams[1], uParams[2]));
      float densityFactor = pow(2.0, clamp(uParams[4], 0.0, 100.0) / 100.0);
      float ageBlend = clamp(uParams[5], 0.0, 100.0) / 100.0;
      rgb *= mix(vec3(1.0), correction, blend) * densityFactor;
      float pixelLuminance = lum(rgb);
      rgb = mix(
        rgb * vec3(1.0 + 0.08 * ageBlend, 1.0 + 0.02 * ageBlend, 1.0 - 0.08 * ageBlend) * (1.0 - ageBlend),
        vec3(pixelLuminance),
        ageBlend
      );
      break;
    }
  }

  outColor = vec4(clamp(rgb, 0.0, 1.0), color.a);
}`;
