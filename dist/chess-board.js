import { getPieceTypeFromNotation, getColorFromNotation, createPieceNotation, } from "./types.js";
import { parseFEN, toFEN, squareToCoords, coordsToSquare, getPieceSymbol, } from "./utils.js";
import { PIECE_TYPES } from "./move-validator.js";
/**
 * Board state instance
 */
let boardState = {
    position: parseFEN("rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"),
    selectedSquare: null,
    draggedPiece: null,
    legalMoves: [],
};
let dragState = {
    element: null,
    offset: { x: 0, y: 0 },
    isDragging: false,
    currentDropTarget: null,
    originalPiece: null,
    originalSquare: null,
};
/**
 * Arrow state for move visualization
 */
let arrowElements = new Map();
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
    const fen = initialFEN || "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
    updateBoardState({
        position: parseFEN(fen),
        selectedSquare: null,
        draggedPiece: null,
        legalMoves: [],
    });
    renderBoard(element);
    setupEventListeners(element);
};
/**
 * Render the chess board
 */
const renderBoard = (element) => {
    element.innerHTML = "";
    element.className = "chess-board";
    // Create board container
    const boardContainer = document.createElement("div");
    boardContainer.className = "board-container";
    // Create board grid
    const board = document.createElement("div");
    board.className = "board";
    // Create squares
    for (let rank = 0; rank < 8; rank++) {
        for (let file = 0; file < 8; file++) {
            const square = document.createElement("div");
            const squareName = coordsToSquare(rank, file);
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
            const piece = boardState.position.board[rank][file];
            if (piece) {
                const pieceElement = createPieceElement(piece, squareName);
                square.appendChild(pieceElement);
            }
            // Highlight selected square
            if (boardState.selectedSquare === squareName) {
                square.classList.add("selected");
            }
            // Highlight legal moves
            if (boardState.legalMoves.includes(squareName)) {
                square.classList.add("legal-move");
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
    const pieceElement = document.createElement("div");
    pieceElement.className = "piece";
    pieceElement.dataset.square = square;
    const pieceNotation = createPieceNotation(piece);
    const type = getPieceTypeFromNotation(pieceNotation);
    const color = getColorFromNotation(pieceNotation);
    pieceElement.classList.add(color, type.toLowerCase());
    pieceElement.innerHTML = getPieceSymbol(type, color);
    return pieceElement;
};
// ============================================================================
// EVENT HANDLERS
// ============================================================================
/**
 * Setup event listeners
 */
const setupEventListeners = (element) => {
    // Use event delegation - listen on the board container
    element.addEventListener("mousedown", handleMouseDown);
    element.addEventListener("touchstart", handleTouchStart, { passive: false });
    // Global document listeners for drag operations
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("touchmove", handleTouchMove, { passive: false });
    document.addEventListener("mouseup", handleMouseUp);
    document.addEventListener("touchend", handleTouchEnd);
};
/**
 * Handle mouse down event
 */
const handleMouseDown = (event) => {
    const target = event.target;
    // Check if the target is a piece or a child of a piece
    const pieceElement = target.closest(".piece");
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
    const pieceElement = target.closest(".piece");
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
        originalSquare: target.dataset.square || null,
    });
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
    updateDragState({ element: ghost });
    target.classList.add("dragging");
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
        dragState.originalPiece.classList.remove("dragging");
    }
    updateDragState({
        element: null,
        isDragging: false,
        currentDropTarget: null,
        originalPiece: null,
        originalSquare: null,
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
            prevSquare.classList.remove("dragover");
        }
    }
    // Add new drop target highlight
    if (square && square !== dragState.currentDropTarget) {
        const squareElement = document.querySelector(`[data-square="${square}"]`);
        if (squareElement) {
            squareElement.classList.add("dragover");
        }
        updateDragState({ currentDropTarget: square });
    }
};
/**
 * Find square at mouse position
 */
