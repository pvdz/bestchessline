import { applyMoveToFEN } from "../utils/fen-manipulation.js";
import { parseMove } from "../utils/move-parsing.js";
import { renderBoard, clearBoardSelection, clearBoardSelectionWithoutLastMove, highlightLastMove, } from "./practice-board.js";
import { getPieceAtSquareFromFEN } from "../utils/fen-utils.js";
import { updateStatus, updateStatistics, addMoveToHistory, showSuccessToast, showErrorToast, showInfoToast, showWarningToast, } from "./practice-ui.js";
import { triggerRainbowBurst, } from "../utils/confetti-utils.js";
// Handle square click for move selection
export function handleSquareClick(square, gameState, dom) {
    if (!gameState.isPracticeActive || !gameState.isHumanTurn)
        return;
    if (gameState.selectedSquare === null) {
        // First click - select piece
        const piece = getPieceAtSquareFromFEN(square, gameState.currentFEN);
        if (piece && isPieceOfCurrentPlayer(piece, gameState.currentFEN)) {
            gameState.selectedSquare = square;
            gameState.validMoves = findValidMovesForPiece(square, piece, gameState.currentFEN);
            highlightSquare(square);
            highlightValidMoves(gameState.validMoves);
        }
    }
    else if (gameState.selectedSquare === square) {
        // Click same square - deselect
        clearSelection();
    }
    else if (gameState.validMoves.includes(square)) {
        // Valid move - make the move
        makeMove(gameState.selectedSquare, square, gameState, dom);
    }
    else {
        // Check for castling - if king moves more than one square, it must be castling
        const selectedPiece = getPieceAtSquareFromFEN(gameState.selectedSquare, gameState.currentFEN);
        if (selectedPiece && selectedPiece.toUpperCase() === "K") {
            // Calculate the distance the king is moving
            const fromFile = gameState.selectedSquare.charCodeAt(0) - "a".charCodeAt(0);
            const toFile = square.charCodeAt(0) - "a".charCodeAt(0);
            const distance = Math.abs(toFile - fromFile);
            // If king moves more than one square, it must be castling
            if (distance > 1) {
                // Determine if it's kingside or queenside castling
                const isKingside = toFile > fromFile; // Moving right = kingside
                const castlingNotation = isKingside ? "O-O" : "O-O-O";
                makeCastlingMove(castlingNotation, gameState, dom);
                return;
            }
        }
        // Click different square - select new piece
        const piece = getPieceAtSquareFromFEN(square, gameState.currentFEN);
        if (piece && isPieceOfCurrentPlayer(piece, gameState.currentFEN)) {
            gameState.selectedSquare = square;
            gameState.validMoves = findValidMovesForPiece(square, piece, gameState.currentFEN);
            highlightSquare(square);
            highlightValidMoves(gameState.validMoves);
        }
        else {
            clearSelection();
        }
    }
}
// Make a move
export function makeMove(fromSquare, toSquare, gameState, dom) {
    const fromPiece = getPieceAtSquareFromFEN(fromSquare, gameState.currentFEN);
    const move = {
        from: fromSquare,
        to: toSquare,
        piece: fromPiece,
    };
    // Store the previous FEN before making the move
    const previousFEN = gameState.currentFEN;
    // Apply move to FEN
    const newFEN = applyMoveToFEN(gameState.currentFEN, move);
    gameState.currentFEN = newFEN;
    // Get available moves for the current position
    const availableMoves = gameState.positionMap.get(gameState.currentFEN);
    // Check if this move was correct by looking at the previous position's available moves
    const previousAvailableMoves = gameState.positionMap.get(previousFEN);
    const moveNotation = `${fromSquare}-${toSquare}`;
    const normalizedMoveNotation = `${fromSquare}${toSquare}`;
    // If there are no previous available moves, this is the initial position
    // In this case, we need to check if the move leads to a valid position
    let wasCorrectMove = false;
    // For the initial position, we need to check if the move is in the available moves
    // For subsequent positions, we check against the previous position's available moves
    if (!previousAvailableMoves || previousAvailableMoves.length === 0) {
        // This is the initial position - check if the move is in the available moves
        wasCorrectMove = !!(availableMoves &&
            availableMoves.some((move) => {
                // Convert move to from-to format for comparison
                if (move.match(/^[NBRQKP][a-h][1-8][a-h][1-8]$/)) {
                    // Format: "Ng1f3" - extract just the squares
                    const fromTo = move.substring(1, 3) + move.substring(3, 5);
                    return fromTo === normalizedMoveNotation;
                }
                else if (move.match(/^[a-h][1-8][a-h][1-8]$/)) {
                    // Format: "g1f3" - already in the right format
                    return move === normalizedMoveNotation;
                }
                return false;
            }));
    }
    else {
        // Check if this move matches any of the available moves from the previous position
        wasCorrectMove = previousAvailableMoves.some((move) => {
            // Check if this move matches any of the available moves
            // We need to handle different move formats
            if (move.includes(".")) {
                // Format: "1. Ng1f3 g8f6" - extract the moves after the move number
                const moveParts = move.split(" ");
                const actualMoves = moveParts.slice(1); // Skip the move number
                return actualMoves.some((actualMove) => {
                    // Convert actualMove to from-to format for comparison
                    if (actualMove.match(/^[NBRQKP][a-h][1-8][a-h][1-8]$/)) {
                        // Format: "Ng1f3" - extract just the squares
                        const fromTo = actualMove.substring(1, 3) + actualMove.substring(3, 5);
                        return fromTo === normalizedMoveNotation;
                    }
                    else if (actualMove.match(/^[a-h][1-8][a-h][1-8]$/)) {
                        // Format: "g1f3" - already in the right format
                        return actualMove === normalizedMoveNotation;
                    }
                    return false;
                });
            }
            else if (move.match(/^[NBRQKP][a-h][1-8][a-h][1-8]$/)) {
                // Format: "Ng1f3" - extract just the squares
                const fromTo = move.substring(1, 3) + move.substring(3, 5);
                return fromTo === normalizedMoveNotation;
            }
            else if (move.match(/^[a-h][1-8][a-h][1-8]$/)) {
                // Format: "g1f3" - already in the right format
                return move === normalizedMoveNotation;
            }
            return false;
        });
    }
    if (wasCorrectMove) {
        // This was a correct move
        gameState.statistics.correctMoves++;
        gameState.statistics.totalMoves++;
        showSuccessToast("Correct move!");
        addMoveToHistory(dom.moveHistory, moveNotation, true);
        // Re-render the board with the new FEN
        renderBoard(gameState.currentFEN);
        // Highlight the last move
        highlightLastMove(fromSquare, toSquare);
        // Clear selection (but keep last move highlights)
        clearBoardSelectionWithoutLastMove();
        gameState.selectedSquare = null;
        gameState.validMoves = [];
        if (availableMoves && availableMoves.length > 0) {
            console.log("Available next moves:", availableMoves);
            // Computer's turn
            gameState.isHumanTurn = false;
            setTimeout(() => {
                makeComputerMove(gameState, dom);
            }, 500);
        }
        else {
            // Line completed! Trigger rainbow burst celebration
            triggerRainbowBurst();
            showInfoToast("Position completed!");
            gameState.isPracticeActive = false;
        }
    }
    else {
        // This was an incorrect move
        gameState.statistics.totalMoves++;
        showErrorToast("Incorrect move! Try again.");
        addMoveToHistory(dom.moveHistory, moveNotation, false);
        // Revert the move by restoring the previous FEN
        gameState.currentFEN = previousFEN;
        // Re-render the board with the original FEN
        renderBoard(gameState.currentFEN);
        // Clear selection and allow retry (but keep last move highlights)
        clearBoardSelectionWithoutLastMove();
        gameState.selectedSquare = null;
        gameState.validMoves = [];
        // Keep it human's turn for retry
        gameState.isHumanTurn = true;
    }
    updateStatistics(dom, gameState);
}
// Make castling move
function makeCastlingMove(castlingNotation, gameState, dom) {
    const previousFEN = gameState.currentFEN;
    const parsedMove = parseMove(castlingNotation, gameState.currentFEN);
    if (parsedMove) {
        const newFEN = applyMoveToFEN(gameState.currentFEN, parsedMove);
        gameState.currentFEN = newFEN;
        // Get available moves for the current position
        const availableMoves = gameState.positionMap.get(gameState.currentFEN);
        // Always treat castling as correct (no validation needed)
        // This was a correct move
        gameState.statistics.correctMoves++;
        gameState.statistics.totalMoves++;
        showSuccessToast("Correct move!");
        addMoveToHistory(dom.moveHistory, castlingNotation, true);
        // Re-render the board with the new FEN
        renderBoard(gameState.currentFEN);
        // Highlight the last move (castling)
        if (castlingNotation === "O-O") {
            // Kingside castling
            const fromSquare = gameState.currentFEN.includes(" w ") ? "e1" : "e8";
            const toSquare = gameState.currentFEN.includes(" w ") ? "g1" : "g8";
            highlightLastMove(fromSquare, toSquare);
        }
        else if (castlingNotation === "O-O-O") {
            // Queenside castling
            const fromSquare = gameState.currentFEN.includes(" w ") ? "e1" : "e8";
            const toSquare = gameState.currentFEN.includes(" w ") ? "c1" : "c8";
            highlightLastMove(fromSquare, toSquare);
        }
        // Clear selection and right-click selections (but keep last move highlights)
        clearBoardSelectionWithoutLastMove();
        gameState.selectedSquare = null;
        gameState.validMoves = [];
        if (availableMoves && availableMoves.length > 0) {
            console.log("Available next moves:", availableMoves);
            // Computer's turn
            gameState.isHumanTurn = false;
            setTimeout(() => {
                makeComputerMove(gameState, dom);
            }, 500);
        }
        else {
            // Line completed! Trigger rainbow burst celebration
            triggerRainbowBurst();
            showInfoToast("Position completed!");
            gameState.isPracticeActive = false;
        }
        updateStatistics(dom, gameState);
    }
    else {
        showErrorToast("Invalid castling move!");
    }
}
// Make computer move
export function makeComputerMove(gameState, dom) {
    // Get available moves for current position from position map
    const availableMoves = gameState.positionMap.get(gameState.currentFEN);
    if (availableMoves && availableMoves.length > 0) {
        // Select a move based on strategy
        const selectedMove = selectComputerMove(availableMoves, gameState);
        // Extract from-to squares from the selected move
        let fromToSquares;
        if (selectedMove.includes(".")) {
            // Format: "1. Ng1f3 g8f6" - extract the moves after the move number
            const moveParts = selectedMove.split(" ");
            const actualMoves = moveParts.slice(1); // Skip the move number
            fromToSquares = actualMoves.join(" ");
        }
        else if (selectedMove === "O-O" || selectedMove === "O-O-O") {
            // Castling moves - keep as-is
            fromToSquares = selectedMove;
        }
        else if (selectedMove.match(/^[NBRQKP][a-h][1-8][a-h][1-8]$/)) {
            // Format: "Ng1f3" - extract just the squares
            fromToSquares =
                selectedMove.substring(1, 3) + selectedMove.substring(3, 5);
        }
        else if (selectedMove.match(/^[a-h][1-8][a-h][1-8]$/)) {
            // Format: "g1f3" - already in the right format
            fromToSquares = selectedMove;
        }
        else {
            console.warn(`Invalid move format: ${selectedMove}`);
            showErrorToast("Computer move failed");
            gameState.isPracticeActive = false;
            updateStatus(dom, gameState);
            return;
        }
        // Apply the move using the from-to squares or castling notation
        if (fromToSquares === "O-O" || fromToSquares === "O-O-O") {
            // Handle castling moves
            const parsedMove = parseMove(fromToSquares, gameState.currentFEN);
            if (parsedMove) {
                const newFEN = applyMoveToFEN(gameState.currentFEN, parsedMove);
                gameState.currentFEN = newFEN;
                addMoveToHistory(dom.moveHistory, selectedMove, true);
                renderBoard(gameState.currentFEN);
                // Check if there are more moves available for the human
                const nextAvailableMoves = gameState.positionMap.get(gameState.currentFEN);
                if (nextAvailableMoves && nextAvailableMoves.length > 0) {
                    console.log("Available next moves:", nextAvailableMoves);
                    gameState.isHumanTurn = true;
                }
                else {
                    showInfoToast("Position completed!");
                    gameState.isPracticeActive = false;
                }
            }
            else {
                console.warn(`Failed to parse castling move: ${fromToSquares}`);
                showErrorToast("Computer move failed");
                gameState.isPracticeActive = false;
            }
        }
        else if (fromToSquares.length === 4 &&
            /^[a-h][1-8][a-h][1-8]$/.test(fromToSquares)) {
            const fromSquare = fromToSquares.substring(0, 2);
            const toSquare = fromToSquares.substring(2, 4);
            const piece = getPieceAtSquareFromFEN(fromSquare, gameState.currentFEN);
            const chessMove = {
                from: fromSquare,
                to: toSquare,
                piece: piece,
            };
            // Apply the move
            const newFEN = applyMoveToFEN(gameState.currentFEN, chessMove);
            gameState.currentFEN = newFEN;
            addMoveToHistory(dom.moveHistory, selectedMove, true);
            // Re-render the board with the new FEN
            renderBoard(gameState.currentFEN);
            // Highlight the last move (computer move)
            highlightLastMove(fromSquare, toSquare);
            // Check if there are more moves available for the human
            const nextAvailableMoves = gameState.positionMap.get(gameState.currentFEN);
            if (nextAvailableMoves && nextAvailableMoves.length > 0) {
                console.log("Available next moves:", nextAvailableMoves);
                // Human's turn
                gameState.isHumanTurn = true;
            }
            else {
                showInfoToast("Position completed!");
                gameState.isPracticeActive = false;
            }
        }
        else {
            console.warn(`Invalid from-to squares: ${fromToSquares}`);
            showErrorToast("Computer move failed");
            gameState.isPracticeActive = false;
        }
    }
    else {
        // No moves available - position is finished
        showInfoToast("Position completed!");
        gameState.isPracticeActive = false;
    }
    updateStatus(dom, gameState);
}
// Select computer move based on strategy
export function selectComputerMove(availableMoves, gameState) {
    switch (gameState.computerMoveStrategy) {
        case "random":
            return availableMoves[Math.floor(Math.random() * availableMoves.length)];
        case "serial":
            // Always pick the first move (deterministic)
            return availableMoves[0];
        case "adaptive":
            // TODO: Implement adaptive strategy based on player performance
            // For now, just use random
            return availableMoves[Math.floor(Math.random() * availableMoves.length)];
        default:
            return availableMoves[0];
    }
}
// Show hint
export function showHintForCurrentPosition(gameState) {
    if (!gameState.isPracticeActive || !gameState.isHumanTurn)
        return;
    // Get available moves for current position
    const availableMoves = gameState.positionMap.get(gameState.currentFEN);
    if (availableMoves && availableMoves.length > 0) {
        // Show the first available move as a hint
        const hintMove = availableMoves[0];
        showWarningToast(`Hint: Try ${hintMove}`);
    }
    else {
        showWarningToast("No moves available for this position");
    }
}
function isPieceOfCurrentPlayer(piece, fen) {
    const isWhiteTurn = fen.includes(" w ");
    const isWhitePiece = piece === piece.toUpperCase();
    return isWhitePiece === isWhiteTurn;
}
function findValidMovesForPiece(square, _piece, _fen) {
    // For now, return all squares as valid moves
    // This is a simplified implementation
    const validMoves = [];
    const files = "abcdefgh";
    const ranks = "12345678";
    for (const file of files) {
        for (const rank of ranks) {
            const targetSquare = file + rank;
            if (targetSquare !== square) {
                validMoves.push(targetSquare);
            }
        }
    }
    return validMoves;
}
function highlightSquare(square) {
    const squareElement = document.querySelector(`[data-square="${square}"]`);
    if (squareElement) {
        squareElement.classList.add("selected");
    }
}
function highlightValidMoves(moves) {
    moves.forEach((square) => {
        const squareElement = document.querySelector(`[data-square="${square}"]`);
        if (squareElement) {
            squareElement.classList.add("valid-move");
        }
    });
}
function clearSelection() {
    clearBoardSelection();
}
//# sourceMappingURL=practice-game.js.map