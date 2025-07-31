import { PieceTypeNotation, ColorNotation, PieceNotation, PlayerColor } from "./types.js";
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
export declare function getFENWithCorrectMoveCounter(boardFEN: string, currentMoveIndex: number, castling?: string, enPassant?: string | null): string;
export declare function debounce<T extends (...args: unknown[]) => unknown>(func: T, wait: number): (...args: Parameters<T>) => void;
/**
 * Get the starting player from a FEN string
 */
export declare function getStartingPlayer(fen: string): PlayerColor;
/**
 * Show a toast notification
 * @param message The message to display
 * @param background The background color (default: #333)
 * @param duration How long to show (ms, default: 4000)
 */
export declare function showToast(message: string, background?: string, duration?: number): void;
