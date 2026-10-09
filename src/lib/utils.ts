export const TOOLBAR_GAP = 5;

const LUM_R = 0.2126, LUM_G = 0.7152, LUM_B = 0.0722;

///

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

