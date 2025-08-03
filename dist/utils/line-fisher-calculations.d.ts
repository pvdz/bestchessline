import type { LineFisherConfig } from "../line_fisher.js";
/**
 * Calculate total nodes in the analysis tree
 */
export declare const calculateTotalNodes: (config: LineFisherConfig) => number;
/**
 * Calculate the number of responder nodes in the analysis tree
 * @param config - The configuration for the Line Fisher analysis
 * @returns The number of responder nodes in the analysis tree
 */
export declare const calculateResponderNodes: (config: LineFisherConfig) => number;
/**
 * Calculate total lines in the analysis
 */
export declare const calculateTotalLines: (config: LineFisherConfig) => number;
