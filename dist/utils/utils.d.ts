import {
  PieceTypeNotation,
  ColorNotation,
  PieceNotation,
  PlayerColor,
} from "../line/types.js";
export declare function getPieceColor(piece: PieceNotation): ColorNotation;
export declare function getPieceType(piece: PieceNotation): PieceTypeNotation;
/**
 * Set the global current move index
 */
export declare function setGlobalCurrentMoveIndex(moveIndex: number): void;
/**
 * Get the global current move index
 */
export declare function getGlobalCurrentMoveIndex(): number;
/**
 * Get FEN with correct move counter based on current move index
 */
export declare function getFENWithCorrectMoveCounter(
  boardFEN: string,
  currentMoveIndex: number,
  castling?: string,
  enPassant?: string | null,
): string;
/**
 * Get the starting player from a FEN string
 */
export declare function getStartingPlayer(fen: string): PlayerColor;
