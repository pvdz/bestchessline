export interface ChessPosition {
    board: string[][];
    turn: 'w' | 'b';
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
}
export interface AnalysisMove {
    move: ChessMove;
    score: number;
    depth: number;
    pv: ChessMove[];
    nodes: number;
    time: number;
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
export type PieceType = 'P' | 'R' | 'N' | 'B' | 'Q' | 'K';
export type Color = 'w' | 'b';
export interface Piece {
    type: PieceType;
    color: Color;
    square: string;
}
