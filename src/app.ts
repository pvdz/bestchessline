import { ChessBoard } from "./chess-board.js";
import { StockfishClient } from "./stockfish-client.js";
import {
  moveToNotation,
  pvToNotation,
  getInputElement,
  getTextAreaElement,
  getButtonElement,
  getCheckedRadioByName,
  getAllRadios,
  isHTMLElement,
} from "./utils.js";
import {
  ChessMove,
  AnalysisResult,
  AnalysisOptions,
  AnalysisMove,
  ProcessedMoveItem,
} from "./types.js";

class ChessAnalysisApp {
  private board: ChessBoard;
  private stockfish: StockfishClient;
  private isAnalyzing = false;
  private currentResults: AnalysisResult | null = null;
  private moves: ChessMove[] = [];
  private initialFEN: string =
    "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
  private currentMoveIndex: number = -1;

  constructor() {
    const boardElement = document.getElementById("chess-board");
    if (!boardElement) {
      throw new Error("Chess board element not found");
    }
    this.board = new ChessBoard(boardElement);
    this.stockfish = new StockfishClient();
    this.initializeEventListeners();
    this.initializeMoveHoverEvents();

    // Set up board position change callback
    this.board.setOnPositionChange((position) => {
      this.updateFENInput();
      this.updateControlsFromPosition();
    });

    // Set up board move callback
    this.board.setOnMoveMade((move) => {
      this.addMove(move);
    });

    // Initialize controls from current board state
    this.updateControlsFromPosition();
  }

  private initializeEventListeners(): void {
    // Board controls
    const resetBtn = document.getElementById("reset-board");
    const clearBtn = document.getElementById("clear-board");
    const fenInput = getInputElement("fen-input");
    const loadFenBtn = document.getElementById("load-fen");
    const gameNotation = getTextAreaElement("game-notation");
    const importGameBtn = document.getElementById("import-game");

    if (resetBtn)
      resetBtn.addEventListener("click", () => {
        this.initialFEN =
          "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
        this.moves = [];
        this.currentMoveIndex = -1;
        this.board.setPosition(
          "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
        );
        this.updateMoveList();
        this.updateNavigationButtons();
      });
    if (clearBtn)
      clearBtn.addEventListener("click", () => {
        this.initialFEN = "8/8/8/8/8/8/8/8 w - - 0 1";
        this.moves = [];
        this.currentMoveIndex = -1;
        this.board.setPosition("8/8/8/8/8/8/8/8 w - - 0 1");
        this.updateMoveList();
        this.updateNavigationButtons();
      });
    if (loadFenBtn && fenInput) {
      loadFenBtn.addEventListener("click", () => {
        const fen = fenInput.value.trim();
        if (fen) {
          this.initialFEN = fen;
          this.moves = [];
          this.currentMoveIndex = -1;
          this.board.setPosition(fen);
          this.updateMoveList();
          this.updateNavigationButtons();
        }
      });
    }
    if (importGameBtn && gameNotation) {
      importGameBtn.addEventListener("click", () => {
        const notation = gameNotation.value.trim();
        if (notation) {
          this.importGame(notation);
        }
      });
    }

    // Game moves navigation
    const prevMoveBtn = document.getElementById("prev-move");
    const nextMoveBtn = document.getElementById("next-move");

    if (prevMoveBtn)
      prevMoveBtn.addEventListener("click", () => this.previousMove());
    if (nextMoveBtn)
      nextMoveBtn.addEventListener("click", () => this.nextMove());

    // Position controls
    this.initializePositionControls();

    // Analysis controls
    const startBtn = document.getElementById("start-analysis");
    const pauseBtn = document.getElementById("pause-analysis");
    const stopBtn = document.getElementById("stop-analysis");

    if (startBtn)
      startBtn.addEventListener("click", () => this.startAnalysis());
    if (pauseBtn)
      pauseBtn.addEventListener("click", () => this.pauseAnalysis());
    if (stopBtn) stopBtn.addEventListener("click", () => this.stopAnalysis());

    // Notation and piece format toggles
    const notationRadios = getAllRadios("notation-format");
    const pieceRadios = getAllRadios("piece-format");

    if (notationRadios) {
      notationRadios.forEach((radio) => {
        radio.addEventListener("change", () => {
          if (this.currentResults) {
            this.updateResults(this.currentResults);
          }
        });
      });
    }

    if (pieceRadios) {
      pieceRadios.forEach((radio) => {
        radio.addEventListener("change", () => {
          if (this.currentResults) {
            this.updateResults(this.currentResults);
          }
        });
      });
    }
  }

  private async startAnalysis(): Promise<void> {
    if (this.isAnalyzing) {
      console.log("Analysis already in progress");
      return;
    }

    const fen = this.board.getFEN();
    const options = this.getAnalysisOptions();

    try {
      this.isAnalyzing = true;
      this.updateButtonStates();
      this.updateStatus("Starting analysis...");

      const result = await this.stockfish.analyzePosition(
        fen,
        options,
        (result) => {
          this.currentResults = result;
          this.updateResults(result);
          // Update status with current depth
          if (result.depth > 0) {
            this.updateStatus(
              `Analyzing... Depth: ${result.depth}, Moves found: ${result.moves.length}`,
            );
          }
        },
      );

      this.currentResults = result;
      this.updateResults(result);
      this.updateStatus("Analysis complete");
    } catch (error) {
      console.error("Analysis failed:", error);
      this.updateStatus("Analysis failed: " + error);
    } finally {
      this.isAnalyzing = false;
      this.updateButtonStates();
    }
  }

  private pauseAnalysis(): void {
    // TODO: Implement pause functionality
    console.log("Pause analysis");
  }

  private stopAnalysis(): void {
    this.stockfish.stopAnalysis();
    this.isAnalyzing = false;
    this.updateButtonStates();
    this.updateStatus("Analysis stopped");
  }

  private getAnalysisOptions(): AnalysisOptions {
    const whiteMoves = parseInt(getInputElement("white-moves")?.value || "5");
    return {
      depth: parseInt(getInputElement("max-depth")?.value || "20"),
      threads: parseInt(getInputElement("threads")?.value || "1"),
      multiPV: whiteMoves, // Set MultiPV to the number of moves we want
    };
  }

  private updateButtonStates(): void {
    const startBtn = document.getElementById(
      "start-analysis",
    ) as HTMLButtonElement;
    const pauseBtn = document.getElementById(
      "pause-analysis",
    ) as HTMLButtonElement;
    const stopBtn = document.getElementById(
      "stop-analysis",
    ) as HTMLButtonElement;

    if (startBtn) startBtn.disabled = this.isAnalyzing;
    if (pauseBtn) pauseBtn.disabled = !this.isAnalyzing;
    if (stopBtn) stopBtn.disabled = !this.isAnalyzing;
  }

