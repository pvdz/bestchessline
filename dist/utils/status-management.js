import { getAppState } from "../main.js";
import * as BestLines from "../tree-digger.js";
/**
 * Status Management Utility Functions
 *
 * Provides functions for updating status messages and progress displays.
 */
/**
 * Update tree digger status
 */
export function updateTreeDiggerStatus(message) {
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
export function updateAnalysisStatus(message) {
    const statusElement = document.getElementById("analysis-status");
    if (!statusElement)
        return;
    if (message) {
        statusElement.textContent = message;
        return;
    }
    const appState = getAppState();
    if (appState.isAnalyzing) {
        statusElement.textContent = "Analyzing...";
    }
    else {
        statusElement.textContent = "Ready";
    }
}
//# sourceMappingURL=status-management.js.map