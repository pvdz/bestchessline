"use strict";
/**
 * Test file for rawMoveToSAN function
 *
 * To run:
 * 1. Compile: node_modules/.bin/tsc --outDir dist --rootDir src src/utils/raw-move-to-san.test.ts
 * 2. Run: node dist/utils/raw-move-to-san.test.js
 */
// Simple FEN parser for testing
function parseFEN(fen) {
  const parts = fen.split(" ");
  const boardStr = parts[0];
  const turn = parts[1];
  const board = [];
  const ranks = boardStr.split("/");
  // FEN rank 8 is board[0], rank 1 is board[7]
  for (let rank = 0; rank < 8; rank++) {
    const rankStr = ranks[rank];
    const file = [];
    let fileIndex = 0;
    for (let i = 0; i < rankStr.length; i++) {
      const char = rankStr[i];
      if (char >= "1" && char <= "8") {
        // Empty squares
        const count = parseInt(char);
        for (let j = 0; j < count; j++) {
          file[fileIndex++] = "";
        }
      } else {
        // Piece
        file[fileIndex++] = char;
      }
    }
    board[rank] = file;
  }
  return { board, turn };
}
// Copy the rawMoveToSAN function for testing
const rawMoveToSAN = (rawMove, fen) => {
  if (rawMove.length !== 4) return rawMove; // Not a raw move, return as-is
  const from = rawMove.substring(0, 2);
  const to = rawMove.substring(2, 4);
  // Handle castling FIRST
  if ((from === "e1" && to === "g1") || (from === "e8" && to === "g8"))
    return "O-O";
  if ((from === "e1" && to === "c1") || (from === "e8" && to === "c8"))
    return "O-O-O";
  // If from and to are the same, return raw move
  if (from === to) return rawMove;
  // Parse the position to get piece information
  const position = parseFEN(fen);
  const board = position.board;
  // Convert square to coordinates
  const fileToIndex = (file) => file.charCodeAt(0) - "a".charCodeAt(0);
  const rankToIndex = (rank) => 8 - parseInt(rank);
  const fromFile = fileToIndex(from[0]);
  const fromRank = rankToIndex(from[1]);
  if (fromRank < 0 || fromRank >= 8 || fromFile < 0 || fromFile >= 8) {
    return rawMove; // Invalid square, return as-is
  }
  const piece = board[fromRank][fromFile];
  if (!piece) return rawMove; // No piece at square, return as-is
  // If it's a pawn move, only return the destination square if the piece is a pawn
  if ((piece === "P" || piece === "p") && from[0] === to[0]) {
    return to;
  }
  // Convert piece to SAN notation
  const pieceMap = {
    P: "", // Pawns don't get a letter
    p: "", // Black pawns don't get a letter
    R: "R",
    r: "R", // Black rooks still get R
    N: "N",
    n: "N", // Black knights still get N
    B: "B",
    b: "B", // Black bishops still get B
    Q: "Q",
    q: "Q", // Black queens still get Q
    K: "K",
    k: "K", // Black kings still get K
  };
  const pieceLetter = pieceMap[piece] || "";
  const toSquare = to;
  return pieceLetter + toSquare;
};
// Test cases
const testCases = [
  // Starting position tests
  {
    name: "White pawn move from starting position",
    fen: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
    rawMove: "e2e4",
    expected: "e4",
  },
  {
    name: "White knight move from starting position",
    fen: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
    rawMove: "g1f3",
    expected: "Nf3",
  },
  {
    name: "White bishop move from starting position",
    fen: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
    rawMove: "f1c4",
    expected: "Bc4",
  },
  {
    name: "White rook move from starting position",
    fen: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
    rawMove: "a1a2",
    expected: "Ra2",
  },
  {
    name: "White queen move from starting position",
    fen: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
    rawMove: "d1d2",
    expected: "Qd2",
  },
  {
    name: "White king move from starting position",
    fen: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
    rawMove: "e1e2",
    expected: "Ke2",
  },
  // Black moves from starting position
  {
    name: "Black pawn move from starting position",
    fen: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR b KQkq - 0 1",
    rawMove: "e7e5",
    expected: "e5",
  },
  {
    name: "Black knight move from starting position",
    fen: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR b KQkq - 0 1",
    rawMove: "b8c6",
    expected: "Nc6",
  },
  {
    name: "Black bishop move from starting position",
    fen: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR b KQkq - 0 1",
    rawMove: "f8e7",
    expected: "Be7",
  },
  {
    name: "Black rook move from starting position",
    fen: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR b KQkq - 0 1",
    rawMove: "a8a7",
    expected: "Ra7",
  },
  {
    name: "Black queen move from starting position",
    fen: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR b KQkq - 0 1",
    rawMove: "d8d7",
    expected: "Qd7",
  },
  {
    name: "Black king move from starting position",
    fen: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR b KQkq - 0 1",
    rawMove: "e8e7",
    expected: "Ke7",
  },
  // Middle game position tests
  {
    name: "Knight move in middle game",
    fen: "rnbqkbnr/pp1p1ppp/4p3/2p5/2P5/5NP1/PP1PPP1P/RNBQKB1R b KQkq c3 0 1",
    rawMove: "g8f6",
    expected: "Nf6",
  },
  {
    name: "Pawn move in middle game",
    fen: "rnbqkbnr/pp1p1ppp/4p3/2p5/2P5/5NP1/PP1PPP1P/RNBQKB1R b KQkq c3 0 1",
    rawMove: "c7c5",
    expected: "c7c5",
  },
  {
    name: "Bishop move in middle game",
    fen: "rnbqkbnr/pp1p2pp/4pp2/2p5/2P5/5NP1/PP1PPPBP/RNBQK2R b KQkq - 0 1",
    rawMove: "f8e7",
    expected: "Be7",
  },
  // Castling tests
  {
    name: "White kingside castling",
    fen: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
    rawMove: "e1g1",
    expected: "O-O",
  },
  {
    name: "White queenside castling",
    fen: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
    rawMove: "e1c1",
    expected: "O-O-O",
  },
  {
    name: "Black kingside castling",
    fen: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR b KQkq - 0 1",
    rawMove: "e8g8",
    expected: "O-O",
  },
  {
    name: "Black queenside castling",
    fen: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR b KQkq - 0 1",
    rawMove: "e8c8",
    expected: "O-O-O",
  },
  // Edge cases
  {
    name: "Invalid move (same square)",
    fen: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
    rawMove: "e2e2",
    expected: "e2e2", // Should return as-is for invalid moves
  },
  {
    name: "Empty square",
    fen: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
    rawMove: "e4e5",
    expected: "e4e5", // Should return as-is for empty squares
  },
  {
    name: "Invalid square coordinates",
    fen: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
    rawMove: "i9j0",
    expected: "i9j0", // Should return as-is for invalid coordinates
  },
  {
    name: "Short move string",
    fen: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
    rawMove: "e4",
    expected: "e4", // Should return as-is for non-raw moves
  },
];
// Test function
function runTests() {
  let passed = 0;
  let failed = 0;
  console.log("Testing rawMoveToSAN function...\n");
  for (const testCase of testCases) {
    const result = rawMoveToSAN(testCase.rawMove, testCase.fen);
    const success = result === testCase.expected;
    if (success) {
      passed++;
    } else {
      failed++;
      console.log(`❌ FAIL: ${testCase.name}`);
      console.log(
        `  Input: ${testCase.rawMove} in FEN: ${testCase.fen.substring(0, 50)}...`,
      );
      console.log(`  Expected: ${testCase.expected}`);
      console.log(`  Got: ${result}\n`);
    }
  }
  console.log(`\nResults: ${passed} passed, ${failed} failed`);
  if (failed === 0) {
    console.log("✅ All tests passed!");
  } else {
    console.log("❌ Some tests failed!");
  }
}
// Run tests
runTests();
//# sourceMappingURL=raw-move-to-san.test.js.map
