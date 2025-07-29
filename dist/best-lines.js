import {
  parseFEN,
  log,
  logError,
  moveToNotation,
  getFENWithCorrectMoveCounter,
  getGlobalCurrentMoveIndex,
  applyMoveToFEN,
  parseSimpleMove,
  getDepthScaler,
  getBlackMovesCount,
  getThreadCount,
  getWhiteMoves,
} from "./utils.js";
import * as Stockfish from "./stockfish-client.js";
import * as Board from "./chess-board.js";
// ============================================================================
// BEST LINES STATE MANAGEMENT
// ============================================================================
/**
 * Best lines state instance
 */
let bestLinesState = {
  isAnalyzing: false,
  currentAnalysis: null,
  progress: {
    totalPositions: 0,
    analyzedPositions: 0,
    currentPosition: "",
    initialPosition: "",
    pvLinesReceived: 0,
  },
};
/**
 * Update best lines state
 */
const updateBestLinesState = (updates) => {
  bestLinesState = { ...bestLinesState, ...updates };
};
/**
 * Get current best lines state
 */
const getBestLinesState = () => ({ ...bestLinesState });
// ============================================================================
// ANALYSIS CONFIGURATION
// ============================================================================
/**
 * Get analysis options from stored configuration
 */
const getAnalysisOptions = (analysis) => {
  log(`Best lines analysis using ${analysis.config.threads} threads`);
  return {
    depth: 20,
    multiPV: 5,
    threads: analysis.config.threads,
  };
};
// ============================================================================
// CORE ANALYSIS LOGIC
// ============================================================================
/**
 * Calculate total positions to analyze
 */
const calculateTotalPositions = (maxDepth, blackResponses) => {
  let total = 0;
  let positionsAtDepth = 1; // Start with root position
  for (let depth = 0; depth < maxDepth; depth++) {
    total += positionsAtDepth;
    // Only multiply by blackResponses for black moves (odd depths)
    if (depth % 2 === 1) {
      positionsAtDepth *= blackResponses;
    }
  }
  return total;
};
/**
 * Initialize a new best lines analysis
 */
const initializeBestLinesAnalysis = () => {
  // Use current board position instead of hardcoded starting position
  const boardFEN = Board.getFEN();
  // Get current move index from global state
  const currentMoveIndex = getGlobalCurrentMoveIndex();
  const position = Board.getPosition();
  const rootFen = getFENWithCorrectMoveCounter(
    boardFEN,
    currentMoveIndex,
    position.castling,
    position.enPassant,
  );
  // Capture all configuration values at startup
  const depthScaler = getDepthScaler();
  const blackMovesCount = getBlackMovesCount();
  const threads = getThreadCount();
  const whiteMoves = getWhiteMoves();
  const maxDepth = depthScaler * 2; // depthScaler white moves + depthScaler black responses
  const totalPositions = calculateTotalPositions(maxDepth, blackMovesCount);
  log(`Initializing best lines analysis from current position: ${rootFen}`);
  log(
    `Configuration: depthScaler=${depthScaler}, blackMoves=${blackMovesCount}, threads=${threads}, whiteMoves=${whiteMoves.join(",")}`,
  );
  return {
    rootFen,
    nodes: [],
    maxDepth,
    blackResponses: blackMovesCount,
    isComplete: false,
    currentPosition: rootFen,
    analysisQueue: [rootFen],
    analyzedPositions: new Set(),
    totalPositions,
    config: {
      depthScaler,
      blackMovesCount,
      threads,
      whiteMoves,
    },
  };
};
/**
 * Apply move to FEN
 */
/**
 * Parse a move string and apply it to a position
 */
const parseAndApplyMove = (moveText, fen) => {
  try {
    const move = parseSimpleMove(moveText, fen);
    if (!move) {
      logError(`Failed to parse move: ${moveText}`);
      return null;
    }
    const newFen = applyMoveToFEN(fen, move);
    return { move, newFen };
  } catch (error) {
    logError(`Error applying move ${moveText} to position:`, error);
    return null;
  }
};
/**
 * Create a node for the best lines tree
 */
