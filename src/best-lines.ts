import {
  BestLineNode,
  BestLinesAnalysis,
  BestLinesState,
  ChessMove,
  AnalysisResult,
  AnalysisMove,
  StockfishOptions,
  PLAYER_COLORS,
} from "./types.js";
import {
  parseFEN,
  moveToNotation,
  compareAnalysisMoves,
  getFENWithCorrectMoveCounter,
  getGlobalCurrentMoveIndex,
  applyMoveToFEN,
  parseSimpleMove,
  calculateTotalPositionsWithOverrides,
  getStartingPlayer,
} from "./utils.js";
import {
  getDepthScaler,
  getResponderMovesCount,
  getThreadCount,
  getInitiatorMoves,
  getFirstReplyOverride,
  getSecondReplyOverride,
} from "./utils/ui-getters.js";
import {
  log,
  logError,
} from "./utils/logging.js";
import * as Stockfish from "./stockfish-client.js";
import * as Board from "./chess-board.js";

// ============================================================================
// BEST LINES STATE MANAGEMENT
// ============================================================================

/**
 * Best lines state instance
 */
let bestLinesState: BestLinesState = {
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
const updateBestLinesState = (updates: Partial<BestLinesState>): void => {
  bestLinesState = { ...bestLinesState, ...updates };
};

/**
 * Get current best lines state
 */
const getBestLinesState = (): BestLinesState => ({ ...bestLinesState });

// ============================================================================
// ANALYSIS CONFIGURATION
// ============================================================================

/**
 * Get analysis options from predefined configuration
 */
const getAnalysisOptions = (analysis: BestLinesAnalysis): StockfishOptions => {
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
 * Initialize a new best lines analysis
 */
const initializeBestLinesAnalysis = (): BestLinesAnalysis => {
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
  const responderMovesCount = getResponderMovesCount();
  const threads = getThreadCount();
  const initiatorMoves = getInitiatorMoves();
  const firstReplyOverride = getFirstReplyOverride();
  const secondReplyOverride = getSecondReplyOverride();

  const maxDepth = depthScaler; // depthScaler directly represents the max depth
  const totalPositions = calculateTotalPositionsWithOverrides(
    maxDepth,
    responderMovesCount,
    firstReplyOverride,
    secondReplyOverride,
  );

  log(`Initializing best lines analysis from current position: ${rootFen}`);
  log(
    `Configuration: depthScaler=${depthScaler} (maxDepth=${maxDepth}), responderMoves=${responderMovesCount}, threads=${threads}, initiatorMoves=${initiatorMoves.join(",")}, overrides=[${firstReplyOverride},${secondReplyOverride}]`,
  );

  return {
    rootFen,
    nodes: [],
    maxDepth,
    responderResponses: responderMovesCount,
    isComplete: false,
    currentPosition: rootFen,
    analysisQueue: [rootFen],
    analyzedPositions: new Set(),
    totalPositions,
    config: {
      depthScaler,
      responderMovesCount,
      threads,
      initiatorMoves,
      firstReplyOverride,
      secondReplyOverride,
    },
    // Store the initial position evaluation
    initialPositionScore: undefined,
  };
};

/**
 * Apply move to FEN
 */

/**
 * Parse a move string and apply it to a position
 */
const parseAndApplyMove = (
  moveText: string,
  fen: string,
): { move: ChessMove; newFen: string } | null => {
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
  fen: string,
  move: ChessMove,
  score: number,
  depth: number,
  isWhiteMove: boolean,
  moveNumber: number,
  parent?: BestLineNode,
  mateIn?: number,
): BestLineNode => {
  return {
    fen,
    move,
    score,
    depth,
    children: [],
    isWhiteMove,
    moveNumber,
    parent,
    mateIn,
  };
};

/**
 * Analyze a position to find the best moves
 */
const analyzePosition = async (
  fen: string,
  analysis: BestLinesAnalysis,
): Promise<AnalysisResult | null> => {
  // Check if analysis has been stopped
  if (!bestLinesState.isAnalyzing) {
    log(`Analysis stopped, aborting analyzePosition`);
    return null;
  }

  try {
    const options = getAnalysisOptions(analysis);
    const result = await Stockfish.analyzePosition(fen, options);
    return result;
  } catch (error) {
    logError(`Failed to analyze position ${fen}:`, error);
    console.log(`analyzePosition() failed with error:`, error);
    return null;
  }
};

/**
 * Process a position in the analysis queue
 */
const processPosition = async (
  fen: string,
  analysis: BestLinesAnalysis,
): Promise<void> => {
  if (analysis.analyzedPositions.has(fen)) {
    log(`Position already analyzed: ${fen}`);
    return;
  }

  log(`Analyzing position: ${fen}`);

  // Parse the position to determine whose turn it is
  const position = parseFEN(fen);
  const isWhiteTurn = position.turn === PLAYER_COLORS.WHITE;

  // Get the starting player from the root FEN
  const startingPlayer = getStartingPlayer(analysis.rootFen);

  // Determine if this is the initiator's turn
  // If starting player is white, then white's turn means initiator's turn
  // If starting player is black, then black's turn means initiator's turn
  const isInitiatorTurn =
    (startingPlayer === PLAYER_COLORS.WHITE && isWhiteTurn) ||
    (startingPlayer === PLAYER_COLORS.BLACK && !isWhiteTurn);

  if (isInitiatorTurn) {
    // Initiator's turn - apply hardcoded moves
    await processInitiatorMoves(fen, analysis);
  } else {
    // Responder's turn - analyze for best responses
    await processResponderMoves(fen, analysis);
  }

  analysis.analyzedPositions.add(fen);

  // Update any nodes that need evaluation with the new analysis results
  updateNodesNeedingEvaluation(fen, analysis);
};

/**
 * Process initiator moves (analyze for best moves)
 */
const processInitiatorMoves = async (
  fen: string,
  analysis: BestLinesAnalysis,
): Promise<void> => {
  const position = parseFEN(fen);
  const moveNumber = position.fullMoveNumber;

  log(`Analyzing for initiator move at move number ${moveNumber}`);

  // Get initiator moves from predefined config
  const initiatorMoves = analysis.config.initiatorMoves;
  const initiatorMoveIndex = moveNumber - 1; // 1-based to 0-based

  if (
    initiatorMoveIndex < initiatorMoves.length &&
    initiatorMoves[initiatorMoveIndex]
  ) {
    // Use move from predefined config
    const moveText = initiatorMoves[initiatorMoveIndex];
    log(`Using initiator move from predefined config: ${moveText}`);

    const result = parseAndApplyMove(moveText, fen);

    if (result) {
      const { move, newFen } = result;

      // Evaluate the predefined move specifically
      const options = getAnalysisOptions(analysis);
      // Increase depth to ensure we get a good evaluation
      const evaluationOptions = {
        ...options,
        depth: Math.max(options.depth || 20, 20),
      };

      let score = 0;
      let depth = 0;
      let mateIn = undefined;
      let analysisResult = null;

      // For the first move, we need to establish the baseline from the initial position
      if (moveNumber === 1 && analysis.initialPositionScore === undefined) {
        try {
          const initialAnalysis = await Stockfish.analyzePosition(
            fen,
            evaluationOptions,
          );
          if (initialAnalysis && initialAnalysis.moves.length > 0) {
            // Use the best move's score as the baseline for the initial position
            analysis.initialPositionScore = initialAnalysis.moves[0].score;
          }
        } catch (error) {
          logError(
            `[FIRST_MOVE_DEBUG] Failed to evaluate initial position:`,
            error,
          );
        }
      }

      try {
        // Evaluate the position AFTER the move is made (newFen), not the initial position
        analysisResult = await Stockfish.analyzePosition(
          newFen,
          evaluationOptions,
        );

        if (analysisResult && analysisResult.moves.length > 0) {
          // Find the predefined move in the analysis results
          const matchingMove = analysisResult.moves.find(
            (analysisMove) =>
              analysisMove.move.from === move.from &&
              analysisMove.move.to === move.to &&
              analysisMove.move.piece === move.piece,
          );

          if (matchingMove) {
            score = matchingMove.score;
            depth = matchingMove.depth;
            mateIn = matchingMove.mateIn;
          } else {
            // If the move isn't in the top moves, we need to evaluate it specifically
            // For now, we'll use the best move's score as an approximation
            // This is a limitation - we'd need to modify Stockfish to evaluate specific moves
            const bestMove = analysisResult.moves[0];
            score = bestMove.score;
            depth = bestMove.depth;
            mateIn = bestMove.mateIn;
          }
        }
      } catch (error) {
        logError(
          `[FIRST_MOVE_DEBUG] Failed to evaluate predefined move ${moveText}:`,
          error,
        );
        // Fallback to default values
        score = 0;
        depth = 0;
        mateIn = undefined;
      }

      // Create node for this move with evaluated score
      const node = createNode(
        fen,
        move,
        score,
        depth,
        true,
        moveNumber,
        undefined, // parent
        mateIn,
      );

      node.analysisResult = analysisResult || undefined;
      analysis.nodes.push(node);
      analysis.analysisQueue.push(newFen);

      log(
        `Applied initiator move from predefined config: ${moveText} -> ${newFen}`,
      );

      // Only mark as needing evaluation if we truly don't have a score
      // A score of 0 is valid (equal position), so we only mark as needing evaluation
      // if we don't have an analysis result at all
      if (!analysisResult) {
        // Mark this node for later evaluation
        node.needsEvaluation = true;

        // Schedule this move for evaluation
        scheduleMoveForEvaluation(node, analysis);
      }
    } else {
      logError(
        `Failed to parse initiator move from predefined config: ${moveText}`,
      );
    }
  } else {
    // No UI move available - analyze and pick best move
    log(`Analyzing for initiator move at move number ${moveNumber}`);

    // Analyze the position to find best initiator move
    const analysisResult = await analyzePosition(fen, analysis);

    if (!analysisResult || analysisResult.moves.length === 0) {
      logError(`No analysis results for initiator move: ${fen}`);
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
      undefined, // parent
      bestMove.mateIn, // mateIn
    );

    node.analysisResult = analysisResult;
    analysis.nodes.push(node);
    analysis.analysisQueue.push(newFen);

    log(
      `Applied initiator move from analysis: ${moveToNotation(bestMove.move)} (score: ${bestMove.score}) -> ${newFen}`,
    );
  }
};

/**
 * Schedule a move for later evaluation
 */
const scheduleMoveForEvaluation = (
  node: BestLineNode,
  analysis: BestLinesAnalysis,
): void => {
  // Add the position to the analysis queue for later evaluation
  if (!analysis.analyzedPositions.has(node.fen)) {
    analysis.analysisQueue.push(node.fen);
    log(`Scheduled position for evaluation: ${node.fen}`);
  }
};

/**
 * Update nodes that need evaluation with new analysis results
 */
const updateNodesNeedingEvaluation = (
  fen: string,
  analysis: BestLinesAnalysis,
): void => {
  // Find all nodes that need evaluation for this position
  const findNodesNeedingEvaluation = (
    nodes: BestLineNode[],
  ): BestLineNode[] => {
    const result: BestLineNode[] = [];
    for (const node of nodes) {
      if (node.needsEvaluation && node.fen === fen) {
        result.push(node);
      }
      if (node.children.length > 0) {
        result.push(...findNodesNeedingEvaluation(node.children));
      }
    }
    return result;
  };

  const nodesToUpdate = findNodesNeedingEvaluation(analysis.nodes);

  if (nodesToUpdate.length > 0) {
    // For now, we'll just remove the needsEvaluation flag
    // In a more sophisticated implementation, we'd update with actual scores
    for (const node of nodesToUpdate) {
      node.needsEvaluation = false;
    }
  }
};

/**
 * Process responder moves (analyze for best responses)
 */
const processResponderMoves = async (
  fen: string,
  analysis: BestLinesAnalysis,
): Promise<void> => {
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
      undefined, // parent
      analysisMove.mateIn, // mateIn
    );

    node.analysisResult = analysisResult;
    analysis.nodes.push(node);
    analysis.analysisQueue.push(newFen);

    log(
      `Found responder response: ${moveToNotation(analysisMove.move)} (score: ${analysisMove.score}) -> ${newFen}`,
    );
  }
};

