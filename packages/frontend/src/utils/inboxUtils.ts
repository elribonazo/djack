export function stringToColor(text) {
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    hash = text.charCodeAt(i) + ((hash << 5) - hash);
  }

  // Extracting R, G and B components from the hashed value
  const r = (hash & 0xff0000) >> 16;
  const g = (hash & 0x00ff00) >> 8;
  const b = hash & 0x0000ff;

  // Vibrant green color
  const vibrantGreen = { r: 0, g: 255, b: 0 };

  // Mixing the hash-derived colors with the vibrant green color
  const mixedR = Math.round((r + vibrantGreen.r) / 2);
  const mixedG = Math.round((g + vibrantGreen.g) / 2);
  const mixedB = Math.round((b + vibrantGreen.b) / 2);

  // Convert the RGB values back to hex
  const color = `#${((1 << 24) + (mixedR << 16) + (mixedG << 8) + mixedB)
    .toString(16)
    .slice(1)
    .toUpperCase()}`;

  return color;
}
