import {
  initializeBoard,
  renderBoard,
  addDragAndDropListeners,
  reAddDragAndDropListeners,
} from "./practice-board.js";
import { parseOpeningLines, buildPositionMap } from "./practice-parser.js";
import {
  updateStatistics,
  updateStatus,
  clearMoveHistory,
  showSuccessToast,
  showErrorToast,
  showInfoToast,
} from "./practice-ui.js";
import {
  handleSquareClick,
  showHintForCurrentPosition,
} from "./practice-game.js";
import { GameState, DOMElements } from "./practice-types.js";

// Helper function to get element by ID or throw
function getElementByIdOrThrow(id: string): HTMLElement {
  const element = document.getElementById(id);
  if (!element) {
    throw new Error(`Element with id '${id}' not found`);
  }
  return element;
}

// Game state
let gameState: GameState = {
  currentFEN: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
  currentLineIndex: 0,
  currentMoveIndex: 0,
  isPracticeActive: false,
  isHumanTurn: true,
  selectedSquare: null,
  validMoves: [],
  openingLines: [],
  positionMap: new Map<string, string[]>(),
  statistics: {
    correctMoves: 0,
    totalMoves: 0,
    accuracy: 0,
    lineAttempts: {},
  },
};

// DOM elements
let dom: DOMElements;

function initializeDOMElements(): void {
  dom = {
    boardGrid: getElementByIdOrThrow("practice-board-grid"),
    startBtn: getElementByIdOrThrow("practice-start-btn") as HTMLButtonElement,
    resetBtn: getElementByIdOrThrow("practice-reset-btn") as HTMLButtonElement,
    hintBtn: getElementByIdOrThrow("practice-hint-btn") as HTMLButtonElement,
    nextBtn: getElementByIdOrThrow("practice-next-btn") as HTMLButtonElement,
    startingFEN: getElementByIdOrThrow(
      "practice-starting-fen",
    ) as HTMLInputElement,
    moveSelection: getElementByIdOrThrow(
      "practice-move-selection",
    ) as HTMLSelectElement,
    openingLines: getElementByIdOrThrow(
      "practice-opening-lines",
    ) as HTMLTextAreaElement,
    statusIndicator: getElementByIdOrThrow("practice-status-indicator"),
    statusText: getElementByIdOrThrow("practice-status-text"),
    correctMoves: getElementByIdOrThrow("practice-correct-moves"),
    totalMoves: getElementByIdOrThrow("practice-total-moves"),
    accuracy: getElementByIdOrThrow("practice-accuracy"),
    currentLine: getElementByIdOrThrow("practice-current-line"),
    moveHistory: getElementByIdOrThrow("practice-moves"),
    startOverlay: getElementByIdOrThrow("practice-start-overlay"),
    startOverlayBtn: getElementByIdOrThrow(
      "practice-start-overlay-btn",
    ) as HTMLButtonElement,
    board: getElementByIdOrThrow("practice-board-grid")
      .parentElement as HTMLElement,
  };
}

// Add drag and drop handlers to the board
function addDragAndDropHandlersToBoard(): void {
  // Make handleSquareClick globally accessible for drag and drop
  (window as any).handleSquareClick = handleSquareClick;
  addDragAndDropListeners(gameState, dom);
}

// Initialize the board
function initializeBoardWithEventListeners(): void {
  initializeBoard(dom.boardGrid);
  // Render the initial board with starting position
  renderBoard(gameState.currentFEN);
  addDragAndDropHandlersToBoard();
}

// Start practice
function startPractice(): void {
  try {
    // Parse opening lines
    const linesText = dom.openingLines.value.trim();
    if (!linesText) {
      showErrorToast("Please enter opening lines to practice");
      return;
    }

    const lines = parseOpeningLines(linesText);
    if (lines.length === 0) {
      showErrorToast("No valid opening lines found");
      return;
    }

    // Build position map from opening lines
    const positionMap = buildPositionMap(lines, dom.startingFEN.value);

    // Update game state
    gameState.openingLines = lines;
    gameState.positionMap = positionMap;
    gameState.currentLineIndex = 0;
    gameState.currentMoveIndex = 0;
    gameState.isPracticeActive = true;
    gameState.isHumanTurn = true;
    gameState.currentFEN = dom.startingFEN.value;

    // Dump the position map to console
    console.log("Position Map:", positionMap);

    // Hide overlay and activate board
    dom.startOverlay.classList.add("hidden");
    dom.board.classList.add("active");

    // Render board and start
    renderBoard(gameState.currentFEN);
    reAddDragAndDropListeners(gameState, dom);
    updateStatus(dom, gameState);
    updateStatistics(dom, gameState);

    showSuccessToast(`Started practice with ${lines.length} opening lines`);
  } catch (error) {
    console.error("Error starting practice:", error);
    showErrorToast("Failed to start practice");
  }
}

// Reset practice
function resetPractice(): void {
  // Reset game state
  gameState = {
    currentFEN: dom.startingFEN.value,
    currentLineIndex: 0,
    currentMoveIndex: 0,
    isPracticeActive: false,
    isHumanTurn: true,
    selectedSquare: null,
    validMoves: [],
    openingLines: [],
    positionMap: new Map<string, string[]>(),
    statistics: {
      correctMoves: 0,
      totalMoves: 0,
      accuracy: 0,
      lineAttempts: {},
    },
  };

  // Show overlay and deactivate board
  dom.startOverlay.classList.remove("hidden");
  dom.board.classList.remove("active");

  // Render board
  renderBoard(gameState.currentFEN);
  reAddDragAndDropListeners(gameState, dom);
  updateStatus(dom, gameState);

  showInfoToast("Practice reset");
}

// Next line
function nextLine(): void {
  if (gameState.openingLines.length === 0) {
    showErrorToast("No opening lines loaded");
    return;
  }

  gameState.currentLineIndex =
    (gameState.currentLineIndex + 1) % gameState.openingLines.length;
  gameState.currentMoveIndex = 0;
  gameState.isPracticeActive = true;

  const startingFEN = dom.startingFEN.value.trim();
  gameState.currentFEN = startingFEN;

  // Hide overlay and activate board if not already active
  dom.startOverlay.classList.add("hidden");
  dom.board.classList.add("active");

  renderBoard(gameState.currentFEN);
  reAddDragAndDropListeners(gameState, dom);
  updateStatus(dom, gameState);

  showInfoToast(`Switched to line ${gameState.currentLineIndex + 1}`);
}

// Initialize event listeners
function initializeEventListeners(): void {
  // Overlay start button
  dom.startOverlayBtn.addEventListener("click", () => {
    startPractice();
  });

  // Regular start button (hidden initially)
  dom.startBtn.addEventListener("click", () => {
    startPractice();
  });

  // Reset button
  dom.resetBtn.addEventListener("click", () => {
    resetPractice();
  });

  // Hint button
  dom.hintBtn.addEventListener("click", () => {
    showHintForCurrentPosition(gameState);
  });

  // Next line button
  dom.nextBtn.addEventListener("click", () => {
    nextLine();
  });
}

// Initialize the application
export function initializePractice(): void {
  initializeDOMElements();
  initializeBoardWithEventListeners();
  initializeEventListeners();
  resetPractice();
}
