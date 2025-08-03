import type { LineFisherState } from "../line_fisher.js";
/**
 * Cached calculation result type
 */
interface CachedCalculation {
  value: number;
  timestamp: number;
}
/**
 * Line Fisher performance optimization utilities
 */
export declare const optimizeLineFisherPerformance: (
  state: LineFisherState,
) => {
  positionHash: (fen: string) => string;
  positionCache: WeakMap<object, CachedCalculation>;
  processBatch: (operations: (() => Promise<void>)[]) => Promise<void>;
  getCachedCalculation: (key: string, calculation: () => number) => number;
  debouncedProgressUpdate: () => void;
};
export {};
