import type { LineFisherState, OneFishLine } from "../line_fisher.js";
import {
  verifyFishLineNewState,
  convertLineFisherStateToFishLineNewState,
  convertFishLineNewStateToLineFisherState,
  createInitialFishLineNewState,
} from "../line_fisher.js";

// ============================================================================
// ONE FISH LINE TESTING AND DEMONSTRATION
// ============================================================================

/**
 * Test the OneFishLine verification system
 */
export const testOneFishLineSystem = (): void => {
  console.log("=== ONE FISH LINE SYSTEM TEST ===");

  // Create a sample LineFisherState
  const sampleLineFisherState: LineFisherState = {
    isAnalyzing: false,
    config: {
      initiatorMoves: ["Nf3", "g3"],
      responderMoveCounts: [2, 3],
      maxDepth: 3,
      threads: 4,
      defaultResponderCount: 3,
      rootFEN: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
      baselineScore: 0.5,
      baselineMoves: [
        { move: "Nf3", score: 0.5 },
        { move: "e4", score: 0.3 },
      ],
    },
    progress: {
      totalNodes: 10,
      processedNodes: 5,
      totalLines: 3,
      completedLines: 2,
      currentPosition:
        "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
      currentAction: "Ready",
      eventsPerSecond: 0,
      totalEvents: 0,
      startTime: 0,
    },
    results: [
      {
        lineIndex: 0,
        sans: ["Nf3", "d5", "g3"],
        scores: [0.5, 0.3, 0.2],
        deltas: [0.5, -0.2, -0.1],
        notation: "Nf3 d5 g3",
        isComplete: true,
        isDone: true,
        isTransposition: false,
        updateCount: 1,
      },
      {
        lineIndex: 1,
        sans: ["Nf3", "e5", "g3"],
        scores: [0.4, 0.6, 0.5],
        deltas: [0.4, 0.2, -0.1],
        notation: "Nf3 e5 g3",
        isComplete: true,
        isDone: true,
        isTransposition: false,
        updateCount: 1,
      },
    ],
    analyzedPositions: new Set([
      "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
      "rnbqkbnr/pppppppp/8/3p4/8/8/PPPPPPPP/RNBQKBNR b KQkq - 0 1",
      "rnbqkbnr/pppppppp/8/3p4/6P1/8/PPPPPP1P/RNBQKBNR w KQkq - 0 1",
    ]),
    analysisQueue: [],
    isComplete: false,
    rootNodes: [],
  };

  // Convert to FishLineNewState
  const fishState = convertLineFisherStateToFishLineNewState(
    sampleLineFisherState,
  );
  console.log("Converted to FishLineNewState:", fishState);

  // Verify the conversion
  const verification = verifyFishLineNewState(fishState, sampleLineFisherState);
  console.log("Verification result:", verification);

  // Convert back to LineFisherState
  const convertedBack = convertFishLineNewStateToLineFisherState(fishState);
  console.log("Converted back to LineFisherState:", convertedBack);

  // Test with empty state
  const emptyFishState = createInitialFishLineNewState();
  console.log("Empty FishLineNewState:", emptyFishState);

  // Test verification with empty states
  const emptyLineFisherState: LineFisherState = {
    isAnalyzing: false,
    config: {
      initiatorMoves: [],
      responderMoveCounts: [2, 2, 2, 2, 2],
      maxDepth: 3,
      threads: 4,
      defaultResponderCount: 3,
      rootFEN: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
    },
    progress: {
      totalNodes: 0,
      processedNodes: 0,
      totalLines: 0,
      completedLines: 0,
      currentPosition: "",
      currentAction: "Ready",
      eventsPerSecond: 0,
      totalEvents: 0,
      startTime: 0,
    },
    results: [],
    analyzedPositions: new Set(),
    analysisQueue: [],
    isComplete: false,
    rootNodes: [],
  };

  const emptyVerification = verifyFishLineNewState(
    emptyFishState,
    emptyLineFisherState,
  );
  console.log("Empty state verification:", emptyVerification);

  console.log("=== ONE FISH LINE SYSTEM TEST COMPLETE ===");
};

/**
 * Demonstrate OneFishLine structure
 */
export const demonstrateOneFishLine = (): void => {
  console.log("=== ONE FISH LINE DEMONSTRATION ===");

  const sampleLine: OneFishLine = {
    sans: ["Nf3", "d5", "g3", "Bg7"],
    score: 0.2,
    isFull: true,
    isDone: true,
    isTransposition: false,
  };

  console.log("Sample OneFishLine:", sampleLine);
  console.log("Line notation:", sampleLine.sans.join(" "));
  console.log("Final score:", sampleLine.score);
  console.log("Is complete:", sampleLine.isFull);
  console.log("Is done:", sampleLine.isDone);
  console.log("Is transposition:", sampleLine.isTransposition);

  console.log("=== ONE FISH LINE DEMONSTRATION COMPLETE ===");
};
