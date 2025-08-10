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
import { triggerRainbowBurst } from "../utils/confetti-utils.js";
import { showHintForCurrentPosition } from "./practice-game.js";
import { highlightLastMove } from "./practice-board.js";
import {
  initializeArrowDrawing,
  cleanupArrowDrawing,
  clearAllArrows,
} from "./practice-arrow-utils.js";
import { GameState, DOMElements, OpeningLine } from "./practice-types.js";
import { parseMove } from "../utils/move-parsing.js";
import { parseFEN } from "../utils/fen-utils.js";
import { applyMoveToFEN } from "../utils/fen-manipulation.js";
// import { convertLineToLongNotation } from "../utils/notation-utils.js";
// Server-side AI integration
// Coach prompt helpers
interface CoachPromptInput {
  fen: string;
  openingHint?: string;
}

interface CoachResponse {
  summary: string;
  generalIdea: string;
  generalIdeaSteps?: CoachStep[];
  ideasWhite: string;
  ideasWhiteSteps?: CoachStep[];
  ideasBlack: string;
  ideasBlackSteps?: CoachStep[];
  terminology: string[];
  study: string[];
  knownPositions: string[];
  pitfalls: string[];
  themes: string[];
}

type CoachAction =
  | { type: "arrow"; from: string; to: string; color?: string }
  | { type: "setPosition"; fen: string }
  | { type: "highlight"; squares: string[]; style?: "hint" | "select" }
  | { type: "wait"; ms: number };

interface CoachStep {
  text: string;
  actions?: CoachAction[];
}

function buildEngineSummaryForCurrentPosition(): string {
  // Placeholder: we could aggregate existing meta if present
  return "";
}

function buildCoachPrompt(input: CoachPromptInput): string {
  const ascii = buildAsciiBoard(input.fen);
  const pieces = listPiecesFromFen(input.fen);
  const engineTop5 = getTop5ForCurrentFEN();
  return [
    "You are a chess coach. Given a FEN, provide a structured analysis.",
    "Return ONLY valid JSON matching this TypeScript interface:",
    "{",
    '  "summary": string,',
    '  "generalIdea": string,',
    '  "generalIdeaSteps"?: { text: string, actions?: Array<',
    "    { type: 'arrow', from: string, to: string, color?: string } | ",
    "    { type: 'setPosition', fen: string } | ",
    "    { type: 'highlight', squares: string[], style?: 'hint' | 'select' } | ",
    "    { type: 'wait', ms: number }",
    "  > }[],",
    '  "ideasWhite": string,',
    '  "ideasWhiteSteps"?: CoachStep[],',
    '  "ideasBlack": string,',
    '  "ideasBlackSteps"?: CoachStep[],',
    '  "terminology": string[],',
    '  "study": string[],',
    '  "knownPositions": string[],',
    '  "pitfalls": string[],',
    '  "themes": string[]',
    "}",
    "Guidelines:",
    "- Be accurate and concise; avoid speculation.",
    "- Use plain language; short paragraphs.",
    "- terminology: 5-10 key terms relevant to the position/opening.",
    "- study: books/chapters/keywords to research.",
    "- knownPositions: list of named lines/positions if applicable.",
    "- pitfalls: common traps or mistakes to avoid.",
    "- themes: high-level motifs (pawn structure, typical maneuvers).",
    "- For *Steps arrays*, include succinct steps for animating the idea; annotate with actions to draw arrows, set positions, highlight squares, and waits.",
    "- Keep actions conservative and valid from the given FEN.",
    `FEN: ${input.fen}`,
    input.openingHint ? `Opening context: ${input.openingHint}` : "",
    "",
    "Pieces (side@square):",
    pieces,
    "",
    "ASCII Board:",
    ascii,
    "",
    "Engine top-5 (long, cp):",
    engineTop5.length ? engineTop5.join("\n") : "(none)",
  ]
    .filter(Boolean)
    .join("\n");
}

function parseCoachResponse(text: string): CoachResponse {
  try {
    return JSON.parse(text) as CoachResponse;
  } catch {
    return {
      summary: "",
      generalIdea: "",
      ideasWhite: "",
      ideasBlack: "",
      terminology: [],
      study: [],
      knownPositions: [],
      pitfalls: [],
      themes: [],
    };
  }
}

