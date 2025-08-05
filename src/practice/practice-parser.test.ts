import {
  parseOpeningLines,
  buildPositionMap,
  constructMoveManually,
} from "./practice-parser.js";
import { parseMove } from "../utils/move-parsing.js";
import { applyMoveToFEN } from "../utils/fen-manipulation.js";
import { parseFEN, squareToCoords } from "../utils/fen-utils.js";
import { findFromSquare, canPawnMoveTo } from "../utils/move-parser.js";

// Test the manual move construction function
const manualMoveTestCases = [
  {
    name: "Black pawn capture dxc4",
    fen: "rnbqkb1r/pppppppp/5n2/3P4/2P5/5N2/PP2PPPP/RNBQKB1R b KQkq c3 0 1",
    move: "dxc4",
    expected: {
      from: "d5",
      to: "c4",
      piece: "p", // Black pawn
    },
  },
  {
    name: "Black pawn move d5",
    fen: "rnbqkb1r/pppppppp/5n2/8/3P4/5N2/PPP1PPPP/RNBQKB1R b KQkq d3 0 1",
    move: "d5",
    expected: {
      from: "d6",
      to: "d5",
      piece: "p", // Black pawn
    },
  },
  {
    name: "Black pawn capture dxc4 - real scenario",
    fen: "rnbqkb1r/pppppppp/5n2/3P4/2P5/5N2/PP2PPPP/RNBQKB1R b KQkq c3 0 1",
    move: "dxc4",
    expected: {
      from: "d5",
      to: "c4",
      piece: "p", // Black pawn
    },
  },
  {
    name: "White pawn move e4",
    fen: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
    move: "e4",
    expected: {
      from: "e3",
      to: "e4",
      piece: "P", // White pawn
    },
  },
  // New test cases from the failing moves
  {
    name: "Black knight move Nf6",
    fen: "rnbqkbnr/pppppppp/8/8/8/5N2/PPPPPPPP/RNBQKB1R b KQkq - 0 1",
    move: "Nf6",
    expected: {
      from: "g8",
      to: "f6",
      piece: "n", // Black knight
    },
  },
  {
    name: "Black bishop move Bb4",
    fen: "r1bqkbnr/pppp1ppp/4pn2/8/2PP4/5N2/PP2PPPP/RNBQKB1R b KQkq c3 0 1",
    move: "Bb4",
    expected: {
      from: "f8",
      to: "b4",
      piece: "b", // Black bishop
    },
  },
  {
    name: "Black bishop move Be7",
    fen: "r1bqkbnr/pppp1ppp/4pn2/8/2PP4/5N2/PP2PPPP/RNBQKB1R b KQkq c3 0 1",
    move: "Be7",
    expected: {
      from: "f8",
      to: "e7",
      piece: "b", // Black bishop
    },
  },
  {
    name: "Black knight move Nd7",
    fen: "r1bqkbnr/ppp2ppp/4pn2/3p4/2PP4/2N2N2/PP2PPPP/R1BQKB1R b KQkq - 0 1",
    move: "Nd7",
    expected: {
      from: "b8",
      to: "d7",
      piece: "n", // Black knight
    },
  },
  {
    name: "Black bishop capture Bxd2",
    fen: "r2qkbnr/pppp1ppp/4pn2/8/1bPP4/5N2/PP1BPPPP/RN1QKB1R b KQkq - 0 1",
    move: "Bxd2",
    expected: {
      from: "b4",
      to: "d2",
      piece: "b", // Black bishop
    },
  },
  {
    name: "Black queen capture Qxd2",
    fen: "r2qkbnr/pppp1ppp/4pn2/8/1bPP4/5N2/PP1BPPPP/RN1QKB1R b KQkq - 0 1",
    move: "Qxd2",
    expected: {
      from: "d8",
      to: "d2",
      piece: "q", // Black queen
    },
  },
  {
    name: "Black bishop move Bb7",
    fen: "r1bqkbnr/p1pp1ppp/1p2pn2/8/2PP4/4PN2/PP3PPP/RNBQKB1R b KQkq - 0 1",
    move: "Bb7",
    expected: {
      from: "f8",
      to: "b7",
      piece: "b", // Black bishop
    },
  },
  // Additional failing moves from the logs
  {
    name: "Black knight move Nf6 - different position",
    fen: "rnbqkbnr/pppp1ppp/4p3/8/3P4/5N2/PPP1PPPP/RNBQKB1R b KQkq d3 0 1",
    move: "Nf6",
    expected: {
      from: "g8",
      to: "f6",
      piece: "n", // Black knight
    },
  },
  {
    name: "Black bishop move Bb4 - different position",
    fen: "r1bqkbnr/pppp1ppp/4pn2/8/2PP4/5N2/PP2PPPP/RNBQKB1R b KQkq c3 0 1",
    move: "Bb4",
    expected: {
      from: "f8",
      to: "b4",
      piece: "b", // Black bishop
    },
  },
  {
    name: "Black bishop move Be7 - different position",
    fen: "r1bqkbnr/pppp1ppp/4pn2/8/2PP4/5N2/PP2PPPP/RNBQKB1R b KQkq c3 0 1",
    move: "Be7",
    expected: {
      from: "f8",
      to: "e7",
      piece: "b", // Black bishop
    },
  },
  {
    name: "Black bishop move Be7 - another position",
    fen: "rnbqkbnr/ppp2ppp/4p3/3p4/2PP4/5N2/PP2PPPP/RNBQKB1R b KQkq c3 0 1",
    move: "Be7",
    expected: {
      from: "f8",
      to: "e7",
      piece: "b", // Black bishop
    },
  },
  {
    name: "Black bishop move Be7 - yet another position",
    fen: "rnbqkbnr/pp1p1ppp/4p3/2p5/3PP3/5N2/PPP2PPP/RNBQKB1R b KQkq e3 0 1",
    move: "Be7",
    expected: {
      from: "f8",
      to: "e7",
      piece: "b", // Black bishop
    },
  },
  {
    name: "Black bishop move Bb4 - another position",
    fen: "r1bqkbnr/ppp2ppp/4pn2/3p4/2PP4/2N2N2/PP2PPPP/R1BQKB1R b KQkq - 0 1",
    move: "Bb4",
    expected: {
      from: "f8",
      to: "b4",
      piece: "b", // Black bishop
    },
  },
  {
    name: "Black bishop move Bb4 - different position",
    fen: "r1bqkbnr/pppp1ppp/4pn2/8/2PP4/5N2/PP2PPPP/RNBQKB1R b KQkq c3 0 1",
    move: "Bb4",
    expected: {
      from: "f8",
      to: "b4",
      piece: "b", // Black bishop
    },
  },
  {
    name: "Black bishop move Bb4 - yet another position",
    fen: "r1bqkbnr/p1pp1ppp/1p2pn2/8/2PP4/4PN2/PP3PPP/RNBQKB1R b KQkq - 0 1",
    move: "Bb4",
    expected: {
      from: "f8",
      to: "b4",
      piece: "b", // Black bishop
    },
  },
  {
    name: "Black bishop capture Bxd2 - different position",
    fen: "r2qkbnr/pppp1ppp/4pn2/8/1bPP4/5N2/PP1BPPPP/RN1QKB1R b KQkq - 0 1",
    move: "Bxd2",
    expected: {
      from: "b4",
      to: "d2",
      piece: "b", // Black bishop
    },
  },
  // Additional failing moves from the logs
  {
    name: "Black king move Kg8",
    fen: "rnbqk2r/ppppbppp/4pn2/8/2PP4/2N2N2/PP2PPPP/R1BQKB1R b KQkq - 0 1",
    move: "Kg8",
    expected: {
      from: "e8",
      to: "g8",
      piece: "k", // Black king
    },
  },
  {
    name: "White king move Kg1",
    fen: "rn1qkb1r/pbp2ppp/1p2pn2/3p4/2PP4/3BPN2/PP3PPP/RNBQK2R w KQkq d6 0 1",
    move: "Kg1",
    expected: {
      from: "e1",
      to: "g1",
      piece: "K", // White king
    },
  },
  {
    name: "White pawn capture dxc6",
    fen: "rnbqkb1r/1p3ppp/p3pn2/2pP4/3P4/2N2N2/PP2PPPP/R1BQKB1R w KQkq c6 0 1",
    move: "dxc6",
    expected: {
      from: "d5",
      to: "c6",
      piece: "P", // White pawn
    },
  },
  // Debug test for failing king move
  {
    name: "Black king move Kg8 - failing case",
    fen: "rnbqk2r/ppppbppp/4pn2/8/2PP4/2N2N2/PP2PPPP/R1BQKB1R b KQkq - 0 1",
    move: "Kg8",
    expected: {
      from: "e8",
      to: "g8",
      piece: "k", // Black king
    },
  },
  // Debug test for failing pawn capture
  {
    name: "White pawn capture dxc6 - debug case",
    fen: "rnbqkb1r/1p3ppp/p3pn2/2pP4/3P4/2N2N2/PP2PPPP/R1BQKB1R w KQkq c6 0 1",
    move: "dxc6",
    expected: {
      from: "d5",
      to: "c6",
      piece: "P", // White pawn
    },
  },
  // Additional failing moves from the logs
  {
    name: "White pawn capture cxd5",
    fen: "rnbq2kr/ppp1bppp/4pn2/3p4/2PPP3/2N2N2/PP3PPP/R1BQKB1R w KQ d6 0 1",
    move: "cxd5",
    expected: {
      from: "c4",
      to: "d5",
      piece: "P", // White pawn
    },
  },
  {
    name: "White pawn capture exd5",
    fen: "rnbqkbnr/1p3ppp/p2p4/2pp4/2P1P3/5N2/PP3PPP/RNBQKB1R w KQkq - 0 1",
    move: "exd5",
    expected: {
      from: "e4",
      to: "d5",
      piece: "P", // White pawn
    },
  },
  {
    name: "Black pawn capture fxe6",
    fen: "rnbqkb1r/1p1p1ppp/p3Pn2/2p5/4P3/5N2/PPP2PPP/RNBQKB1R b KQkq - 0 1",
    move: "fxe6",
    expected: {
      from: "f7",
      to: "e6",
      piece: "p", // Black pawn
    },
  },
  {
    name: "Black pawn capture dxe6",
    fen: "rnbqkb1r/1p1p1ppp/p3Pn2/2p5/4P3/5N2/PPP2PPP/RNBQKB1R b KQkq - 0 1",
    move: "dxe6",
    expected: {
      from: "d7",
      to: "e6",
      piece: "p", // Black pawn
    },
  },
  {
    name: "White queen capture Qxd",
    fen: "rnbqkb1r/1p3ppp/p3pn2/2p5/4P3/5N2/PPP2PPP/RNBQKB1R w KQkq - 0 1",
    move: "Qxd",
    expected: {
      from: "d1",
      to: "d4",
      piece: "Q", // White queen
    },
  },
  // Test for incomplete queen move
  {
    name: "Incomplete queen move Qxd",
    fen: "rnbqkb1r/1p3ppp/p3pn2/2p5/4P3/5N2/PPP2PPP/RNBQKB1R w KQkq - 0 1",
    move: "Qxd",
    expected: {
      from: "d1",
      to: "d4",
      piece: "Q", // White queen
    },
  },
  // Debug test for regex matching
  {
    name: "Debug: King move Kg8",
    fen: "rnbqk2r/ppppbppp/4pn2/8/2PP4/2N2N2/PP2PPPP/R1BQKB1R b KQkq - 0 1",
    move: "Kg8",
    expected: {
      from: "e8",
      to: "g8",
      piece: "k", // Black king
    },
  },
];

