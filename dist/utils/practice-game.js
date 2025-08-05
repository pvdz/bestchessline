import { applyMoveToFEN } from "./fen-manipulation.js";
import {
  getPieceAtSquare,
  clearBoardSelection,
  selectSquare,
  showHint,
} from "./practice-board.js";
import { getMoveNotation, parseMoveFromSAN } from "./practice-parser.js";
import {
  updateStatistics,
  updateStatus,
  addMoveToHistory,
  showSuccessToast,
  showErrorToast,
  showInfoToast,
  showWarningToast,
} from "./practice-ui.js";
// Handle square clicks
export function handleSquareClick(square, gameState, dom) {
  if (!gameState.isPracticeActive || !gameState.isHumanTurn) return;
  if (gameState.selectedSquare === square) {
    // Deselect
    clearBoardSelection();
    gameState.selectedSquare = null;
    gameState.validMoves = [];
    return;
  }
  if (gameState.selectedSquare && gameState.validMoves.includes(square)) {
    // Make move
    makeMove(gameState.selectedSquare, square, gameState, dom);
    return;
  }
  // Select new square
  selectSquare(square, gameState.currentFEN);
  gameState.selectedSquare = square;
  // Find valid moves for this piece
  const piece = getPieceAtSquare(square, gameState.currentFEN);
  if (piece) {
    // This is a simplified version - in practice, you'd want more sophisticated move generation
    gameState.validMoves = findValidMovesForPiece();
  }
}
// Find valid moves for a piece (simplified)
function findValidMovesForPiece() {
  // This is a placeholder - in a real implementation, you'd want proper chess move generation
  // For now, we'll return an empty array and rely on the move validation
  return [];
}
// Make a move
export function makeMove(fromSquare, toSquare, gameState, dom) {
  const fromPiece = getPieceAtSquare(fromSquare, gameState.currentFEN);
  const move = {
    from: fromSquare,
    to: toSquare,
    piece: fromPiece,
  };
  // Apply move to FEN
  const newFEN = applyMoveToFEN(gameState.currentFEN, move);
  // Check if this is the correct move
  const currentLine = gameState.openingLines[gameState.currentLineIndex];
  const expectedMove = currentLine.moves[gameState.currentMoveIndex];
  if (expectedMove) {
    const moveNotation = getMoveNotation(move);
    if (moveNotation === expectedMove) {
      // Correct move
      gameState.statistics.correctMoves++;
      gameState.statistics.totalMoves++;
      gameState.currentMoveIndex++;
      showSuccessToast("Correct move!");
      addMoveToHistory(dom.movesHistoryEl, moveNotation, true);
      // Apply the move
      gameState.currentFEN = newFEN;
      clearBoardSelection();
      gameState.selectedSquare = null;
      gameState.validMoves = [];
      // Check if line is complete
      if (gameState.currentMoveIndex >= currentLine.moves.length) {
        showInfoToast("Line completed!");
        gameState.isPracticeActive = false;
        updateStatus(dom, gameState);
        return;
      }
      // Computer's turn
      gameState.isHumanTurn = false;
      setTimeout(() => {
        makeComputerMove(gameState, dom);
      }, 500);
    } else {
      // Incorrect move
      gameState.statistics.totalMoves++;
      showErrorToast(`Incorrect move. Expected: ${expectedMove}`);
      addMoveToHistory(dom.movesHistoryEl, moveNotation, false);
      // Reset to previous position
      clearBoardSelection();
      gameState.selectedSquare = null;
      gameState.validMoves = [];
    }
  }
  updateStatistics(dom, gameState);
}
// Make computer move
export function makeComputerMove(gameState, dom) {
  const currentLine = gameState.openingLines[gameState.currentLineIndex];
  const expectedMove = currentLine.moves[gameState.currentMoveIndex];
  if (expectedMove) {
    // Parse the expected move using the utility function
    const move = parseMoveFromSAN(expectedMove, gameState.currentFEN);
    if (move) {
      // Apply the move
      const newFEN = applyMoveToFEN(gameState.currentFEN, move);
      gameState.currentFEN = newFEN;
      gameState.currentMoveIndex++;
      addMoveToHistory(dom.movesHistoryEl, expectedMove, true);
      // Check if line is complete
      if (gameState.currentMoveIndex >= currentLine.moves.length) {
        showInfoToast("Line completed!");
        gameState.isPracticeActive = false;
        updateStatus(dom, gameState);
        return;
      }
      // Human's turn
      gameState.isHumanTurn = true;
    }
  }
  updateStatus(dom, gameState);
}
// Show hint
export function showHintForCurrentPosition(gameState) {
  if (!gameState.isPracticeActive || !gameState.isHumanTurn) return;
  const currentLine = gameState.openingLines[gameState.currentLineIndex];
  const expectedMove = currentLine.moves[gameState.currentMoveIndex];
  if (expectedMove) {
    const move = parseMoveFromSAN(expectedMove, gameState.currentFEN);
    if (move) {
      // Highlight the piece to move
      showHint(move.from);
      showWarningToast(`Hint: Move the piece from ${move.from}`);
    }
  }
}
//# sourceMappingURL=practice-game.js.map
