// Import shared types from utils
import {
  ChessPosition,
  ChessMove,
  AnalysisMove,
  AnalysisResult,
  StockfishOptions,
  AnalysisConfig,
  BoardState,
  PieceType,
  Color,
  PLAYER_COLORS,
  PlayerColor,
  Piece,
  AnalysisOptions,
  LogArguments,
  LogFunction,
  DebounceFunction,
  MoveItem,
  ProcessedMoveItem,
  FormatSettings,
  MoveItemElement,
  AnalysisResultsElement,
  GameMovesElement,
  StatusElement,
  FENInputElement,
  GameNotationElement,
  RadioButtonElement,
  CheckboxElement,
  ButtonElement,
  SelectElement,
  NumberInputElement,
  AppState,
  DragState,
  BoardCallbacks,
  StockfishState,
  StockfishCallbacks,
  StockfishConfig,
  StockfishInstance,
  StockfishConstructor,
  Square,
  File,
  Rank,
  NotationFormat,
  PieceFormat,
  AnalysisStatus,
  PieceTypeNotation,
  ColorNotation,
  PieceNotation,
  WhitePieceNotation,
  BlackPieceNotation,
  isPieceTypeNotation,
  isColorNotation,
  isPieceNotation,
  isWhitePieceNotation,
  isBlackPieceNotation,
  createPieceTypeNotation,
  createColorNotation,
  createPieceNotation,
  createWhitePieceNotation,
  createBlackPieceNotation,
  getPieceNotation,
  getPieceTypeFromNotation,
  getColorFromNotation,
} from "../utils/types.js";

// Re-export all shared types
export {
  ChessPosition,
  ChessMove,
  AnalysisMove,
  AnalysisResult,
  StockfishOptions,
  AnalysisConfig,
  BoardState,
  PieceType,
  Color,
  PLAYER_COLORS,
  PlayerColor,
  Piece,
  AnalysisOptions,
  LogArguments,
  LogFunction,
  DebounceFunction,
  MoveItem,
  ProcessedMoveItem,
  FormatSettings,
  MoveItemElement,
  AnalysisResultsElement,
  GameMovesElement,
  StatusElement,
  FENInputElement,
  GameNotationElement,
  RadioButtonElement,
  CheckboxElement,
  ButtonElement,
  SelectElement,
  NumberInputElement,
  AppState,
  DragState,
  BoardCallbacks,
  StockfishState,
  StockfishCallbacks,
  StockfishConfig,
  StockfishInstance,
  StockfishConstructor,
  Square,
  File,
  Rank,
  NotationFormat,
  PieceFormat,
  AnalysisStatus,
  PieceTypeNotation,
  ColorNotation,
  PieceNotation,
  WhitePieceNotation,
  BlackPieceNotation,
  isPieceTypeNotation,
  isColorNotation,
  isPieceNotation,
  isWhitePieceNotation,
  isBlackPieceNotation,
  createPieceTypeNotation,
  createColorNotation,
  createPieceNotation,
  createWhitePieceNotation,
  createBlackPieceNotation,
  getPieceNotation,
  getPieceTypeFromNotation,
  getColorFromNotation,
};

// Line-specific types that are not shared with utils
export interface TreeDiggerNode {
  move: ChessMove;
  position: string;
  score: number;
  depth: number;
  isWhiteMove: boolean;
  moveNumber: number;
  children: TreeDiggerNode[];
  isTransposition: boolean;
  transpositionSource?: string;
}

export interface TreeDiggerAnalysis {
  rootPosition: string;
  nodes: TreeDiggerNode[];
  totalPositions: number;
  analyzedPositions: number;
  currentPosition: string;
  pvLinesReceived: number;
  startTime: number;
  eventsPerSecond: number;
  isComplete: boolean;
}

// Line-specific state types
export interface LineFisherState {
  isAnalyzing: boolean;
  currentAnalysis: TreeDiggerAnalysis | null;
  progress: {
    totalPositions: number;
    analyzedPositions: number;
    currentPosition: string;
    pvLinesReceived: number;
  };
}

// Line-specific configuration types
export interface LineFisherConfig {
  initiatorMoves: string[]; // First n moves for initiator (e.g., ["Nf3", "g3"])
  responderMoveCounts: number[]; // Number of responses for each initiator move (e.g., [2, 3])
  maxDepth: number; // Maximum analysis depth
  threads: number; // Number of CPU threads
  defaultResponderCount: number; // Default responder count for levels not specified
  rootFEN: string; // Root position for analysis
  baselineScore?: number; // Score of the root position for delta calculations
  baselineMoves?: { move: string; score: number }[]; // Top moves from root position
}

// Line-specific result types
export interface LineFisherResult {
  lineIndex: number;
  pcns: string[]; // PCN notation moves in this line (e.g., ["Ng1f3", "g8f6", "d2d4"])
  deltas: number[];
  sanLine: string; // Computed SAN game string (computed on demand)
  isComplete: boolean;
  isDone: boolean; // No more updates expected
  isTransposition?: boolean; // Track if this line leads to a transposed position
  responderMoveList?: string[]; // For initiator moves only, only used for display - format: "moveNotation (score)" (e.g., "Nf3 (+0.5)")
  updateCount: number; // Track number of updates applied to this line
}

// Fish-specific types
export interface FishLine {
  sanGame: string; // Computed SAN game string (computed on demand)
  pcns: string[]; // PCN notation moves in this line (for export/display)
  score: number; // Score of the last move in this line
  delta: number; // Delta from baseline score for the last move
  position: string; // Current position FEN
  isDone: boolean; // Whether this line is complete
  isFull: boolean; // Whether this line has reached max depth
}

export interface FishState {
  isFishing: boolean; // Flag to control if analysis should continue
  wip: FishLine[]; // Lines currently being worked on
  done: FishLine[]; // Completed lines
  config: LineFisherConfig;
}

// Line-specific UI types
export interface LineFisherDisplayFormat {
  pcns: string[];
  deltas: number[];
  sanGame: string;
  isComplete: boolean;
  isDone: boolean;
  depth: number;
  score: string;
  delta: string;
}

// Line-specific branching state
export interface BranchState {
  branchMoves: ChessMove[];
  branchStartIndex: number;
  isInBranch: boolean;
}

// Extended AppState for line-specific features
export interface ExtendedAppState extends AppState {
  // Branching state
  branchMoves: ChessMove[];
  branchStartIndex: number;
  isInBranch: boolean;

  // Position evaluation state
  positionEvaluation: {
    score: number | null;
    isMate: boolean;
    mateIn: number | null;
    isAnalyzing: boolean;
  };
}
