import { computeSanGameFromPCN, formatPCNLineWithMoveNumbers, } from "../../utils/pcn-utils.js";
import { getElementByIdOrThrow, querySelectorOrThrow, } from "../../utils/dom-helpers.js";
import { calculateTotalNodes, calculateTotalLines, calculateResponderNodes, } from "./fish-calculations.js";
import { getCurrentFishState } from "./fish-state.js";
import { compareAnalysisMoves } from "../best/bestmove-utils.js";
import { parseFEN } from "../../utils/fen-utils.js";
import { PLAYER_COLORS } from "../types.js";
import { formatScoreWithMateIn } from "../../utils/formatting-utils.js";
import { coordsToSquare, getPieceAtSquareFromFEN, } from "../../utils/fen-utils.js";
import { importGame } from "../board/game-navigation.js";
import { log } from "../../utils/logging.js";
/**
 * Live lines preview: render last few WIP and Done lines at an interval-gated cadence.
 * Visible only when toggled on; when toggled off, rendering stops but panel remains visible.
 */
let liveLineRenderBackoff = false;
let liveLienRenderRequested = false;
const FISH_LIVE_LINES_MIN_INTERVAL_MS = 300; // throttle UI updates
/**
 * Update fish config display in UI
 * Non-blocking UI update with error handling
 */
export function updateFishConfigDisplay(config) {
    try {
        // Calculate total nodes and lines using existing fish functions
        const totalNodes = calculateTotalNodes(config);
        const totalLines = calculateTotalLines(config);
        const initiatorDisplay = getElementByIdOrThrow("fish-config-initiator-moves");
        initiatorDisplay.textContent = config.initiatorMoves.join(", ") || "(none)";
        const responderDisplay = getElementByIdOrThrow("fish-config-responder-counts");
        responderDisplay.textContent =
            config.responderMoveCounts.join(", ") || "(default)";
        const depthDisplay = getElementByIdOrThrow("fish-config-move-depth");
        depthDisplay.textContent = config.maxDepth.toString();
        const threadsDisplay = getElementByIdOrThrow("fish-config-threads");
        threadsDisplay.textContent = config.threads.toString();
        // Add total nodes, lines, and formulas to config display
        const totalNodesElement = getElementByIdOrThrow("fish-config-total-nodes");
        totalNodesElement.textContent = totalNodes.toString();
        const totalLinesElement = getElementByIdOrThrow("fish-config-total-lines");
        totalLinesElement.textContent = totalLines.toString();
        const { nodeFormula, lineFormula } = generateLineFisherFormula(config);
        const nodeFormulaElement = getElementByIdOrThrow("fish-config-node-formula");
        nodeFormulaElement.innerHTML = nodeFormula;
        const lineFormulaElement = getElementByIdOrThrow("fish-config-line-formula");
        lineFormulaElement.innerHTML = lineFormula;
        renderLineFisherBoard(config.rootFEN);
    }
    catch (error) {
        console.error("Failed to update fish config display:", error);
    }
}
/**
 * Render chess board in the Line Fisher config section
 * Similar to tree digger board rendering
 */
const renderLineFisherBoard = (fen) => {
    const boardDisplay = getElementByIdOrThrow("fish-board-display");
    // Check if the board already shows this position
    const currentFEN = boardDisplay.getAttribute("data-fen");
    if (currentFEN === fen) {
        return; // Don't re-render if it's the same position
    }
    // Clear existing content
    boardDisplay.innerHTML = "";
    boardDisplay.setAttribute("data-fen", fen);
    // Create proper table structure for CSS table layout
    for (let rank = 0; rank < 8; rank++) {
        const tableRow = document.createElement("tr");
        for (let file = 0; file < 8; file++) {
            const tableCell = document.createElement("td");
            tableCell.className = "fish-board-square";
            // Get piece from FEN using existing utility function
            const square = coordsToSquare(rank, file);
            const piece = getPieceAtSquareFromFEN(square, fen);
            if (piece) {
                tableCell.textContent = piece;
            }
            tableRow.appendChild(tableCell);
        }
        boardDisplay.appendChild(tableRow);
    }
};
/**
 * Update fish status display
 * Non-blocking UI update with error handling
 */
