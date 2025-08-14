import { SimpleMove } from "../utils/types";
export type ServerLine = {
    root: string;
    moves: string[];
    position: string;
    bestMoves: SimpleMove[];
    searchLineCount: number;
    maxDepth: number;
};
