import { AnalysisMove, AnalysisResult, StockfishOptions, ChessMove } from './types.js';
import { parseFEN, toFEN, squareToCoords, coordsToSquare } from './utils.js';

export class StockfishClient {
  private worker: Worker | null = null;
  private isReady = false;
  private isAnalyzing = false;
  private currentAnalysis: AnalysisResult | null = null;
  private analysisCallbacks: ((result: AnalysisResult) => void)[] = [];
  private engineStatus = { engineLoaded: false, engineReady: false };

  constructor() {
    this.initializeStockfish();
  }

  private initializeStockfish(): void {
    try {
      console.log('Initializing Stockfish with Web Worker...');
      
      // Create Web Worker for Stockfish
      this.worker = new Worker('dist/stockfish.js');
      
      // Set up message handler
      this.worker.onmessage = (event) => {
        const message = event.data;
        console.log('Received message from Stockfish:', message);
        this.handleMessage(message);
      };
      
      // Set up error handler
      this.worker.onerror = (error) => {
        console.error('Stockfish worker error:', error);
      };
      
      // Initialize with UCI protocol
      console.log('Starting UCI protocol...');
      this.uciCmd('uci');
      
    } catch (error) {
      console.error('Failed to initialize Stockfish:', error);
    }
  }

  private uciCmd(cmd: string): void {
    console.log('UCI Command:', cmd);
    if (this.worker) {
      this.worker.postMessage(cmd);
    }
  }

  private handleMessage(message: string): void {
    console.log('Stockfish message:', message);
    
    if (message === 'uciok') {
      console.log('UCI protocol ready, engine loaded');
      this.engineStatus.engineLoaded = true;
      this.uciCmd('isready');
    } else if (message === 'readyok') {
      console.log('Stockfish is ready!');
      this.engineStatus.engineReady = true;
      this.isReady = true;
    } else if (message.startsWith('bestmove')) {
      console.log('Received bestmove:', message);
      this.handleBestMove(message);
    } else if (message.startsWith('info')) {
      console.log('Received info:', message);
      this.parseInfoMessage(message);
    } else if (message.startsWith('Stockfish')) {
      console.log('Received Stockfish version info');
    } else {
      console.log('Unhandled message:', message);
    }
  }

  private parseInfoMessage(message: string): void {
    if (!this.currentAnalysis || !this.isAnalyzing) return;

    const parts = message.split(' ');
    let depth = 0;
    let score = 0;
    let pv: string[] = [];
    let nodes = 0;
    let time = 0;

    for (let i = 1; i < parts.length; i++) {
      const part = parts[i];
      switch (part) {
        case 'depth':
          depth = parseInt(parts[++i]);
          break;
        case 'score':
          const scoreType = parts[++i];
          if (scoreType === 'cp') {
            score = parseInt(parts[++i]);
          } else if (scoreType === 'mate') {
            const mateScore = parseInt(parts[++i]);
            score = mateScore > 0 ? 10000 - mateScore : -10000 + Math.abs(mateScore);
          }
          break;
        case 'pv':
          i++;
          while (i < parts.length && !parts[i].startsWith('bmc')) {
            pv.push(parts[i]);
            i++;
          }
          break;
        case 'nodes':
          nodes = parseInt(parts[++i]);
          break;
        case 'time':
          time = parseInt(parts[++i]);
          break;
      }
    }

    if (depth > 0 && pv.length > 0) {
      const move = this.parseMove(pv[0]);
      if (move) {
        const analysisMove: AnalysisMove = {
          move,
          score,
          depth,
          pv: pv.map(m => this.parseMove(m)).filter(Boolean) as ChessMove[],
          nodes,
          time
        };

        // Update or add move to analysis
        const existingIndex = this.currentAnalysis.moves.findIndex(m => 
          m.move.from === move.from && m.move.to === move.to
        );

        if (existingIndex >= 0) {
          this.currentAnalysis.moves[existingIndex] = analysisMove;
        } else {
          this.currentAnalysis.moves.push(analysisMove);
        }

        // Sort by score
        this.currentAnalysis.moves.sort((a, b) => b.score - a.score);
        this.currentAnalysis.depth = Math.max(this.currentAnalysis.depth, depth);

        // Notify callbacks
        this.analysisCallbacks.forEach(callback => callback(this.currentAnalysis!));
      }
    }
  }