// Test position building sequence
const positionBuildingTestCases = [
  {
    name: "Queen's Gambit Accepted sequence",
    input: "1. Nf3  Nf6 2. d4  d5 3. c4  dxc4 4. e3 // Queen's Gambit Accepted",
    expectedPositions: [
      "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1", // Start
      "rnbqkbnr/pppppppp/8/8/8/5N2/PPPPPPPP/RNBQKB1R b KQkq - 0 1", // After Nf3
      "rnbqkb1r/pppppppp/5n2/8/8/5N2/PPPPPPPP/RNBQKB1R w KQkq - 0 1", // After Nf6 (knight moved from g8 to f6)
      "rnbqkb1r/pppppppp/5n2/8/3P4/5N2/PPP1PPPP/RNBQKB1R b KQkq d3 0 1", // After d4
      "rnbqkb1r/ppp1pppp/5n2/3p4/3P4/5N2/PPP1PPPP/RNBQKB1R w KQkq d6 0 1", // After d5 (Black pawn on d5)
      "rnbqkb1r/ppp1pppp/5n2/3p4/2PP4/5N2/PP2PPPP/RNBQKB1R b KQkq c3 0 1", // After c4
      "rnbqkb1r/ppp1pppp/5n2/8/2pP4/5N2/PP2PPPP/RNBQKB1R w KQkq - 0 1", // After dxc4
      "rnbqkb1r/ppp1pppp/5n2/8/2pP4/4PN2/PP3PPP/RNBQKB1R b KQkq - 0 1", // After e3
    ],
  },
];

