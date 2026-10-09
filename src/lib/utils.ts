import type { Stage } from '@/types/types';

export const TOOLBAR_GAP = 5;

const LUM_R = 0.2126, LUM_G = 0.7152, LUM_B = 0.0722;

export function clamp(v: number) {
  return Math.max(0, Math.min(255, v));
}

///

export const vignetteStage = (
  amount: number,
  color: [number, number, number] = [0, 0, 0]
): Stage => {
  const strength = amount / 100;
  return (img) => {
    if (strength <= 0) return;
    const { width, height, data } = img;
    const cx = width / 2;
    const cy = height / 2;
    const maxDistSq = cx * cx + cy * cy;
    // dist^2.2 = sqrt(distSq)^2.2 = distSq^1.1 — skips the sqrt entirely
    const invMaxDistPow = 1 / Math.pow(maxDistSq, 1.1);

    const dx2 = new Float64Array(width);
    for (let x = 0; x < width; x++) {
      const dx = x - cx;
      dx2[x] = dx * dx;
    }

    for (let y = 0; y < height; y++) {
      const dy = y - cy;
      const dy2 = dy * dy;
      const rowOffset = y * width;
      for (let x = 0; x < width; x++) {
        const falloff = 1 - strength * Math.pow(dx2[x] + dy2, 1.1) * invMaxDistPow;
        const idx = (rowOffset + x) * 4;
        const tint = 1 - falloff;
        data[idx] = data[idx] * falloff + color[0] * tint;
        data[idx + 1] = data[idx + 1] * falloff + color[1] * tint;
        data[idx + 2] = data[idx + 2] * falloff + color[2] * tint;
      }
    }
  };
};

// Verified with AI

export const splitToningStage = (
  shadowTintR: number,
  shadowTintG: number,
  shadowTintB: number,
  highlightTintR: number,
  highlightTintG: number,
  highlightTintB: number,
  strength: number
): Stage => {
  return (img) => {
    const d = img.data;
    for (let i = 0; i < d.length; i += 4) {
      const lum = (0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2]) / 255;
      const shadowWeight = (1 - lum) * strength;
      const highlightWeight = lum * strength;

      d[i] = clamp(
        d[i] + (shadowTintR - 128) * shadowWeight + (highlightTintR - 128) * highlightWeight
      );
      d[i + 1] = clamp(
        d[i + 1] + (shadowTintG - 128) * shadowWeight + (highlightTintG - 128) * highlightWeight
      );
      d[i + 2] = clamp(
        d[i + 2] + (shadowTintB - 128) * shadowWeight + (highlightTintB - 128) * highlightWeight
      );
    }
  };
};

export const filmBaseRemoverStage = (
  maskR: number,
  maskG: number,
  maskB: number,
  strength: number,
  densityCompensation: number,
  filmAge: number,
): Stage => {
  const maskLuminance = Math.max(1, LUM_R * maskR + LUM_G * maskG + LUM_B * maskB);
  const correctionR = maskLuminance / Math.max(1, maskR);
  const correctionG = maskLuminance / Math.max(1, maskG);
  const correctionB = maskLuminance / Math.max(1, maskB);
  const blend = Math.max(0, Math.min(1, strength / 100));
  const densityFactor = 2 ** (Math.max(0, Math.min(100, densityCompensation)) / 100);
  const ageBlend = Math.max(0, Math.min(1, filmAge / 100));

  return (img) => {
    const d = img.data;
    for (let i = 0; i < d.length; i += 4) {
      const red = d[i] * (1 + (correctionR - 1) * blend) * densityFactor;
      const green = d[i + 1] * (1 + (correctionG - 1) * blend) * densityFactor;
      const blue = d[i + 2] * (1 + (correctionB - 1) * blend) * densityFactor;
      const luminance = LUM_R * red + LUM_G * green + LUM_B * blue;

      d[i] = clamp(red * (1 + 0.08 * ageBlend) * (1 - ageBlend) + luminance * ageBlend);
      d[i + 1] = clamp(green * (1 + 0.02 * ageBlend) * (1 - ageBlend) + luminance * ageBlend);
      d[i + 2] = clamp(blue * (1 - 0.08 * ageBlend) * (1 - ageBlend) + luminance * ageBlend);
    }
  };
};

export const detectFilmBaseColor = (imageData: ImageData): [number, number, number] => {
  const histogram = new Uint32Array(256);
  const data = imageData.data;

  for (let index = 0; index < data.length; index += 4) {
    const luminance = Math.round(LUM_R * data[index] + LUM_G * data[index + 1] + LUM_B * data[index + 2]);
    histogram[luminance] += 1;
  }

  const targetCount = Math.max(1, Math.ceil((data.length / 4) * 0.1));
  let accumulated = 0;
  let threshold = 255;
  for (; threshold >= 0; threshold -= 1) {
    accumulated += histogram[threshold];
    if (accumulated >= targetCount) break;
  }

  let red = 0;
  let green = 0;
  let blue = 0;
  let count = 0;
  for (let index = 0; index < data.length; index += 4) {
    const luminance = LUM_R * data[index] + LUM_G * data[index + 1] + LUM_B * data[index + 2];
    if (luminance >= threshold) {
      red += data[index];
      green += data[index + 1];
      blue += data[index + 2];
      count += 1;
    }
  }

  return count > 0
    ? [red / count, green / count, blue / count]
    : [255, 128, 48];
};

