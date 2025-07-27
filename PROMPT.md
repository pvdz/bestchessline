# Chess Moves Coach - Development Memory

This file serves as the AI memory/description for this application. It should reflect the current project status such that an AI can take a task for this project and complete it without having to analyze every file in detail.

## Application Overview

A comprehensive web-based chess analysis application that provides interactive board manipulation, Stockfish engine integration, game import/navigation, and real-time analysis capabilities. Built with TypeScript, HTML/CSS, and WebAssembly.

## Core Architecture

### State Management
The application uses global state objects to manage different aspects:

```typescript
// Main application state
interface AppState {
  moves: ChessMove[];
  initialFEN: string;
  currentMoveIndex: number;
  isAnalyzing: boolean;
  currentResults: AnalysisResult | null;
}

// Board-specific state
interface BoardState {
  position: ChessPosition;
  element: HTMLElement | null;
  onPositionChange: ((position: ChessPosition) => void) | null;
  onMoveMade: ((move: ChessMove) => void) | null;
}

// Drag state for piece movement
interface DragState {
  element: HTMLElement | null;
  offset: { x: number; y: number };
  isDragging: boolean;
  currentDropTarget: string | null;
  originalPiece: HTMLElement | null;
  originalSquare: string | null;
}
```

### Key Components

#### 1. Main Application (`src/main-functional.ts`)
- **Orchestration**: Coordinates board, Stockfish, and UI updates
- **Event Management**: Handles all user interactions and state changes
- **Game Logic**: Manages move validation, game import, and navigation
- **Analysis Control**: Manages Stockfish analysis and result display

#### 2. Chess Board (`src/chess-board-functional.ts`)
- **Interactive Board**: 8x8 grid with drag-and-drop piece movement
- **Visual Features**: Hover effects, move arrows, square highlighting
- **Event Handling**: Mouse/touch events with proper delegation
- **State Synchronization**: Keeps board state in sync with FEN

#### 3. Stockfish Client (`src/stockfish-client-functional.ts`)
- **Engine Integration**: WebAssembly worker communication
- **UCI Protocol**: Handles Stockfish commands and responses
- **Analysis Management**: MultiPV, depth control, result parsing
- **Real-time Updates**: Live analysis results with formatting

## Key Features & Implementation

### 1. Interactive Chess Board

#### Drag-and-Drop System
```typescript
// Critical implementation details:
// - Uses originalPiece and originalSquare for reliable move handling
// - Event delegation with target.closest('.piece')
// - Re-attaches listeners after board re-rendering
// - Proper ghost element positioning and styling
```

**Edge Cases Handled:**
- Clicking on piece children (spans, etc.)
- Board re-rendering losing event listeners
- Drag ghost positioning and sizing
- Drop target highlighting during drag

#### Visual Feedback
- **Hover Effects**: Pieces scale and highlight on hover
- **Move Arrows**: Red arrows show analysis moves on hover
- **Square Highlighting**: Yellow squares for last move
- **Drop Targets**: Visual feedback during drag operations

### 2. Game Import & Navigation

#### PGN-like Notation Parsing
```typescript
// Parsing approach:
// 1. Clean input (remove comments, annotations, move numbers)
// 2. Split into individual moves
// 3. Apply moves sequentially to maintain board context
// 4. Use board-aware move finding for accurate from-square determination
```

**Complexities Handled:**
- **Comments**: `{This is a comment}` removal
- **Annotations**: `!`, `?`, `!!`, `??` removal
- **Move Numbers**: `1.`, `2.`, etc. removal
- **Disambiguation**: Multiple pieces of same type
- **Special Moves**: Castling (`O-O`, `O-O-O`) and en passant

#### Move Disambiguation Algorithm
```typescript
// For ambiguous moves like "Bc4" when multiple bishops exist:
// 1. Find all pieces of the correct type and color
// 2. Check if each can legally move to destination
// 3. Implement path blocking for sliding pieces
// 4. Use chess rules to select correct piece
// 5. Fallback to simple heuristics if needed
```

**Path Blocking Logic:**
- **Sliding Pieces**: Rook, Bishop, Queen check path for obstacles
- **Jumping Pieces**: Knight, King can jump over pieces
- **Pawns**: Special diagonal capture rules and en passant

### 3. Stockfish Integration

#### WebAssembly Worker Setup
```typescript
// Uses stockfish-nnue-16.wasm for multi-threaded performance
// Worker communication via postMessage/onmessage
// UCI protocol for engine communication
```

#### Analysis Features
- **MultiPV**: Multiple principal variations
- **Configurable Depth**: 1-50 ply search depth
- **Thread Control**: 1-8 CPU threads
- **Move Limits**: Analyze top N moves per side
- **Real-time Results**: Live updates during analysis

#### Result Processing
```typescript
// Parses Stockfish info messages:
// - depth, nodes, time, score
// - principal variation (PV)
// - multiple variations (MultiPV)
// - mate sequences and evaluations
```

### 4. Format Controls & UI

#### Dynamic Formatting
```typescript
// Radio button controls affect:
// - Move list display (game moves)
// - Analysis results display
// - Real-time updates when format changes
```

**Format Options:**
- **Notation**: Algebraic vs Descriptive
- **Piece Format**: Unicode symbols vs English letters
- **Conversion**: Maps UI values to internal function parameters

#### Responsive Design
- **4-column Grid**: Board, controls, game moves, analysis results
- **Mobile Support**: Touch events and responsive breakpoints
- **Visual Hierarchy**: Clear information architecture

## Critical Implementation Details

### 1. State Synchronization

