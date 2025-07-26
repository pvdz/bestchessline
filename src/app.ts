import { ChessBoard } from './chess-board.js';
import { StockfishClient } from './stockfish-client.js';
import { moveToNotation, pvToNotation } from './utils.js';

class ChessAnalysisApp {
  private board: ChessBoard;
  private stockfish: StockfishClient;
  private isAnalyzing = false;
  private currentResults: any = null;

  constructor() {
    const boardElement = document.getElementById('chess-board');
    if (!boardElement) {
      throw new Error('Chess board element not found');
    }
    this.board = new ChessBoard(boardElement);
    this.stockfish = new StockfishClient();
    this.initializeEventListeners();
    this.initializeMoveHoverEvents();
  }

  private initializeEventListeners(): void {
    // Board controls
    const resetBtn = document.getElementById('reset-board');
    const clearBtn = document.getElementById('clear-board');
    const fenInput = document.getElementById('fen-input') as HTMLInputElement;
    const loadFenBtn = document.getElementById('load-fen');

    if (resetBtn) resetBtn.addEventListener('click', () => this.board.setPosition('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'));
    if (clearBtn) clearBtn.addEventListener('click', () => this.board.setPosition('8/8/8/8/8/8/8/8 w - - 0 1'));
    if (loadFenBtn && fenInput) {
      loadFenBtn.addEventListener('click', () => {
        const fen = fenInput.value.trim();
        if (fen) {
          this.board.setPosition(fen);
        }
      });
    }

    // Analysis controls
    const startBtn = document.getElementById('start-analysis');
    const pauseBtn = document.getElementById('pause-analysis');
    const stopBtn = document.getElementById('stop-analysis');

    if (startBtn) startBtn.addEventListener('click', () => this.startAnalysis());
    if (pauseBtn) pauseBtn.addEventListener('click', () => this.pauseAnalysis());
    if (stopBtn) stopBtn.addEventListener('click', () => this.stopAnalysis());

    // Notation and piece format toggles
    const notationRadios = document.querySelectorAll('input[name="notation-format"]') as NodeListOf<HTMLInputElement>;
    const pieceRadios = document.querySelectorAll('input[name="piece-format"]') as NodeListOf<HTMLInputElement>;

    notationRadios.forEach(radio => {
      radio.addEventListener('change', () => {
        if (this.currentResults) {
          this.updateResults(this.currentResults);
        }
      });
    });

    pieceRadios.forEach(radio => {
      radio.addEventListener('change', () => {
        if (this.currentResults) {
          this.updateResults(this.currentResults);
        }
      });
    });
  }

  private async startAnalysis(): Promise<void> {
    if (this.isAnalyzing) {
      console.log('Analysis already in progress');
      return;
    }

    const fen = this.board.getFEN();
    const options = this.getAnalysisOptions();

    try {
      this.isAnalyzing = true;
      this.updateButtonStates();
      this.updateStatus('Starting analysis...');

      const result = await this.stockfish.analyzePosition(fen, options, (result) => {
        this.currentResults = result;
        this.updateResults(result);
        // Update status with current depth
        if (result.depth > 0) {
          this.updateStatus(`Analyzing... Depth: ${result.depth}, Moves found: ${result.moves.length}`);
        }
      });

      this.currentResults = result;
      this.updateResults(result);
      this.updateStatus('Analysis complete');
    } catch (error) {
      console.error('Analysis failed:', error);
      this.updateStatus('Analysis failed: ' + error);
    } finally {
      this.isAnalyzing = false;
      this.updateButtonStates();
    }
  }

  private pauseAnalysis(): void {
    // TODO: Implement pause functionality
    console.log('Pause analysis');
  }

  private stopAnalysis(): void {
    this.stockfish.stopAnalysis();
    this.isAnalyzing = false;
    this.updateButtonStates();
    this.updateStatus('Analysis stopped');
  }

  private getAnalysisOptions(): any {
    const whiteMoves = parseInt((document.getElementById('white-moves') as HTMLInputElement).value);
    return {
      depth: parseInt((document.getElementById('max-depth') as HTMLInputElement).value),
      whiteMoves: whiteMoves,
      blackMoves: parseInt((document.getElementById('black-moves') as HTMLInputElement).value),
      threads: parseInt((document.getElementById('threads') as HTMLInputElement).value),
      hash: parseInt((document.getElementById('hash-size') as HTMLInputElement).value),
      multiPV: whiteMoves // Set MultiPV to the number of moves we want
    };
  }

