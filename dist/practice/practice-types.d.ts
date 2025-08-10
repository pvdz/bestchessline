export interface GameState {
  currentFEN: string;
  isPracticeActive: boolean;
  isHumanTurn: boolean;
  selectedSquare: string | null;
  validMoves: string[];
  openingLines: OpeningLine[];
  positionMap: Map<string, string[]>;
  positionTopMoves?: Map<
    string,
    {
      move: string;
      score: number;
    }[]
  >;
  computerMoveStrategy: "random" | "serial" | "adaptive";
  maxDepth: number;
  currentDepth: number;
  positionHistory: string[];
  moveHistory: Array<{
    notation: string;
    isCorrect: boolean;
    isWhite: boolean;
  }>;
  pinnedPosition: string | null;
  pinnedDepth: number;
  statistics: {
    correctMoves: number;
    totalMoves: number;
    accuracy: number;
    lineAttempts: Record<string, number>;
  };
  lastEngineMoveLong?: string | null;
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
  topMoves: HTMLElement;
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
