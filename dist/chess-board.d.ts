import { ChessPosition, ChessMove, AnalysisMove } from "./types.js";
/**
 * Board state interface
 */
interface BoardState {
  position: ChessPosition;
  selectedSquare: string | null;
  draggedPiece: string | null;
  legalMoves: string[];
  onPositionChange?: (position: ChessPosition) => void;
  onMoveMade?: (move: ChessMove) => void;
}
/**
 * Update board state
 */
declare const updateBoardState: (updates: Partial<BoardState>) => void;
/**
 * Get current board state
 */
declare const getBoardState: () => BoardState;
/**
 * Initialize chess board
 */
declare const initializeBoard: (
  element: HTMLElement,
  initialFEN?: string,
) => void;
/**
 * Render the chess board
 */
declare const renderBoard: (element: HTMLElement) => void;
/**
 * Set board position
 */
declare const setPosition: (fen: string) => void;
/**
 * Get current position
 */
declare const getPosition: () => ChessPosition;
/**
 * Get current FEN
 */
declare const getFEN: () => string;
/**
 * Set position change callback
 */
declare const setOnPositionChange: (
  callback: (position: ChessPosition) => void,
) => void;
/**
 * Set move made callback
 */
declare const setOnMoveMade: (callback: (move: ChessMove) => void) => void;
/**
 * Show move arrow
 */
declare const showMoveArrow: (
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
 * Hide move arrow
 */
declare const hideMoveArrow: (arrowId?: string) => void;
/**
 * Clear last move highlight
 */
declare const clearLastMoveHighlight: () => void;
/**
 * Destroy board
 */
declare const destroy: () => void;
export {
  initializeBoard,
  getBoardState,
  updateBoardState,
  renderBoard,
  setPosition,
  getPosition,
  getFEN,
  setOnPositionChange,
  setOnMoveMade,
  showMoveArrow,
  hideMoveArrow,
  clearLastMoveHighlight,
  destroy,
};