  private updateStatus(message: string): void {
    const statusElement = document.getElementById("status");
    if (statusElement) {
      statusElement.textContent = message;
    }
  }

  private updateResults(result: AnalysisResult): void {
    if (!result || !result.moves) {
      return;
    }

    const notationFormat =
      getCheckedRadioByName("notation-format")?.value || "short";
    const pieceFormat =
      getCheckedRadioByName("piece-format")?.value || "unicode";

    // Convert all moves to the proper format
    const moves = result.moves.map((move: AnalysisMove) => {
      console.log("Processing move:", move);
      console.log("PV before formatting:", move.pv);

      return {
        move: move.move, // Keep the original move object for filtering
        notation: moveToNotation(
          move.move,
          notationFormat as "short" | "long",
          pieceFormat as "unicode" | "english",
          result.position,
        ),
        score: move.score,
        depth: move.depth,
        pv: pvToNotation(
          move.pv,
          notationFormat as "short" | "long",
          pieceFormat as "unicode" | "english",
          result.position,
        ),
        nodes: move.nodes,
        time: move.time,
      };
    });

    // Filter to show each individual piece only once (keep the best move for each piece)
    const uniqueMoves = moves.reduce(
      (acc: ProcessedMoveItem[], move: ProcessedMoveItem) => {
        // Create a unique key for each piece based on the move's starting square
        const pieceKey = `${move.move.from}-${move.move.piece}`;
        const existingIndex = acc.findIndex((m: ProcessedMoveItem) => {
          const existingKey = `${m.move.from}-${m.move.piece}`;
          return existingKey === pieceKey;
        });

        if (existingIndex === -1) {
          // First time seeing this specific piece, add it
          acc.push(move);
        } else {
          // Already have a move for this specific piece, keep the better one
          if (move.score > acc[existingIndex].score) {
            acc[existingIndex] = move;
          }
        }

        return acc;
      },
      [],
    );

    // Sort by score to maintain best moves first
    uniqueMoves.sort(
      (a: ProcessedMoveItem, b: ProcessedMoveItem) => b.score - a.score,
    );

    // Update the single results panel with all moves
    this.updateResultsPanel(uniqueMoves);
  }

  private updateResultsPanel(moves: ProcessedMoveItem[]): void {
    const panel = document.getElementById("analysis-results");
    if (!panel) return;

    if (moves.length === 0) {
      panel.innerHTML = "<p>No analysis results yet.</p>";
      return;
    }

    const notationFormat =
      (
        document.querySelector(
          'input[name="notation-format"]:checked',
        ) as HTMLInputElement
      )?.value || "short";
    const movesHtml = moves
      .map(
        (move, index) => `
      <div class="move-item" data-move-from="${move.move.from}" data-move-to="${move.move.to}" data-move-piece="${move.move.piece}">
        <div class="move-header">
          <span class="move-rank" title="Move ranking (best moves first)">${index + 1}.</span>
          <span class="move-notation" title="Chess move in ${notationFormat} notation">${move.notation}</span>
          <span class="move-info">
            <span class="depth-info" title="Analysis depth - how many moves ahead Stockfish calculated">d${move.depth}</span>
            <span class="nodes-info" title="Number of positions Stockfish evaluated">${move.nodes}</span>
            <span class="time-info" title="Time taken for this analysis in milliseconds">${move.time}ms</span>
          </span>
          <span class="move-score" title="Position evaluation score (positive = advantage for current player)">${move.score}</span>
        </div>
        <div class="move-details">
          <span class="move-pv" title="Principal variation - the best line of play following this move">${move.pv}</span>
        </div>
      </div>
    `,
      )
      .join("");

    panel.innerHTML = movesHtml;

    // Add hover event listeners to move items
    this.addMoveHoverListeners();
  }

  private initializeMoveHoverEvents(): void {
    // This will be called when results are updated
  }

  private addMoveHoverListeners(): void {
    const moveItems = document.querySelectorAll(".move-item");
    moveItems.forEach((item) => {
      item.addEventListener("mouseenter", (e) => {
        const target = e.currentTarget as HTMLElement;
        const from = target.dataset.moveFrom;
        const to = target.dataset.moveTo;
        const piece = target.dataset.movePiece;

        if (from && to && piece) {
          this.board.showMoveArrow(from, to, piece);
        }
      });

      item.addEventListener("mouseleave", () => {
        this.board.hideMoveArrow();
      });
    });
  }

  private updateFENInput(): void {
    const fenInput = document.getElementById("fen-input") as HTMLInputElement;
    if (fenInput) {
      fenInput.value = this.board.getFEN();
    }
  }

  private addMove(move: ChessMove): void {
    this.moves.push(move);
    this.updateBoardFromMoves();
    this.updateMoveList();
  }

  private updateBoardFromMoves(): void {
    // Start with the initial FEN
    let currentFEN = this.initialFEN;

    // Apply each move to get the current board state
    for (const move of this.moves) {
      // For now, we'll use a simple approach - in a real implementation,
      // you'd want to use a chess library to properly apply moves
      // This is a simplified version that updates the board position
      currentFEN = this.applyMoveToFEN(currentFEN, move);
    }

    // Update the board with the calculated position
    this.board.setPosition(currentFEN);
  }

