// To run this test:
//   1. Compile with: npx tsc src/utils/move-parser.test.ts --outDir dist --module es2022 --target es2022 --moduleResolution node --rootDir src
//   2. Run with:     node dist/utils/move-parser.test.js

/**
 * Simple test cases for move parser
 * Tests various move formats and edge cases
 */

import { parseMoveFromNotation } from "./move-parser.js";
import { parseMove } from "./move-parsing.js";

// Simple assertion function
function assert(condition: boolean, message: string): boolean {
  if (!condition) {
    console.error(`❌ FAIL: ${message}`);
    return false;
  }
  return true;
}

// Test helper function for pure move parsing
function testMoveParsing(
  move: string,
  fen: string,
  expectedFrom: string,
  expectedTo: string,
  expectedPiece: string,
  testName: string,
): boolean {
  // Extract turn from FEN for pure parsing
  const isWhiteTurn = fen.includes(" w ");
  const result = parseMoveFromNotation(move, isWhiteTurn);

  if (!result) {
    return assert(false, `${testName} - Failed to parse move "${move}"`);
  }

  const fromOk = assert(
    result.from === expectedFrom,
    `${testName} - Expected from "${expectedFrom}", got "${result.from}"`,
  );
  const toOk = assert(
    result.to === expectedTo,
    `${testName} - Expected to "${expectedTo}", got "${result.to}"`,
  );
  const pieceOk = assert(
    result.piece === expectedPiece,
    `${testName} - Expected piece "${expectedPiece}", got "${result.piece}"`,
  );

  return fromOk && toOk && pieceOk;
}

// --- DEBUG: Test position-aware parser for 'g3' from starting FEN ---
function debugParseMoveG3() {
  const startFEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
  const move = "g3";
  const result = parseMove(move, startFEN);
  console.log("\n[DEBUG] parseMove('g3', startFEN) result:", result);
}
debugParseMoveG3();

