// Core chess types shared between utils and line modules
// These types are used by utils files and should not depend on line-specific types

export interface ChessPosition {
  board: string[][];
  turn: PlayerColor;
  castling: string;
  enPassant: string | null;
  halfMoveClock: number;
  fullMoveNumber: number;
}

export interface ChessMove {
  from: string;
  to: string;
  piece: string;
  promotion?: string;
  san?: string;
  special?: "castling" | "en-passant";
  rookFrom?: string;
  rookTo?: string;
  capturedSquare?: string; // For en passant captures
  effect?: {
    isCapture: boolean;
    isCheck: boolean;
    isMate: boolean;
    isEnPassant: boolean;
    capturedPiece?: string;
    capturedSquare?: string;
  };
}

export interface AnalysisMove {
  move: ChessMove;
  score: number;
  depth: number;
  pv: ChessMove[];
  nodes: number;
  time: number;
  multipv?: number; // Track which principal variation this move belongs to
  mateIn: number; // Actual number of moves required for mate (different from depth). 0 when the line is not a guaranteed mate
}

export interface AnalysisResult {
  moves: AnalysisMove[];
  position: string;
  depth: number;
  completed: boolean;
}

export interface StockfishOptions {
  depth?: number;
  threads?: number;
  multiPV?: number;
  searchMoves?: string[]; // long notation to only consider
}

export interface AnalysisConfig {
  maxDepth: number;
  whiteMoves: number;
  blackMoves: number;
  stockfishOptions: StockfishOptions;
}

export interface BoardState {
  position: ChessPosition;
  selectedSquare: string | null;
  draggedPiece: string | null;
  legalMoves: string[];
}

export type PieceType = "P" | "R" | "N" | "B" | "Q" | "K";
export type Color = "w" | "b";

// Player color constants to avoid magic literals
export const PLAYER_COLORS = {
  WHITE: "w" as const,
  BLACK: "b" as const,
} as const;

export type PlayerColor = (typeof PLAYER_COLORS)[keyof typeof PLAYER_COLORS];

export interface Piece {
  type: PieceType;
  color: Color;
  square: string;
}

// Additional types for removing any usage
export interface AnalysisOptions {
  depth: number;
  threads: number;
  multiPV: number;
}

// More specific types to replace unnecessary unknown
export type LogArguments = (
  | string
  | number
  | boolean
  | object
  | null
  | undefined
)[];

export type LogFunction = (...args: LogArguments) => void;

export interface DebounceFunction<T extends (...args: never[]) => void> {
  (...args: Parameters<T>): void;
  cancel(): void;
}

export interface MoveItem {
  move: ChessMove;
  score: number;
  depth: number;
  pv: ChessMove[];
  nodes: number;
  time: number;
}

export interface ProcessedMoveItem {
  move: ChessMove;
  notation: string;
  score: number;
  depth: number;
  pv: string;
  nodes: number;
  time: number;
}

export interface FormatSettings {
  notationFormat: "algebraic" | "descriptive";
  pieceFormat: "symbols" | "english";
}

export interface MoveItemElement extends HTMLElement {
  dataset: {
    moveFrom: string;
    moveTo: string;
    movePiece: string;
  };
}

export interface AnalysisResultsElement extends HTMLElement {
  innerHTML: string;
}

export interface GameMovesElement extends HTMLElement {
  innerHTML: string;
}

export interface StatusElement extends HTMLElement {
  textContent: string | null;
}

export interface FENInputElement extends HTMLInputElement {
  value: string;
}

export interface GameNotationElement extends HTMLTextAreaElement {
  value: string;
}

export interface RadioButtonElement extends HTMLInputElement {
  checked: boolean;
  value: string;
}

export interface CheckboxElement extends HTMLInputElement {
  checked: boolean;
}

export interface ButtonElement extends HTMLButtonElement {
  disabled: boolean;
}

export interface SelectElement extends HTMLSelectElement {
  value: string;
}

export interface NumberInputElement extends HTMLInputElement {
  value: string;
}

export interface AppState {
  moves: ChessMove[];
  initialFEN: string;
  currentMoveIndex: number;
  isAnalyzing: boolean;
  currentResults: AnalysisResult | null;
}

export interface DragState {
  element: HTMLElement | null;
  offset: { x: number; y: number };
  isDragging: boolean;
  currentDropTarget: string | null;
  originalPiece: HTMLElement | null;
  originalSquare: string | null;
}

export interface BoardCallbacks {
  onPositionChange: ((position: ChessPosition) => void) | null;
  onMoveMade: ((move: ChessMove) => void) | null;
}

// Stockfish API types
export interface StockfishState {
  instance: StockfishInstance | null;
  isReady: boolean;
  isAnalyzing: boolean;
  currentAnalysis: {
    position: string;
    options: StockfishOptions;
    callback: ((result: AnalysisResult) => void) | null;
  } | null;
}

