import {
  initializeBoard,
  renderBoard,
  addDragAndDropListeners,
  reAddDragAndDropListeners,
} from "./practice-board.js";
import {
  parseOpeningLines,
  convertOpeningLinesToPCN,
  buildPositionMap,
} from "./practice-parser.js";
import {
  updateStatistics,
  updateStatus,
  clearMoveHistory,
  showSuccessToast,
  showErrorToast,
  showInfoToast,
} from "./practice-ui.js";
import { triggerConfetti } from "../utils/confetti-utils.js";
import {
  handleSquareClick,
  makeMove,
  showHintForCurrentPosition,
} from "./practice-game.js";
import { GameState, DOMElements } from "./practice-types.js";
import { convertLineToLongNotation } from "../utils/notation-utils.js";

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
  isPracticeActive: false,
  isHumanTurn: true,
  selectedSquare: null,
  validMoves: [],
  openingLines: [],
  positionMap: new Map<string, string[]>(),
  computerMoveStrategy: "serial", // Default to serial strategy
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
  addDragAndDropListeners(gameState, dom);
}

// Initialize the board
function initializeBoardWithEventListeners(): void {
  initializeBoard(dom.boardGrid);
  // Render the initial board with starting position
  renderBoard(gameState.currentFEN);
  addDragAndDropHandlersToBoard();
}

// Start practice session
export function startPractice(gameState: GameState, dom: DOMElements): void {
  // Parse opening lines from textarea
  const linesText = (dom.openingLines as HTMLTextAreaElement).value;
  const lines = parseOpeningLines(linesText);

  if (lines.length === 0) {
    showErrorToast("No valid opening lines found!");
    return;
  }

  // Convert opening lines to long notation
  const longNotationLines = convertOpeningLinesToPCN(
    lines,
    gameState.currentFEN,
  );
  // Build position map with long notation moves
  const positionMap = buildPositionMap(longNotationLines, gameState.currentFEN);
  gameState.positionMap = positionMap;

  // Initialize game state for position-based approach
  gameState.openingLines = longNotationLines;
  gameState.isPracticeActive = true;
  gameState.isHumanTurn = true;
  gameState.selectedSquare = null;
  gameState.validMoves = [];
  gameState.statistics = {
    correctMoves: 0,
    totalMoves: 0,
    accuracy: 0,
    lineAttempts: {},
  };

  // Set computer move strategy
  const strategySelect = dom.moveSelection as HTMLSelectElement;
  gameState.computerMoveStrategy = strategySelect.value as
    | "random"
    | "serial"
    | "adaptive";

  // Hide overlay and activate board
  dom.startOverlay.classList.add("hidden");
  dom.board.classList.add("active");

  // Update UI
  updateStatus(dom, gameState);
  clearMoveHistory(dom.moveHistory);
  renderBoard(gameState.currentFEN);
  reAddDragAndDropListeners(gameState, dom);

  showSuccessToast("Practice session started!");
}

// Reset practice
function resetPractice(): void {
  gameState = {
    currentFEN: dom.startingFEN.value,
    isPracticeActive: false,
    isHumanTurn: true,
    selectedSquare: null,
    validMoves: [],
    openingLines: [],
    positionMap: new Map<string, string[]>(),
    computerMoveStrategy: dom.moveSelection.value as
      | "random"
      | "serial"
      | "adaptive",
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

  gameState.isPracticeActive = true;
  gameState.computerMoveStrategy = dom.moveSelection.value as
    | "random"
    | "serial"
    | "adaptive";

  const startingFEN = dom.startingFEN.value.trim();
  gameState.currentFEN = startingFEN;

  // Hide overlay and activate board if not already active
  dom.startOverlay.classList.add("hidden");
  dom.board.classList.add("active");

  renderBoard(gameState.currentFEN);
  reAddDragAndDropListeners(gameState, dom);
  updateStatus(dom, gameState);

  showInfoToast("Switched to new position");
}

// Fisher copy functionality
async function copyLinesAsSAN(): Promise<void> {
  try {
    const linesText = (dom.openingLines as HTMLTextAreaElement).value;
    if (!linesText.trim()) {
      showErrorToast("No lines to copy");
      return;
    }

    // Copy the original SAN lines
    await navigator.clipboard.writeText(linesText);
    showSuccessToast("Lines copied as SAN");
  } catch (error) {
    console.error("Error copying lines:", error);
    showErrorToast("Failed to copy lines");
  }
}

async function copyLinesAsLongNotation(): Promise<void> {
  try {
    const linesText = (dom.openingLines as HTMLTextAreaElement).value;
    if (!linesText.trim()) {
      showErrorToast("No lines to copy");
      return;
    }

    // Parse and convert to long notation
    const lines = parseOpeningLines(linesText);
    if (lines.length === 0) {
      showErrorToast("No valid lines to convert");
      return;
    }

    const longNotationLines = convertOpeningLinesToPCN(
      lines,
      gameState.currentFEN,
    );
    const longNotationText = longNotationLines
      .map((line) => line.moves.join(" "))
      .join("\n");

    await navigator.clipboard.writeText(longNotationText);
    showSuccessToast("Lines copied as long notation");
  } catch (error) {
    console.error("Error copying lines as long notation:", error);
    showErrorToast("Failed to copy lines as long notation");
  }
}

// Initialize event listeners
function initializeEventListeners(): void {
  // Overlay start button
  dom.startOverlayBtn.addEventListener("click", () => {
    startPractice(gameState, dom);
  });

  // Regular start button (hidden initially)
  dom.startBtn.addEventListener("click", () => {
    startPractice(gameState, dom);
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

  // Move selection dropdown
  dom.moveSelection.addEventListener("change", () => {
    gameState.computerMoveStrategy = dom.moveSelection.value as
      | "random"
      | "serial"
      | "adaptive";
  });

  // Confetti test button
  const confettiBtn = document.getElementById(
    "practice-confetti-btn",
  ) as HTMLButtonElement;
  if (confettiBtn) {
    confettiBtn.addEventListener("click", () => {
      triggerConfetti(100);
    });
  }
}

// Initialize the application
export function initializePractice(): void {
  initializeDOMElements();
  initializeBoardWithEventListeners();
  initializeEventListeners();
  resetPractice();
}
