import { AnalysisMove, AnalysisResult, StockfishOptions, ChessMove } from './types';
import { parseFEN, toFEN, squareToCoords, coordsToSquare } from './utils';

declare global {
  interface Window {
    Stockfish: any;
  }
}

export class StockfishClient {
  private stockfish: any = null;
  private isReady = false;
  private isAnalyzing = false;
  private currentAnalysis: AnalysisResult | null = null;
  private analysisCallbacks: ((result: AnalysisResult) => void)[] = [];

  constructor() {
    this.loadStockfish();
  }

  private async loadStockfish(): Promise<void> {
    try {
      // Load Stockfish from CDN
      const script = document.createElement('script');
      script.src = 'https://unpkg.com/stockfish@15.0.0/stockfish.js';
      script.onload = () => {
        this.initializeStockfish();
      };
      document.head.appendChild(script);
    } catch (error) {
      console.error('Failed to load Stockfish:', error);
    }
  }

  private initializeStockfish(): void {
    if (typeof window.Stockfish === 'undefined') {
      console.error('Stockfish not available');
      return;
    }

    this.stockfish = window.Stockfish();
    
    this.stockfish.addMessageListener((message: string) => {
      this.handleMessage(message);
    });

    // Initialize Stockfish
    this.stockfish.postMessage('uci');
    this.stockfish.postMessage('isready');
  }

  private handleMessage(message: string): void {
    if (message === 'uciok') {
      this.stockfish.postMessage('setoption name MultiPV value 1');
      this.stockfish.postMessage('setoption name Threads value 1');
      this.stockfish.postMessage('setoption name Hash value 32');
    } else if (message === 'readyok') {
      this.isReady = true;
    } else if (message.startsWith('info')) {
      this.parseInfoMessage(message);
    } else if (message.startsWith('bestmove')) {
      this.handleBestMove(message);
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
    if (!this.isReady) {
      throw new Error('Stockfish not ready');
    }

    if (this.isAnalyzing) {
      this.stopAnalysis();
    }

    return new Promise((resolve, reject) => {
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
      this.stockfish.postMessage(`position fen ${fen}`);

      // Set options
      if (options.depth) {
        this.stockfish.postMessage(`setoption name MultiPV value 1`);
      }
      if (options.threads) {
        this.stockfish.postMessage(`setoption name Threads value ${options.threads}`);
      }
      if (options.hash) {
        this.stockfish.postMessage(`setoption name Hash value ${options.hash}`);
      }

      // Start analysis
      this.isAnalyzing = true;
      if (options.depth) {
        this.stockfish.postMessage(`go depth ${options.depth}`);
      } else if (options.movetime) {
        this.stockfish.postMessage(`go movetime ${options.movetime}`);
      } else if (options.nodes) {
        this.stockfish.postMessage(`go nodes ${options.nodes}`);
      } else {
        this.stockfish.postMessage('go infinite');
      }
    });
  }

  public stopAnalysis(): void {
    if (this.isAnalyzing) {
      this.stockfish.postMessage('stop');
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
    if (this.stockfish) {
      this.stopAnalysis();
      this.stockfish.postMessage('quit');
      this.stockfish = null;
    }
  }
} 