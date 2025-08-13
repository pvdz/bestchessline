import { SimpleMove } from "../../utils/types.js";

export async function apiLineGet(
  position: string,
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
  );
  return response.json() as Promise<SimpleMove[] | null>;
}

export async function apiLinesPut(
  position: string,
  moves: SimpleMove[],
  searchLineCount: number,
  maxDepth: number,
): Promise<void> {
  console.log(
    "apiLinesPut(): Sending lines to server:",
    position,
    moves,
    searchLineCount,
    maxDepth,
  );
  const response = await fetch(
    `/api/line?fen=${encodeURIComponent(position)}&searchLineCount=${searchLineCount}&maxDepth=${maxDepth}`,
    {
      method: "PUT",
      body: JSON.stringify({ position, moves, searchLineCount }),
    },
  );
  return response.json();
}
