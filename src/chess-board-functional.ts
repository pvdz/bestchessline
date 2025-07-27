import { ChessPosition, ChessMove } from './types.js';
import { parseFEN, toFEN, squareToCoords, coordsToSquare } from './utils.js';

// ============================================================================
// BOARD STATE MANAGEMENT
// ============================================================================

/**
 * Board state interface
 */
interface BoardState {
  position: ChessPosition;
  selectedSquare: string | null;
  draggedPiece: string | null;
  legalMoves: string[];
  onPositionChange?: (position: ChessPosition) => void;
  onMoveMade?: (move: ChessMove) => void;
}

/**
 * Board state instance
 */
let boardState: BoardState = {
  position: parseFEN('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'),
  selectedSquare: null,
  draggedPiece: null,
  legalMoves: []
};

/**
 * Drag state
 */
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
  originalSquare: null
};

/**
 * Arrow state for move visualization
 */
let arrowElement: HTMLElement | null = null;

// ============================================================================
// STATE UPDATE FUNCTIONS
// ============================================================================

/**
 * Update board state
 */
const updateBoardState = (updates: Partial<BoardState>): void => {
  boardState = { ...boardState, ...updates };
};

/**
 * Update drag state
 */
const updateDragState = (updates: Partial<DragState>): void => {
  dragState = { ...dragState, ...updates };
};

/**
 * Get current board state
 */
const getBoardState = (): BoardState => ({ ...boardState });

// ============================================================================
// BOARD RENDERING
// ============================================================================

/**
 * Initialize chess board
 */
const initializeBoard = (element: HTMLElement, initialFEN?: string): void => {
  const fen = initialFEN || 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
  updateBoardState({
    position: parseFEN(fen),
    selectedSquare: null,
    draggedPiece: null,
    legalMoves: []
  });
  
  renderBoard(element);
  setupEventListeners(element);
};

/**
 * Render the chess board
 */
const renderBoard = (element: HTMLElement): void => {
  element.innerHTML = '';
  element.className = 'chess-board';

  // Create board container
  const boardContainer = document.createElement('div');
  boardContainer.className = 'board-container';

  // Create board grid
  const board = document.createElement('div');
  board.className = 'board';

  // Create squares
  for (let rank = 0; rank < 8; rank++) {
    for (let file = 0; file < 8; file++) {
      const square = document.createElement('div');
      const squareName = coordsToSquare(rank, file);
      const isLight = (rank + file) % 2 === 0;
      
      square.className = `square ${isLight ? 'light' : 'dark'}`;
      square.dataset.square = squareName;
      
      // Add rank/file labels
      if (file === 0) {
        const rankLabel = document.createElement('div');
        rankLabel.className = 'rank-label';
        rankLabel.textContent = (8 - rank).toString();
        square.appendChild(rankLabel);
      }
      
      if (rank === 7) {
        const fileLabel = document.createElement('div');
        fileLabel.className = 'file-label';
        fileLabel.textContent = String.fromCharCode('a'.charCodeAt(0) + file);
        square.appendChild(fileLabel);
      }

      // Add piece if present
      const piece = boardState.position.board[rank][file];
      if (piece) {
        const pieceElement = createPieceElement(piece, squareName);
        square.appendChild(pieceElement);
      }

      // Highlight selected square
      if (boardState.selectedSquare === squareName) {
        square.classList.add('selected');
      }

      // Highlight legal moves
      if (boardState.legalMoves.includes(squareName)) {
        square.classList.add('legal-move');
      }

      board.appendChild(square);
    }
  }

  boardContainer.appendChild(board);
  element.appendChild(boardContainer);
};

/**
 * Create piece element
 */
const createPieceElement = (piece: string, square: string): HTMLElement => {
  const pieceElement = document.createElement('div');
  pieceElement.className = 'piece';
  pieceElement.dataset.piece = piece;
  pieceElement.dataset.square = square;
  
  const color = piece === piece.toUpperCase() ? 'w' : 'b';
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
    'K': '♔', 'Q': '♕', 'R': '♖', 'B': '♗', 'N': '♘', 'P': '♙',
    'k': '♚', 'q': '♛', 'r': '♜', 'b': '♝', 'n': '♞', 'p': '♟'
  };
  
  const key = color === 'w' ? type : type.toLowerCase();
  return symbols[key] || '';
};

// ============================================================================
// EVENT HANDLERS
// ============================================================================

/**
 * Setup event listeners
 */
const setupEventListeners = (element: HTMLElement): void => {
  // Use event delegation - listen on the board container
  element.addEventListener('mousedown', handleMouseDown);
  element.addEventListener('touchstart', handleTouchStart, { passive: false });
  
  // Global document listeners for drag operations
  document.addEventListener('mousemove', handleMouseMove);
  document.addEventListener('touchmove', handleTouchMove, { passive: false });
  document.addEventListener('mouseup', handleMouseUp);
  document.addEventListener('touchend', handleTouchEnd);
};

/**
 * Handle mouse down event
 */