function renderCoachSections(
  data: CoachResponse,
  summaryEl: HTMLElement,
  sectionsEl: HTMLElement,
): void {
  summaryEl.textContent = data.summary || "";
  const section = (title: string, body: string | string[]) => {
    const content = Array.isArray(body) ? body.join("\n") : body;
    return `\n<div class="ai-card"><h4>${title}</h4><div>${(content || "").replace(/\n/g, "<br/>")}</div></div>`;
  };
  const ideaControl =
    data.generalIdeaSteps && data.generalIdeaSteps.length
      ? `\n<div style="margin-top:6px;text-align:right"><button class=\"practice-button\" id=\"practice-ai-show-idea\">Show Idea</button></div>`
      : "";
  sectionsEl.innerHTML = [
    `\n<div class="ai-card"><h4>General Idea</h4><div>${(data.generalIdea || "").replace(/\n/g, "<br/>")}</div>${ideaControl}</div>`,
    section("Ideas for White", data.ideasWhite),
    section("Ideas for Black", data.ideasBlack),
    section("Terminology", data.terminology),
    section("Themes", data.themes),
    section("Pitfalls", data.pitfalls),
    section("Known Positions", data.knownPositions),
    section("Study Next", data.study),
  ].join("");

  // Wire Show Idea button
  const btn = document.getElementById(
    "practice-ai-show-idea",
  ) as HTMLButtonElement | null;
  if (btn && data.generalIdeaSteps && data.generalIdeaSteps.length) {
    btn.onclick = () => openCoachPlayer(data.generalIdeaSteps!);
  }
}

function buildMockCoachResponse(kind: "nf3" | "nf3_g3"): CoachResponse {
  if (kind === "nf3") {
    return {
      summary:
        "1. Nf3 is a flexible Reti start that develops safely, pressures e5/d4, and keeps multiple central plans (d4/c4) and kingside fianchetto available.",
      generalIdea:
        "White develops the g1‑knight to f3 (guards e5/d4), then can aim for g3/Bg2 and flexible central breaks with d4 or c4 depending on Black’s setup.",
      generalIdeaSteps: [
        {
          text: "Develop Nf3 to control e5/d4.",
          actions: [{ type: "arrow", from: "g1", to: "f3" }],
        },
        {
          text: "Prepare kingside fianchetto.",
          actions: [{ type: "highlight", squares: ["g2"], style: "hint" }],
        },
        {
          text: "Keep options for d4 or c4 depending on Black.",
          actions: [
            { type: "arrow", from: "d2", to: "d4", color: "rgba(0,150,0,0.9)" },
            { type: "arrow", from: "c2", to: "c4", color: "rgba(0,150,0,0.9)" },
          ],
        },
      ],
      ideasWhite:
        "Develop Nf3, g3, Bg2, 0-0; decide between d4 or c4 based on Black’s center; later support e4 with c3/d3 or piece coordination.",
      ideasBlack:
        "Equalize with …d5/…c5 or …e5. Develop …Nf6, …Be7/…Bb4, and castle; aim for timely …e5 or …c5 breaks against a fianchetto.",
      terminology: [
        "Reti",
        "Hypermodern",
        "Fianchetto",
        "Central break",
        "Flexible move order",
        "Transposition",
      ],
      study: [
        "Reti: Nunn/Emms chapters",
        "Hypermodern principles",
        "English/Reti transpositions",
        "Fianchetto structures vs …d5/…c5",
      ],
      knownPositions: [
        "Reti vs …d5 (Slav-like)",
        "Reti vs …c5 (Symmetrical English)",
        "Reti → Catalan-like if d4 inserted",
      ],
      pitfalls: [
        "Premature e4 without support",
        "Allowing easy …d5–…c5 equality",
        "Ignoring …Bb4 pins after Nc3",
      ],
      themes: [
        "Control of e4/d4",
        "Fianchetto long-diagonal pressure",
        "Gradual central expansion",
        "Transposition safety",
      ],
    };
  }
  return {
    summary:
      "1. Nf3 e6 2. g3 leads to a Reti/English hybrid; White fianchettos and retains d4/c4 flexibility while Black holds …d5/…c5 options.",
    generalIdea:
      "White prepares Bg2 and 0-0, then chooses c4 or d4 based on Black’s central setup; Black can play …d5 (French-like) or …c5 (English) while developing …Nf6 and castling.",
    generalIdeaSteps: [
      {
        text: "Kingside fianchetto plan: g3 → Bg2 → 0-0.",
        actions: [{ type: "highlight", squares: ["g2"], style: "hint" }],
      },
      {
        text: "Choose c4 or d4 depending on …d5/…c5.",
        actions: [
          { type: "arrow", from: "c2", to: "c4", color: "rgba(0,150,0,0.9)" },
          { type: "arrow", from: "d2", to: "d4", color: "rgba(0,150,0,0.9)" },
        ],
      },
    ],
    ideasWhite:
      "Bg2, 0-0, then c4 or d4; pressure light squares and the long diagonal. Prepare e4 later with support.",
    ideasBlack:
      "…d5 for French-like structures or …c5 for English ideas; develop …Nf6, …Be7/…Bb4, castle; prepare …e5 or …c5 breaks against White’s fianchetto.",
    terminology: [
      "Reti",
      "English transposition",
      "French-like center",
      "Fianchetto",
      "Central break timing",
      "Symmetrical English",
    ],
    study: [
      "Reti vs …e6 structures",
      "English with …e6 setups",
      "Catalan motifs from Reti move orders",
    ],
    knownPositions: [
      "Reti vs …e6 with …d5",
      "English with …e6/…c5",
      "Catalan-like with d4 + Bg2",
    ],
    pitfalls: [
      "Premature d4 vs …c5 equalization",
      "Neglecting development vs …Bb4+ motifs",
    ],
    themes: [
      "Fianchetto long-diagonal pressure",
      "Central breaks timing",
      "Transpositional nuance",
    ],
  };
}

