import {
  ChessMove,
  NotationFormat,
  PieceFormat,
  PieceTypeNotation,
  ColorNotation,
} from "../line/types.js";
/**
 * Chess Notation Utility Functions
 *
 * Provides functions for converting chess moves to various notation formats,
 * handling piece symbols, and formatting principal variations (PV).
 */
export declare const PIECE_TYPES: {
  readonly KING: "K";
  readonly QUEEN: "Q";
  readonly ROOK: "R";
  readonly BISHOP: "B";
  readonly KNIGHT: "N";
  readonly PAWN: "P";
};
/**
 * Convert a chess move to notation
 */
export declare function moveToNotation(
  move: ChessMove,
  format?: NotationFormat,
  pieceFormat?: PieceFormat,
  fen?: string,
): string;
/**
 * Get the symbol for a piece type and color
 */
export declare function getPieceSymbol(
  type: PieceTypeNotation,
  color: ColorNotation,
  format?: PieceFormat,
): string;
/**
 * Convert a principal variation (PV) to notation
 */
export declare function pvToNotation(
  pv: ChessMove[],
  format?: NotationFormat,
  pieceFormat?: PieceFormat,
  fen?: string,
): string;
/**
 * Convert raw move (e.g., "b8c6") to short algebraic notation (e.g., "Nc6")
 * This is needed because Stockfish returns raw moves but parseMove expects SAN
 */
export declare const rawMoveToSAN: (rawMove: string, fen: string) => string;
/**
 * Convert SAN move to long notation (from-to square format)
 * @param sanMove - The SAN move (e.g., "Nf3", "dxe6")
 * @param fen - The current FEN position
 * @returns The long notation move (e.g., "g1f3", "d5e6") or null if parsing fails
 */
export declare function sanToLongNotation(
  sanMove: string,
  fen: string,
): string | null;
/**
 * Convert a line of SAN moves to long notation
 * @param sanLine - Line of SAN moves (e.g., "1. Nf3 Nf6 2. d4 d5")
 * @param startingFEN - Starting FEN position
 * @returns Line with long notation moves
 */
export declare function convertLineToLongNotation(
  sanLine: string,
  startingFEN: string,
): string;
/**
 * Convert a line of SAN moves to long notation with piece names and move numbers
 * @param sanMoves - Array of SAN moves (e.g., ["Nf3", "Nf6", "d4"])
 * @param startingFEN - Starting FEN position
 * @returns String with long notation moves (e.g., "1. Ng1f3 g8f6 2. d2d4 d7d5")
 */
export declare function convertSANLineToLongNotation(
  sanMoves: string[],
  startingFEN: string,
): string;
/**
 * Get piece name from piece character (always capital)
 * @param piece - Piece character from FEN (P, N, B, R, Q, K, p, n, b, r, q, k)
 * @returns Piece name (P, N, B, R, Q, K)
 */
export declare function getPieceCapitalized(piece: string): string;
