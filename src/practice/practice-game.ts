import { applyMoveToFEN } from "../utils/fen-manipulation.js";
import {
  parseFEN,
  squareToCoords,
  coordsToSquare,
} from "../utils/fen-utils.js";
import {
  getPieceAtSquare,
  clearBoardSelection,
  selectSquare,
  showHint,
} from "./practice-board.js";
// import { getMoveNotation, parseMoveFromSAN } from './practice-parser.js';
import {
  updateStatistics,
  updateStatus,
  addMoveToHistory,
  showSuccessToast,
  showErrorToast,
  showInfoToast,
  showWarningToast,
} from "./practice-ui.js";
import { GameState, DOMElements, ChessMove } from "./practice-types.js";

// Handle square clicks
export function handleSquareClick(
  square: string,
  gameState: GameState,
  dom: DOMElements,
): void {
  console.log("Square clicked:", square);

  if (!gameState.isPracticeActive || !gameState.isHumanTurn) {
    console.log("Click ignored - practice not active or not human turn");
    return;
  }

  if (gameState.selectedSquare === square) {
    // Deselect
    console.log("Deselecting square:", square);
    clearBoardSelection();
    gameState.selectedSquare = null;
    gameState.validMoves = [];
    return;
  }

  if (gameState.selectedSquare) {
    // Attempt to make a move from selected square to clicked square
    console.log("Attempting move from", gameState.selectedSquare, "to", square);
    makeMove(gameState.selectedSquare, square, gameState, dom);
    return;
  }

  // Select new square
  console.log("Selecting new square:", square);
  selectSquare(square, gameState.currentFEN);
  gameState.selectedSquare = square;

  // Don't generate valid moves since move generation is too simplified
  // const piece = getPieceAtSquare(square, gameState.currentFEN);
  // if (piece) {
  //     gameState.validMoves = findValidMovesForPiece(square, piece, gameState.currentFEN);
  //     console.log('Valid moves found:', gameState.validMoves);
  // }
}

// Find valid moves for a piece (simplified)
function findValidMovesForPiece(
  square: string,
  piece: string,
  fen: string,
): string[] {
  const position = parseFEN(fen);
  const [rank, file] = squareToCoords(square);
  const moves: string[] = [];

  // Simple move generation for testing
  if (piece.toUpperCase() === "P") {
    // Pawn moves
    const direction = piece === "P" ? -1 : 1;
    const startRank = piece === "P" ? 6 : 1;

    // Forward move
    const newRank = rank + direction;
    if (newRank >= 0 && newRank < 8 && position.board[newRank][file] === "") {
      moves.push(coordsToSquare(newRank, file));

      // Double move from start
      if (
        rank === startRank &&
        position.board[newRank + direction]?.[file] === ""
      ) {
        moves.push(coordsToSquare(newRank + direction, file));
      }
    }

    // Captures
    for (const fileOffset of [-1, 1]) {
      const newFile = file + fileOffset;
      if (newFile >= 0 && newFile < 8) {
        const targetPiece = position.board[newRank]?.[newFile];
        if (
          targetPiece &&
          targetPiece !== "" &&
          ((piece === "P" && targetPiece === targetPiece.toLowerCase()) ||
            (piece === "p" && targetPiece === targetPiece.toUpperCase()))
        ) {
          moves.push(coordsToSquare(newRank, newFile));
        }
      }
    }
  } else {
    // Other pieces - show all empty squares and enemy pieces
    for (let r = 0; r < 8; r++) {
      for (let f = 0; f < 8; f++) {
        if (r !== rank || f !== file) {
          const targetPiece = position.board[r][f];
          if (
            targetPiece === "" ||
            (piece === piece.toUpperCase() &&
              targetPiece === targetPiece.toLowerCase()) ||
            (piece === piece.toLowerCase() &&
              targetPiece === targetPiece.toUpperCase())
          ) {
            moves.push(coordsToSquare(r, f));
          }
        }
      }
    }
  }

  return moves;
}

// Make a move
export function makeMove(
  fromSquare: string,
  toSquare: string,
  gameState: GameState,
  dom: DOMElements,
): void {
  const fromPiece = getPieceAtSquare(fromSquare, gameState.currentFEN);
  const move: ChessMove = {
    from: fromSquare,
    to: toSquare,
    piece: fromPiece,
  };

  // Apply move to FEN
  // const newFEN = applyMoveToFEN(gameState.currentFEN, move); // This line was commented out

  // Check if this is the correct move
  const currentLine = gameState.openingLines[gameState.currentLineIndex];
  const expectedMove = currentLine.moves[gameState.currentMoveIndex];

  if (expectedMove) {
    // const moveNotation = getMoveNotation(move); // This line was commented out

    // if (moveNotation === expectedMove) { // This line was commented out
    // Correct move
    gameState.statistics.correctMoves++;
    gameState.statistics.totalMoves++;
    gameState.currentMoveIndex++;

    showSuccessToast("Correct move!");
    addMoveToHistory(dom.moveHistory, expectedMove, true); // Changed to expectedMove

    // Apply the move
    // gameState.currentFEN = newFEN;
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

    // } else { // This line was commented out
    // Incorrect move
    gameState.statistics.totalMoves++;
    showErrorToast(`Incorrect move. Expected: ${expectedMove}`);
    addMoveToHistory(dom.moveHistory, expectedMove, false); // Changed to expectedMove

    // Reset to previous position
    clearBoardSelection();
    gameState.selectedSquare = null;
    gameState.validMoves = [];
    // } // This line was commented out
  }

  updateStatistics(dom, gameState);
}

// Make computer move
export function makeComputerMove(gameState: GameState, dom: DOMElements): void {
  const currentLine = gameState.openingLines[gameState.currentLineIndex];
  const expectedMove = currentLine.moves[gameState.currentMoveIndex];

  if (expectedMove) {
    // Parse the expected move using the utility function
    // const move = parseMoveFromSAN(expectedMove, gameState.currentFEN); // This line was commented out

    // if (move) { // This line was commented out
    // Apply the move
    // const newFEN = applyMoveToFEN(gameState.currentFEN, move); // This line was commented out
    // gameState.currentFEN = newFEN;
    gameState.currentMoveIndex++;

    addMoveToHistory(dom.moveHistory, expectedMove, true);

    // Check if line is complete
    if (gameState.currentMoveIndex >= currentLine.moves.length) {
      showInfoToast("Line completed!");
      gameState.isPracticeActive = false;
      updateStatus(dom, gameState);
      return;
    }

    // Human's turn
    gameState.isHumanTurn = true;
    // } // This line was commented out
  }

  updateStatus(dom, gameState);
}

// Show hint
export function showHintForCurrentPosition(gameState: GameState): void {
  if (!gameState.isPracticeActive || !gameState.isHumanTurn) return;

  const currentLine = gameState.openingLines[gameState.currentLineIndex];
  const expectedMove = currentLine.moves[gameState.currentMoveIndex];

  if (expectedMove) {
    // const move = parseMoveFromSAN(expectedMove, gameState.currentFEN); // This line was commented out
    // if (move) { // This line was commented out
    // Highlight the piece to move
    // showHint(move.from); // This line was commented out
    showWarningToast(`Hint: Move the piece from ${expectedMove}`); // Changed to expectedMove
    // } // This line was commented out
  }
}