// Helpers for prompt enrichment
function buildAsciiBoard(fen: string): string {
  const pos = parseFEN(fen);
  const rows: string[] = [];
  rows.push("  +------------------------+");
  for (let r = 0; r < 8; r++) {
    const rank = 8 - r;
    const cells: string[] = [];
    for (let f = 0; f < 8; f++) {
      const piece = pos.board[r][f] || ".";
      cells.push(piece);
    }
    rows.push(`${rank} | ${cells.join(" ")} |`);
  }
  rows.push("  +------------------------+");
  rows.push("    a b c d e f g h");
  return rows.join("\n");
}

function listPiecesFromFen(fen: string): string {
  const pos = parseFEN(fen);
  const white: string[] = [];
  const black: string[] = [];
  const files = "abcdefgh";
  for (let r = 0; r < 8; r++) {
    for (let f = 0; f < 8; f++) {
      const p = pos.board[r][f];
      if (!p) continue;
      const sq = `${files[f]}${8 - r}`;
      if (p === p.toUpperCase()) white.push(`${p}@${sq}`);
      else black.push(`${p}@${sq}`);
    }
  }
  return `White: ${white.join(", ") || "(none)"}\nBlack: ${black.join(", ") || "(none)"}`;
}

function getTop5ForCurrentFEN(): string[] {
  try {
    const list = (
      gameState.positionTopMoves?.get(gameState.currentFEN) || []
    ).slice(0, 5);
    return list.map((m) => `${m.move} (${m.score})`);
  } catch {
    return [];
  }
}

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
  // Track the longest line to signal UI if needed later
  // (not used currently)
  // let _longestLine: OpeningLine | null = null;

  for (const line of openingLines) {
    // Count the number of full moves in this line
    // Each numbered move (1., 2., 3., etc.) represents one full move
    // So we count the number of numbered moves in the original line
    const fullMoveCount = Math.ceil(line.moves.length / 2);

    if (fullMoveCount > maxDepth) {
      maxDepth = fullMoveCount;
      // _longestLine = line;
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
  // Follow-up removed; retain a stub element to avoid null references
  const questionEl = {
    value: "",
  } as unknown as HTMLTextAreaElement;
  const answerEl = getElementByIdOrThrow("practice-ai-answer");
  const apiKeyEl = getElementByIdOrThrow(
    "practice-ai-api-key",
  ) as HTMLInputElement;

  askBtn.addEventListener("click", async () => {
    try {
      askBtn.setAttribute("aria-busy", "true");
      answerEl.textContent = "Asking AI...";
      const includePrompt = true;
      const engineSummary = buildEngineSummaryForCurrentPosition();
      const prompt = buildCoachPrompt({
        fen: gameState.currentFEN,
        openingHint: undefined,
      });
      const payload = {
        fen: gameState.currentFEN,
        level: (levelEl.value as any) || "intermediate",
        question: prompt,
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
        const parsed = parseCoachResponse(rawAnswer);
        renderCoachSections(parsed, summary, sections);
      }
    } catch (e) {
      console.error(e);
      answerEl.textContent = "AI request failed. Check console.";
      showErrorToast("AI request failed");
    } finally {
      askBtn.setAttribute("aria-busy", "false");
    }
  });
  // Show Prompt button
  const showPromptBtn = document.getElementById(
    "practice-ai-show-prompt",
  ) as HTMLButtonElement | null;
  if (showPromptBtn) {
    showPromptBtn.addEventListener("click", () => {
      const prompt = buildCoachPrompt({ fen: gameState.currentFEN });
      const answerEl = document.getElementById("practice-ai-answer");
      if (answerEl) {
        answerEl.classList.remove("visually-hidden");
        answerEl.textContent = prompt;
      }
      showInfoToast("Prompt shown below");
    });
  }

  // Preview buttons
  const previewNf3Btn = document.getElementById(
    "practice-ai-preview-nf3",
  ) as HTMLButtonElement | null;
  const previewNf3g3Btn = document.getElementById(
    "practice-ai-preview-nf3-g3",
  ) as HTMLButtonElement | null;
  if (previewNf3Btn) {
    previewNf3Btn.addEventListener("click", () => {
      const mock = buildMockCoachResponse("nf3");
      const summary = document.getElementById("practice-ai-summary");
      const sections = document.getElementById("practice-ai-sections");
      if (summary && sections) renderCoachSections(mock, summary, sections);
    });
  }
  if (previewNf3g3Btn) {
    previewNf3g3Btn.addEventListener("click", () => {
      const mock = buildMockCoachResponse("nf3_g3");
      const summary = document.getElementById("practice-ai-summary");
      const sections = document.getElementById("practice-ai-sections");
      if (summary && sections) renderCoachSections(mock, summary, sections);
    });
  }

  // Play back DSL-like steps by executing actions with small delays
  async function playCoachSteps(steps: CoachStep[]): Promise<void> {
    const board = document.querySelector(
      ".practice-board",
    ) as HTMLElement | null;
    if (!board) return;
    const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
    for (const step of steps) {
      showInfoToast(step.text);
      if (step.actions) {
        for (const a of step.actions) {
          if (a.type === "wait") {
            await sleep(a.ms);
          } else if (a.type === "setPosition") {
            gameState.currentFEN = a.fen;
            renderBoard(gameState.currentFEN);
          } else if (a.type === "highlight") {
            a.squares.forEach((sq) => {
              const el = document.querySelector(
                `[data-square="${sq}"]`,
              ) as HTMLElement | null;
              if (el)
                el.classList.add(
                  a.style === "select" ? "selected" : "hint-piece",
                );
            });
          } else if (a.type === "arrow") {
            const fromEl = document.querySelector(
              `[data-square="${a.from}"]`,
            ) as HTMLElement | null;
            const toEl = document.querySelector(
              `[data-square="${a.to}"]`,
            ) as HTMLElement | null;
            if (fromEl && toEl && board) {
              const br = board.getBoundingClientRect();
              const fr = fromEl.getBoundingClientRect();
              const tr = toEl.getBoundingClientRect();
              const fx = fr.left + fr.width / 2 - br.left;
              const fy = fr.top + fr.height / 2 - br.top;
              const tx = tr.left + tr.width / 2 - br.left;
              const ty = tr.top + tr.height / 2 - br.top;
              const angle = Math.atan2(ty - fy, tx - fx);
              const dist = Math.hypot(tx - fx, ty - fy);
              const arrow = document.createElement("div");
              arrow.className = "practice-arrow";
              arrow.style.left = `${fx}px`;
              arrow.style.top = `${fy}px`;
              arrow.style.width = `${Math.max(0, dist - 20)}px`;
              arrow.style.transform = `rotate(${angle}rad)`;
              arrow.style.transformOrigin = "0 50%";
              arrow.style.setProperty(
                "--arrow-color",
                (a as any).color || "rgba(0, 123, 255, 0.95)",
              );
              board.appendChild(arrow);
            }
          }
        }
      }
      await sleep(350);
    }
  }

  // expose for inline handler wiring above
  // expose for debugging
  (window as any).__playCoachSteps = playCoachSteps;

  // Coach player state
  let coachSteps: CoachStep[] = [];
  let coachIndex = 0;

  function openCoachPlayer(steps: CoachStep[]): void {
    coachSteps = steps.slice(0);
    coachIndex = 0;
    const panel = document.getElementById(
      "practice-coach-player",
    ) as HTMLElement | null;
    const text = document.getElementById(
      "practice-coach-text",
    ) as HTMLElement | null;
    const prev = document.getElementById(
      "practice-coach-prev",
    ) as HTMLButtonElement | null;
    const next = document.getElementById(
      "practice-coach-next",
    ) as HTMLButtonElement | null;
    const close = document.getElementById(
      "practice-coach-close",
    ) as HTMLButtonElement | null;
    if (!panel || !text || !prev || !next || !close) return;
    panel.style.display = "block";
    const render = async (idx: number) => {
      if (!coachSteps[idx]) return;
      text.textContent = coachSteps[idx].text || "";
      // Clear arrows/highlights between steps for clarity
      clearAllArrows();
      document
        .querySelectorAll(
          ".practice-square.selected,.practice-square.hint-piece",
        )
        .forEach((el) => {
          el.classList.remove("selected", "hint-piece");
        });
      await playCoachSteps([coachSteps[idx]]);
    };
    prev.onclick = async () => {
      coachIndex = Math.max(0, coachIndex - 1);
      await render(coachIndex);
    };
    next.onclick = async () => {
      coachIndex = Math.min(coachSteps.length - 1, coachIndex + 1);
      await render(coachIndex);
    };
    close.onclick = () => {
      panel.style.display = "none";
      clearAllArrows();
    };
    // start at first step
    void render(coachIndex);
  }

  // Quick prompt chips
  const quick = document.getElementById("practice-ai-quick");
  if (quick) {
    quick.addEventListener("click", (e) => {
      const target = e.target as HTMLElement;
      const btn = target.closest(
        ".practice-ai-chip-btn",
      ) as HTMLButtonElement | null;
      if (!btn) return;
      const txt = btn.getAttribute("data-text") || "";
      if (!txt) return;
      // No-op since follow-up field is removed
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
    gameState.positionTopMoves = buildTopMovesMapFromFishCopy(
      linesText,
      gameState.currentFEN,
    );
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

  // Remove last two plies when possible (engine + human) to land at previous human move
  const removed: (typeof gameState.moveHistory)[number][] = [];
  for (let i = 0; i < 2 && gameState.moveHistory.length > 0; i++) {
    removed.push(gameState.moveHistory.pop()!);
    gameState.positionHistory.pop();
  }

  // Restore the previous position
  gameState.currentFEN =
    gameState.positionHistory[gameState.positionHistory.length - 1];

  // Decrement depth by one human move
  gameState.currentDepth = Math.max(0, gameState.currentDepth - 1);

  // Update statistics (remove last human correct move among removed)
  const lastHuman = removed.find(
    (m) => m.isWhite === (gameState.moveHistory.length % 2 === 0),
  );
  if (lastHuman && lastHuman.isCorrect) {
    gameState.statistics.correctMoves = Math.max(
      0,
      gameState.statistics.correctMoves - 1,
    );
  }
  gameState.statistics.totalMoves = Math.max(
    0,
    gameState.statistics.totalMoves - 1,
  );

  // Make it human's turn
  gameState.isHumanTurn = true;
  gameState.isPracticeActive = true;

  // Clear selections and arrows (keep last-move indicator; we'll re-apply it)
  clearBoardSelectionWithoutLastMove();
  clearAllArrows();

  // Re-render board and update UI
  renderBoard(gameState.currentFEN);
  // Re-apply last-move highlight unless we are at the starting position
  if (
    gameState.moveHistory.length > 0 &&
    gameState.positionHistory.length >= 2
  ) {
    const lastMoveRemain =
      gameState.moveHistory[gameState.moveHistory.length - 1];
    const prevFenForLast =
      gameState.positionHistory[gameState.positionHistory.length - 2];
    const parsed = parseMove(lastMoveRemain.notation, prevFenForLast);
    if (parsed) highlightLastMove(parsed.from, parsed.to);
  }
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

  // Remove last two plies (engine + human) to land at previous human move
  const removed: (typeof gameState.moveHistory)[number][] = [];
  for (let i = 0; i < 2 && gameState.moveHistory.length > 0; i++) {
    removed.push(gameState.moveHistory.pop()!);
    gameState.positionHistory.pop();
  }

  // Restore the previous position
  gameState.currentFEN =
    gameState.positionHistory[gameState.positionHistory.length - 1];

  // Decrement depth by one human move
  gameState.currentDepth = Math.max(0, gameState.currentDepth - 1);

  const lastHuman = removed.find(
    (m) => m.isWhite === (gameState.moveHistory.length % 2 === 0),
  );
  if (lastHuman && lastHuman.isCorrect) {
    gameState.statistics.correctMoves = Math.max(
      0,
      gameState.statistics.correctMoves - 1,
    );
  }
  gameState.statistics.totalMoves = Math.max(
    0,
    gameState.statistics.totalMoves - 1,
  );

  // Make it human's turn
  gameState.isHumanTurn = true;
  gameState.isPracticeActive = true;

  // Clear selections and arrows (keep last-move indicator; we'll re-apply it)
  clearBoardSelectionWithoutLastMove();
  clearAllArrows();

  // Re-render board and update UI
  renderBoard(gameState.currentFEN);
  // Re-apply last-move highlight unless we are at the starting position
  if (
    gameState.moveHistory.length > 0 &&
    gameState.positionHistory.length >= 2
  ) {
    const lastMoveRemain2 =
      gameState.moveHistory[gameState.moveHistory.length - 1];
    const prevFenForLast2 =
      gameState.positionHistory[gameState.positionHistory.length - 2];
    const parsed2 = parseMove(lastMoveRemain2.notation, prevFenForLast2);
    if (parsed2) highlightLastMove(parsed2.from, parsed2.to);
  }
  reAddDragAndDropListeners(gameState, dom);
  updateStatus(dom, gameState);
  updateStatistics(dom, gameState);
  updateTopMovesPanel(dom, gameState);

  // Update move history display
  updateMoveHistoryDisplay(dom.moveHistory);

  // Trigger a random computer move after a short delay
  setTimeout(() => {
    if (gameState.isPracticeActive && !gameState.isHumanTurn) {
      // Re-evaluate availability for next moves using current map
      const availableMoves = gameState.positionMap.get(gameState.currentFEN);
      if (availableMoves && availableMoves.length > 0) {
        // Hand control to computer by toggling turn; actual move selection happens in practice-game makeComputerMove
        gameState.isHumanTurn = false;
      }
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
// Keep for future export options
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

// Keep for future export options
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
      : buildTopMovesMapFromFishCopy(linesText, gameState.currentFEN);
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

  // Optional clipboard helpers (expose for UI buttons if added later)
  (window as any).copyPracticeLinesAsSAN = copyLinesAsSAN;
  (window as any).copyPracticeLinesAsLong = copyLinesAsLongNotation;

  // Print current line button
  const printLineBtn = document.getElementById(
    "practice-print-line-btn",
  ) as HTMLButtonElement | null;
  if (printLineBtn) {
    printLineBtn.addEventListener("click", () => {
      try {
        const obj = {
          fen: gameState.currentFEN,
          depth: gameState.currentDepth,
          history: [...gameState.moveHistory],
          positionHistory: [...gameState.positionHistory],
          pinned: {
            fen: gameState.pinnedPosition,
            depth: gameState.pinnedDepth,
          },
          topMoves: gameState.positionTopMoves?.get(gameState.currentFEN) || [],
        };
        console.log("Practice current line:", obj);
        showInfoToast("Printed current line to console");
      } catch (e) {
        console.error(e);
        showErrorToast("Failed to print current line");
      }
    });
  }

  // Show Top-5 arrows button
  const showTop5Btn = document.getElementById(
    "practice-show-top5-arrows-btn",
  ) as HTMLButtonElement | null;
  if (showTop5Btn) {
    showTop5Btn.addEventListener("click", () => {
      try {
        const meta =
          gameState.positionTopMoves?.get(gameState.currentFEN) || [];
        if (!meta.length) {
          showWarningToast("No top-5 moves available");
          return;
        }
        // Draw arrows for up to 5 human moves in current position
        const board = document.querySelector(
          ".practice-board",
        ) as HTMLElement | null;
        if (!board) return;
        meta.slice(0, 5).forEach((m) => {
          const move = m.move; // long like e2e4
          if (/^[a-h][1-8][a-h][1-8]$/.test(move)) {
            const from = move.substring(0, 2);
            const to = move.substring(2, 4);
            // Reuse preview arrow style for consistency, but fully opaque
            const fromEl = document.querySelector(
              `[data-square="${from}"]`,
            ) as HTMLElement | null;
            const toEl = document.querySelector(
              `[data-square="${to}"]`,
            ) as HTMLElement | null;
            if (!fromEl || !toEl) return;
            const br = board.getBoundingClientRect();
            const fr = fromEl.getBoundingClientRect();
            const tr = toEl.getBoundingClientRect();
            const fx = fr.left + fr.width / 2 - br.left;
            const fy = fr.top + fr.height / 2 - br.top;
            const tx = tr.left + tr.width / 2 - br.left;
            const ty = tr.top + tr.height / 2 - br.top;
            const angle = Math.atan2(ty - fy, tx - fx);
            const dist = Math.hypot(tx - fx, ty - fy);
            const arrow = document.createElement("div");
            arrow.className = "practice-arrow";
            arrow.style.left = `${fx}px`;
            arrow.style.top = `${fy}px`;
            arrow.style.width = `${Math.max(0, dist - 20)}px`;
            arrow.style.transform = `rotate(${angle}rad)`;
            arrow.style.transformOrigin = "0 50%";
            arrow.style.setProperty("--arrow-color", "rgba(0, 123, 255, 0.95)");
            board.appendChild(arrow);
          }
        });
        showInfoToast("Top-5 arrows shown");
      } catch (e) {
        console.error(e);
        showErrorToast("Failed to draw top-5 arrows");
      }
    });
  }
}

// Initialize the application
export function initializePractice(): void {
  initializeDOMElements();
  initializeBoardWithEventListeners();
  initializeEventListeners();
  resetPractice();

  // Bridge arrow-utils recent-complete flag to board using window function
  import("./practice-arrow-utils.js").then((mod) => {
    (window as any).practiceConsumeRecentArrowCompleted = (
      mod as any
    ).consumeRecentArrowCompleted;
    (window as any).practiceIsArrowDrawing = (mod as any).isArrowDrawing;
  });

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
function buildTopMovesMapFromFish(
  state: any,
): Map<string, { move: string; score: number }[]> {
  const map = new Map<string, { move: string; score: number }[]>();
  if (!state || !state.done) return map;
  for (const line of state.done as Array<any>) {
    if (
      line &&
      typeof line.position === "string" &&
      Array.isArray(line.best5)
    ) {
      // best5 is array of { move: string; score: number }
      map.set(line.position, line.best5.slice(0, 5));
    }
  }
  // Also include root cached baseline moves if present
  if (
    state.config &&
    Array.isArray(state.config.baselineMoves) &&
    typeof state.config.rootFEN === "string"
  ) {
    map.set(state.config.rootFEN, state.config.baselineMoves.slice(0, 5));
  }
  return map;
}

// Build a map from FEN -> top moves using per-line fish copy metadata (alts/replies)
function buildTopMovesMapFromFishCopy(
  text: string,
  startingFEN: string,
): Map<string, { move: string; score: number }[]> {
  const map = new Map<string, { move: string; score: number }[]>();
  if (!text || !text.trim()) return map;
  const lines = text.trim().split(/\n+/);
  for (const raw of lines) {
    const m = raw.match(/^(.*?)(?:\s*\/\/\s*(\{[\s\S]*\}))\s*$/);
    if (!m) continue; // no metadata
    const movesPart = (m[1] || "").trim();
    const jsonPart = m[2];
    let meta: any = null;
    try {
      meta = JSON.parse(jsonPart);
    } catch {
      continue;
    }
    if (!meta) continue;
    // Extract moves (remove move numbers)
    const moveTokens = movesPart
      .replace(/\d+\./g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .split(" ")
      .filter(Boolean);

    // Replay moves to find FENs
    let currentFEN = startingFEN;
    let prevFEN = currentFEN;
    for (let i = 0; i < moveTokens.length; i++) {
      const token = moveTokens[i];
      prevFEN = currentFEN;
      const parsed = parseMove(token, currentFEN);
      if (!parsed) {
        if (token === "O-O" || token === "O-O-O") {
          const m2 = parseMove(token, currentFEN);
          if (!m2) break;
          currentFEN = applyMoveToFEN(currentFEN, m2);
        } else if (/^[a-h][1-8][a-h][1-8]$/.test(token)) {
          const m2 = parseMove(token, currentFEN);
          if (!m2) break;
          currentFEN = applyMoveToFEN(currentFEN, m2);
        } else {
          break;
        }
      } else {
        currentFEN = applyMoveToFEN(currentFEN, parsed);
      }
    }

    // Map: player's top-5 (alts) to prevFEN
    if (Array.isArray(meta.alts) && meta.alts.length) {
      map.set(
        prevFEN,
        (meta.alts as Array<{ move: string; score: number }>).slice(0, 5),
      );
    }
    // Map: engine's top-5 replies for the last step to currentFEN
    if (Array.isArray(meta.replies) && meta.replies.length) {
      map.set(
        currentFEN,
        (meta.replies as Array<{ move: string; score: number }>).slice(0, 5),
      );
    }
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
  const currentFEN = gameState.currentFEN;
  const prevHumanFEN =
    gameState.positionHistory.length >= 2
      ? gameState.positionHistory[gameState.positionHistory.length - 2]
      : null;

  const altsList = meta.get(currentFEN) || [];
  // If it's engine's turn now (computer to move), show replies for current FEN.
  // If it's human's turn (engine already moved), keep showing the replies to the previous human move (prevHumanFEN).
  const repliesList = gameState.isHumanTurn
    ? prevHumanFEN
      ? meta.get(prevHumanFEN) || []
      : []
    : meta.get(currentFEN) || [];

  const scoreToStr = (cp: number) =>
    Math.abs(cp) >= 10000 ? (cp > 0 ? "#" : "-#") : (cp / 100).toFixed(2);

  const altsHtml = altsList.length
    ? `<div class="practice-alts">
         <div class="practice-subheading">Scores for top-5 options</div>
         <div class="practice-score-row">${altsList
           .slice(0, 5)
           .map(
             (m) =>
               `<span class="practice-score-chip">${scoreToStr(m.score)}</span>`,
           )
           .join("")}</div>
       </div>`
    : `<div class="practice-alts"><em>No scores available</em></div>`;

  const repliesHtml = repliesList.length
    ? `<div class="practice-replies">
         <div class="practice-subheading">Engine replies to your last move</div>
         <div class="practice-replies-list">${repliesList
           .slice(0, 5)
           .map((m, i) => {
             const s = scoreToStr(m.score);
             return `${i + 1}. ${m.move} (score ${s})`;
           })
           .join("<br/>")}</div>
       </div>`
    : `<div class="practice-replies"><em>No replies available</em></div>`;

  container.innerHTML = `${altsHtml}<div style="height:6px"></div>${repliesHtml}`;
}
