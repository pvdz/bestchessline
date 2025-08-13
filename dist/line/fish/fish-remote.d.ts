import { SimpleMove } from "../../utils/types.js";
export declare function apiLineGet(position: string, searchLineCount: number, maxDepth: number): Promise<SimpleMove[] | null>;
export declare function apiLinesPut(position: string, moves: SimpleMove[], searchLineCount: number, maxDepth: number): Promise<void>;
