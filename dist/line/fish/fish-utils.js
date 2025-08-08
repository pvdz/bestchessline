/**
 * Generate line ID from SAN moves
 */
export function generateLineId(sans) {
    return sans.join("_") + "_" + Math.random().toString(36).substring(2, 8);
}
export function getRandomProofString() {
    return `R_${Math.random().toString(36).substring(2, 8)}`;
}
//# sourceMappingURL=fish-utils.js.map