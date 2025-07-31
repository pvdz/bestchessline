import { log, logError } from "./logging.js";
import { formatScoreWithMateIn } from "./formatting-utils.js";
import * as Stockfish from "../stockfish-client.js";
import * as Board from "../chess-board.js";
/**
 * Position Evaluation Utility Functions
 *
 * Provides functions for evaluating chess positions using Stockfish engine,
 * managing evaluation state, and updating the evaluation display.
 */
/**
 * Reset position evaluation to initial state
 */
export function resetPositionEvaluation(appState, updateAppState, updatePositionEvaluationDisplay, updateButtonStates) {
    updateAppState({
        positionEvaluation: {
            score: null,
            isMate: false,
            mateIn: null,
            isAnalyzing: false,
        },
    });
    updatePositionEvaluationDisplay();
    updateButtonStates();
}
/**
 * Initialize position evaluation button
 */
export function initializePositionEvaluationButton(evaluateCurrentPosition) {
    const evaluationButton = document.getElementById("position-evaluation-btn");
    if (evaluationButton) {
        evaluationButton.addEventListener("click", () => {
            evaluateCurrentPosition();
        });
    }
}
/**
 * Evaluate the current board position using Stockfish
 */
export function evaluateCurrentPosition(appState, updateAppState, updatePositionEvaluationDisplay, updateButtonStates) {
    const currentFEN = Board.getFEN();
    if (!currentFEN) {
        log("No position available for evaluation");
        return Promise.resolve();
    }
    log(`Evaluating position: ${currentFEN}`);
    // Don't evaluate if main analysis is running
    if (appState.isAnalyzing) {
        log("Skipping position evaluation - main analysis is running");
        return Promise.resolve();
    }
    // Update state to show we're analyzing
    updateAppState({
        positionEvaluation: {
            ...appState.positionEvaluation,
            isAnalyzing: true,
        },
    });
    updatePositionEvaluationDisplay();
    updateButtonStates();
    return Promise.race([
        Stockfish.analyzePosition(currentFEN, {
            depth: 20,
            threads: 1,
            multiPV: 1,
        }),
        new Promise((_, reject) => setTimeout(() => reject(new Error("Analysis timeout")), 10000)),
    ]).then((result) => {
        if (result.moves.length > 0) {
            const bestMove = result.moves[0];
            const score = bestMove.score;
            // Log the evaluation for debugging
            log(`Position evaluation: ${score} centipawns (${score / 100} pawns)`);
            // Determine if it's a mate
            const isMate = Math.abs(score) >= 10000;
            const mateIn = isMate ? Math.ceil((10000 - Math.abs(score)) / 2) : null;
            updateAppState({
                positionEvaluation: {
                    score,
                    isMate,
                    mateIn,
                    isAnalyzing: false,
                },
            });
        }
        else {
            log("No moves found in analysis result");
            updateAppState({
                positionEvaluation: {
                    score: null,
                    isMate: false,
                    mateIn: null,
                    isAnalyzing: false,
                },
            });
        }
    }).catch((error) => {
        logError("Error evaluating position:", error);
        updateAppState({
            positionEvaluation: {
                score: null,
                isMate: false,
                mateIn: null,
                isAnalyzing: false,
            },
        });
    }).finally(() => {
        updatePositionEvaluationDisplay();
        updateButtonStates();
    });
}
/**
 * Update the position evaluation display
 */
export function updatePositionEvaluationDisplay(appState) {
    const evaluationButton = document.getElementById("position-evaluation-btn");
    if (!evaluationButton) {
        return;
    }
    const { score, isMate, mateIn, isAnalyzing } = appState.positionEvaluation;
    if (isAnalyzing) {
        evaluationButton.textContent = "...";
        evaluationButton.className = "evaluation-button neutral";
        evaluationButton.disabled = true;
        return;
    }
    if (score === null) {
        evaluationButton.textContent = "??";
        evaluationButton.className = "evaluation-button neutral";
        evaluationButton.disabled = false;
        return;
    }
    let displayText;
    let className;
    if (isMate) {
        // Use the new formatter for mate scores
        displayText = formatScoreWithMateIn(score, mateIn ?? 0);
        className = "evaluation-button mate";
    }
    else {
        // Convert centipawns to pawns and format
        const scoreInPawns = score / 100;
        displayText = score > 0
            ? `+${scoreInPawns.toFixed(1)}`
            : `${scoreInPawns.toFixed(1)}`;
        className = score > 0
            ? "evaluation-button positive"
            : score < 0
                ? "evaluation-button negative"
                : "evaluation-button neutral";
    }
    evaluationButton.textContent = displayText;
    evaluationButton.className = className;
    evaluationButton.disabled = false;
}
//# sourceMappingURL=position-evaluation.js.map