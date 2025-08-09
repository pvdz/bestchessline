import {
  initializeBoard,
  renderBoard,
  addDragAndDropListeners,
  reAddDragAndDropListeners,
  clearRightClickSelections,
  clearLastMoveHighlight,
  clearBoardSelectionWithoutLastMove,
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
  showWarningToast,
  updateMoveHistoryDisplay,
} from "./practice-ui.js";
import {
  triggerConfetti,
  triggerRainbowBurst,
} from "../utils/confetti-utils.js";
import {
  handleSquareClick,
  makeMove,
  makeComputerMove,
  showHintForCurrentPosition,
} from "./practice-game.js";
import {
  initializeArrowDrawing,
  cleanupArrowDrawing,
  clearAllArrows,
} from "./practice-arrow-utils.js";
import { GameState, DOMElements, OpeningLine } from "./practice-types.js";
import { convertLineToLongNotation } from "../utils/notation-utils.js";
// Server-side AI integration

// Helper function to get element by ID or throw
function getElementByIdOrThrow(id: string): HTMLElement {
  const element = document.getElementById(id);
  if (!element) {
    throw new Error(`Element with id '${id}' not found`);
  }
  return element;
}

// Function to analyze maximum depth in opening lines
function analyzeMaxDepth(openingLines: OpeningLine[]): number {
  let maxDepth = 0;
  let longestLine: OpeningLine | null = null;

  for (const line of openingLines) {
    // Count the number of full moves in this line
    // Each numbered move (1., 2., 3., etc.) represents one full move
    // So we count the number of numbered moves in the original line
    const fullMoveCount = Math.ceil(line.moves.length / 2);

    if (fullMoveCount > maxDepth) {
      maxDepth = fullMoveCount;
      longestLine = line;
    }
  }

  // Return the actual maximum number of human moves
  return Math.max(1, maxDepth);
}