const handleMouseDown = (event: MouseEvent): void => {
  const target = event.target as HTMLElement;
  // Check if the target is a piece or a child of a piece
  const pieceElement = target.closest('.piece');
  if (pieceElement) {
    startDrag(pieceElement as HTMLElement, event.clientX, event.clientY);
  }
};

/**
 * Handle touch start event
 */
const handleTouchStart = (event: TouchEvent): void => {
  event.preventDefault();
  const target = event.target as HTMLElement;
  // Check if the target is a piece or a child of a piece
  const pieceElement = target.closest('.piece');
  if (pieceElement) {
    const touch = event.touches[0];
    startDrag(pieceElement as HTMLElement, touch.clientX, touch.clientY);
  }
};

/**
 * Start drag operation
 */
const startDrag = (target: HTMLElement, clientX: number, clientY: number): void => {
  const rect = target.getBoundingClientRect();
  const offsetX = clientX - rect.left;
  const offsetY = clientY - rect.top;
  
  updateDragState({
    element: target,
    offset: { x: offsetX, y: offsetY },
    isDragging: true,
    currentDropTarget: null,
    originalPiece: target,
    originalSquare: target.dataset.square || null
  });
  
  // Create drag ghost
  const ghost = document.createElement('div');
  ghost.className = 'drag-ghost';
  ghost.innerHTML = target.innerHTML;
  ghost.style.position = 'fixed';
  ghost.style.pointerEvents = 'none';
  ghost.style.zIndex = '1000';
  ghost.style.opacity = '0.8';
  ghost.style.transform = 'translate(-50%, -50%)';
  ghost.style.left = `${clientX}px`;
  ghost.style.top = `${clientY}px`;
  
  document.body.appendChild(ghost);
  updateDragState({ element: ghost });
  
  target.classList.add('dragging');
};

/**
 * Handle mouse move event
 */
const handleMouseMove = (event: MouseEvent): void => {
  if (dragState.isDragging && dragState.element) {
    const ghost = dragState.element;
    ghost.style.left = `${event.clientX}px`;
    ghost.style.top = `${event.clientY}px`;
    updateDropTarget(event.clientX, event.clientY);
  }
};

/**
 * Handle touch move event
 */
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

/**
 * Handle mouse up event
 */
const handleMouseUp = (event: MouseEvent): void => {
  endDrag(event.clientX, event.clientY);
};

/**
 * Handle touch end event
 */
const handleTouchEnd = (event: TouchEvent): void => {
  event.preventDefault();
  const touch = event.changedTouches[0];
  endDrag(touch.clientX, touch.clientY);
};

/**
 * End drag operation
 */
const endDrag = (clientX: number, clientY: number): void => {
  if (!dragState.isDragging) return;
  
  const fromSquare = dragState.originalSquare;
  const toSquare = findSquareAtPosition(clientX, clientY);
  
  if (fromSquare && toSquare && fromSquare !== toSquare) {
    const piece = dragState.originalPiece?.dataset.piece;
    if (piece) {
      makeMove(fromSquare, toSquare, piece);
    }
  }
  
  // Clean up
  if (dragState.element) {
    dragState.element.remove();
  }
  
  if (dragState.originalPiece) {
    dragState.originalPiece.classList.remove('dragging');
  }
  
  updateDragState({
    element: null,
    isDragging: false,
    currentDropTarget: null,
    originalPiece: null,
    originalSquare: null
  });
};

/**
 * Update drop target during drag
 */
const updateDropTarget = (clientX: number, clientY: number): void => {
  const square = findSquareAtPosition(clientX, clientY);
  
  // Remove previous drop target highlight
  if (dragState.currentDropTarget) {
    const prevSquare = document.querySelector(`[data-square="${dragState.currentDropTarget}"]`);
    if (prevSquare) {
      prevSquare.classList.remove('dragover');
    }
  }
  
  // Add new drop target highlight
  if (square && square !== dragState.currentDropTarget) {
    const squareElement = document.querySelector(`[data-square="${square}"]`);
    if (squareElement) {
      squareElement.classList.add('dragover');
    }
    updateDragState({ currentDropTarget: square });
  }
};

/**
 * Find square at mouse position
 */
const findSquareAtPosition = (clientX: number, clientY: number): string | null => {
  const boardElement = document.querySelector('.board');
  if (!boardElement) return null;
  
  const rect = boardElement.getBoundingClientRect();
  const x = clientX - rect.left;
  const y = clientY - rect.top;
  
  const squareSize = rect.width / 8;
  const file = Math.floor(x / squareSize);
  const rank = Math.floor(y / squareSize);
  
  if (file >= 0 && file < 8 && rank >= 0 && rank < 8) {
    return coordsToSquare(rank, file);
  }
  
  return null;
};

/**
 * Make a move on the board
 */
const makeMove = (from: string, to: string, piece: string): void => {
  // Update board state
  const newPosition = applyMoveToPosition(boardState.position, from, to, piece);
  updateBoardState({ position: newPosition });
  
  // Re-render board
  const boardElement = document.querySelector('#chess-board') as HTMLElement;
  if (boardElement) {
    renderBoard(boardElement);
    // Re-setup event listeners after re-rendering
    setupEventListeners(boardElement);
  }
  
  // Notify callbacks
  if (boardState.onMoveMade) {
    boardState.onMoveMade({ from, to, piece });
  }
  if (boardState.onPositionChange) {
    boardState.onPositionChange(newPosition);
  }
};