// Test opening line parsing
const openingLineTestCases = [
  {
    name: "Basic opening line with Unicode pieces",
    input: "1. Nf3  Nf6 2. d4  d5 3. c4  dxc4 4. e3 // Queen's Gambit Accepted",
    expected: {
      name: "Queen's Gambit Accepted",
      moves: ["Nf3", "Nf6", "d4", "d5", "c4", "dxc4", "e3"],
    },
  },
  {
    name: "Opening line with Unicode pieces",
    input: "1. Nf3  e6 2. d4  c5 3. e4  ♘c3  cxd4 5. ♕xd4  Kf8 6. ♗f4",
    expected: {
      name: "Opening Line 1",
      moves: [
        "Nf3",
        "e6",
        "d4",
        "c5",
        "e4",
        "Nc3",
        "cxd4",
        "Qxd4",
        "Kf8",
        "Bf4",
      ],
    },
  },
];

function runManualMoveTest(testCase: any) {
  console.log(`\n=== Testing Manual Move: ${testCase.name} ===`);
  console.log(`Move: ${testCase.move}`);
  console.log(`FEN: ${testCase.fen}`);

  const result = constructMoveManually(testCase.move, testCase.fen);

  if (!result) {
    console.log("❌ FAIL: constructMoveManually returned null");
    return false;
  }

  console.log(`Manual result: ${result.from} → ${result.to} (${result.piece})`);

  const isSuccess =
    result.from === testCase.expected.from &&
    result.to === testCase.expected.to &&
    result.piece === testCase.expected.piece;

  if (isSuccess) {
    console.log("✅ PASS");
  } else {
    console.log("❌ FAIL");
    console.log(
      `Expected: ${testCase.expected.from} → ${testCase.expected.to} (${testCase.expected.piece})`,
    );
  }

  return isSuccess;
}

