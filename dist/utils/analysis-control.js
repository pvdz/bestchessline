import { getInputElement, getButtonElement } from "./dom-helpers.js";
import { logError } from "./logging.js";
import * as Stockfish from "../stockfish-client.js";
import * as BestLines from "../best-lines.js";
import * as Board from "../chess-board.js";
/**
 * Analysis Control Utility Functions
 *
 * Provides functions for controlling chess engine analysis, managing
 * analysis state, and updating UI elements related to analysis.
 */
/**
 * Start analysis
 */
export function startAnalysis(appState, updateAppState, updateButtonStates, updatePositionEvaluationDisplay, updateResults) {
    if (appState.isAnalyzing)
        return Promise.resolve();
    updateAppState({
        isAnalyzing: true,
    });
    updateButtonStates();
    updatePositionEvaluationDisplay();
    return Stockfish.analyzePosition(Board.getFEN(), getAnalysisOptions(), (analysisResult) => {
        updateAppState({
            currentResults: analysisResult,
            isAnalyzing: !analysisResult.completed,
        });
        updateResults(analysisResult);
        updateButtonStates();
    }).then((result) => {
        updateAppState({
            currentResults: result,
            isAnalyzing: false,
        });
        updateButtonStates();
    }).catch((error) => {
        logError("Analysis failed:", error);
        updateAppState({ isAnalyzing: false });
        updateButtonStates();
    });
}
/**
 * Stop analysis
 */
export function stopAnalysis(appState, updateAppState, updateButtonStates, updateResultsPanel) {
    Stockfish.stopAnalysis();
    updateAppState({
        isAnalyzing: false,
        currentResults: null,
    });
    updateButtonStates();
    updateResultsPanel([]);
}
/**
 * Get analysis options from UI
 */
export function getAnalysisOptions() {
    const maxDepth = getInputElement("max-depth")?.value || "20";
    const whiteMoves = getInputElement("white-moves")?.value || "5";
    const responderMoves = getInputElement("responder-moves")?.value || "5";
    // Force threads to 1 in fallback mode
    const threads = Stockfish.isFallbackMode()
        ? "1"
        : getInputElement("threads")?.value || "1";
    return {
        depth: parseInt(maxDepth),
        threads: parseInt(threads),
        multiPV: Math.max(parseInt(whiteMoves), parseInt(responderMoves)),
    };
}
/**
 * Update button states
 */
export function updateButtonStates(appState) {
    const startBtn = getButtonElement("start-analysis");
    const stopBtn = getButtonElement("stop-analysis");
    // Disable start button if main analysis is running OR position evaluation is running
    const isStockfishBusy = appState.isAnalyzing || appState.positionEvaluation.isAnalyzing;
    if (startBtn)
        startBtn.disabled = isStockfishBusy;
    if (stopBtn)
        stopBtn.disabled = !appState.isAnalyzing;
}
/**
 * Start best lines analysis
 */
export function startBestLinesAnalysis(updateBestLinesButtonStates, updateBestLinesStatus, updateBestLinesResults) {
    return BestLines.startBestLinesAnalysis().then(() => {
        updateBestLinesButtonStates();
        updateBestLinesStatus();
        updateBestLinesResults();
    }).catch((error) => {
        logError("Failed to start best lines analysis:", error);
        updateBestLinesStatus("Error starting analysis");
    });
}
/**
 * Stop best lines analysis
 */
export function stopBestLinesAnalysis(clearTreeNodeDOMMap, updateBestLinesButtonStates, updateBestLinesStatus) {
    console.log("Stop button clicked - calling stopBestLinesAnalysis");
    try {
        BestLines.stopBestLinesAnalysis();
        console.log("BestLines.stopBestLinesAnalysis() completed");
        clearTreeNodeDOMMap(); // Clear tracked DOM elements
        updateBestLinesButtonStates();
        updateBestLinesStatus("Analysis stopped");
        console.log("Stop analysis completed successfully");
    }
    catch (error) {
        console.error("Failed to stop best lines analysis:", error);
        logError("Failed to stop best lines analysis:", error);
    }
}
/**
 * Clear best lines analysis
 */
export function clearBestLinesAnalysis(clearTreeNodeDOMMap, updateBestLinesButtonStates, updateBestLinesStatus, updateBestLinesResults) {
    try {
        BestLines.clearBestLinesAnalysis();
        clearTreeNodeDOMMap(); // Clear tracked DOM elements
        updateBestLinesButtonStates();
        updateBestLinesStatus("Ready");
        updateBestLinesResults();
    }
    catch (error) {
        logError("Failed to clear best lines analysis:", error);
    }
}
/**
 * Update best lines button states
 */
export function updateBestLinesButtonStates(appState) {
    const startBtn = getButtonElement("start-tree-digger");
    const stopBtn = getButtonElement("stop-tree-digger");
    const clearBtn = getButtonElement("clear-tree-digger");
    const isAnalyzing = BestLines.isAnalyzing();
    const isStockfishBusy = appState.isAnalyzing || appState.positionEvaluation.isAnalyzing;
    if (startBtn) {
        startBtn.disabled = isAnalyzing || isStockfishBusy;
    }
    else {
        console.error("Start button not found!");
    }
    if (stopBtn) {
        stopBtn.disabled = !isAnalyzing;
    }
    else {
        console.error("Stop button not found!");
    }
    if (clearBtn) {
        clearBtn.disabled = isAnalyzing;
    }
    else {
        console.error("Clear button not found!");
    }
}
/**
 * Update best lines status
 */
export function updateBestLinesStatus(message) {
    const statusElement = document.getElementById("tree-digger-status");
    if (!statusElement)
        return;
    if (message) {
        statusElement.textContent = message;
        return;
    }
    const isAnalyzing = BestLines.isAnalyzing();
    const progress = BestLines.getProgress();
    const analysis = BestLines.getCurrentAnalysis();
    if (isAnalyzing) {
        const progressPercent = progress.totalPositions > 0
            ? Math.round((progress.analyzedPositions / progress.totalPositions) * 100)
            : 0;
        const currentPos = progress.currentPosition.substring(0, 30) + "...";
        statusElement.textContent = `Analyzing... ${progress.analyzedPositions}/${progress.totalPositions} (${progressPercent}%) - ${currentPos}`;
    }
    else if (analysis?.isComplete) {
        statusElement.textContent = "Analysis complete";
    }
    else {
        statusElement.textContent = "Ready";
    }
}
/**
 * Update analysis status
 */
export function updateAnalysisStatus(appState, message) {
    const statusElement = document.getElementById("analysis-status");
    if (!statusElement)
        return;
    if (message) {
        statusElement.textContent = message;
        return;
    }
    if (appState.isAnalyzing) {
        statusElement.textContent = "Analyzing...";
    }
    else {
        statusElement.textContent = "Ready";
    }
}
//# sourceMappingURL=analysis-control.js.map