# Chess Analysis Web App

A modern, responsive web application for chess position analysis using the Stockfish engine. Built with vanilla TypeScript, HTML, and CSS.

## Features

- **Interactive Chess Board**: Drag and drop pieces with mobile touch support
- **Stockfish Integration**: Real-time analysis using Stockfish WebAssembly
- **Configurable Analysis**: Set depth, move count, and engine options
- **Real-time Results**: Live updates during analysis with scores and best lines
- **Mobile Responsive**: Optimized for desktop and mobile devices
- **Modern UI**: Clean, intuitive interface with smooth animations

## Getting Started

### Prerequisites

- Node.js (for TypeScript compilation)
- A modern web browser with WebAssembly support

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd chess-analysis
```

2. Install dependencies:
```bash
npm install
```

3. Build the TypeScript files:
```bash
npm run build
```

4. Serve the application:
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
2. **FEN Input**: Enter a FEN string in the input field and click "Load"
3. **Reset/Clear**: Use the buttons to reset to starting position or clear the board

### Analysis Configuration

- **Max Depth**: Maximum search depth for Stockfish (1-50)
- **White/Black Moves**: Number of top moves to analyze for each side (1-20)
- **Threads**: Number of CPU threads for Stockfish (1-8)
- **Hash Size**: Memory allocation for Stockfish in MB (1-1024)

### Running Analysis

1. Set up your desired position on the board
2. Configure analysis parameters
3. Click "Start Analysis" to begin
4. Monitor real-time progress and results
5. Use "Pause" or "Stop" to control the analysis

### Understanding Results

Each move result shows:
- **Move Notation**: The move in algebraic notation (e.g., "e2e4")
- **Score**: Evaluation in centipawns or mate notation
- **Depth**: Search depth reached
- **Nodes**: Number of positions evaluated
- **Time**: Analysis time for this move
- **Principal Variation**: Best line of play following this move

## Technical Details

### Architecture

- **Frontend**: Vanilla TypeScript with modular components
- **Chess Engine**: Stockfish WebAssembly via CDN
- **Styling**: Modern CSS with Grid and Flexbox
- **Mobile Support**: Touch events and responsive design

### Key Components

- `ChessBoard`: Interactive board with drag & drop
- `StockfishClient`: Engine integration and analysis
- `ChessAnalysisApp`: Main application logic
- `utils.ts`: Chess utilities and formatting functions

### File Structure

```
chess-analysis/
├── index.html          # Main HTML structure
├── styles.css          # Modern responsive CSS
├── src/
│   ├── app.ts          # Main application
│   ├── chess-board.ts  # Board component
│   ├── stockfish-client.ts # Engine integration
│   ├── types.ts        # TypeScript definitions
│   └── utils.ts        # Utility functions
├── dist/               # Compiled JavaScript
├── tsconfig.json       # TypeScript configuration
├── package.json        # Dependencies and scripts
└── README.md          # This file
```

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
4. **Smaller Hash**: Use 16-32MB hash size for mobile

## Troubleshooting

### Stockfish Not Loading
- Check internet connection (Stockfish loads from CDN)
- Ensure browser supports WebAssembly
- Try refreshing the page

### Analysis Not Starting
- Verify position is valid
- Check browser console for errors
- Ensure all configuration values are valid

### Mobile Issues
- Use touch gestures for piece movement
- Ensure screen is large enough for controls
- Try landscape orientation for better layout

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