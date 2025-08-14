import { SimpleMove } from "../../utils/types.js";
import type { ServerLine } from "../../server/types.js";

export async function apiLineGet(
  position: string, // FEN
  searchLineCount: number,
  maxDepth: number,
): Promise<SimpleMove[] | null> {
  console.log(
    "apiLineGet(): Fetching lines from server:",
    position,
    searchLineCount,
    maxDepth,
  );

  const response = await fetch(
    `/api/line?fen=${encodeURIComponent(position)}&searchLineCount=${searchLineCount}&maxDepth=${maxDepth}`,
    {
      method: "GET",
    },
  );
  const obj = await response.json();
  if (obj?.ok && validateServerLine(obj.data)) {
    return obj.data.bestMoves;
  }

  return null;
}

export async function apiLinesPut(
  rootFEN: string,
  moves: string[] | null, // long moves. set to null when this is unknown. this is used to update the server for the practice app.
  nowFEN: string,
  best: SimpleMove[],
  searchLineCount: number,
  maxDepth: number,
): Promise<void> {
  const obj = {
    root: rootFEN,
    moves,
    position: nowFEN,
    best,
    searchLineCount,
    maxDepth,
  };
  console.log("apiLinesPut(): Sending lines to server:", obj);
  const response = await fetch(`/api/line`, {
    method: "PUT",
    body: JSON.stringify(obj),
  });
  console.log("response", response);
  const body = await response.json();
  console.log("and the body is:", body);
  return body;
}

function validateServerLine(obj: Record<string, unknown>): obj is ServerLine {
  return (
    obj &&
    Object.keys(obj).every((key: string) => {
      switch (key) {
        case "root": {
          if (typeof obj.root !== "string") {
            return console.log(
              "validateServerLine(): rejected: root is not a string",
              obj.root,
            );
          }
          break;
        }
        case "moves": {
          if (!Array.isArray(obj.moves))
            return console.log("moves is not an array", obj.moves);
          if (obj.moves.some((move) => typeof move !== "string"))
            return console.log("moves is not an array of strings", obj.moves);
          if (obj.moves.some((move) => !/^[a-h][1-8][a-h][1-8]$/.test(move)))
            return console.log(
              "moves is not an array of long move strings of length 4",
              obj.moves,
            );
          break;
        }
        case "position": {
          if (typeof obj.position !== "string") {
            return console.log(
              "validateServerLine(): rejected: position is not a string",
              obj.position,
            );
          }
          break;
        }
        case "bestMoves": {
          if (!Array.isArray(obj.bestMoves)) {
            return console.log(
              "validateServerLine(): rejected: bestMoves is not an array",
              obj.bestMoves,
            );
          }
          if (
            obj.bestMoves.some((move) => {
              return (
                typeof move !== "object" ||
                move === null ||
                typeof move.score !== "number" ||
                typeof move.move !== "string" ||
                typeof move.mateIn !== "number" ||
                typeof move.draw !== "boolean"
              );
            })
          ) {
            return console.log(
              "validateServerLine(): rejected: bestMoves is not an array of objects with score, move, mateIn, and draw",
              obj.bestMoves,
            );
          }
          break;
        }
        case "searchLineCount": {
          if (typeof obj.searchLineCount !== "number") {
            return console.log(
              "validateServerLine(): rejected: searchLineCount is not a number",
              obj.searchLineCount,
            );
          }
          break;
        }
        case "maxDepth": {
          if (typeof obj.maxDepth !== "number")
            return console.log(
              "validateServerLine(): rejected: maxDepth is not a number",
              obj.maxDepth,
            );
          break;
        }
        default: {
          console.log("validateServerLine(): rejected: unknown key:", key);
          return false;
        }
      }
      return true;
    })
  );
}
