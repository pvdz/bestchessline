import {
  ChessPosition,
  ChessMove,
  PieceType,
  Color,
  Square,
  File,
  Rank,
  NotationFormat,
  PieceFormat,
} from "./types.js";

export function parseFEN(fen: string): ChessPosition {
  const parts = fen.split(" ");
  const boardPart = parts[0];
  const turn = parts[1] as "w" | "b";
  const castling = parts[2];
  const enPassant = parts[3] === "-" ? null : parts[3];
  const halfMoveClock = parseInt(parts[4]);
  const fullMoveNumber = parseInt(parts[5]);

  const board: string[][] = Array(8)
    .fill(null)
    .map(() => Array(8).fill(""));
  const ranks = boardPart.split("/");

  for (let rank = 0; rank < 8; rank++) {
    let file = 0;
    for (const char of ranks[rank]) {
      if (char >= "1" && char <= "8") {
        file += parseInt(char);
      } else {
        board[rank][file] = char;
        file++;
      }
    }
  }

  return {
    board,
    turn,
    castling,
    enPassant,
    halfMoveClock,
    fullMoveNumber,
  };
}

export function toFEN(position: ChessPosition): string {
  let fen = "";

  // Board
  for (let rank = 0; rank < 8; rank++) {
    let emptyCount = 0;
    for (let file = 0; file < 8; file++) {
      const piece = position.board[rank][file];
      if (piece === "") {
        emptyCount++;
      } else {
        if (emptyCount > 0) {
          fen += emptyCount;
          emptyCount = 0;
        }
        fen += piece;
      }
    }
    if (emptyCount > 0) {
      fen += emptyCount;
    }
    if (rank < 7) fen += "/";
  }

  // Turn
  fen += ` ${position.turn}`;

  // Castling
  fen += ` ${position.castling}`;

  // En passant
  fen += ` ${position.enPassant || "-"}`;

  // Half move clock
  fen += ` ${position.halfMoveClock}`;

  // Full move number
  fen += ` ${position.fullMoveNumber}`;

  return fen;
}

export function squareToCoords(square: Square): [number, number] {
  const file = square.charCodeAt(0) - "a".charCodeAt(0);
  const rank = 8 - parseInt(square[1]);
  return [rank, file];
}

export function coordsToSquare(rank: number, file: number): Square {
  const fileChar = String.fromCharCode("a".charCodeAt(0) + file);
  const rankChar = (8 - rank).toString();
  return `${fileChar}${rankChar}` as Square;
}

export function isValidSquare(square: string): square is Square {
  if (square.length !== 2) return false;
  const file = square[0];
  const rank = square[1];
  return file >= "a" && file <= "h" && rank >= "1" && rank <= "8";
}

export function getPieceColor(piece: string): Color | null {
  if (!piece) return null;
  return piece === piece.toUpperCase() ? "w" : "b";
}

// Constants for piece types (uppercase, used for type matching)
export const PIECE_TYPES = {
  KING: "K",
  QUEEN: "Q",
  ROOK: "R",
  BISHOP: "B",
  KNIGHT: "N",
  PAWN: "P",
} as const;

export function getPieceType(piece: string): PieceType | null {
  if (!piece) return null;
  const upperPiece = piece.toUpperCase();
  const validPieceTypes = [
    PIECE_TYPES.PAWN,
    PIECE_TYPES.ROOK,
    PIECE_TYPES.KNIGHT,
    PIECE_TYPES.BISHOP,
    PIECE_TYPES.QUEEN,
    PIECE_TYPES.KING,
  ];
  if (validPieceTypes.includes(upperPiece as PieceType)) {
    return upperPiece as PieceType;
  }
  return null;
}

export function formatScore(score: number): string {
  if (Math.abs(score) < 100) {
    return `${score >= 0 ? "+" : ""}${score}`;
  }
  const mate = Math.abs(score) > 9000;
  if (mate) {
    const mateMoves = Math.ceil((10000 - Math.abs(score)) / 2);
    return score > 0 ? `M${mateMoves}` : `-M${mateMoves}`;
  }
  return `${score >= 0 ? "+" : ""}${(score / 100).toFixed(1)}`;
}

