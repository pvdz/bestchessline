export interface ChessPosition {
  board: string[][];
  turn: "w" | "b";
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
}

export interface AnalysisResult {
  moves: AnalysisMove[];
  position: string;
  depth: number;
  completed: boolean;
}

export interface StockfishOptions {
  depth?: number;
  movetime?: number;
  nodes?: number;
  threads?: number;
  hash?: number;
  multiPV?: number;
}

// Stockfish API types based on the source code
// Note: StockfishConfig, StockfishInstance, StockfishConstructor, and global Window interface
// are already defined above, so we don't need to duplicate them here

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

export interface DebounceFunction<T extends (...args: unknown[]) => unknown> {
  (...args: Parameters<T>): void;
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

// Note: BoardState is already defined above with the correct structure for chess-board.ts

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

// Global window interface
declare global {
  interface Window {
    Stockfish: StockfishConstructor;
  }
}

// Additional types for better type safety
export type Square = string; // e.g., "e4", "a1", etc.
export type File = "a" | "b" | "c" | "d" | "e" | "f" | "g" | "h";
export type Rank = "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8";

export type NotationFormat = "short" | "long";
export type PieceFormat = "unicode" | "english";

export type AnalysisStatus = "analyzing" | "complete" | "error";

// ============================================================================
// BEST LINES ANALYSIS TYPES
// ============================================================================

export interface BestLineNode {
  fen: string;
  move: ChessMove;
  score: number;
  depth: number;
  children: BestLineNode[];
  isWhiteMove: boolean;
  moveNumber: number;
  parent?: BestLineNode;
  analysisResult?: AnalysisResult;
}

export interface BestLinesAnalysis {
  rootFen: string;
  nodes: BestLineNode[];
  maxDepth: number;
  blackResponses: number; // 5 responses
  isComplete: boolean;
  currentPosition: string;
  analysisQueue: string[]; // FEN positions to analyze
  analyzedPositions: Set<string>; // For deduplication
  totalPositions: number; // Total positions to analyze
  // Configuration captured at startup
  config: {
    depthScaler: number;
    blackMovesCount: number;
    threads: number;
    whiteMoves: string[];
  };
}

export interface BestLinesState {
  isAnalyzing: boolean;
  currentAnalysis: BestLinesAnalysis | null;
  progress: {
    totalPositions: number;
    analyzedPositions: number;
    currentPosition: string;
    initialPosition: string;
    pvLinesReceived: number;
  };
}