// Function to update depth control based on opening lines
function updateDepthControl(openingLines: OpeningLine[]): void {
  const maxDepthInLines = analyzeMaxDepth(openingLines);

  if (maxDepthInLines > 0) {
    // Update the max attribute and value of the depth slider
    dom.maxDepth.max = maxDepthInLines.toString();
    dom.maxDepth.value = maxDepthInLines.toString();

    // Update the slider value display
    const sliderValue = document.getElementById("practice-slider-value");
    if (sliderValue) {
      sliderValue.textContent = maxDepthInLines.toString();
    }

    // Update the game state
    gameState.maxDepth = maxDepthInLines;

    console.log(`Depth control updated: max depth is ${maxDepthInLines} moves`);
  } else {
    // Default to 1 if no lines are loaded
    dom.maxDepth.max = "15";
    dom.maxDepth.value = "1";
    gameState.maxDepth = 1;

    // Update the slider value display
    const sliderValue = document.getElementById("practice-slider-value");
    if (sliderValue) {
      sliderValue.textContent = "1";
    }

    console.log("No opening lines loaded, using default max depth of 1");
  }
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
  maxDepth: 1,
  currentDepth: 0,
  positionHistory: ["rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"],
  moveHistory: [],
  pinnedPosition: null,
  pinnedDepth: 0,
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
    topMoves: getElementByIdOrThrow("practice-top-moves"),
    startOverlay: getElementByIdOrThrow("practice-start-overlay"),
    startOverlayBtn: getElementByIdOrThrow(
      "practice-start-overlay-btn",
    ) as HTMLButtonElement,
    board: getElementByIdOrThrow("practice-board-grid")
      .parentElement as HTMLElement,
    maxDepth: getElementByIdOrThrow("practice-max-depth") as HTMLInputElement,
    currentDepth: getElementByIdOrThrow("practice-current-depth"),
    goBackBtn: getElementByIdOrThrow(
      "practice-go-back-btn",
    ) as HTMLButtonElement,
    goBackRandomBtn: getElementByIdOrThrow(
      "practice-go-back-random-btn",
    ) as HTMLButtonElement,
    pinPositionBtn: getElementByIdOrThrow(
      "practice-pin-position-btn",
    ) as HTMLButtonElement,
    restartPinnedBtn: getElementByIdOrThrow(
      "practice-restart-pinned-btn",
    ) as HTMLButtonElement,
    loadLinesBtn: getElementByIdOrThrow(
      "practice-load-lines-btn",
    ) as HTMLButtonElement,
  } as unknown as DOMElements;

  // Extend: wire AI coach button
  const askBtn = getElementByIdOrThrow(
    "practice-ai-ask-btn",
  ) as HTMLButtonElement;
  const modelEl = getElementByIdOrThrow(
    "practice-ai-model",
  ) as HTMLInputElement;
  const levelEl = getElementByIdOrThrow(
    "practice-ai-level",
  ) as HTMLSelectElement;
  const questionEl = getElementByIdOrThrow(
    "practice-ai-question",
  ) as HTMLTextAreaElement;
  const answerEl = getElementByIdOrThrow("practice-ai-answer");
  const apiKeyEl = getElementByIdOrThrow(
    "practice-ai-api-key",
  ) as HTMLInputElement;

  askBtn.addEventListener("click", async () => {
    try {
      askBtn.setAttribute("aria-busy", "true");
      answerEl.textContent = "Asking AI...";
      const includePrompt = true;
      const engineSummary = ""; // Optionally provide client-side summary later
      const payload = {
        fen: gameState.currentFEN,
        level: (levelEl.value as any) || "intermediate",
        question: questionEl.value,
        model: modelEl.value.trim() || "gpt-4o-mini",
        engineSummary,
        includePrompt,
      };

      const resp = await fetch("/api/ai/explain", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(apiKeyEl.value.trim()
            ? { "X-AI-API-KEY": apiKeyEl.value.trim() }
            : {}),
        },
        body: JSON.stringify(payload),
      });
      if (!resp.ok) {
        const txt = await resp.text();
        throw new Error(txt);
      }
      const data = await resp.json();
      const rawAnswer: string = data.answer || "";
      // Render raw answer hidden for inspection
      answerEl.textContent = data.prompt
        ? `Prompt\n----------------\n${data.prompt}\n\nAnswer\n----------------\n${rawAnswer}`
        : rawAnswer;

      // Try to parse structured JSON first
      const summary = document.getElementById("practice-ai-summary");
      const sections = document.getElementById("practice-ai-sections");
      if (summary && sections) {
        let parsed: any = null;
        try {
          parsed = JSON.parse(rawAnswer);
        } catch {}
        if (parsed && typeof parsed === "object") {
          // Render structured
          summary.textContent = parsed.summary || "";
          const cards: Array<{ title: string; body: string }> = [];
          if (parsed.background) cards.push({ title: "Background", body: parsed.background });
          if (parsed.themes) cards.push({ title: "Themes", body: parsed.themes });
          if (parsed.plans) {
            const pb = [
              parsed.plans.white ? `White: ${parsed.plans.white}` : "",
              parsed.plans.black ? `Black: ${parsed.plans.black}` : "",
            ]
              .filter(Boolean)
              .join("\n\n");
            if (pb) cards.push({ title: "Plans", body: pb });
          }
          if (parsed.alternatives) cards.push({ title: "Alternatives", body: parsed.alternatives });
          if (parsed.traps) cards.push({ title: "Traps & Pitfalls", body: parsed.traps });
          if (parsed.study) cards.push({ title: "Study Next", body: parsed.study });
          sections.innerHTML = cards
            .map(
              (c) => `\n<div class="ai-card"><h4>${c.title}</h4><div>${c.body.replace(/\n/g, "<br/>")}</div></div>`,
            )
            .join("");
        } else {
          // Fallback to heuristic parsing
          const text = rawAnswer;
          const first = text.split(/\n\n+/)[0] || text.substring(0, 240);
          summary.textContent = first;
          const cards: Array<{ title: string; body: string }> = [];
          const add = (title: string, body: string) => {
            if (!body.trim()) return;
            cards.push({ title, body });
          };
          const blocks = text.split(/\n\s*(?=Ideas:|Background:|Themes:|Alternatives:|Lines:|Games:)/);
          if (blocks.length > 1) {
            blocks.forEach((b) => {
              const m = b.match(/^(Ideas|Background|Themes|Alternatives|Lines|Games):\s*[\r\n]?([\s\S]*)$/);
              if (m) add(m[1], m[2].trim());
            });
          } else {
            const paras = text.split(/\n\n+/).filter(Boolean);
            const chunk = (arr: string[], title: string) => add(title, arr.join("\n\n"));
            if (paras.length >= 4) {
              chunk(paras.slice(1, 2), "Background");
              chunk(paras.slice(2, 3), "Ideas");
              chunk(paras.slice(3, 4), "Alternatives");
              chunk(paras.slice(4), "Other notes");
            } else if (paras.length >= 2) {
              chunk(paras.slice(1), "Details");
            }
          }
          sections.innerHTML = cards
            .map(
              (c) => `\n<div class=\"ai-card\"><h4>${c.title}</h4><div>${c.body.replace(/\n/g, "<br/>")}</div></div>`,
            )
            .join("");
        }
      }
    } catch (e) {
      console.error(e);
      answerEl.textContent = "AI request failed. Check console.";
      showErrorToast("AI request failed");
    }
    finally {
      askBtn.setAttribute("aria-busy", "false");
    }
  });

  // Quick prompt chips
  const quick = document.getElementById("practice-ai-quick");
  if (quick) {
    quick.addEventListener("click", (e) => {
      const target = e.target as HTMLElement;
      const btn = target.closest(".practice-ai-chip-btn") as
        | HTMLButtonElement
        | null;
      if (!btn) return;
      const txt = btn.getAttribute("data-text") || "";
      if (!txt) return;
      const existing = questionEl.value.trim();
      questionEl.value = existing ? existing + "\n" + txt : txt;
      questionEl.focus();
    });
  }
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
  // Optional: try to parse JSON with metadata from Fish export
  const maybeMeta = tryParseFishJson(linesText);
  if (maybeMeta) {
    // Build a top-moves map from imported fish state
    gameState.positionTopMoves = buildTopMovesMapFromFish(maybeMeta);
  } else {
    gameState.positionTopMoves = undefined;
  }
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

  // Update depth control based on the loaded opening lines
  updateDepthControl(longNotationLines);

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
  updateTopMovesPanel(dom, gameState);

  // Initialize arrow drawing functionality
  initializeArrowDrawing();

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
    maxDepth: parseInt(dom.maxDepth.value) || 10,
    currentDepth: 0,
    positionHistory: [dom.startingFEN.value],
    moveHistory: [],
    pinnedPosition: null,
    pinnedDepth: 0,
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
  updateTopMovesPanel(dom, gameState);

  // Clean up arrow drawing
  cleanupArrowDrawing();

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

  // Reset depth for new line
  gameState.currentDepth = 0;

  // Reset position and move history for new line
  gameState.positionHistory = [startingFEN];
  gameState.moveHistory = [];

  // Reset pinned position for new line
  gameState.pinnedPosition = null;
  gameState.pinnedDepth = 0;

  // Hide overlay and activate board if not already active
  dom.startOverlay.classList.add("hidden");
  dom.board.classList.add("active");

  // Clear last move indicators, selections, and arrows when starting a new line
  clearLastMoveHighlight();
  clearBoardSelectionWithoutLastMove();
  clearAllArrows();

  renderBoard(gameState.currentFEN);
  reAddDragAndDropListeners(gameState, dom);
  updateStatus(dom, gameState);
  updateStatistics(dom, gameState);
  updateTopMovesPanel(dom, gameState);

  showInfoToast("Switched to new position");
}

