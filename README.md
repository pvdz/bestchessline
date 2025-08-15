# Best Chess Line Discovery App

A comprehensive web-based chess analysis application that provides interactive board manipulation, Stockfish engine integration, game import/navigation, real-time analysis capabilities, enhanced move validation with effect detection, and a tree digger for deep position analysis.

##

TODO

- server should cut the move counters from the FEN and normalize the FEN to reflect the moves made so far when returning it. this helps with cache hits. we dont care about move counts.
- we dont recognize transpositions currently. with the current server approach it's not a huge deal except it will fully expand both lines of a transposition even though they should finish identically from that intersection onward. so we should put the fen Map back to identify reached positions and stop a line as transposition.
- we dont recognize a stalemate so we need to my chess engine to do proper move checking when pruning PV's
- practice app needs checking to confirm it still works after server rework. i guess we need to set the first N predefined moves there. user can configure it. then server takes over after that.
- fisher should be able to continue after it finishes and config gets updated. clear list and start over. server cache should make that easy to go back where it was
- convert the PCN stuff back to long moves
- show the SAN moves in UI?
- prevent the 404 in console
-

## Features

### Core Features

- **Interactive Chess Board**: Drag-and-drop piece movement with visual feedback
- **Stockfish Integration**: WebAssembly-based engine with multi-threading support
- **Game Import/Navigation**: PGN-like notation parsing with clickable move navigation
- **Move Validation**: Comprehensive move validation with effect detection
- **Analysis Arrows**: Color-coded analysis arrows with score labels
- **Real-time Analysis**: Live analysis results with status updates

### Tree Digger Analysis

- **Deep Position Analysis**: Recursive tree building for comprehensive position analysis
- **Dynamic White Moves**: User-defined first two white moves with Stockfish fallback
- **Transposition Detection**: Efficient reuse of previously analyzed positions
- **Progress Tracking**: Real-time analysis progress and statistics
- **Tree Visualization**: Hierarchical display of analysis results

### State Persistence & Resumption (NEW!)

- **State Export/Import**: Save and load analysis state as JSON files
- **State Validation**: Comprehensive validation of imported states
- **Progress Resumption**: Continue unfinished analysis from saved state
- **Transposition Handling**: Maintain transposition data across sessions
- **UI Optimization**: Pagination for large trees and progress reporting
- **Memory Management**: Efficient handling of large analysis states

## Tree Digger State Management

### Export State

- Click "Export State" button to save current analysis to JSON file
- Includes all analysis data, configuration, and progress
- File includes metadata (timestamp, version, statistics)
- Automatic file naming with timestamp

### Import State

- Click "Import State" to load previously saved analysis
- Validates state compatibility with current board position
- Shows warnings for configuration mismatches
- Displays state statistics and validation results

### State Information Display

- Shows current analysis statistics
- Displays estimated file size
- Indicates state validation status
- Provides warnings for compatibility issues

### Large Tree Handling

- Automatic pagination for trees with >1000 nodes
- Progress summary display for very large analyses
- Memory-efficient rendering with virtual scrolling
- Configurable page sizes and thresholds

## Usage

### Basic Analysis

1. Set up the board position
2. Configure analysis parameters (depth, moves, threads)
3. Click "Start Analysis" for regular analysis
4. Click "Dig Tree" for deep tree analysis

### State Management

1. **Export**: Run analysis → Click "Export State" → Save JSON file
2. **Import**: Click "Import State" → Select JSON file → Review validation
3. **Resume**: Load state → Continue analysis from saved progress

### Tree Digger Configuration

- **Depth Scaler**: Maximum analysis depth (1-15)
- **Responder Moves**: Number of responses to analyze (1-30)
- **Threads**: CPU threads for analysis (1-16)
- **Initiator Moves**: Predefined first two white moves
- **Overrides**: Custom responder counts for specific depths

## Technical Details

### State File Format

```json
{
  "metadata": {
    "version": "1.0.0",
    "timestamp": 1234567890,
    "boardPosition": "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
    "configuration": { ... },
    "progress": { ... },
    "statistics": { ... }
  },
  "analysis": {
    "rootFen": "...",
    "nodes": [ ... ],
    "maxDepth": 5,
    "analyzedPositions": [ ... ],
    "config": { ... }
  },
  "state": {
    "isAnalyzing": false,
    "progress": { ... }
  }
}
```

### Pagination Configuration

- **Page Size**: 50 nodes per page (configurable)
- **Progress Threshold**: 1000 nodes (show progress instead of tree)
- **Memory Optimization**: Virtual scrolling for large trees
- **Performance**: Efficient rendering with DOM recycling

### Transposition Handling

- **Detection**: Automatic detection of repeated positions
- **Sharing**: Analysis results shared across transpositions
- **Efficiency**: Significant performance improvement for complex positions
- **Persistence**: Transposition data preserved in state files

## Development

### Building

```bash
npm install
npm run build
npm run serve
```

### File Structure

- `src/main.ts`: Main application logic
- `src/chess-board.ts`: Interactive board component
- `src/tree-digger.ts`: Tree digger analysis engine
- `src/utils/tree-digger-persistence.ts`: State serialization
- `src/utils/tree-digger-pagination.ts`: Pagination system
- `src/utils/tree-digger-manager.ts`: State management UI

### Key Technologies

- **TypeScript**: Type-safe development
- **WebAssembly**: Stockfish engine integration
- **HTML5 Drag & Drop**: Interactive board
- **CSS Grid/Flexbox**: Responsive layout
- **Event-driven Architecture**: Real-time updates

## Browser Compatibility

- Modern browsers with WebAssembly support
- Chrome, Firefox, Safari, Edge
- Mobile browsers (limited functionality)

## Performance Considerations

- **Large Trees**: Automatic pagination and progress reporting
- **Memory Management**: Efficient state serialization
- **Transposition Optimization**: Avoid redundant analysis
- **UI Responsiveness**: Debounced updates and virtual scrolling

## Future Enhancements

- **Cloud Storage**: Save states to cloud storage
- **Collaborative Analysis**: Share analysis states
- **Advanced Pagination**: More sophisticated tree navigation
- **Performance Profiling**: Detailed analysis performance metrics