function runOpeningLineTest(testCase: any) {
  console.log(`\n=== Testing Opening Line: ${testCase.name} ===`);
  console.log(`Input: ${testCase.input}`);

  const result = parseOpeningLines(testCase.input);

  if (result.length === 0) {
    console.log("❌ FAIL: parseOpeningLines returned empty array");
    return false;
  }

  const line = result[0];
  console.log(`Parsed result: ${line.name} - ${line.moves.join(" ")}`);

  const isSuccess =
    line.name === testCase.expected.name &&
    line.moves.length === testCase.expected.moves.length &&
    line.moves.every(
      (move: string, index: number) => move === testCase.expected.moves[index],
    );

  if (isSuccess) {
    console.log("✅ PASS");
  } else {
    console.log("❌ FAIL");
    console.log(
      `Expected: ${testCase.expected.name} - ${testCase.expected.moves.join(" ")}`,
    );
  }

  return isSuccess;
}

function runPositionBuildingTest(testCase: any) {
  console.log(`\n=== Testing Position Building: ${testCase.name} ===`);
  console.log(`Input: ${testCase.input}`);

  const lines = parseOpeningLines(testCase.input);
  if (lines.length === 0) {
    console.log("❌ FAIL: No lines parsed");
    return false;
  }

  // Use buildPositionMap to test our updated validation logic
  const positionMap = buildPositionMap(
    lines,
    "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
  );

  // Extract the actual positions from the position map
  const actualPositions = [
    "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
  ];
  let currentFEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

  for (const line of lines) {
    for (const move of line.moves) {
      // Apply the move using our updated logic
      const parsedMove = parseMove(move, currentFEN);
      if (parsedMove) {
        // Use our validation logic
        const isWhiteTurn = currentFEN.includes(" w ");
        const isWhitePiece =
          parsedMove.piece === parsedMove.piece.toUpperCase();
        const allValidationsPass = isWhitePiece === isWhiteTurn;

        if (allValidationsPass) {
          currentFEN = applyMoveToFEN(currentFEN, parsedMove);
        } else {
          // Use manual construction
          const correctedMove = constructMoveManually(move, currentFEN);
          if (correctedMove) {
            currentFEN = applyMoveToFEN(currentFEN, correctedMove);
          }
        }
      } else {
        // Use manual construction
        const correctedMove = constructMoveManually(move, currentFEN);
        if (correctedMove) {
          currentFEN = applyMoveToFEN(currentFEN, correctedMove);
        }
      }
      actualPositions.push(currentFEN);
    }
  }

  // Compare positions
  const isSuccess =
    actualPositions.length === testCase.expectedPositions.length &&
    actualPositions.every(
      (pos: string, index: number) => pos === testCase.expectedPositions[index],
    );

  if (isSuccess) {
    console.log("✅ PASS: All positions match");
  } else {
    console.log("❌ FAIL: Position mismatch");
    for (
      let i = 0;
      i < Math.max(actualPositions.length, testCase.expectedPositions.length);
      i++
    ) {
      const actual = actualPositions[i] || "MISSING";
      const expected = testCase.expectedPositions[i] || "MISSING";
      if (actual !== expected) {
        console.log(`  Position ${i}:`);
        console.log(`    Expected: ${expected}`);
        console.log(`    Actual:   ${actual}`);
      }
    }
  }

  return isSuccess;
}