// Go back one move (let human retry)
function goBackOneMove(): void {
  if (gameState.moveHistory.length === 0) {
    showWarningToast("No moves to go back from");
    return;
  }

  // Remove the last move from history
  const lastMove = gameState.moveHistory.pop();
  gameState.positionHistory.pop(); // Remove the last position

  // Restore the previous position
  gameState.currentFEN =
    gameState.positionHistory[gameState.positionHistory.length - 1];

  // Decrement depth
  gameState.currentDepth = Math.max(0, gameState.currentDepth - 1);

  // Update statistics (remove the last correct move)
  if (lastMove && lastMove.isCorrect) {
    gameState.statistics.correctMoves = Math.max(
      0,
      gameState.statistics.correctMoves - 1,
    );
    gameState.statistics.totalMoves = Math.max(
      0,
      gameState.statistics.totalMoves - 1,
    );
  }

  // Make it human's turn
  gameState.isHumanTurn = true;
  gameState.isPracticeActive = true;

  // Clear selections and arrows
  clearLastMoveHighlight();
  clearBoardSelectionWithoutLastMove();
  clearAllArrows();

  // Re-render board and update UI
  renderBoard(gameState.currentFEN);
  reAddDragAndDropListeners(gameState, dom);
  updateStatus(dom, gameState);
  updateStatistics(dom, gameState);
  updateTopMovesPanel(dom, gameState);

  // Update move history display
  updateMoveHistoryDisplay(dom.moveHistory);

  showInfoToast("Went back one move - your turn to retry");
}

