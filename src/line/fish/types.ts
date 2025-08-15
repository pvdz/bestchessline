import { SimpleMove } from "../../utils/types";

/**
 * Line Fisher analysis configuration
 */
export interface LineFisherConfig {
  initiatorIsWhite: boolean; // Whether the initiator is the White player or Black player
  initiatorMoves: string[]; // First n moves for initiator (e.g., ["Nf3", "g3"])
  responderMoveCounts: number[]; // Number of responses for each initiator move (e.g., [2, 3])
  maxDepth: number; // Maximum analysis depth. Note: this is NOT stockfish depth (!)
  threads: number; // Number of CPU threads
  defaultResponderCount: number; // Default responder count for levels not specified
  // targetDepth removed from line app (confetti only lives in practice)
  rootFEN: string; // Root position for analysis
  baselineScore: number; // Score of the root position for delta calculations
  baselineMoves: SimpleMove[]; // Top moves from root position
}

/**
 * Line Fisher result for a single line
 */
export interface LineFisherResult {
  lineIndex: number;
  pcns: string[]; // PCN notation moves in this line (e.g., ["Ng1f3", "g8f6", "d2d4"])
  sanLine: string; // Computed SAN game string (computed on demand)
  nodeId: string; // (unique) id of the node representing this line in the DOM
  isComplete: boolean;
  isDone: boolean; // No more updates expected
  isTransposition?: boolean; // Track if this line leads to a transposed position
  responderMoveList?: string[]; // For initiator moves only, only used for display - format: "moveNotation (score)" (e.g., "Nf3 (+0.5)")
  updateCount: number; // Track number of updates applied to this line
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
  // Top 5 moves for the last initiator move in this line (top5 of "parent" FishLine)
  alts: { move: string; score: number }[];
  // Top 5 reply moves to the actual move made by the intiator last in this line (top5 of FishLine)
  replies: { move: string; score: number }[];
}

/**
 * Represents a line being analyzed.
 * Note: The last move of a (finished) FishLine should have an initiator move last.
 * Note: All FishLines except the first of a search tree will have at least a responder and initiator move.
 */
export interface FishLine {
  lineIndex: number; // Unique line identifier
  nodeId: string; // Optional node ID for DOM element reference. Empty string when not yet created.
  sanGame: string; // Computed SAN game string (computed on demand to display only)
  pcns: string[]; // PCN notation moves in this line
  best5Replies: SimpleMove[]; // Top5 replies to last initiator move in the line ("child" lines should continue with these moves)
  best5Alts: SimpleMove[]; // Top5 moves the initiator could have made in place of the last move intiiator actually made (lines should end with best of these moves unless predefined)
  score: number; // Score of the last move in this line (for backward compatibility)
  position: string; // Current position FEN
  isDone: boolean; // Whether this line is complete
  isFull: boolean; // Whether this line has reached max depth
  isMate: boolean; // Whether this line ends in checkmate
  isStalemate: boolean; // Whether this line ends in stalemate
  isTransposition: boolean; // Whether this line transposes to another position
  transpositionTarget?: string; // ID of the line this transposes to
}

/**
 * Fish analysis state
 */
export interface FishState {
  isFishing: boolean; // Flag to control if analysis should continue
  lineCounter: number; // Counter for lines, assigns their index
  wip: FishLine[]; // Lines currently being worked on
  done: FishLine[]; // Completed lines
  config: LineFisherConfig;
  // Map of normalized FENs (without half/fullmove counters) seen in completed lines
  transposedPositions?: Map<string, true>;
  // Number of detected transpositions during this session
  transpositionCount?: number;
}
