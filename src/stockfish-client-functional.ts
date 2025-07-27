import { AnalysisMove, AnalysisResult, StockfishOptions, ChessMove } from './types.js';
import { parseFEN, toFEN, squareToCoords, coordsToSquare, log, logError } from './utils.js';

// ============================================================================
// STOCKFISH STATE MANAGEMENT
// ============================================================================

/**
 * Stockfish state interface
 */
interface StockfishState {
  worker: Worker | null;
  isReady: boolean;
  isAnalyzing: boolean;
  currentAnalysis: AnalysisResult | null;
  analysisCallbacks: ((result: AnalysisResult) => void)[];
  engineStatus: {
    engineLoaded: boolean;
    engineReady: boolean;
  };
  waitingForReady: boolean;
  pendingAnalysis: (() => void) | null;
}

/**
 * Stockfish state instance
 */
let stockfishState: StockfishState = {
  worker: null,
  isReady: false,
  isAnalyzing: false,
  currentAnalysis: null,
  analysisCallbacks: [],
  engineStatus: {
    engineLoaded: false,
    engineReady: false
  },
  waitingForReady: false,
  pendingAnalysis: null
};

/**
 * Update Stockfish state
 */
const updateStockfishState = (updates: Partial<StockfishState>): void => {
  stockfishState = { ...stockfishState, ...updates };
};

/**
 * Get current Stockfish state
 */
const getStockfishState = (): StockfishState => ({ ...stockfishState });

// ============================================================================
// STOCKFISH INITIALIZATION
// ============================================================================

/**
 * Initialize Stockfish
 */
const initializeStockfish = (): void => {
  try {
    log('Initializing Stockfish with Web Worker...');
    
    // Create Web Worker for Stockfish
    const worker = new Worker('dist/stockfish.js');
    
    // Set up message handler
    worker.onmessage = (event) => {
      const message = event.data;
      log('Received message from Stockfish:', message);
      handleMessage(message);
    };
    
    // Set up error handler
    worker.onerror = (error) => {
      logError('Stockfish worker error:', error);
    };
    
    updateStockfishState({ worker });
    
    // Initialize with UCI protocol
    log('Starting UCI protocol...');
    uciCmd('uci');
    
  } catch (error) {
    logError('Failed to initialize Stockfish:', error);
  }
};

/**
 * Send UCI command to Stockfish
 */
const uciCmd = (cmd: string): void => {
  log('UCI Command:', cmd);
  if (stockfishState.worker) {
    stockfishState.worker.postMessage(cmd);
  }
};

// ============================================================================
// MESSAGE HANDLING
// ============================================================================

/**
 * Handle messages from Stockfish
 */
const handleMessage = (message: string): void => {
  if (message === 'uciok') {
    log('UCI protocol ready, engine loaded');
    updateStockfishState({
      engineStatus: { ...stockfishState.engineStatus, engineLoaded: true }
    });
    uciCmd('isready');
  } else if (message === 'readyok') {
    log('Stockfish is ready!');
    updateStockfishState({
      engineStatus: { ...stockfishState.engineStatus, engineReady: true },
      isReady: true
    });
    if (stockfishState.pendingAnalysis) {
      stockfishState.pendingAnalysis();
      updateStockfishState({ pendingAnalysis: null });
    }
  } else if (message.startsWith('bestmove')) {
    handleBestMove(message);
  } else if (message.startsWith('info')) {
    parseInfoMessage(message);
  } else if (message.startsWith('Stockfish')) {
    log('Received Stockfish version info');
  }
};

/**
 * Parse info message from Stockfish
 */