  private applyMoveToFEN(fen: string, move: ChessMove): string {
    console.log("applyMoveToFEN called with FEN:", fen, "Move:", move);

    // Handle special moves
    if (move.special === "castling") {
      console.log("Handling castling move");
      return this.applyCastlingMove(fen, move);
    } else if (move.special === "en-passant") {
      console.log("Handling en passant move");
      return this.applyEnPassantMove(fen, move);
    }

    console.log("Handling regular move");

    // Parse FEN
    const parts = fen.split(" ");
    const boardPart = parts[0];
    const turn = parts[1];
    const castling = parts[2];
    const enPassant = parts[3];
    const halfMoveClock = parseInt(parts[4]);
    const fullMoveNumber = parseInt(parts[5]);

    // Parse board
    const ranks = boardPart.split("/");
    const board: string[][] = [];

    for (let rank = 0; rank < 8; rank++) {
      board[rank] = [];
      let file = 0;
      for (let i = 0; i < ranks[rank].length; i++) {
        const char = ranks[rank][i];
        if (char >= "1" && char <= "8") {
          // Empty squares
          for (let j = 0; j < parseInt(char); j++) {
            board[rank][file] = "";
            file++;
          }
        } else {
          // Piece
          board[rank][file] = char;
          file++;
        }
      }
    }

    // Apply move
    const [fromRank, fromFile] = this.squareToCoords(move.from);
    const [toRank, toFile] = this.squareToCoords(move.to);
    console.log("Move coordinates - from:", [fromRank, fromFile], "to:", [
      toRank,
      toFile,
    ]);

    // Validate coordinates
    if (
      fromRank < 0 ||
      fromRank >= 8 ||
      fromFile < 0 ||
      fromFile >= 8 ||
      toRank < 0 ||
      toRank >= 8 ||
      toFile < 0 ||
      toFile >= 8
    ) {
      console.error("Invalid coordinates:", move, {
        fromRank,
        fromFile,
        toRank,
        toFile,
      });
      return fen; // Return original FEN if coordinates are invalid
    }

    const piece = board[fromRank][fromFile];
    console.log("Piece at from square:", piece);
    board[fromRank][fromFile] = "";
    board[toRank][toFile] = piece;
    console.log(
      "Board after move - from square empty:",
      board[fromRank][fromFile],
      "to square has piece:",
      board[toRank][toFile],
    );

    // Reconstruct FEN
    let newBoardPart = "";
    for (let rank = 0; rank < 8; rank++) {
      let emptyCount = 0;
      for (let file = 0; file < 8; file++) {
        if (board[rank][file] === "") {
          emptyCount++;
        } else {
          if (emptyCount > 0) {
            newBoardPart += emptyCount;
            emptyCount = 0;
          }
          newBoardPart += board[rank][file];
        }
      }
      if (emptyCount > 0) {
        newBoardPart += emptyCount;
      }
      if (rank < 7) {
        newBoardPart += "/";
      }
    }

    // Update turn
    const newTurn = turn === "w" ? "b" : "w";

    // Update move counters
    const newHalfMoveClock =
      piece.toUpperCase() === "P" || board[toRank][toFile] !== ""
        ? 0
        : halfMoveClock + 1;
    const newFullMoveNumber =
      turn === "b" ? fullMoveNumber + 1 : fullMoveNumber;

    const resultFEN = `${newBoardPart} ${newTurn} ${castling} ${enPassant} ${newHalfMoveClock} ${newFullMoveNumber}`;
    console.log("Result FEN:", resultFEN);
    return resultFEN;
  }

  private applyCastlingMove(fen: string, move: ChessMove): string {
    console.log("Applying castling move:", move);

    // Parse FEN
    const parts = fen.split(" ");
    const boardPart = parts[0];
    const turn = parts[1];
    const castling = parts[2];
    const enPassant = parts[3];
    const halfMoveClock = parseInt(parts[4]);
    const fullMoveNumber = parseInt(parts[5]);

    // Parse board
    const ranks = boardPart.split("/");
    const board: string[][] = [];

    for (let rank = 0; rank < 8; rank++) {
      board[rank] = [];
      let file = 0;
      for (let i = 0; i < ranks[rank].length; i++) {
        const char = ranks[rank][i];
        if (char >= "1" && char <= "8") {
          for (let j = 0; j < parseInt(char); j++) {
            board[rank][file] = "";
            file++;
          }
        } else {
          board[rank][file] = char;
          file++;
        }
      }
    }

    // Move king
    const [kingFromRank, kingFromFile] = this.squareToCoords(move.from);
    const [kingToRank, kingToFile] = this.squareToCoords(move.to);
    const kingPiece = board[kingFromRank][kingFromFile];
    board[kingFromRank][kingFromFile] = "";
    board[kingToRank][kingToFile] = kingPiece;

    // Move rook
    if (move.rookFrom && move.rookTo) {
      const [rookFromRank, rookFromFile] = this.squareToCoords(move.rookFrom);
      const [rookToRank, rookToFile] = this.squareToCoords(move.rookTo);
      const rookPiece = board[rookFromRank][rookFromFile];
      board[rookFromRank][rookFromFile] = "";
      board[rookToRank][rookToFile] = rookPiece;
    }

    // Reconstruct FEN
    let newBoardPart = "";
    for (let rank = 0; rank < 8; rank++) {
      let emptyCount = 0;
      for (let file = 0; file < 8; file++) {
        if (board[rank][file] === "") {
          emptyCount++;
        } else {
          if (emptyCount > 0) {
            newBoardPart += emptyCount;
            emptyCount = 0;
          }
          newBoardPart += board[rank][file];
        }
      }
      if (emptyCount > 0) {
        newBoardPart += emptyCount;
      }
      if (rank < 7) {
        newBoardPart += "/";
      }
    }

    // Update castling rights
    let newCastling = castling;
    if (turn === "w") {
      newCastling = newCastling.replace(/K/g, "").replace(/Q/g, "");
    } else {
      newCastling = newCastling.replace(/k/g, "").replace(/q/g, "");
    }

    // Update turn and move counters
    const newTurn = turn === "w" ? "b" : "w";
    const newHalfMoveClock = 0; // Castling resets half-move clock
    const newFullMoveNumber =
      turn === "b" ? fullMoveNumber + 1 : fullMoveNumber;

    const resultFEN = `${newBoardPart} ${newTurn} ${newCastling} ${enPassant} ${newHalfMoveClock} ${newFullMoveNumber}`;
    console.log("Castling result FEN:", resultFEN);
    return resultFEN;
  }

  private applyEnPassantMove(fen: string, move: ChessMove): string {
    console.log("Applying en passant move:", move);

    // Parse FEN
    const parts = fen.split(" ");
    const boardPart = parts[0];
    const turn = parts[1];
    const castling = parts[2];
    const enPassant = parts[3];
    const halfMoveClock = parseInt(parts[4]);
    const fullMoveNumber = parseInt(parts[5]);

    // Parse board
    const ranks = boardPart.split("/");
    const board: string[][] = [];

    for (let rank = 0; rank < 8; rank++) {
      board[rank] = [];
      let file = 0;
      for (let i = 0; i < ranks[rank].length; i++) {
        const char = ranks[rank][i];
        if (char >= "1" && char <= "8") {
          for (let j = 0; j < parseInt(char); j++) {
            board[rank][file] = "";
            file++;
          }
        } else {
          board[rank][file] = char;
          file++;
        }
      }
    }

    // Move pawn
    const [fromRank, fromFile] = this.squareToCoords(move.from);
    const [toRank, toFile] = this.squareToCoords(move.to);
    const piece = board[fromRank][fromFile];
    board[fromRank][fromFile] = "";
    board[toRank][toFile] = piece;

    // Remove captured pawn
    if (move.capturedSquare) {
      const [capturedRank, capturedFile] = this.squareToCoords(
        move.capturedSquare,
      );
      board[capturedRank][capturedFile] = "";
    }

    // Reconstruct FEN
    let newBoardPart = "";
    for (let rank = 0; rank < 8; rank++) {
      let emptyCount = 0;
      for (let file = 0; file < 8; file++) {
        if (board[rank][file] === "") {
          emptyCount++;
        } else {
          if (emptyCount > 0) {
            newBoardPart += emptyCount;
            emptyCount = 0;
          }
          newBoardPart += board[rank][file];
        }
      }
      if (emptyCount > 0) {
        newBoardPart += emptyCount;
      }
      if (rank < 7) {
        newBoardPart += "/";
      }
    }

    // Update turn and move counters
    const newTurn = turn === "w" ? "b" : "w";
    const newHalfMoveClock = 0; // En passant resets half-move clock
    const newFullMoveNumber =
      turn === "b" ? fullMoveNumber + 1 : fullMoveNumber;

    const resultFEN = `${newBoardPart} ${newTurn} ${castling} - ${newHalfMoveClock} ${newFullMoveNumber}`;
    console.log("En passant result FEN:", resultFEN);
    return resultFEN;
  }

