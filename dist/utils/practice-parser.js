import { parseMove } from "./move-parsing.js";
export function getMoveNotation(move) {
    return `${move.piece}${move.from}${move.to}`;
}
export function parseMoveFromSAN(san, fen) {
    const parsedMove = parseMove(san, fen);
    if (!parsedMove)
        return null;
    return {
        from: parsedMove.from,
        to: parsedMove.to,
        piece: parsedMove.piece,
    };
}
//# sourceMappingURL=practice-parser.js.map