import { parseMove } from "./move-parsing.js";

interface TestCase {
  name: string;
  move: string;
  fen: string;
  expected: {
    from: string;
    to: string;
    piece: string;
  };
}

// Test the specific failing case
const testCases = [
  {
    name: "g3 pawn move from black's perspective",
    fen: "rnbqkbnr/ppp1pppp/8/3p4/8/8/PPPPPPPP/RNBQKBNR b KQkq d6 0 1",
    move: "g3",
    expected: {
      from: "g2",
      to: "g3",
      piece: "P", // White pawn
    },
  },
  {
    name: "g3 pawn move from white's perspective",
    fen: "rnbqkbnr/ppp1pppp/8/3p4/8/8/PPPPPPPP/RNBQKBNR w KQkq d6 0 1",
    move: "g3",
    expected: {
      from: "g2",
      to: "g3",
      piece: "P", // White pawn
    },
  },
  {
    name: "Basic pawn move e4",
    fen: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
    move: "e4",
    expected: {
      from: "e2",
      to: "e4",
      piece: "P", // White pawn
    },
  },
  {
    name: "Basic knight move Nf3",
    fen: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
    move: "Nf3",
    expected: {
      from: "g1",
      to: "f3",
      piece: "N", // White knight
    },
  },
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
];

function runTest(testCase: TestCase) {
  console.log(`\n=== Testing: ${testCase.name} ===`);
  console.log(`Move: ${testCase.move}`);
  console.log(`FEN: ${testCase.fen}`);

  const result = parseMove(testCase.move, testCase.fen);

  if (!result) {
    console.log("❌ FAIL: parseMove returned null");
    return false;
  }

  console.log(`Parsed result: ${result.from} → ${result.to} (${result.piece})`);

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

function runAllTests() {
  console.log("Running parseMove tests...\n");

  let passed = 0;
  let failed = 0;

  for (const testCase of testCases) {
    const success = runTest(testCase);
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
    process.exitCode = 1;
  }
}

runAllTests();
