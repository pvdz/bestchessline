import { SimpleMove } from "../../utils/types";
/**
 * Line Fisher analysis configuration
 */
export interface LineFisherConfig {
    initiatorIsWhite: boolean;
    initiatorMoves: string[];
    responderMoveCounts: number[];
    maxDepth: number;
    threads: number;
    defaultResponderCount: number;
    rootFEN: string;
    baselineScore: number;
    baselineMoves: SimpleMove[];
}
/**
 * Line Fisher result for a single line
 */
export interface LineFisherResult {
    lineIndex: number;
    pcns: string[];
    sanLine: string;
    nodeId: string;
    isComplete: boolean;
    isDone: boolean;
    isTransposition?: boolean;
    responderMoveList?: string[];
    updateCount: number;
}
/**
 * Metadata structure for line parsing
 */
export interface LineMetadata {
    scores?: number[];
    lineId?: string;
    isMate?: boolean;
    isStalemate?: boolean;
    isTransposition?: boolean;
    transpositionTarget?: string;
    targetResponderCount?: number;
    currentResponderCount?: number;
    alts: {
        move: string;
        score: number;
    }[];
    replies: {
        move: string;
        score: number;
    }[];
}
/**
 * Represents a line being analyzed.
 * Note: The last move of a (finished) FishLine should have an initiator move last.
 * Note: All FishLines except the first of a search tree will have at least a responder and initiator move.
 */
export interface FishLine {
    lineIndex: number;
    nodeId: string;
    sanGame: string;
    pcns: string[];
    best5Replies: SimpleMove[];
    best5Alts: SimpleMove[];
    score: number;
    position: string;
    isDone: boolean;
    isFull: boolean;
    isMate: boolean;
    isStalemate: boolean;
    isTransposition: boolean;
    transpositionTarget?: string;
}
/**
 * Fish analysis state
 */
export interface FishState {
    isFishing: boolean;
    lineCounter: number;
    wip: FishLine[];
    done: FishLine[];
    config: LineFisherConfig;
}
