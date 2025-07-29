import { ChessPosition, ChessMove } from "./types.js";
export declare const PIECES: {
  readonly WHITE_KING: "K";
  readonly WHITE_QUEEN: "Q";
  readonly WHITE_ROOK: "R";
  readonly WHITE_BISHOP: "B";
  readonly WHITE_KNIGHT: "N";
  readonly WHITE_PAWN: "P";
  readonly BLACK_KING: "k";
  readonly BLACK_QUEEN: "q";
  readonly BLACK_ROOK: "r";
  readonly BLACK_BISHOP: "b";
  readonly BLACK_KNIGHT: "n";
  readonly BLACK_PAWN: "p";
};
export declare const PIECE_TYPES: {
  readonly KING: "K";
  readonly QUEEN: "Q";
  readonly ROOK: "R";
  readonly BISHOP: "B";
  readonly KNIGHT: "N";
  readonly PAWN: "P";
};
export interface MoveEffect {
  isCapture: boolean;
  isCheck: boolean;
  isMate: boolean;
  isEnPassant: boolean;
  capturedPiece?: string;
  capturedSquare?: string;
}
export interface ValidationResult {
  isValid: boolean;
  effect: MoveEffect;
  error?: string;
}
/**
 * Validates a chess move and determines its effects
 */
export declare function validateMove(
  position: ChessPosition,
  move: ChessMove,
): ValidationResult;
/**
 * Validates a move and returns detailed information about its effects
 */
export declare function analyzeMove(
  fen: string,
  move: ChessMove,
): ValidationResult;
/**
 * Gets all legal moves for a position (simplified)
 */
export declare function getLegalMoves(position: ChessPosition): ChessMove[];
