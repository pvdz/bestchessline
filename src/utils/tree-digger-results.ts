import * as BestLines from "../tree-digger.js";
import { getStartingPlayer } from "../utils.js";
import {
  getThreadCount,
  getDepthScaler,
  getFirstReplyOverride,
  getSecondReplyOverride,
  getResponderMovesCount,
} from "./ui-getters.js";
import { TreeDiggerAnalysis } from "../types.js";
import { getEventTrackingState } from "../main.js";
import { updateTreeDiggerTreeIncrementally } from "./tree-digger-manager.js";
import { renderProgressBoard } from "./board-rendering.js";

/**
 * Tree Digger Results Management Utility Functions
 *
 * Provides functions for managing tree digger results display and progress.
 */

/**
 * Update tree digger results display
 */
export function updateTreeDiggerResults(): void {
  const resultsElement = document.getElementById("tree-digger-results");
  if (!resultsElement) return;

  const analysis = BestLines.getCurrentAnalysis();
  if (!analysis) {
    resultsElement.innerHTML = "<p>No analysis results available.</p>";
    return;
  }

  // Update progress section
  updateTreeDiggerProgress(resultsElement, analysis);

  // Update tree section incrementally
  updateTreeDiggerTreeIncrementally(resultsElement, analysis);
}

/**
 * Update tree digger progress section
 */
