import { TREE_DIGGER_STATE_VERSION } from "../types.js";
import { getFEN } from "../chess-board.js";
import { log, logError } from "./logging.js";
import { calculateTotalLeafs } from "../tree-digger.js";
/**
 * Tree Digger State Persistence Utility Functions
 *
 * Provides functions for serializing, deserializing, and managing tree digger state.
 */
/**
 * Serialize a tree digger node for JSON export
 */
const serializeTreeNode = (node) => {
    return {
        fen: node.fen,
        move: node.move,
        score: node.score,
        depth: node.depth,
        children: node.children.map(serializeTreeNode),
        isWhiteMove: node.isWhiteMove,
        moveNumber: node.moveNumber,
        mateIn: node.mateIn,
        needsEvaluation: node.needsEvaluation,
    };
};
/**
 * Deserialize a tree digger node from JSON import
 */
const deserializeTreeNode = (serializedNode) => {
    return {
        fen: serializedNode.fen,
        move: serializedNode.move,
        score: serializedNode.score,
        depth: serializedNode.depth,
        children: serializedNode.children.map(deserializeTreeNode),
        isWhiteMove: serializedNode.isWhiteMove,
        moveNumber: serializedNode.moveNumber,
        mateIn: serializedNode.mateIn,
        needsEvaluation: serializedNode.needsEvaluation,
        // parent will be set during tree reconstruction
        // analysisResult will be restored during resumption
    };
};
/**
 * Calculate statistics for tree digger analysis
 */
const calculateAnalysisStatistics = (analysis) => {
    const totalNodes = analysis.nodes.reduce((count, node) => {
        const countNodesRecursive = (n) => {
            return (1 +
                n.children.reduce((sum, child) => sum + countNodesRecursive(child), 0));
        };
        return count + countNodesRecursive(node);
    }, 0);
    const totalLeafs = calculateTotalLeafs(analysis.nodes);
    const uniquePositions = analysis.analyzedPositions.size;
    const maxDepth = Math.max(...analysis.nodes.map((node) => {
        const getMaxDepth = (n, depth) => {
            if (n.children.length === 0)
                return depth;
            return Math.max(...n.children.map((child) => getMaxDepth(child, depth + 1)));
        };
        return getMaxDepth(node, 0);
    }), 0);
    return {
        totalNodes,
        totalLeafs,
        uniquePositions,
        maxDepth,
    };
};
/**
 * Serialize tree digger state for export
 */
export const serializeTreeDiggerState = (analysis, state) => {
    if (!analysis) {
        throw new Error("Cannot serialize null analysis");
    }
    const currentBoardPosition = getFEN();
    const statistics = calculateAnalysisStatistics(analysis);
    const metadata = {
        version: TREE_DIGGER_STATE_VERSION,
        timestamp: Date.now(),
        boardPosition: currentBoardPosition,
        configuration: analysis.config,
        progress: state.progress,
        statistics,
    };
    const serializedAnalysis = {
        rootFen: analysis.rootFen,
        nodes: analysis.nodes.map(serializeTreeNode),
        maxDepth: analysis.maxDepth,
        responderResponses: analysis.responderResponses,
        isComplete: analysis.isComplete,
        currentPosition: analysis.currentPosition,
        analysisQueue: analysis.analysisQueue,
        analyzedPositions: Array.from(analysis.analyzedPositions),
        totalPositions: analysis.totalPositions,
        initialPositionScore: analysis.initialPositionScore,
        config: analysis.config,
    };
    return {
        metadata,
        analysis: serializedAnalysis,
        state: {
            isAnalyzing: state.isAnalyzing,
            progress: state.progress,
        },
    };
};
/**
 * Validate imported tree digger state
 */
