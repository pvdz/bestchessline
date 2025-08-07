/**
 * Generate line ID from SAN moves
 */
export function generateLineId(sans: string[]): string {
  return sans.join("_") + "_" + Math.random().toString(36).substring(2, 8);
}

export function getRandomProofString(): string {
  return `R_${Math.random().toString(36).substring(2, 8)}`;
}
