// Practice game types and interfaces

export interface GameState {
  currentFEN: string;
  isPracticeActive: boolean;
  isHumanTurn: boolean;
  selectedSquare: string | null;
  validMoves: string[];
  openingLines: OpeningLine[];
  positionMap: Map<string, string[]>; // Map of FEN positions to expected moves
  // Optional: metadata with top next-best moves per position, if provided via import
  positionTopMoves?: Map<string, { move: string; score: number }[]>;
  computerMoveStrategy: "random" | "serial" | "adaptive";
  maxDepth: number;
  currentDepth: number;
  positionHistory: string[]; // Array of FEN positions for undo functionality
  moveHistory: Array<{
    notation: string;
    isCorrect: boolean;
    isWhite: boolean;
  }>; // Move history for undo
  pinnedPosition: string | null; // Pinned position FEN for restarting from checkpoint
  pinnedDepth: number; // Depth at which position was pinned
  statistics: {
    correctMoves: number;
    totalMoves: number;
    accuracy: number;
    lineAttempts: Record<string, number>;
  };
}

export interface ChessMove {
  from: string;
  to: string;
  piece: string;
}

export interface OpeningLine {
  name: string;
  moves: string[];
}

export interface DOMElements {
  boardGrid: HTMLElement;
  startBtn: HTMLButtonElement;
  resetBtn: HTMLButtonElement;
  hintBtn: HTMLButtonElement;
  nextBtn: HTMLButtonElement;
  startingFEN: HTMLInputElement;
  moveSelection: HTMLSelectElement;
  openingLines: HTMLTextAreaElement;
  statusIndicator: HTMLElement;
  statusText: HTMLElement;
  correctMoves: HTMLElement;
  totalMoves: HTMLElement;
  accuracy: HTMLElement;
  currentLine: HTMLElement;
  moveHistory: HTMLElement;
  topMoves: HTMLElement; // Container for showing top-5 next best moves if available
  startOverlay: HTMLElement;
  startOverlayBtn: HTMLButtonElement;
  board: HTMLElement;
  maxDepth: HTMLInputElement;
  currentDepth: HTMLElement;
  goBackBtn: HTMLButtonElement;
  goBackRandomBtn: HTMLButtonElement;
  pinPositionBtn: HTMLButtonElement;
  restartPinnedBtn: HTMLButtonElement;
  loadLinesBtn: HTMLButtonElement;
}
