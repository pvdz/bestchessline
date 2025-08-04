import { applyMoveToFEN } from "./fen-manipulation.js";
import { parseMove } from "./move-parsing.js";
// Test the specific case from the debug output
const testCase = {
  name: "Sequential move application - c6 after Nf6",
  initialFEN: "rnbqkbnr/pppppppp/8/8/8/5N2/PPPPPPPP/RNBQKB1R b KQkq - 0 1",
  moves: ["Nf6", "c6"],
  expectedFENs: [
    "rnbqkbnr/pppppppp/8/8/8/5N2/PPPPPPPP/RNBQKB1R b KQkq - 0 1", // Initial
    "rnbqkb1r/pppppppp/5n2/8/8/5N2/PPPPPPPP/RNBQKB1R w KQkq - 0 1", // After Nf6
    "rnbqkb1r/pp1ppppp/2p2n2/8/8/5N2/PPPPPPPP/RNBQKB1R b KQkq - 0 1", // After c6
  ],
};
function runTest() {
  console.log(`\n=== Testing: ${testCase.name} ===`);
  console.log(`Initial FEN: ${testCase.initialFEN}`);
  console.log(`Moves: ${testCase.moves.join(", ")}`);
  let currentFEN = testCase.initialFEN;
  const results = [currentFEN];
  for (let i = 0; i < testCase.moves.length; i++) {
    const move = testCase.moves[i];
    console.log(`\n--- Applying move ${i + 1}: ${move} ---`);
    console.log(`Current FEN: ${currentFEN}`);
    // Parse the move
    const parsedMove = parseMove(move, currentFEN);
    if (!parsedMove) {
      console.log(`❌ FAIL: Could not parse move ${move}`);
      return false;
    }
    console.log(
      `Parsed move: ${parsedMove.from} → ${parsedMove.to} (${parsedMove.piece})`,
    );
    // Apply the move
    const was = currentFEN;
    currentFEN = applyMoveToFEN(currentFEN, parsedMove);
    results.push(currentFEN);
    console.log(
      `FEN after applying move: ${move} to [${was}] is [${currentFEN}]`,
    );
    // Check if the result matches expected
    const expectedFEN = testCase.expectedFENs[i + 1];
    if (currentFEN === expectedFEN) {
      console.log(`✅ PASS: FEN matches expected`);
    } else {
      console.log(`❌ FAIL: FEN does not match expected`);
      console.log(`Expected: ${expectedFEN}`);
      console.log(`Actual:   ${currentFEN}`);
      return false;
    }
  }
  console.log(`\n✅ ALL TESTS PASSED`);
  console.log(`Final FEN: ${currentFEN}`);
  return true;
}
function runAllTests() {
  console.log("Running sequential move application tests...\n");
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
//# sourceMappingURL=line-fisher-results.test.js.map
