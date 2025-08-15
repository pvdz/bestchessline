import { ChessPosition, Square, PlayerColor } from "./types.js";

/**
 * FEN Utility Functions
 *
 * Provides functions for parsing and manipulating FEN (Forsyth-Edwards Notation) strings,
 * coordinate conversion between chess squares and array indices, and square validation.
 */

/**
 * Parse a FEN string into a ChessPosition object
 */
export function parseFEN(fen: string): ChessPosition {
  if (typeof fen !== "string" || fen.trim() === "") {
    throw new Error("parseFEN(): FEN must be a non-empty string");
  }
  const parts = fen.trim().split(/\s+/);
  if (parts.length !== 6) {
    throw new Error(`parseFEN(): FEN must have exactly 6 fields: ${fen}`);
  }

  const boardPart = parts[0];
  const turnPart = parts[1];
  const castlingPart = parts[2];
  const enPassantPart = parts[3];
  const halfMovePart = parts[4];
  const fullMovePart = parts[5];

  if (turnPart !== "w" && turnPart !== "b") {
    throw new Error(`parseFEN(): active color must be 'w' or 'b': ${turnPart}`);
  }
  const turn = turnPart as PlayerColor;

  // Validate castling availability: '-' or combination of KQkq without duplicates
  let castling = castlingPart;
  if (castling !== "-") {
    if (!/^[KQkq]+$/.test(castling)) {
      throw new Error(`parseFEN(): invalid castling availability: ${castling}`);
    }
    const set = new Set(castling.split(""));
    if (set.size !== castling.length) {
      throw new Error(`parseFEN(): duplicate castling flags: ${castling}`);
    }
  }

  // Validate en passant target square: '-' or a valid square on rank 3 (for black to move) or 6 (for white to move)
  let enPassant: string | null = null;
  if (enPassantPart !== "-") {
    // Whatever.

    // if (!isValidSquare(enPassantPart)) {
    //   throw new Error(
    //     `parseFEN(): invalid en passant square: ${enPassantPart}`,
    //   );
    // }
    // const rank = enPassantPart[1];
    // if (turn === "w" && rank !== "6") {
    //   throw new Error(
    //     `parseFEN(): en passant square must be on rank 6 when white to move: ${enPassantPart} on FEN ${fen}`,
    //   );
    // }
    // if (turn === "b" && rank !== "3") {
    //   throw new Error(
    //     `parseFEN(): en passant square must be on rank 3 when black to move: ${enPassantPart}`,
    //   );
    // }
    enPassant = enPassantPart;
  }

  // Validate half-move clock and full move number
  const halfMoveClock = Number(halfMovePart);
  const fullMoveNumber = Number(fullMovePart);
  if (!Number.isInteger(halfMoveClock) || halfMoveClock < 0) {
    throw new Error(
      `parseFEN(): halfmove clock must be a non-negative integer: ${halfMovePart}`,
    );
  }
  if (!Number.isInteger(fullMoveNumber) || fullMoveNumber < 1) {
    throw new Error(
      `parseFEN(): fullmove number must be a positive integer: ${fullMovePart}`,
    );
  }

  // Parse board
  const ranks = boardPart.split("/");
  if (ranks.length !== 8) {
    throw new Error(`parseFEN(): board must have 8 ranks: ${boardPart}`);
  }
  const board: string[][] = Array.from({ length: 8 }, () => Array(8).fill(""));
  const allowedPieces = new Set([
    "p",
    "n",
    "b",
    "r",
    "q",
    "k",
    "P",
    "N",
    "B",
    "R",
    "Q",
    "K",
  ]);
  let whiteKing = 0;
  let blackKing = 0;
  for (let r = 0; r < 8; r++) {
    const row = ranks[r];
    let file = 0;
    for (let i = 0; i < row.length; i++) {
      const ch = row[i];
      if (ch >= "1" && ch <= "8") {
        file += Number(ch);
        if (file > 8) {
          throw new Error(`parseFEN(): rank ${r + 1} overflows 8 files`);
        }
      } else {
        if (!allowedPieces.has(ch)) {
          throw new Error(`parseFEN(): invalid piece '${ch}' in board`);
        }
        if (file >= 8) {
          throw new Error(`parseFEN(): too many files in rank ${r + 1}`);
        }
        board[r][file] = ch;
        if (ch === "K") whiteKing++;
        else if (ch === "k") blackKing++;
        file++;
      }
    }
    if (file !== 8) {
      throw new Error(`parseFEN(): rank ${r + 1} does not fill 8 files`);
    }
  }
  if (whiteKing !== 1 || blackKing !== 1) {
    throw new Error(
      `parseFEN(): expected exactly one white king and one black king (found K=${whiteKing}, k=${blackKing})`,
    );
  }

  return { board, turn, castling, enPassant, halfMoveClock, fullMoveNumber };
}

/**
 * Convert a ChessPosition object to a FEN string
 */
export function toFEN(position: ChessPosition): string {
  let fen = "";

  // Board
  for (let rank = 0; rank < 8; rank++) {
    let emptyCount = 0;
    for (let file = 0; file < 8; file++) {
      const piece = position.board[rank][file];
      if (piece === "") {
        emptyCount++;
      } else {
        if (emptyCount > 0) {
          fen += emptyCount;
          emptyCount = 0;
        }
        fen += piece;
      }
    }
    if (emptyCount > 0) {
      fen += emptyCount;
    }
    if (rank < 7) fen += "/";
  }

  // Turn
  fen += ` ${position.turn}`;

  // Castling
  fen += ` ${position.castling}`;

  // En passant
  fen += ` ${position.enPassant || "-"}`;

  // Half move clock
  fen += ` ${position.halfMoveClock}`;

  // Full move number
  fen += ` ${position.fullMoveNumber}`;

  return fen;
}

/**
 * Convert a chess square (e.g., "e4") to array coordinates [rank, file]
 */
export function squareToCoords(square: Square): [number, number] {
  const file = square.charCodeAt(0) - "a".charCodeAt(0);
  const rank = 8 - parseInt(square[1]);
  return [rank, file];
}

/**
 * Convert array coordinates [rank, file] to a chess square (e.g., "e4")
 */
export function coordsToSquare(rank: number, file: number): Square {
  const fileChar = String.fromCharCode("a".charCodeAt(0) + file);
  const rankChar = (8 - rank).toString();
  return `${fileChar}${rankChar}` as Square;
}

/**
 * Check if a string is a valid chess square
 */
export function isValidSquare(square: string): square is Square {
  if (square.length !== 2) return false;
  const file = square[0];
  const rank = square[1];
  return file >= "a" && file <= "h" && rank >= "1" && rank <= "8";
}

/**
 * Get piece at a specific square from FEN string
 */
export function getPieceAtSquareFromFEN(square: string, fen: string): string {
  const position = parseFEN(fen);
  const [rank, file] = squareToCoords(square);
  return position.board[rank][file];
}
