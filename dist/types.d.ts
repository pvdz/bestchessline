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
  capturedSquare?: string;
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
  multipv?: number;
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
export interface AnalysisOptions {
  depth: number;
  threads: number;
  multiPV: number;
}
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
  offset: {
    x: number;
    y: number;
  };
  isDragging: boolean;
  currentDropTarget: string | null;
  originalPiece: HTMLElement | null;
  originalSquare: string | null;
}
export interface BoardCallbacks {
  onPositionChange: ((position: ChessPosition) => void) | null;
  onMoveMade: ((move: ChessMove) => void) | null;
}
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
  postMessage(message: string): void;
  postCustomMessage?(message: string): void;
  addMessageListener(listener: (message: string) => void): void;
  removeMessageListener(listener: (message: string) => void): void;
  onCustomMessage?: (message: string) => void;
  terminate(): void;
  print(message: string): void;
  printErr(message: string): void;
  __IS_SINGLE_THREADED__?: boolean;
  _origOnCustomMessage?: (message: string) => void;
  pauseQueue(): void;
  unpauseQueue(): void;
  ready: Promise<void>;
}
export interface StockfishConstructor {
  (config?: StockfishConfig): Promise<StockfishInstance>;
}
declare global {
  interface Window {
    Stockfish: StockfishConstructor;
  }
}
export type Square = string;
export type File = "a" | "b" | "c" | "d" | "e" | "f" | "g" | "h";
export type Rank = "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8";
export type NotationFormat = "short" | "long";
export type PieceFormat = "unicode" | "english";
export type AnalysisStatus = "analyzing" | "complete" | "error";