const findSquareAtPosition = (clientX, clientY) => {
    const boardElement = document.querySelector(".board");
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
    // Clear any existing arrows and labels before re-rendering
    hideMoveArrow();
    // Update board state
    const newPosition = applyMoveToPosition(boardState.position, from, to, piece);
    updateBoardState({ position: newPosition });
    // Re-render board
    const boardElement = document.querySelector("#chess-board");
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
    const pieceNotation = createPieceNotation(piece);
    // Create a move object for proper FEN application
    const move = {
        from,
        to,
        piece: pieceNotation,
    };
    // Apply the move using the same logic as applyMoveToFEN
    const [fromRank, fromFile] = squareToCoords(from);
    const [toRank, toFile] = squareToCoords(to);
    // Create new board
    const newBoard = position.board.map((row) => [...row]);
    newBoard[toRank][toFile] = newBoard[fromRank][fromFile];
    newBoard[fromRank][fromFile] = "";
    // Handle special moves
    if (move.special === "castling") {
        if (move.rookFrom && move.rookTo) {
            const [rookFromRank, rookFromFile] = squareToCoords(move.rookFrom);
            const [rookToRank, rookToFile] = squareToCoords(move.rookTo);
            newBoard[rookToRank][rookToFile] = newBoard[rookFromRank][rookFromFile];
            newBoard[rookFromRank][rookFromFile] = "";
        }
    }
    // Update castling rights
    let newCastling = position.castling;
    // Remove castling rights when king moves
    if (getPieceTypeFromNotation(pieceNotation) === PIECE_TYPES.KING) {
        if (getColorFromNotation(pieceNotation) === "w") {
            // White king moved
            newCastling = newCastling.replace(/[KQ]/g, "");
        }
        else {
            // Black king moved
            newCastling = newCastling.replace(/[kq]/g, "");
        }
    }
    // Remove castling rights when rooks move
    if (getPieceTypeFromNotation(pieceNotation) === PIECE_TYPES.ROOK) {
        if (from === "a1")
            newCastling = newCastling.replace("Q", "");
        if (from === "h1")
            newCastling = newCastling.replace("K", "");
        if (from === "a8")
            newCastling = newCastling.replace("q", "");
        if (from === "h8")
            newCastling = newCastling.replace("k", "");
    }
    // Update en passant
    let newEnPassant = null;
    if (getPieceTypeFromNotation(pieceNotation) === PIECE_TYPES.PAWN) {
        // Check if it's a double pawn move
        if (Math.abs(fromRank - toRank) === 2) {
            const enPassantRank = fromRank + (toRank > fromRank ? 1 : -1);
            newEnPassant = coordsToSquare(enPassantRank, fromFile);
        }
    }
    else {
        // Clear en passant for non-pawn moves
        newEnPassant = null;
    }
    return {
        ...position,
        board: newBoard,
        turn: position.turn === "w" ? "b" : "w",
        castling: newCastling || "-",
        enPassant: newEnPassant,
    };
};
// ============================================================================
// PUBLIC API
// ============================================================================
/**
 * Set board position
 */
