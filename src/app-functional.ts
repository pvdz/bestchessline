import { ChessMove, AnalysisMove, AnalysisResult } from "./types.js";
import { moveToNotation, pvToNotation } from "./utils.js";

console.log("am i still running at all?");

// ============================================================================
// STATE MANAGEMENT
// ============================================================================

/**
 * Application state interface
 */
interface AppState {
  // Game state
  moves: ChessMove[];
  initialFEN: string;
  currentMoveIndex: number;

  // Analysis state
  isAnalyzing: boolean;
  currentResults: AnalysisResult | null;

  // UI state
  boardElement: HTMLElement | null;
  stockfishWorker: Worker | null;
}

/**
 * Initial application state
 */
const createInitialState = (): AppState => ({
  moves: [],
  initialFEN: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
  currentMoveIndex: -1,
  isAnalyzing: false,
  currentResults: null,
  boardElement: null,
  stockfishWorker: null,
});

/**
 * Global state instance
 */
let appState: AppState = createInitialState();

/**
 * State update functions
 */
const updateState = (updates: Partial<AppState>): void => {
  appState = { ...appState, ...updates };
};

const getState = (): AppState => ({ ...appState });

// ============================================================================
// BOARD MANAGEMENT
// ============================================================================

/**
 * Board state interface
 */
interface BoardState {
  position: string; // FEN string
  selectedSquare: string | null;
  draggedPiece: string | null;
  legalMoves: string[];
}

/**
 * Board state management
 */
let boardState: BoardState = {
  position: appState.initialFEN,
  selectedSquare: null,
  draggedPiece: null,
  legalMoves: [],
};

/**
 * Update board state
 */
const updateBoardState = (updates: Partial<BoardState>): void => {
  boardState = { ...boardState, ...updates };
};

/**
 * Set board position
 */
const setBoardPosition = (fen: string): void => {
  updateBoardState({ position: fen });
  renderBoard();
  updateFENInput();
  updateControlsFromPosition();
};

/**
 * Get current board FEN
 */
const getBoardFEN = (): string => boardState.position;

// ============================================================================
// BOARD RENDERING
// ============================================================================

/**
 * Render the chess board
 */
const renderBoard = (): void => {
  const boardElement = document.getElementById("chess-board");
  if (!boardElement) return;

  boardElement.innerHTML = "";
  boardElement.className = "chess-board";

  // Create board container
  const boardContainer = document.createElement("div");
  boardContainer.className = "board-container";

  // Create board grid
  const board = document.createElement("div");
  board.className = "board";

  // Parse FEN and create squares
  const fenParts = boardState.position.split(" ");
  const boardPart = fenParts[0];
  const ranks = boardPart.split("/");

  for (let rank = 0; rank < 8; rank++) {
    for (let file = 0; file < 8; file++) {
      const square = document.createElement("div");
      const squareName = `${String.fromCharCode("a".charCodeAt(0) + file)}${8 - rank}`;
      const isLight = (rank + file) % 2 === 0;

      square.className = `square ${isLight ? "light" : "dark"}`;
      square.dataset.square = squareName;

      // Add rank/file labels
      if (file === 0) {
        const rankLabel = document.createElement("div");
        rankLabel.className = "rank-label";
        rankLabel.textContent = (8 - rank).toString();
        square.appendChild(rankLabel);
      }

      if (rank === 7) {
        const fileLabel = document.createElement("div");
        fileLabel.className = "file-label";
        fileLabel.textContent = String.fromCharCode("a".charCodeAt(0) + file);
        square.appendChild(fileLabel);
      }

      // Add piece if present
      const piece = getPieceAtSquare(rank, file, ranks);
      if (piece) {
        const pieceElement = createPieceElement(piece, squareName);
        square.appendChild(pieceElement);
      }

      board.appendChild(square);
    }
  }

  boardContainer.appendChild(board);
  boardElement.appendChild(boardContainer);
};

