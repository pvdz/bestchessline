// import { formatPCNLineWithMoveNumbers } from "../../utils/pcn-utils.js";
import { getElementByIdOrThrow } from "../../utils/dom-helpers.js";
import { showToast } from "../../utils/ui-utils.js";
import { initFishing, initInitialMove, keepFishing } from "./fishing.js";
import { getCurrentFishState } from "./fish-state.js";
import { importFishState } from "./fish-state.js";
import { updateFishConfigDisplay, updateFishStatus, updateFishProgress, updateFishRootScore, updateLineFisherButtonStates, } from "./fish-ui.js";
// import { getRandomProofString, generateLineId } from "./fish-utils.js";
const lineAppState = {
    isFishAnalysisRunning: false,
    shouldStopFishAnalysis: false,
};
/**
 * Update Fish button states using existing Line Fisher button management
 */
function updateFishButtonStates(isAnalyzing) {
    lineAppState.isFishAnalysisRunning = isAnalyzing;
    lineAppState.shouldStopFishAnalysis = false;
    updateLineFisherButtonStates(isAnalyzing, getCurrentFishState().isFishing);
}
/**
 * Stop Fish analysis
 */
export const stopFishAnalysis = () => {
    console.log("Stopping Fish analysis");
    if (!lineAppState.isFishAnalysisRunning) {
        console.log("Fish analysis not running, nothing to stop");
        return;
    }
    // Set the stop flag to interrupt the analysis loop
    lineAppState.shouldStopFishAnalysis = true;
    // Set isFishing to false in current state if it exists
    getCurrentFishState().isFishing = false;
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
export async function fish(config) {
    // - create a state object, empty wip/done list.
    // Ensure current fish config reflects the UI config so initFishing uses it
    const state = getCurrentFishState();
    state.config = config;
    // - show config in UI (root board, limits, the whole thing)
    // - get root score, update config
    // - update root score in UI
    // - create an initial move
    //   - if there is a predefined move, use that, ask stockfish for the score
    //   - otherwise, ask stockfish for the best move of the root FEN
    // - add move to UI
    //   - when adding moves, create a node in the fish-results box to represent the move
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
    // Reset stop flag for new analysis
    lineAppState.shouldStopFishAnalysis = false;
    // Update button states - disable start, enable stop
    updateFishButtonStates(true);
    try {
        updateFishConfigDisplay(state.config);
        updateFishStatus("Starting root score analysis...");
        updateFishProgress(getCurrentFishState());
        await initFishing();
        // Update root score in UI
        updateFishRootScore(getCurrentFishState().config.baselineScore);
        updateFishStatus(`Creating initial move`);
        await initInitialMove();
        // Update progress and results after initial move
        updateFishProgress(getCurrentFishState());
        await keepFishing(getCurrentFishState().config.rootFEN, (msg) => {
            updateFishStatus(msg);
            // Only do expensive updates when structure changed or phase completed
            // Keep progress and live-lines in sync: update both together on any progress bump
            if (msg === "Progress updated" ||
                msg.startsWith("Expanded") ||
                msg.endsWith("complete")) {
                const state = getCurrentFishState();
                updateFishProgress(state);
            }
        });
        // Update button states - enable start, disable stop
        updateFishButtonStates(false);
    }
    catch (error) {
        console.error("Error thrown while fishing:", error);
        updateFishButtonStates(false);
        updateFishStatus("Error thrown while fishing");
        showToast(`Fish analysis failed: ${error instanceof Error ? error.message : String(error)}`, "#dc3545", 5000);
        throw error;
    }
}
export const importFishStateFromClipboard = async () => {
    console.log("Importing fish state from clipboard");
    try {
        // Read from clipboard
        const clipboardText = await navigator.clipboard.readText();
        if (!clipboardText) {
            showToast("No text found in clipboard", "#FF9800", 3000);
            return;
        }
        let importedState;
        try {
            importedState = JSON.parse(clipboardText);
        }
        catch {
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
        }
        else {
            showToast("Failed to import fish state", "#f44336", 4000);
        }
    }
    catch (error) {
        console.error("Error importing fish state:", error);
        showToast("Failed to import fish state", "#f44336", 4000);
    }
};
/**
 * Export fish state to clipboard
 * Export current analysis state to clipboard in JSON format for import.
 * Serialize current state, copy to clipboard, and show success notification
 */
export const exportFishStateToClipboard = async () => {
    try {
        // Create exportable state object
        const exportState = getCurrentFishState();
        // Convert to JSON and copy to clipboard
        const jsonState = JSON.stringify(exportState, null, 2);
        await navigator.clipboard.writeText(jsonState);
        // Show success notification
        const wipCount = exportState.wip.length;
        const doneCount = exportState.done.length;
        showToast(`Exported ${wipCount + doneCount} lines to clipboard (wip: ${wipCount}x, done: ${doneCount}x)`, "#4CAF50", 3000);
        console.log("Fish state exported to clipboard successfully");
    }
    catch (error) {
        console.error("Error exporting fish state:", error);
        showToast("Failed to export state", "#f44336", 4000);
    }
};
/**
 * Copy fish state to clipboard (for copy button)
 * Copy current analysis state to clipboard in plain text format.
 * Serialize current state, copy to clipboard, and show success notification
 */
export const copyFishStateToClipboard = async () => {
    console.log("Copying fish state to clipboard");
    try {
        const currentFishState = getCurrentFishState();
        // Get all lines (both WIP and done)
        const allLines = [...currentFishState.wip, ...currentFishState.done];
        if (allLines.length === 0) {
            showToast("No lines to copy", "#FF9800", 3000);
            return;
        }
        // Lines are already in PCN format, convert to long notation with move numbers
        const outputLines = allLines.map((line) => {
            // Convert each PCN to long coordinate notation (e.g., Ng1f3 -> g1f3, keep O-O/O-O-O)
            const longMoves = line.pcns.map((pcn) => {
                if (pcn === "O-O" || pcn === "O-O-O")
                    return pcn;
                if (/^[NBRQKP][a-h][1-8][a-h][1-8]$/.test(pcn)) {
                    return pcn.substring(1, 5);
                }
                // Already long or unexpected, keep as-is
                return pcn;
            });
            // Create move numbers manually for long moves
            const formattedLine = longMoves
                .map((m, idx) => idx % 2 === 0 ? `${Math.floor(idx / 2) + 1}. ${m}` : m)
                .join(" ");
            // Include top-5 best moves (responders) and their scores if available
            const metadata = {
                lineId: `line_${line.lineIndex}`,
                isMate: line.isMate,
                isStalemate: line.isStalemate,
                isTransposition: line.isTransposition,
                transpositionTarget: line.transpositionTarget,
                replies: line.best5Replies,
                alts: line.best5Alts,
            };
            return `${formattedLine} // ${JSON.stringify(metadata)}`;
        });
        // Create plain text format - one line per opening line in PCN notation
        const plainTextLines = outputLines.join("\n");
        // Copy plain text to clipboard
        await navigator.clipboard.writeText(plainTextLines);
        // Show success notification
        const wipCount = currentFishState.wip.length;
        const doneCount = currentFishState.done.length;
        showToast(`Copied ${allLines.length} lines to clipboard (long notation) (${wipCount} WIP, ${doneCount} done)`, "#4CAF50", 3000);
        console.log("Fish state copied to clipboard successfully");
    }
    catch (error) {
        console.error("Error copying fish state:", error);
        showToast("Failed to copy state", "#f44336", 4000);
    }
};
// Removed unused helpers createLineElement and createLineHTMLStructure
/**
 * Initialize Line Fisher (placeholder for compatibility)
 */
export const initializeLineFisher = async () => {
    console.log("Line Fisher initialization (placeholder)");
    // No initialization needed for Fish analysis
};
/**
 * Reset Fish analysis
 */
export const resetFishAnalysis = () => {
    console.log("Resetting Fish analysis");
    // Stop any running analysis
    if (lineAppState.isFishAnalysisRunning) {
        stopFishAnalysis();
    }
    // Clear state
    lineAppState.isFishAnalysisRunning = false;
    lineAppState.shouldStopFishAnalysis = true;
    // Update UI
    updateFishButtonStates(false);
    updateFishStatus("Analysis reset");
    // Clear results display
    const resultsElement = getElementByIdOrThrow("fish-results");
    resultsElement.innerHTML = "<p>No results to show yet...</p>";
    showToast("Fish analysis reset", "#FF9800", 3000);
};
//# sourceMappingURL=fish.js.map