export function updateFishStatus(message) {
    getElementByIdOrThrow("fish-status").textContent = message;
}
/**
 * Update fish progress display
 * Non-blocking UI update with error handling
 */
export function updateFishProgress(state) {
    let failure = false;
    try {
        const wipCount = state.wip.length;
        const wipDisplay = getElementByIdOrThrow("fish-status-wips");
        wipDisplay.textContent = wipCount.toString();
        const doneCount = state.done.length;
        const doneDisplay = getElementByIdOrThrow("fish-status-dones");
        doneDisplay.textContent = doneCount.toString();
        // Show transposition count
        const transpositionsEl = document.getElementById("fish-status-transpositions");
        if (transpositionsEl) {
            const n = typeof state.transpositionCount === "number"
                ? state.transpositionCount
                : 0;
            transpositionsEl.textContent = String(n);
        }
        // Calculate totals (line-based progress)
        const totalLines = calculateResponderNodes(state.config) + 1;
        const progressPercent = totalLines > 0 ? (state.done.length / totalLines) * 100 : 0;
        const linesDisplay = getElementByIdOrThrow("fish-status-lines");
        linesDisplay.textContent = `${state.done.length} / ${totalLines} (${progressPercent.toFixed(2)}%)`;
        const positionDisplay = getElementByIdOrThrow("fish-status-position");
        const currentLine = state.wip[0];
        if (currentLine) {
            let sanGame = currentLine.sanGame;
            if (!sanGame) {
                try {
                    sanGame = computeSanGameFromPCN(currentLine.pcns, state.config.rootFEN);
                }
                catch (e) {
                    console.warn("computeSanGameFromPCN failed; using empty SAN", e);
                    failure = true;
                    sanGame = "";
                }
            }
            positionDisplay.textContent = sanGame || "Root position";
        }
        else {
            positionDisplay.textContent = "Complete";
        }
        // Update progress bar (line-based progress)
        const progressBar = getElementByIdOrThrow("fish-status-progress-bar");
        const progressFill = getElementByIdOrThrow("fish-status-progress-fill");
        const progressFillTotal = getElementByIdOrThrow("fish-status-progress-fill-total");
        // Done-only progress (dark blue)
        const cappedProgress = Math.min(progressPercent, 100);
        progressFill.style.width = `${cappedProgress}%`;
        // Done+WIP (light overlay)
        const inFlight = state.done.length + state.wip.length;
        const totalOverlayPercent = totalLines > 0 ? Math.min((inFlight / totalLines) * 100, 100) : 0;
        progressFillTotal.style.width = `${totalOverlayPercent}%`;
        // Expose max/current via ARIA for clarity
        progressBar.setAttribute("role", "progressbar");
        progressBar.setAttribute("aria-valuemin", "0");
        progressBar.setAttribute("aria-valuemax", String(totalLines));
        progressBar.setAttribute("aria-valuenow", String(state.done.length));
        // Keep the progress/system max in sync with what we present here
        const leafNodeElement = getElementByIdOrThrow("fish-config-leaf-nodes");
        const reachedLines = state.done.length + state.wip.length;
        const percentage = totalLines > 0 ? (reachedLines / totalLines) * 100 : 0;
        leafNodeElement.textContent = `${reachedLines} / ${totalLines} (${percentage.toFixed(1)}%)`;
        updateLiveLinesPreview();
        // Live Stockfish stats (nps, depth, nodes, time)
        const statusBar = document.getElementById("fish-status");
        const statDepth = document.getElementById("fish-stat-depth");
        const statNps = document.getElementById("fish-stat-nps");
        const statNodes = document.getElementById("fish-stat-nodes");
        const statTime = document.getElementById("fish-stat-time");
        if (statusBar) {
            const onStats = (e) => {
                const { nps, depth, nodes, time } = e.detail || {};
                if (typeof depth === "number" &&
                    typeof nps === "number" &&
                    typeof nodes === "number" &&
                    typeof time === "number") {
                    // Keep status brief and put details in dedicated fields
                    statusBar.textContent = "Analyzing…";
                    if (statDepth)
                        statDepth.textContent = String(depth);
                    if (statNps)
                        statNps.textContent = (nps || 0).toLocaleString();
                    if (statNodes)
                        statNodes.textContent = (nodes || 0).toLocaleString();
                    if (statTime)
                        statTime.textContent = `${time || 0}ms`;
                }
            };
            // Attach once; remove previous to avoid duplicates
            window.removeEventListener("stockfish-stats", statusBar.__onStats);
            window.addEventListener("stockfish-stats", onStats);
            statusBar.__onStats = onStats;
        }
        // Also update PV ticker (throttled internally) using last snapshot
        if (lastFishPvMoves)
            updateFishPvTickerThrottled(lastFishPvMoves, lastFishPvFen);
    }
    catch (error) {
        console.error("Failed to update fish progress:", error);
    }
    return failure;
}
// ---------------------------------------------------------
// PV ticker below fish-status (throttled) - explicit updates only
// ---------------------------------------------------------
const FISH_PV_MIN_INTERVAL_MS = 1000;
let lastFishPvMoves = [];
let lastFishPvFen = "";
let fishPvTickerTimer;
export function updateFishPvTickerThrottled(moves, fen, force = false) {
    // Store last received moves/fen immediately; render when throttle allows
    lastFishPvMoves = moves || [];
    lastFishPvFen = fen || "";
    if (!force && fishPvTickerTimer) {
        if (!lastFishPvMoves)
            lastFishPvMoves = moves;
        // Throttled; skip this update
        return;
    }
    fishPvTickerTimer = setTimeout(() => {
        if (lastFishPvMoves)
            updateFishPvTickerThrottled(lastMoves, lastFishPvFen, true);
        fishPvTickerTimer = null;
    }, FISH_PV_MIN_INTERVAL_MS);
    const lastMoves = lastFishPvMoves;
    lastFishPvMoves = null;
    if (!getCurrentFishState().isFishing)
        return;
    const el = getElementByIdOrThrow("fish-pv-ticker");
    if (!lastMoves.length) {
        el.textContent = ["", "", "", "", ""].join("\n");
        return;
    }
    log("updateFishPvTickerThrottled() for", lastMoves);
    const dir = parseFEN(lastFishPvFen).turn === PLAYER_COLORS.BLACK ? "asc" : "desc";
    const sortedAll = lastMoves
        .slice(0)
        .sort((a, b) => {
        const cmp = compareAnalysisMoves(a, b, dir);
        if (cmp !== 0)
            return cmp;
        const aKey = `${a.move.from}${a.move.to}`;
        const bKey = `${b.move.from}${b.move.to}`;
        return aKey.localeCompare(bKey);
    });
    const have = new Set();
    const sorted = [];
    for (const move of sortedAll) {
        if (!have.has(move.move.from + move.move.to)) {
            sorted.push(move);
            if (sorted.length >= 5)
                break;
            have.add(move.move.from + move.move.to);
        }
    }
    const linesArr = sorted.map((m, i) => {
        const d = `d${m.depth}`;
        const s = formatScoreWithMateIn(m.score, m.mateIn);
        const pv = m.pv.map((mv) => mv.from + mv.to).join(" ");
        return `${i + 1}. ${d} ${s}  ${pv}`;
    });
    while (linesArr.length < 5)
        linesArr.push("");
    el.textContent = linesArr.join("\n");
}
function isLiveLinesEnabled() {
    const checkbox = document.getElementById("fish-lines-toggle");
    return !!(checkbox && checkbox.checked);
}
export function updateLiveLinesPreview() {
    if (liveLineRenderBackoff) {
        liveLienRenderRequested = true;
        return;
    }
    // Throttle and schedule it
    setTimeout(() => {
        liveLineRenderBackoff = false;
        if (liveLienRenderRequested) {
            updateLiveLinesPreview();
        }
    }, FISH_LIVE_LINES_MIN_INTERVAL_MS);
    liveLineRenderBackoff = true;
    liveLienRenderRequested = false;
    try {
        const panel = document.getElementById("fish-lines-panel");
        if (!panel)
            return;
        // Always keep panel visible once it appeared; only gate updates by toggle
        const enabled = isLiveLinesEnabled();
        if (enabled && panel.style.display === "none") {
            panel.style.display = "block";
        }
        if (!enabled)
            return; // do not update when disabled
        const state = getCurrentFishState();
        const wipContainer = document.getElementById("fish-lines-wip");
        const doneContainer = document.getElementById("fish-lines-done");
        if (!wipContainer || !doneContainer)
            return;
        // Show last up to 10 entries from each list (Fisher-generated lines)
        const lastWip = state.wip.slice(-10);
        const lastDone = state.done.slice(-10);
        // Update headings with showing/queue counts
        const wipHeading = document.querySelector("#fish-lines-wip")
            ?.previousElementSibling;
        const doneHeading = document.querySelector("#fish-lines-done")
            ?.previousElementSibling;
        if (wipHeading) {
            wipHeading.textContent = `WIP ${lastWip.length}/${state.wip.length}`;
        }
        if (doneHeading) {
            doneHeading.textContent = `Done ${lastDone.length}/${state.done.length}`;
        }
        // Render lines as clickable elements
        const renderLines = (container, lines) => {
            if (lines.length === 0) {
                container.textContent = "(none)";
                return;
            }
            const html = lines
                .map((l) => `<div class="fish-live-line" data-line-id="${l.lineIndex}">${formatPCNLineWithMoveNumbers(l.pcns)}</div>`)
                .join("");
            container.innerHTML = html;
        };
        renderLines(wipContainer, lastWip);
        renderLines(doneContainer, lastDone);
        // Click-to-open on main board using event delegation
        const delegateClick = (container) => {
            container.onclick = (e) => {
                const target = e.target;
                const item = target.closest(".fish-live-line");
                if (!item)
                    return;
                const idAttr = item.getAttribute("data-line-id");
                if (!idAttr)
                    return;
                const id = parseInt(idAttr, 10);
                const line = state.wip.find((l) => l.lineIndex === id) ||
                    state.done.find((l) => l.lineIndex === id);
                if (!line)
                    return;
                const notation = formatPCNLineWithMoveNumbers(line.pcns);
                importGame(notation);
            };
        };
        delegateClick(wipContainer);
        delegateClick(doneContainer);
    }
    catch (e) {
        console.warn("Failed to update live lines preview", e);
    }
}
/**
 * Update fish root score display
 * Non-blocking UI update with error handling
 */
