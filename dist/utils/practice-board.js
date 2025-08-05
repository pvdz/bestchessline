import { parseFEN, squareToCoords, coordsToSquare } from "./fen-utils.js";
// Unicode chess pieces
export const CHESS_PIECES = {
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
export function initializeBoard(boardGrid) {
  boardGrid.innerHTML = "";
  // For standard chess, white pieces should be at the bottom (rank 1)
  // Render squares from rank 8 to rank 1 (top to bottom) for proper orientation
  for (let rank = 7; rank >= 0; rank--) {
    for (let file = 0; file < 8; file++) {
      const square = coordsToSquare(rank, file);
      const squareEl = document.createElement("div");
      squareEl.className = `practice-square ${(rank + file) % 2 === 0 ? "light" : "dark"}`;
      squareEl.dataset.square = square;
      boardGrid.appendChild(squareEl);
    }
  }
}
// Render the board based on FEN
export function renderBoard(fen) {
  const position = parseFEN(fen);
  // Render board from white's perspective (white pieces at bottom)
  // Squares are rendered from rank 8 to rank 1 (top to bottom)
  for (let rank = 0; rank < 8; rank++) {
    for (let file = 0; file < 8; file++) {
      const square = coordsToSquare(rank, file);
      const squareEl = document.querySelector(`[data-square="${square}"]`);
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
export function getPieceAtSquare(square, fen) {
  const position = parseFEN(fen);
  const [rank, file] = squareToCoords(square);
  return position.board[rank][file];
}
// Clear board selection
export function clearBoardSelection() {
  // Clear selected square
  const selectedEl = document.querySelector(".practice-square.selected");
  if (selectedEl) {
    selectedEl.classList.remove("selected");
  }
  // Clear valid move highlights
  document.querySelectorAll(".practice-square.valid-move").forEach((el) => {
    el.classList.remove("valid-move");
  });
}
// Select a square on the board
export function selectSquare(square, fen) {
  clearBoardSelection();
  const squareEl = document.querySelector(`[data-square="${square}"]`);
  const piece = getPieceAtSquare(square, fen);
  if (!piece) return;
  // Check if it's the human's piece
  const isWhitePiece = piece === piece.toUpperCase();
  const isWhiteTurn = fen.includes(" w ");
  if (isWhitePiece !== isWhiteTurn) return;
  squareEl.classList.add("selected");
  // Find valid moves for this piece
  const validMoves = findValidMoves(square, piece, fen);
  // Highlight valid moves
  validMoves.forEach((moveSquare) => {
    const moveEl = document.querySelector(`[data-square="${moveSquare}"]`);
    moveEl.classList.add("valid-move");
  });
}
// Find valid moves for a piece (simplified)
function findValidMoves(square, piece, fen) {
  const position = parseFEN(fen);
  const [rank, file] = squareToCoords(square);
  const moves = [];
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
export function showHint(square) {
  const squareEl = document.querySelector(`[data-square="${square}"]`);
  squareEl.classList.add("hint");
  setTimeout(() => {
    squareEl.classList.remove("hint");
  }, 2000);
}
//# sourceMappingURL=practice-board.js.map