// Go back one move and pick a random different computer move
function goBackOneMoveRandom(): void {
  if (gameState.moveHistory.length === 0) {
    showWarningToast("No moves to go back from");
    return;
  }

  // Remove the last move from history
  const lastMove = gameState.moveHistory.pop();
  gameState.positionHistory.pop(); // Remove the last position

  // Restore the previous position
  gameState.currentFEN =
    gameState.positionHistory[gameState.positionHistory.length - 1];

  // Decrement depth
  gameState.currentDepth = Math.max(0, gameState.currentDepth - 1);

  // Update statistics (remove the last correct move)
  if (lastMove && lastMove.isCorrect) {
    gameState.statistics.correctMoves = Math.max(
      0,
      gameState.statistics.correctMoves - 1,
    );
    gameState.statistics.totalMoves = Math.max(
      0,
      gameState.statistics.totalMoves - 1,
    );
  }

  // Make it human's turn
  gameState.isHumanTurn = true;
  gameState.isPracticeActive = true;

  // Clear selections and arrows
  clearLastMoveHighlight();
  clearBoardSelectionWithoutLastMove();
  clearAllArrows();

  // Re-render board and update UI
  renderBoard(gameState.currentFEN);
  reAddDragAndDropListeners(gameState, dom);
  updateStatus(dom, gameState);
  updateStatistics(dom, gameState);
  updateTopMovesPanel(dom, gameState);

  // Update move history display
  updateMoveHistoryDisplay(dom.moveHistory);

  // Trigger a random computer move after a short delay
  setTimeout(() => {
    if (gameState.isPracticeActive && !gameState.isHumanTurn) {
      makeComputerMove(gameState, dom);
    }
  }, 500);

  showInfoToast("Went back one move - computer will make a different move");
}

// Pin the current position as a checkpoint
function pinCurrentPosition(): void {
  if (!gameState.isPracticeActive) {
    showWarningToast("No active practice session to pin");
    return;
  }

  gameState.pinnedPosition = gameState.currentFEN;
  gameState.pinnedDepth = gameState.currentDepth;

  showSuccessToast(
    `Position pinned at depth ${gameState.currentDepth}! You can restart from here when the line ends.`,
  );
}

