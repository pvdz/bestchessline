import { selectComputerMove } from "./practice-game.js";
import { GameState } from "./practice-types.js";

// Mock GameState for testing
function createMockGameState(
  strategy: "random" | "serial" | "adaptive",
): GameState {
  return {
    currentFEN: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
    isPracticeActive: true,
    isHumanTurn: false,
    selectedSquare: null,
    validMoves: [],
    openingLines: [],
    positionMap: new Map<string, string[]>(),
    computerMoveStrategy: strategy,
    maxDepth: 10,
    currentDepth: 0,
    positionHistory: [
      "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
    ],
    moveHistory: [],
    pinnedPosition: null,
    pinnedDepth: 0,
    statistics: {
      correctMoves: 0,
      totalMoves: 0,
      accuracy: 0,
      lineAttempts: {},
    },
  };
}

// Test computer move selection strategies
function testComputerMoveSelection() {
  console.log("=== Testing Computer Move Selection ===");

  const availableMoves = ["Nf3", "d4", "e4", "c4"];

  // Test serial strategy (should always pick first move)
  const serialState = createMockGameState("serial");
  const serialMove = selectComputerMove(availableMoves, serialState);
  console.log(`Serial strategy selected: ${serialMove} (expected: Nf3)`);

  // Test random strategy (should pick different moves)
  const randomState = createMockGameState("random");
  const randomMove1 = selectComputerMove(availableMoves, randomState);
  const randomMove2 = selectComputerMove(availableMoves, randomState);
  console.log(`Random strategy selections: ${randomMove1}, ${randomMove2}`);

  // Test adaptive strategy (currently same as random)
  const adaptiveState = createMockGameState("adaptive");
  const adaptiveMove = selectComputerMove(availableMoves, adaptiveState);
  console.log(`Adaptive strategy selected: ${adaptiveMove}`);

  console.log("Computer move selection tests completed!");
}

// Run tests
testComputerMoveSelection();
