import {
  ChessPosition,
  ChessMove,
  Square,
  NotationFormat,
  PieceFormat,
  PieceTypeNotation,
  ColorNotation,
  PieceNotation,
  createPieceTypeNotation,
  createColorNotation,
  createPieceNotation,
  getPieceTypeFromNotation,
  getColorFromNotation,
  PLAYER_COLORS,
  PlayerColor,
} from "./types.js";
import { logError } from "./utils/logging.js";
import {
  parseFEN,
  toFEN,
  squareToCoords,
  coordsToSquare,
} from "./utils/fen-utils.js";
import {
  canPieceMoveTo,
  canPawnMoveTo,
  canRookMoveTo,
  canKnightMoveTo,
  canBishopMoveTo,
  canQueenMoveTo,
  canKingMoveTo,
  selectCorrectMove,
} from "./utils/move-parser.js";
import { PIECE_TYPES } from "./utils/notation-utils.js";

export function getPieceColor(piece: PieceNotation): ColorNotation {
  return piece === piece.toUpperCase()
    ? createColorNotation("w")
    : createColorNotation("b");
}

export function getPieceType(piece: PieceNotation): PieceTypeNotation {
  return createPieceTypeNotation(piece.toUpperCase());
}

// Global variable to store current move index
let globalCurrentMoveIndex = -1;

/**
 * Set the global current move index
 */
export function setGlobalCurrentMoveIndex(moveIndex: number): void {
  globalCurrentMoveIndex = moveIndex;
}

/**
 * Get the global current move index
 */
export function getGlobalCurrentMoveIndex(): number {
  return globalCurrentMoveIndex;
}

/**
 * Get FEN with correct move counter based on current move index
 */
export function getFENWithCorrectMoveCounter(
  boardFEN: string,
  currentMoveIndex: number,
  castling?: string,
  enPassant?: string | null,
): string {
  const position = parseFEN(boardFEN);

  // Calculate the correct move number based on current move index
  const correctMoveNumber = Math.floor(currentMoveIndex / 2) + 1;

  // Create new position with correct move number and optional castling/en-passant
  const correctedPosition: ChessPosition = {
    ...position,
    fullMoveNumber: correctMoveNumber,
    castling: castling !== undefined ? castling : position.castling,
    enPassant: enPassant !== undefined ? enPassant : position.enPassant,
  };

  return toFEN(correctedPosition);
}

/**
 * Get the starting player from a FEN string
 */
export function getStartingPlayer(fen: string): PlayerColor {
  const position = parseFEN(fen);
  return position.turn;
}