/**
 * Start the best lines analysis
 */
const startBestLinesAnalysis = async (): Promise<void> => {
  log("Starting best lines analysis...");

  // Add debugging info
  console.log("=== Tree Digger Debug Info ===");
  console.log("Current board FEN:", Board.getFEN());
  console.log("Current move index:", getGlobalCurrentMoveIndex());
  console.log("Board position:", Board.getPosition());
  console.log("=== End Debug Info ===");

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
const buildAnalysisTree = async (
  fen: string,
  analysis: BestLinesAnalysis,
  parentNode: BestLineNode | null,
  depth: number,
): Promise<void> => {
  // Check if analysis has been stopped
  if (!bestLinesState.isAnalyzing) {
    log(`Analysis stopped, aborting buildAnalysisTree at depth ${depth}`);
    return;
  }

  // Update progress with more detailed information
  const currentAnalyzed = bestLinesState.progress.analyzedPositions + 1;

  window.dispatchEvent(
    new CustomEvent("best-lines-progress", {
      detail: {
        analyzedPositions: currentAnalyzed,
        totalPositions: bestLinesState.progress.totalPositions,
        currentPosition: fen,
      },
    }),
  );

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

  updateBestLinesState({
    progress: {
      ...bestLinesState.progress,
      currentPosition: fen,
      analyzedPositions: currentAnalyzed,
    },
  });

  const position = parseFEN(fen);
  const isWhiteTurn = position.turn === PLAYER_COLORS.WHITE;

  // Get the starting player from the root FEN
  const startingPlayer = getStartingPlayer(analysis.rootFen);

  // Determine if this is the initiator's turn
  // If starting player is white, then white's turn means initiator's turn
  // If starting player is black, then black's turn means initiator's turn
  const isInitiatorTurn =
    (startingPlayer === PLAYER_COLORS.WHITE && isWhiteTurn) ||
    (startingPlayer === PLAYER_COLORS.BLACK && !isWhiteTurn);

  // Check if we've reached max depth
  // Ensure lines always end with an initiator move (even depth) unless there's a mate
  // If we're at max depth + 1 and it's initiator's turn, stop (this is the final initiator move)
  if (depth === analysis.maxDepth + 1 && isInitiatorTurn) {
    return;
  }

  // If we're at max depth and it's responder's turn, continue to get one more initiator move
  // Safety check: if we've exceeded max depth by more than 2, stop immediately
  if (depth > analysis.maxDepth + 2) {
    return;
  }

  if (isInitiatorTurn) {
    // Initiator's turn - apply hardcoded moves
    await processInitiatorMoveInTree(fen, analysis, parentNode, depth);
  } else {
    // Responder's turn - analyze for best responses
    await processResponderMovesInTree(fen, analysis, parentNode, depth);
  }

  // Add to analyzed positions AFTER we finish processing to prevent re-processing
  analysis.analyzedPositions.add(fen);
};

/**
 * Process initiator move in tree structure
 */
const processInitiatorMoveInTree = async (
  fen: string,
  analysis: BestLinesAnalysis,
  parentNode: BestLineNode | null,
  depth: number,
): Promise<void> => {
  // Check if analysis has been stopped
  if (!bestLinesState.isAnalyzing) {
    log(
      `Analysis stopped, aborting processInitiatorMoveInTree at depth ${depth}`,
    );
    return;
  }

  // Calculate move number based on current game position plus tree depth
  // Get the current game position's move number from the root FEN
  const rootPosition = parseFEN(analysis.rootFen);
  const currentGameMoveNumber = rootPosition.fullMoveNumber;

  // Calculate the move number for this tree node
  // Each depth level represents one half-move (ply)
  // Initiator moves happen at even depths (0, 2, 4, etc.)
  // The tree shows what happens NEXT from the current position
  const initiatorMoveIndex = Math.floor(depth / 2);
  const moveNumber = currentGameMoveNumber + initiatorMoveIndex + 1; // +1 because we're showing the next move

  log(
    `Processing initiator move at depth ${depth}, current game move: ${currentGameMoveNumber}, tree move: ${moveNumber}`,
  );

  // Get initiator moves from predefined config
  const initiatorMoves = analysis.config.initiatorMoves;

  if (
    initiatorMoveIndex < initiatorMoves.length &&
    initiatorMoves[initiatorMoveIndex]
  ) {
    // Use move from predefined config
    const moveText = initiatorMoves[initiatorMoveIndex];
    log(`Using initiator move from predefined config: ${moveText}`);

    const result = parseAndApplyMove(moveText, fen);

    if (result) {
      const { move, newFen } = result;
      // Evaluate the predefined move specifically
      const options = getAnalysisOptions(analysis);
      // Increase depth to ensure we get a good evaluation
      const evaluationOptions = {
        ...options,
        depth: Math.max(options.depth || 20, 20),
      };

      let score = 0;
      let analysisDepth = 0;
      let mateIn = undefined;
      let analysisResult = null;

      // For the first move, we need to establish the baseline from the initial position
      if (moveNumber === 1 && analysis.initialPositionScore === undefined) {
        try {
          const initialAnalysis = await Stockfish.analyzePosition(
            fen,
            evaluationOptions,
          );
          if (initialAnalysis && initialAnalysis.moves.length > 0) {
            // Use the best move's score as the baseline for the initial position
            analysis.initialPositionScore = initialAnalysis.moves[0].score;
          }
        } catch (error) {
          logError(`Failed to evaluate initial position:`, error);
        }
      }

      try {
        // Evaluate the position AFTER the move is made (newFen), not the initial position
        analysisResult = await Stockfish.analyzePosition(
          newFen,
          evaluationOptions,
        );

        if (analysisResult && analysisResult.moves.length > 0) {
          // Find the predefined move in the analysis results
          const matchingMove = analysisResult.moves.find(
            (analysisMove) =>
              analysisMove.move.from === move.from &&
              analysisMove.move.to === move.to &&
              analysisMove.move.piece === move.piece,
          );

          if (matchingMove) {
            score = matchingMove.score;
            analysisDepth = matchingMove.depth;
            mateIn = matchingMove.mateIn;
          } else {
            // If the move isn't in the top moves, we need to evaluate it specifically
            // For now, we'll use the best move's score as an approximation
            // This is a limitation - we'd need to modify Stockfish to evaluate specific moves
            const bestMove = analysisResult.moves[0];
            score = bestMove.score;
            analysisDepth = bestMove.depth;
            mateIn = bestMove.mateIn;
          }
        }
      } catch (error) {
        logError(`Failed to evaluate predefined move ${moveText}:`, error);
        // Fallback to default values
        score = 0;
        analysisDepth = 0;
        mateIn = undefined;
      }

      // Create node for this move with evaluated score
      const node = createNode(
        fen,
        move,
        score,
        analysisDepth,
        true,
        moveNumber,
        parentNode || undefined,
        mateIn,
      );

      node.analysisResult = analysisResult || undefined;

      // Add to parent's children if it exists, otherwise add to root nodes
      if (parentNode) {
        parentNode.children.push(node);
        log(
          `Added node: ${moveToNotation(node.move)} -> parent: ${moveToNotation(parentNode.move)}`,
        );
      } else {
        // Root node - add to root nodes array
        analysis.nodes.push(node);
        log(
          `ROOT NODE CREATED: with predefined move: ${moveToNotation(node.move)}`,
        );
        const treeSection = document.getElementById(
          "tree-digger-tree-empty-message",
        ) as HTMLElement | null;
        if (treeSection) {
          treeSection.remove();
        }
      }

      log(
        `Applied initiator move from predefined config: ${moveText} -> ${newFen}`,
      );

      // Continue building the tree from this new position
      log(
        `Recursive call: depth ${depth} -> ${depth + 1}, position: ${newFen.substring(0, 30)}...`,
      );
      await buildAnalysisTree(newFen, analysis, node, depth + 1);
      return; // Successfully processed predefined move, exit
    } else {
      logError(
        `Failed to parse initiator move from predefined config: ${moveText}`,
      );
      console.warn(
        `predefined move "${moveText}" failed to parse, falling back to analysis`,
      );
      // Continue to analysis branch below
    }
  }

  // No predefined move available OR predefined move failed to parse - analyze and pick best move
  log(`Analyzing for initiator move at depth ${depth}`);

  // Analyze the position to find best initiator move
  const analysisResult = await analyzePosition(fen, analysis);

  if (!analysisResult || analysisResult.moves.length === 0) {
    logError(`No analysis results for initiator move: ${fen}`);
    return;
  }

  // Filter moves that have reached full depth and sort by quality
  const targetDepth = getAnalysisOptions(analysis).depth || 20;
  const fullyAnalyzedMoves = analysisResult.moves.filter(
    (move) => move.depth >= targetDepth,
  );

  if (fullyAnalyzedMoves.length === 0) {
    log(`No fully analyzed moves at depth ${targetDepth} for initiator move`);
    return;
  }

  // Sort by quality: mate moves first, then by score
  const direction = rootPosition.turn === PLAYER_COLORS.BLACK ? "asc" : "desc";
  const sortedMoves = fullyAnalyzedMoves.sort(
    (a: AnalysisMove, b: AnalysisMove) => compareAnalysisMoves(a, b, direction),
  );

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
    bestMove.mateIn, // mateIn
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
    log(`ROOT NODE CREATED: with dynamic move: ${moveToNotation(node.move)}`);
    const treeSection = document.getElementById(
      "tree-digger-tree-empty-message",
    ) as HTMLElement | null;
    if (treeSection) {
      treeSection.remove();
    }
  }

  log(
    `Applied initiator move from analysis: ${moveToNotation(bestMove.move)} -> ${newFen}`,
  );

  // Continue building the tree from this new position (unless it's a mate move)
  const isMateMove = bestMove.score > 9000;
  if (isMateMove) {
    log(`Stopping line due to mate move`);
  } else {
    log(
      `Recursive call: depth ${depth} -> ${depth + 1}, position: ${newFen.substring(0, 30)}...`,
    );
    await buildAnalysisTree(newFen, analysis, node, depth + 1);
  }
};

