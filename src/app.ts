import { ChessBoard } from './chess-board.js';
import { StockfishClient } from './stockfish-client.js';
import { parseFEN, debounce } from './utils.js';

class ChessAnalysisApp {
  private board: ChessBoard;
  private stockfish: StockfishClient;
  private isAnalyzing = false;

  constructor() {
    const boardElement = document.getElementById('chess-board');
    if (!boardElement) {
      throw new Error('Chess board element not found');
    }
    this.board = new ChessBoard(boardElement);
    this.stockfish = new StockfishClient();
    
    this.initializeEventListeners();
  }

  private initializeEventListeners(): void {
    // Board controls
    document.getElementById('reset-board')?.addEventListener('click', () => {
      this.board.setPosition('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
    });

    document.getElementById('clear-board')?.addEventListener('click', () => {
      this.board.setPosition('8/8/8/8/8/8/8/8 w - - 0 1');
    });

    document.getElementById('load-fen')?.addEventListener('click', () => {
      const fenInput = document.getElementById('fen-input') as HTMLInputElement;
      const fen = fenInput.value.trim();
      if (fen) {
        try {
          this.board.setPosition(fen);
        } catch (error) {
          console.error('Invalid FEN:', error);
          alert('Invalid FEN position');
        }
      }
    });

    // Analysis controls
    document.getElementById('start-analysis')?.addEventListener('click', () => {
      this.startAnalysis();
    });

    document.getElementById('pause-analysis')?.addEventListener('click', () => {
      this.pauseAnalysis();
    });

    document.getElementById('stop-analysis')?.addEventListener('click', () => {
      this.stopAnalysis();
    });

    // FEN input with debouncing
    const fenInput = document.getElementById('fen-input') as HTMLInputElement;
    fenInput.addEventListener('input', debounce((event) => {
      const target = event.target as HTMLInputElement;
      const fen = target.value.trim();
      if (fen) {
        try {
          parseFEN(fen); // Validate FEN
        } catch (error) {
          target.style.borderColor = 'red';
          return;
        }
      }
      target.style.borderColor = '';
    }, 500));

    // Results tabs
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const target = e.target as HTMLElement;
        const tab = target.dataset.tab;
        if (tab) {
          this.switchResultsTab(tab);
        }
      });
    });
  }



  private switchResultsTab(tab: string): void {
    // Update active tab button
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.classList.remove('active');
    });
    document.querySelector(`[data-tab="${tab}"]`)?.classList.add('active');

    // Update active results panel
    document.querySelectorAll('.results-panel').forEach(panel => {
      panel.classList.remove('active');
    });
    document.getElementById(`${tab}-results`)?.classList.add('active');
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
        this.updateResults(result);
      });

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
    return {
      maxDepth: parseInt((document.getElementById('max-depth') as HTMLInputElement).value),
      whiteMoves: parseInt((document.getElementById('white-moves') as HTMLInputElement).value),
      blackMoves: parseInt((document.getElementById('black-moves') as HTMLInputElement).value),
      threads: parseInt((document.getElementById('threads') as HTMLInputElement).value),
      hashSize: parseInt((document.getElementById('hash-size') as HTMLInputElement).value)
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
    console.log('Updating results:', result);
    
    // Update results panels
    this.updateResultsPanel('white', result.whiteMoves || []);
    this.updateResultsPanel('black', result.blackMoves || []);
  }

  private updateResultsPanel(color: string, moves: any[]): void {
    const panel = document.getElementById(`${color}-results`);
    if (!panel) return;

    if (moves.length === 0) {
      panel.innerHTML = '<p>No analysis results yet.</p>';
      return;
    }

    const movesHtml = moves.map(move => `
      <div class="move-item">
        <div class="move-notation">${move.notation}</div>
        <div class="move-score">Score: ${move.score}</div>
        <div class="move-pv">PV: ${move.pv.join(' ')}</div>
      </div>
    `).join('');

    panel.innerHTML = movesHtml;
  }
}

// Initialize the app when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  new ChessAnalysisApp();
}); 