  private handleBestMove(message: string): void {
    if (!this.currentAnalysis) return;

    const parts = message.split(' ');
    const bestMove = parts[1];
    
    if (bestMove && bestMove !== '(none)') {
      const move = this.parseMove(bestMove);
      if (move) {
        // Ensure the best move is included in results
        const existingIndex = this.currentAnalysis.moves.findIndex(m => 
          m.move.from === move.from && m.move.to === move.to
        );
        
        if (existingIndex === -1) {
          this.currentAnalysis.moves.unshift({
            move,
            score: 0,
            depth: this.currentAnalysis.depth,
            pv: [move],
            nodes: 0,
            time: 0
          });
        }
      }
    }

    this.isAnalyzing = false;
    this.currentAnalysis.completed = true;
    
    // Notify final result
    this.analysisCallbacks.forEach(callback => callback(this.currentAnalysis!));
  }

  private parseMove(moveStr: string): ChessMove | null {
    if (moveStr.length < 4) return null;

    const from = moveStr.substring(0, 2);
    const to = moveStr.substring(2, 4);
    const promotion = moveStr.length > 4 ? moveStr[4] : undefined;

    return {
      from,
      to,
      piece: '', // Will be filled by board state
      promotion: promotion ? promotion.toUpperCase() : undefined
    };
  }

  public async analyzePosition(
    fen: string, 
    options: StockfishOptions = {},
    onUpdate?: (result: AnalysisResult) => void
  ): Promise<AnalysisResult> {
    console.log('Starting analysis for position:', fen);
    console.log('Options:', options);
    console.log('Stockfish ready state:', this.isReady);
    
    // Wait for Stockfish to be ready
    let attempts = 0;
    while (!this.isReady && attempts < 50) {
      console.log(`Waiting for Stockfish to be ready... attempt ${attempts + 1}`);
      await new Promise(resolve => setTimeout(resolve, 100));
      attempts++;
    }
    
    if (!this.isReady) {
      console.error('Stockfish not ready after waiting');
      throw new Error('Stockfish not ready after waiting');
    }

    console.log('Stockfish is ready, starting analysis...');

    if (this.isAnalyzing) {
      console.log('Stopping previous analysis...');
      this.stopAnalysis();
    }

    return new Promise((resolve, reject) => {
      console.log('Creating new analysis...');
      this.currentAnalysis = {
        moves: [],
        position: fen,
        depth: 0,
        completed: false
      };

      if (onUpdate) {
        this.analysisCallbacks.push(onUpdate);
      }

      const finalCallback = (result: AnalysisResult) => {
        console.log('Analysis completed:', result);
        if (result.completed) {
          this.analysisCallbacks = this.analysisCallbacks.filter(cb => cb !== finalCallback);
          if (onUpdate) {
            this.analysisCallbacks = this.analysisCallbacks.filter(cb => cb !== onUpdate);
          }
          resolve(result);
        }
      };

      this.analysisCallbacks.push(finalCallback);

      // Set position
      console.log('Setting position:', fen);
      this.uciCmd(`position fen ${fen}`);

      // Set options
      console.log('Setting options...');
      if (options.depth) {
        console.log('Setting depth:', options.depth);
        this.uciCmd(`setoption name MultiPV value 1`);
      }
      if (options.threads) {
        console.log('Setting threads:', options.threads);
        this.uciCmd(`setoption name Threads value ${options.threads}`);
      }
      if (options.hash) {
        console.log('Setting hash:', options.hash);
        this.uciCmd(`setoption name Hash value ${options.hash}`);
      }

      // Start analysis
      this.isAnalyzing = true;
      console.log('Starting analysis with options:', options);
      if (options.depth) {
        console.log('Sending go depth command:', options.depth);
        this.uciCmd(`go depth ${options.depth}`);
      } else if (options.movetime) {
        console.log('Sending go movetime command:', options.movetime);
        this.uciCmd(`go movetime ${options.movetime}`);
      } else if (options.nodes) {
        console.log('Sending go nodes command:', options.nodes);
        this.uciCmd(`go nodes ${options.nodes}`);
      } else {
        console.log('Sending go infinite command');
        this.uciCmd('go infinite');
      }
      
      // Add timeout for analysis
      setTimeout(() => {
        if (this.isAnalyzing) {
          console.log('Analysis timeout reached, stopping...');
          this.uciCmd('stop');
        }
      }, 10000); // 10 second timeout
    });
  }

  public stopAnalysis(): void {
    if (this.isAnalyzing && this.worker) {
      this.uciCmd('stop');
      this.isAnalyzing = false;
      if (this.currentAnalysis) {
        this.currentAnalysis.completed = true;
      }
    }
  }

  public isAnalyzingPosition(): boolean {
    return this.isAnalyzing;
  }

  public getCurrentAnalysis(): AnalysisResult | null {
    return this.currentAnalysis;
  }

  public destroy(): void {
    if (this.worker) {
      this.stopAnalysis();
      this.worker.terminate();
      this.worker = null;
    }
  }
} 