#### FEN ↔ UI Controls ↔ Board State
```typescript
// Bidirectional synchronization:
// - FEN input updates board and controls
// - Board changes update FEN and controls
// - Control changes update FEN and board
// - Game navigation updates all three
```

**Synchronization Points:**
- Board position changes
- Control value changes
- Game navigation
- Move application

### 2. Event Handling

#### Event Delegation
```typescript
// Uses target.closest('.piece') for reliable piece selection
// Handles clicks on piece children (spans, etc.)
// Re-attaches listeners after DOM updates
```

#### Listener Management
- **Board Re-rendering**: Re-attach listeners after position changes
- **Dynamic Elements**: Handle newly created analysis results
- **Memory Management**: Clean up listeners when needed

### 3. Move Validation System

#### Comprehensive Chess Logic
```typescript
// Piece-specific validation:
// - Pawns: Forward movement, diagonal captures, en passant
// - Rooks: Horizontal/vertical with path blocking
// - Bishops: Diagonal with path blocking
// - Queens: Combined rook/bishop movement
// - Knights: L-shaped jumps
// - Kings: One square in any direction, castling
```

#### Special Move Handling
- **Castling**: King and rook movement, rights tracking
- **En Passant**: Double pawn push detection and capture
- **Promotion**: Pawn promotion logic (future enhancement)

### 4. Game State Management

#### Move History
```typescript
// Tracks:
// - moves: ChessMove[] (complete game history)
// - initialFEN: string (starting position)
// - currentMoveIndex: number (current position in game)
```

#### Navigation System
- **Previous/Next**: Step through game moves
- **Move Highlighting**: Visual indication of current move
- **State Restoration**: Apply moves up to current index
- **Button States**: Enable/disable based on position

## Edge Cases & Problem Solutions

### 1. Drag-and-Drop Reliability

**Problem**: Pieces not dragging after board updates
**Solution**: 
- Store `originalPiece` and `originalSquare` in drag state
- Re-attach event listeners after board re-rendering
- Use event delegation for reliable piece selection

### 2. Move Disambiguation

**Problem**: Wrong piece moving (e.g., wrong bishop)
**Solution**:
- Board-aware move finding using current FEN
- Path blocking validation for sliding pieces
- Color matching to ensure correct piece selection
- Sequential move application during parsing

### 3. FEN Synchronization

**Problem**: UI controls not reflecting board state
**Solution**:
- Bidirectional update functions
- Call synchronization after every state change
- Proper castling rights and en passant tracking

### 4. Game Import Accuracy

**Problem**: Incorrect move parsing from notation
**Solution**:
- Apply moves sequentially during parsing
- Use current board state for move validation
- Comprehensive disambiguation logic
- Special move detection and handling

### 5. Analysis Result Formatting

**Problem**: Radio buttons not affecting display
**Solution**:
- Add event listeners for format controls
- Update both move list and analysis results
- Real-time format conversion and display

## Performance Considerations

### 1. Stockfish Integration
- **Multi-threading**: Uses WebAssembly worker for performance
- **Memory Management**: Proper worker cleanup
- **Analysis Limits**: Configurable depth and move counts

### 2. Board Rendering
- **Efficient Updates**: Only re-render when necessary
- **Event Optimization**: Proper listener management
- **Visual Performance**: Smooth animations and transitions

### 3. Game Import
- **Parsing Efficiency**: Sequential application for accuracy
- **Memory Usage**: Large games handled properly
- **UI Responsiveness**: Non-blocking import process

## Development Workflow

### Build Process
```bash
npm run dev          # TypeScript watch mode
npm run build        # Build and copy Stockfish files
npm run serve        # Start development server
```

### Key Files
- **`src/main-functional.ts`** (1112 lines): Main application logic
- **`src/chess-board-functional.ts`**: Interactive board component
- **`src/stockfish-client-functional.ts`**: Engine integration
- **`src/types.ts`** (112 lines): TypeScript interfaces
- **`src/utils.ts`** (245 lines): Utility functions

### Testing Approach
- **Manual Testing**: Interactive board and game import
- **Edge Case Testing**: Ambiguous moves, special moves
- **Performance Testing**: Large games and deep analysis
- **Browser Testing**: Cross-browser compatibility

## Common Issues & Solutions

### 1. Stockfish Not Loading
- Check `dist/stockfish.js` and `dist/stockfish-nnue-16.wasm` exist
- Verify WebAssembly support in browser
- Check browser console for errors

### 2. Drag-and-Drop Issues
- Ensure clicking directly on pieces
- Check event listener attachment
- Verify drag state management

### 3. Game Import Problems
- Validate PGN notation syntax
- Check for proper move format
- Verify starting position validity

### 4. Analysis Not Starting
- Ensure valid board position
- Check analysis parameters
- Verify Stockfish communication

## Future Enhancements

### Planned Features
- **PGN Export**: Save games in standard format
- **Opening Book**: Integrate opening database
- **Position Evaluation**: Historical evaluation tracking
- **Advanced Analysis**: More engine options and configurations
- **Game Annotation**: Add comments and variations

### Technical Improvements
- **Performance**: Optimize large game handling
- **Memory**: Better state management for large games
- **UI**: Enhanced visual feedback and animations
- **Accessibility**: Screen reader and keyboard support

## Key Insights

1. **State Management**: Global state objects work well for this scale
2. **Event Handling**: Delegation and re-attachment are critical
3. **Move Validation**: Board-aware validation is essential for accuracy
4. **UI Synchronization**: Bidirectional updates prevent inconsistencies
5. **Performance**: WebAssembly provides excellent chess engine performance

The application provides a solid foundation for chess analysis with room for enhancement and expansion. 