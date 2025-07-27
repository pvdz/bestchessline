import { ChessPosition, ChessMove, PieceType, Color } from './types.js';
export declare function parseFEN(fen: string): ChessPosition;
export declare function toFEN(position: ChessPosition): string;
export declare function squareToCoords(square: string): [number, number];
export declare function coordsToSquare(rank: number, file: number): string;
export declare function isValidSquare(square: string): boolean;
export declare function getPieceColor(piece: string): Color | null;
export declare function getPieceType(piece: string): PieceType | null;
export declare function formatScore(score: number): string;
export declare function formatTime(ms: number): string;
export declare function debounce<T extends (...args: any[]) => any>(func: T, wait: number): (...args: Parameters<T>) => void;
export declare function moveToNotation(move: ChessMove, format?: 'short' | 'long', pieceFormat?: 'unicode' | 'english', fen?: string): string;
export declare function getPieceSymbol(type: PieceType, color: Color, format?: 'unicode' | 'english'): string;
export declare function pvToNotation(pv: ChessMove[], format?: 'short' | 'long', pieceFormat?: 'unicode' | 'english', fen?: string): string;
/**
 * Enable or disable logging
 */
export declare function setLoggingEnabled(enabled: boolean): void;
/**
 * Get current logging state
 */
export declare function isLoggingEnabled(): boolean;
/**
 * Logging utility function
 * @param args - Arguments to pass to console.log
 */
export declare function log(...args: any[]): void;
/**
 * Error logging utility function
 * @param args - Arguments to pass to console.error
 */
export declare function logError(...args: any[]): void;