// Restart from pinned position
function restartFromPinnedPosition(): void {
  if (!gameState.pinnedPosition) {
    showWarningToast("No pinned position to restart from");
    return;
  }

  // Reset to pinned position
  gameState.currentFEN = gameState.pinnedPosition;
  gameState.currentDepth = gameState.pinnedDepth;

  // Reset position and move history to pinned state
  const pinnedIndex = gameState.positionHistory.indexOf(
    gameState.pinnedPosition,
  );
  if (pinnedIndex !== -1) {
    gameState.positionHistory = gameState.positionHistory.slice(
      0,
      pinnedIndex + 1,
    );
    gameState.moveHistory = gameState.moveHistory.slice(0, pinnedIndex);
  }

  // Reset statistics to pinned state
  gameState.statistics.correctMoves = gameState.pinnedDepth;
  gameState.statistics.totalMoves = gameState.pinnedDepth;

  // Make it human's turn
  gameState.isHumanTurn = true;
  gameState.isPracticeActive = true;

  // Clear selections and arrows
  clearLastMoveHighlight();
  clearBoardSelectionWithoutLastMove();
  clearAllArrows();

  // Re-render board and update UI
  renderBoard(gameState.currentFEN);
  reAddDragAndDropListeners(gameState, dom);
  updateStatus(dom, gameState);
  updateStatistics(dom, gameState);
  updateTopMovesPanel(dom, gameState);

  // Update move history display
  updateMoveHistoryDisplay(dom.moveHistory);

  showSuccessToast(
    `Restarted from pinned position at depth ${gameState.pinnedDepth}`,
  );
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

// Function to load lines from practice-lines.ts
async function loadLinesFromFile(): Promise<void> {
  try {
    // Import the practice lines from the TypeScript file
    const { practiceLines } = await import("./practice-lines.js");

    // Set the textarea content to the imported lines
    dom.openingLines.value = practiceLines;

    // Parse and update depth control
    const lines = parseOpeningLines(practiceLines);
    const longNotationLines = convertOpeningLinesToPCN(
      lines,
      gameState.currentFEN,
    );
    updateDepthControl(longNotationLines);

    showSuccessToast(
      `Loaded ${lines.length} opening lines from practice-lines.ts`,
    );

    console.log(`Loaded ${lines.length} opening lines from practice-lines.ts`);
  } catch (error) {
    console.error("Error loading lines from practice-lines.ts:", error);
    showErrorToast("Failed to load lines from practice-lines.ts");
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

  // Notation toggle
  const notationToggle = document.getElementById(
    "practice-notation-toggle",
  ) as HTMLSelectElement;
  if (notationToggle) {
    notationToggle.addEventListener("change", () => {
      // The move history will update automatically when new moves are made
      // since we check the notation preference in the move functions
    });
  }

  // Max depth slider
  dom.maxDepth.addEventListener("input", () => {
    const newMaxDepth = parseInt(dom.maxDepth.value) || 10;
    gameState.maxDepth = newMaxDepth;

    // Update the slider value display
    const sliderValue = document.getElementById("practice-slider-value");
    if (sliderValue) {
      sliderValue.textContent = newMaxDepth.toString();
    }

    console.log(`Max depth updated to: ${newMaxDepth}`);
  });

  // Opening lines textarea - update depth control when content changes
  dom.openingLines.addEventListener("input", () => {
    const linesText = dom.openingLines.value;
    // Refresh imported metadata if the textarea contains JSON
    const maybeMeta = tryParseFishJson(linesText);
    gameState.positionTopMoves = maybeMeta
      ? buildTopMovesMapFromFish(maybeMeta)
      : undefined;
    updateTopMovesPanel(dom, gameState);
    const lines = parseOpeningLines(linesText);
    const longNotationLines = convertOpeningLinesToPCN(
      lines,
      gameState.currentFEN,
    );
    updateDepthControl(longNotationLines);
  });

  // Confetti test button
  const confettiBtn = document.getElementById(
    "practice-confetti-btn",
  ) as HTMLButtonElement;
  if (confettiBtn) {
    confettiBtn.addEventListener("click", () => {
      console.log("Rainbow burst button clicked!");
      triggerRainbowBurst();
    });
  } else {
    console.error("Confetti button not found!");
  }

  // Clear selections button
  const clearSelectionsBtn = document.getElementById(
    "practice-clear-selections-btn",
  ) as HTMLButtonElement;
  if (clearSelectionsBtn) {
    clearSelectionsBtn.addEventListener("click", () => {
      clearRightClickSelections();
    });
  }

  // Clear arrows button
  const clearArrowsBtn = document.getElementById(
    "practice-clear-arrows-btn",
  ) as HTMLButtonElement;
  if (clearArrowsBtn) {
    clearArrowsBtn.addEventListener("click", () => {
      clearAllArrows();
    });
  }

  // Go back button
  dom.goBackBtn.addEventListener("click", () => {
    goBackOneMove();
  });

  // Go back random button
  dom.goBackRandomBtn.addEventListener("click", () => {
    goBackOneMoveRandom();
  });

  // Pin position button
  dom.pinPositionBtn.addEventListener("click", () => {
    pinCurrentPosition();
  });

  // Restart from pinned position button
  dom.restartPinnedBtn.addEventListener("click", () => {
    restartFromPinnedPosition();
  });

  // Load lines from practice-lines.ts button
  dom.loadLinesBtn.addEventListener("click", () => {
    loadLinesFromFile();
  });
}

// Initialize the application
export function initializePractice(): void {
  initializeDOMElements();
  initializeBoardWithEventListeners();
  initializeEventListeners();
  resetPractice();

  // Analyze initial opening lines content
  const linesText = dom.openingLines.value;
  const lines = parseOpeningLines(linesText);
  const longNotationLines = convertOpeningLinesToPCN(
    lines,
    gameState.currentFEN,
  );
  updateDepthControl(longNotationLines);
  updateTopMovesPanel(dom, gameState);

  // Auto-start practice with initial lines
  if (lines.length > 0) {
    startPractice(gameState, dom);
  }
}

// Try to parse Fish JSON state pasted into the opening lines textarea
function tryParseFishJson(text: string): any | null {
  try {
    const data = JSON.parse(text);
    if (data && typeof data === "object" && data.type === "fish-state") {
      return data;
    }
  } catch (_e) {
    // Not JSON — ignore
  }
  return null;
}

// Build a map from FEN -> top moves [{move, score}] using fish state
function buildTopMovesMapFromFish(state: any): Map<string, { move: string; score: number }[]> {
  const map = new Map<string, { move: string; score: number }[]>();
  if (!state || !state.done) return map;
  for (const line of state.done as Array<any>) {
    if (line && typeof line.position === "string" && Array.isArray(line.best5)) {
      // best5 is array of { move: string; score: number }
      map.set(line.position, line.best5.slice(0, 5));
    }
  }
  // Also include root cached baseline moves if present
  if (state.config && Array.isArray(state.config.baselineMoves) && typeof state.config.rootFEN === "string") {
    map.set(state.config.rootFEN, state.config.baselineMoves.slice(0, 5));
  }
  return map;
}

// Update the side panel with top-5 moves for current FEN (if available)
function updateTopMovesPanel(dom: DOMElements, gameState: GameState): void {
  const container = dom.topMoves;
  const meta = gameState.positionTopMoves;
  if (!meta) {
    container.innerHTML = "<em>No engine metadata loaded</em>";
    return;
  }
  const list = meta.get(gameState.currentFEN);
  if (!list || list.length === 0) {
    container.innerHTML = "<em>No top moves for this position</em>";
    return;
  }
  const items = list
    .map((m, i) => {
      const scoreStr = Math.abs(m.score) >= 10000 ? (m.score > 0 ? "#" : "-#") : (m.score / 100).toFixed(2);
      return `${i + 1}. ${m.move}  (score ${scoreStr})`;
    })
    .join("<br/>");
  container.innerHTML = items;
}
