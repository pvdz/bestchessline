import { ChessBoard } from './chess-board';
import { StockfishClient } from './stockfish-client';
import { formatScore, formatTime, debounce } from './utils';
export class ChessAnalysisApp {
    constructor() {
        this.isAnalyzing = false;
        this.analysisStartTime = 0;
        this.currentAnalysis = null;
        this.whiteResults = [];
        this.blackResults = [];
        this.config = {
            maxDepth: 20,
            whiteMoves: 5,
            blackMoves: 5,
            stockfishOptions: {
                depth: 20,
                threads: 1,
                hash: 32
            }
        };
        this.initializeComponents();
        this.setupEventListeners();
        this.updateUI();
    }
    initializeComponents() {
        // Initialize chess board
        const boardElement = document.getElementById('chess-board');
        if (!boardElement)
            throw new Error('Chess board element not found');
        this.board = new ChessBoard(boardElement);
        this.board.setOnPositionChange((position) => {
            this.onPositionChange();
        });
        // Initialize Stockfish
        this.stockfish = new StockfishClient();
    }
    setupEventListeners() {
        // Board controls
        document.getElementById('reset-board')?.addEventListener('click', () => {
            this.board.setPosition('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
            this.clearResults();
        });
        document.getElementById('clear-board')?.addEventListener('click', () => {
            this.board.setPosition('8/8/8/8/8/8/8/8 w - - 0 1');
            this.clearResults();
        });
        document.getElementById('load-fen')?.addEventListener('click', () => {
            const fenInput = document.getElementById('fen-input');
            if (fenInput.value.trim()) {
                this.board.setPosition(fenInput.value.trim());
                this.clearResults();
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
        // Configuration inputs
        const configInputs = ['max-depth', 'white-moves', 'black-moves', 'threads', 'hash-size'];
        configInputs.forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.addEventListener('change', () => {
                    this.updateConfig();
                });
            }
        });
        // Results tabs
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const target = e.target;
                const tab = target.dataset.tab;
                if (tab) {
                    this.switchTab(tab);
                }
            });
        });
        // FEN input with debounced validation
        const fenInput = document.getElementById('fen-input');
        if (fenInput) {
            fenInput.addEventListener('input', debounce(() => {
                this.validateFEN(fenInput.value);
            }, 500));
        }
    }
    updateConfig() {
        this.config.maxDepth = parseInt(document.getElementById('max-depth').value) || 20;
        this.config.whiteMoves = parseInt(document.getElementById('white-moves').value) || 5;
        this.config.blackMoves = parseInt(document.getElementById('black-moves').value) || 5;
        this.config.stockfishOptions.threads = parseInt(document.getElementById('threads').value) || 1;
        this.config.stockfishOptions.hash = parseInt(document.getElementById('hash-size').value) || 32;
        this.config.stockfishOptions.depth = this.config.maxDepth;
    }
    validateFEN(fen) {
        const loadBtn = document.getElementById('load-fen');
        if (!loadBtn)
            return;
        // Basic FEN validation
        const parts = fen.trim().split(' ');
        const isValid = parts.length >= 4 &&
            parts[0].includes('/') &&
            ['w', 'b'].includes(parts[1]) &&
            /^[KQkq-]+$/.test(parts[2]);
        loadBtn.disabled = !isValid;
        loadBtn.style.opacity = isValid ? '1' : '0.5';
    }
    async startAnalysis() {
        if (this.isAnalyzing)
            return;
        this.updateConfig();
        this.isAnalyzing = true;
        this.analysisStartTime = Date.now();
        this.clearResults();
        this.updateUI();
        try {
            const fen = this.board.getFEN();
            const position = this.board.getPosition();
            // Analyze for both sides
            await this.analyzePosition(fen, position.turn === 'w' ? 'white' : 'black');
            // If it's white's turn, also analyze black's responses
            if (position.turn === 'w') {
                await this.analyzePosition(fen, 'black');
            }
            else {
                await this.analyzePosition(fen, 'white');
            }
        }
        catch (error) {
            console.error('Analysis failed:', error);
            this.updateStatus('Analysis failed: ' + error.message);
        }
        finally {
            this.isAnalyzing = false;
            this.updateUI();
        }
    }
    async analyzePosition(fen, side) {
        this.updateStatus(`Analyzing ${side} moves...`);
        const result = await this.stockfish.analyzePosition(fen, this.config.stockfishOptions, (analysisResult) => {
            this.onAnalysisUpdate(analysisResult, side);
        });
        // Store results
        if (side === 'white') {
            this.whiteResults = result.moves.slice(0, this.config.whiteMoves);
        }
        else {
            this.blackResults = result.moves.slice(0, this.config.blackMoves);
        }
        this.updateResults();
        this.updateStatus(`Analysis complete for ${side}`);
    }
    onAnalysisUpdate(result, side) {
        this.currentAnalysis = result;
        // Update progress
        const progress = Math.min((result.depth / this.config.maxDepth) * 100, 100);
        this.updateProgress(progress);
        // Update status info
        this.updateAnalysisInfo(result);
        // Update results in real-time
        const moves = result.moves.slice(0, side === 'white' ? this.config.whiteMoves : this.config.blackMoves);
        if (side === 'white') {
            this.whiteResults = moves;
        }
        else {
            this.blackResults = moves;
        }
        this.updateResults();
    }
    pauseAnalysis() {
        if (this.isAnalyzing) {
            this.stockfish.stopAnalysis();
            this.updateStatus('Analysis paused');
        }
    }
    stopAnalysis() {
        this.isAnalyzing = false;
        this.stockfish.stopAnalysis();
        this.updateStatus('Analysis stopped');
        this.updateUI();
    }
    onPositionChange() {
        this.clearResults();
        this.updateStatus('Position changed - ready for analysis');
    }
    clearResults() {
        this.whiteResults = [];
        this.blackResults = [];
        this.currentAnalysis = null;
        this.updateResults();
        this.updateProgress(0);
        this.updateAnalysisInfo(null);
    }
    updateResults() {
        this.updateWhiteResults();
        this.updateBlackResults();
    }
    updateWhiteResults() {
        const container = document.getElementById('white-results');
        if (!container)
            return;
        if (this.whiteResults.length === 0) {
            container.innerHTML = '<div class="no-results">No analysis results yet</div>';
            return;
        }
        container.innerHTML = this.whiteResults.map(move => this.createMoveResultHTML(move)).join('');
    }
    updateBlackResults() {
        const container = document.getElementById('black-results');
        if (!container)
            return;
        if (this.blackResults.length === 0) {
            container.innerHTML = '<div class="no-results">No analysis results yet</div>';
            return;
        }
        container.innerHTML = this.blackResults.map(move => this.createMoveResultHTML(move)).join('');
    }
    createMoveResultHTML(move) {
        const scoreClass = move.score > 0 ? 'positive' : move.score < 0 ? 'negative' : 'neutral';
        const pvString = move.pv.map(m => `${m.from}${m.to}`).join(' ');
        return `
      <div class="move-result">
        <div class="move-header">
          <div class="move-notation">${move.move.from}${move.move.to}${move.move.promotion || ''}</div>
          <div class="move-score ${scoreClass}">${formatScore(move.score)}</div>
        </div>
        <div class="move-details">
          <span>Depth: ${move.depth}</span>
          <span>Nodes: ${move.nodes.toLocaleString()}</span>
          <span>Time: ${formatTime(move.time)}</span>
        </div>
        <div class="move-pv">${pvString}</div>
      </div>
    `;
    }
    switchTab(tab) {
        // Update tab buttons
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-tab="${tab}"]`)?.classList.add('active');
        // Update panels
        document.querySelectorAll('.results-panel').forEach(panel => {
            panel.classList.remove('active');
        });
        document.getElementById(`${tab}-results`)?.classList.add('active');
    }
    updateUI() {
        const startBtn = document.getElementById('start-analysis');
        const pauseBtn = document.getElementById('pause-analysis');
        const stopBtn = document.getElementById('stop-analysis');
        if (startBtn)
            startBtn.disabled = this.isAnalyzing;
        if (pauseBtn)
            pauseBtn.disabled = !this.isAnalyzing;
        if (stopBtn)
            stopBtn.disabled = !this.isAnalyzing;
    }
    updateStatus(message) {
        const statusElement = document.getElementById('status-message');
        if (statusElement) {
            statusElement.textContent = message;
        }
    }
    updateProgress(percentage) {
        const progressFill = document.getElementById('progress-fill');
        if (progressFill) {
            progressFill.style.width = `${percentage}%`;
        }
    }
    updateAnalysisInfo(result) {
        const depthElement = document.getElementById('current-depth');
        const nodesElement = document.getElementById('nodes-searched');
        const timeElement = document.getElementById('time-elapsed');
        if (result) {
            if (depthElement)
                depthElement.textContent = `Depth: ${result.depth}`;
            if (nodesElement) {
                const totalNodes = result.moves.reduce((sum, move) => sum + move.nodes, 0);
                nodesElement.textContent = `Nodes: ${totalNodes.toLocaleString()}`;
            }
            if (timeElement) {
                const elapsed = Date.now() - this.analysisStartTime;
                timeElement.textContent = `Time: ${formatTime(elapsed)}`;
            }
        }
        else {
            if (depthElement)
                depthElement.textContent = 'Depth: 0';
            if (nodesElement)
                nodesElement.textContent = 'Nodes: 0';
            if (timeElement)
                timeElement.textContent = 'Time: 0ms';
        }
    }
    destroy() {
        this.board.destroy();
        this.stockfish.destroy();
    }
}
// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new ChessAnalysisApp();
});
//# sourceMappingURL=app.js.map