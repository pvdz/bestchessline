/**
 * FEN Utility Functions
 *
 * Provides functions for parsing and manipulating FEN (Forsyth-Edwards Notation) strings,
 * coordinate conversion between chess squares and array indices, and square validation.
 */
/**
 * Parse a FEN string into a ChessPosition object
 */
export function parseFEN(fen) {
  const parts = fen.split(" ");
  const boardPart = parts[0];
  if (parts[1] !== "w" && parts[1] !== "b")
    console.warn(
      "Warning: parseFEN() received a FEN where the current turn character was not as expected",
      parts,
      [fen],
    );
  const turn = parts[1];
  const castling = parts[2];
  const enPassant = parts[3] === "-" ? null : parts[3];
  const halfMoveClock = parseInt(parts[4]);
  const fullMoveNumber = parseInt(parts[5]);
  const board = Array(8)
    .fill(null)
    .map(() => Array(8).fill(""));
  const ranks = boardPart.split("/");
  for (let rank = 0; rank < 8; rank++) {
    let file = 0;
    for (const char of ranks[rank]) {
      if (char >= "1" && char <= "8") {
        file += parseInt(char);
      } else {
        board[rank][file] = char;
        file++;
      }
    }
  }
  return {
    board,
    turn,
    castling,
    enPassant,
    halfMoveClock,
    fullMoveNumber,
  };
}
/**
 * Convert a ChessPosition object to a FEN string
 */
export function toFEN(position) {
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
export function squareToCoords(square) {
  const file = square.charCodeAt(0) - "a".charCodeAt(0);
  const rank = 8 - parseInt(square[1]);
  return [rank, file];
}
/**
 * Convert array coordinates [rank, file] to a chess square (e.g., "e4")
 */
export function coordsToSquare(rank, file) {
  const fileChar = String.fromCharCode("a".charCodeAt(0) + file);
  const rankChar = (8 - rank).toString();
  return `${fileChar}${rankChar}`;
}
/**
 * Check if a string is a valid chess square
 */
export function isValidSquare(square) {
  if (square.length !== 2) return false;
  const file = square[0];
  const rank = square[1];
  return file >= "a" && file <= "h" && rank >= "1" && rank <= "8";
}
//# sourceMappingURL=fen-utils.js.map