export const validateTreeDiggerState = (stateExport, currentBoardPosition, currentConfig) => {
    const errors = [];
    const warnings = [];
    // Version compatibility check
    const versionCompatible = stateExport.metadata.version === TREE_DIGGER_STATE_VERSION;
    if (!versionCompatible) {
        warnings.push(`State version ${stateExport.metadata.version} may not be compatible with current version ${TREE_DIGGER_STATE_VERSION}`);
    }
    // Board position check
    const boardPositionMatch = stateExport.metadata.boardPosition === currentBoardPosition;
    if (!boardPositionMatch) {
        warnings.push("Board position has changed since state was saved");
    }
    // Configuration compatibility check
    const configMatch = JSON.stringify(stateExport.metadata.configuration) ===
        JSON.stringify(currentConfig);
    if (!configMatch) {
        warnings.push("Analysis configuration has changed since state was saved");
    }
    // Basic structure validation
    if (!stateExport.analysis || !stateExport.analysis.nodes) {
        errors.push("Invalid state structure: missing analysis data");
    }
    if (!stateExport.metadata || !stateExport.metadata.version) {
        errors.push("Invalid state structure: missing metadata");
    }
    // FEN validation
    try {
        // Basic FEN validation - could be enhanced with proper FEN parsing
        if (!stateExport.analysis.rootFen ||
            stateExport.analysis.rootFen.split(" ").length !== 6) {
            errors.push("Invalid root FEN in state");
        }
    }
    catch (error) {
        errors.push("Failed to validate FEN in state");
    }
    const isValid = errors.length === 0;
    return {
        isValid,
        errors,
        warnings,
        compatibility: {
            versionCompatible,
            boardPositionMatch,
            configurationMatch: configMatch,
        },
    };
};
/**
 * Deserialize tree digger state from import
 */
export const deserializeTreeDiggerState = (stateExport) => {
    // Validate the state first
    const currentBoardPosition = getFEN();
    const currentConfig = {
        depthScaler: 0, // Will be set from state
        responderMovesCount: 0, // Will be set from state
        threads: 0, // Will be set from state
        initiatorMoves: [], // Will be set from state
        firstReplyOverride: 0, // Will be set from state
        secondReplyOverride: 0, // Will be set from state
    };
    const validation = validateTreeDiggerState(stateExport, currentBoardPosition, currentConfig);
    if (!validation.isValid) {
        throw new Error(`Invalid state: ${validation.errors.join(", ")}`);
    }
    // Reconstruct the analysis object
    const analysis = {
        rootFen: stateExport.analysis.rootFen,
        nodes: stateExport.analysis.nodes.map(deserializeTreeNode),
        maxDepth: stateExport.analysis.maxDepth,
        responderResponses: stateExport.analysis.responderResponses,
        isComplete: stateExport.analysis.isComplete,
        currentPosition: stateExport.analysis.currentPosition,
        analysisQueue: stateExport.analysis.analysisQueue,
        analyzedPositions: new Set(stateExport.analysis.analyzedPositions),
        totalPositions: stateExport.analysis.totalPositions,
        initialPositionScore: stateExport.analysis.initialPositionScore,
        config: stateExport.analysis.config,
    };
    // Reconstruct parent relationships
    const reconstructParents = (nodes, parent = null) => {
        for (const node of nodes) {
            node.parent = parent || undefined;
            reconstructParents(node.children, node);
        }
    };
    reconstructParents(analysis.nodes);
    const state = {
        isAnalyzing: stateExport.state.isAnalyzing,
        currentAnalysis: analysis,
        progress: stateExport.state.progress,
    };
    return { analysis, state };
};
/**
 * Export tree digger state to JSON file
 */
