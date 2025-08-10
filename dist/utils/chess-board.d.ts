import { ChessPosition, ChessMove, AnalysisMove } from "../line/types.js";
/**
 * Initialize chess board
 */
export declare const initializeBoard: (
  element: HTMLElement,
  initialFEN?: string,
) => void;
/**
 * Make a move on the board
 */
export declare const makeMove: (
  from: string,
  to: string,
  piece: string,
) => void;
/**
 * Set board position
 */
export declare const setPosition: (fen: string) => void;
/**
 * Get current position
 */
export declare const getPosition: () => ChessPosition;
/**
 * Get current FEN
 */
export declare const getFEN: () => string;
/**
 * Set position change callback
 */
export declare const setOnPositionChange: (
  callback: (position: ChessPosition) => void,
) => void;
/**
 * Set move made callback
 */
export declare const setOnMoveMade: (
  callback: (move: ChessMove) => void,
) => void;
/**
 * Show move arrow
 */
export declare const showMoveArrow: (
  from: string,
  to: string,
  piece: string,
  score?: number,
  allMoves?: AnalysisMove[],
  index?: number,
  customArrowId?: string,
  mateIn?: number,
) => void;
/**
 * Clear last move highlight
 */
export declare const clearLastMoveHighlight: () => void;
