import { ChessMove, AnalysisResult } from "./types.js";
/**
 * Application state interface
 */
interface AppState {
    moves: ChessMove[];
    initialFEN: string;
    currentMoveIndex: number;
    isAnalyzing: boolean;
    currentResults: AnalysisResult | null;
    boardElement: HTMLElement | null;
    stockfishWorker: Worker | null;
}
/**
 * State update functions
 */
declare const updateState: (updates: Partial<AppState>) => void;
declare const getState: () => AppState;
/**
 * Board state interface
 */
interface BoardState {
    position: string;
    selectedSquare: string | null;
    draggedPiece: string | null;
    legalMoves: string[];
}
/**
 * Update board state
 */
declare const updateBoardState: (updates: Partial<BoardState>) => void;
/**
 * Set board position
 */
declare const setBoardPosition: (fen: string) => void;
/**
 * Get current board FEN
 */
declare const getBoardFEN: () => string;
/**
 * Render the chess board
 */
declare const renderBoard: () => void;
/**
 * Update FEN input field
 */
declare const updateFENInput: () => void;
/**
 * Update controls from current position
 */
declare const updateControlsFromPosition: () => void;
export { getState, updateState, setBoardPosition, getBoardFEN, updateBoardState, renderBoard, updateFENInput, updateControlsFromPosition, };
