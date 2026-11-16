/**
 * Parse a number written the Peruvian way.
 *
 * Accepts "1,5" and "1.5" as one-and-a-half, and "1,200" / "1.200" as
 * one-thousand-two-hundred. Returns null instead of a silent wrong value.
 */
export function parseEsNumber(raw: string): number | null {
  const text = raw.trim().replace(/\s/g, '');
  if (!text) return null;
  const lastComma = text.lastIndexOf(',');
  const lastDot = text.lastIndexOf('.');
  let normalized = text;
  if (lastComma >= 0 && lastDot >= 0) {
    // Both separators: the last one is the decimal mark.
    if (lastComma > lastDot) {
      normalized = text.replace(/\./g, '').replace(',', '.');
    } else {
      normalized = text.replace(/,/g, '');
    }
  } else if (lastComma >= 0) {
    normalized = text.replace(',', '.');
  }
  if (!/^-?\d+(\.\d+)?$/.test(normalized)) return null;
  const value = Number(normalized);
  return Number.isFinite(value) ? value : null;
}