/**
 * Get piece at specific square from FEN ranks
 */
const getPieceAtSquare = (
  rank: number,
  file: number,
  ranks: string[],
): string => {
  const rankStr = ranks[rank];
  let fileIndex = 0;

  for (let i = 0; i < rankStr.length; i++) {
    const char = rankStr[i];
    if (char >= "1" && char <= "8") {
      fileIndex += parseInt(char);
    } else {
      if (fileIndex === file) {
        return char;
      }
      fileIndex++;
    }
  }
  return "";
};

/**
 * Create piece element
 */
const createPieceElement = (piece: string, square: string): HTMLElement => {
  const pieceElement = document.createElement("div");
  pieceElement.className = "piece";
  pieceElement.dataset.piece = piece;
  pieceElement.dataset.square = square;

  const color = piece === piece.toUpperCase() ? "w" : "b";
  const type = piece.toUpperCase();

  pieceElement.classList.add(color, type.toLowerCase());
  pieceElement.innerHTML = getPieceSymbol(type, color);

  return pieceElement;
};

/**
 * Get piece symbol for display
 */
const getPieceSymbol = (type: string, color: string): string => {
  const symbols: Record<string, string> = {
    K: "♔",
    Q: "♕",
    R: "♖",
    B: "♗",
    N: "♘",
    P: "♙",
    k: "♚",
    q: "♛",
    r: "♜",
    b: "♝",
    n: "♞",
    p: "♟",
  };

  const key = color === "w" ? type : type.toLowerCase();
  return symbols[key] || "";
};

// ============================================================================
// FEN INPUT MANAGEMENT
// ============================================================================

/**
 * Update FEN input field
 */
const updateFENInput = (): void => {
  const fenInput = document.getElementById("fen-input") as HTMLInputElement;
  if (fenInput) {
    fenInput.value = boardState.position;
  }
};

/**
 * Update controls from current position
 */
const updateControlsFromPosition = (): void => {
  const fenParts = boardState.position.split(" ");
  if (fenParts.length < 4) return;

  const turn = fenParts[1];
  const castling = fenParts[2];
  const enPassant = fenParts[3];

  // Update current player
  const whiteRadio = document.querySelector(
    'input[name="current-player"][value="w"]',
  ) as HTMLInputElement;
  const blackRadio = document.querySelector(
    'input[name="current-player"][value="b"]',
  ) as HTMLInputElement;

  if (whiteRadio && blackRadio) {
    if (turn === "w") {
      whiteRadio.checked = true;
    } else {
      blackRadio.checked = true;
    }
  }

  // Update castling rights
  const whiteKingside = document.getElementById(
    "white-kingside",
  ) as HTMLInputElement;
  const whiteQueenside = document.getElementById(
    "white-queenside",
  ) as HTMLInputElement;
  const blackKingside = document.getElementById(
    "black-kingside",
  ) as HTMLInputElement;
  const blackQueenside = document.getElementById(
    "black-queenside",
  ) as HTMLInputElement;

  if (whiteKingside) whiteKingside.checked = castling.includes("K");
  if (whiteQueenside) whiteQueenside.checked = castling.includes("Q");
  if (blackKingside) blackKingside.checked = castling.includes("k");
  if (blackQueenside) blackQueenside.checked = castling.includes("q");

  // Update en passant
  const enPassantInput = document.getElementById(
    "en-passant",
  ) as HTMLInputElement;
  if (enPassantInput) {
    enPassantInput.value = enPassant === "-" ? "" : enPassant;
  }
};

// ============================================================================
// EXPORT FUNCTIONS
// ============================================================================

export {
  // State management
  getState,
  updateState,

  // Board management
  setBoardPosition,
  getBoardFEN,
  updateBoardState,

  // Rendering
  renderBoard,

  // FEN management
  updateFENInput,
  updateControlsFromPosition,
};
