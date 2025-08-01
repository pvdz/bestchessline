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
// TREE DIGGER ANALYSIS TYPES
// ============================================================================

export interface TreeDiggerNode {
  fen: string;
  move: ChessMove;
  score: number;
  depth: number;
  children: TreeDiggerNode[];
  isWhiteMove: boolean;
  moveNumber: number;
  parent?: TreeDiggerNode;
  analysisResult?: AnalysisResult;
  mateIn?: number; // Actual number of moves required for mate (different from depth)
  needsEvaluation?: boolean; // Flag for predefined moves that need evaluation
}

export interface TreeDiggerAnalysis {
  rootFen: string;
  nodes: TreeDiggerNode[];
  maxDepth: number;
  responderResponses: number; // 5 responses
  isComplete: boolean;
  currentPosition: string;
  analysisQueue: string[]; // FEN positions to analyze
  analyzedPositions: Set<string>; // For deduplication
  totalPositions: number; // Total positions to analyze
  initialPositionScore?: number; // Score of the initial position
  // Configuration captured at startup
  config: {
    depthScaler: number;
    responderMovesCount: number;
    threads: number;
    initiatorMoves: string[];
    firstReplyOverride: number;
    secondReplyOverride: number;
  };
}

export interface TreeDiggerState {
  isAnalyzing: boolean;
  currentAnalysis: TreeDiggerAnalysis | null;
  progress: {
    totalPositions: number;
    analyzedPositions: number;
    currentPosition: string;
    initialPosition: string;
    pvLinesReceived: number;
  };
}

// ============================================================================
// OPAQUE TYPES FOR PIECE NOTATIONS
// ============================================================================

// Opaque type for piece type notations (P, R, N, B, Q, K)
export type PieceTypeNotation = string & {
  readonly __brand: "PieceTypeNotation";
};

// Opaque type for color notations (w, b)
export type ColorNotation = string & { readonly __brand: "ColorNotation" };

// Opaque type for piece notations (P, p, R, r, N, n, B, b, Q, q, K, k)
export type PieceNotation = string & { readonly __brand: "PieceNotation" };

// Opaque type for white piece notations (P, R, N, B, Q, K)
export type WhitePieceNotation = string & {
  readonly __brand: "WhitePieceNotation";
};

// Opaque type for black piece notations (p, r, n, b, q, k)
export type BlackPieceNotation = string & {
  readonly __brand: "BlackPieceNotation";
};

// ============================================================================
// TYPE GUARDS FOR PIECE NOTATIONS
// ============================================================================

export function isPieceTypeNotation(value: string): value is PieceTypeNotation {
  return /^[PNBRQK]$/.test(value);
}