  private squareToCoords(square: string): [number, number] {
    if (square.length !== 2) {
      console.error("Invalid square format:", square);
      return [0, 0];
    }

    const file = square.charCodeAt(0) - "a".charCodeAt(0);
    const rank = 8 - parseInt(square[1]);

    // Validate coordinates
    if (file < 0 || file >= 8 || rank < 0 || rank >= 8) {
      console.error("Invalid square coordinates:", square, { file, rank });
      return [0, 0];
    }

    return [rank, file];
  }

  private updateMoveList(): void {
    const movesPanel = document.getElementById("game-moves");
    if (!movesPanel) return;

    if (this.moves.length === 0) {
      movesPanel.innerHTML = "<p>No moves yet.</p>";
      return;
    }

    let html = "";
    for (let i = 0; i < this.moves.length; i += 2) {
      const moveNumber = Math.floor(i / 2) + 1;
      const whiteMove = this.moves[i];
      const blackMove = this.moves[i + 1];

      // Determine if this move entry should be highlighted
      const isCurrentWhiteMove = i === this.currentMoveIndex;
      const isCurrentBlackMove = i + 1 === this.currentMoveIndex;

      html += `<div class="move-entry">`;
      html += `<span class="move-number">${moveNumber}.</span>`;
      html += `<span class="move-text ${isCurrentWhiteMove ? "current-move" : ""}">`;
      html += this.formatMove(whiteMove);
      html += `</span>`;
      html += `<span class="move-text ${isCurrentBlackMove ? "current-move" : ""}">`;
      if (blackMove) {
        html += this.formatMove(blackMove);
      } else {
        html += `...`;
      }
      html += `</span>`;
      html += `</div>`;
    }

    movesPanel.innerHTML = html;
  }

  private formatMove(move: ChessMove): string {
    // Use the current notation and piece format settings
    const notationFormat =
      (
        document.querySelector(
          'input[name="notation-format"]:checked',
        ) as HTMLInputElement
      )?.value || "short";
    const pieceFormat =
      (
        document.querySelector(
          'input[name="piece-format"]:checked',
        ) as HTMLInputElement
      )?.value || "unicode";

    return moveToNotation(
      move,
      notationFormat as "short" | "long",
      pieceFormat as "unicode" | "english",
    );
  }

  private importGame(notation: string): void {
    console.log("Importing game:", notation);

    // Reset to standard initial position
    this.initialFEN =
      "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
    this.moves = [];
    this.currentMoveIndex = -1;

    // Parse the notation and add moves to the list
    const moves = this.parseGameNotation(notation);
    console.log("Parsed moves:", moves);

    for (const move of moves) {
      this.moves.push(move);
    }

    console.log("Total moves:", this.moves.length);
    console.log("Current move index:", this.currentMoveIndex);

    // Update the move list display but don't apply moves to board
    this.updateMoveList();
    this.updateNavigationButtons();

    // Keep the board at the initial position
    this.board.setPosition(this.initialFEN);

    console.log("Import complete. Board FEN:", this.board.getFEN());
  }

