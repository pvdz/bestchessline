export async function apiLineGet(position, searchLineCount, maxDepth) {
    console.log("apiLineGet(): Fetching lines from server:", position, searchLineCount, maxDepth);
    const response = await fetch(`/api/line?fen=${encodeURIComponent(position)}&searchLineCount=${searchLineCount}&maxDepth=${maxDepth}`);
    return response.json();
}
export async function apiLinesPut(position, moves, searchLineCount, maxDepth) {
    console.log("apiLinesPut(): Sending lines to server:", position, moves, searchLineCount, maxDepth);
    const response = await fetch(`/api/line?fen=${encodeURIComponent(position)}&searchLineCount=${searchLineCount}&maxDepth=${maxDepth}`, {
        method: "PUT",
        body: JSON.stringify({ position, moves, searchLineCount }),
    });
    return response.json();
}
//# sourceMappingURL=fish-remote.js.map