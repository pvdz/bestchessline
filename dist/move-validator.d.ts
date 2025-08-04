import { ChessPosition, ChessMove, PieceNotation } from "./types.js";
export declare const PIECES: {
  readonly WHITE_KING: PieceNotation;
  readonly WHITE_QUEEN: PieceNotation;
  readonly WHITE_ROOK: PieceNotation;
  readonly WHITE_BISHOP: PieceNotation;
  readonly WHITE_KNIGHT: PieceNotation;
  readonly WHITE_PAWN: PieceNotation;
  readonly BLACK_KING: PieceNotation;
  readonly BLACK_QUEEN: PieceNotation;
  readonly BLACK_ROOK: PieceNotation;
  readonly BLACK_BISHOP: PieceNotation;
  readonly BLACK_KNIGHT: PieceNotation;
  readonly BLACK_PAWN: PieceNotation;
};
export declare const PIECE_TYPES: {
  readonly KING: import("./types.js").PieceTypeNotation;
  readonly QUEEN: import("./types.js").PieceTypeNotation;
  readonly ROOK: import("./types.js").PieceTypeNotation;
  readonly BISHOP: import("./types.js").PieceTypeNotation;
  readonly KNIGHT: import("./types.js").PieceTypeNotation;
  readonly PAWN: import("./types.js").PieceTypeNotation;
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
