import { initializeBoard, renderBoard } from "./utils/practice-board.js";
import { parseOpeningLines } from "./utils/practice-parser.js";
import {
  updateStatistics,
  updateStatus,
  clearMoveHistory,
  showSuccessToast,
  showErrorToast,
  showInfoToast,
} from "./utils/practice-ui.js";
import {
  handleSquareClick,
  showHintForCurrentPosition,
} from "./utils/practice-game.js";
// Game state
let gameState = {
  currentFEN: "",
  currentLineIndex: 0,
  currentMoveIndex: 0,
  isPracticeActive: false,
  isHumanTurn: true,
  selectedSquare: null,
  validMoves: [],
  openingLines: [],
  statistics: {
    correctMoves: 0,
    totalMoves: 0,
    lineAttempts: {},
  },
};
// DOM elements
let dom;
// Initialize DOM elements
function initializeDOMElements() {
  dom = {
    boardGrid: document.getElementById("practice-board-grid"),
    startBtn: document.getElementById("practice-start-btn"),
    resetBtn: document.getElementById("practice-reset-btn"),
    hintBtn: document.getElementById("practice-hint-btn"),
    nextBtn: document.getElementById("practice-next-btn"),
    statusIndicator: document.getElementById("practice-status-indicator"),
    statusText: document.getElementById("practice-status-text"),
    correctMovesEl: document.getElementById("practice-correct-moves"),
    totalMovesEl: document.getElementById("practice-total-moves"),
    accuracyEl: document.getElementById("practice-accuracy"),
    currentLineEl: document.getElementById("practice-current-line"),
    startingFenInput: document.getElementById("practice-starting-fen"),
    openingLinesInput: document.getElementById("practice-opening-lines"),
    movesHistoryEl: document.getElementById("practice-moves"),
  };
}
// Initialize the board
function initializeBoardWithEventListeners() {
  initializeBoard(dom.boardGrid);
  // Add click listeners to all squares
  const squares = dom.boardGrid.querySelectorAll(".practice-square");
  squares.forEach((squareEl) => {
    const square = squareEl.dataset.square;
    if (square) {
      squareEl.addEventListener("click", () =>
        handleSquareClick(square, gameState, dom),
      );
    }
  });
}
// Start practice
function startPractice() {
  try {
    const openingLinesText = dom.openingLinesInput.value;
    const startingFEN = dom.startingFenInput.value.trim();
    const openingLines = parseOpeningLines(openingLinesText);
    if (openingLines.length === 0) {
      showErrorToast("Please enter valid opening lines");
      return;
    }
    gameState.openingLines = openingLines;
    gameState.currentFEN = startingFEN;
    gameState.currentLineIndex = 0;
    gameState.currentMoveIndex = 0;
    gameState.isPracticeActive = true;
    // Determine who starts based on FEN
    const isWhiteTurn = startingFEN.includes(" w ");
    gameState.isHumanTurn = isWhiteTurn; // Human always plays the current player
    renderBoard(gameState.currentFEN);
    updateStatus(dom, gameState);
    updateStatistics(dom, gameState);
    // Clear move history
    clearMoveHistory(dom.movesHistoryEl);
    const startingPlayer = isWhiteTurn ? "White" : "Black";
    showSuccessToast(
      `Practice started with ${openingLines.length} opening lines! (${startingPlayer} to move)`,
    );
  } catch (error) {
    showErrorToast("Invalid format for opening lines");
    console.error("Error parsing opening lines:", error);
  }
}
// Reset practice
function resetPractice() {
  gameState.isPracticeActive = false;
  gameState.currentLineIndex = 0;
  gameState.currentMoveIndex = 0;
  const startingFEN = dom.startingFenInput.value.trim();
  gameState.currentFEN = startingFEN;
  // Determine who starts based on FEN
  const isWhiteTurn = startingFEN.includes(" w ");
  gameState.isHumanTurn = isWhiteTurn;
  gameState.selectedSquare = null;
  gameState.validMoves = [];
  renderBoard(gameState.currentFEN);
  updateStatus(dom, gameState);
  // Clear move history
  clearMoveHistory(dom.movesHistoryEl);
  const startingPlayer = isWhiteTurn ? "White" : "Black";
  showInfoToast(`Practice reset (${startingPlayer} to move)`);
}
// Next line
function nextLine() {
  if (gameState.currentLineIndex < gameState.openingLines.length - 1) {
    gameState.currentLineIndex++;
    gameState.currentMoveIndex = 0;
    gameState.isPracticeActive = true;
    const startingFEN = dom.startingFenInput.value.trim();
    gameState.currentFEN = startingFEN;
    // Determine who starts based on FEN
    const isWhiteTurn = startingFEN.includes(" w ");
    gameState.isHumanTurn = isWhiteTurn;
    renderBoard(gameState.currentFEN);
    updateStatus(dom, gameState);
    // Clear move history
    clearMoveHistory(dom.movesHistoryEl);
    const startingPlayer = isWhiteTurn ? "White" : "Black";
    showInfoToast(
      `Switched to line: ${gameState.openingLines[gameState.currentLineIndex].name} (${startingPlayer} to move)`,
    );
  } else {
    showInfoToast("No more lines available");
  }
}
// Initialize event listeners
function initializeEventListeners() {
  dom.startBtn.addEventListener("click", startPractice);
  dom.resetBtn.addEventListener("click", resetPractice);
  dom.hintBtn.addEventListener("click", () =>
    showHintForCurrentPosition(gameState),
  );
  dom.nextBtn.addEventListener("click", nextLine);
}
// Initialize the application
export function initializePractice() {
  initializeDOMElements();
  initializeBoardWithEventListeners();
  initializeEventListeners();
  resetPractice();
}
//# sourceMappingURL=practice.js.map