export interface StockfishCallbacks {
  onReady: (() => void) | null;
  onAnalysisResult: ((result: AnalysisResult) => void) | null;
  onError: ((error: string) => void) | null;
}

export interface StockfishConfig {
  locateFile?: (filename: string) => string | null;
  ready?: Promise<void>;
}

export interface StockfishInstance {
  // Core methods
  postMessage(message: string): void;
  postCustomMessage?(message: string): void;
  addMessageListener(listener: (message: string) => void): void;
  removeMessageListener(listener: (message: string) => void): void;

  // Single-threaded specific
  onCustomMessage?: (message: string) => void;

  // Utility methods
  terminate(): void;
  print(message: string): void;
  printErr(message: string): void;

  // Internal properties
  __IS_SINGLE_THREADED__?: boolean;
  _origOnCustomMessage?: (message: string) => void;

  // Queue management
  pauseQueue(): void;
  unpauseQueue(): void;

  // Ready state
  ready: Promise<void>;
}

export interface StockfishConstructor {
  (config?: StockfishConfig): Promise<StockfishInstance>;
}

// Global Stockfish declaration
declare global {
  interface Window {
    Stockfish: StockfishConstructor;
  }
}

export type Square = string; // e.g., "e4", "a1", etc.
export type File = "a" | "b" | "c" | "d" | "e" | "f" | "g" | "h";
export type Rank = "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8";

export type NotationFormat = "short" | "long";
export type PieceFormat = "unicode" | "english";

export type AnalysisStatus = "analyzing" | "complete" | "error";

// Type-safe piece notation types
export type PieceTypeNotation = string & {
  readonly __brand: "PieceTypeNotation";
};

export type ColorNotation = string & { readonly __brand: "ColorNotation" };

export type PieceNotation = string & { readonly __brand: "PieceNotation" };

export type WhitePieceNotation = string & {
  readonly __brand: "WhitePieceNotation";
};

export type BlackPieceNotation = string & {
  readonly __brand: "BlackPieceNotation";
};

// Type guards for piece notation
export function isPieceTypeNotation(value: string): value is PieceTypeNotation {
  return /^[PNBRQK]$/.test(value);
}

export function isColorNotation(value: string): value is ColorNotation {
  return /^[wb]$/.test(value);
}

export function isPieceNotation(value: string): value is PieceNotation {
  return /^[PNBRQKpnbrqk]$/.test(value);
}

export function isWhitePieceNotation(
  value: string,
): value is WhitePieceNotation {
  return /^[PNBRQK]$/.test(value);
}

export function isBlackPieceNotation(
  value: string,
): value is BlackPieceNotation {
  return /^[pnbrqk]$/.test(value);
}

// Factory functions for piece notation
export function createPieceTypeNotation(value: string): PieceTypeNotation {
  if (!isPieceTypeNotation(value)) {
    throw new Error(`Invalid piece type notation: ${value}`);
  }
  return value as PieceTypeNotation;
}

export function createColorNotation(value: string): ColorNotation {
  if (!isColorNotation(value)) {
    throw new Error(`Invalid color notation: ${value}`);
  }
  return value as ColorNotation;
}

export function createPieceNotation(value: string): PieceNotation {
  if (!isPieceNotation(value)) {
    throw new Error(`Invalid piece notation: ${value}`);
  }
  return value as PieceNotation;
}

export function createWhitePieceNotation(value: string): WhitePieceNotation {
  if (!isWhitePieceNotation(value)) {
    throw new Error(`Invalid white piece notation: ${value}`);
  }
  return value as WhitePieceNotation;
}

export function createBlackPieceNotation(value: string): BlackPieceNotation {
  if (!isBlackPieceNotation(value)) {
    throw new Error(`Invalid black piece notation: ${value}`);
  }
  return value as BlackPieceNotation;
}

// Utility functions for piece notation
export function getPieceNotation(
  type: PieceTypeNotation,
  color: ColorNotation,
): PieceNotation {
  const pieceMap: Record<string, Record<string, string>> = {
    P: { w: "P", b: "p" },
    N: { w: "N", b: "n" },
    B: { w: "B", b: "b" },
    R: { w: "R", b: "r" },
    Q: { w: "Q", b: "q" },
    K: { w: "K", b: "k" },
  };

  const notation = pieceMap[type]?.[color];
  if (!notation) {
    throw new Error(`Invalid piece type or color: ${type}, ${color}`);
  }

  return createPieceNotation(notation);
}

export function getPieceTypeFromNotation(
  piece: PieceNotation,
): PieceTypeNotation {
  const upperPiece = piece.toUpperCase();
  if (!isPieceTypeNotation(upperPiece)) {
    throw new Error(`Invalid piece notation: ${piece}`);
  }
  return createPieceTypeNotation(upperPiece);
}

export function getColorFromNotation(piece: PieceNotation): ColorNotation {
  const isUpperCase = piece === piece.toUpperCase();
  return createColorNotation(isUpperCase ? "w" : "b");
}