const createNode = (
  fen,
  move,
  score,
  depth,
  isWhiteMove,
  moveNumber,
  parent,
) => {
  return {
    fen,
    move,
    score,
    depth,
    children: [],
    isWhiteMove,
    moveNumber,
    parent,
  };
};
/**
 * Analyze a position to find the best moves
 */
const analyzePosition = async (fen, analysis) => {
  try {
    const options = getAnalysisOptions(analysis);
    const result = await Stockfish.analyzePosition(fen, options);
    return result;
  } catch (error) {
    logError(`Failed to analyze position ${fen}:`, error);
    return null;
  }
};
/**
 * Process a position in the analysis queue
 */
const processPosition = async (fen, analysis) => {
  if (analysis.analyzedPositions.has(fen)) {
    log(`Position already analyzed: ${fen}`);
    return;
  }
  log(`Analyzing position: ${fen}`);
  // Parse the position to determine whose turn it is
  const position = parseFEN(fen);
  const isWhiteTurn = position.turn === "w";
  if (isWhiteTurn) {
    // White's turn - apply hardcoded moves
    await processWhiteMoves(fen, analysis);
  } else {
    // Black's turn - analyze for best responses
    await processBlackMoves(fen, analysis);
  }
  analysis.analyzedPositions.add(fen);
};
/**
 * Process white moves (analyze for best moves)
 */
const processWhiteMoves = async (fen, analysis) => {
  const position = parseFEN(fen);
  const moveNumber = position.fullMoveNumber;
  log(`Analyzing for white move at move number ${moveNumber}`);
  // Get white moves from stored config
  const whiteMoves = analysis.config.whiteMoves;
  const whiteMoveIndex = moveNumber - 1; // 1-based to 0-based
  if (whiteMoveIndex < whiteMoves.length && whiteMoves[whiteMoveIndex]) {
    // Use move from stored config
    const moveText = whiteMoves[whiteMoveIndex];
    log(`Using white move from stored config: ${moveText}`);
    const result = parseAndApplyMove(moveText, fen);
    if (result) {
      const { move, newFen } = result;
      // Create node for this move
      const node = createNode(
        fen,
        move,
        0, // UI moves don't have scores from analysis
        0,
        true,
        moveNumber,
      );
      analysis.nodes.push(node);
      analysis.analysisQueue.push(newFen);
      log(`Applied white move from stored config: ${moveText} -> ${newFen}`);
    } else {
      logError(`Failed to parse white move from stored config: ${moveText}`);
    }
  } else {
    // No UI move available - analyze and pick best move
    log(`Analyzing for white move at move number ${moveNumber}`);
    // Analyze the position to find best white move
    const analysisResult = await analyzePosition(fen, analysis);
    if (!analysisResult || analysisResult.moves.length === 0) {
      logError(`No analysis results for white move: ${fen}`);
      return;
    }
    // Take the best move
    const bestMove = analysisResult.moves[0];
    const newFen = applyMoveToFEN(fen, bestMove.move);
    // Create node for this move
    const node = createNode(
      fen,
      bestMove.move,
      bestMove.score,
      bestMove.depth,
      true,
      moveNumber,
    );
    node.analysisResult = analysisResult;
    analysis.nodes.push(node);
    analysis.analysisQueue.push(newFen);
    log(
      `Applied white move from analysis: ${moveToNotation(bestMove.move)} (score: ${bestMove.score}) -> ${newFen}`,
    );
  }
};
/**
 * Process black moves (analyze for best responses)
 */
const processBlackMoves = async (fen, analysis) => {
  const position = parseFEN(fen);
  const moveNumber = position.fullMoveNumber;
  // Analyze the position to find best responses
  const analysisResult = await analyzePosition(fen, analysis);
  if (!analysisResult || analysisResult.moves.length === 0) {
    logError(`No analysis results for position: ${fen}`);
    return;
  }
  // Take top 2 responses (or fewer if less available) - reduced for debugging
  const topMoves = analysisResult.moves.slice(0, 2);
  for (const analysisMove of topMoves) {
    const newFen = applyMoveToFEN(fen, analysisMove.move);
    // Create node for this move
    const node = createNode(
      fen,
      analysisMove.move,
      analysisMove.score,
      analysisMove.depth,
      false,
      moveNumber,
    );
    node.analysisResult = analysisResult;
    analysis.nodes.push(node);
    analysis.analysisQueue.push(newFen);
    log(
      `Found black response: ${moveToNotation(analysisMove.move)} (score: ${analysisMove.score}) -> ${newFen}`,
    );
  }
};
/**
 * Start the best lines analysis
 */