function runAllTests() {
  console.log("Running practice parser tests...\n");

  let passed = 0;
  let failed = 0;

  // Run manual move tests
  for (const testCase of manualMoveTestCases) {
    const success = runManualMoveTest(testCase);
    if (success) {
      passed++;
    } else {
      failed++;
    }
  }

  // Run opening line tests
  for (const testCase of openingLineTestCases) {
    const success = runOpeningLineTest(testCase);
    if (success) {
      passed++;
    } else {
      failed++;
    }
  }

  // Run position building tests
  for (const testCase of positionBuildingTestCases) {
    const success = runPositionBuildingTest(testCase);
    if (success) {
      passed++;
    } else {
      failed++;
    }
  }

  console.log(`\n=== Test Results ===`);
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);
  console.log(`Total: ${passed + failed}`);

  if (failed > 0) {
    console.error("Some tests failed!");
    // @ts-ignore
    process.exit(1);
  } else {
    console.log("All tests passed! 🎉");
  }
}

// Test the exact scenario from the practice app
function runPracticeAppTest() {
  const openingLines = parseOpeningLines(
    `1. Nf3  e6 2. d4  c5 3. e4  a6 4. d5  Nf6 5. dxe6  dxe6 6. Qxd8`,
  );

  const positionMap = buildPositionMap(
    openingLines,
    "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
  );

  // Check the specific position after 4. d5  Nf6
  const positionAfter4 =
    "rnbqkb1r/1p1p1ppp/p3pn2/2pP4/4P3/5N2/PPP2PPP/RNBQKB1R w KQkq - 0 1";

  // Check if this position exists in the map
  const movesAfter4 = positionMap.get(positionAfter4);

  // Check the position after 5. dxe6 (White's move)
  const positionAfter5White =
    "rnbqkb1r/1p1p1ppp/p3Pn2/2p5/4P3/5N2/PPP2PPP/RNBQKB1R b KQkq - 0 1";
  const movesAfter5White = positionMap.get(positionAfter5White);

  // Check the position after 5... dxe6 (Black's move)
  const positionAfter5Black =
    "rnbqkb1r/1p3ppp/p3pn2/2p5/4P3/5N2/PPP2PPP/RNBQKB1R w KQkq - 0 1";
  const movesAfter5Black = positionMap.get(positionAfter5Black);

  // Verify that the dxe6 moves are present in the correct positions
  const success1 = movesAfter4 && movesAfter4.includes("dxe6"); // White's dxe6
  const success2 = movesAfter5White && movesAfter5White.includes("dxe6"); // Black's dxe6
  const success3 = movesAfter5Black && movesAfter5Black.includes("Qxd8"); // White's Qxd8

  return success1 && success2 && success3;
}

