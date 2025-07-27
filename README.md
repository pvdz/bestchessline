# Chess Moves Coach

A comprehensive web-based chess analysis application with interactive board, Stockfish integration, and game management features. Built with functional TypeScript architecture for maintainability and clean code.

## Features

### 🎯 Core Analysis
- **Interactive Chess Board**: Drag and drop pieces with visual feedback and move arrows
- **Stockfish Integration**: Multi-threaded analysis using Stockfish 16.0.0 WebAssembly
- **Real-time Results**: Live analysis with scores, depths, and principal variations
- **Configurable Analysis**: Set depth, move count, threads, and engine options

### 🎮 Game Management
- **Game Import**: Import games using PGN-like notation with comments and annotations
- **Move Navigation**: Previous/Next buttons with move highlighting and state management
- **Game History**: Complete move list with proper formatting and current move indication
- **Position Controls**: FEN input, current player, castling rights, and en passant

### 🎨 User Experience
- **Format Controls**: Dynamic notation (Algebraic/Descriptive) and piece format (Symbols/Letters)
- **Visual Feedback**: Hover effects, move arrows, square highlighting, and last move indication
- **Responsive Design**: Optimized for desktop and mobile devices
- **Modern UI**: Clean interface with smooth animations and intuitive controls

### 🔧 Technical Features
- **Functional Architecture**: Clean, maintainable code using functional programming principles
- **State Management**: Robust state synchronization between board, controls, and analysis
- **Move Validation**: Comprehensive chess logic with disambiguation and special moves
- **Event Handling**: Robust drag-and-drop with proper event delegation

## Getting Started

### Prerequisites

- Node.js (for TypeScript compilation)
- A modern web browser with WebAssembly support

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd chessmovescoach
```

2. Install dependencies:
```bash
npm install
```

3. Build the application:
```bash
npm run build
```

4. Start the development server:
```bash
npm run serve
```

5. Open your browser and navigate to `http://localhost:8000`

### Development

For development with auto-recompilation:
```bash
npm run dev
```

## Usage

### Setting Up Positions

1. **Drag and Drop**: Click and drag pieces to move them on the board
2. **FEN Input**: Enter a FEN string and click "Load FEN"
3. **Position Controls**: Use the current player toggle, castling checkboxes, and en passant input
4. **Reset/Clear**: Use buttons to reset to starting position or clear the board

### Game Import

1. **Import Games**: Paste PGN-like notation in the textarea
2. **Navigate Moves**: Use Previous/Next buttons to step through the game
3. **Move Highlighting**: Current move is highlighted in the move list
4. **Board Synchronization**: Board state updates with move navigation

### Analysis Configuration

- **Max Depth**: Maximum search depth for Stockfish (1-50)
- **White/Black Moves**: Number of top moves to analyze for each side (1-20)
- **Threads**: Number of CPU threads for Stockfish (1-8)
- **Format Options**: Choose notation format (Algebraic/Descriptive) and piece format (Symbols/Letters)

### Running Analysis

1. Set up your desired position on the board
2. Configure analysis parameters
3. Click "Start Analysis" to begin
4. Monitor real-time progress and results
5. Use "Pause" or "Stop" to control the analysis
6. Hover over results to see move arrows on the board

### Understanding Results

Each move result shows:
- **Move Notation**: The move in selected notation format
- **Score**: Evaluation in centipawns or mate notation
- **Depth**: Search depth reached
- **Nodes**: Number of positions evaluated
- **Time**: Analysis time for this move
- **Principal Variation**: Best line of play following this move

## Technical Details

### Architecture

- **Frontend**: Functional TypeScript with modular components
- **Chess Engine**: Stockfish 16.0.0 WebAssembly multi-threaded worker
- **Styling**: Modern CSS with Grid and Flexbox
- **State Management**: Global state objects with pure functions
- **Mobile Support**: Touch events and responsive design

### Key Components

- **`main-functional.ts`**: Main application logic and state management
- **`chess-board-functional.ts`**: Interactive board with drag & drop
- **`stockfish-client-functional.ts`**: Engine integration and analysis
- **`types.ts`**: TypeScript interfaces and type definitions
- **`utils.ts`**: Chess utilities and notation functions

### File Structure

```
chessmovescoach/
├── index.html                    # Main HTML structure (4-column grid)
├── styles.css                    # Modern responsive CSS (835 lines)
├── favicon.svg                   # Custom chess piece icon
├── src/
│   ├── main-functional.ts        # Main application logic (1112 lines)
│   ├── chess-board-functional.ts # Board component with drag & drop
│   ├── stockfish-client-functional.ts # Engine integration
│   ├── types.ts                  # TypeScript definitions (112 lines)
│   └── utils.ts                  # Utility functions (245 lines)
├── dist/
│   ├── stockfish.js              # Stockfish WebAssembly worker
│   └── stockfish-nnue-16.wasm   # Stockfish binary
├── tsconfig.json                 # TypeScript configuration
├── package.json                  # Dependencies and scripts
├── server.js                     # Node.js development server
└── README.md                     # This file
```

## Key Features

### Functional Programming
- **Global State Objects**: Clean state management with `appState`, `boardState`, `stockfishState`
- **Pure Functions**: Modular, testable code with clear separation of concerns
- **Event Handling**: Robust event delegation and listener management
- **Type Safety**: Comprehensive TypeScript interfaces and type checking

### Chess Logic
- **Move Validation**: Comprehensive piece movement rules with path blocking
- **Disambiguation**: Smart piece selection for ambiguous moves
- **Special Moves**: Castling and en passant handling
- **Game Import**: PGN-like notation parsing with comments and annotations

### UI/UX
- **Drag-and-Drop**: Reliable piece movement with visual feedback
- **Format Controls**: Dynamic notation and piece format selection
- **Move Navigation**: Game replay with proper state management
- **Visual Feedback**: Hover effects, move arrows, and highlighting

## Browser Support

- Chrome/Chromium 67+
- Firefox 60+
- Safari 11.1+
- Edge 79+

Requires WebAssembly support for Stockfish engine.

## Performance Tips

1. **Lower Depth**: Use depth 10-15 for faster analysis
2. **Fewer Moves**: Analyze 3-5 moves per side for quicker results
3. **Single Thread**: Use 1 thread for mobile devices
4. **Game Import**: Large games may take a moment to parse

## Troubleshooting

### Stockfish Not Loading
- Check that `dist/stockfish.js` and `dist/stockfish-nnue-16.wasm` exist
- Ensure browser supports WebAssembly
- Try refreshing the page

### Analysis Not Starting
- Verify position is valid
- Check browser console for errors
- Ensure all configuration values are valid

### Drag-and-Drop Issues
- Ensure you're clicking directly on pieces
- Try refreshing the page if issues persist
- Check browser console for errors

### Game Import Problems
- Verify PGN notation is valid
- Check for proper move syntax
- Ensure game starts from a valid position

## Development Commands

```bash
# Development
npm run dev          # TypeScript watch mode
npm run build        # Build and copy Stockfish files
npm run serve        # Start development server

# Stockfish files
npm run copy-stockfish  # Copy stockfish-nnue-16.js and stockfish-nnue-16.wasm
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

MIT License - see LICENSE file for details.

## Acknowledgments

- [Stockfish](https://stockfishchess.org/) - Chess engine
- [Chess Unicode Symbols](https://en.wikipedia.org/wiki/Chess_symbols_in_Unicode) - Piece representation 