/**
 * Process responder moves in tree structure
 */
const processResponderMovesInTree = async (
  fen: string,
  analysis: BestLinesAnalysis,
  parentNode: BestLineNode | null,
  depth: number,
): Promise<void> => {
  // Check if analysis has been stopped
  if (!bestLinesState.isAnalyzing) {
    log(
      `Analysis stopped, aborting processResponderMovesInTree at depth ${depth}`,
    );
    return;
  }

  // Calculate move number based on current game position plus tree depth
  // Get the current game position's move number from the root FEN
  const rootPosition = parseFEN(analysis.rootFen);
  const currentGameMoveNumber = rootPosition.fullMoveNumber;

  // Calculate the move number for this tree node
  // Responder moves happen at odd depths (1, 3, 5, etc.)
  // The tree shows what happens NEXT from the current position
  const responderMoveIndex = Math.floor((depth - 1) / 2);
  const moveNumber = currentGameMoveNumber + responderMoveIndex + 1; // +1 because we're showing the next move

  log(
    `Analyzing responder responses at depth ${depth}, current game move: ${currentGameMoveNumber}, tree move: ${moveNumber}, position: ${fen.substring(0, 30)}...`,
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
    `Analysis complete: ${analysisResult.moves.length} moves found, depths: ${analysisResult.moves.map((m: AnalysisMove) => m.depth).join(", ")}`,
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
  const direction = rootPosition.turn === PLAYER_COLORS.BLACK ? "asc" : "desc";
  const sortedMoves = fullyAnalyzedMoves.sort(
    (a: AnalysisMove, b: AnalysisMove) => compareAnalysisMoves(a, b, direction),
  );

  // Determine how many responder responses to analyze based on depth and overrides
  let responderMovesToAnalyze = analysis.config.responderMovesCount;

  // Check if we're at a depth that corresponds to an initiator move with an override
  // Depth 1 = first initiator move responses, Depth 3 = second initiator move responses
  if (depth === 1) {
    const override1 = getFirstReplyOverride();
    if (override1 > 0) {
      responderMovesToAnalyze = override1;
      log(`Using first reply override: ${override1} (depth ${depth})`);
    }
  } else if (depth === 3) {
    const override2 = getSecondReplyOverride();
    if (override2 > 0) {
      responderMovesToAnalyze = override2;
      log(`Using second reply override: ${override2} (depth ${depth})`);
    }
  }

  // Take top N responses (or fewer if less available) - use calculated value
  const topMoves = sortedMoves.slice(0, responderMovesToAnalyze);

  log(
    `Selected ${topMoves.length} moves (override: ${responderMovesToAnalyze}): ${topMoves.map((m: AnalysisMove) => `${moveToNotation(m.move)} (${m.score})`).join(", ")}`,
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
      analysisMove.mateIn, // mateIn
    );

    log(
      `Created responder node with move number: ${node.moveNumber}, move: ${moveToNotation(node.move)}`,
    );
    node.analysisResult = analysisResult;

    // Add to parent's children if it exists, otherwise add to root nodes
    if (parentNode) {
      parentNode.children.push(node);
      log(
        `Added responder node: ${moveToNotation(node.move)} -> parent: ${moveToNotation(parentNode.move)}`,
      );
    } else {
      // Root node - add to root nodes array
      analysis.nodes.push(node);
      log(`Added responder root node: ${moveToNotation(node.move)}`);
    }

    log(
      `Found responder response: ${moveToNotation(analysisMove.move)} (score: ${analysisMove.score}) -> ${newFen}`,
    );

    // Check if this is a mate move - if so, stop the line here
    const isMateMove = analysisMove.score > 9000;
    // Continue building the tree from this new position (unless it's a mate move)
    if (isMateMove) {
      log(`Stopping line due to mate move in responder`);
    } else {
      await buildAnalysisTree(newFen, analysis, node, depth + 1);
    }
  }
};

/**
 * Stop the best lines analysis
 */
const stopBestLinesAnalysis = (): void => {
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
const clearBestLinesAnalysis = (): void => {
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
const getCurrentAnalysis = (): BestLinesAnalysis | null => {
  return bestLinesState.currentAnalysis;
};

/**
 * Check if analysis is currently running
 */
const isAnalyzing = (): boolean => {
  return bestLinesState.isAnalyzing;
};

/**
 * Get current progress
 */
const getProgress = (): BestLinesState["progress"] => {
  return bestLinesState.progress;
};

/**
 * Increment PV lines counter
 */
const incrementPVLines = (): void => {
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
const calculateTotalLeafs = (nodes: BestLineNode[]): number => {
  let totalLeafs = 0;

  const countLeafsRecursive = (node: BestLineNode): void => {
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
const calculateUniquePositions = (
  nodes: BestLineNode[],
  analysis: BestLinesAnalysis,
): number => {
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