const parseInfoMessage = (message: string): void => {
  if (!stockfishState.currentAnalysis || !stockfishState.isAnalyzing) return;

  const parts = message.split(' ');
  let depth = 0;
  let score = 0;
  let pv: string[] = [];
  let nodes = 0;
  let time = 0;
  let multipv = 1; // Default to first principal variation

  for (let i = 1; i < parts.length; i++) {
    const part = parts[i];
    switch (part) {
      case 'depth':
        depth = parseInt(parts[++i]);
        break;
      case 'multipv':
        multipv = parseInt(parts[++i]);
        break;
      case 'score':
        const scoreType = parts[++i];
        if (scoreType === 'cp') {
          score = parseInt(parts[++i]);
        } else if (scoreType === 'mate') {
          const mateScore = parseInt(parts[++i]);
          score = mateScore > 0 ? 10000 : -10000;
        }
        break;
      case 'nodes':
        nodes = parseInt(parts[++i]);
        break;
      case 'time':
        time = parseInt(parts[++i]);
        break;
      case 'pv':
        // Collect all remaining parts as PV moves
        pv = parts.slice(++i);
        break;
    }
  }

  // Log the parsed info for debugging
  log(`Info: depth=${depth}, multipv=${multipv}, score=${score}, nodes=${nodes}, time=${time}, pv=${pv.join(' ')}`);

  // Convert PV moves to ChessMove objects
  const pvMoves: ChessMove[] = [];
  for (const moveStr of pv) {
    const move = parseRawMove(moveStr);
    if (move) {
      pvMoves.push(move);
    }
  }

  // Update analysis result
  if (stockfishState.currentAnalysis && pvMoves.length > 0) {
    const firstMove = pvMoves[0];
    
    // Find existing move by multipv index (1-based) and move coordinates
    const existingMoveIndex = stockfishState.currentAnalysis.moves.findIndex(
      move => move.move.from === firstMove.from && 
              move.move.to === firstMove.to && 
              move.multipv === multipv
    );

    const analysisMove: AnalysisMove = {
      move: firstMove,
      score,
      depth,
      pv: pvMoves,
      nodes,
      time,
      multipv // Add multipv to track which variation this is
    };

    if (existingMoveIndex >= 0) {
      // Update existing move with new depth and score
      log(`Updating existing move ${firstMove.from}${firstMove.to} (multipv=${multipv}) at depth ${depth}`);
      stockfishState.currentAnalysis.moves[existingMoveIndex] = analysisMove;
    } else {
      // Add new variation
      log(`Adding new move ${firstMove.from}${firstMove.to} (multipv=${multipv}) at depth ${depth}`);
      stockfishState.currentAnalysis.moves.push(analysisMove);
    }

    // Sort moves by score (best first), then by multipv for same scores
    stockfishState.currentAnalysis.moves.sort((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score;
      }
      return (a.multipv || 1) - (b.multipv || 1);
    });

    // Notify callbacks
    stockfishState.analysisCallbacks.forEach(callback => {
      callback(stockfishState.currentAnalysis!);
    });
  }
};

/**
 * Handle best move message
 */
const handleBestMove = (message: string): void => {
  const parts = message.split(' ');
  if (parts.length >= 2) {
    const bestMove = parts[1];
    log('Best move:', bestMove);
    
    // Stop analysis
    updateStockfishState({ isAnalyzing: false });
    
    if (stockfishState.currentAnalysis) {
      stockfishState.currentAnalysis.completed = true;
      
      // Notify callbacks of final result
      stockfishState.analysisCallbacks.forEach(callback => {
        callback(stockfishState.currentAnalysis!);
      });
    }
  }
};

/**
 * Parse raw move string from Stockfish
 */
const parseRawMove = (moveStr: string): ChessMove | null => {
  if (moveStr.length !== 4) return null;
  
  const from = moveStr.substring(0, 2);
  const to = moveStr.substring(2, 4);
  
  // Determine piece type from current board position
  const currentFEN = stockfishState.currentAnalysis?.position || '';
  if (!currentFEN) return null;
  
  const board = parseFEN(currentFEN).board;
  const [fromRank, fromFile] = squareToCoords(from);
  
  if (fromRank < 0 || fromRank >= 8 || fromFile < 0 || fromFile >= 8) return null;
  
  const piece = board[fromRank][fromFile];
  if (!piece) return null;
  
  return { from, to, piece };
};

