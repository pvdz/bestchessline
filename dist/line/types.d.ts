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
export interface LineFisherConfig {
  initiatorMoves: string[];
  responderMoveCounts: number[];
  maxDepth: number;
  threads: number;
  defaultResponderCount: number;
  rootFEN: string;
  baselineScore?: number;
  baselineMoves?: {
    move: string;
    score: number;
  }[];
}
export interface LineFisherResult {
  lineIndex: number;
  pcns: string[];
  scores: number[];
  deltas: number[];
  sanLine: string;
  isComplete: boolean;
  isDone: boolean;
  isTransposition?: boolean;
  responderMoveList?: string[];
  updateCount: number;
}
export interface FishLine {
  sanGame: string;
  pcns: string[];
  score: number;
  delta: number;
  position: string;
  isDone: boolean;
  isFull: boolean;
}
export interface FishState {
  isFishing: boolean;
  wip: FishLine[];
  done: FishLine[];
  config: LineFisherConfig;
}
export interface LineFisherDisplayFormat {
  pcns: string[];
  scores: number[];
  deltas: number[];
  sanGame: string;
  isComplete: boolean;
  isDone: boolean;
  depth: number;
  score: string;
  delta: string;
}
export interface BranchState {
  branchMoves: ChessMove[];
  branchStartIndex: number;
  isInBranch: boolean;
}
export interface ExtendedAppState extends AppState {
  branchMoves: ChessMove[];
  branchStartIndex: number;
  isInBranch: boolean;
  positionEvaluation: {
    score: number | null;
    isMate: boolean;
    mateIn: number | null;
    isAnalyzing: boolean;
  };
}
