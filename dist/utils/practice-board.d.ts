export declare const CHESS_PIECES: Record<string, string>;
export declare function initializeBoard(boardGrid: HTMLElement): void;
export declare function renderBoard(fen: string): void;
export declare function getPieceAtSquare(square: string, fen: string): string;
export declare function clearBoardSelection(): void;
export declare function selectSquare(square: string, fen: string): void;
export declare function showHint(square: string): void;
