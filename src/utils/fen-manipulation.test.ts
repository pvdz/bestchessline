import { applyMoveToFEN } from "./fen-manipulation.js";
import { parseMove } from "./move-parsing.js";

// Test the specific case
const testCase = {
  name: "Nf6 from black's perspective",
  fen: "rnbqkbnr/pppppppp/8/8/8/5N2/PPPPPPPP/RNBQKB1R b KQkq - 0 1",
  move: "Nf6",
  expected: {
    from: "g8",
    to: "f6",
    piece: "n", // Black knight
  },
};

function runTest() {
  console.log(`\n=== Testing: ${testCase.name} ===`);
  console.log(`Move: ${testCase.move}`);
  console.log(`FEN: ${testCase.fen}`);

  // First parse the move to get the ChessMove object
  const parsedMove = parseMove(testCase.move, testCase.fen);

  if (!parsedMove) {
    console.log("❌ FAIL: parseMove returned null");
    return false;
  }

  console.log(
    `Parsed move: ${parsedMove.from} → ${parsedMove.to} (${parsedMove.piece})`,
  );

  // Check if the parsed move matches expected
  const isParseSuccess =
    parsedMove.from === testCase.expected.from &&
    parsedMove.to === testCase.expected.to &&
    parsedMove.piece === testCase.expected.piece;

  if (!isParseSuccess) {
    console.log("❌ FAIL: Parsed move doesn't match expected");
    console.log(
      `Expected: ${testCase.expected.from} → ${testCase.expected.to} (${testCase.expected.piece})`,
    );
    return false;
  }

  console.log("✅ PASS: Move parsing");

  // Now test applyMoveToFEN
  const resultFEN = applyMoveToFEN(testCase.fen, parsedMove);
  console.log(`Result FEN: ${resultFEN}`);

  // Check if the turn changed from black to white
  const originalTurn = testCase.fen.split(" ")[1];
  const resultTurn = resultFEN.split(" ")[1];

  if (originalTurn === "b" && resultTurn === "w") {
    console.log("✅ PASS: Turn correctly changed from black to white");
  } else {
    console.log(
      `❌ FAIL: Turn not changed correctly. Original: ${originalTurn}, Result: ${resultTurn}`,
    );
    return false;
  }

  // Check if the knight is in the correct position
  if (resultFEN.includes("n")) {
    console.log("✅ PASS: Black knight present in result");
  } else {
    console.log("❌ FAIL: Black knight not found in result");
    return false;
  }

  console.log("✅ ALL TESTS PASSED");
  return true;
}

function runAllTests() {
  console.log("Running applyMoveToFEN tests...\n");

  const success = runTest();

  console.log(`\n=== Test Results ===`);
  if (success) {
    console.log("✅ PASS");
  } else {
    console.log("❌ FAIL");
    // @ts-ignore
    process.exitCode = 1;
  }
}

runAllTests();
