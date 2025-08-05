import { ChessMove } from "../types.js";
import { clearLastMoveHighlight } from "../../utils/chess-board.js";
import { querySelectorOrThrow } from "../../utils/dom-helpers.js";

/**
 * Board Utility Functions
 *
 * Provides functions for board-related operations like highlighting moves.
 */

/**
 * Highlight the last move on the board
 * @param move The move to highlight
 */
export function highlightLastMove(move: ChessMove): void {
  // Clear previous highlights
  clearLastMoveHighlight();

  // Add highlights for the last move
  const fromSquare = querySelectorOrThrow(
    document,
    `[data-square="${move.from}"]`,
  );
  const toSquare = querySelectorOrThrow(document, `[data-square="${move.to}"]`);

  if (fromSquare) {
    fromSquare.classList.add("last-move-from");
  }
  if (toSquare) {
    toSquare.classList.add("last-move-to");
  }
}