const startBestLinesAnalysis = async () => {
  log("Starting best lines analysis...");
  // Prevent multiple simultaneous analysis processes
  if (bestLinesState.isAnalyzing) {
    console.log("Analysis already in progress, skipping...");
    return;
  }
  // Stop any existing analysis first to prevent conflicts
  if (Stockfish.isAnalyzingPosition()) {
    log("Stopping existing analysis before starting tree digger...");
    Stockfish.stopAnalysis();
  }
  const analysis = initializeBestLinesAnalysis();
  updateBestLinesState({
    isAnalyzing: true,
    currentAnalysis: analysis,
    progress: {
      totalPositions: analysis.totalPositions,
      analyzedPositions: 0,
      currentPosition: analysis.rootFen,
      initialPosition: analysis.rootFen,
      pvLinesReceived: 0,
    },
  });
  try {
    // Start with the root position and build the tree correctly
    log("Starting tree building from root position:", analysis.rootFen);
    const boardFEN = Board.getFEN();
    // Get current move index from global state
    const currentMoveIndex = getGlobalCurrentMoveIndex();
    const position = Board.getPosition();
    const currentBoardFen = getFENWithCorrectMoveCounter(
      boardFEN,
      currentMoveIndex,
      position.castling,
      position.enPassant,
    );
    log("Current board FEN:", currentBoardFen);
    // Ensure we start from the correct root position
    if (analysis.rootFen !== currentBoardFen) {
      logError("Root FEN is incorrect:", analysis.rootFen);
      logError("Expected:", currentBoardFen);
      throw new Error("Root FEN is incorrect");
    }
    // Clear any existing state and start fresh
    analysis.nodes = [];
    analysis.analyzedPositions.clear();
    analysis.analysisQueue = [analysis.rootFen];
    log(
      "Starting analysis with depth scaler:",
      getDepthScaler(),
      "-> maxDepth:",
      analysis.maxDepth,
    );
    console.log(`Tree building started at ${new Date().toISOString()}`);
    await buildAnalysisTree(analysis.rootFen, analysis, null, 0);
    // Mark analysis as complete
    analysis.isComplete = true;
    updateBestLinesState({
      isAnalyzing: false,
      currentAnalysis: analysis,
    });
    log("Best lines analysis complete!");
  } catch (error) {
    logError("Error during best lines analysis:", error);
    updateBestLinesState({
      isAnalyzing: false,
    });
  }
};
/**
 * Recursively build the analysis tree
 */
const buildAnalysisTree = async (fen, analysis, parentNode, depth) => {
  // Check if we've reached max depth
  if (depth >= analysis.maxDepth) {
    log(`Reached max depth ${depth}, stopping analysis`);
    return;
  }
  // Check for transposition - if we've already analyzed this position, skip it
  if (analysis.analyzedPositions.has(fen)) {
    log(`Transposition detected at depth ${depth}, skipping: ${fen}`);
    return;
  }
  // DEBUG: Log the first few positions being processed
  if (depth <= 2) {
    log(
      `DEBUG: Processing at depth ${depth}, position: ${fen.substring(0, 30)}...`,
    );
  }
  // Update progress with more detailed information
  const currentAnalyzed = bestLinesState.progress.analyzedPositions + 1;
  updateBestLinesState({
    progress: {
      ...bestLinesState.progress,
      currentPosition: fen,
      analyzedPositions: currentAnalyzed,
    },
  });
  const position = parseFEN(fen);
  const isWhiteTurn = position.turn === "w";
  if (isWhiteTurn) {
    // White's turn - apply hardcoded moves
    await processWhiteMoveInTree(fen, analysis, parentNode, depth);
  } else {
    // Black's turn - analyze for best responses
    await processBlackMovesInTree(fen, analysis, parentNode, depth);
  }
  // Add to analyzed positions AFTER we finish processing to prevent re-processing
  analysis.analyzedPositions.add(fen);
};
/**
 * Process white move in tree structure
 */