export function updateTreeDiggerProgress(
  resultsElement: HTMLElement,
  analysis: TreeDiggerAnalysis,
): void {
  let progressSection = resultsElement.querySelector(
    ".tree-digger-progress-section",
  );
  if (!progressSection) {
    progressSection = document.createElement("div");
    progressSection.className = "tree-digger-progress-section";
    resultsElement.appendChild(progressSection);
  }

  const isAnalyzing = BestLines.isAnalyzing();
  const progress = BestLines.getProgress();
  const totalLeafs = BestLines.calculateTotalLeafs(analysis.nodes);
  const uniquePositions = BestLines.calculateUniquePositions(
    analysis.nodes,
    analysis,
  );
  const eventTrackingState = getEventTrackingState();

  // Calculate events per second from recent data
  const now = Date.now();
  const timeSinceRecentStart = now - eventTrackingState.recentStartTime;
  const timeWindow = Math.min(timeSinceRecentStart, 1000);
  const eventsPerSecond =
    !isAnalyzing || analysis?.isComplete
      ? 0
      : timeWindow > 0
        ? Math.round(eventTrackingState.recentCount / (timeWindow / 1000))
        : 0;

  // Get configuration values
  const depthScaler = getDepthScaler();
  const responderMovesCount = getResponderMovesCount();
  const firstReplyOverride = getFirstReplyOverride();
  const secondReplyOverride = getSecondReplyOverride();

  // Calculate total positions with overrides
  let totalPositionsWithOverrides = analysis.totalPositions;
  let overrideExplanation = "";

  if (firstReplyOverride > 0 || secondReplyOverride > 0) {
    // Recalculate with overrides
    const firstReply =
      firstReplyOverride > 0 ? firstReplyOverride : responderMovesCount;
    const secondReply =
      secondReplyOverride > 0 ? secondReplyOverride : responderMovesCount;

    totalPositionsWithOverrides =
      1 + 2 * firstReply + 2 * Math.pow(secondReply, 2);

    // Add remaining terms
    for (let n = 3; n <= Math.floor(depthScaler / 2); n++) {
      totalPositionsWithOverrides += 2 * Math.pow(responderMovesCount, n);
    }

    overrideExplanation = ` (with overrides: 1st reply=${firstReply}, 2nd reply=${secondReply})`;
  }

  const computationFormula = `1 + 2*${firstReplyOverride || responderMovesCount} + 2*${secondReplyOverride || responderMovesCount}<sup>2</sup> + 2∑(${responderMovesCount}<sup>n</sup>) for n from 3 to ⌊${depthScaler}/2⌋ = ${totalPositionsWithOverrides}`;

  const html = `
    <div class="tree-digger-progress-container">
      <div class="tree-digger-progress-left">
        <div class="tree-digger-stats">
          <div class="stat">
            <div class="stat-label">Total positions to analyze</div>
            <div class="stat-value">${totalPositionsWithOverrides}</div>
          </div>
          <div class="stat">
            <div class="stat-label">Analyzed</div>
            <div class="stat-value">${progress.analyzedPositions}</div>
          </div>
          <div class="stat">
            <div class="stat-label">Total Leafs</div>
            <div class="stat-value">${totalLeafs}</div>
          </div>
          <div class="stat">
            <div class="stat-label">Unique Positions</div>
            <div class="stat-value">${uniquePositions}</div>
          </div>
          <div class="stat">
            <div class="stat-label">Stockfish Events</div>
            <div class="stat-value">--</div>
          </div>
          <div class="stat">
            <div class="stat-label">Event Rate</div>
            <div class="stat-value">${eventsPerSecond || 0}/s</div>
          </div>
        </div>
        <div class="tree-digger-settings">
          <div class="setting">
            <div class="setting-label">Depth Scaler</div>
            <div class="setting-value">${depthScaler}</div>
          </div>
          <div class="setting">
            <div class="setting-label">1st ${(() => {
              const currentAnalysis = BestLines.getCurrentAnalysis();
              const rootFen =
                currentAnalysis?.rootFen ||
                "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
              const startingPlayer = getStartingPlayer(rootFen);
              return startingPlayer === "w" ? "White" : "Black";
            })()} Move</div>
            <div class="setting-value">${(document.getElementById("tree-digger-initiator-move-1") as HTMLInputElement | null)?.value || '<span style=\"color:#aaa\">[default]</span>'}</div>
          </div>
          <div class="setting">
            <div class="setting-label">2nd ${(() => {
              const currentAnalysis = BestLines.getCurrentAnalysis();
              const rootFen =
                currentAnalysis?.rootFen ||
                "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
              const startingPlayer = getStartingPlayer(rootFen);
              return startingPlayer === "w" ? "White" : "Black";
            })()} Move</div>
            <div class="setting-value">${(document.getElementById("tree-digger-initiator-move-2") as HTMLInputElement | null)?.value || '<span style=\"color:#aaa\">[default]</span>'}</div>
          </div>
          <div class="setting">
            <div class="setting-label">Responder Moves</div>
            <div class="setting-value">${responderMovesCount}</div>
          </div>
          <div class="setting">
            <div class="setting-label">1st Reply Override</div>
            <div class="setting-value">${firstReplyOverride > 0 ? firstReplyOverride : "0 (default)"}</div>
          </div>
          <div class="setting">
            <div class="setting-label">2nd Reply Override</div>
            <div class="setting-value">${secondReplyOverride > 0 ? secondReplyOverride : "0 (default)"}</div>
          </div>
          <div class="setting">
            <div class="setting-label">Threads</div>
            <div class="setting-value">${getThreadCount()}</div>
                  </div>
      </div>
      <div class="tree-digger-progress">
        <div class="tree-digger-progress-bar" style="width: ${progress.totalPositions > 0 ? (progress.analyzedPositions / progress.totalPositions) * 100 : 0}%"></div>
      </div>
      <div class="tree-digger-explanation">
          <h3>Analysis Progress</h3>
          <ul>
            <li><strong>Initial position</strong>: ${progress.initialPosition}</li>
            <li><strong>Total positions</strong>: ${computationFormula} positions to analyze${overrideExplanation}</li>
            <li><strong>Analyzed</strong>: ${progress.analyzedPositions} positions completed</li>
            <li><strong>Total leafs</strong>: ${totalLeafs} leaf nodes in the tree</li>
            <li><strong>Unique Positions</strong>: ${uniquePositions} distinct positions analyzed</li>
            <li><strong>Current activity</strong>: ${isAnalyzing ? "🔄 Analyzing position" : "Ready"} ${progress.currentPosition.substring(0, 30)}...</li>
            ${firstReplyOverride > 0 || secondReplyOverride > 0 ? `<li><strong>Computation</strong>: Depth ${depthScaler} × 2 = ${depthScaler * 2} levels, with ${firstReplyOverride > 0 ? `1st reply: ${firstReplyOverride}` : `1st reply: ${responderMovesCount}`} and ${secondReplyOverride > 0 ? `2nd reply: ${secondReplyOverride}` : `2nd reply: ${responderMovesCount}`} responder responses</li>` : ""}
          </ul>
        </div>
      </div>
      <div class="tree-digger-progress-board">
        <div class="tree-digger-progress-board-title">Root Board</div>
        <div class="offset-board" id="progress-board"></div>
      </div>
    </div>
  `;

  progressSection.innerHTML = html;

  // Render the progress board
  const progressBoardElement = progressSection.querySelector(
    "#progress-board",
  ) as HTMLElement;
  if (progressBoardElement) {
    renderProgressBoard(progressBoardElement, analysis.rootFen);
  }
}