  private updateButtonStates(): void {
    const startBtn = document.getElementById('start-analysis') as HTMLButtonElement;
    const pauseBtn = document.getElementById('pause-analysis') as HTMLButtonElement;
    const stopBtn = document.getElementById('stop-analysis') as HTMLButtonElement;

    if (startBtn) startBtn.disabled = this.isAnalyzing;
    if (pauseBtn) pauseBtn.disabled = !this.isAnalyzing;
    if (stopBtn) stopBtn.disabled = !this.isAnalyzing;
  }

  private updateStatus(message: string): void {
    const statusElement = document.getElementById('status');
    if (statusElement) {
      statusElement.textContent = message;
    }
  }

  private updateResults(result: any): void {
    if (!result || !result.moves) {
      return;
    }

    const notationFormat = (document.querySelector('input[name="notation-format"]:checked') as HTMLInputElement)?.value || 'short';
    const pieceFormat = (document.querySelector('input[name="piece-format"]:checked') as HTMLInputElement)?.value || 'unicode';

    // Convert all moves to the proper format
    const moves = result.moves.map((move: any) => {
      console.log('Processing move:', move);
      console.log('PV before formatting:', move.pv);
      
      return {
        move: move.move, // Keep the original move object for filtering
        notation: moveToNotation(move.move, notationFormat as 'short' | 'long', pieceFormat as 'unicode' | 'english', result.position),
        score: move.score,
        depth: move.depth,
        pv: pvToNotation(move.pv, notationFormat as 'short' | 'long', pieceFormat as 'unicode' | 'english', result.position),
        nodes: move.nodes,
        time: move.time
      };
    });

    // Filter to show each individual piece only once (keep the best move for each piece)
    const uniqueMoves = moves.reduce((acc: any[], move: any) => {
      // Create a unique key for each piece based on the move's starting square
      const pieceKey = `${move.move.from}-${move.move.piece}`;
      const existingIndex = acc.findIndex((m: any) => {
        const existingKey = `${m.move.from}-${m.move.piece}`;
        return existingKey === pieceKey;
      });
      
      if (existingIndex === -1) {
        // First time seeing this specific piece, add it
        acc.push(move);
      } else {
        // Already have a move for this specific piece, keep the better one
        if (move.score > acc[existingIndex].score) {
          acc[existingIndex] = move;
        }
      }
      
      return acc;
    }, []);

    // Sort by score to maintain best moves first
    uniqueMoves.sort((a: any, b: any) => b.score - a.score);

    // Update the single results panel with all moves
    this.updateResultsPanel(uniqueMoves);
  }

  private updateResultsPanel(moves: any[]): void {
    const panel = document.getElementById('analysis-results');
    if (!panel) return;

    if (moves.length === 0) {
      panel.innerHTML = '<p>No analysis results yet.</p>';
      return;
    }

    const notationFormat = (document.querySelector('input[name="notation-format"]:checked') as HTMLInputElement)?.value || 'short';
    const movesHtml = moves.map((move, index) => `
      <div class="move-item" data-move-from="${move.move.from}" data-move-to="${move.move.to}" data-move-piece="${move.move.piece}">
        <div class="move-header">
          <span class="move-rank" title="Move ranking (best moves first)">${index + 1}.</span>
          <span class="move-notation" title="Chess move in ${notationFormat} notation">${move.notation}</span>
          <span class="move-info">
            <span class="depth-info" title="Analysis depth - how many moves ahead Stockfish calculated">d${move.depth}</span>
            <span class="nodes-info" title="Number of positions Stockfish evaluated">${move.nodes}</span>
            <span class="time-info" title="Time taken for this analysis in milliseconds">${move.time}ms</span>
          </span>
          <span class="move-score" title="Position evaluation score (positive = advantage for current player)">${move.score}</span>
        </div>
        <div class="move-details">
          <span class="move-pv" title="Principal variation - the best line of play following this move">${move.pv}</span>
        </div>
      </div>
    `).join('');

    panel.innerHTML = movesHtml;
    
    // Add hover event listeners to move items
    this.addMoveHoverListeners();
  }

  private initializeMoveHoverEvents(): void {
    // This will be called when results are updated
  }

  private addMoveHoverListeners(): void {
    const moveItems = document.querySelectorAll('.move-item');
    moveItems.forEach(item => {
      item.addEventListener('mouseenter', (e) => {
        const target = e.currentTarget as HTMLElement;
        const from = target.dataset.moveFrom;
        const to = target.dataset.moveTo;
        const piece = target.dataset.movePiece;
        
        if (from && to && piece) {
          this.board.showMoveArrow(from, to, piece);
        }
      });
      
      item.addEventListener('mouseleave', () => {
        this.board.hideMoveArrow();
      });
    });
  }
}

// Initialize the app when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  new ChessAnalysisApp();
}); 