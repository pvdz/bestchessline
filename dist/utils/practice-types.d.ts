export interface GameState {
  currentFEN: string;
  currentLineIndex: number;
  currentMoveIndex: number;
  isPracticeActive: boolean;
  isHumanTurn: boolean;
  selectedSquare: string | null;
  validMoves: string[];
  openingLines: Array<{
    name: string;
    moves: string[];
  }>;
  statistics: {
    correctMoves: number;
    totalMoves: number;
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
  statusIndicator: HTMLElement;
  statusText: HTMLElement;
  correctMovesEl: HTMLElement;
  totalMovesEl: HTMLElement;
  accuracyEl: HTMLElement;
  currentLineEl: HTMLElement;
  startingFenInput: HTMLInputElement;
  openingLinesInput: HTMLTextAreaElement;
  movesHistoryEl: HTMLElement;
}
