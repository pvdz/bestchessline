class MinimalStockfishClient {
    constructor() {
        this.stockfish = null;
        this.isReady = false;
        this.messageQueue = [];
    }

    async initialize() {
        console.log('MinimalStockfishClient: Starting initialization...');
        
        if (typeof window.Stockfish === 'undefined') {
            throw new Error('Stockfish not available');
        }

        try {
            console.log('MinimalStockfishClient: Creating Stockfish instance...');
            this.stockfish = await window.Stockfish();
            console.log('MinimalStockfishClient: Stockfish instance created');

            this.stockfish.addMessageListener((message) => {
                console.log('MinimalStockfishClient: Received:', message);
                this.handleMessage(message);
            });

            console.log('MinimalStockfishClient: Sending UCI command...');
            this.stockfish.postMessage('uci');

            // Wait for ready
            await this.waitForReady();
            
            console.log('MinimalStockfishClient: Initialization complete');
            return true;
        } catch (error) {
            console.error('MinimalStockfishClient: Initialization failed:', error);
            throw error;
        }
    }

    handleMessage(message) {
        if (message.includes('uciok')) {
            console.log('MinimalStockfishClient: UCI OK received');
            this.stockfish.postMessage('isready');
        } else if (message.includes('readyok')) {
            console.log('MinimalStockfishClient: Ready OK received');
            this.isReady = true;
        }
    }

    async waitForReady() {
        console.log('MinimalStockfishClient: Waiting for ready...');
        let attempts = 0;
        while (!this.isReady && attempts < 50) {
            await new Promise(resolve => setTimeout(resolve, 100));
            attempts++;
        }
        
        if (!this.isReady) {
            throw new Error('Stockfish failed to become ready');
        }
    }

    async analyzePosition(fen, depth = 10) {
        if (!this.isReady) {
            throw new Error('Stockfish not ready');
        }

        console.log(`MinimalStockfishClient: Analyzing position at depth ${depth}`);
        this.stockfish.postMessage(`position fen ${fen}`);
        this.stockfish.postMessage(`go depth ${depth}`);
    }
}

// Make it available globally
window.MinimalStockfishClient = MinimalStockfishClient; 