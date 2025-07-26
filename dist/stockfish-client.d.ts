import { AnalysisResult, StockfishOptions } from './types.js';
export declare class StockfishClient {
    private worker;
    private isReady;
    private isAnalyzing;
    private currentAnalysis;
    private analysisCallbacks;
    private engineStatus;
    constructor();
    private initializeStockfish;
    private uciCmd;
    private handleMessage;
    private parseInfoMessage;
    private handleBestMove;
    private parseMove;
    analyzePosition(fen: string, options?: StockfishOptions, onUpdate?: (result: AnalysisResult) => void): Promise<AnalysisResult>;
    stopAnalysis(): void;
    isAnalyzingPosition(): boolean;
    getCurrentAnalysis(): AnalysisResult | null;
    destroy(): void;
}