export const exportTreeDiggerState = (analysis, state) => {
    try {
        const stateExport = serializeTreeDiggerState(analysis, state);
        const jsonString = JSON.stringify(stateExport, null, 2);
        // Create and download file
        const blob = new Blob([jsonString], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
        const filename = `tree-digger-state-${timestamp}.json`;
        const link = document.createElement("a");
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        log(`Tree digger state exported to ${filename}`);
    }
    catch (error) {
        logError("Failed to export tree digger state:", error);
        throw error;
    }
};
/**
 * Copy tree digger state to clipboard as JSON
 */
export const copyTreeDiggerStateToClipboard = async (analysis, state) => {
    try {
        const stateExport = serializeTreeDiggerState(analysis, state);
        const jsonString = JSON.stringify(stateExport, null, 2);
        // Use modern clipboard API if available
        if (navigator.clipboard && window.isSecureContext) {
            await navigator.clipboard.writeText(jsonString);
            log("Tree digger state copied to clipboard");
        }
        else {
            // Fallback for older browsers or non-secure contexts
            const textArea = document.createElement("textarea");
            textArea.value = jsonString;
            textArea.style.position = "fixed";
            textArea.style.left = "-999999px";
            textArea.style.top = "-999999px";
            document.body.appendChild(textArea);
            textArea.focus();
            textArea.select();
            try {
                document.execCommand("copy");
                log("Tree digger state copied to clipboard (fallback method)");
            }
            catch (err) {
                logError("Failed to copy to clipboard:", err);
                throw new Error("Failed to copy to clipboard");
            }
            finally {
                document.body.removeChild(textArea);
            }
        }
    }
    catch (error) {
        logError("Failed to copy tree digger state to clipboard:", error);
        throw error;
    }
};
/**
 * Import tree digger state from JSON file
 */
export const importTreeDiggerState = async (file) => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const jsonString = event.target?.result;
                const stateExport = JSON.parse(jsonString);
                // Basic validation
                if (!stateExport.metadata || !stateExport.analysis) {
                    throw new Error("Invalid state file format");
                }
                resolve(stateExport);
            }
            catch (error) {
                logError("Failed to parse state file:", error);
                reject(error);
            }
        };
        reader.onerror = () => {
            reject(new Error("Failed to read file"));
        };
        reader.readAsText(file);
    });
};
/**
 * Import tree digger state from clipboard
 */
export const importTreeDiggerStateFromClipboard = async () => {
    try {
        let jsonString;
        // Try modern clipboard API first
        if (navigator.clipboard && window.isSecureContext) {
            jsonString = await navigator.clipboard.readText();
        }
        else {
            // Fallback for older browsers or non-secure contexts
            // Note: This requires user interaction and may not work in all browsers
            throw new Error("Clipboard reading requires secure context (HTTPS) and user interaction");
        }
        if (!jsonString || jsonString.trim() === "") {
            throw new Error("Clipboard is empty or contains no text");
        }
        // Try to parse the JSON
        let stateExport;
        try {
            stateExport = JSON.parse(jsonString);
        }
        catch (parseError) {
            throw new Error(`Invalid JSON format: ${parseError}`);
        }
        // Basic validation
        if (!stateExport.metadata || !stateExport.analysis) {
            throw new Error("Invalid state format - missing metadata or analysis");
        }
        // Validate version
        if (!stateExport.metadata.version) {
            throw new Error("Invalid state format - missing version");
        }
        log(`Successfully parsed clipboard state with version ${stateExport.metadata.version}`);
        return stateExport;
    }
    catch (error) {
        logError("Failed to import tree digger state from clipboard:", error);
        throw error;
    }
};
/**
 * Get state file size in a human-readable format
 */
export const formatStateFileSize = (bytes) => {
    if (bytes === 0)
        return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
};
/**
 * Estimate state file size for current analysis
 */
export const estimateStateFileSize = (analysis) => {
    if (!analysis)
        return 0;
    // Rough estimation based on node count and average node size
    const totalNodes = calculateAnalysisStatistics(analysis).totalNodes;
    const estimatedBytesPerNode = 200; // Rough estimate
    const metadataSize = 1000; // Rough estimate for metadata
    return totalNodes * estimatedBytesPerNode + metadataSize;
};
//# sourceMappingURL=tree-digger-persistence.js.map