export function updateFishRootScore(score) {
    try {
        const scoreSpan = getElementByIdOrThrow("fish-config-root-score");
        const scoreInPawns = score / 100;
        const scoreText = scoreInPawns > 0
            ? `+${scoreInPawns.toFixed(1)}`
            : scoreInPawns.toFixed(1);
        scoreSpan.textContent = scoreText;
    }
    catch (error) {
        console.error("Failed to update fish root score:", error);
    }
}
/**
 * Update an existing line element's content without re-rendering
 */
export const updateLineElement = (lineElement, line) => {
    const scoreInPawns = line.score / 100;
    const scoreText = scoreInPawns > 0 ? `+${scoreInPawns.toFixed(1)}` : scoreInPawns.toFixed(1);
    let lineNumberStyle = "";
    let lineNumberPrefix = "";
    if (!line.isDone) {
        lineNumberStyle =
            "background-color: #ffeb3b; color: #000; padding: 1px 3px; border-radius: 3px;";
    }
    else if (line.isFull) {
        lineNumberStyle =
            "border: 1px solid #666; padding: 1px 3px; border-radius: 3px;";
    }
    // Add end-of-line indicator
    const endIndicator = line.isFull ? " 🏁" : "";
    // Update individual child elements instead of setting innerHTML
    const lineNumberElement = querySelectorOrThrow(lineElement, ".fish-line-number");
    const lineScoreElement = querySelectorOrThrow(lineElement, ".fish-line-score");
    // Note: delta element is not used in compact view updates
    const lineNotationElement = querySelectorOrThrow(lineElement, ".fish-line-notation");
    const lineCompleteElement = querySelectorOrThrow(lineElement, ".line-complete");
    const lineDoneElement = querySelectorOrThrow(lineElement, ".line-done");
    lineNumberElement.style.cssText = lineNumberStyle;
    lineNumberElement.textContent = `${lineNumberPrefix}${line.lineIndex + 1}.`;
    lineScoreElement.textContent = scoreText;
    lineNotationElement.textContent = line.sanGame + endIndicator;
    lineCompleteElement.textContent = `Complete: ${line.isFull}`;
    lineDoneElement.textContent = `Done: ${line.isDone}`;
};
/**
 * Generate computation formula for Line Fisher
 * Creates a human-readable formula showing how nodes and lines are calculated
 */
