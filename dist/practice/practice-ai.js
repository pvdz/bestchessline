import { initializeStockfish } from "../utils/stockfish-client.js";
import { getTopLinesTrapped } from "../line/fish/fish-utils.js";
function levelInstructions(level) {
    switch (level) {
        case "beginner":
            return "Explain like to a beginner (~800 ELO): avoid jargon, focus on basic ideas, simple plans, and common tactics. Give concrete advice.";
        case "intermediate":
            return "Explain to an intermediate (~1200-1600): include core concepts, simple evaluation, and common plans. Mention basic structural ideas.";
        case "advanced":
            return "Explain to an advanced (~1600-2000): discuss pawn structures, typical tactical motifs, strategic plans, key squares, and typical piece maneuvers.";
        case "expert":
            return "Explain to an expert (~2000-2400): use precise chess terms, give concrete variations (short), discuss long-term imbalances and dynamic/positional trade-offs.";
        case "gm":
            return "Explain to a GM-level audience: deep evaluation, critical lines succinctly, highlight evaluation shifts, known theory branches, and subtle nuances.";
    }
}
function buildPrompt(fen, moves, level, userQuestion) {
    const levelText = levelInstructions(level);
    const header = `You are a chess coach. ${levelText}`;
    const position = `Current position (FEN): ${fen}`;
    let sfSummary = "No engine context.";
    if (moves && moves.length > 0) {
        const lines = moves.map((m, i) => {
            const score = Math.abs(m.score) >= 10000
                ? m.score > 0
                    ? "+Mate"
                    : "-Mate"
                : (m.score / 100).toFixed(2);
            const first = `${m.move}`;
            // hmmm yes, we need to update the server side to store and return the moves too ...
            const pv = "I AM A PV AND I NEED TO BE FIXED"; // FIXME. m.pv.slice(0, 8).join(" ");
            return `${i + 1}. ${first} (score ${score}) pv: ${pv}`;
        });
        sfSummary = `Top engine lines (truncated):\n${lines.join("\n")}`;
    }
    const guidance = "Discuss: opening family if recognizable, typical plans for both sides, pawn structure, tactical motifs, strategic ideas, good vs bad moves, and what to study next.";
    const question = userQuestion?.trim()
        ? `User question: ${userQuestion.trim()}`
        : "Explain why the top candidate moves are good/bad and what ideas they aim for.";
    return [header, position, sfSummary, guidance, question].join("\n\n");
}
export async function explainCurrentPositionWithAI(gameState, cfg, opts = {}) {
    // Prepare engine context
    try {
        initializeStockfish();
    }
    catch {
        // ignore, stockfish-client is idempotent
    }
    let moves = await getTopLinesTrapped(gameState.currentFEN, cfg.maxLines ?? 5, {
        maxDepth: 20,
        threads: 1,
        onUpdate: () => { },
    });
    if (!moves) {
        // Continue without engine context
        console.warn("Failed to get best lines from server or stockfish, moving on without them");
    }
    const prompt = buildPrompt(gameState.currentFEN, moves, cfg.level, opts.question);
    const body = {
        model: cfg.model,
        messages: [
            { role: "system", content: "You are a helpful chess coach and analyst." },
            { role: "user", content: prompt },
        ],
        temperature: cfg.temperature ?? 0.7,
    };
    const resp = await fetch(`${cfg.apiBaseUrl.replace(/\/$/, "")}/v1/chat/completions`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${cfg.apiKey}`,
        },
        body: JSON.stringify(body),
    });
    if (!resp.ok) {
        const txt = await resp.text().catch(() => "");
        throw new Error(`AI request failed (${resp.status}): ${txt}`);
    }
    const data = (await resp.json());
    const content = data?.choices?.[0]?.message?.content ??
        data?.choices?.[0]?.text ??
        "No response.";
    return content.trim();
}
//# sourceMappingURL=practice-ai.js.map