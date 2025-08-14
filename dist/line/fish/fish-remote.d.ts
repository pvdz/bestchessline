import { SimpleMove } from "../../utils/types.js";
export declare function apiLineGet(position: string, // FEN
searchLineCount: number, maxDepth: number): Promise<SimpleMove[] | null>;
export declare function apiLinesPut(rootFEN: string, moves: string[] | null, // long moves. set to null when this is unknown. this is used to update the server for the practice app.
nowFEN: string, best: SimpleMove[], searchLineCount: number, maxDepth: number): Promise<void>;
