import { AnalysisResult, StockfishOptions } from './types';
declare global {
    interface Window {
        Stockfish: any;
    }
}
export declare class StockfishClient {
    private stockfish;
    private isReady;
    private isAnalyzing;
    private currentAnalysis;
    private analysisCallbacks;
    constructor();
    private loadStockfish;
    private initializeStockfish;
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
