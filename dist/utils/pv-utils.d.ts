import {
  ChessMove,
  AnalysisMove,
  NotationFormat,
  PieceFormat,
} from "../types.js";
/**
 * Principal Variation Utility Functions
 *
 * Provides functions for formatting and handling principal variations.
 */
/**
 * Format a principal variation with effects
 * @param pv Array of moves in the principal variation
 * @param position The starting position in FEN
 * @param format The notation format to use
 * @param pieceFormat The piece format to use
 * @returns Formatted principal variation string
 */
export declare function formatPVWithEffects(
  pv: ChessMove[],
  position: string,
  format: NotationFormat,
  pieceFormat: PieceFormat,
): string;
/**
 * Update results panel with debouncing
 * @param moves Array of analysis moves to display
 */
export declare function updateResultsPanel(moves: AnalysisMove[]): void;
