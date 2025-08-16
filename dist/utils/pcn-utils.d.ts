/**
 * Convert a line of SAN moves to PCN (Piece Coordinate Notation)
 * @param sanMoves - Array of SAN moves (e.g., ["Nf3", "Nf6", "d4"])
 * @param startingFEN - Starting FEN position
 * @returns String with PCN moves (e.g., "1. Ng1f3 g8f6 2. d2d4 d7d5")
 */
export declare function convertSANLineToPCN(sanMoves: string[], startingFEN: string): string;
/**
 * Convert a single PCN move to SAN
 * @param pcnMove - PCN move (e.g., "Ng1f3", "O-O")
 * @param fen - Current FEN position
 * @returns SAN move or null if conversion fails
 */
export declare function convertPCNToSAN(pcnMove: string, _fen: string): string | null;
/**
 * Convert a PCN line to SAN line
 * Note: this is not a safe conversion! It does not disambiguate!
 *
 * @param pcnLine - PCN line (e.g., "1. Ng1f3 g8f6 2. d2d4 d7d5")
 * @param startingFEN - Starting FEN position
 * @returns SAN line
 */
export declare function convertPCNLineToSAN(pcnLine: string, startingFEN: string): string;
/**
 * Extract individual PCN moves from a PCN line
 * @param pcnLine - PCN line (e.g., "1. Ng1f3 g8f6 2. d2d4 d7d5")
 * @returns Array of individual PCN moves
 */
export declare function extractPCNMoves(pcnLine: string): string[];
/**
 * Format PCN moves with move numbers
 * @param pcns - Array of PCN moves
 * @returns Formatted string with move numbers
 */
export declare function formatPCNLineWithMoveNumbers(pcns: string[]): string;
/**
 * Compute SAN game string from PCN moves
 * @param pcns - Array of PCN moves
 * @param rootFEN - Starting FEN position
 * @returns SAN game string
 */
export declare function computeSanGameFromPCN(pcns: string[], rootFEN: string, justThrow?: boolean): string;
