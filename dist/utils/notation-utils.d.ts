import { ChessMove, NotationFormat, PieceFormat, PieceTypeNotation, ColorNotation } from "../types.js";
/**
 * Chess Notation Utility Functions
 *
 * Provides functions for converting chess moves to various notation formats,
 * handling piece symbols, and formatting principal variations (PV).
 */
export declare const PIECE_TYPES: {
    readonly KING: "K";
    readonly QUEEN: "Q";
    readonly ROOK: "R";
    readonly BISHOP: "B";
    readonly KNIGHT: "N";
    readonly PAWN: "P";
};
/**
 * Convert a chess move to notation
 */
export declare function moveToNotation(move: ChessMove, format?: NotationFormat, pieceFormat?: PieceFormat, fen?: string): string;
/**
 * Get the symbol for a piece type and color
 */
export declare function getPieceSymbol(type: PieceTypeNotation, color: ColorNotation, format?: PieceFormat): string;
/**
 * Convert a principal variation (PV) to notation
 */
export declare function pvToNotation(pv: ChessMove[], format?: NotationFormat, pieceFormat?: PieceFormat, fen?: string): string;