/**
 * Parse move string (for compatibility)
 */
const parseMove = (moveStr: string): ChessMove | null => {
  return parseRawMove(moveStr);
};

// ============================================================================
// ANALYSIS FUNCTIONS
// ============================================================================

/**
 * Analyze position with Stockfish
 */
const analyzePosition = async (
  fen: string,
  options: StockfishOptions = {},
  onUpdate?: (result: AnalysisResult) => void
): Promise<AnalysisResult> => {
  return new Promise((resolve, reject) => {
    if (!stockfishState.isReady) {
      log('Stockfish not ready, queuing analysis...');
      updateStockfishState({
        pendingAnalysis: () => analyzePosition(fen, options, onUpdate).then(resolve).catch(reject)
      });
      return;
    }

    // Create new analysis result
    const analysisResult: AnalysisResult = {
      moves: [],
      position: fen,
      depth: options.depth || 20,
      completed: false
    };

    updateStockfishState({
      currentAnalysis: analysisResult,
      isAnalyzing: true
    });

    if (onUpdate) {
      updateStockfishState({
        analysisCallbacks: [...stockfishState.analysisCallbacks, onUpdate]
      });
    }

    // Set up completion callback
    const finalCallback = (result: AnalysisResult) => {
      if (result.completed) {
        resolve(result);
        // Remove this callback
        updateStockfishState({
          analysisCallbacks: stockfishState.analysisCallbacks.filter(cb => cb !== finalCallback)
        });
      }
    };

    updateStockfishState({
      analysisCallbacks: [...stockfishState.analysisCallbacks, finalCallback]
    });

    // Configure Stockfish
    uciCmd('position fen ' + fen);
    
    // Set options
    if (options.threads) {
      uciCmd(`setoption name Threads value ${options.threads}`);
    }
    if (options.hash) {
      uciCmd(`setoption name Hash value ${options.hash}`);
    }
    if (options.multiPV) {
      uciCmd(`setoption name MultiPV value ${options.multiPV}`);
    }

    // Start analysis
    const goCommand = [
      'go',
      options.depth ? `depth ${options.depth}` : '',
      options.movetime ? `movetime ${options.movetime}` : '',
      options.nodes ? `nodes ${options.nodes}` : ''
    ].filter(Boolean).join(' ');

    uciCmd(goCommand);
  });
};

/**
 * Stop current analysis
 */
const stopAnalysis = (): void => {
  if (stockfishState.isAnalyzing) {
    uciCmd('stop');
    updateStockfishState({ isAnalyzing: false });
  }
};

/**
 * Check if currently analyzing
 */
const isAnalyzingPosition = (): boolean => stockfishState.isAnalyzing;

/**
 * Get current analysis result
 */
const getCurrentAnalysis = (): AnalysisResult | null => stockfishState.currentAnalysis;

/**
 * Destroy Stockfish client
 */
const destroy = (): void => {
  stopAnalysis();
  if (stockfishState.worker) {
    stockfishState.worker.terminate();
    updateStockfishState({ worker: null });
  }
  updateStockfishState({
    isReady: false,
    isAnalyzing: false,
    currentAnalysis: null,
    analysisCallbacks: [],
    engineStatus: { engineLoaded: false, engineReady: false },
    waitingForReady: false,
    pendingAnalysis: null
  });
};

// ============================================================================
// EXPORT FUNCTIONS
// ============================================================================

export {
  // Initialization
  initializeStockfish,
  
  // State management
  getStockfishState,
  updateStockfishState,
  
  // Analysis
  analyzePosition,
  stopAnalysis,
  isAnalyzingPosition,
  getCurrentAnalysis,
  
  // Utility
  destroy
}; 