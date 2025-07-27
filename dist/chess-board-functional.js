import { parseFEN, toFEN, squareToCoords, coordsToSquare } from './utils.js';
/**
 * Board state instance
 */
let boardState = {
    position: parseFEN('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'),
    selectedSquare: null,
    draggedPiece: null,
    legalMoves: []
};
let dragState = {
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
let arrowElement = null;
// ============================================================================
// STATE UPDATE FUNCTIONS
// ============================================================================
/**
 * Update board state
 */
const updateBoardState = (updates) => {
    boardState = { ...boardState, ...updates };
};
/**
 * Update drag state
 */
const updateDragState = (updates) => {
    dragState = { ...dragState, ...updates };
};
/**
 * Get current board state
 */
const getBoardState = () => ({ ...boardState });
// ============================================================================
// BOARD RENDERING
// ============================================================================
/**
 * Initialize chess board
 */
const initializeBoard = (element, initialFEN) => {
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
const renderBoard = (element) => {
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
const createPieceElement = (piece, square) => {
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
const getPieceSymbol = (type, color) => {
    const symbols = {
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
const setupEventListeners = (element) => {
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
const handleMouseDown = (event) => {
    const target = event.target;
    // Check if the target is a piece or a child of a piece
    const pieceElement = target.closest('.piece');
    if (pieceElement) {
        startDrag(pieceElement, event.clientX, event.clientY);
    }
};
/**
 * Handle touch start event
 */
const handleTouchStart = (event) => {
    event.preventDefault();
    const target = event.target;
    // Check if the target is a piece or a child of a piece
    const pieceElement = target.closest('.piece');
    if (pieceElement) {
        const touch = event.touches[0];
        startDrag(pieceElement, touch.clientX, touch.clientY);
    }
};
/**
 * Start drag operation
 */
const startDrag = (target, clientX, clientY) => {
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
const handleMouseMove = (event) => {
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
const handleTouchMove = (event) => {
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
const handleMouseUp = (event) => {
    endDrag(event.clientX, event.clientY);
};
/**
 * Handle touch end event
 */
const handleTouchEnd = (event) => {
    event.preventDefault();
    const touch = event.changedTouches[0];
    endDrag(touch.clientX, touch.clientY);
};
/**
 * End drag operation
 */
const endDrag = (clientX, clientY) => {
    if (!dragState.isDragging)
        return;
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
const updateDropTarget = (clientX, clientY) => {
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
const findSquareAtPosition = (clientX, clientY) => {
    const boardElement = document.querySelector('.board');
    if (!boardElement)
        return null;
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
const makeMove = (from, to, piece) => {
    // Update board state
    const newPosition = applyMoveToPosition(boardState.position, from, to, piece);
    updateBoardState({ position: newPosition });
    // Re-render board
    const boardElement = document.querySelector('#chess-board');
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
const applyMoveToPosition = (position, from, to, piece) => {
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
const setPosition = (fen) => {
    updateBoardState({ position: parseFEN(fen) });
    const boardElement = document.querySelector('#chess-board');
    if (boardElement) {
        renderBoard(boardElement);
        // Re-setup event listeners after re-rendering
        setupEventListeners(boardElement);
    }
};
/**
 * Get current position
 */
const getPosition = () => boardState.position;
/**
 * Get current FEN
 */
const getFEN = () => toFEN(boardState.position);
/**
 * Set position change callback
 */
const setOnPositionChange = (callback) => {
    updateBoardState({ onPositionChange: callback });
};
/**
 * Set move made callback
 */
const setOnMoveMade = (callback) => {
    updateBoardState({ onMoveMade: callback });
};
/**
 * Show move arrow
 */
const showMoveArrow = (from, to, piece) => {
    hideMoveArrow();
    const arrow = document.createElement('div');
    arrow.className = 'move-arrow';
    arrow.innerHTML = '→';
    positionArrow(arrow, from, to);
    const boardElement = document.querySelector('#chess-board');
    if (boardElement) {
        boardElement.appendChild(arrow);
    }
    arrowElement = arrow;
};
/**
 * Hide move arrow
 */
const hideMoveArrow = () => {
    if (arrowElement) {
        arrowElement.remove();
        arrowElement = null;
    }
};
/**
 * Clear last move highlight
 */
const clearLastMoveHighlight = () => {
    const highlightedSquares = document.querySelectorAll('.last-move-from, .last-move-to');
    highlightedSquares.forEach(square => {
        square.classList.remove('last-move-from', 'last-move-to');
    });
};
/**
 * Position arrow between squares
 */
const positionArrow = (arrow, from, to) => {
    const fromElement = document.querySelector(`[data-square="${from}"]`);
    const toElement = document.querySelector(`[data-square="${to}"]`);
    if (!fromElement || !toElement)
        return;
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
    const distance = Math.sqrt(Math.pow(toCenter.x - fromCenter.x, 2) + Math.pow(toCenter.y - fromCenter.y, 2));
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
const destroy = () => {
    hideMoveArrow();
    clearLastMoveHighlight();
    // Remove event listeners
    const boardElement = document.querySelector('#chess-board');
    if (boardElement) {
        boardElement.removeEventListener('mousedown', handleMouseDown);
        boardElement.removeEventListener('touchstart', handleTouchStart);
    }
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('touchmove', handleTouchMove);
    document.removeEventListener('mouseup', handleMouseUp);
    document.removeEventListener('touchend', handleTouchEnd);
};
// ============================================================================
// EXPORT FUNCTIONS
// ============================================================================
export { 
// Initialization
initializeBoard, 
// State management
getBoardState, updateBoardState, 
// Rendering
renderBoard, 
// Public API
setPosition, getPosition, getFEN, setOnPositionChange, setOnMoveMade, showMoveArrow, hideMoveArrow, clearLastMoveHighlight, destroy };
//# sourceMappingURL=chess-board-functional.js.map