/**
 * Apply move to position
 */
const applyMoveToPosition = (position: ChessPosition, from: string, to: string, piece: string): ChessPosition => {
  const [fromRank, fromFile] = squareToCoords(from);
  const [toRank, toFile] = squareToCoords(to);
  
  const newBoard = position.board.map(row => [...row]);
  newBoard[toRank][toFile] = newBoard[fromRank][fromFile];
  newBoard[fromRank][fromFile] = '';
  
  return {
    ...position,
    board: newBoard,
    turn: position.turn === 'w' ? 'b' : 'w'
  };
};

// ============================================================================
// PUBLIC API
// ============================================================================

/**
 * Set board position
 */
const setPosition = (fen: string): void => {
  updateBoardState({ position: parseFEN(fen) });
  const boardElement = document.querySelector('#chess-board') as HTMLElement;
  if (boardElement) {
    renderBoard(boardElement);
    // Re-setup event listeners after re-rendering
    setupEventListeners(boardElement);
  }
};

/**
 * Get current position
 */
const getPosition = (): ChessPosition => boardState.position;

/**
 * Get current FEN
 */
const getFEN = (): string => toFEN(boardState.position);

/**
 * Set position change callback
 */
const setOnPositionChange = (callback: (position: ChessPosition) => void): void => {
  updateBoardState({ onPositionChange: callback });
};

/**
 * Set move made callback
 */
const setOnMoveMade = (callback: (move: ChessMove) => void): void => {
  updateBoardState({ onMoveMade: callback });
};

/**
 * Show move arrow
 */
const showMoveArrow = (from: string, to: string, piece: string): void => {
  hideMoveArrow();
  
  const arrow = document.createElement('div');
  arrow.className = 'move-arrow';
  arrow.innerHTML = '→';
  
  positionArrow(arrow, from, to);
  
  const boardElement = document.querySelector('#chess-board') as HTMLElement;
  if (boardElement) {
    boardElement.appendChild(arrow);
  }
  
  arrowElement = arrow;
};

/**
 * Hide move arrow
 */
const hideMoveArrow = (): void => {
  if (arrowElement) {
    arrowElement.remove();
    arrowElement = null;
  }
};

/**
 * Clear last move highlight
 */
const clearLastMoveHighlight = (): void => {
  const highlightedSquares = document.querySelectorAll('.last-move-from, .last-move-to');
  highlightedSquares.forEach(square => {
    square.classList.remove('last-move-from', 'last-move-to');
  });
};

/**
 * Position arrow between squares
 */
const positionArrow = (arrow: HTMLElement, from: string, to: string): void => {
  const fromElement = document.querySelector(`[data-square="${from}"]`);
  const toElement = document.querySelector(`[data-square="${to}"]`);
  
  if (!fromElement || !toElement) return;
  
  const fromRect = fromElement.getBoundingClientRect();
  const toRect = toElement.getBoundingClientRect();
  
  const fromCenter = {
    x: fromRect.left + fromRect.width / 2,
    y: fromRect.top + fromRect.height / 2
  };
  
  const toCenter = {
    x: toRect.left + toRect.width / 2,
    y: toRect.top + toRect.height / 2
  };
  
  const angle = Math.atan2(toCenter.y - fromCenter.y, toCenter.x - fromCenter.x);
  const distance = Math.sqrt(
    Math.pow(toCenter.x - fromCenter.x, 2) + Math.pow(toCenter.y - fromCenter.y, 2)
  );
  
  arrow.style.position = 'absolute';
  arrow.style.left = `${fromCenter.x}px`;
  arrow.style.top = `${fromCenter.y}px`;
  arrow.style.width = `${distance}px`;
  arrow.style.transform = `rotate(${angle}rad)`;
  arrow.style.transformOrigin = '0 50%';
};

/**
 * Destroy board
 */
const destroy = (): void => {
  hideMoveArrow();
  clearLastMoveHighlight();
  
  // Remove event listeners
  const boardElement = document.querySelector('#chess-board') as HTMLElement;
  if (boardElement) {
    boardElement.removeEventListener('mousedown', handleMouseDown as EventListener);
    boardElement.removeEventListener('touchstart', handleTouchStart as EventListener);
  }
  
  document.removeEventListener('mousemove', handleMouseMove as EventListener);
  document.removeEventListener('touchmove', handleTouchMove as EventListener);
  document.removeEventListener('mouseup', handleMouseUp as EventListener);
  document.removeEventListener('touchend', handleTouchEnd as EventListener);
};

// ============================================================================
// EXPORT FUNCTIONS
// ============================================================================

export {
  // Initialization
  initializeBoard,
  
  // State management
  getBoardState,
  updateBoardState,
  
  // Rendering
  renderBoard,
  
  // Public API
  setPosition,
  getPosition,
  getFEN,
  setOnPositionChange,
  setOnMoveMade,
  showMoveArrow,
  hideMoveArrow,
  clearLastMoveHighlight,
  destroy
}; 