const generateLineFisherFormula = (config) => {
    const maxDepth = config.maxDepth;
    const responderCounts = config.responderMoveCounts;
    const defaultResponderCount = config.defaultResponderCount;
    // If the count is fixed for all layers, it would be sum(m^i) for each i = 0 to maxDepth-1
    // But because m can be different for every depth, we have to do this more complicated way.
    // So we'll show the extrapolated formula for overrides and them a sum for the rest.
    // For each move, increase prod by responder count at this move. Then add that result to the sum.
    // When we reach the first move that has no override, finalize the fomula with the sum.
    let prod = "";
    let nodeFormula = "";
    for (let i = 0; i < maxDepth; i++) {
        if (i < responderCounts.length) {
            prod = prod + (prod ? " * " : "") + responderCounts[i];
            nodeFormula =
                nodeFormula + (nodeFormula ? " + " : "") + " ( " + prod + " )";
        }
        else {
            nodeFormula =
                nodeFormula +
                    (nodeFormula ? " + " : "") +
                    " prod( sum( " +
                    prod +
                    " * " +
                    defaultResponderCount +
                    "<sup>n</sup> ) for n = " +
                    (responderCounts.length + 1) +
                    " .. " +
                    maxDepth +
                    " )";
            break;
        }
    }
    if (responderCounts.length) {
        nodeFormula =
            "1 + 2 * (" + nodeFormula + " ) = " + calculateTotalNodes(config);
    }
    else {
        nodeFormula = "1";
    }
    // The lines are simply the product of the number of responder moves. Initiator moves don't matter (always 1).
    let lineFormula = "";
    for (let i = 0; i < maxDepth; i++) {
        if (i < responderCounts.length) {
            lineFormula =
                lineFormula + (lineFormula ? " * " : "") + responderCounts[i];
        }
        else {
            lineFormula =
                lineFormula +
                    (lineFormula ? " * " : "") +
                    defaultResponderCount +
                    "<sup>" +
                    (maxDepth - responderCounts.length) +
                    "</sup>";
            break;
        }
    }
    lineFormula = (lineFormula || "1") + " = " + calculateTotalLines(config);
    return { nodeFormula, lineFormula };
};
/**
 * Update Line Fisher button states
 * Enable/disable buttons based on analysis state, update visual feedback,
 * and handle button state transitions
 */
export const updateLineFisherButtonStates = (isAnalyzing, isFishing) => {
    // Update button states based on analysis status
    const stopBtn = getElementByIdOrThrow("fish-stop");
    const resetBtn = getElementByIdOrThrow("fish-reset");
    const continueBtn = getElementByIdOrThrow("fish-continue");
    const copyBtn = getElementByIdOrThrow("fish-copy");
    const startFish2Btn = getElementByIdOrThrow("fish-start");
    const hasResults = getCurrentFishState().done.length > 0;
    // Update button states
    stopBtn.disabled = !isAnalyzing && !isFishing;
    resetBtn.disabled = isAnalyzing || isFishing;
    continueBtn.disabled = isAnalyzing || isFishing || !hasResults;
    copyBtn.disabled = false; // Copy should always work
    startFish2Btn.disabled = isAnalyzing || isFishing;
};
//# sourceMappingURL=fish-ui.js.map