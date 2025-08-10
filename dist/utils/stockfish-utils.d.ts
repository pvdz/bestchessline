/**
 * Check if SharedArrayBuffer is available and supported
 */
export declare function isSharedArrayBufferSupported(): boolean;
/**
 * Get the appropriate Stockfish worker URL based on environment
 */
export declare function getStockfishWorkerUrl(): string;
export declare function getStockfishWorkerUrlThreaded(): string;
export declare function getStockfishWorkerUrlFallback(): string;
export declare function emphasizeFishTickerWithPause(): Promise<void>;
