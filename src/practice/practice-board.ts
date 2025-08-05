import {
  parseFEN,
  squareToCoords,
  coordsToSquare,
} from "../utils/fen-utils.js";

// Unicode chess pieces
export const CHESS_PIECES: Record<string, string> = {
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

// Initialize the board
export function initializeBoard(boardGrid: HTMLElement): void {
  boardGrid.innerHTML = "";

  // Create squares in FEN order: rank 0 (top/black) to rank 7 (bottom/white)
  for (let rank = 0; rank < 8; rank++) {
    for (let file = 0; file < 8; file++) {
      const square = coordsToSquare(rank, file);
      const squareEl = document.createElement("div");
      squareEl.className = `practice-square ${(rank + file) % 2 === 0 ? "light" : "dark"}`;
      squareEl.dataset.square = square;
      boardGrid.appendChild(squareEl);
    }
  }
}

// Custom drag and drop state
interface DragState {
  element: HTMLElement | null;
  offset: { x: number; y: number };
  isDragging: boolean;
  currentDropTarget: string | null;
  originalPiece: HTMLElement | null;
  originalSquare: string | null;
}

let dragState: DragState = {
  element: null,
  offset: { x: 0, y: 0 },
  isDragging: false,
  currentDropTarget: null,
  originalPiece: null,
  originalSquare: null,
};

// Store references to event handlers for removal
let currentHandlers: {
  handleMouseDown: (event: MouseEvent) => void;
  handleTouchStart: (event: TouchEvent) => void;
  handleMouseMove: (event: MouseEvent) => void;
  handleTouchMove: (event: TouchEvent) => void;
  handleMouseUp: (event: MouseEvent) => void;
  handleTouchEnd: (event: TouchEvent) => void;
} | null = null;

// Add custom drag and drop event listeners to the board
export function addDragAndDropListeners(gameState: any, dom: any): void {
  const boardGrid = document.querySelector(
    ".practice-board-grid",
  ) as HTMLElement;

  // Remove any existing listeners first
  removeDragAndDropListeners();

  // Setup event listeners
  const setupEventListeners = (element: HTMLElement): void => {
    // Store handlers for later removal
    currentHandlers = {
      handleMouseDown,
      handleTouchStart,
      handleMouseMove,
      handleTouchMove,
      handleMouseUp,
      handleTouchEnd,
    };

    // Use event delegation - listen on the board container
    element.addEventListener("mousedown", handleMouseDown);
    element.addEventListener("touchstart", handleTouchStart, {
      passive: false,
    });

    // Global document listeners for drag operations
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("touchmove", handleTouchMove, { passive: false });
    document.addEventListener("mouseup", handleMouseUp);
    document.addEventListener("touchend", handleTouchEnd);
  };

  const handleMouseDown = (event: MouseEvent): void => {
    const target = event.target as HTMLElement;
    // Check if the target is a piece or a child of a piece
    const pieceElement = target.closest(".practice-piece");
    if (pieceElement) {
      startDrag(
        pieceElement as HTMLElement,
        event.clientX,
        event.clientY,
        gameState,
        dom,
      );
    }
  };

  const handleTouchStart = (event: TouchEvent): void => {
    event.preventDefault();
    const target = event.target as HTMLElement;
    // Check if the target is a piece or a child of a piece
    const pieceElement = target.closest(".practice-piece");
    if (pieceElement) {
      const touch = event.touches[0];
      startDrag(
        pieceElement as HTMLElement,
        touch.clientX,
        touch.clientY,
        gameState,
        dom,
      );
    }
  };

  const startDrag = (
    target: HTMLElement,
    clientX: number,
    clientY: number,
    gameState: any,
    dom: any,
  ): void => {
    const squareEl = target.closest(".practice-square") as HTMLElement;
    const square = squareEl?.dataset.square;
    if (!square) return;

    const piece = getPieceAtSquare(square, gameState.currentFEN);
    if (!piece) return;

    const isWhitePiece = piece === piece.toUpperCase();
    const isWhiteTurn = gameState.currentFEN.includes(" w ");

    // Only allow dragging if it's the human's piece and their turn
    if (
      !gameState.isPracticeActive ||
      !gameState.isHumanTurn ||
      isWhitePiece !== isWhiteTurn
    ) {
      return;
    }

    const rect = target.getBoundingClientRect();
    const offsetX = clientX - rect.left;
    const offsetY = clientY - rect.top;

    dragState = {
      element: target,
      offset: { x: offsetX, y: offsetY },
      isDragging: true,
      currentDropTarget: null,
      originalPiece: target,
      originalSquare: square,
    };

    // Create drag ghost
    const ghost = document.createElement("div");
    ghost.className = "drag-ghost";
    ghost.innerHTML = target.innerHTML;
    ghost.style.position = "fixed";
    ghost.style.pointerEvents = "none";
    ghost.style.zIndex = "1000";
    ghost.style.opacity = "0.8";
    ghost.style.transform = "translate(-50%, -50%)";
    ghost.style.left = `${clientX}px`;
    ghost.style.top = `${clientY}px`;

    document.body.appendChild(ghost);
    dragState.element = ghost;

    target.classList.add("dragging");
  };

  const handleMouseMove = (event: MouseEvent): void => {
    if (dragState.isDragging && dragState.element) {
      const ghost = dragState.element;
      ghost.style.left = `${event.clientX}px`;
      ghost.style.top = `${event.clientY}px`;
      updateDropTarget(event.clientX, event.clientY);
    }
  };

  const handleTouchMove = (event: TouchEvent): void => {
    event.preventDefault();
    if (dragState.isDragging && dragState.element) {
      const touch = event.touches[0];
      const ghost = dragState.element;
      ghost.style.left = `${touch.clientX}px`;
      ghost.style.top = `${touch.clientY}px`;
      updateDropTarget(touch.clientX, touch.clientY);
    }
  };

  const handleMouseUp = (event: MouseEvent): void => {
    if (dragState.isDragging) {
      endDrag(event.clientX, event.clientY, gameState, dom);
    }
  };

  const handleTouchEnd = (event: TouchEvent): void => {
    if (dragState.isDragging) {
      const touch = event.changedTouches[0];
      endDrag(touch.clientX, touch.clientY, gameState, dom);
    }
  };

  const updateDropTarget = (clientX: number, clientY: number): void => {
    const square = findSquareAtPosition(clientX, clientY);
    if (square !== dragState.currentDropTarget) {
      // Remove highlight from previous target
      if (dragState.currentDropTarget) {
        const prevSquare = document.querySelector(
          `[data-square="${dragState.currentDropTarget}"]`,
        ) as HTMLElement;
        if (prevSquare) {
          prevSquare.classList.remove("drag-over");
        }
      }

      // Add highlight to new target
      if (square) {
        const squareEl = document.querySelector(
          `[data-square="${square}"]`,
        ) as HTMLElement;
        if (squareEl) {
          squareEl.classList.add("drag-over");
        }
      }

      dragState.currentDropTarget = square;
    }
  };

  const findSquareAtPosition = (
    clientX: number,
    clientY: number,
  ): string | null => {
    const boardRect = boardGrid.getBoundingClientRect();
    const x = clientX - boardRect.left;
    const y = clientY - boardRect.top;

    if (x < 0 || x >= boardRect.width || y < 0 || y >= boardRect.height) {
      return null;
    }

    const squareSize = boardRect.width / 8;
    const file = Math.floor(x / squareSize);
    const rank = Math.floor(y / squareSize);

    if (file >= 0 && file < 8 && rank >= 0 && rank < 8) {
      return coordsToSquare(rank, file);
    }

    return null;
  };

  const endDrag = (
    clientX: number,
    clientY: number,
    gameState: any,
    dom: any,
  ): void => {
    if (!dragState.isDragging || !dragState.originalSquare) return;

    const targetSquare = findSquareAtPosition(clientX, clientY);

    // Remove drag ghost
    if (dragState.element) {
      document.body.removeChild(dragState.element);
    }

    // Remove highlights
    document.querySelectorAll(".practice-square.drag-over").forEach((el) => {
      el.classList.remove("drag-over");
    });

    if (dragState.originalPiece) {
      dragState.originalPiece.classList.remove("dragging");
    }

    // Process the move
    if (targetSquare && targetSquare !== dragState.originalSquare) {
      console.log(
        "Custom drag drop from",
        dragState.originalSquare,
        "to",
        targetSquare,
      );

      // Check if the move is valid
      const fromPiece = getPieceAtSquare(
        dragState.originalSquare,
        gameState.currentFEN,
      );
      const toPiece = getPieceAtSquare(targetSquare, gameState.currentFEN);

      if (fromPiece) {
        const isWhiteFromPiece = fromPiece === fromPiece.toUpperCase();
        const isWhiteTurn = gameState.currentFEN.includes(" w ");

        if (
          gameState.isPracticeActive &&
          gameState.isHumanTurn &&
          isWhiteFromPiece === isWhiteTurn
        ) {
          const isValidTarget =
            !toPiece ||
            isWhiteFromPiece !== (toPiece === toPiece.toUpperCase());

          if (isValidTarget) {
            // First, move the piece visually on the board
            const fromSquareEl = document.querySelector(
              `[data-square="${dragState.originalSquare}"]`,
            ) as HTMLElement;
            const toSquareEl = document.querySelector(
              `[data-square="${targetSquare}"]`,
            ) as HTMLElement;

            if (fromSquareEl && toSquareEl) {
              // Move the piece element
              const pieceElement =
                fromSquareEl.querySelector(".practice-piece");
              if (pieceElement) {
                toSquareEl.innerHTML = pieceElement.outerHTML;
                fromSquareEl.innerHTML = "";
              }
            }

            // Then call the move handler for game logic validation
            const moveHandler = (window as any).handleSquareClick;
            if (moveHandler) {
              moveHandler(dragState.originalSquare, gameState, dom);
              moveHandler(targetSquare, gameState, dom);
            }
          }
        }
      }
    }

    // Reset drag state
    dragState = {
      element: null,
      offset: { x: 0, y: 0 },
      isDragging: false,
      currentDropTarget: null,
      originalPiece: null,
      originalSquare: null,
    };
  };

  setupEventListeners(boardGrid);
  console.log("Custom drag and drop listeners added");
}

// Remove drag and drop event listeners
export function removeDragAndDropListeners(): void {
  const boardGrid = document.querySelector(
    ".practice-board-grid",
  ) as HTMLElement;
  if (!boardGrid || !currentHandlers) return;

  // Remove board listeners
  boardGrid.removeEventListener("mousedown", currentHandlers.handleMouseDown);
  boardGrid.removeEventListener("touchstart", currentHandlers.handleTouchStart);

  // Remove document listeners
  document.removeEventListener("mousemove", currentHandlers.handleMouseMove);
  document.removeEventListener("touchmove", currentHandlers.handleTouchMove);
  document.removeEventListener("mouseup", currentHandlers.handleMouseUp);
  document.removeEventListener("touchend", currentHandlers.handleTouchEnd);

  currentHandlers = null;
}

// Re-add drag and drop listeners after board render
export function reAddDragAndDropListeners(gameState: any, dom: any): void {
  // With event delegation, we only need to add listeners once to the board container
  // The listeners will automatically work with any new pieces rendered
  addDragAndDropListeners(gameState, dom);
}

// Render the board based on FEN
export function renderBoard(fen: string): void {
  const position = parseFEN(fen);

  // FEN ranks: 0=top (rank 8), 7=bottom (rank 1)
  // Board squares: 0=top, 7=bottom (same as FEN)
  for (let rank = 0; rank < 8; rank++) {
    for (let file = 0; file < 8; file++) {
      const square = coordsToSquare(rank, file);
      const squareEl = document.querySelector(
        `[data-square="${square}"]`,
      ) as HTMLElement;
      const piece = position.board[rank][file];

      if (piece) {
        squareEl.innerHTML = `<span class="practice-piece">${CHESS_PIECES[piece]}</span>`;
      } else {
        squareEl.innerHTML = "";
      }
    }
  }
}

// Get piece at square
export function getPieceAtSquare(square: string, fen: string): string {
  const position = parseFEN(fen);
  const [rank, file] = squareToCoords(square);
  return position.board[rank][file];
}

// Clear board selection
export function clearBoardSelection(): void {
  // Clear selected square
  const selectedEl = document.querySelector(
    ".practice-square.selected",
  ) as HTMLElement;
  if (selectedEl) {
    selectedEl.classList.remove("selected");
  }

  // Clear valid move highlights
  document.querySelectorAll(".practice-square.valid-move").forEach((el) => {
    el.classList.remove("valid-move");
  });
}

// Select a square on the board
export function selectSquare(square: string, fen: string): void {
  clearBoardSelection();

  const squareEl = document.querySelector(
    `[data-square="${square}"]`,
  ) as HTMLElement;
  const piece = getPieceAtSquare(square, fen);

  if (!piece) return;

  // Check if it's the human's piece
  const isWhitePiece = piece === piece.toUpperCase();
  const isWhiteTurn = fen.includes(" w ");

  if (isWhitePiece !== isWhiteTurn) return;

  squareEl.classList.add("selected");

  // Don't highlight valid moves since move generation is too simplified
  // const validMoves = findValidMoves(square, piece, fen);
  // validMoves.forEach(moveSquare => {
  //     const moveEl = document.querySelector(`[data-square="${moveSquare}"]`) as HTMLElement;
  //     moveEl.classList.add('valid-move');
  // });
}

// Find valid moves for a piece (simplified)
function findValidMoves(square: string, piece: string, fen: string): string[] {
  const position = parseFEN(fen);
  const [rank, file] = squareToCoords(square);
  const moves: string[] = [];

  // Simple move generation (this is a simplified version)
  // In a real implementation, you'd want more sophisticated move generation

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
    // Other pieces - simplified
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

// Show hint by highlighting a piece
export function showHint(square: string): void {
  const squareEl = document.querySelector(
    `[data-square="${square}"]`,
  ) as HTMLElement;
  squareEl.classList.add("hint");

  setTimeout(() => {
    squareEl.classList.remove("hint");
  }, 2000);
}
