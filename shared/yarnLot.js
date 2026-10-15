// Yarn lot separators may be typed twice on the equipment. Preserve case and digits.
export function normalizeYarnLot(value) {
  return typeof value === 'string' ? value.trim().replace(/-{2,}/g, '-') : value;
}