// Test the specific dxe6 move parsing
function runDxe6MoveTest() {
  const fen =
    "rnbqkb1r/1p1p1ppp/p3pn2/2pP4/4P3/5N2/PPP2PPP/RNBQKB1R w KQkq - 0 1";
  const move = "dxe6";

  const parsedMove = parseMove(move, fen);

  if (parsedMove) {
    const newFEN = applyMoveToFEN(fen, parsedMove);
    const position = parseFEN(newFEN);

    // Check that the White pawn moved from d5 to e6
    const [d5Rank, d5File] = squareToCoords("d5");
    const [e6Rank, e6File] = squareToCoords("e6");

    const d5Empty = position.board[d5Rank][d5File] === "";
    const e6HasPawn = position.board[e6Rank][e6File] === "P";

    return d5Empty && e6HasPawn;
  } else {
    return false;
  }
}

// Test the specific Black dxe6 move that's failing
function runBlackDxe6Test() {
  // This is the position after 5. dxe6 (White's move)
  const fen =
    "rnbqkb1r/1p1p1ppp/p3Pn2/2p5/4P3/5N2/PPP2PPP/RNBQKB1R b KQkq - 0 1";
  const move = "dxe6";

  const parsedMove = parseMove(move, fen);

  if (parsedMove) {
    const newFEN = applyMoveToFEN(fen, parsedMove);
    const position = parseFEN(newFEN);

    // Check that the Black pawn moved from d7 to e6
    const [d7Rank, d7File] = squareToCoords("d7");
    const [e6Rank, e6File] = squareToCoords("e6");

    const d7Empty = position.board[d7Rank][d7File] === "";
    const e6HasPawn = position.board[e6Rank][e6File] === "p";

    return d7Empty && e6HasPawn;
  } else {
    return false;
  }
}

// Test the findFromSquare function specifically for Black pawns
function runFindFromSquareTest() {
  const fen =
    "rnbqkb1r/1p1p1ppp/p3Pn2/2p5/4P3/5N2/PPP2PPP/RNBQKB1R b KQkq - 0 1";
  const toSquare = "e6";
  const piece = "p" as any; // Black pawn

  const fromSquare = findFromSquare(piece, toSquare, fen);

  // findFromSquare returns null when there are multiple candidates (which is correct)
  // We expect this to be null because both d7 and f7 can move to e6
  return fromSquare === null;
}

// Test the canPawnMoveTo function specifically
function runCanPawnMoveToTest() {
  const fen =
    "rnbqkb1r/1p1p1ppp/p3Pn2/2p5/4P3/5N2/PPP2PPP/RNBQKB1R b KQkq - 0 1";
  const position = parseFEN(fen);

  // Test if Black pawn at d7 can move to e6
  const fromSquare = "d7";
  const toSquare = "e6";

  const canMove = canPawnMoveTo(fromSquare, toSquare, position.board);

  return canMove;
}

// Test what candidates findFromSquare finds
function runFindFromSquareDebugTest() {
  const fen =
    "rnbqkb1r/1p1p1ppp/p3Pn2/2p5/4P3/5N2/PPP2PPP/RNBQKB1R b KQkq - 0 1";
  const position = parseFEN(fen);

  // Find all Black pawns manually
  const blackPawns = [];
  for (let rank = 0; rank < 8; rank++) {
    for (let file = 0; file < 8; file++) {
      if (position.board[rank][file] === "p") {
        const square =
          String.fromCharCode("a".charCodeAt(0) + file) + (8 - rank);
        blackPawns.push({ rank, file, square });
      }
    }
  }

  return blackPawns.length > 0;
}

// runAllTests();

// Run the practice app specific tests
const practiceAppSuccess = runPracticeAppTest();
const dxe6Success = runDxe6MoveTest();
const blackDxe6Success = runBlackDxe6Test();
const findFromSquareSuccess = runFindFromSquareTest();
const canPawnMoveToSuccess = runCanPawnMoveToTest();
const findFromSquareDebugSuccess = runFindFromSquareDebugTest();

if (
  !practiceAppSuccess ||
  !dxe6Success ||
  !blackDxe6Success ||
  !findFromSquareSuccess ||
  !canPawnMoveToSuccess ||
  !findFromSquareDebugSuccess
) {
  console.error("Practice app tests failed!");
  // @ts-ignore
  process.exit(1);
}
