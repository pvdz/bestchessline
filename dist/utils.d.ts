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
export declare function debounce<T extends (...args: unknown[]) => unknown>(func: T, wait: number): (...args: Parameters<T>) => void;
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
export declare function log(...args: unknown[]): void;
/**
 * Error logging utility function
 * @param args - Arguments to pass to console.error
 */
export declare function logError(...args: unknown[]): void;
/**
 * Safely get an HTML input element by ID
 */
export declare function getInputElement(id: string): HTMLInputElement | null;
/**
 * Safely get an HTML textarea element by ID
 */
export declare function getTextAreaElement(id: string): HTMLTextAreaElement | null;
/**
 * Safely get an HTML button element by ID
 */
export declare function getButtonElement(id: string): HTMLButtonElement | null;
/**
 * Safely get an HTML select element by ID
 */
export declare function getSelectElement(id: string): HTMLSelectElement | null;
/**
 * Safely get a checked radio button by name and value
 */
export declare function getCheckedRadio(name: string, value: string): HTMLInputElement | null;
/**
 * Safely get all radio buttons by name
 */
export declare function getAllRadios(name: string): NodeListOf<HTMLInputElement> | null;
/**
 * Safely get a checked radio button by name
 */
export declare function getCheckedRadioByName(name: string): HTMLInputElement | null;
/**
 * Safely get an element that matches a selector
 */
export declare function querySelector<T extends Element>(selector: string): T | null;
/**
 * Safely get all elements that match a selector
 */
export declare function querySelectorAll<T extends Element>(selector: string): NodeListOf<T> | null;
/**
 * Safely get an element by ID with type checking
 */
export declare function getElementById<T extends Element>(id: string): T | null;
/**
 * Check if an element is an HTMLElement
 */
export declare function isHTMLElement(element: EventTarget | null): element is HTMLElement;
/**
 * Check if an element is an HTMLInputElement
 */
export declare function isHTMLInputElement(element: Element | null): element is HTMLInputElement;
/**
 * Check if an element is an HTMLButtonElement
 */
export declare function isHTMLButtonElement(element: Element | null): element is HTMLButtonElement;
/**
 * Check if an element is an HTMLTextAreaElement
 */
export declare function isHTMLTextAreaElement(element: Element | null): element is HTMLTextAreaElement;
