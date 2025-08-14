import { SimpleMove } from "../utils/types";

export type ServerLine = {
  root: string; // FEN
  moves: string[]; // long moves
  position: string; // FEN
  bestMoves: SimpleMove[];
  searchLineCount: number;
  maxDepth: number;
};