const processWhiteMoveInTree = async (fen, analysis, parentNode, depth) => {
  // Calculate move number based on current game position plus tree depth
  // Get the current game position's move number from the root FEN
  const rootPosition = parseFEN(analysis.rootFen);
  const currentGameMoveNumber = rootPosition.fullMoveNumber;
  // Calculate the move number for this tree node
  // Each depth level represents one half-move (ply)
  // White moves happen at even depths (0, 2, 4, etc.)
  const whiteMoveIndex = Math.floor(depth / 2);
  const moveNumber = currentGameMoveNumber + whiteMoveIndex;
  console.log(
    `Processing white move at depth ${depth}, current game move: ${currentGameMoveNumber}, tree move: ${moveNumber}`,
  );
  log(
    `Processing white move at depth ${depth}, current game move: ${currentGameMoveNumber}, tree move: ${moveNumber}`,
  );
  // Get white moves from stored config
  const whiteMoves = analysis.config.whiteMoves;
  if (whiteMoveIndex < whiteMoves.length && whiteMoves[whiteMoveIndex]) {
    // Use move from stored config
    const moveText = whiteMoves[whiteMoveIndex];
    log(`Using white move from stored config: ${moveText}`);
    const result = parseAndApplyMove(moveText, fen);
    if (result) {
      const { move, newFen } = result;
      // Create node for this move
      const node = createNode(
        fen,
        move,
        0, // UI moves don't have scores from analysis
        0,
        true,
        moveNumber, // Use calculated move number
        parentNode || undefined,
      );
      log(
        `Created white node with move number: ${node.moveNumber}, move: ${moveToNotation(node.move)}`,
      );
      // Add to parent's children if it exists, otherwise add to root nodes
      if (parentNode) {
        parentNode.children.push(node);
        log(
          `Added node: ${moveToNotation(node.move)} -> parent: ${moveToNotation(parentNode.move)}`,
        );
      } else {
        // Root node - add to root nodes array
        analysis.nodes.push(node);
        log(`Added root node: ${moveToNotation(node.move)}`);
      }
      log(`Applied white move from stored config: ${moveText} -> ${newFen}`);
      // Continue building the tree from this new position
      log(
        `Recursive call: depth ${depth} -> ${depth + 1}, position: ${newFen.substring(0, 30)}...`,
      );
      await buildAnalysisTree(newFen, analysis, node, depth + 1);
    } else {
      logError(`Failed to parse white move from stored config: ${moveText}`);
    }
  } else {
    // No UI move available - analyze and pick best move
    log(`Analyzing for white move at depth ${depth}`);
    // Analyze the position to find best white move
    const analysisOptions = getAnalysisOptions(analysis);
    const analysisResult = await analyzePosition(fen, analysis);
    if (!analysisResult || analysisResult.moves.length === 0) {
      logError(`No analysis results for white move: ${fen}`);
      return;
    }
    // Filter moves that have reached full depth and sort by quality
    const targetDepth = getAnalysisOptions(analysis).depth || 20;
    const fullyAnalyzedMoves = analysisResult.moves.filter(
      (move) => move.depth >= targetDepth,
    );
    if (fullyAnalyzedMoves.length === 0) {
      log(`No fully analyzed moves at depth ${targetDepth} for white move`);
      return;
    }
    // Sort by quality: mate moves first, then by score
    const sortedMoves = fullyAnalyzedMoves.sort((a, b) => {
      // Mate moves get highest priority
      if (a.score > 9000 && b.score <= 9000) return -1;
      if (b.score > 9000 && a.score <= 9000) return 1;
      if (a.score > 9000 && b.score > 9000) {
        // Both are mate moves, prefer shorter mates (lower score)
        return a.score - b.score;
      }
      // Non-mate moves sorted by score (higher is better for white)
      return b.score - a.score;
    });
    // Take the best move
    const bestMove = sortedMoves[0];
    const newFen = applyMoveToFEN(fen, bestMove.move);
    // Create node for this move
    const node = createNode(
      fen,
      bestMove.move,
      bestMove.score,
      bestMove.depth,
      true,
      moveNumber, // Use calculated move number
      parentNode || undefined,
    );
    log(
      `Created analyzed white node with move number: ${node.moveNumber}, move: ${moveToNotation(node.move)}`,
    );
    // Add to parent's children if it exists, otherwise add to root nodes
    if (parentNode) {
      parentNode.children.push(node);
      log(
        `Added node: ${moveToNotation(node.move)} -> parent: ${moveToNotation(parentNode.move)}`,
      );
    } else {
      // Root node - add to root nodes array
      analysis.nodes.push(node);
      log(`Added root node: ${moveToNotation(node.move)}`);
    }
    log(
      `Applied white move from analysis: ${moveToNotation(bestMove.move)} -> ${newFen}`,
    );
    // Continue building the tree from this new position
    log(
      `Recursive call: depth ${depth} -> ${depth + 1}, position: ${newFen.substring(0, 30)}...`,
    );
    await buildAnalysisTree(newFen, analysis, node, depth + 1);
  }
};
/**
 * Process black moves in tree structure
 */
