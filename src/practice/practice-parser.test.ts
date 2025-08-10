import { parseOpeningLines, buildPositionMap } from "./practice-parser.js";
// import { parseMove } from "../utils/move-parsing.js";
// import { applyMoveToFEN } from "../utils/fen-manipulation.js";

// Test the parseOpeningLines function
function runParseOpeningLinesTest(): void {
  console.log("Testing parseOpeningLines...");

  const testText = `
1. Nf3 Nf6 2. d4 d5 // Test line 1
1. Nf3 e6 2. d4 c5 // Test line 2
1. Nf3 Nf6 2. d4 e6 3. c4 // Test line 3
`;

  try {
    const lines = parseOpeningLines(testText);
    console.log("Parsed lines:", lines);

    if (lines.length === 3) {
      console.log("✅ Correctly parsed 3 lines");
    } else {
      console.error("❌ Expected 3 lines, got", lines.length);
    }

    // Check that moves are correctly extracted
    const firstLine = lines[0];
    if (firstLine && firstLine.moves.length === 4) {
      console.log("✅ First line has correct number of moves");
    } else {
      console.error("❌ First line has incorrect number of moves");
    }
  } catch (error) {
    console.error("❌ parseOpeningLines test failed:", error);
  }
}

// Test the buildPositionMap function
function runBuildPositionMapTest(): void {
  console.log("Testing buildPositionMap...");

  const testLines = [
    { name: "Test Line 1", moves: ["Nf3", "Nf6", "d4"] },
    { name: "Test Line 2", moves: ["Nf3", "e6", "d4"] },
  ];

  const startingFEN =
    "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

  try {
    const positionMap = buildPositionMap(testLines, startingFEN);
    console.log("Position map built successfully:", positionMap);

    // Test that the initial position has the expected moves
    const initialMoves = positionMap.get(startingFEN);
    if (initialMoves && initialMoves.includes("Nf3")) {
      console.log("✅ Initial position correctly contains Nf3");
    } else {
      console.error("❌ Initial position missing Nf3");
    }
  } catch (error) {
    console.error("❌ buildPositionMap test failed:", error);
  }
}

// Run all tests
function runAllTests(): void {
  console.log("Running practice parser tests...");

  runParseOpeningLinesTest();
  runBuildPositionMapTest();

  console.log("All tests completed.");
}

// Run tests if this file is executed directly
if (typeof window !== "undefined") {
  // Browser environment - run tests after a delay
  setTimeout(runAllTests, 1000);
} else {
  // Node.js environment - run tests immediately
  runAllTests();
}
