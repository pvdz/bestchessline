export interface GameState {
    currentFEN: string;
    isPracticeActive: boolean;
    isHumanTurn: boolean;
    selectedSquare: string | null;
    validMoves: string[];
    openingLines: OpeningLine[];
    positionMap: Map<string, string[]>;
    computerMoveStrategy: "random" | "serial" | "adaptive";
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
    startOverlay: HTMLElement;
    startOverlayBtn: HTMLButtonElement;
    board: HTMLElement;
}
