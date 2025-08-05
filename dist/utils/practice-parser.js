import { parseMove } from "./move-parsing.js";
// Parse opening lines from text format
export function parseOpeningLines(text) {
  const lines = text.trim().split("\n");
  const openingLines = [];
  for (const line of lines) {
    if (!line.trim()) continue;
    // Split line into moves and comment
    const commentIndex = line.indexOf("//");
    let movesText, comment;
    if (commentIndex !== -1) {
      movesText = line.substring(0, commentIndex).trim();
      comment = line.substring(commentIndex + 2).trim();
    } else {
      movesText = line.trim();
      comment = "";
    }
    // Extract moves (remove move numbers and extra spaces)
    const moves = movesText
      .split(/\s+/)
      .filter((token) =>
        token.match(
          /^[a-h]?[x]?[a-h][1-8]|^[O0]-[O0]|^[KQRBN][a-h]?[1-8]?[x]?[a-h][1-8]|^[a-h][x]?[a-h][1-8]|^[KQRBN][a-h][1-8]|^[a-h][1-8]$/,
        ),
      )
      .map((move) => move.replace(/^[0-9]+\.\s*/, "")); // Remove move numbers
    if (moves.length > 0) {
      openingLines.push({
        name: comment || `Opening Line ${openingLines.length + 1}`,
        moves: moves,
      });
    }
  }
  return openingLines;
}
// Get move notation
export function getMoveNotation(move) {
  // Simplified move notation
  const piece = move.piece.toUpperCase();
  if (piece === "P") {
    if (move.from[0] !== move.to[0]) {
      // Capture
      return `${move.from[0]}x${move.to}`;
    } else {
      return move.to;
    }
  } else {
    return `${piece}${move.to}`;
  }
}
// Parse a move from SAN notation
export function parseMoveFromSAN(san, fen) {
  return parseMove(san, fen);
}
//# sourceMappingURL=practice-parser.js.map
