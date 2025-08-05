import { StockfishOptions, PLAYER_COLORS, PlayerColor } from "./types.js";
import { analyzePosition } from "./stockfish-client.js";
import { parseMove } from "./utils/move-parsing.js";
import { applyMoveToFEN } from "./utils/fen-manipulation.js";
import { moveToNotation } from "./utils/notation-utils.js";
import { log } from "./utils/logging.js";
import { compareAnalysisMoves } from "./utils/analysis-utils.js";
import {
  renderLineFisherBoard,
  updateLineFisherExploredLines,
  generateLineFisherFormula,
} from "./utils/line-fisher-results.js";
import {
  getElementByIdOrThrow,
  querySelectorOrThrow,
} from "./utils/dom-helpers.js";
import {
  calculateTotalNodes,
  calculateTotalLines,
} from "./utils/line-fisher-calculations.js";
import { showToast } from "./utils/ui-utils.js";
import { updateLineFisherButtonStates } from "./utils/line-fisher-manager.js";

// Global state for fish function
let currentFishState: FishState | null = null;
let isFishAnalysisRunning = false;
let shouldStopFishAnalysis = false;

/**
 * Continue fish analysis from current state
 * Resume fish analysis from the current state if there are WIP lines
 */
export const continueFishAnalysis = async (): Promise<void> => {
  console.log("Continuing fish analysis");

  try {
    if (!currentFishState) {
      showToast("No fish analysis state to continue", "#FF9800", 3000);
      return;
    }

    if (currentFishState.wip.length === 0) {
      showToast("No work-in-progress lines to continue", "#FF9800", 3000);
      return;
    }

    console.log(
      "Continuing fish analysis with WIP count:",
      currentFishState.wip.length,
    );
    showToast("Continuing fish analysis...", "#007bff", 2000);

    // Update button states - disable start, enable stop
    updateFishButtonStates(true);

    // Continue the analysis from where it left off by running the main loop
    console.log(
      "Continuing main analysis loop with WIP count:",
      currentFishState.wip.length,
    );

    // Set fishing flag to true when continuing
    currentFishState.isFishing = true;

    while (currentFishState.wip.length > 0 && currentFishState.isFishing) {
      // Check if analysis should be stopped
      if (shouldStopFishAnalysis) {
        console.log("Fish analysis continue stopped by user");
        currentFishState.isFishing = false;
        updateFishStatus("Analysis continue stopped by user");
        updateFishButtonStates(false);
        return;
      }

      const currentLine = currentFishState.wip.shift()!;
      console.log("Continue loop, next line:", currentLine.sans.join(" "));
      console.log(
        "WIP count at start of iteration:",
        currentFishState.wip.length,
      );

      const halfMoves = currentLine.sans.length;
      const isEvenHalfMoves = halfMoves % 2 === 0;

      updateFishStatus(`Continuing analysis: ${currentLine.sans.join(" ")}`);

      if (isEvenHalfMoves) {
        console.group("continueInitiatorMove()");
        // Initiator move - get best move from Stockfish
        await findBestInitiatorMove(currentFishState, currentLine);
      } else {
        // Responder move - get N best moves from Stockfish
        console.group("continueResponderMove()");
        await findNextResponseMoves(currentFishState, currentLine);
      }

      // Update progress in UI
      updateFishProgress(currentFishState);

      // Update the current line node specifically
      updateFishLineNode(currentLine, currentFishState);

      // Update global state for export functionality
      console.log(
        "Updated global state. WIP count:",
        currentFishState.wip.length,
        "Done count:",
        currentFishState.done.length,
      );

      console.groupEnd();
    }

    console.log(
      "Fish analysis continue END. Wip len:",
      currentFishState.wip.length,
      ", done len:",
      currentFishState.done.length,
    );
    console.log("Final done lines:", currentFishState.done);

    // Set fishing to false when analysis completes
    currentFishState.isFishing = false;

    // Update final results in UI
    updateFishStatus("Analysis continue complete");
    updateFishProgress(currentFishState);
    updateFishResults(currentFishState.done);

    // Update global state one final time
    console.log(
      "Final global state updated. WIP count:",
      currentFishState.wip.length,
      "Done count:",
      currentFishState.done.length,
    );

    showToast(
      `Fish analysis continued and completed: ${currentFishState.done.length} lines found`,
      "#28a745",
      5000,
    );

    // Update button states - enable start, disable stop
    updateFishButtonStates(false);
  } catch (error) {
    console.error("Error continuing fish analysis:", error);
    showToast(
      `Fish continue error: ${error instanceof Error ? error.message : String(error)}`,
      "#dc3545",
      5000,
    );

    // Update button states - enable start, disable stop (even on error)
    updateFishButtonStates(false);
  }
};

/**
 * Import fish state from clipboard
 * Import fish analysis state from clipboard JSON format.
 * Parse JSON state, validate format, and load into current state
 */