// Test cases
function runTests(): void {
  console.log("🧪 Testing move parser...\n");

  const startFEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
  const blackTurnFEN =
    "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR b KQkq - 0 1";

  const tests = [
    // Basic moves
    {
      move: "e4",
      fen: startFEN,
      expectedFrom: "e2",
      expectedTo: "e4",
      expectedPiece: "P",
      name: "Basic pawn move e4",
    },
    {
      move: "d4",
      fen: startFEN,
      expectedFrom: "d2",
      expectedTo: "d4",
      expectedPiece: "P",
      name: "Basic pawn move d4",
    },
    {
      move: "g3",
      fen: startFEN,
      expectedFrom: "g2",
      expectedTo: "g3",
      expectedPiece: "P",
      name: "Basic pawn move g3",
    },
    {
      move: "Nf3",
      fen: startFEN,
      expectedFrom: "g1",
      expectedTo: "f3",
      expectedPiece: "N",
      name: "Basic knight move Nf3",
    },
    {
      move: "Nc3",
      fen: startFEN,
      expectedFrom: "b1",
      expectedTo: "c3",
      expectedPiece: "N",
      name: "Basic knight move Nc3",
    },

    // Black moves
    {
      move: "e5",
      fen: blackTurnFEN,
      expectedFrom: "e7",
      expectedTo: "e5",
      expectedPiece: "p",
      name: "Black pawn move e5",
    },
    {
      move: "d5",
      fen: blackTurnFEN,
      expectedFrom: "d7",
      expectedTo: "d5",
      expectedPiece: "p",
      name: "Black pawn move d5",
    },
    {
      move: "Nf6",
      fen: blackTurnFEN,
      expectedFrom: "g8",
      expectedTo: "f6",
      expectedPiece: "n",
      name: "Black knight move Nf6",
    },

    // Castling
    {
      move: "O-O",
      fen: startFEN,
      expectedFrom: "e1",
      expectedTo: "g1",
      expectedPiece: "K",
      name: "White kingside castling",
    },
    {
      move: "O-O-O",
      fen: startFEN,
      expectedFrom: "e1",
      expectedTo: "c1",
      expectedPiece: "K",
      name: "White queenside castling",
    },
    {
      move: "O-O+",
      fen: startFEN,
      expectedFrom: "e1",
      expectedTo: "g1",
      expectedPiece: "K",
      name: "White kingside castling with check",
    },
    {
      move: "O-O-O#",
      fen: startFEN,
      expectedFrom: "e1",
      expectedTo: "c1",
      expectedPiece: "K",
      name: "White queenside castling with checkmate",
    },

    // Edge cases with symbols
    {
      move: "e4+",
      fen: startFEN,
      expectedFrom: "e2",
      expectedTo: "e4",
      expectedPiece: "P",
      name: "Pawn move with check symbol",
    },
    {
      move: "Nf3!",
      fen: startFEN,
      expectedFrom: "g1",
      expectedTo: "f3",
      expectedPiece: "N",
      name: "Knight move with evaluation symbol",
    },
    {
      move: "e4#",
      fen: startFEN,
      expectedFrom: "e2",
      expectedTo: "e4",
      expectedPiece: "P",
      name: "Pawn move with checkmate symbol",
    },

    // Captures
    {
      move: "exd5",
      fen: startFEN,
      expectedFrom: "e4",
      expectedTo: "d5",
      expectedPiece: "P",
      name: "Pawn capture exd5",
    },
    {
      move: "Nxe4",
      fen: startFEN,
      expectedFrom: "f3",
      expectedTo: "e4",
      expectedPiece: "N",
      name: "Knight capture Nxe4",
    },
    {
      move: "Bxe4",
      fen: startFEN,
      expectedFrom: "f1",
      expectedTo: "e4",
      expectedPiece: "B",
      name: "Bishop capture Bxe4",
    },
    {
      move: "Rxe4",
      fen: startFEN,
      expectedFrom: "a1",
      expectedTo: "e4",
      expectedPiece: "R",
      name: "Rook capture Rxe4",
    },
    {
      move: "Qxe4",
      fen: startFEN,
      expectedFrom: "d1",
      expectedTo: "e4",
      expectedPiece: "Q",
      name: "Queen capture Qxe4",
    },
    {
      move: "Kxe4",
      fen: startFEN,
      expectedFrom: "e1",
      expectedTo: "e4",
      expectedPiece: "K",
      name: "King capture Kxe4",
    },

    // Captures with check/mate
    {
      move: "exd5+",
      fen: startFEN,
      expectedFrom: "e4",
      expectedTo: "d5",
      expectedPiece: "P",
      name: "Pawn capture with check exd5+",
    },
    {
      move: "Nxe4#",
      fen: startFEN,
      expectedFrom: "f3",
      expectedTo: "e4",
      expectedPiece: "N",
      name: "Knight capture with checkmate Nxe4#",
    },
    {
      move: "Bxe4+",
      fen: startFEN,
      expectedFrom: "f1",
      expectedTo: "e4",
      expectedPiece: "B",
      name: "Bishop capture with check Bxe4+",
    },
    {
      move: "Rxe4#",
      fen: startFEN,
      expectedFrom: "a1",
      expectedTo: "e4",
      expectedPiece: "R",
      name: "Rook capture with checkmate Rxe4#",
    },

    // Disambiguation
    {
      move: "Nbd2",
      fen: startFEN,
      expectedFrom: "b1",
      expectedTo: "d2",
      expectedPiece: "N",
      name: "Knight disambiguation Nbd2",
    },
    {
      move: "Nfd2",
      fen: startFEN,
      expectedFrom: "f3",
      expectedTo: "d2",
      expectedPiece: "N",
      name: "Knight disambiguation Nfd2",
    },
    {
      move: "N1d2",
      fen: startFEN,
      expectedFrom: "b1",
      expectedTo: "d2",
      expectedPiece: "N",
      name: "Knight rank disambiguation N1d2",
    },
    {
      move: "N3d2",
      fen: startFEN,
      expectedFrom: "f3",
      expectedTo: "d2",
      expectedPiece: "N",
      name: "Knight rank disambiguation N3d2",
    },
    {
      move: "Rae4",
      fen: startFEN,
      expectedFrom: "a1",
      expectedTo: "e4",
      expectedPiece: "R",
      name: "Rook file disambiguation Rae4",
    },
    {
      move: "Rhe4",
      fen: startFEN,
      expectedFrom: "h1",
      expectedTo: "e4",
      expectedPiece: "R",
      name: "Rook file disambiguation Rhe4",
    },
    {
      move: "Nbd3",
      fen: startFEN,
      expectedFrom: "b1",
      expectedTo: "d3",
      expectedPiece: "N",
      name: "Knight file disambiguation Nbd3",
    },
    {
      move: "Nfd3",
      fen: startFEN,
      expectedFrom: "f3",
      expectedTo: "d3",
      expectedPiece: "N",
      name: "Knight file disambiguation Nfd3",
    },
    {
      move: "N2b3",
      fen: startFEN,
      expectedFrom: "b1",
      expectedTo: "b3",
      expectedPiece: "N",
      name: "Knight rank disambiguation N2b3",
    },
    {
      move: "N4b3",
      fen: startFEN,
      expectedFrom: "f3",
      expectedTo: "b3",
      expectedPiece: "N",
      name: "Knight rank disambiguation N4b3",
    },
    {
      move: "N1c3",
      fen: startFEN,
      expectedFrom: "b1",
      expectedTo: "c3",
      expectedPiece: "N",
      name: "Knight rank disambiguation N1c3",
    },
    {
      move: "N3c3",
      fen: startFEN,
      expectedFrom: "f3",
      expectedTo: "c3",
      expectedPiece: "N",
      name: "Knight rank disambiguation N3c3",
    },
    {
      move: "R1e4",
      fen: startFEN,
      expectedFrom: "a1",
      expectedTo: "e4",
      expectedPiece: "R",
      name: "Rook rank disambiguation R1e4",
    },
    {
      move: "R8e4",
      fen: startFEN,
      expectedFrom: "h1",
      expectedTo: "e4",
      expectedPiece: "R",
      name: "Rook rank disambiguation R8e4",
    },
    {
      move: "B1e4",
      fen: startFEN,
      expectedFrom: "c1",
      expectedTo: "e4",
      expectedPiece: "B",
      name: "Bishop rank disambiguation B1e4",
    },
    {
      move: "B8e4",
      fen: startFEN,
      expectedFrom: "f1",
      expectedTo: "e4",
      expectedPiece: "B",
      name: "Bishop rank disambiguation B8e4",
    },
    {
      move: "Q1e4",
      fen: startFEN,
      expectedFrom: "d1",
      expectedTo: "e4",
      expectedPiece: "Q",
      name: "Queen rank disambiguation Q1e4",
    },
    {
      move: "Q8e4",
      fen: startFEN,
      expectedFrom: "d1",
      expectedTo: "e4",
      expectedPiece: "Q",
      name: "Queen rank disambiguation Q8e4",
    },
    {
      move: "Rac4",
      fen: startFEN,
      expectedFrom: "a1",
      expectedTo: "c4",
      expectedPiece: "R",
      name: "Rook file disambiguation Rac4",
    },
    {
      move: "Rhc4",
      fen: startFEN,
      expectedFrom: "h1",
      expectedTo: "c4",
      expectedPiece: "R",
      name: "Rook file disambiguation Rhc4",
    },
    {
      move: "Bce4",
      fen: startFEN,
      expectedFrom: "c1",
      expectedTo: "e4",
      expectedPiece: "B",
      name: "Bishop file disambiguation Bce4",
    },
    {
      move: "Bfe4",
      fen: startFEN,
      expectedFrom: "f1",
      expectedTo: "e4",
      expectedPiece: "B",
      name: "Bishop file disambiguation Bfe4",
    },
    {
      move: "Qde4",
      fen: startFEN,
      expectedFrom: "d1",
      expectedTo: "e4",
      expectedPiece: "Q",
      name: "Queen file disambiguation Qde4",
    },
    {
      move: "Qhe4",
      fen: startFEN,
      expectedFrom: "d1",
      expectedTo: "e4",
      expectedPiece: "Q",
      name: "Queen file disambiguation Qhe4",
    },

    // Disambiguation with captures
    {
      move: "Ndxe4",
      fen: startFEN,
      expectedFrom: "d2",
      expectedTo: "e4",
      expectedPiece: "N",
      name: "Knight disambiguation with capture Ndxe4",
    },
    {
      move: "Nfxe4",
      fen: startFEN,
      expectedFrom: "f3",
      expectedTo: "e4",
      expectedPiece: "N",
      name: "Knight disambiguation with capture Nfxe4",
    },
    {
      move: "Raxe4",
      fen: startFEN,
      expectedFrom: "a1",
      expectedTo: "e4",
      expectedPiece: "R",
      name: "Rook disambiguation with capture Raxe4",
    },
    {
      move: "Rhxe4",
      fen: startFEN,
      expectedFrom: "h1",
      expectedTo: "e4",
      expectedPiece: "R",
      name: "Rook disambiguation with capture Rhxe4",
    },

    // Disambiguation with check/mate
    {
      move: "Ndxe4+",
      fen: startFEN,
      expectedFrom: "d2",
      expectedTo: "e4",
      expectedPiece: "N",
      name: "Knight disambiguation with capture and check Ndxe4+",
    },
    {
      move: "Nfxe4#",
      fen: startFEN,
      expectedFrom: "f3",
      expectedTo: "e4",
      expectedPiece: "N",
      name: "Knight disambiguation with capture and checkmate Nfxe4#",
    },

    // En passant
    {
      move: "exd6",
      fen: startFEN,
      expectedFrom: "e5",
      expectedTo: "d6",
      expectedPiece: "P",
      name: "En passant capture exd6",
    },
    {
      move: "exd6+",
      fen: startFEN,
      expectedFrom: "e5",
      expectedTo: "d6",
      expectedPiece: "P",
      name: "En passant capture with check exd6+",
    },
    {
      move: "exd6#",
      fen: startFEN,
      expectedFrom: "e5",
      expectedTo: "d6",
      expectedPiece: "P",
      name: "En passant capture with checkmate exd6#",
    },

    // Promotions
    {
      move: "e8=Q",
      fen: startFEN,
      expectedFrom: "e7",
      expectedTo: "e8",
      expectedPiece: "P",
      name: "Pawn promotion to queen e8=Q",
    },
    {
      move: "e8=R",
      fen: startFEN,
      expectedFrom: "e7",
      expectedTo: "e8",
      expectedPiece: "P",
      name: "Pawn promotion to rook e8=R",
    },
    {
      move: "e8=B",
      fen: startFEN,
      expectedFrom: "e7",
      expectedTo: "e8",
      expectedPiece: "P",
      name: "Pawn promotion to bishop e8=B",
    },
    {
      move: "e8=N",
      fen: startFEN,
      expectedFrom: "e7",
      expectedTo: "e8",
      expectedPiece: "P",
      name: "Pawn promotion to knight e8=N",
    },

    // Promotions with captures
    {
      move: "exd8=Q",
      fen: startFEN,
      expectedFrom: "e7",
      expectedTo: "d8",
      expectedPiece: "P",
      name: "Pawn promotion with capture exd8=Q",
    },
    {
      move: "exd8=R",
      fen: startFEN,
      expectedFrom: "e7",
      expectedTo: "d8",
      expectedPiece: "P",
      name: "Pawn promotion with capture exd8=R",
    },
    {
      move: "exd8=B",
      fen: startFEN,
      expectedFrom: "e7",
      expectedTo: "d8",
      expectedPiece: "P",
      name: "Pawn promotion with capture exd8=B",
    },
    {
      move: "exd8=N",
      fen: startFEN,
      expectedFrom: "e7",
      expectedTo: "d8",
      expectedPiece: "P",
      name: "Pawn promotion with capture exd8=N",
    },

    // Promotions with check/mate
    {
      move: "e8=Q+",
      fen: startFEN,
      expectedFrom: "e7",
      expectedTo: "e8",
      expectedPiece: "P",
      name: "Pawn promotion to queen with check e8=Q+",
    },
    {
      move: "e8=R#",
      fen: startFEN,
      expectedFrom: "e7",
      expectedTo: "e8",
      expectedPiece: "P",
      name: "Pawn promotion to rook with checkmate e8=R#",
    },
    {
      move: "exd8=Q+",
      fen: startFEN,
      expectedFrom: "e7",
      expectedTo: "d8",
      expectedPiece: "P",
      name: "Pawn promotion with capture and check exd8=Q+",
    },
    {
      move: "exd8=R#",
      fen: startFEN,
      expectedFrom: "e7",
      expectedTo: "d8",
      expectedPiece: "P",
      name: "Pawn promotion with capture and checkmate exd8=R#",
    },

    // More complex disambiguation combinations
    {
      move: "N1xe4+",
      fen: startFEN,
      expectedFrom: "b1",
      expectedTo: "e4",
      expectedPiece: "N",
      name: "Knight rank disambiguation with capture and check N1xe4+",
    },
    {
      move: "N3xe4#",
      fen: startFEN,
      expectedFrom: "f3",
      expectedTo: "e4",
      expectedPiece: "N",
      name: "Knight rank disambiguation with capture and checkmate N3xe4#",
    },
    {
      move: "R1xe4+",
      fen: startFEN,
      expectedFrom: "a1",
      expectedTo: "e4",
      expectedPiece: "R",
      name: "Rook rank disambiguation with capture and check R1xe4+",
    },
    {
      move: "R8xe4#",
      fen: startFEN,
      expectedFrom: "h1",
      expectedTo: "e4",
      expectedPiece: "R",
      name: "Rook rank disambiguation with capture and checkmate R8xe4#",
    },
    {
      move: "B1xe4+",
      fen: startFEN,
      expectedFrom: "c1",
      expectedTo: "e4",
      expectedPiece: "B",
      name: "Bishop rank disambiguation with capture and check B1xe4+",
    },
    {
      move: "B8xe4#",
      fen: startFEN,
      expectedFrom: "f1",
      expectedTo: "e4",
      expectedPiece: "B",
      name: "Bishop rank disambiguation with capture and checkmate B8xe4#",
    },
    {
      move: "Q1xe4+",
      fen: startFEN,
      expectedFrom: "d1",
      expectedTo: "e4",
      expectedPiece: "Q",
      name: "Queen rank disambiguation with capture and check Q1xe4+",
    },
    {
      move: "Q8xe4#",
      fen: startFEN,
      expectedFrom: "d1",
      expectedTo: "e4",
      expectedPiece: "Q",
      name: "Queen rank disambiguation with capture and checkmate Q8xe4#",
    },

    // File disambiguation with captures and check/mate
    {
      move: "Nbxh5+",
      fen: startFEN,
      expectedFrom: "b1",
      expectedTo: "h5",
      expectedPiece: "N",
      name: "Knight file disambiguation with capture and check Nbxh5+",
    },
    {
      move: "Nfxh5#",
      fen: startFEN,
      expectedFrom: "f3",
      expectedTo: "h5",
      expectedPiece: "N",
      name: "Knight file disambiguation with capture and checkmate Nfxh5#",
    },
    {
      move: "Raxh5+",
      fen: startFEN,
      expectedFrom: "a1",
      expectedTo: "h5",
      expectedPiece: "R",
      name: "Rook file disambiguation with capture and check Raxh5+",
    },
    {
      move: "Rhxh5#",
      fen: startFEN,
      expectedFrom: "h1",
      expectedTo: "h5",
      expectedPiece: "R",
      name: "Rook file disambiguation with capture and checkmate Rhxh5#",
    },
    {
      move: "Bcxh5+",
      fen: startFEN,
      expectedFrom: "c1",
      expectedTo: "h5",
      expectedPiece: "B",
      name: "Bishop file disambiguation with capture and check Bcxh5+",
    },
    {
      move: "Bfxh5#",
      fen: startFEN,
      expectedFrom: "f1",
      expectedTo: "h5",
      expectedPiece: "B",
      name: "Bishop file disambiguation with capture and checkmate Bfxh5#",
    },
    {
      move: "Qdxh5+",
      fen: startFEN,
      expectedFrom: "d1",
      expectedTo: "h5",
      expectedPiece: "Q",
      name: "Queen file disambiguation with capture and check Qdxh5+",
    },
    {
      move: "Qhxh5#",
      fen: startFEN,
      expectedFrom: "d1",
      expectedTo: "h5",
      expectedPiece: "Q",
      name: "Queen file disambiguation with capture and checkmate Qhxh5#",
    },

    // Complex promotions with disambiguation
    {
      move: "exd8=Q+",
      fen: startFEN,
      expectedFrom: "e7",
      expectedTo: "d8",
      expectedPiece: "P",
      name: "Pawn promotion with capture and check exd8=Q+",
    },
    {
      move: "exd8=R#",
      fen: startFEN,
      expectedFrom: "e7",
      expectedTo: "d8",
      expectedPiece: "P",
      name: "Pawn promotion with capture and checkmate exd8=R#",
    },
    {
      move: "exd8=B+",
      fen: startFEN,
      expectedFrom: "e7",
      expectedTo: "d8",
      expectedPiece: "P",
      name: "Pawn promotion with capture and check exd8=B+",
    },
    {
      move: "exd8=N#",
      fen: startFEN,
      expectedFrom: "e7",
      expectedTo: "d8",
      expectedPiece: "P",
      name: "Pawn promotion with capture and checkmate exd8=N#",
    },

    // En passant with complex combinations
    {
      move: "exd6=Q+",
      fen: startFEN,
      expectedFrom: "e5",
      expectedTo: "d6",
      expectedPiece: "P",
      name: "En passant promotion with check exd6=Q+",
    },
    {
      move: "exd6=R#",
      fen: startFEN,
      expectedFrom: "e5",
      expectedTo: "d6",
      expectedPiece: "P",
      name: "En passant promotion with checkmate exd6=R#",
    },
    {
      move: "exd6=B+",
      fen: startFEN,
      expectedFrom: "e5",
      expectedTo: "d6",
      expectedPiece: "P",
      name: "En passant promotion with check exd6=B+",
    },
    {
      move: "exd6=N#",
      fen: startFEN,
      expectedFrom: "e5",
      expectedTo: "d6",
      expectedPiece: "P",
      name: "En passant promotion with checkmate exd6=N#",
    },

    // Castling with complex combinations
    {
      move: "O-O+",
      fen: startFEN,
      expectedFrom: "e1",
      expectedTo: "g1",
      expectedPiece: "K",
      name: "White kingside castling with check",
    },
    {
      move: "O-O-O#",
      fen: startFEN,
      expectedFrom: "e1",
      expectedTo: "c1",
      expectedPiece: "K",
      name: "White queenside castling with checkmate",
    },

    // Weird edge cases
    {
      move: "N1c3+",
      fen: startFEN,
      expectedFrom: "b1",
      expectedTo: "c3",
      expectedPiece: "N",
      name: "Knight rank disambiguation with check N1c3+",
    },
    {
      move: "N3c3#",
      fen: startFEN,
      expectedFrom: "f3",
      expectedTo: "c3",
      expectedPiece: "N",
      name: "Knight rank disambiguation with checkmate N3c3#",
    },
    {
      move: "R1e4+",
      fen: startFEN,
      expectedFrom: "a1",
      expectedTo: "e4",
      expectedPiece: "R",
      name: "Rook rank disambiguation with check R1e4+",
    },
    {
      move: "R8e4#",
      fen: startFEN,
      expectedFrom: "h1",
      expectedTo: "e4",
      expectedPiece: "R",
      name: "Rook rank disambiguation with checkmate R8e4#",
    },
    {
      move: "B1e4+",
      fen: startFEN,
      expectedFrom: "c1",
      expectedTo: "e4",
      expectedPiece: "B",
      name: "Bishop rank disambiguation with check B1e4+",
    },
    {
      move: "B8e4#",
      fen: startFEN,
      expectedFrom: "f1",
      expectedTo: "e4",
      expectedPiece: "B",
      name: "Bishop rank disambiguation with checkmate B8e4#",
    },
    {
      move: "Q1e4+",
      fen: startFEN,
      expectedFrom: "d1",
      expectedTo: "e4",
      expectedPiece: "Q",
      name: "Queen rank disambiguation with check Q1e4+",
    },
    {
      move: "Q8e4#",
      fen: startFEN,
      expectedFrom: "d1",
      expectedTo: "e4",
      expectedPiece: "Q",
      name: "Queen rank disambiguation with checkmate Q8e4#",
    },

    // File disambiguation with check/mate
    {
      move: "Nbd3+",
      fen: startFEN,
      expectedFrom: "b1",
      expectedTo: "d3",
      expectedPiece: "N",
      name: "Knight file disambiguation with check Nbd3+",
    },
    {
      move: "Nfd3#",
      fen: startFEN,
      expectedFrom: "f3",
      expectedTo: "d3",
      expectedPiece: "N",
      name: "Knight file disambiguation with checkmate Nfd3#",
    },
    {
      move: "Rae4+",
      fen: startFEN,
      expectedFrom: "a1",
      expectedTo: "e4",
      expectedPiece: "R",
      name: "Rook file disambiguation with check Rae4+",
    },
    {
      move: "Rhe4#",
      fen: startFEN,
      expectedFrom: "h1",
      expectedTo: "e4",
      expectedPiece: "R",
      name: "Rook file disambiguation with checkmate Rhe4#",
    },
    {
      move: "Bce4+",
      fen: startFEN,
      expectedFrom: "c1",
      expectedTo: "e4",
      expectedPiece: "B",
      name: "Bishop file disambiguation with check Bce4+",
    },
    {
      move: "Bfe4#",
      fen: startFEN,
      expectedFrom: "f1",
      expectedTo: "e4",
      expectedPiece: "B",
      name: "Bishop file disambiguation with checkmate Bfe4#",
    },
    {
      move: "Qde4+",
      fen: startFEN,
      expectedFrom: "d1",
      expectedTo: "e4",
      expectedPiece: "Q",
      name: "Queen file disambiguation with check Qde4+",
    },
    {
      move: "Qhe4#",
      fen: startFEN,
      expectedFrom: "d1",
      expectedTo: "e4",
      expectedPiece: "Q",
      name: "Queen file disambiguation with checkmate Qhe4#",
    },
  ];

  // Position-aware negative test: move should fail in given FEN
  function testPositionAwareShouldFail(
    move: string,
    fen: string,
    name: string,
  ): boolean {
    const result = parseMove(move, fen);
    return assert(
      result === null,
      `${name} - Expected failure to parse, but got ${JSON.stringify(result)}`,
    );
  }

  let passed = 0;
  let failed = 0;

  for (const test of tests) {
    const success = testMoveParsing(
      test.move,
      test.fen,
      test.expectedFrom,
      test.expectedTo,
      test.expectedPiece,
      test.name,
    );

    if (success) {
      passed++;
    } else {
      failed++;
    }
  }

  // Append the reported failing case
  const reportedFen =
    "rnbqkbnr/p1pppppp/1p6/8/8/5NP1/PPPPPP1P/RNBQKB1R b KQkq - 0 1";
  if (
    testPositionAwareShouldFail(
      "g3",
      reportedFen,
      "Reported case: black to move 'g3' invalid",
    )
  ) {
    passed++;
  } else {
    failed++;
  }

  console.log(`\n📊 Results: ${passed} passed, ${failed} failed`);

  if (failed === 0) {
    console.log("🎉 All tests passed!");
  } else {
    console.log("❌ Some tests failed - check the move parser implementation");
  }
}

// Run tests
runTests();

export { runTests };