const processBlackMovesInTree = async (fen, analysis, parentNode, depth) => {
  // Calculate move number based on current game position plus tree depth
  // Get the current game position's move number from the root FEN
  const rootPosition = parseFEN(analysis.rootFen);
  const currentGameMoveNumber = rootPosition.fullMoveNumber;
  // Calculate the move number for this tree node
  // Black moves happen at odd depths (1, 3, 5, etc.)
  const blackMoveIndex = Math.floor((depth - 1) / 2);
  const moveNumber = currentGameMoveNumber + blackMoveIndex;
  console.log(
    `Processing black moves at depth ${depth}, current game move: ${currentGameMoveNumber}, tree move: ${moveNumber}`,
  );
  log(
    `Analyzing black responses at depth ${depth}, current game move: ${currentGameMoveNumber}, tree move: ${moveNumber}, position: ${fen.substring(0, 30)}...`,
  );
  // Dispatch analysis start event
  window.dispatchEvent(
    new CustomEvent("stockfish-analyzing", {
      detail: {
        message: `Analyzing position at depth ${depth}...`,
        position: fen.substring(0, 30) + "...",
      },
    }),
  );
  // Analyze the position to find best responses
  const analysisOptions = getAnalysisOptions(analysis);
  const analysisResult = await analyzePosition(fen, analysis);
  if (!analysisResult || analysisResult.moves.length === 0) {
    logError(`No analysis results for position: ${fen}`);
    logError(`No analysis results for position: ${fen}`);
    return;
  }
  log(
    `Analysis complete: ${analysisResult.moves.length} moves found, depths: ${analysisResult.moves.map((m) => m.depth).join(", ")}`,
  );
  // Increment PV lines counter
  incrementPVLines();
  // Dispatch analysis complete event
  window.dispatchEvent(
    new CustomEvent("stockfish-analysis-complete", {
      detail: {
        message: `Analysis complete: ${analysisResult.moves.length} moves found`,
        movesFound: analysisResult.moves.length,
      },
    }),
  );
  // Filter moves that have reached full depth and sort by quality
  const targetDepth = getAnalysisOptions(analysis).depth || 20;
  const fullyAnalyzedMoves = analysisResult.moves.filter(
    (move) => move.depth >= targetDepth,
  );
  log(
    `Moves at target depth ${targetDepth}: ${fullyAnalyzedMoves.length}/${analysisResult.moves.length}`,
  );
  if (fullyAnalyzedMoves.length === 0) {
    log(`No fully analyzed moves at depth ${targetDepth} for position: ${fen}`);
    log(`No fully analyzed moves at depth ${targetDepth} for position: ${fen}`);
    return;
  }
  // Sort by quality: mate moves first, then by score
  const sortedMoves = fullyAnalyzedMoves.sort((a, b) => {
    // Mate moves get highest priority
    if (a.score > 9000 && b.score <= 9000) return -1;
    if (b.score > 9000 && a.score <= 9000) return 1;
    if (a.score > 9000 && b.score > 9000) {
      // Both are mate moves, prefer shorter mates (lower score)
      return a.score - b.score;
    }
    // Non-mate moves sorted by score (higher is better for white)
    return b.score - a.score;
  });
  // Take top N responses (or fewer if less available) - use stored config
  const topMoves = sortedMoves.slice(0, analysis.config.blackMovesCount);
  log(
    `Selected ${topMoves.length} moves: ${topMoves.map((m) => `${moveToNotation(m.move)} (${m.score})`).join(", ")}`,
  );
  // Clear existing children and add new ones (simpler approach)
  if (parentNode) {
    parentNode.children = [];
  } else {
    analysis.nodes = [];
  }
  for (const analysisMove of topMoves) {
    const newFen = applyMoveToFEN(fen, analysisMove.move);
    // Check for transposition - if we've already analyzed this position, skip it
    if (analysis.analyzedPositions.has(newFen)) {
      log(
        `Transposition detected: ${moveToNotation(analysisMove.move)} -> ${newFen} (already analyzed)`,
      );
      continue;
    }
    // Create new node for this move
    const node = createNode(
      fen,
      analysisMove.move,
      analysisMove.score,
      analysisMove.depth,
      false,
      moveNumber,
      parentNode || undefined,
    );
    log(
      `Created black node with move number: ${node.moveNumber}, move: ${moveToNotation(node.move)}`,
    );
    node.analysisResult = analysisResult;
    // Add to parent's children if it exists, otherwise add to root nodes
    if (parentNode) {
      parentNode.children.push(node);
      log(
        `Added black node: ${moveToNotation(node.move)} -> parent: ${moveToNotation(parentNode.move)}`,
      );
    } else {
      // Root node - add to root nodes array
      analysis.nodes.push(node);
      log(`Added black root node: ${moveToNotation(node.move)}`);
    }
    log(
      `Found black response: ${moveToNotation(analysisMove.move)} (score: ${analysisMove.score}) -> ${newFen}`,
    );
    // Continue building the tree from this new position
    log(
      `Recursive call (black): depth ${depth} -> ${depth + 1}, position: ${newFen.substring(0, 30)}...`,
    );
    await buildAnalysisTree(newFen, analysis, node, depth + 1);
  }
};
/**
 * Stop the best lines analysis
 */
