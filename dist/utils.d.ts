import { ChessPosition, ChessMove, Square, NotationFormat, PieceFormat, PieceTypeNotation, ColorNotation, PieceNotation, PlayerColor } from "./types.js";
export declare function parseFEN(fen: string): ChessPosition;
export declare function toFEN(position: ChessPosition): string;
export declare function squareToCoords(square: Square): [number, number];
export declare function coordsToSquare(rank: number, file: number): Square;
export declare function isValidSquare(square: string): square is Square;
export declare function getPieceColor(piece: PieceNotation): ColorNotation;
export declare const PIECE_TYPES: {
    readonly KING: PieceTypeNotation;
    readonly QUEEN: PieceTypeNotation;
    readonly ROOK: PieceTypeNotation;
    readonly BISHOP: PieceTypeNotation;
    readonly KNIGHT: PieceTypeNotation;
    readonly PAWN: PieceTypeNotation;
};
export declare function getPieceType(piece: PieceNotation): PieceTypeNotation;
/**
 * Format a score with proper mate notation using mateIn
 * @param score The score in centipawns
 * @param mateIn The number of moves required for mate (0 if not a mate)
 * @returns Formatted score string
 */
export declare function formatScoreWithMateIn(score: number, mateIn: number): string;
export declare function formatTime(ms: number): string;
/**
 * Set the global current move index
 */
export declare function setGlobalCurrentMoveIndex(moveIndex: number): void;
/**
 * Get the global current move index
 */
export declare function getGlobalCurrentMoveIndex(): number;
/**
 * Get FEN with correct move counter based on current move index
 */
export declare function getFENWithCorrectMoveCounter(boardFEN: string, currentMoveIndex: number, castling?: string, enPassant?: string | null): string;
export declare function debounce<T extends (...args: unknown[]) => unknown>(func: T, wait: number): (...args: Parameters<T>) => void;
export declare function moveToNotation(move: ChessMove, format?: NotationFormat, pieceFormat?: PieceFormat, fen?: string): string;
export declare function getPieceSymbol(type: PieceTypeNotation, color: ColorNotation, format?: PieceFormat): string;
export declare function pvToNotation(pv: ChessMove[], format?: NotationFormat, pieceFormat?: PieceFormat, fen?: string): string;
/**
 * Apply a chess move to a FEN string and return the new FEN
 */
export declare function applyMoveToFEN(fen: string, move: ChessMove): string;
/**
 * Parse a simple move string and return a ChessMove object
 */
export declare function parseSimpleMove(moveText: string, fen: string): ChessMove | null;
/**
 * Find the from square for a piece moving to a destination
 */
export declare function findFromSquare(piece: PieceNotation, toSquare: string, currentFEN: string): string | null;
/**
 * Find the from square with disambiguation
 */
export declare function findFromSquareWithDisambiguation(piece: PieceNotation, toSquare: string, disambiguation: string, currentFEN: string): string | null;
/**
 * Check if a piece can move from one square to another
 */
export declare function canPieceMoveTo(fromSquare: string, toSquare: string, piece: PieceNotation, board: string[][]): boolean;
/**
 * Check if a pawn can move from one square to another
 */
export declare function canPawnMoveTo(fromSquare: string, toSquare: string, board: string[][]): boolean;
/**
 * Check if a rook can move from one square to another
 */
export declare function canRookMoveTo(fromSquare: string, toSquare: string, board: string[][]): boolean;
/**
 * Check if a knight can move from one square to another
 */
export declare function canKnightMoveTo(fromSquare: string, toSquare: string, board: string[][]): boolean;
/**
 * Check if a bishop can move from one square to another
 */
export declare function canBishopMoveTo(fromSquare: string, toSquare: string, board: string[][]): boolean;
/**
 * Check if a queen can move from one square to another
 */
export declare function canQueenMoveTo(fromSquare: string, toSquare: string, board: string[][]): boolean;
/**
 * Check if a king can move from one square to another
 */
export declare function canKingMoveTo(fromSquare: string, toSquare: string, board: string[][]): boolean;
/**
 * Select the correct move from multiple candidates
 */
export declare function selectCorrectMove(candidates: string[], toSquare: string, piece: PieceNotation, board: string[][]): string;
/**
 * Get depth scaler from UI (1-15)
 */
export declare function getDepthScaler(): number;
/**
 * Get black moves count from UI
 */
export declare function getResponderMovesCount(): number;
/**
 * Get thread count from UI
 */
export declare function getThreadCount(): number;
/**
 * Get the starting player from a FEN string
 */
export declare function getStartingPlayer(fen: string): PlayerColor;
/**
 * Compare two analysis moves for sorting. The moves should always be for the same player
 * from the same position, maybe even the same piece (with different targets).
 * Mate is always the best move. When two moves mate or have same score, use consistent ordering.
 *
 * @param a First analysis move. Score is negative if in favor of black, otherwise in favor of white
 * @param b Second analysis move. Score is negative if in favor of black, otherwise in favor of white
 * @param currentPlayer The player whose turn it is ("w" for white, "b" for black)
 * @returns Negative if a should come before b, positive if b should come before a, 0 if equal
 */
export declare function compareAnalysisMoves(a: {
    score: number;
    depth: number;
    mateIn: number;
}, b: {
    score: number;
    depth: number;
    mateIn: number;
}, direction?: "asc" | "desc"): number;
/**
 * Get initiator moves from UI inputs
 */
export declare function getInitiatorMoves(): string[];
/**
 * Get first reply override from UI (0 = use default)
 */
export declare function getFirstReplyOverride(): number;
/**
 * Get second reply override from UI (0 = use default)
 */
export declare function getSecondReplyOverride(): number;
/**
 * Calculate total positions with overrides
 */
export declare function calculateTotalPositionsWithOverrides(maxDepth: number, responderResponses: number, firstReplyOverride?: number, secondReplyOverride?: number): number;
/**
 * Show a toast notification
 * @param message The message to display
 * @param background The background color (default: #333)
 * @param duration How long to show (ms, default: 4000)
 */
export declare function showToast(message: string, background?: string, duration?: number): void;