export function formatTime(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`;
}

export function debounce<T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number,
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

// Chess notation utilities
export function moveToNotation(
  move: ChessMove,
  format: NotationFormat = "short",
  pieceFormat: PieceFormat = "unicode",
  fen?: string,
): string {
  const piece = getPieceType(move.piece);
  const color = getPieceColor(move.piece);

  if (!piece || !color) return `${move.from}-${move.to}`;

  const pieceSymbol = getPieceSymbol(piece, color, pieceFormat);

  if (format === "long") {
    return `${pieceSymbol}${move.from}-${move.to}`;
  } else {
    // Standard algebraic notation
    let notation = "";

    if (piece === PIECE_TYPES.PAWN) {
      // Pawn moves
      if (move.from.charAt(0) === move.to.charAt(0)) {
        // Same file (e.g., e2e4 -> e4)
        notation = move.to;
      } else {
        // Capture (e.g., e2d3 -> exd3)
        notation = `${move.from.charAt(0)}x${move.to}`;
      }
    } else {
      // Piece moves
      const pieceChar = pieceFormat === "unicode" ? pieceSymbol : piece;
      // Check if it's a capture by looking at the target square or move effect
      let isCapture = false;

      if (move.effect?.isCapture) {
        isCapture = true;
      } else if (fen) {
        const position = parseFEN(fen);
        const toRank = 8 - parseInt(move.to[1]);
        const toFile = move.to.charCodeAt(0) - "a".charCodeAt(0);
        const targetPiece = position.board[toRank][toFile];
        isCapture = Boolean(targetPiece && targetPiece !== "");
      }

      if (isCapture) {
        notation = `${pieceChar}x${move.to}`;
      } else {
        notation = `${pieceChar}${move.to}`;
      }
    }

    // Add effect indicators
    if (move.effect) {
      if (move.effect.isMate) {
        notation += "#";
      } else if (move.effect.isCheck) {
        notation += "+";
      }
    }

    return notation;
  }
}

export function getPieceSymbol(
  type: PieceType,
  color: Color,
  format: PieceFormat = "unicode",
): string {
  if (format === "english") {
    return type;
  }

  // Unicode symbols
  const symbols = {
    w: {
      K: "♔",
      Q: "♕",
      R: "♖",
      B: "♗",
      N: "♘",
      P: "♙",
    },
    b: {
      K: "♚",
      Q: "♛",
      R: "♜",
      B: "♝",
      N: "♞",
      P: "♟",
    },
  };

  return symbols[color][type] || type;
}

export function pvToNotation(
  pv: ChessMove[],
  format: NotationFormat = "short",
  pieceFormat: PieceFormat = "unicode",
  fen?: string,
): string {
  if (pv.length === 0) return "";

  // Process moves in the context of the actual position
  const moves = pv.map((move, index) => {
    // For now, use the original position for all moves
    // In a more sophisticated implementation, we'd update the position after each move
    return moveToNotation(move, format, pieceFormat, fen);
  });

  if (format === "long") {
    // Long format: just show the moves with piece symbols
    return moves.join(" ");
  } else {
    // Short format: standard game notation with move numbers
    let result = "";
    for (let i = 0; i < moves.length; i++) {
      if (i % 2 === 0) {
        // White move
        const moveNumber = Math.floor(i / 2) + 1;
        result += `${moveNumber}.${moves[i]}`;
      } else {
        // Black move
        result += ` ${moves[i]}`;
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

// ============================================================================
// LOGGING CONFIGURATION
// ============================================================================

let loggingEnabled = false;

/**
 * Enable or disable logging
 */
export function setLoggingEnabled(enabled: boolean): void {
  loggingEnabled = enabled;
}

/**
 * Get current logging state
 */
export function isLoggingEnabled(): boolean {
  return loggingEnabled;
}

/**
 * Logging utility function
 * @param args - Arguments to pass to console.log
 */
export function log(...args: unknown[]): void {
  if (loggingEnabled) {
    console.log(...args);
  }
}

/**
 * Error logging utility function
 * @param args - Arguments to pass to console.error
 */
export function logError(...args: unknown[]): void {
  if (loggingEnabled) {
    console.error(...args);
  }
}

// ============================================================================
// DOM ELEMENT HELPERS (to replace type casts)
// ============================================================================

/**
 * Safely get an HTML input element by ID
 */
export function getInputElement(id: string): HTMLInputElement | null {
  const element = document.getElementById(id);
  return element instanceof HTMLInputElement ? element : null;
}

/**
 * Safely get an HTML textarea element by ID
 */
export function getTextAreaElement(id: string): HTMLTextAreaElement | null {
  const element = document.getElementById(id);
  return element instanceof HTMLTextAreaElement ? element : null;
}

/**
 * Safely get an HTML button element by ID
 */
export function getButtonElement(id: string): HTMLButtonElement | null {
  const element = document.getElementById(id);
  return element instanceof HTMLButtonElement ? element : null;
}

/**
 * Safely get an HTML select element by ID
 */
export function getSelectElement(id: string): HTMLSelectElement | null {
  const element = document.getElementById(id);
  return element instanceof HTMLSelectElement ? element : null;
}

/**
 * Safely get a checked radio button by name and value
 */
export function getCheckedRadio(
  name: string,
  value: string,
): HTMLInputElement | null {
  const element = document.querySelector(
    `input[name="${name}"][value="${value}"]`,
  );
  return element instanceof HTMLInputElement ? element : null;
}

/**
 * Safely get all radio buttons by name
 */
export function getAllRadios(
  name: string,
): NodeListOf<HTMLInputElement> | null {
  const elements = document.querySelectorAll(`input[name="${name}"]`);
  return elements.length > 0
    ? (elements as NodeListOf<HTMLInputElement>)
    : null;
}

/**
 * Safely get a checked radio button by name
 */
export function getCheckedRadioByName(name: string): HTMLInputElement | null {
  const element = document.querySelector(`input[name="${name}"]:checked`);
  return element instanceof HTMLInputElement ? element : null;
}

/**
 * Safely get an element that matches a selector
 */
export function querySelector<T extends Element>(selector: string): T | null {
  const element = document.querySelector(selector);
  return element as T | null;
}

/**
 * Safely get all elements that match a selector
 */
export function querySelectorAll<T extends Element>(
  selector: string,
): NodeListOf<T> | null {
  const elements = document.querySelectorAll(selector);
  return elements.length > 0 ? (elements as NodeListOf<T>) : null;
}

/**
 * Safely get an element by ID with type checking
 */
export function getElementById<T extends Element>(id: string): T | null {
  const element = document.getElementById(id);
  return element as T | null;
}

/**
 * Check if an element is an HTMLElement
 */
export function isHTMLElement(
  element: EventTarget | null,
): element is HTMLElement {
  return element instanceof HTMLElement;
}

/**
 * Check if an element is an HTMLInputElement
 */
export function isHTMLInputElement(
  element: Element | null,
): element is HTMLInputElement {
  return element instanceof HTMLInputElement;
}

/**
 * Check if an element is an HTMLButtonElement
 */
export function isHTMLButtonElement(
  element: Element | null,
): element is HTMLButtonElement {
  return element instanceof HTMLButtonElement;
}

/**
 * Check if an element is an HTMLTextAreaElement
 */
export function isHTMLTextAreaElement(
  element: Element | null,
): element is HTMLTextAreaElement {
  return element instanceof HTMLTextAreaElement;
}

/**
 * Safely get an element by querySelector with type checking
 */
export function querySelectorElement<T extends Element>(
  parent: Element,
  selector: string,
): T | null {
  const element = parent.querySelector(selector);
  return element instanceof Element ? (element as T) : null;
}

/**
 * Safely get an HTMLElement by querySelector
 */
export function querySelectorHTMLElement(
  parent: Element,
  selector: string,
): HTMLElement | null {
  return querySelectorElement<HTMLElement>(parent, selector);
}

/**
 * Safely get an HTMLButtonElement by querySelector
 */
export function querySelectorButton(
  parent: Element,
  selector: string,
): HTMLButtonElement | null {
  return querySelectorElement<HTMLButtonElement>(parent, selector);
}

/**
 * Safely get an HTMLElement by querySelector
 */
export function querySelectorHTMLElementBySelector(
  selector: string,
): HTMLElement | null {
  const element = document.querySelector(selector);
  return element instanceof HTMLElement ? element : null;
}