const stopBestLinesAnalysis = () => {
  log("BestLines: Stopping best lines analysis...");
  log("Stopping best lines analysis...");
  updateBestLinesState({
    isAnalyzing: false,
  });
  log("BestLines: Analysis stopped, isAnalyzing set to false");
};
/**
 * Clear the best lines analysis
 */
const clearBestLinesAnalysis = () => {
  log("Clearing best lines analysis...");
  updateBestLinesState({
    isAnalyzing: false,
    currentAnalysis: null,
    progress: {
      totalPositions: 0,
      analyzedPositions: 0,
      currentPosition: "",
      initialPosition: "",
      pvLinesReceived: 0,
    },
  });
};
/**
 * Get the current analysis results
 */
const getCurrentAnalysis = () => {
  return bestLinesState.currentAnalysis;
};
/**
 * Check if analysis is currently running
 */
const isAnalyzing = () => {
  return bestLinesState.isAnalyzing;
};
/**
 * Get current progress
 */
const getProgress = () => {
  return bestLinesState.progress;
};
/**
 * Increment PV lines counter
 */
const incrementPVLines = () => {
  bestLinesState.progress.pvLinesReceived++;
  window.dispatchEvent(
    new CustomEvent("stockfish-pv-update", {
      detail: {
        pvLines: bestLinesState.progress.pvLinesReceived,
      },
    }),
  );
};
/**
 * Calculate total leaf nodes in the tree
 */
const calculateTotalLeafs = (nodes) => {
  let totalLeafs = 0;
  const countLeafsRecursive = (node) => {
    if (node.children.length === 0) {
      totalLeafs++;
    }
    // Recursively count leafs from children
    for (const child of node.children) {
      countLeafsRecursive(child);
    }
  };
  // Count leafs from root nodes
  for (const node of nodes) {
    countLeafsRecursive(node);
  }
  return totalLeafs;
};
/**
 * Calculate number of unique positions analyzed
 */
const calculateUniquePositions = (nodes, analysis) => {
  return analysis.analyzedPositions.size;
};
// ============================================================================
// EXPORTS
// ============================================================================
export {
  startBestLinesAnalysis,
  stopBestLinesAnalysis,
  clearBestLinesAnalysis,
  getCurrentAnalysis,
  isAnalyzing,
  getProgress,
  getBestLinesState,
  calculateTotalLeafs,
  calculateUniquePositions,
};
//# sourceMappingURL=best-lines.js.map
