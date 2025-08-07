import type { FishState, LineFisherConfig, FishLine } from "./types.js";
import { defaultConfig } from "./fisher-config.js";
import { showToast } from "../../utils/ui-utils.js";
import { parseMove } from "../../utils/move-parsing.js";
import { applyMoveToFEN } from "../../utils/fen-manipulation.js";

let currentFishState: FishState = createFishState(defaultConfig());

function createFishState(config: LineFisherConfig): FishState {
  // Create state object with empty wip/done lists
  const state: FishState = {
    isFishing: true, // Start with fishing enabled
    lineCounter: 0,
    wip: [],
    done: [],
    config,
  };

  return state;
}

export function getCurrentFishState() {
  return currentFishState;
}

/**
 * Import fish state from clipboard
 * Import fish analysis state from clipboard JSON format.
 * Parse JSON state, validate format, and load into current state
 */
export const importFishState = (importedState: any): boolean => {
  try {
    // Validate JSON state format
    if (!importedState.type || importedState.type !== "fish-state") {
      throw new Error("Invalid JSON fish state format");
    }

    if (!importedState.config || !importedState.wip || !importedState.done) {
      throw new Error("Incomplete JSON fish state");
    }

    // Validate that lines have required fields
    const validateLine = (line: any, arrayName: string) => {
      if (!line.pcns || !Array.isArray(line.pcns)) {
        throw new Error(`Invalid ${arrayName} line: missing pcns array`);
      }
      if (typeof line.score !== "number") {
        throw new Error(`Invalid ${arrayName} line: missing score`);
      }
    };

    // Validate all lines
    importedState.wip.forEach((line: any, index: number) => {
      validateLine(line, `wip[${index}]`);
    });
    importedState.done.forEach((line: any, index: number) => {
      validateLine(line, `done[${index}]`);
    });

    // Reconstruct full FishLine objects from streamlined format
    const reconstructFishLine = (
      streamlinedLine: any,
      isFromDoneArray: boolean,
      index: number,
    ): FishLine => {
      // Reconstruct position by applying moves to root FEN
      let currentFEN = importedState.config.rootFEN;

      if (index < 10) {
        console.log(
          `Reconstructing position for line: ${streamlinedLine.pcns.join(" ")}`,
        );
        console.log(`Starting from root FEN: ${currentFEN}`);
      } else if (index === 10) {
        console.log("Suppressing furhter import logs");
      }

      // Apply each move in the line to reconstruct the position
      for (const pcn of streamlinedLine.pcns) {
        const move = parseMove(pcn, currentFEN);
        if (move) {
          currentFEN = applyMoveToFEN(currentFEN, move);
          if (index < 10) {
            console.log(`Applied move ${pcn}, new FEN: ${currentFEN}`);
          }
        } else {
          console.warn(`Failed to parse move ${pcn} in position ${currentFEN}`);
          // Fallback to empty string if move parsing fails
          currentFEN = "";
          break;
        }
      }

      if (index < 10) {
        console.log(`Final reconstructed position: ${currentFEN}`);
      }

      return {
        lineIndex: 0,
        nodeId: "",
        sanGame: streamlinedLine.sanGame, // Use sanGame for reconstruction
        pcns: streamlinedLine.pcns,
        score: streamlinedLine.score,
        best5: streamlinedLine.best5,
        position: currentFEN, // Reconstructed position
        isDone: isFromDoneArray, // Done lines are marked as done
        isFull: isFromDoneArray, // Done lines are also marked as full
        isMate: streamlinedLine.isMate || false,
        isStalemate: streamlinedLine.isStalemate || false,
        isTransposition: streamlinedLine.isTransposition || false,
        transpositionTarget: streamlinedLine.transpositionTarget,
      };
    };

    const reconstructedWip = importedState.wip.map((line: any, index: number) =>
      reconstructFishLine(line, false, index),
    );
    const reconstructedDone = importedState.done.map(
      (line: any, index: number) => reconstructFishLine(line, true, index),
    );

    // Load state into global state
    currentFishState = {
      isFishing: false, // Imported state should not be fishing by default
      lineCounter: 0, // TODO: highest of lineIndex seen during import?
      config: importedState.config,
      wip: reconstructedWip,
      done: reconstructedDone,
    };

    if (currentFishState.wip.length + currentFishState.done.length < 100) {
      console.log("Imported JSON fish state:", currentFishState);
    } else {
      console.log("Imported JSON fish state!");
    }
    showToast("Imported JSON fish state successfully", "#4CAF50", 3000);
    return true;
  } catch (e) {
    console.error("Error importing fish state:", e);
    showToast("Failed to import fish state", "#f44336", 4000);
    return false;
  }
};

export const importFishStateFromClipboard = async (): Promise<void> => {
  console.log("Importing fish state from clipboard");

  try {
    // Read from clipboard
    const clipboardText = await navigator.clipboard.readText();

    if (!clipboardText) {
      showToast("No text found in clipboard", "#FF9800", 3000);
      return;
    }

    let importedState: unknown;
    try {
      importedState = JSON.parse(clipboardText);
    } catch {
      showToast("Data in clipboard was Invalid JSON", "#FF9800", 3000);
      return;
    }

    if (!importedState) {
      showToast("No data found in clipboard", "#FF9800", 3000);
      return;
    }

    const ok = importFishState(importedState);
    if (ok) {
      console.log("Fish state import completed successfully");
    } else {
      showToast("Failed to import fish state", "#f44336", 4000);
    }
  } catch (error) {
    console.error("Error importing fish state:", error);
    showToast("Failed to import fish state", "#f44336", 4000);
  }
};