const setPosition = (fen) => {
    const newPosition = parseFEN(fen);
    const currentPosition = boardState.position;
    // Only clear arrows and re-render if the position has actually changed
    const positionChanged = newPosition.board !== currentPosition.board ||
        newPosition.turn !== currentPosition.turn ||
        newPosition.castling !== currentPosition.castling ||
        newPosition.enPassant !== currentPosition.enPassant;
    if (positionChanged) {
        // Clear any existing arrows and labels before re-rendering
        hideMoveArrow();
        updateBoardState({ position: newPosition });
        const boardElement = document.querySelector("#chess-board");
        if (boardElement) {
            renderBoard(boardElement);
            // Re-setup event listeners after re-rendering
            setupEventListeners(boardElement);
        }
    }
    else {
        // Just update the state without re-rendering
        updateBoardState({ position: newPosition });
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
const showMoveArrow = (from, to, piece, score, allMoves, index, customArrowId) => {
    const pieceNotation = createPieceNotation(piece);
    // Use custom arrow ID if provided, otherwise create a unique identifier for this arrow based on the move
    const arrowId = customArrowId || `${getPieceTypeFromNotation(pieceNotation)}-${from}-${to}`;
    // Remove existing arrow for this ID if it exists
    hideMoveArrow(arrowId);
    const arrow = document.createElement("div");
    arrow.className = "move-arrow";
    arrow.setAttribute("data-arrow-id", arrowId);
    // Calculate arrow color based on move quality
    let arrowColor = "#ff6b6b"; // Default red
    if (score !== undefined && allMoves && allMoves.length > 0) {
        const bestMove = allMoves[0]; // Best move is always first
        const bestScore = bestMove.score;
        const currentScore = score;
        // Check if this move is a mate
        const isMate = Math.abs(currentScore) >= 10000;
        const isBestMate = Math.abs(bestScore) >= 10000;
        if (isMate) {
            // Mate moves are always pastel green
            arrowColor = "#90EE90"; // pastel green
        }
        else if (isBestMate) {
            // Best move is mate but this move is not - bright red for preventing mate
            arrowColor = "#FF4444"; // bright red
        }
        else {
            // Calculate delta from best move
            const delta = currentScore - bestScore;
            const deltaInPawns = Math.abs(delta) / 100;
            // Calculate the rounded delta to match the display logic
            let roundedDeltaInPawns;
            if (Math.abs(delta) < 100) {
                // Small difference, round to 1 decimal place
                roundedDeltaInPawns = Math.round(Math.abs(delta) / 10) / 10;
            }
            else {
                // Large difference, round to integer
                roundedDeltaInPawns = Math.round(Math.abs(delta) / 100);
            }
            if (roundedDeltaInPawns <= 0.0) {
                // Best move (delta = 0) - darker green
                arrowColor = "#228B22"; // forest green for best move
            }
            else if (roundedDeltaInPawns <= 0.25) {
                // Good moves (0.1-0.25 pawns) - light green
                arrowColor = "#98FB98"; // light green for good moves
            }
            else if (roundedDeltaInPawns <= 1.0) {
                // Linear scale from pastel yellow to tomato red (0.25-1.0)
                const normalizedDelta = (roundedDeltaInPawns - 0.25) / 0.75; // 0 to 1 scale
                const yellow = [255, 255, 224]; // pastel yellow
                const tomato = [255, 99, 71]; // tomato red
                const r = Math.round(yellow[0] + (tomato[0] - yellow[0]) * normalizedDelta);
                const g = Math.round(yellow[1] + (tomato[1] - yellow[1]) * normalizedDelta);
                const b = Math.round(yellow[2] + (tomato[2] - yellow[2]) * normalizedDelta);
                arrowColor = `rgb(${r}, ${g}, ${b})`;
            }
            else {
                // Beyond 1.0 pawns is tomato red
                arrowColor = "#FF6347"; // tomato red
            }
        }
    }
    arrow.style.backgroundColor = arrowColor;
    // Also set the arrow head color to match
    arrow.style.setProperty("--arrow-color", arrowColor);
    // Set z-index based on analysis result position (higher index = higher z-index)
    const zIndex = index !== undefined ? 100 + index : 100;
    arrow.style.zIndex = zIndex.toString();
    // Calculate the label text based on the scoring rules
    let labelText = "";
    if (score !== undefined && allMoves && allMoves.length > 0) {
        const bestMove = allMoves[0]; // Best move is always first
        const bestScore = bestMove.score;
        const currentScore = score;
        // Check if this move is a mate
        const isMate = Math.abs(currentScore) >= 10000;
        const isBestMate = Math.abs(bestScore) >= 10000;
        if (isMate) {
            // This move is a mate
            if (currentScore > 0) {
                labelText = "+#"; // White mates
            }
            else {
                labelText = "-#"; // Black mates
            }
        }
        else if (isBestMate) {
            // Best move is mate but this move is not
            labelText = "!?"; // Indicates not a mate when best move is mate
        }
        else {
            // Calculate delta from best move
            const delta = currentScore - bestScore;
            if (Math.abs(delta) < 100) {
                // Small difference, show as fraction
                labelText =
                    delta > 0
                        ? `+${(delta / 100).toFixed(1)}`
                        : `${(delta / 100).toFixed(1)}`;
            }
            else {
                // Large difference, round to integer
                const roundedDelta = Math.round(delta / 100);
                labelText = roundedDelta > 0 ? `+${roundedDelta}` : `${roundedDelta}`;
            }
        }
    }
    // Format score with + or - prefix for arrow data attribute
    if (score !== undefined) {
        const scoreText = score > 0
            ? `+${(score / 100).toFixed(1)}`
            : `${(score / 100).toFixed(1)}`;
        arrow.setAttribute("data-score", scoreText);
    }
    positionArrow(arrow, from, to);
    const boardContainer = document.querySelector(".board-container");
    if (boardContainer) {
        boardContainer.appendChild(arrow);
    }
    // Add score label if score is provided
    if (score !== undefined) {
        const scoreLabel = document.createElement("div");
        scoreLabel.className = "move-score-label";
        scoreLabel.textContent =
            labelText ||
                (score > 0
                    ? `+${(score / 100).toFixed(1)}`
                    : `${(score / 100).toFixed(1)}`);
        // Set CSS custom property for the arrow color
        scoreLabel.style.setProperty("--arrow-color", arrowColor);
        scoreLabel.setAttribute("data-arrow-id", arrowId);
        // Position the score label at the end of the arrow
        const fromElement = document.querySelector(`[data-square="${from}"]`);
        const toElement = document.querySelector(`[data-square="${to}"]`);
        if (fromElement && toElement) {
            const fromRect = fromElement.getBoundingClientRect();
            const toRect = toElement.getBoundingClientRect();
            const boardContainerRect = boardContainer.getBoundingClientRect();
            const fromCenter = {
                x: fromRect.left + fromRect.width / 2 - boardContainerRect.left,
                y: fromRect.top + fromRect.height / 2 - boardContainerRect.top,
            };
            const toCenter = {
                x: toRect.left + toRect.width / 2 - boardContainerRect.left,
                y: toRect.top + toRect.height / 2 - boardContainerRect.top,
            };
            // Calculate angle for positioning
            const angle = Math.atan2(toCenter.y - fromCenter.y, toCenter.x - fromCenter.x);
            scoreLabel.style.position = "absolute";
            // Position at the connection point between shaft and head
            const connectionPoint = {
                x: toCenter.x - 24 * Math.cos(angle), // 24px is arrow head width
                y: toCenter.y - 24 * Math.sin(angle),
            };
            // Position the label at the connection point, centered
            scoreLabel.style.left = `${connectionPoint.x - 16}px`; // 32px width / 2
            scoreLabel.style.top = `${connectionPoint.y - 8 + 4}px`; // 16px height / 2 - half font size (10px/2 = 5px)
            scoreLabel.style.width = "32px";
            scoreLabel.style.height = "16px";
            // Set z-index for the label to match the arrow
            scoreLabel.style.zIndex = zIndex.toString();
            boardContainer.appendChild(scoreLabel);
            arrowElements.set(`${arrowId}-score`, scoreLabel);
        }
    }
    arrowElements.set(arrowId, arrow);
};
/**
 * Hide move arrow
 */
const hideMoveArrow = (arrowId) => {
    if (arrowId) {
        // Hide specific arrow and its score label
        const arrow = arrowElements.get(arrowId);
        if (arrow) {
            arrow.remove();
            arrowElements.delete(arrowId);
        }
        const scoreLabel = arrowElements.get(`${arrowId}-score`);
        if (scoreLabel) {
            scoreLabel.remove();
            arrowElements.delete(`${arrowId}-score`);
        }
    }
    else {
        // Hide all arrows and score labels
        const elementsToRemove = Array.from(arrowElements.values());
        elementsToRemove.forEach((element) => {
            element.remove();
        });
        arrowElements.clear();
        // Also remove any orphaned score labels from document.body
        const orphanedLabels = document.querySelectorAll(".move-score-label");
        orphanedLabels.forEach((label) => {
            label.remove();
        });
    }
};
/**
 * Clear last move highlight
 */
const clearLastMoveHighlight = () => {
    const highlightedSquares = document.querySelectorAll(".last-move-from, .last-move-to");
    highlightedSquares.forEach((square) => {
        square.classList.remove("last-move-from", "last-move-to");
    });
};
/**
 * Position arrow between squares
 */
const positionArrow = (arrow, from, to) => {
    const fromElement = document.querySelector(`[data-square="${from}"]`);
    const toElement = document.querySelector(`[data-square="${to}"]`);
    const boardContainer = document.querySelector(".board-container");
    if (!fromElement || !toElement || !boardContainer) {
        return;
    }
    const fromRect = fromElement.getBoundingClientRect();
    const toRect = toElement.getBoundingClientRect();
    const boardContainerRect = boardContainer.getBoundingClientRect();
    const fromCenter = {
        x: fromRect.left + fromRect.width / 2 - boardContainerRect.left,
        y: fromRect.top + fromRect.height / 2 - boardContainerRect.top,
    };
    const toCenter = {
        x: toRect.left + toRect.width / 2 - boardContainerRect.left,
        y: toRect.top + toRect.height / 2 - boardContainerRect.top,
    };
    const angle = Math.atan2(toCenter.y - fromCenter.y, toCenter.x - fromCenter.x);
    const distance = Math.sqrt(Math.pow(toCenter.x - fromCenter.x, 2) +
        Math.pow(toCenter.y - fromCenter.y, 2));
    arrow.style.position = "absolute";
    arrow.style.left = `${fromCenter.x}px`;
    arrow.style.top = `${fromCenter.y}px`;
    arrow.style.width = `${distance - 24}px`; // Subtract arrow head width to compensate
    arrow.style.transform = `rotate(${angle}rad)`;
    arrow.style.transformOrigin = "0 50%";
};
/**
 * Destroy board
 */
const destroy = () => {
    hideMoveArrow();
    clearLastMoveHighlight();
    // Remove event listeners
    const boardElement = document.querySelector("#chess-board");
    if (boardElement) {
        boardElement.removeEventListener("mousedown", handleMouseDown);
        boardElement.removeEventListener("touchstart", handleTouchStart);
    }
    document.removeEventListener("mousemove", handleMouseMove);
    document.removeEventListener("touchmove", handleTouchMove);
    document.removeEventListener("mouseup", handleMouseUp);
    document.removeEventListener("touchend", handleTouchEnd);
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
setPosition, getPosition, getFEN, setOnPositionChange, setOnMoveMade, showMoveArrow, hideMoveArrow, clearLastMoveHighlight, destroy, };
//# sourceMappingURL=chess-board.js.map