export const importFishStateFromClipboard = async (): Promise<void> => {
  console.log("Importing fish state from clipboard");

  try {
    // Read from clipboard
    const clipboardText = await navigator.clipboard.readText();

    if (!clipboardText) {
      showToast("No text found in clipboard", "#FF9800", 3000);
      return;
    }

    // Try to parse as JSON first (for backward compatibility)
    let importedState: any;
    try {
      importedState = JSON.parse(clipboardText);

      // Validate JSON state format
      if (!importedState.type || importedState.type !== "fish-state") {
        throw new Error("Invalid JSON fish state format");
      }

      if (!importedState.config || !importedState.wip || !importedState.done) {
        throw new Error("Incomplete JSON fish state");
      }

      // Handle JSON format (existing functionality)
      console.log("Importing JSON fish state format");

      // Reconstruct full FishLine objects from streamlined format
      const reconstructFishLine = (
        streamlinedLine: any,
        isFromDoneArray: boolean,
      ): FishLine => {
        // Reconstruct position by applying moves to root FEN
        let currentFEN = importedState.config.rootFEN;

        console.log(
          `Reconstructing position for line: ${streamlinedLine.sans.join(" ")}`,
        );
        console.log(`Starting from root FEN: ${currentFEN}`);

        // Apply each move in the line to reconstruct the position
        for (const san of streamlinedLine.sans) {
          const move = parseMove(san, currentFEN);
          if (move) {
            currentFEN = applyMoveToFEN(currentFEN, move);
            console.log(`Applied move ${san}, new FEN: ${currentFEN}`);
          } else {
            console.warn(
              `Failed to parse move ${san} in position ${currentFEN}`,
            );
            // Fallback to empty string if move parsing fails
            currentFEN = "";
            break;
          }
        }

        console.log(`Final reconstructed position: ${currentFEN}`);

        return {
          sans: streamlinedLine.sans,
          score: streamlinedLine.score,
          delta: streamlinedLine.delta,
          position: currentFEN, // Reconstructed position
          isDone: isFromDoneArray, // Done lines are marked as done
          isFull: isFromDoneArray, // Done lines are also marked as full
        };
      };

      const reconstructedWip = importedState.wip.map((line: any) =>
        reconstructFishLine(line, false),
      );
      const reconstructedDone = importedState.done.map((line: any) =>
        reconstructFishLine(line, true),
      );

      // Load state into global state
      currentFishState = {
        isFishing: false, // Imported state should not be fishing by default
        config: importedState.config,
        wip: reconstructedWip,
        done: reconstructedDone,
      };

      console.log("Imported JSON fish state:", currentFishState);
      showToast("Imported JSON fish state successfully", "#4CAF50", 3000);
    } catch (jsonError) {
      // If JSON parsing fails, try to parse as plain text lines
      console.log("JSON parsing failed, trying plain text format:", jsonError);

      // Parse plain text lines
      const lines = clipboardText
        .trim()
        .split("\n")
        .filter((line) => line.trim());

      if (lines.length === 0) {
        showToast("No valid lines found in clipboard", "#FF9800", 3000);
        return;
      }

      console.log("Importing plain text fish state format");

      // Convert plain text lines back to FishLine format
      const convertPlainTextToFishLine = (lineText: string): FishLine => {
        // Parse the line to extract moves
        const moves: string[] = [];
        const moveRegex =
          /(\d+\.\s*)?([NBRQKP]?[a-h]?[1-8]?x?[a-h][1-8](?:=[NBRQ])?[+#]?)/g;
        let match;

        while ((match = moveRegex.exec(lineText)) !== null) {
          if (match[2]) {
            // The actual move
            moves.push(match[2]);
          }
        }

        console.log(`Parsed moves from line "${lineText}":`, moves);

        return {
          sans: moves,
          score: 0, // Default score for imported lines
          delta: 0, // Default delta for imported lines
          position: "", // Will be reconstructed if needed
          isDone: true, // Imported lines are considered done
          isFull: true, // Imported lines are considered full
        };
      };

      const importedLines = lines.map(convertPlainTextToFishLine);

      // Create a minimal config for imported lines
      const defaultConfig: FishConfig = {
        rootFEN: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
        rootScore: 0,
        maxDepth: 10,
        defaultResponderCount: 1,
        initiatorPredefinedMoves: [],
        responderCountOverrides: [],
        initiatorColor: "w",
      };

      // Load state into global state
      currentFishState = {
        isFishing: false,
        config: defaultConfig,
        wip: [],
        done: importedLines,
      };

      console.log("Imported plain text fish state:", currentFishState);
      showToast(
        `Imported ${importedLines.length} lines from plain text`,
        "#4CAF50",
        3000,
      );
    }

    // Update the display
    if (currentFishState) {
      updateFishResultsRealTime(currentFishState);
      updateFishProgress(currentFishState);
    }

    console.log("Fish state import completed successfully");
  } catch (error) {
    console.error("Error importing fish state:", error);
    showToast("Failed to import fish state", "#f44336", 4000);
  }
};

/**
 * Convert FishConfig to LineFisherConfig format for calculations
 */
function convertFishConfigToLineFisherConfig(config: FishConfig): any {
  return {
    initiatorMoves: config.initiatorPredefinedMoves,
    responderMoveCounts: config.responderCountOverrides,
    maxDepth: config.maxDepth,
    threads: config.stockfishOptions?.threads || 1,
    defaultResponderCount: config.defaultResponderCount,
    rootFEN: config.rootFEN,
  };
}
/**
 * Configuration for the fish function
 */
export interface FishConfig {
  rootFEN: string; // Starting position
  rootScore: number; // Score of the best move of the root position
  baselineScore?: number; // Score of the root position for delta calculations
  maxDepth: number; // Maximum analysis depth
  defaultResponderCount: number; // Default number of responses to analyze
  initiatorPredefinedMoves: string[]; // Predefined initiator moves by depth (e.g., ["Nf3", "g3"])
  responderCountOverrides: number[]; // Override responder counts for specific depths
  stockfishOptions?: StockfishOptions; // Stockfish analysis options
  initiatorColor: PlayerColor; // Color of the initiator (who makes the first move)
}

/**
 * Represents a line being analyzed
 */
interface FishLine {
  sans: string[]; // SAN notation moves in this line
  score: number; // Score of the last move in this line
  delta: number; // Delta from baseline score for the last move
  position: string; // Current position FEN
  isDone: boolean; // Whether this line is complete
  isFull: boolean; // Whether this line has reached max depth
}

/**
 * Fish analysis state
 */
interface FishState {
  isFishing: boolean; // Flag to control if analysis should continue
  wip: FishLine[]; // Lines currently being worked on
  done: FishLine[]; // Completed lines
  config: FishConfig;
}

/**
 * Update Fish button states using existing Line Fisher button management
 */
function updateFishButtonStates(isAnalyzing: boolean): void {
  isFishAnalysisRunning = isAnalyzing;
  shouldStopFishAnalysis = false;

  // Make Fish analysis state available to button management
  (window as any).isFishAnalysisRunning = isAnalyzing;

  updateLineFisherButtonStates();
}

/**
 * Stop Fish analysis
 */
export const stopFishAnalysis = (): void => {
  console.log("Stopping Fish analysis");

  if (!isFishAnalysisRunning) {
    console.log("Fish analysis not running, nothing to stop");
    return;
  }

  // Set the stop flag to interrupt the analysis loop
  shouldStopFishAnalysis = true;

  // Set isFishing to false in current state if it exists
  if (currentFishState) {
    currentFishState.isFishing = false;
  }

  // Update button states
  updateFishButtonStates(false);

  // Update UI status
  updateFishStatus("Analysis stopped");

  showToast("Fish analysis stopped", "#FF9800", 3000);
};

/**
 * Fish function - performs line analysis according to the algorithm in the comment
 *
 * Algorithm:
 * 1. Create initial move (predefined or from Stockfish)
 * 2. Add to wip list
 * 3. Loop until wip list is empty:
 *    - Get next line from wip
 *    - If even half-moves: responder move (get N best moves)
 *    - If odd half-moves: initiator move (get best move)
 *    - Mark lines as done when max depth reached
 */
export async function fish(config: FishConfig): Promise<FishLine[]> {
  // - create a state object, empty wip/done list.
  // - show config in UI (root board, limits, the whole thing)
  // - get root score, update config
  // - update root score in UI
  // - create an initial move
  //   - if there is a predefined move, use that, ask stockfish for the score
  //   - otherwise, ask stockfish for the best move of the root FEN
  // - add move to UI
  //   - when adding moves, create a node in the line-fisher-results box to represent the move
  //   - give the node the id of the move.sans, concatenated with underscores
  // add this move to the wip list and the UI
  // now loop:
  // - get the next element in the wip list
  //   - if the number of half-moves is even, the next step is a responder move
  //   - otherwise the next step is an initiator move
  //   - responder move:
  //     - take the position and ask stockfish for the next N best moves
  //       - if there is a responder count override at this depth, use that for N
  //       - otherwise use the default responder count for N.
  //     - add this top list as moves to the line, mark line as done, move it from wip list to done list
  //     - for each response gotten this way, create a _new_ line object that extends the line with the new move
  //     - add these to the wip list
  //     - add these to the UI
  //  - initiator move
  //    - ask stockfish for the best move in the current line
  //    - once you have it, record it as the next move in the line
  //    - if the number of half-moves now exceeds maxDepth/2+1, mark the line as done and complete, remove it from wip list, add it to done list
  //    - otherwise the line can stay in queue and will be picked up again for responder moves
  // repeat until wip queue is drained.

  console.log("Starting fish analysis with config:", config);

  // Update button states - disable start, enable stop
  updateFishButtonStates(true);

  try {
    // Create state object with empty wip/done lists
    const state: FishState = {
      isFishing: true, // Start with fishing enabled
      wip: [],
      done: [],
      config,
    };

    // Store state globally for export functionality
    currentFishState = state;
    console.log("Initial fish state set globally:", currentFishState);

    // Show config in UI
    updateFishConfigDisplay(config);
    updateFishStatus("Starting root analysis...");
    updateFishProgress(state);

    // Get root score and update config
    const rootAnalysis = await analyzePosition(config.rootFEN, {
      ...config.stockfishOptions,
      multiPV: 1,
    });
    console.log("rootAnalysis:", rootAnalysis);
    const direction =
      config.initiatorColor === PLAYER_COLORS.BLACK ? "asc" : "desc";
    const bestMove = rootAnalysis.moves.sort((a, b) =>
      compareAnalysisMoves(a, b, direction),
    )[0];
    console.log("root score:", bestMove.score);
    config.rootScore = bestMove.score;
    config.baselineScore = bestMove.score; // Set baseline for delta calculations

    // Update root score in UI
    updateFishRootScore(bestMove.score);
    updateFishStatus(`Creating initial move`);

    // Create initial move
    const initialLine = await createInitialMove(state);
    if (initialLine) {
      state.wip.push(initialLine);
      console.log("Added initial line to wip:", initialLine);
      console.log("WIP count after adding initial line:", state.wip.length);
    }

    updateFishResultsRealTime(state);

    // Main analysis loop
    console.log(
      "Starting main analysis loop with WIP count:",
      state.wip.length,
    );
    while (state.wip.length > 0 && state.isFishing) {
      // Check if analysis should be stopped
      if (shouldStopFishAnalysis) {
        console.log("Fish analysis stopped by user");
        state.isFishing = false;
        updateFishStatus("Analysis stopped by user");
        updateFishButtonStates(false);
        return state.done;
      }

      const currentLine = state.wip.shift()!;
      console.log("Main loop, next line:", currentLine.sans.join(" "));
      console.log("WIP count at start of iteration:", state.wip.length);

      const halfMoves = currentLine.sans.length;
      const isEvenHalfMoves = halfMoves % 2 === 0;

      updateFishStatus(`Analyzing line: ${currentLine.sans.join(" ")}`);

      if (isEvenHalfMoves) {
        console.group("processInitiatorMove()");
        // Initiator move - get best move from Stockfish
        await findBestInitiatorMove(state, currentLine);
      } else {
        // Responder move - get N best moves from Stockfish
        console.group("processResponderMove()");
        await findNextResponseMoves(state, currentLine);
      }

      // Update progress in UI
      updateFishProgress(state);

      // Update the current line node specifically
      updateFishLineNode(currentLine, state);

      // Update global state for export functionality
      currentFishState = state;
      console.log(
        "Updated global state. WIP count:",
        state.wip.length,
        "Done count:",
        state.done.length,
      );
      console.log("Global state updated during main loop iteration");

      console.groupEnd();
    }

    console.log(
      "Fish analysis END. Wip len:",
      state.wip.length,
      ", done len:",
      state.done.length,
    );
    console.log("Final done lines:", state.done);

    // Set fishing to false when analysis completes
    state.isFishing = false;

    // Update final results in UI
    updateFishStatus("Analysis complete");
    updateFishProgress(state);
    updateFishResults(state.done);

    // Update global state one final time
    currentFishState = state;
    console.log(
      "Final global state updated. WIP count:",
      state.wip.length,
      "Done count:",
      state.done.length,
    );
    console.log("Final fish state:", currentFishState);

    // Update button states - enable start, disable stop
    updateFishButtonStates(false);

    return state.done;
  } catch (error) {
    console.error("Error in fish analysis:", error);

    // Reset button states on error
    updateFishButtonStates(false);

    // Update UI status
    updateFishStatus("Analysis failed");

    showToast(
      `Fish analysis failed: ${error instanceof Error ? error.message : String(error)}`,
      "#dc3545",
      5000,
    );

    throw error; // Re-throw to let caller handle it
  }
}

/**
 * Calculate delta for a move score against the baseline
 */
const calculateDelta = (
  score: number,
  baselineScore: number | undefined,
): number => {
  if (baselineScore === undefined) {
    return 0; // No baseline available
  }
  return score - baselineScore;
};

/**
 * Create the initial move for analysis
 */
async function createInitialMove(state: FishState): Promise<FishLine | null> {
  const { config } = state;

  // Check if there's a predefined move for depth 0
  const predefinedMove = config.initiatorPredefinedMoves[0];

  if (predefinedMove) {
    // Use predefined move
    console.log("Using predefined move for depth 0:", predefinedMove);
    const move = parseMove(predefinedMove, config.rootFEN);
    if (!move) {
      console.log(
        "Failed to parse predefined move:",
        predefinedMove,
        config.initiatorPredefinedMoves,
      );
      return null;
    }

    // Get score for the predefined move
    const newFEN = applyMoveToFEN(config.rootFEN, move);
    console.log("Asking stockfish for score for initial move");
    const analysis = await analyzePosition(newFEN, {
      ...config.stockfishOptions,
      multiPV: 1,
    });
    const score = analysis.moves[0]?.score || 0;
    console.log("Stockfish score:", score);

    return {
      sans: [predefinedMove],
      score: score,
      delta: calculateDelta(score, config.baselineScore),
      position: newFEN,
      isDone: false,
      isFull: false,
    };
  } else {
    // Ask Stockfish for best move
    console.log("Getting best move from Stockfish for root position");
    const analysis = await analyzePosition(
      config.rootFEN,
      config.stockfishOptions,
    );
    const bestMove = analysis.moves[0];

    if (!bestMove) {
      log("No moves available from Stockfish");
      return null;
    }

    const newFEN = applyMoveToFEN(config.rootFEN, bestMove.move);

    return {
      sans: [moveToNotation(bestMove.move, "short", "unicode", config.rootFEN)],
      score: bestMove.score,
      delta: calculateDelta(bestMove.score, config.baselineScore),
      position: newFEN,
      isDone: false,
      isFull: false,
    };
  }
}

/**
 * Process responder move - get N best moves from current position
 */
async function findNextResponseMoves(
  state: FishState,
  line: FishLine,
): Promise<void> {
  const { config } = state;
  const depth = Math.floor(line.sans.length / 2);

  // Determine number of responses to analyze
  const responderCount =
    config.responderCountOverrides?.[depth] || config.defaultResponderCount;

  console.log(
    `Processing responder move at depth ${depth}, asking for ${responderCount} responses`,
  );

  // Get N best moves from Stockfish
  const analysis = await analyzePosition(line.position, {
    ...config.stockfishOptions,
    multiPV: responderCount,
  });

  //   console.log('responses:', analysis.moves);

  // Mark current line as done and move to done list
  line.isDone = true;
  state.done.push(line);

  // Sort by quality: mate moves first, then by score
  const direction =
    config.initiatorColor === PLAYER_COLORS.BLACK ? "asc" : "desc";
  const responses = analysis.moves
    .sort((a, b) => compareAnalysisMoves(a, b, direction))
    .slice(0, responderCount);

  // Create new lines for each response
  for (const analysisMove of responses) {
    const newFEN = applyMoveToFEN(line.position, analysisMove.move);
    const san = moveToNotation(
      analysisMove.move,
      "short",
      "english",
      line.position,
    );
    const newLine: FishLine = {
      sans: [...line.sans, san],
      score: analysisMove.score,
      delta: calculateDelta(analysisMove.score, config.baselineScore),
      position: newFEN,
      isDone: false,
      isFull: false,
    };

    console.log(
      "Adding line:",
      newLine.sans.join(" "),
      "at score",
      analysisMove.score,
    );
    state.wip.push(newLine);

    // Update the new line node in UI
    updateFishLineNode(newLine, state);

    // Update global state for export functionality
    currentFishState = state;
    console.log("Global state updated after responder move processing");
  }

  log(`Created ${responses.length} new lines from responder analysis`);
}

/**
 * Process initiator move - get best move from current position
 */
async function findBestInitiatorMove(
  state: FishState,
  line: FishLine,
): Promise<void> {
  const { config } = state;
  const depth = Math.floor(line.sans.length / 2);

  console.log("Processing initiator move at depth:", depth);

  // Check if there's a predefined move for this depth
  const predefinedMove = config.initiatorPredefinedMoves[depth];

  if (predefinedMove) {
    // Use predefined move
    console.log("Using predefined move for depth", depth, ":", predefinedMove);
    const move = parseMove(predefinedMove, line.position);
    if (!move) {
      console.log("Failed to parse predefined move:", predefinedMove);
      line.isDone = true;
      state.done.push(line);
      return;
    }

    // Get score for the predefined move
    console.log("Asking stockfish for score for move");
    const newFEN = applyMoveToFEN(line.position, move);
    const analysis = await analyzePosition(newFEN, config.stockfishOptions);
    const score = analysis.moves[0]?.score || 0;
    console.log("Stockfish score:", score);

    // Add the predefined move to the line
    line.sans.push(predefinedMove);
    line.score = score;
    line.delta = calculateDelta(score, config.baselineScore);
    line.position = newFEN;
    console.log("Line now:", line.sans.join(" "));
  } else {
    // Get best move from Stockfish
    console.log("Getting best move from Stockfish for depth", depth);
    const analysis = await analyzePosition(line.position, {
      ...config.stockfishOptions,
      depth: 20,
      multiPV: 1,
    });
    const direction =
      config.initiatorColor === PLAYER_COLORS.BLACK ? "asc" : "desc";
    // console.log('analysis.moves:', analysis.moves);
    const bestMove = analysis.moves.sort((a, b) =>
      compareAnalysisMoves(a, b, direction),
    )[0];
    // console.log('bestMove:', bestMove);

    if (!bestMove) {
      console.log("No moves available from Stockfish for initiator move");
      line.isDone = true;
      state.done.push(line);
      return;
    }

    // Add the best move to the line
    const newFEN = applyMoveToFEN(line.position, bestMove.move);
    line.sans.push(
      moveToNotation(bestMove.move, "short", "unicode", line.position),
    );
    line.score = bestMove.score;
    line.delta = calculateDelta(bestMove.score, config.baselineScore);
    line.position = newFEN;
  }

  console.log("Added initiator move to line");
  console.log("Line now:", line.sans.join(" "));

  // Update the line node in UI
  updateFishLineNode(line, state);

  // Update global state for export functionality
  currentFishState = state;
  console.log("Global state updated after initiator move processing");

  // Check if max depth reached
  const halfMoves = line.sans.length;
  if (halfMoves >= config.maxDepth * 2 + 1) {
    line.isDone = true;
    line.isFull = true;
    state.done.push(line);
    console.log("Line is done and full");
  } else {
    // Line can stay in queue for next responder move
    state.wip.push(line);
  }
}

/**
 * Update fish config display in UI
 * Non-blocking UI update with error handling
 */
function updateFishConfigDisplay(config: FishConfig): void {
  try {
    // Calculate total nodes and lines using existing line-fisher functions
    const lineFisherConfig = convertFishConfigToLineFisherConfig(config);
    const totalNodes = calculateTotalNodes(lineFisherConfig);
    const totalLines = calculateTotalLines(lineFisherConfig);

    // Generate formulas
    const { nodeFormula, lineFormula } =
      generateLineFisherFormula(lineFisherConfig);

    // Update config display elements using existing line-fisher UI
    const initiatorDisplay = getElementByIdOrThrow(
      "line-fisher-initiator-display",
    );
    const responderDisplay = getElementByIdOrThrow(
      "line-fisher-responder-display",
    );
    const depthDisplay = getElementByIdOrThrow("line-fisher-depth-display");
    const threadsDisplay = getElementByIdOrThrow("line-fisher-threads-display");

    if (initiatorDisplay) {
      initiatorDisplay.textContent =
        config.initiatorPredefinedMoves.join(", ") || "(none)";
    }

    if (responderDisplay) {
      responderDisplay.textContent =
        config.responderCountOverrides.join(", ") || "(default)";
    }

    if (depthDisplay) {
      depthDisplay.textContent = config.maxDepth.toString();
    }

    if (threadsDisplay) {
      const threads = config.stockfishOptions?.threads || 1;
      threadsDisplay.textContent = threads.toString();
    }

    // Add total nodes, lines, and formulas to config display
    const configDetails = querySelectorOrThrow(
      document,
      ".line-fisher-config-details",
    );
    if (configDetails) {
      // Check if total nodes element already exists
      let totalNodesElement = configDetails.querySelector(".fish-total-nodes");
      if (!totalNodesElement) {
        totalNodesElement = document.createElement("div");
        totalNodesElement.className =
          "line-fisher-config-item fish-total-nodes";
        totalNodesElement.innerHTML =
          "<label>Total Nodes:</label><span>-</span>";
        configDetails.appendChild(totalNodesElement);
      }

      const totalNodesSpan = totalNodesElement.querySelector("span");
      if (totalNodesSpan) {
        totalNodesSpan.textContent = totalNodes.toString();
      }

      // Check if total lines element already exists
      let totalLinesElement = configDetails.querySelector(".fish-total-lines");
      if (!totalLinesElement) {
        totalLinesElement = document.createElement("div");
        totalLinesElement.className =
          "line-fisher-config-item fish-total-lines";
        totalLinesElement.innerHTML =
          "<label>Total Lines:</label><span>-</span>";
        configDetails.appendChild(totalLinesElement);
      }

      const totalLinesSpan = totalLinesElement.querySelector("span");
      if (totalLinesSpan) {
        totalLinesSpan.textContent = totalLines.toString();
      }

      // Check if node formula element already exists
      let nodeFormulaElement =
        configDetails.querySelector(".fish-node-formula");
      if (!nodeFormulaElement) {
        nodeFormulaElement = document.createElement("div");
        nodeFormulaElement.className =
          "line-fisher-config-item fish-node-formula";
        nodeFormulaElement.innerHTML =
          "<label>Node Formula:</label><span>-</span>";
        configDetails.appendChild(nodeFormulaElement);
      }

      const nodeFormulaSpan = nodeFormulaElement.querySelector("span");
      if (nodeFormulaSpan) {
        nodeFormulaSpan.innerHTML = `<span style="font-family: monospace; font-size: 0.9em;">${nodeFormula}</span>`;
      }

      // Check if line formula element already exists
      let lineFormulaElement =
        configDetails.querySelector(".fish-line-formula");
      if (!lineFormulaElement) {
        lineFormulaElement = document.createElement("div");
        lineFormulaElement.className =
          "line-fisher-config-item fish-line-formula";
        lineFormulaElement.innerHTML =
          "<label>Line Formula:</label><span>-</span>";
        configDetails.appendChild(lineFormulaElement);
      }

      const lineFormulaSpan = lineFormulaElement.querySelector("span");
      if (lineFormulaSpan) {
        lineFormulaSpan.innerHTML = `<span style="font-family: monospace; font-size: 0.9em;">${lineFormula}</span>`;
      }
    }

    // Render the board with the current position
    renderLineFisherBoard(config.rootFEN);
  } catch (error) {
    console.error("Failed to update fish config display:", error);
    // Non-blocking: continue analysis even if UI update fails
  }
}

/**
 * Update fish status display
 * Non-blocking UI update with error handling
 */
function updateFishStatus(message: string): void {
  try {
    const statusElement = getElementByIdOrThrow("line-fisher-status");
    if (statusElement) {
      statusElement.textContent = message;
    }
  } catch (error) {
    console.error("Failed to update fish status:", error);
    // Non-blocking: continue analysis even if UI update fails
  }
}

/**
 * Update fish progress display
 * Non-blocking UI update with error handling
 */
function updateFishProgress(state: FishState): void {
  try {
    const actionDisplay = getElementByIdOrThrow("line-fisher-action-display");
    const linesDisplay = getElementByIdOrThrow("line-fisher-lines-display");
    const positionDisplay = getElementByIdOrThrow(
      "line-fisher-position-display",
    );
    const progressFill = getElementByIdOrThrow("line-fisher-progress-fill");

    if (actionDisplay) {
      const wipCount = state.wip.length;
      const doneCount = state.done.length;
      actionDisplay.textContent = `WIP: ${wipCount}, Done: ${doneCount}`;
    }

    if (linesDisplay) {
      // Calculate total expected lines for display
      const lineFisherConfig = convertFishConfigToLineFisherConfig(
        state.config,
      );
      const totalNodes = calculateTotalNodes(lineFisherConfig);
      const totalExpectedLines = Math.floor((totalNodes - 1) / 2) + 1;
      const progressPercent =
        totalExpectedLines > 0
          ? (state.done.length / totalExpectedLines) * 100
          : 0;

      linesDisplay.textContent = `${state.done.length} / ${totalExpectedLines} (${progressPercent.toFixed(2)}%)`;
    }

    if (positionDisplay) {
      // Show current position being analyzed (if any)
      const currentLine = state.wip[0];
      if (currentLine) {
        positionDisplay.textContent =
          currentLine.sans.join(" ") || "Root position";
      } else {
        positionDisplay.textContent = "Complete";
      }
    }

    // Update progress bar
    if (progressFill) {
      // Calculate progress based on completed lines vs total expected lines
      // Use the formula: (total nodes - 1) / 2 + 1
      const lineFisherConfig = convertFishConfigToLineFisherConfig(
        state.config,
      );
      const totalNodes = calculateTotalNodes(lineFisherConfig);
      const totalExpectedLines = Math.floor((totalNodes - 1) / 2) + 1;
      const progressPercent =
        totalExpectedLines > 0
          ? (state.done.length / totalExpectedLines) * 100
          : 0;

      // Cap progress at 100%
      const cappedProgress = Math.min(progressPercent, 100);
      progressFill.style.width = `${cappedProgress}%`;
    }
  } catch (error) {
    console.error("Failed to update fish progress:", error);
    // Non-blocking: continue analysis even if UI update fails
  }
}

/**
 * Update fish root score display
 * Non-blocking UI update with error handling
 */
function updateFishRootScore(score: number): void {
  try {
    // Add root score to config display
    const configDetails = querySelectorOrThrow(
      document,
      ".line-fisher-config-details",
    );
    if (configDetails) {
      // Check if root score element already exists
      let rootScoreElement = configDetails.querySelector(".fish-root-score");
      if (!rootScoreElement) {
        rootScoreElement = document.createElement("div");
        rootScoreElement.className = "line-fisher-config-item fish-root-score";
        rootScoreElement.innerHTML = "<label>Root Score:</label><span>-</span>";
        configDetails.appendChild(rootScoreElement);
      }

      const scoreSpan = rootScoreElement.querySelector("span");
      if (scoreSpan) {
        const scoreInPawns = score / 100;
        const scoreText =
          scoreInPawns > 0
            ? `+${scoreInPawns.toFixed(1)}`
            : scoreInPawns.toFixed(1);
        scoreSpan.textContent = scoreText;
      }
    }
  } catch (error) {
    console.error("Failed to update fish root score:", error);
    // Non-blocking: continue analysis even if UI update fails
  }
}

/**
 * Convert Unicode chess pieces to English notation
 */
function convertUnicodeToEnglish(move: string): string {
  // Map Unicode pieces to English letters
  const unicodeToEnglish: { [key: string]: string } = {
    "♔": "K",
    "♕": "Q",
    "♖": "R",
    "♗": "B",
    "♘": "N",
    "♙": "P",
    "♚": "K",
    "♛": "Q",
    "♜": "R",
    "♝": "B",
    "♞": "N",
    "♟": "P",
  };

  let result = move;
  for (const [unicode, english] of Object.entries(unicodeToEnglish)) {
    result = result.replace(new RegExp(unicode, "g"), english);
  }
  return result;
}

/**
 * Format moves with numbers in English notation
 */
function formatMovesWithNumbersEnglish(sans: string[]): string {
  let result = "";
  for (let i = 0; i < sans.length; i++) {
    if (i % 2 === 0) {
      // White's move - add move number
      const moveNumber = Math.floor(i / 2) + 1;
      result += `${moveNumber}. ${convertUnicodeToEnglish(sans[i])}`;
    } else {
      // Black's move - just add the move
      result += ` ${convertUnicodeToEnglish(sans[i])}`;
    }
    if (i < sans.length - 1) {
      result += " ";
    }
  }
  return result;
}

/**
 * Format moves with move numbers (original function for Unicode display)
 */
function formatMovesWithNumbers(sans: string[]): string {
  let result = "";
  for (let i = 0; i < sans.length; i++) {
    if (i % 2 === 0) {
      // White's move - add move number
      const moveNumber = Math.floor(i / 2) + 1;
      result += `${moveNumber}. ${sans[i]}`;
    } else {
      // Black's move - just add the move
      result += ` ${sans[i]}`;
    }
    if (i < sans.length - 1) {
      result += " ";
    }
  }
  return result;
}

/**
 * Generate line ID from SAN moves
 */
function generateLineId(sans: string[]): string {
  return sans.join("_");
}

/**
 * Convert FishLine to LineFisherResult format for display
 */
function convertFishLineToDisplayFormat(line: FishLine): any {
  return {
    sans: line.sans,
    scores: [line.score], // Wrap in array for display compatibility
    notation: formatMovesWithNumbersEnglish(line.sans),
    isDone: line.isDone,
    isComplete: line.isFull,
    isTransposition: false, // Fish doesn't track transpositions
    updateCount: 1,
    deltas: [line.delta], // Wrap in array for display compatibility
    responderMoveList: [], // Fish doesn't track responder moves separately
    lineId: generateLineId(line.sans), // Add line ID for tracking
  };
}

/**
 * Update fish results display with real-time updates
 * Non-blocking UI update with error handling
 */
function updateFishResults(results: FishLine[]): void {
  try {
    // Convert FishLine format to LineFisherResult format for display
    const displayResults = results.map((line) =>
      convertFishLineToDisplayFormat(line),
    );

    // Use the existing line-fisher display function
    updateLineFisherExploredLines(displayResults);
  } catch (error) {
    console.error("Failed to update fish results:", error);
    // Non-blocking: continue analysis even if UI update fails
  }
}

/**
 * Update fish results display with real-time updates including WIP lines
 * Non-blocking UI update with error handling
 */
function updateFishResultsRealTime(state: FishState): void {
  try {
    // Combine done and wip lines for display
    const allLines = [...state.done, ...state.wip];

    // Convert FishLine format to LineFisherResult format for display
    const displayResults = allLines.map((line) =>
      convertFishLineToDisplayFormat(line),
    );

    // Use the existing line-fisher display function
    updateLineFisherExploredLines(displayResults);
  } catch (error) {
    console.error("Failed to update fish results real-time:", error);
    // Non-blocking: continue analysis even if UI update fails
  }
}

/**
 * Update specific line node in the results display
 * Non-blocking UI update with error handling
 */
function updateFishLineNode(line: FishLine, state: FishState): void {
  try {
    const lineId = generateLineId(line.sans);
    const resultsElement = getElementByIdOrThrow("line-fisher-results");

    if (!resultsElement) return;

    // Find existing line node
    const existingLineElement = resultsElement.querySelector(
      `[data-line-id="${lineId}"]`,
    );

    if (existingLineElement) {
      // Update existing line node
      const displayResult = convertFishLineToDisplayFormat(line);

      // Update the line content
      const lineNumberElement =
        existingLineElement.querySelector(".line-number");
      const lineScoreElement = existingLineElement.querySelector(".line-score");
      const lineDeltaElement = existingLineElement.querySelector(".line-delta");
      const lineNotationElement =
        existingLineElement.querySelector(".line-notation");

      if (lineNumberElement) {
        // Update line number styling based on completion status
        const lineNumberHTMLElement = lineNumberElement as HTMLElement;
        if (!line.isDone) {
          lineNumberHTMLElement.style.backgroundColor = "#ffeb3b";
          lineNumberHTMLElement.style.color = "#000";
          lineNumberHTMLElement.style.padding = "1px 3px";
          lineNumberHTMLElement.style.borderRadius = "3px";
        } else if (line.isFull) {
          lineNumberHTMLElement.style.border = "1px solid #666";
          lineNumberHTMLElement.style.padding = "1px 3px";
          lineNumberHTMLElement.style.borderRadius = "3px";
        } else {
          lineNumberHTMLElement.style.backgroundColor = "";
          lineNumberHTMLElement.style.color = "";
          lineNumberHTMLElement.style.border = "";
          lineNumberHTMLElement.style.padding = "";
          lineNumberHTMLElement.style.borderRadius = "";
        }
      }

      if (lineScoreElement) {
        const scoreInPawns = line.score / 100;
        const scoreText =
          scoreInPawns > 0
            ? `+${scoreInPawns.toFixed(1)}`
            : scoreInPawns.toFixed(1);
        lineScoreElement.textContent = scoreText;
      }

      if (lineDeltaElement) {
        lineDeltaElement.textContent = "="; // Fish doesn't calculate deltas
      }

      if (lineNotationElement) {
        lineNotationElement.textContent = displayResult.notation;
      }
    } else {
      // Line doesn't exist yet, update the full display
      updateFishResultsRealTime(state);
    }
  } catch (error) {
    console.error("Failed to update fish line node:", error);
    // Non-blocking: continue analysis even if UI update fails
  }
}

/**
 * Export fish state to clipboard
 * Export current analysis state to clipboard in JSON format for import.
 * Serialize current state, copy to clipboard, and show success notification
 */
export const exportFishStateToClipboard = async (): Promise<void> => {
  console.log("Exporting fish state to clipboard");
  console.log("Current fish state:", currentFishState);

  try {
    if (!currentFishState) {
      console.log(
        "No currentFishState found - fish analysis may not have been run yet",
      );
      showToast("No fish analysis state to export", "#FF9800", 3000);
      return;
    }

    // Get all lines (both WIP and done)
    const allLines = [...currentFishState.wip, ...currentFishState.done];
    console.log("WIP lines:", currentFishState.wip);
    console.log("Done lines:", currentFishState.done);
    console.log("All lines:", allLines);
    console.log("WIP count:", currentFishState.wip.length);
    console.log("Done count:", currentFishState.done.length);
    console.log("Total lines:", allLines.length);

    if (allLines.length === 0) {
      console.log(
        "No lines found in state - analysis may not have completed or started",
      );
      showToast("No lines to export", "#FF9800", 3000);
      return;
    }

    // Create streamlined line objects without unnecessary properties
    const streamlinedWip = currentFishState.wip.map((line) => ({
      sans: line.sans,
      score: line.score,
      delta: line.delta,
    }));

    const streamlinedDone = currentFishState.done.map((line) => ({
      sans: line.sans,
      score: line.score,
      delta: line.delta,
    }));

    // Create exportable state object
    const exportState = {
      version: "1.0",
      timestamp: new Date().toISOString(),
      type: "fish-state",
      config: currentFishState.config,
      wip: streamlinedWip,
      done: streamlinedDone,
      summary: {
        wipCount: currentFishState.wip.length,
        doneCount: currentFishState.done.length,
        totalLines: allLines.length,
        formattedLines: allLines.map((line) =>
          formatMovesWithNumbersEnglish(line.sans),
        ),
      },
    };

    console.log("Export state object:", exportState);

    // Convert to JSON and copy to clipboard
    const jsonState = JSON.stringify(exportState, null, 2);
    await navigator.clipboard.writeText(jsonState);

    // Show success notification
    const wipCount = currentFishState.wip.length;
    const doneCount = currentFishState.done.length;
    showToast(
      `Exported ${allLines.length} lines to clipboard (${wipCount} WIP, ${doneCount} done)`,
      "#4CAF50",
      3000,
    );

    console.log("Fish state exported to clipboard successfully");
  } catch (error) {
    console.error("Error exporting fish state:", error);
    showToast("Failed to export state", "#f44336", 4000);
  }
};

/**
 * Copy fish state to clipboard (for copy button)
 * Copy current analysis state to clipboard in plain text format.
 * Serialize current state, copy to clipboard, and show success notification
 */
export const copyFishStateToClipboard = async (): Promise<void> => {
  console.log("Copying fish state to clipboard");

  try {
    if (!currentFishState) {
      showToast("No fish analysis state to copy", "#FF9800", 3000);
      return;
    }

    // Get all lines (both WIP and done)
    const allLines = [...currentFishState.wip, ...currentFishState.done];

    if (allLines.length === 0) {
      showToast("No lines to copy", "#FF9800", 3000);
      return;
    }

    // Create plain text format - one line per opening line
    const plainTextLines = allLines
      .map((line) => formatMovesWithNumbersEnglish(line.sans))
      .join("\n");

    // Copy plain text to clipboard
    await navigator.clipboard.writeText(plainTextLines);

    // Show success notification
    const wipCount = currentFishState.wip.length;
    const doneCount = currentFishState.done.length;
    showToast(
      `Copied ${allLines.length} lines to clipboard (${wipCount} WIP, ${doneCount} done)`,
      "#4CAF50",
      3000,
    );

    console.log("Fish state copied to clipboard successfully");
  } catch (error) {
    console.error("Error copying fish state:", error);
    showToast("Failed to copy state", "#f44336", 4000);
  }
};