  private parseGameNotation(notation: string): ChessMove[] {
    const moves: ChessMove[] = [];

    // Remove comments and annotations
    let cleanNotation = notation
      .replace(/\{[^}]*\}/g, "") // Remove comments in braces
      .replace(/\([^)]*\)/g, "") // Remove annotations in parentheses
      .replace(/[!?]+/g, "") // Remove evaluation symbols
      .replace(/[+#]/g, "") // Remove check/checkmate symbols
      .replace(/=([QRBN])/g, "") // Remove promotion symbols
      .replace(/\$\d+/g, "") // Remove NAG symbols
      .replace(/[0-9]+\.\.\./g, "") // Remove move numbers with dots
      .replace(/[0-9]+\./g, "") // Remove move numbers
      .replace(/\s+/g, " ") // Normalize whitespace
      .trim();

    const tokens = cleanNotation.split(/\s+/);

    // Start with the initial board state
    this.board.setPosition(this.initialFEN);

    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i].trim();
      if (!token) continue;

      // Skip game result annotations
      if (/^(1-0|0-1|1\/2-1\/2|\*)$/.test(token)) continue;

      // Skip empty tokens
      if (token === "") continue;

      // Parse move with current board state
      const move = this.parseMove(token);
      if (move) {
        moves.push(move);
        // Apply the move to update the board state for the next move
        this.board.setPosition(this.applyMoveToFEN(this.board.getFEN(), move));
      } else {
        console.log("Could not parse move:", token);
      }
    }

    return moves;
  }

  private parseMove(moveText: string): ChessMove | null {
    // Remove any remaining check/checkmate symbols
    moveText = moveText.replace(/[+#]/, "");

    // Basic move patterns
    const patterns = [
      // Castling
      /^(O-O|O-O-O)$/,
      // Pawn moves: e4, e5, exd5, e8=Q
      /^([a-h])([1-8])(?:=([QRBN]))?$/,
      // Pawn captures: exd5, e8=Q
      /^([a-h])x([a-h][1-8])(?:=([QRBN]))?$/,
      // Piece moves: Nf3, Nxe4, Nbd7, Nf3e4
      /^([KQRBN])([a-h]?[1-8]?)(?:x([a-h][1-8]))?$/,
      // Piece moves with disambiguation: Nbd7, R1a3
      /^([KQRBN])([a-h1-8])([a-h][1-8])$/,
      // Piece captures with disambiguation: Ndxe4, R1xa3
      /^([KQRBN])([a-h1-8])x([a-h][1-8])$/,
    ];

    for (const pattern of patterns) {
      const match = moveText.match(pattern);
      if (match) {
        return this.convertNotationToMove(moveText);
      }
    }

    return null;
  }

  private convertNotationToMove(notation: string): ChessMove | null {
    // This is a simplified conversion - in a real implementation,
    // you'd need a proper chess library to convert notation to moves

    if (notation === "O-O" || notation === "O-O-O") {
      // Castling - need to determine which player's turn it is
      const currentFEN = this.board.getFEN();
      const isWhiteTurn = currentFEN.includes(" w ");
      const isKingside = notation === "O-O";

      if (isWhiteTurn) {
        if (isKingside) {
          return {
            from: "e1",
            to: "g1",
            piece: "K",
            special: "castling",
            rookFrom: "h1",
            rookTo: "f1",
          };
        } else {
          return {
            from: "e1",
            to: "c1",
            piece: "K",
            special: "castling",
            rookFrom: "a1",
            rookTo: "d1",
          };
        }
      } else {
        if (isKingside) {
          return {
            from: "e8",
            to: "g8",
            piece: "K",
            special: "castling",
            rookFrom: "h8",
            rookTo: "f8",
          };
        } else {
          return {
            from: "e8",
            to: "c8",
            piece: "K",
            special: "castling",
            rookFrom: "a8",
            rookTo: "d8",
          };
        }
      }
    }

    // Handle piece moves with disambiguation
    if (/^[KQRBN][a-h1-8][a-h][1-8]/.test(notation)) {
      const piece = notation[0];
      const disambiguation = notation[1];
      const toSquare = notation.slice(2);
      const fromSquare = this.findFromSquareWithDisambiguation(
        piece,
        toSquare,
        disambiguation,
      );

      if (fromSquare) {
        return { from: fromSquare, to: toSquare, piece };
      }
    }

    // Handle piece captures with disambiguation
    if (/^[KQRBN][a-h1-8]x[a-h][1-8]/.test(notation)) {
      const piece = notation[0];
      const disambiguation = notation[1];
      const toSquare = notation.slice(3);
      const fromSquare = this.findFromSquareWithDisambiguation(
        piece,
        toSquare,
        disambiguation,
      );

      if (fromSquare) {
        return { from: fromSquare, to: toSquare, piece };
      }
    }

    // Handle regular piece moves
    if (/^[KQRBN]/.test(notation)) {
      const piece = notation[0];
      let toSquare = "";

      // Extract destination square
      if (notation.includes("x")) {
        // Capture move
        toSquare = notation.split("x")[1];
      } else {
        // Regular move
        toSquare = notation.slice(1);
      }

      // Use the new findFromSquare logic with the current board state
      const fromSquare = this.findFromSquare(piece, toSquare);

      console.log(
        "Converting notation:",
        notation,
        "piece:",
        piece,
        "toSquare:",
        toSquare,
        "fromSquare:",
        fromSquare,
      );

      if (fromSquare && toSquare) {
        const move = { from: fromSquare, to: toSquare, piece };
        console.log("Created move:", move);
        return move;
      }
    } else {
      // Pawn move
      let toSquare = "";
      let fromSquare = "";

      if (notation.includes("x")) {
        // Pawn capture
        const parts = notation.split("x");
        const fromFile = parts[0];
        toSquare = parts[1];

        // Check if this is an en passant capture
        const currentFEN = this.board.getFEN();
        const enPassantSquare = currentFEN.split(" ")[3];

        if (enPassantSquare !== "-" && toSquare === enPassantSquare) {
          // This is an en passant capture
          const toRank = parseInt(toSquare[1]);
          const fromRank = toRank > 4 ? toRank - 1 : toRank + 1;
          fromSquare = `${fromFile}${fromRank}`;

          // Determine the captured pawn's square
          const capturedRank = toRank > 4 ? toRank - 1 : toRank + 1;
          const capturedSquare = `${toSquare[0]}${capturedRank}`;

          return {
            from: fromSquare,
            to: toSquare,
            piece: "P",
            special: "en-passant",
            capturedSquare: capturedSquare,
          };
        } else {
          // Regular pawn capture
          // Use the new findFromSquare logic to determine which pawn can capture to the destination
          const foundFromSquare = this.findFromSquare("P", toSquare);
          if (foundFromSquare) {
            fromSquare = foundFromSquare;
          } else {
            // Fallback to simple heuristics if no pawn found
            const toRank = parseInt(toSquare[1]);
            const fromRank = toRank > 4 ? toRank - 1 : toRank + 1;
            fromSquare = `${fromFile}${fromRank}`;
          }
        }
      } else {
        // Regular pawn move
        toSquare = notation;

        // Use the new findFromSquare logic to determine which pawn can move to the destination
        const foundFromSquare = this.findFromSquare("P", toSquare);
        if (foundFromSquare) {
          fromSquare = foundFromSquare;
        }
      }

      if (fromSquare && toSquare) {
        return { from: fromSquare, to: toSquare, piece: "P" };
      }
    }

    return null;
  }

  private findFromSquareWithDisambiguation(
    piece: string,
    toSquare: string,
    disambiguation: string,
  ): string | null {
    // This is a simplified implementation for disambiguation
    // In a real chess application, you'd need to analyze the current board

    if (/^[a-h]$/.test(disambiguation)) {
      // File disambiguation (e.g., Nbd7)
      const file = disambiguation;
      const rank = toSquare[1] === "1" ? "1" : "8";
      return `${file}${rank}`;
    } else if (/^[1-8]$/.test(disambiguation)) {
      // Rank disambiguation (e.g., R1a3)
      const rank = disambiguation;
      const file = toSquare[0] === "a" ? "a" : "h";
      return `${file}${rank}`;
    }

    return this.findFromSquare(piece, toSquare);
  }

  private findFromSquare(piece: string, toSquare: string): string | null {
    // Get the current board state to analyze which piece can move to the destination
    const currentFEN = this.board.getFEN();
    const board = this.parseFENBoard(currentFEN);

    const toRank = 8 - parseInt(toSquare[1]);
    const toFile = toSquare.charCodeAt(0) - "a".charCodeAt(0);

    // Find all pieces of the correct type that can move to the destination
    const validMoves: string[] = [];

    console.log("Finding moves for piece", piece, "to", toSquare);
    console.log("Current board state:", currentFEN);

    for (let rank = 0; rank < 8; rank++) {
      for (let file = 0; file < 8; file++) {
        const squarePiece = board[rank][file];
        if (squarePiece === piece || squarePiece === piece.toLowerCase()) {
          // Found a piece of the right type, check if it can move to the destination
          const fromSquare =
            String.fromCharCode("a".charCodeAt(0) + file) + (8 - rank);
          console.log("Found piece", squarePiece, "at", fromSquare);
          if (this.canPieceMoveTo(fromSquare, toSquare, piece, board)) {
            console.log("Piece at", fromSquare, "can move to", toSquare);
            validMoves.push(fromSquare);
          } else {
            console.log("Piece at", fromSquare, "cannot move to", toSquare);
          }
        }
      }
    }

    console.log("Valid moves found:", validMoves);

    // If only one valid move, use it
    if (validMoves.length === 1) {
      return validMoves[0];
    }

    // If multiple valid moves, use chess logic to determine the correct one
    if (validMoves.length > 1) {
      return this.selectCorrectMove(validMoves, toSquare, piece, board);
    }

    // Fallback to simple heuristics if no legal move found
    return this.findFromSquareFallback(piece, toSquare);
  }

  private selectCorrectMove(
    validMoves: string[],
    toSquare: string,
    piece: string,
    board: string[][],
  ): string {
    // For pieces that can be duplicated (bishops, knights, rooks), use chess logic
    const pieceType = piece.toUpperCase();

    if (pieceType === "B") {
      return this.selectCorrectBishop(validMoves, toSquare, board);
    } else if (pieceType === "N") {
      return this.selectCorrectKnight(validMoves, toSquare, board);
    } else if (pieceType === "R") {
      return this.selectCorrectRook(validMoves, toSquare, board);
    } else if (pieceType === "P") {
      return this.selectCorrectPawn(validMoves, toSquare, board);
    }

    // For unique pieces (king, queen), return the first valid move
    return validMoves[0];
  }

  private selectCorrectBishop(
    validMoves: string[],
    toSquare: string,
    board: string[][],
  ): string {
    // For bishops, prefer the one that's on the same diagonal as the destination
    const toRank = 8 - parseInt(toSquare[1]);
    const toFile = toSquare.charCodeAt(0) - "a".charCodeAt(0);

    console.log(
      "Selecting correct bishop for",
      toSquare,
      "valid moves:",
      validMoves,
    );

    for (const fromSquare of validMoves) {
      const fromRank = 8 - parseInt(fromSquare[1]);
      const fromFile = fromSquare.charCodeAt(0) - "a".charCodeAt(0);

      console.log(
        "Checking bishop at",
        fromSquare,
        "fromRank:",
        fromRank,
        "fromFile:",
        fromFile,
        "toRank:",
        toRank,
        "toFile:",
        toFile,
      );

      // Check if this bishop is on the same diagonal as the destination
      if (Math.abs(fromRank - toRank) === Math.abs(fromFile - toFile)) {
        console.log("Found bishop on same diagonal:", fromSquare);
        return fromSquare;
      }
    }

    console.log(
      "No bishop on same diagonal, using first valid move:",
      validMoves[0],
    );
    // If no clear diagonal match, return the first valid move
    return validMoves[0];
  }

  private selectCorrectKnight(
    validMoves: string[],
    toSquare: string,
    board: string[][],
  ): string {
    // For knights, prefer the one that's closer to the destination
    const toRank = 8 - parseInt(toSquare[1]);
    const toFile = toSquare.charCodeAt(0) - "a".charCodeAt(0);

    let bestMove = validMoves[0];
    let bestDistance = Infinity;

    for (const fromSquare of validMoves) {
      const fromRank = 8 - parseInt(fromSquare[1]);
      const fromFile = fromSquare.charCodeAt(0) - "a".charCodeAt(0);

      const distance =
        Math.abs(fromRank - toRank) + Math.abs(fromFile - toFile);
      if (distance < bestDistance) {
        bestDistance = distance;
        bestMove = fromSquare;
      }
    }

    return bestMove;
  }

  private selectCorrectRook(
    validMoves: string[],
    toSquare: string,
    board: string[][],
  ): string {
    // For rooks, prefer the one that's on the same rank or file as the destination
    const toRank = 8 - parseInt(toSquare[1]);
    const toFile = toSquare.charCodeAt(0) - "a".charCodeAt(0);

    for (const fromSquare of validMoves) {
      const fromRank = 8 - parseInt(fromSquare[1]);
      const fromFile = fromSquare.charCodeAt(0) - "a".charCodeAt(0);

      // Check if this rook is on the same rank or file as the destination
      if (fromRank === toRank || fromFile === toFile) {
        return fromSquare;
      }
    }

    // If no clear rank/file match, return the first valid move
    return validMoves[0];
  }

  private selectCorrectPawn(
    validMoves: string[],
    toSquare: string,
    board: string[][],
  ): string {
    // For pawns, prefer the one that's on the same file as the destination
    const toFile = toSquare.charCodeAt(0);

    for (const fromSquare of validMoves) {
      const fromFile = fromSquare.charCodeAt(0);

      // Check if this pawn is on the same file as the destination
      if (fromFile === toFile) {
        return fromSquare;
      }
    }

    // If no clear file match, return the first valid move
    return validMoves[0];
  }

  private parseFENBoard(fen: string): string[][] {
    const parts = fen.split(" ");
    const boardPart = parts[0];
    const ranks = boardPart.split("/");
    const board: string[][] = [];

    for (let rank = 0; rank < 8; rank++) {
      board[rank] = [];
      let file = 0;
      for (let i = 0; i < ranks[rank].length; i++) {
        const char = ranks[rank][i];
        if (char >= "1" && char <= "8") {
          // Empty squares
          for (let j = 0; j < parseInt(char); j++) {
            board[rank][file] = "";
            file++;
          }
        } else {
          // Piece
          board[rank][file] = char;
          file++;
        }
      }
    }

    return board;
  }

  private canPieceMoveTo(
    fromSquare: string,
    toSquare: string,
    piece: string,
    board: string[][],
  ): boolean {
    // Simplified move validation - in a real implementation you'd need full chess rules
    const fromRank = 8 - parseInt(fromSquare[1]);
    const fromFile = fromSquare.charCodeAt(0) - "a".charCodeAt(0);
    const toRank = 8 - parseInt(toSquare[1]);
    const toFile = toSquare.charCodeAt(0) - "a".charCodeAt(0);

    const pieceAtFrom = board[fromRank][fromFile];
    const pieceAtTo = board[toRank][toFile];

    // Check if the piece at from square matches the expected piece type
    if (pieceAtFrom !== piece && pieceAtFrom !== piece.toLowerCase()) {
      return false;
    }

    // Check if destination is occupied by same color piece
    if (pieceAtTo !== "") {
      const fromIsWhite = pieceAtFrom === pieceAtFrom.toUpperCase();
      const toIsWhite = pieceAtTo === pieceAtTo.toUpperCase();
      if (fromIsWhite === toIsWhite) {
        return false; // Can't capture own piece
      }
    }

    // Basic move validation based on piece type
    switch (piece.toUpperCase()) {
      case "P": // Pawn
        return this.canPawnMoveTo(fromSquare, toSquare, board);
      case "R": // Rook
        return this.canRookMoveTo(fromSquare, toSquare, board);
      case "N": // Knight
        return this.canKnightMoveTo(fromSquare, toSquare, board);
      case "B": // Bishop
        return this.canBishopMoveTo(fromSquare, toSquare, board);
      case "Q": // Queen
        return this.canQueenMoveTo(fromSquare, toSquare, board);
      case "K": // King
        return this.canKingMoveTo(fromSquare, toSquare, board);
      default:
        return false;
    }
  }

  private canPawnMoveTo(
    fromSquare: string,
    toSquare: string,
    board: string[][],
  ): boolean {
    const fromRank = 8 - parseInt(fromSquare[1]);
    const fromFile = fromSquare.charCodeAt(0) - "a".charCodeAt(0);
    const toRank = 8 - parseInt(toSquare[1]);
    const toFile = toSquare.charCodeAt(0) - "a".charCodeAt(0);

    const piece = board[fromRank][fromFile];
    const isWhite = piece === piece.toUpperCase();

    // Simplified pawn move validation
    const direction = isWhite ? -1 : 1;
    const startRank = isWhite ? 6 : 1;

    // Forward move
    if (fromFile === toFile && toRank === fromRank + direction) {
      return board[toRank][toFile] === "";
    }

    // Double move from starting position
    if (
      fromFile === toFile &&
      fromRank === startRank &&
      toRank === fromRank + 2 * direction
    ) {
      return (
        board[fromRank + direction][fromFile] === "" &&
        board[toRank][toFile] === ""
      );
    }

    // Capture move
    if (Math.abs(fromFile - toFile) === 1 && toRank === fromRank + direction) {
      return board[toRank][toFile] !== "";
    }

    return false;
  }

  private canRookMoveTo(
    fromSquare: string,
    toSquare: string,
    board: string[][],
  ): boolean {
    const fromRank = 8 - parseInt(fromSquare[1]);
    const fromFile = fromSquare.charCodeAt(0) - "a".charCodeAt(0);
    const toRank = 8 - parseInt(toSquare[1]);
    const toFile = toSquare.charCodeAt(0) - "a".charCodeAt(0);

    // Rook moves horizontally or vertically
    if (fromRank !== toRank && fromFile !== toFile) {
      return false;
    }

    // Check if path is clear
    if (fromRank === toRank) {
      // Horizontal move
      const start = Math.min(fromFile, toFile);
      const end = Math.max(fromFile, toFile);
      for (let file = start + 1; file < end; file++) {
        if (board[fromRank][file] !== "") {
          return false; // Path is blocked
        }
      }
    } else {
      // Vertical move
      const start = Math.min(fromRank, toRank);
      const end = Math.max(fromRank, toRank);
      for (let rank = start + 1; rank < end; rank++) {
        if (board[rank][fromFile] !== "") {
          return false; // Path is blocked
        }
      }
    }

    return true;
  }

  private canKnightMoveTo(
    fromSquare: string,
    toSquare: string,
    board: string[][],
  ): boolean {
    const fromRank = 8 - parseInt(fromSquare[1]);
    const fromFile = fromSquare.charCodeAt(0) - "a".charCodeAt(0);
    const toRank = 8 - parseInt(toSquare[1]);
    const toFile = toSquare.charCodeAt(0) - "a".charCodeAt(0);

    const rankDiff = Math.abs(fromRank - toRank);
    const fileDiff = Math.abs(fromFile - toFile);

    // Knight moves in L-shape: 2 squares in one direction, 1 square perpendicular
    // Knights can jump over pieces, so no path checking needed
    return (
      (rankDiff === 2 && fileDiff === 1) || (rankDiff === 1 && fileDiff === 2)
    );
  }

  private canBishopMoveTo(
    fromSquare: string,
    toSquare: string,
    board: string[][],
  ): boolean {
    const fromRank = 8 - parseInt(fromSquare[1]);
    const fromFile = fromSquare.charCodeAt(0) - "a".charCodeAt(0);
    const toRank = 8 - parseInt(toSquare[1]);
    const toFile = toSquare.charCodeAt(0) - "a".charCodeAt(0);

    // Bishop moves diagonally
    if (Math.abs(fromRank - toRank) !== Math.abs(fromFile - toFile)) {
      return false;
    }

    // Check if path is clear
    const rankStep = fromRank < toRank ? 1 : -1;
    const fileStep = fromFile < toFile ? 1 : -1;
    let rank = fromRank + rankStep;
    let file = fromFile + fileStep;

    while (rank !== toRank || file !== toFile) {
      if (board[rank][file] !== "") {
        return false; // Path is blocked
      }
      rank += rankStep;
      file += fileStep;
    }

    return true;
  }

  private canQueenMoveTo(
    fromSquare: string,
    toSquare: string,
    board: string[][],
  ): boolean {
    // Queen can move like a rook or bishop
    return (
      this.canRookMoveTo(fromSquare, toSquare, board) ||
      this.canBishopMoveTo(fromSquare, toSquare, board)
    );
  }

  private canKingMoveTo(
    fromSquare: string,
    toSquare: string,
    board: string[][],
  ): boolean {
    const fromRank = 8 - parseInt(fromSquare[1]);
    const fromFile = fromSquare.charCodeAt(0) - "a".charCodeAt(0);
    const toRank = 8 - parseInt(toSquare[1]);
    const toFile = toSquare.charCodeAt(0) - "a".charCodeAt(0);

    // King moves one square in any direction
    return Math.abs(fromRank - toRank) <= 1 && Math.abs(fromFile - toFile) <= 1;
  }

  private findFromSquareFallback(
    piece: string,
    toSquare: string,
  ): string | null {
    // Fallback to simple heuristics if no legal move found
    if (piece === "K") {
      return toSquare[1] === "1" ? "e1" : "e8";
    } else if (piece === "Q") {
      return toSquare[1] === "1" ? "d1" : "d8";
    } else if (piece === "R") {
      return toSquare[0] === "a"
        ? toSquare[1] === "1"
          ? "a1"
          : "a8"
        : toSquare[1] === "1"
          ? "h1"
          : "h8";
    } else if (piece === "B") {
      const rank = parseInt(toSquare[1]);
      if (rank <= 4) {
        return toSquare[0] === "c" ? "c1" : "f1";
      } else {
        return toSquare[0] === "c" ? "c8" : "f8";
      }
    } else if (piece === "N") {
      const rank = parseInt(toSquare[1]);
      if (rank <= 4) {
        return toSquare[0] === "b" ? "b1" : "g1";
      } else {
        return toSquare[0] === "b" ? "b8" : "g8";
      }
    } else if (piece === "P") {
      const file = toSquare[0];
      const rank = parseInt(toSquare[1]);
      if (rank === 4) {
        return `${file}2`;
      } else if (rank === 5) {
        return `${file}7`;
      } else if (rank === 6) {
        return `${file}5`;
      } else if (rank === 3) {
        return `${file}7`;
      } else {
        const fromRank = rank > 4 ? rank - 1 : rank + 1;
        return `${file}${fromRank}`;
      }
    }

    return null;
  }

  private previousMove(): void {
    console.log("Previous move clicked. Current index:", this.currentMoveIndex);
    if (this.currentMoveIndex > 0) {
      this.currentMoveIndex--;
      console.log("Will apply moves up to index:", this.currentMoveIndex);
      this.applyMovesUpToIndex(this.currentMoveIndex);
      this.updateNavigationButtons();
      this.updateMoveList(); // Update the move list to show current move
      console.log("Applied moves up to index:", this.currentMoveIndex);
    }
  }

  private nextMove(): void {
    console.log("Next move clicked. Current index:", this.currentMoveIndex);
    if (this.currentMoveIndex < this.moves.length - 1) {
      this.currentMoveIndex++;
      console.log(
        "Will apply move at index:",
        this.currentMoveIndex,
        "Move:",
        this.moves[this.currentMoveIndex],
      );
      this.applyMovesUpToIndex(this.currentMoveIndex);
      this.updateNavigationButtons();
      this.updateMoveList(); // Update the move list to show current move
      console.log("Applied moves up to index:", this.currentMoveIndex);
    }
  }

  private applyMovesUpToIndex(index: number): void {
    console.log("applyMovesUpToIndex called with index:", index);

    // Reset to initial position
    this.board.setPosition(this.initialFEN);
    console.log("Reset board to initial FEN:", this.initialFEN);

    // Apply moves up to the specified index
    for (let i = 0; i <= index; i++) {
      const move = this.moves[i];
      if (move) {
        console.log(`Applying move ${i}:`, move);
        console.log("Board state before move:", this.board.getFEN());

        // Apply the move to the board
        const currentFEN = this.board.getFEN();
        console.log("Current FEN before move:", currentFEN);

        const newFEN = this.applyMoveToFEN(currentFEN, move);
        console.log("New FEN after move:", newFEN);

        this.board.setPosition(newFEN);
        console.log("Board FEN after setPosition:", this.board.getFEN());
      }
    }

    // Highlight the last move if there are moves
    if (index >= 0 && this.moves[index]) {
      this.highlightLastMove(this.moves[index]);
    } else {
      this.clearLastMoveHighlight();
    }

    console.log("Final board FEN:", this.board.getFEN());
  }

  private highlightLastMove(move: ChessMove): void {
    // Clear any existing highlights
    this.clearLastMoveHighlight();

    // Add highlight class to from and to squares
    const fromSquare = document.querySelector(`[data-square="${move.from}"]`);
    const toSquare = document.querySelector(`[data-square="${move.to}"]`);

    if (fromSquare) {
      fromSquare.classList.add("last-move-from");
    }
    if (toSquare) {
      toSquare.classList.add("last-move-to");
    }
  }

  private clearLastMoveHighlight(): void {
    // Remove highlight classes from all squares
    this.board.clearLastMoveHighlight();
  }

  private updateNavigationButtons(): void {
    const prevBtn = document.getElementById("prev-move") as HTMLButtonElement;
    const nextBtn = document.getElementById("next-move") as HTMLButtonElement;

    console.log(
      "Updating navigation buttons. Current index:",
      this.currentMoveIndex,
      "Total moves:",
      this.moves.length,
    );

    if (prevBtn) {
      prevBtn.disabled = this.currentMoveIndex <= 0;
      console.log("Previous button disabled:", prevBtn.disabled);
    }

    if (nextBtn) {
      nextBtn.disabled = this.currentMoveIndex >= this.moves.length - 1;
      console.log("Next button disabled:", nextBtn.disabled);
    }
  }

  private initializePositionControls(): void {
    // Current player radio buttons
    const playerRadios = document.querySelectorAll(
      'input[name="current-player"]',
    ) as NodeListOf<HTMLInputElement>;
    playerRadios.forEach((radio) => {
      radio.addEventListener("change", () => {
        this.updatePositionFromControls();
      });
    });

    // Castling rights checkboxes
    const castlingCheckboxes = [
      "white-kingside",
      "white-queenside",
      "black-kingside",
      "black-queenside",
    ];
    castlingCheckboxes.forEach((id) => {
      const checkbox = document.getElementById(id) as HTMLInputElement;
      if (checkbox) {
        checkbox.addEventListener("change", () => {
          this.updatePositionFromControls();
        });
      }
    });

    // En passant input
    const enPassantInput = document.getElementById(
      "en-passant",
    ) as HTMLInputElement;
    if (enPassantInput) {
      enPassantInput.addEventListener("input", () => {
        this.updatePositionFromControls();
      });
    }
  }

  private updatePositionFromControls(): void {
    const currentPlayer =
      (
        document.querySelector(
          'input[name="current-player"]:checked',
        ) as HTMLInputElement
      )?.value || "w";
    const whiteKingside =
      (document.getElementById("white-kingside") as HTMLInputElement)
        ?.checked || false;
    const whiteQueenside =
      (document.getElementById("white-queenside") as HTMLInputElement)
        ?.checked || false;
    const blackKingside =
      (document.getElementById("black-kingside") as HTMLInputElement)
        ?.checked || false;
    const blackQueenside =
      (document.getElementById("black-queenside") as HTMLInputElement)
        ?.checked || false;
    const enPassant =
      (document.getElementById("en-passant") as HTMLInputElement)?.value || "-";

    // Build castling rights string
    let castling = "";
    if (whiteKingside) castling += "K";
    if (whiteQueenside) castling += "Q";
    if (blackKingside) castling += "k";
    if (blackQueenside) castling += "q";
    if (castling === "") castling = "-";

    // Get current board position
    const currentFEN = this.board.getFEN();
    const fenParts = currentFEN.split(" ");

    // Update FEN parts
    fenParts[1] = currentPlayer; // Turn
    fenParts[2] = castling; // Castling rights
    fenParts[3] = enPassant; // En passant square

    // Reconstruct FEN
    const newFEN = fenParts.join(" ");

    // Update initial FEN and clear moves
    this.initialFEN = newFEN;
    this.moves = [];

    // Update board
    this.board.setPosition(newFEN);
    this.updateMoveList();
  }

  private updateControlsFromPosition(): void {
    const fen = this.board.getFEN();
    const fenParts = fen.split(" ");

    if (fenParts.length >= 4) {
      // Update current player
      const currentPlayer = fenParts[1];
      const playerRadio = document.querySelector(
        `input[name="current-player"][value="${currentPlayer}"]`,
      ) as HTMLInputElement;
      if (playerRadio) {
        playerRadio.checked = true;
      }

      // Update castling rights
      const castling = fenParts[2];
      const whiteKingside = document.getElementById(
        "white-kingside",
      ) as HTMLInputElement;
      const whiteQueenside = document.getElementById(
        "white-queenside",
      ) as HTMLInputElement;
      const blackKingside = document.getElementById(
        "black-kingside",
      ) as HTMLInputElement;
      const blackQueenside = document.getElementById(
        "black-queenside",
      ) as HTMLInputElement;

      if (whiteKingside) whiteKingside.checked = castling.includes("K");
      if (whiteQueenside) whiteQueenside.checked = castling.includes("Q");
      if (blackKingside) blackKingside.checked = castling.includes("k");
      if (blackQueenside) blackQueenside.checked = castling.includes("q");

      // Update en passant
      const enPassant = fenParts[3];
      const enPassantInput = document.getElementById(
        "en-passant",
      ) as HTMLInputElement;
      if (enPassantInput) {
        enPassantInput.value = enPassant;
      }
    }
  }
}

// Initialize the app when the DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
  new ChessAnalysisApp();
});
