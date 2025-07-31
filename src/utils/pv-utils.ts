import {
  ChessMove,
  AnalysisMove,
  NotationFormat,
  PieceFormat,
  PLAYER_COLORS,
} from "../types.js";
import { parseFEN, toFEN } from "./fen-utils.js";
import { moveToNotation } from "./notation-utils.js";
import { applyMoveToFEN } from "./fen-manipulation.js";
import { validateMove } from "../move-validator.js";
import { getAppState, actuallyUpdateResultsPanel } from "../main.js";

/**
 * Principal Variation Utility Functions
 *
 * Provides functions for formatting and handling principal variations.
 */

/**
 * Format a principal variation with effects
 * @param pv Array of moves in the principal variation
 * @param position The starting position in FEN
 * @param format The notation format to use
 * @param pieceFormat The piece format to use
 * @returns Formatted principal variation string
 */
export function formatPVWithEffects(
  pv: ChessMove[],
  position: string,
  format: NotationFormat,
  pieceFormat: PieceFormat,
): string {
  const parsedPosition = parseFEN(position);
  const isBlackTurn = parsedPosition.turn === PLAYER_COLORS.BLACK;

  // Get current game state to determine starting move number
  const appState = getAppState();
  const currentMoveCount = appState.currentMoveIndex + 1; // +1 because currentMoveIndex is 0-based
  const currentMoveNumber = Math.floor(currentMoveCount / 2) + 1;

  // Process moves in the context of the actual position
  let currentPosition = parseFEN(position);
  const moves = pv.map((move: ChessMove, index: number) => {
    // Validate each move against the current position
    const validation = validateMove(currentPosition, move);

    // Update the move with effect information
    const enhancedMove = {
      ...move,
      effect: validation.effect,
    };

    const notation = moveToNotation(
      enhancedMove,
      format,
      pieceFormat,
      toFEN(currentPosition),
    );

    // Apply the move to get the position for the next move
    if (validation.isValid) {
      const newFEN = applyMoveToFEN(toFEN(currentPosition), move);
      currentPosition = parseFEN(newFEN);
    }

    // Create clickable move with data attributes
    return `<span class="pv-move" data-move-from="${move.from}" data-move-to="${move.to}" data-move-piece="${move.piece}" data-original-position="${position}" data-move-index="${index}" title="Click to apply all moves up to this point">${notation}</span>`;
  });

  if (format === "long") {
    // Long format: just show the moves with piece symbols
    return moves.join(" ");
  } else {
    // Short format: standard game notation with move numbers
    let result = "";
    let currentMoveNum = currentMoveNumber;

    for (let i = 0; i < moves.length; i++) {
      if (isBlackTurn) {
        // If it's black's turn, the first move is black's move
        if (i % 2 === 0) {
          // Black move - only show move number with dots for the very first move
          if (i === 0) {
            result += `${currentMoveNum}...${moves[i]}`;
          } else {
            result += ` ${moves[i]}`;
          }
        } else {
          // White move (second move)
          result += ` ${currentMoveNum + 1}.${moves[i]}`;
        }
      } else {
        // If it's white's turn, the first move is white's move
        if (i % 2 === 0) {
          // White move (first move)
          result += `${currentMoveNum}.${moves[i]}`;
        } else {
          // Black move (second move)
          result += ` ${moves[i]}`;
        }
      }

      // Increment move number after every second move (complete move pair)
      if (i % 2 === 1) {
        currentMoveNum++;
      }

      // Add line breaks every 6 moves (3 full moves)
      if ((i + 1) % 6 === 0 && i < moves.length - 1) {
        result += "\n";
      } else if (i < moves.length - 1) {
        result += " ";
      }
    }
    return result;
  }
}

// Debounce mechanism for analysis updates
let analysisUpdateTimeout: number | null = null;
let queuedMoves: AnalysisMove[] = [];

/**
 * Update results panel with debouncing
 * @param moves Array of analysis moves to display
 */
export function updateResultsPanel(moves: AnalysisMove[]): void {
  queuedMoves = moves;
  if (analysisUpdateTimeout) {
    return;
  }

  // Debounce the update to prevent rapid changes
  analysisUpdateTimeout = window.setTimeout(() => {
    actuallyUpdateResultsPanel(queuedMoves);
    analysisUpdateTimeout = null;
    queuedMoves = [];
  }, 100);
}
