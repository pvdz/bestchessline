console.log("am i still running at all?");
/**
 * Initial application state
 */
const createInitialState = () => ({
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
let appState = createInitialState();
/**
 * State update functions
 */
const updateState = (updates) => {
    appState = { ...appState, ...updates };
};
const getState = () => ({ ...appState });
/**
 * Board state management
 */
let boardState = {
    position: appState.initialFEN,
    selectedSquare: null,
    draggedPiece: null,
    legalMoves: [],
};
/**
 * Update board state
 */
const updateBoardState = (updates) => {
    boardState = { ...boardState, ...updates };
};
/**
 * Set board position
 */
const setBoardPosition = (fen) => {
    updateBoardState({ position: fen });
    renderBoard();
    updateFENInput();
    updateControlsFromPosition();
};
/**
 * Get current board FEN
 */
const getBoardFEN = () => boardState.position;
// ============================================================================
// BOARD RENDERING
// ============================================================================
/**
 * Render the chess board
 */
const renderBoard = () => {
    const boardElement = document.getElementById("chess-board");
    if (!boardElement)
        return;
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
const getPieceAtSquare = (rank, file, ranks) => {
    const rankStr = ranks[rank];
    let fileIndex = 0;
    for (let i = 0; i < rankStr.length; i++) {
        const char = rankStr[i];
        if (char >= "1" && char <= "8") {
            fileIndex += parseInt(char);
        }
        else {
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
const createPieceElement = (piece, square) => {
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
const getPieceSymbol = (type, color) => {
    const symbols = {
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
const updateFENInput = () => {
    const fenInput = document.getElementById("fen-input");
    if (fenInput) {
        fenInput.value = boardState.position;
    }
};
/**
 * Update controls from current position
 */
const updateControlsFromPosition = () => {
    const fenParts = boardState.position.split(" ");
    if (fenParts.length < 4)
        return;
    const turn = fenParts[1];
    const castling = fenParts[2];
    const enPassant = fenParts[3];
    // Update current player
    const whiteRadio = document.querySelector('input[name="current-player"][value="w"]');
    const blackRadio = document.querySelector('input[name="current-player"][value="b"]');
    if (whiteRadio && blackRadio) {
        if (turn === "w") {
            whiteRadio.checked = true;
        }
        else {
            blackRadio.checked = true;
        }
    }
    // Update castling rights
    const whiteKingside = document.getElementById("white-kingside");
    const whiteQueenside = document.getElementById("white-queenside");
    const blackKingside = document.getElementById("black-kingside");
    const blackQueenside = document.getElementById("black-queenside");
    if (whiteKingside)
        whiteKingside.checked = castling.includes("K");
    if (whiteQueenside)
        whiteQueenside.checked = castling.includes("Q");
    if (blackKingside)
        blackKingside.checked = castling.includes("k");
    if (blackQueenside)
        blackQueenside.checked = castling.includes("q");
    // Update en passant
    const enPassantInput = document.getElementById("en-passant");
    if (enPassantInput) {
        enPassantInput.value = enPassant === "-" ? "" : enPassant;
    }
};
// ============================================================================
// EXPORT FUNCTIONS
// ============================================================================
export { 
// State management
getState, updateState, 
// Board management
setBoardPosition, getBoardFEN, updateBoardState, 
// Rendering
renderBoard, 
// FEN management
updateFENInput, updateControlsFromPosition, };
//# sourceMappingURL=app-functional.js.map