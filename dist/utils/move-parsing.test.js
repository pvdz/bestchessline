import { parseMove } from "./move-parsing.js";
// Test the specific failing case
const testCases = [
    {
        name: "g3 pawn move from black's perspective",
        fen: "rnbqkbnr/ppp1pppp/8/3p4/8/8/PPPPPPPP/RNBQKBNR b KQkq d6 0 1",
        move: "g3",
        expected: {
            from: "g2",
            to: "g3",
            piece: "P", // White pawn
        },
    },
    {
        name: "g3 pawn move from white's perspective",
        fen: "rnbqkbnr/ppp1pppp/8/3p4/8/8/PPPPPPPP/RNBQKBNR w KQkq d6 0 1",
        move: "g3",
        expected: {
            from: "g2",
            to: "g3",
            piece: "P", // White pawn
        },
    },
    {
        name: "Basic pawn move e4",
        fen: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
        move: "e4",
        expected: {
            from: "e2",
            to: "e4",
            piece: "P", // White pawn
        },
    },
    {
        name: "Basic knight move Nf3",
        fen: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
        move: "Nf3",
        expected: {
            from: "g1",
            to: "f3",
            piece: "N", // White knight
        },
    },
    {
        name: "Black pawn capture dxc4",
        fen: "rnbqkb1r/pppppppp/5n2/3P4/2P5/5N2/PP2PPPP/RNBQKB1R b KQkq c3 0 1",
        move: "dxc4",
        expected: {
            from: "d7",
            to: "c4",
            piece: "p", // Black pawn
        },
    },
    // Add the failing Kg1 test cases
    {
        name: "Kg1 move from FEN 1",
        fen: "rnbqkb1r/1p3ppp/p1pppn2/8/2PP4/5NP1/PP2PPBP/RNBQK2R w KQkq - 0 1",
        move: "Kg1",
        expected: {
            from: "e1",
            to: "g1",
            piece: "K", // White king
        },
    },
    {
        name: "Kg1 move from FEN 2",
        fen: "rnb1kb1r/1pq1pppp/p1pp1n2/8/2PP4/5NP1/PP2PPBP/RNBQK2R w KQkq - 0 1",
        move: "Kg1",
        expected: {
            from: "e1",
            to: "g1",
            piece: "K", // White king
        },
    },
    {
        name: "Kg1 move from FEN 3",
        fen: "rn1qkb1r/1p2pppp/p1pp1n2/8/2PP2b1/5NP1/PP2PPBP/RNBQK2R w KQkq - 0 1",
        move: "Kg1",
        expected: {
            from: "e1",
            to: "g1",
            piece: "K", // White king
        },
    },
    {
        name: "Nc3 move from FEN",
        fen: "rnb1kb1r/1pq1pppp/p2p1n2/2p5/2P5/5NP1/PP1PPPBP/RNBQK2R b KQkq - 0 1",
        move: "Nc3",
        expected: {
            from: "b1",
            to: "c3",
            piece: "N", // White knight
        },
    },
    {
        name: "Nc6 move from FEN",
        fen: "rnbqkb1r/1p1p1ppp/p3pn2/2p5/2P5/5NP1/PP1PPPBP/RNBQK2R w KQkq - 0 1",
        move: "Nc6",
        expected: {
            from: "b8",
            to: "c6",
            piece: "n", // Black knight
        },
    },
    {
        name: "Qc7 move from FEN",
        fen: "rnbqkb1r/1p1p1ppp/p3pn2/2p5/2P5/5NP1/PP1PPPBP/RNBQK2R w KQkq - 0 1",
        move: "Qc7",
        expected: {
            from: "d8",
            to: "c7",
            piece: "q", // Black queen
        },
    },
    {
        name: "Be7 move from FEN",
        fen: "rnbqkb1r/1p1p1ppp/p3pn2/2p5/2P5/5NP1/PP1PPPBP/RNBQK2R w KQkq - 0 1",
        move: "Be7",
        expected: {
            from: "f8",
            to: "e7",
            piece: "b", // Black bishop
        },
    },
    {
        name: "Pa7a6 move from FEN",
        fen: "rnbqkbnr/pppppppp/8/8/8/5N2/PPPPPPPP/RNBQKB1R b KQkq - 0 1",
        move: "Pa7a6",
        expected: {
            from: "a7",
            to: "a6",
            piece: "p", // Black pawn
        },
    },
    // Add more long algebraic notation test cases
    {
        name: "Qd8a5 move from FEN",
        fen: "rnbqkb1r/ppp1pp1p/3p1np1/2P5/3P4/5NP1/PP2PPBP/RNBQK2R b KQkq - 0 1",
        move: "Qd8a5",
        expected: {
            from: "d8",
            to: "a5",
            piece: "q", // Black queen
        },
    },
    // {
    //   name: "Pe4c5 move from FEN",
    //   fen: "r1b1kbnr/pp2pppp/2np4/q1pP4/8/2N2NP1/PPP1PPBP/R1BQK2R w KQkq - 0 1",
    //   move: "Pe4c5",
    //   expected: {
    //     from: "e4",
    //     to: "c5",
    //     piece: "P", // White pawn
    //   },
    // },
    {
        name: "Pc5d4 move from FEN",
        fen: "r1bqkbnr/pp2pppp/2np4/2pP4/2P5/5NP1/PP2PPBP/RNBQK2R b KQkq c3 0 1",
        move: "Pc5d4",
        expected: {
            from: "c5",
            to: "d4",
            piece: "p", // Black pawn
        },
    },
    {
        name: "Bf8d6 move from FEN",
        fen: "r1bqkbnr/ppp2ppp/2npp3/3P4/8/2P2NP1/PP2PPBP/RNBQK2R b KQkq - 0 1",
        move: "Bf8d6",
        expected: {
            from: "f8",
            to: "d6",
            piece: "b", // Black bishop
        },
    },
    {
        name: "Ne5d7 move from FEN 1",
        fen: "r2qkb1r/pppbpppp/3p1n2/3Pn3/8/6P1/PPP1PP1P/RNBQKB1R w KQkq - 0 1",
        move: "Ne5d7",
        expected: {
            from: "e5",
            to: "d7",
            piece: "n", // Black knight (lowercase)
        },
    },
    {
        name: "Ne5d7 move from FEN 2",
        fen: "r2qkbnr/pppbpp1p/3p2p1/3Pn3/8/6P1/PPP1PP1P/RNBQKB1R w KQkq - 0 1",
        move: "Ne5d7",
        expected: {
            from: "e5",
            to: "d7",
            piece: "n", // Black knight (lowercase)
        },
    },
    {
        name: "Pd6e5 move from FEN",
        fen: "r2qkbnr/pppbpppp/3p4/3Pn3/8/6P1/PPP1PP1P/RNBQKB1R b KQkq - 0 1",
        move: "Pd6e5",
        expected: {
            from: "d6",
            to: "e5",
            piece: "p", // Black pawn
        },
    },
    {
        name: "Nc6e5 move from FEN",
        fen: "r1bqkbnr/ppp2ppp/2np4/3Pp1N1/4P3/6P1/PPP2P1P/RNBQKB1R b KQkq - 0 1",
        move: "Nc6e5",
        expected: {
            from: "c6",
            to: "e5",
            piece: "n", // Black knight
        },
    },
    {
        name: "Qd8d7 move from FEN",
        fen: "1rbqkbnr/pppp1ppp/2n1p3/3PP3/8/5NP1/PPP2P1P/RNBQKB1R b KQ - 0 1",
        move: "Qd8d7",
        expected: {
            from: "d8",
            to: "d7",
            piece: "q", // Black queen
        },
    },
    {
        name: "Bc8f5 move from FEN 1",
        fen: "1rbqkbnr/pppppppp/2n5/3P4/8/5NP1/PPP1PPBP/RNBQK2R b KQ - 0 1",
        move: "Bc8f5",
        expected: {
            from: "c8",
            to: "f5",
            piece: "b", // Black bishop
        },
    },
    {
        name: "Bc8e6 move from FEN 1",
        fen: "1rbqkbnr/pppppp1p/2n3p1/3P4/2P5/5NP1/PP2PPBP/RNBQK2R b KQ c3 0 1",
        move: "Bc8e6",
        expected: {
            from: "c8",
            to: "e6",
            piece: "b", // Black bishop
        },
    },
    {
        name: "Bc8g4 move from FEN 1",
        fen: "1rbqkbnr/pppppp1p/2n3p1/3P4/2P5/5NP1/PP2PPBP/RNBQK2R b KQ c3 0 1",
        move: "Bc8g4",
        expected: {
            from: "c8",
            to: "g4",
            piece: "b", // Black bishop
        },
    },
    {
        name: "Bc8g4 move from FEN 2",
        fen: "1rbqkbnr/ppppppp1/2n4p/3P4/2P5/5NP1/PP2PPBP/RNBQK2R b KQ c3 0 1",
        move: "Bc8g4",
        expected: {
            from: "c8",
            to: "g4",
            piece: "b", // Black bishop
        },
    },
    {
        name: "Bc8e6 move from FEN 2",
        fen: "1rbqkbnr/ppppppp1/2n4p/3P4/2P5/5NP1/PP2PPBP/RNBQK2R b KQ c3 0 1",
        move: "Bc8e6",
        expected: {
            from: "c8",
            to: "e6",
            piece: "b", // Black bishop
        },
    },
    {
        name: "Bc8f5 move from FEN 2",
        fen: "1rbqkb1r/pppppppp/2n2n2/3P4/8/5NP1/PPP1PPBP/RNBQ2KR b k - 0 1",
        move: "Bc8f5",
        expected: {
            from: "c8",
            to: "f5",
            piece: "b", // Black bishop
        },
    },
];
function runTest(testCase) {
    console.log(`\n=== Testing: ${testCase.name} ===`);
    console.log(`Move: ${testCase.move}`);
    console.log(`FEN: ${testCase.fen}`);
    const result = parseMove(testCase.move, testCase.fen);
    if (!result) {
        console.log("❌ FAIL: parseMove returned null");
        return false;
    }
    console.log(`Parsed result: ${result.from} → ${result.to} (${result.piece})`);
    const isSuccess = result.from === testCase.expected.from &&
        result.to === testCase.expected.to &&
        result.piece === testCase.expected.piece;
    if (isSuccess) {
        console.log("✅ PASS");
    }
    else {
        console.log("❌ FAIL");
        console.log(`Expected: ${testCase.expected.from} → ${testCase.expected.to} (${testCase.expected.piece})`);
    }
    return isSuccess;
}
function runAllTests() {
    console.log("Running parseMove tests...\n");
    let passed = 0;
    let failed = 0;
    for (const testCase of testCases) {
        const success = runTest(testCase);
        if (success) {
            passed++;
        }
        else {
            failed++;
        }
    }
    console.log(`\n=== Test Results ===`);
    console.log(`Passed: ${passed}`);
    console.log(`Failed: ${failed}`);
    console.log(`Total: ${passed + failed}`);
    if (failed > 0) {
        console.error("Some tests failed!");
        // @ts-ignore
        process.exitCode = 1;
    }
}
runAllTests();
//# sourceMappingURL=move-parsing.test.js.map