export function isColorNotation(value: string): value is ColorNotation {
  return value === "w" || value === "b";
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

// ============================================================================
// CONSTRUCTOR FUNCTIONS FOR PIECE NOTATIONS
// ============================================================================

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

// ============================================================================
// CONSTANTS FOR PIECE NOTATIONS
// ============================================================================

export const PIECE_TYPE_NOTATIONS = {
  PAWN: createPieceTypeNotation("P"),
  ROOK: createPieceTypeNotation("R"),
  KNIGHT: createPieceTypeNotation("N"),
  BISHOP: createPieceTypeNotation("B"),
  QUEEN: createPieceTypeNotation("Q"),
  KING: createPieceTypeNotation("K"),
} as const;

export const COLOR_NOTATIONS = {
  WHITE: createColorNotation("w"),
  BLACK: createColorNotation("b"),
} as const;

export const WHITE_PIECE_NOTATIONS = {
  PAWN: createWhitePieceNotation("P"),
  ROOK: createWhitePieceNotation("R"),
  KNIGHT: createWhitePieceNotation("N"),
  BISHOP: createWhitePieceNotation("B"),
  QUEEN: createWhitePieceNotation("Q"),
  KING: createWhitePieceNotation("K"),
} as const;

export const BLACK_PIECE_NOTATIONS = {
  PAWN: createBlackPieceNotation("p"),
  ROOK: createBlackPieceNotation("r"),
  KNIGHT: createBlackPieceNotation("n"),
  BISHOP: createBlackPieceNotation("b"),
  QUEEN: createBlackPieceNotation("q"),
  KING: createBlackPieceNotation("k"),
} as const;

// ============================================================================
// UTILITY FUNCTIONS FOR PIECE NOTATIONS
// ============================================================================

export function getPieceNotation(
  type: PieceTypeNotation,
  color: ColorNotation,
): PieceNotation {
  if (color === COLOR_NOTATIONS.WHITE) {
    return createPieceNotation(type);
  } else {
    return createPieceNotation(type.toLowerCase());
  }
}

export function getPieceTypeFromNotation(
  piece: PieceNotation,
): PieceTypeNotation {
  // Runtime validation
  if (!piece || typeof piece !== "string") {
    throw new Error(`Invalid piece notation: ${piece}`);
  }

  const upperPiece = piece.toUpperCase();
  if (!isPieceTypeNotation(upperPiece)) {
    throw new Error(`Invalid piece type: ${upperPiece} from ${piece}`);
  }

  return createPieceTypeNotation(upperPiece);
}

export function getColorFromNotation(piece: PieceNotation): ColorNotation {
  // Runtime validation
  if (!piece || typeof piece !== "string") {
    throw new Error(`Invalid piece notation: ${piece}`);
  }

  if (!isPieceNotation(piece)) {
    throw new Error(`Invalid piece notation: ${piece}`);
  }

  const isWhite = piece === piece.toUpperCase();
  return createColorNotation(isWhite ? "w" : "b");
}

// ============================================================================
// TREE DIGGER STATE PERSISTENCE TYPES
// ============================================================================

/**
 * Version tracking for state format compatibility
 */
export const TREE_DIGGER_STATE_VERSION = "1.0.0";

/**
 * Metadata for tree digger state exports
 */
export interface TreeDiggerStateMetadata {
  version: string;
  timestamp: number;
  boardPosition: string; // FEN at time of export
  configuration: {
    depthScaler: number;
    responderMovesCount: number;
    threads: number;
    initiatorMoves: string[];
    firstReplyOverride: number;
    secondReplyOverride: number;
  };
  progress: {
    totalPositions: number;
    analyzedPositions: number;
    currentPosition: string;
    initialPosition: string;
    pvLinesReceived: number;
  };
  statistics: {
    totalNodes: number;
    totalLeafs: number;
    uniquePositions: number;
    maxDepth: number;
  };
}

/**
 * Serialized tree digger node for JSON export
 */
export interface SerializedTreeDiggerNode {
  fen: string;
  move: ChessMove;
  score: number;
  depth: number;
  children: SerializedTreeDiggerNode[];
  isWhiteMove: boolean;
  moveNumber: number;
  mateIn?: number;
  needsEvaluation?: boolean;
  // Note: parent is not serialized to avoid circular references
  // Note: analysisResult is not serialized to reduce file size
}

/**
 * Complete tree digger state export format
 */
export interface TreeDiggerStateExport {
  metadata: TreeDiggerStateMetadata;
  analysis: {
    rootFen: string;
    nodes: SerializedTreeDiggerNode[];
    maxDepth: number;
    responderResponses: number;
    isComplete: boolean;
    currentPosition: string;
    analysisQueue: string[];
    analyzedPositions: string[]; // Converted from Set<string>
    totalPositions: number;
    initialPositionScore?: number;
    config: {
      depthScaler: number;
      responderMovesCount: number;
      threads: number;
      initiatorMoves: string[];
      firstReplyOverride: number;
      secondReplyOverride: number;
    };
  };
  state: {
    isAnalyzing: boolean;
    progress: {
      totalPositions: number;
      analyzedPositions: number;
      currentPosition: string;
      initialPosition: string;
      pvLinesReceived: number;
    };
  };
}

/**
 * Validation result for imported state
 */
export interface TreeDiggerStateValidation {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  compatibility: {
    versionCompatible: boolean;
    boardPositionMatch: boolean;
    configurationMatch: boolean;
  };
}
