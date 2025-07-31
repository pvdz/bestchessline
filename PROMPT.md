# Best Chess Lines Analysis App - Development Memory

This file serves as the AI memory/description for this application. It should reflect the current project status such that an AI can take a task for this project and complete it without having to analyze every file in detail.

## Application Overview

A comprehensive web-based chess analysis application that provides interactive board manipulation, Stockfish engine integration, game import/navigation, real-time analysis capabilities, enhanced move validation with effect detection, and a tree digger for deep position analysis. Built with simple vanilla TypeScript and HTML/CSS.

## Core Architecture

### State Management

The application uses global state objects to manage different aspects:

```typescript
// Main application state
interface AppState {
  // Game state
  moves: ChessMove[];
  initialFEN: string;
  currentMoveIndex: number;

  // Analysis state
  isAnalyzing: boolean;
  currentResults: AnalysisResult | null;

  // Branching state
  branchMoves: ChessMove[];
  branchStartIndex: number;
  isInBranch: boolean;
}

// Board-specific state
interface BoardState {
  position: ChessPosition;
  selectedSquare: string | null;
  draggedPiece: string | null;
  legalMoves: string[];
  onPositionChange?: (position: ChessPosition) => void;
  onMoveMade?: (move: ChessMove) => void;
}

// Tree digger analysis state
interface BestLinesState {
  isAnalyzing: boolean;
  currentAnalysis: BestLinesAnalysis | null;
  progress: {
    totalPositions: number;
    analyzedPositions: number;
    currentPosition: string;
    pvLinesReceived: number;
  };
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

#### 1. Main Application (`src/main.ts`)

- **Orchestration**: Coordinates board, Stockfish, and UI updates
- **Event Management**: Handles all user interactions and state changes
- **Game Logic**: Manages move validation, game import, and navigation
- **Analysis Control**: Manages Stockfish analysis and result display
- **Branching System**: Temporary move branches for exploring variations
- **Tree Digger Management**: Controls deep position analysis
- **UI State Management**: Button states, analysis status, format controls

#### 2. Chess Board (`src/chess-board.ts`)

- **Interactive Board**: 8x8 grid with drag-and-drop piece movement
- **Visual Features**: Hover effects, move arrows, square highlighting
- **Event Handling**: Mouse/touch events with proper delegation
- **State Synchronization**: Keeps board state in sync with FEN
- **Arrow System**: Color-coded analysis arrows with score labels
- **Z-index Management**: Proper layering of arrows and labels

#### 3. Stockfish Client (`src/stockfish-client.ts`)

- **Engine Integration**: WebAssembly worker communication
- **UCI Protocol**: Handles Stockfish commands and responses
- **Analysis Management**: MultiPV, depth control, result parsing
- **Real-time Updates**: Live analysis results with formatting

#### 4. Tree Digger (`src/best-lines.ts`)

- **Deep Analysis**: Recursive tree building for position analysis
- **Dynamic White Moves**: User-defined first two white moves with Stockfish fallback
- **Transposition Detection**: Efficient reuse of previously analyzed positions
- **Progress Tracking**: Real-time analysis progress and statistics
- **Tree Visualization**: Hierarchical display of analysis results

## Key Features & Implementation

### 1. Interactive Chess Board

#### Drag-and-Drop System

```typescript
// Critical implementation details:
// - Uses originalPiece and originalSquare for reliable move handling
// - Event delegation with target.closest('.piece')
// - Re-attaches listeners after board re-rendering
// - Proper ghost element positioning and styling
// - Arrow cleanup when board is re-rendered
```

**Edge Cases Handled:**

- Clicking on piece children (spans, etc.)
- Board re-rendering losing event listeners
- Drag ghost positioning and sizing
- Drop target highlighting during drag
- Arrow and label cleanup on board updates

#### Visual Feedback

- **Hover Effects**: Pieces scale and highlight on hover
- **Move Arrows**: Color-coded arrows show analysis moves
- **Square Highlighting**: Yellow squares for last move
- **Drop Targets**: Visual feedback during drag operations

### 2. Analysis Arrow System

#### Color-Coded Arrows

```typescript
// Arrow color logic based on move quality:
// - Mate moves: Pastel green (#90EE90)
// - Moves preventing mate: Bright red (#FF4444)
// - Small deviations (0.1-0.2): Light green (#98FB98)
// - Medium deviations (0.3-1.0): Linear gradient yellow to tomato red
// - Large deviations (>1.0): Tomato red (#FF6347)
```

**Implementation Details:**

- **Rounded Delta Calculation**: Matches display rounding logic
- **CSS Custom Properties**: Arrow color passed to labels
- **Z-index Ordering**: Higher-ranked moves appear on top
- **Label Integration**: Score labels match arrow colors

#### Score Labels

```typescript
// Label text logic:
// - Mate: "+#" or "-#" (who's getting mated)
// - Mate-in-X: "+Mx" or "-Mx"
// - Best move is mate but current isn't: "!?"
// - Delta vs best: "+x.y" or "-x.y" (forced decimal for <10)
// - Large differences: Rounded to integer
```

**Visual Features:**

- **Text Shadow**: Black border + colored glow matching arrow
- **Positioning**: Anchored to arrow connection point
- **Z-index**: Matches arrow layering
- **Cleanup**: Proper removal with arrows

### 3. Engine Moves & Status

#### Analysis Status Indicator

```typescript
// Status calculation:
// - Min depth of visible non-mating moves
// - Max depth of mating moves (if only mating moves visible)
// - "Analyzing..." vs "Analysis complete"
// - Real-time updates during analysis
```

**Features:**

- **Dynamic Depth**: Shows lowest depth of visible moves
- **Mate Handling**: Special logic for mating sequences
- **Status Updates**: Real-time analysis state
- **Visual Integration**: Positioned in results section

#### Results Filtering & Sorting

```typescript
// Filtering logic:
// - While analyzing: Show deepest developed lines with highest scores
// - When complete: Hide lines not ending in mate and not reaching target depth
// - Mate lines always shown first
// - Sort by depth, then score, then multipv
```

**UI Integration:**

- **Dynamic Line Count**: Respects White/Black Moves settings
- **Real-time Updates**: Results update when settings change
- **Format Controls**: Notation and piece format affect display
- **Event Listeners**: UI controls trigger result updates

### 4. UI Layout & Organization

#### Current Layout Structure

```
┌─────────────────┬─────────────────────────────────────┐
│                 │ Game Moves                          │
│   Chess Board   ├─────────────────────────────────────┤
│                 │ Controls                             │
│                 │ ├─ Analysis Settings                 │
│                 │ ├─ Start/Stop Buttons               │
│                 │ └─ Format Options                   │
│                 ├─────────────────────────────────────┤
│                 │ Engine Moves                       │
│                 │ ├─ Stockfish Status                 │
│                 │ ├─ Analysis Status                  │
│                 │ └─ Results Panel                    │
└─────────────────┴─────────────────────────────────────┘
```

#### Format Controls

```typescript
// Format options moved to controls section:
// - Algebraic: Short/Long (values: algebraic-short/algebraic-long)
// - Notation: Symbols/Letters (values: symbols/letters)
// - Styled as vertical button groups
// - Consistent with current player control styling
```

**Implementation:**

- **Radio Button Groups**: Vertical stacked buttons
- **CSS Variables**: Consistent styling with other controls
- **Event Handling**: Real-time format updates
- **State Management**: Format preferences affect all displays

#### Button States

```typescript
// Button state management:
// - Start button: Disabled when analyzing
// - Stop button: Disabled when not analyzing
// - Visual feedback: Dimmed appearance when disabled
// - State synchronization: Updates on analysis start/stop
```

### 5. Game Import & Navigation

#### PGN-like Notation Parsing

```typescript
// Parsing approach:
// 1. Clean input (remove comments, annotations, move numbers)
// 2. Split into individual moves
// 3. Apply moves sequentially to maintain board context
// 4. Use board-aware move finding for accurate from-square determination
// 5. Determine move effects (capture, check, mate) during parsing
```

**Complexities Handled:**

- **Comments**: `{This is a comment}` removal
- **Annotations**: `!`, `?`, `!!`, `??` removal
- **Move Numbers**: `1.`, `2.`, etc. removal
- **Disambiguation**: Multiple pieces of same type
- **Special Moves**: Castling (`O-O`, `O-O-O`) and en passant
- **Effect Detection**: Captures, checks, and mates determined during parsing

#### Clickable Move Navigation

```typescript
// Enhanced move list with clickable navigation:
// - Each move is a clickable element with hover effects
// - Clicking a move navigates to that position
// - Visual feedback shows current position and clickable moves
// - Immediate board updates when moves are clicked
```

**Features:**

- **Direct Navigation**: Click any move to jump to that position
- **Visual Feedback**: Hover effects and current move highlighting
- **State Synchronization**: Board, FEN, and controls update together
- **Move Effects**: Capture, check, and mate indicators in notation

#### Branching System

```typescript
// Temporary move branches for exploring variations:
// - Clicking PV moves creates branches at correct positions
// - Branches show alternative moves with visual distinction
// - Clicking different moves clears previous branches
// - Branches appear at original analysis position, not current position
```

**Branch Features:**

- **Contextual Positioning**: Branches appear at the move where analysis was performed
- **Visual Distinction**: Indented with blue border and italic styling
- **Dynamic Updates**: Clicking different PV moves updates existing branches
- **Proper Notation**: Shows "..." for original moves and alternative moves
- **State Management**: Branches are cleared when navigating to different game moves

### 6. Move Validation & Effect Detection

#### Move Validator System (`src/move-validator.ts`)

```typescript
// Comprehensive move validation with effect detection:
// - Validates move legality according to chess rules
// - Determines move effects (capture, check, mate, en-passant)
// - Provides detailed error messages for invalid moves
// - Integrates with existing application structure
```

**Key Functions:**

- `validateMove(position, move)` - Main validation function
- `analyzeMove(fen, move)` - Convenience function for FEN strings
- `getLegalMoves(position)` - Gets all legal moves for a position
- `isKingInCheck(position, color)` - Checks if a king is in check

**Effect Detection:**

- **Captures**: Detects when a piece captures another piece
- **Checks**: Detects when a move puts the opponent's king in check
- **Mates**: Detects when a move results in checkmate
- **En Passant**: Detects special en passant captures

### 7. Stockfish Integration

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
- **Enhanced Results**: Move effects included in analysis display

#### Result Processing

```typescript
// Parses Stockfish info messages:
// - depth, nodes, time, score
// - principal variation (PV)
// - multiple variations (MultiPV)
// - mate sequences and evaluations
// - Move effects determined for each analysis move
```

#### Enhanced PV Display

```typescript
// PV moves with effects and clickability:
// - Each PV move is validated against the correct position
// - Move effects (capture, check, mate) are determined sequentially
// - PV moves are clickable for temporary board visualization
// - Move numbering continues from current game position
```

**PV Features:**

- **Sequential Validation**: Each move validated against position after previous moves
- **Effect Detection**: Captures (#), checks (+), and mates (#) shown in notation
- **Clickable Moves**: Individual PV moves update board temporarily
- **Dynamic Numbering**: PV moves numbered relative to current game position
- **Visual Feedback**: Hover effects and move arrows for PV moves

### 8. Tree Digger Analysis

#### Deep Position Analysis with Shadow DOM System

The tree digger performs comprehensive analysis of chess positions by building a recursive tree of moves and responses. It starts from the current board position and explores multiple lines to a specified depth. The UI uses a clean shadow DOM system for predictable, efficient updates.

```typescript
// Tree digger analysis structure:
interface BestLinesAnalysis {
  rootFen: string; // Starting position (current board FEN)
  maxDepth: number; // Maximum analysis depth
  nodes: BestLineNode[]; // Root nodes of the analysis tree
  analyzedPositions: Set<string>; // Positions already analyzed
  analysisQueue: string[]; // Positions waiting to be analyzed
  isComplete: boolean; // Analysis completion status
}

interface BestLineNode {
  fen: string; // Position before the move
  move: ChessMove; // Move made from this position
  score: number; // Evaluation score
  depth: number; // Analysis depth
  isWhiteMove: boolean; // Whether this is a white move
  moveNumber: number; // Move number in the game
  children: BestLineNode[]; // Child nodes (responses)
  parent?: BestLineNode; // Parent node
  analysisResult?: AnalysisResult; // Stockfish analysis result
}
```

#### Dynamic White Move Inputs

The tree digger allows users to specify the first two white moves, with automatic fallback to Stockfish analysis:

```typescript
// White move input handling:
const getWhiteMoves = (): string[] => {
  const whiteMove1Input = document.getElementById(
    "tree-digger-white-move-1",
  ) as HTMLInputElement;
  const whiteMove2Input = document.getElementById(
    "tree-digger-white-move-2",
  ) as HTMLInputElement;

  const move1 = whiteMove1Input?.value.trim() || "";
  const move2 = whiteMove2Input?.value.trim() || "";

  const moves: string[] = [];
  if (move1) moves.push(move1);
  if (move2) moves.push(move2);

  return moves;
};
```

**Features:**

- **Default Values**: "Nf3" for first white move, "g3" for second
- **Input Clearing**: Automatically cleared when board position changes
- **Stockfish Fallback**: If inputs are empty, uses Stockfish analysis
- **Move Validation**: Parses and validates user-provided moves

#### Transposition Detection

The tree digger efficiently handles transpositions by tracking previously analyzed positions:

```typescript
// Transposition detection:
if (analysis.analyzedPositions.has(fen)) {
  log(`Transposition detected at depth ${depth}, skipping: ${fen}`);
  return;
}

// Add to analyzed positions AFTER processing to prevent self-detection
analysis.analyzedPositions.add(fen);
```

**Benefits:**

- **Efficiency**: Avoids re-analyzing the same position multiple times
- **Accuracy**: Prevents infinite loops in analysis
- **Performance**: Significantly reduces analysis time for complex positions

#### Progress Tracking & Statistics

The tree digger provides comprehensive progress tracking and statistics:

```typescript
// Progress tracking:
interface BestLinesProgress {
  totalPositions: number;    // Total positions to analyze
  analyzedPositions: number; // Positions completed
  currentPosition: string;   // Currently analyzing position
  pvLinesReceived: number;   // PV lines received from Stockfish
}

// Statistics displayed:
- Total Positions: Number of positions to analyze
- Analyzed: Number of positions completed
- Total Leafs: Number of leaf nodes in the tree
- Unique Positions: Number of distinct positions analyzed
```

#### Tree Visualization with Shadow DOM System

The analysis results are displayed using a clean, predictable shadow DOM system that ensures accurate tree representation:

```typescript
// Shadow tree structure for UI management:
interface UITreeNode {
  id: string; // Unique node identifier
  element: HTMLElement; // DOM element for this node
  children: UITreeNode[]; // Child nodes
  parent: UITreeNode | null; // Parent node reference
}

// Shadow tree to track what should be in the UI:
let shadowTree: UITreeNode | null = null;
```

**Tree Building Process:**

1. **Shadow Tree Construction**: Build complete shadow tree from data structure
2. **DOM Synchronization**: Compare shadow tree with existing DOM
3. **Incremental Updates**: Add new nodes, remove old ones, update existing ones
4. **Predictable IDs**: Each node has unique ID based on position and move

```typescript
// Node ID generation for predictable identification:
const generateNodeId = (node: BestLineNode): string => {
  const positionAfterMove = applyMoveToFEN(node.fen, node.move);
  const cleanFen = positionAfterMove.replace(/[^a-zA-Z0-9]/g, "");
  return `node-${cleanFen}-${node.move.from}-${node.move.to}`;
};

// Shadow tree building:
const buildShadowTree = (
  nodes: BestLineNode[],
  analysis: BestLinesAnalysis,
): UITreeNode[] => {
  const uiNodes: UITreeNode[] = [];

  for (const node of nodes) {
    const nodeId = generateNodeId(node);
    const element = createTreeNodeElement(node, depth, analysis);

    const uiNode: UITreeNode = {
      id: nodeId,
      element,
      children: [],
      parent,
    };

    // Recursively build children
    if (node.children.length > 0) {
      uiNode.children = buildShadowTree(
        node.children,
        analysis,
        uiNode,
        depth + 1,
      );
    }

    uiNodes.push(uiNode);
  }

  return uiNodes;
};
```

**DOM Synchronization:**

```typescript
// Sync DOM with shadow tree:
const syncDOMWithShadowTree = (
  container: HTMLElement,
  shadowNodes: UITreeNode[],
  analysis: BestLinesAnalysis,
): void => {
  // Get existing DOM nodes
  const existingNodes = Array.from(container.children) as HTMLElement[];
  const existingNodeMap = new Map<string, HTMLElement>();

  for (const element of existingNodes) {
    const nodeId = element.getAttribute("data-node-id");
    if (nodeId) {
      existingNodeMap.set(nodeId, element);
    }
  }

  // Process shadow nodes in order
  for (let i = 0; i < shadowNodes.length; i++) {
    const shadowNode = shadowNodes[i];
    const existingElement = existingNodeMap.get(shadowNode.id);

    if (existingElement) {
      // Update existing element
      updateTreeNodeElement(existingElement, originalNode, analysis);

      // Move to correct position if needed
      if (container.children[i] !== existingElement) {
        container.insertBefore(existingElement, container.children[i] || null);
      }
    } else {
      // Create new element
      const newElement = shadowNode.element;

      // Insert at correct position
      if (i < container.children.length) {
        container.insertBefore(newElement, container.children[i]);
      } else {
        container.appendChild(newElement);
      }
    }
  }

  // Remove extra DOM nodes that shouldn't be there
  for (const element of existingNodes) {
    const nodeId = element.getAttribute("data-node-id");
    if (nodeId && !shadowNodes.find((n) => n.id === nodeId)) {
      element.remove();
    }
  }
};
```

**Visual Features:**

- **Color Coding**: White moves in green, black moves in red
- **Depth Indentation**: Visual hierarchy showing analysis depth
- **Transposition Indicators**: 🔄 symbol for transposed positions
- **Score Display**: Evaluation scores for each position
- **Move Information**: Player, notation, depth, and children count
- **Predictable Updates**: Shadow tree ensures DOM always matches data structure

#### Analysis Controls

The tree digger provides comprehensive analysis controls:

```typescript
// Analysis parameters:
- Max Depth: Maximum analysis depth (1-20)
- Black Moves: Number of black responses to analyze (1-10)
- Threads: Number of CPU threads for analysis (1-10)
- Font Size: Tree display font size (8-16)
```

**Control Features:**

- **Real-time Updates**: Parameters update analysis immediately
- **Progress Monitoring**: Live progress updates during analysis
- **Start/Stop Control**: Start, stop, and clear analysis
- **Copy Functionality**: Copy analysis tree to clipboard

#### Analysis Process

The tree digger follows a recursive analysis process:

1. **Root Position**: Starts from current board FEN
2. **White Moves**: Applies user-defined moves or Stockfish analysis
3. **Black Responses**: Analyzes multiple black responses per position
4. **Recursive Building**: Continues to specified depth
5. **Transposition Handling**: Skips already analyzed positions
6. **Progress Updates**: Real-time progress and statistics

**Analysis Flow:**

```typescript
const buildAnalysisTree = async (
  fen: string,
  analysis: BestLinesAnalysis,
  parentNode: BestLineNode | null,
  depth: number,
): Promise<void> => {
  // Check depth limit
  if (depth >= analysis.maxDepth) return;

  // Check for transposition
  if (analysis.analyzedPositions.has(fen)) return;

  // Process position based on turn
  if (isWhiteTurn) {
    await processWhiteMoveInTree(fen, analysis, parentNode, depth);
  } else {
    await processBlackMovesInTree(fen, analysis, parentNode, depth);
  }

  // Mark as analyzed
  analysis.analyzedPositions.add(fen);
};
```

## Critical Implementation Details

### 1. Arrow & Label Management

#### Arrow Creation & Cleanup

```typescript
// Arrow lifecycle:
// - showMoveArrow(): Creates arrow with color, z-index, and label
// - hideMoveArrow(): Removes arrow and associated label
// - Board re-rendering: Clears all arrows before re-rendering
// - Z-index ordering: Higher-ranked moves on top
```

**Key Features:**

- **Color Coding**: Based on move quality and delta from best
- **Label Integration**: Score labels match arrow colors
- **Proper Cleanup**: Removes both arrows and labels
- **Z-index Management**: Ensures proper layering

#### Label Positioning

```typescript
// Label positioning logic:
// - Anchored to arrow connection point (shaft meets head)
// - Text shadow with black border + colored glow
// - Fixed width/height for consistent centering
// - Z-index matches arrow for proper layering
```

### 2. State Synchronization

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

### 3. Event Handling

#### Event Delegation

```typescript
// Uses target.closest('.piece') for reliable piece selection
// Handles clicks on piece children (spans, etc.)
// Re-attaches listeners after DOM updates
```

#### Listener Management

- **Board Re-rendering**: Re-attach listeners after position changes
- **Dynamic Elements**: Handle newly created engine moves
- **Memory Management**: Clean up listeners when needed

### 4. Analysis Status Management

#### Status Calculation

```typescript
// Status logic:
// - Visible non-mating moves: Show min depth
// - Only mating moves: Show max depth
// - Real-time updates during analysis
// - Proper completion detection
```

#### Button State Management

```typescript
// Button states:
// - Start: Disabled when isAnalyzing = true
// - Stop: Disabled when isAnalyzing = false
// - Visual feedback: Dimmed appearance
// - State updates: Called on analysis start/stop
```

## Edge Cases & Problem Solutions

### 1. Arrow & Label Cleanup

**Problem**: Labels remain after arrows are cleared
**Solution**:

- Call `hideMoveArrow()` before board re-rendering
- Track both arrows and labels in `arrowElements` map
- Clean up orphaned labels from `document.body`
- Proper z-index management for layering

### 2. Color Coding Accuracy

**Problem**: Arrow colors don't match displayed scores
**Solution**:

- Use same rounding logic as display (`.toFixed(1)` vs `Math.round()`)
- Calculate `roundedDeltaInPawns` to match label text
- Ensure color thresholds match display thresholds

### 3. Analysis Status Updates

**Problem**: Status doesn't update when analysis completes
**Solution**:

- Set `isAnalyzing` based on `analysisResult.completed`
- Call `updateButtonStates()` on analysis updates
- Calculate status depth from visible moves only

### 4. Format Control Integration

**Problem**: Format changes don't update results
**Solution**:

- Add event listeners to format radio buttons
- Call `updateResultsPanel()` when formats change
- Ensure format values match expected parameters

### 5. Z-index Issues

**Problem**: Lower-ranked moves appear on top
**Solution**:

- Confirm index parameter is passed to `showMoveArrow()`
- Check z-index calculation: `100 + index`
- Verify both arrow and label have same z-index

### 6. Transposition Detection

**Problem**: Initial branch detected as transposition of itself
**Solution**:

- Add positions to `analyzedPositions` AFTER processing, not before
- Check for transpositions before processing, not after
- Ensure root position is never considered a transposition

### 7. Tree DOM Update Issues

**Problem**: Complex incremental DOM updates causing nodes to appear in wrong parents or missing nodes
**Solution**:

- Implemented shadow DOM system with predictable tree structure
- Build complete shadow tree from data, then sync with DOM
- Use unique node IDs based on position and move for reliable identification
- Simple add/remove/update logic instead of complex reconciliation

## Performance Considerations

### 1. Stockfish Integration

- **Multi-threading**: Uses WebAssembly worker for performance
- **Memory Management**: Proper worker cleanup prevents memory leaks
- **Analysis Limits**: Configurable depth and move counts prevent infinite analysis

### 2. Board Rendering

- **Efficient Updates**: Only re-render when position actually changes
- **Event Optimization**: Use event delegation and re-attach listeners after DOM updates
- **Arrow Cleanup**: Remove arrows before board re-rendering to prevent memory leaks

### 3. Tree Digger Analysis

- **Transposition Detection**: Skip already analyzed positions to avoid redundant work
- **Depth Limits**: Respect maxDepth to prevent runaway analysis
- **Progress Tracking**: Update progress incrementally to maintain responsiveness
- **Shadow DOM System**: Predictable tree updates using shadow tree structure for efficient DOM manipulation

### 4. Memory Management

- **Event Listeners**: Clean up listeners when components are destroyed
- **DOM Elements**: Remove arrows and labels from DOM when no longer needed
- **State Objects**: Avoid circular references in state management

## Development Workflow

### Build Process

Generally the human will do most of the build stuff. When you need to check build errors you'll be prompted to build. The AI should never install or serve.

```bash
npm install          # Install dependencies
npm run build        # TypeScript compilation
npm run serve        # Start development server (human runs this)
```

**Important**: The AI should never run `npm run watch` or `npm run dev` - the human will handle the watch process and notify if there are TypeScript errors.

### Development Guidelines

Do not use classes, keep flat simple concepts, prefer module exports, do not pass on exported functions as parameters, keep it simple and maintainable, use greppable obvious names. Import and export things explicitly.

#### Adding Features

1. **Type Safety**: All functions must have explicit types for arguments and return values
2. **No `any` Types**: Use `unknown` only for `console.log` arguments
3. **Error Handling**: Add appropriate error handling for new features
4. **State Management**: Use existing state patterns when adding new state
5. **Use Constants**: Try to use descriptive constants rather than magic strings and magic numbers. Things that are easy to grep for and which may even be declared as an opaque type to improve type safety.

- Always use `PIECES` and `PIECE_TYPES` constants instead of magic strings for piece-related logic
- Use `PIECES.WHITE_KING`, `PIECES.BLACK_PAWN`, etc. for actual piece characters
- Use `PIECE_TYPES.KING`, `PIECE_TYPES.PAWN`, etc. for piece type comparisons and algebraic notation parsing
- Only use hardcoded strings for FEN-specific notation (castling rights: "K", "Q", "k", "q") and color notation ("w", "b")
- Make sure to parse algebraic notation properly (where a lower-case "b" does not mean "Bishop")

#### Debugging & Logging

**Console Logging Strategy**:

- Add `console.log()` statements for debugging (not `log`, the human will do that)
- Remove logs when they're no longer necessary before adding new ones
- If logging becomes excessive, propose a temporary quick stop to gather targeted logs
- Use descriptive log messages that include relevant data

**Example Logging Pattern**:

```typescript
// Good: Descriptive with context
log(
  `Processing white move at depth ${depth}, position: ${fen.substring(0, 30)}...`,
);

// Good: Include relevant data
log(`Applied white move from UI: ${moveText} -> ${newFen}`);

// Avoid: Generic or excessive logging
console.log("here"); // Too generic
console.log("processing..."); // Not helpful
```

#### Testing Approach

The application relies heavily on TypeScript compilation for error detection:

- **TypeScript Errors**: The human will run the watch process and notify of compilation errors
- **Runtime Testing**: Changes are tested by running the application and interacting with features
- **Manual Testing**: Verify UI behavior, analysis results, and edge cases manually

#### File Modification Guidelines

**Safe to Modify**:

- `src/main.ts`: Main application logic
- `src/chess-board.ts`: Board interactions and rendering
- `src/best-lines.ts`: Tree digger analysis
- `src/move-validator.ts`: Move validation logic
- `src/utils.ts`: Utility functions
- `styles.css`: Visual styling

**Be Cautious With**:

- `src/types.ts`: Changes affect multiple files
- `src/stockfish-client.ts`: Core engine integration
- `index.html`: Main UI structure

**Avoid Modifying**:

- Build configuration files
- Anything in `node_modules`
- Anything in `dist`
- Stockfish WASM files
- Test files unless specifically working on tests

### Key Files

- **`src/main.ts`** (2897 lines): Main application logic with enhanced navigation, branching system, analysis management, and tree digger controls
- **`src/chess-board.ts`** (855 lines): Interactive board component with arrow system and color coding
- **`src/stockfish-client.ts`**: Engine integration
- **`src/best-lines.ts`** (946 lines): Tree digger analysis with recursive tree building, transposition detection, and progress tracking
- **`src/move-validator.ts`** (435 lines): Move validation and effect detection
- **`src/types.ts`** (246 lines): TypeScript interfaces with effect support
- **`src/utils.ts`** (435 lines): Utility functions with enhanced notation

### Test Files

- **`test/move-validator/test-move-validator.html`**: Interactive move validation testing
- **`test/enhanced-notation/test-enhanced-notation.html`**: Enhanced notation demonstration
- **`test/stockfish/test-stockfish.html`**: Stockfish integration testing
- **`index.html`**: Main application with test page links

## Key Insights

1. **Event Delegation**: Use `target.closest('.piece')` for reliable piece selection and handle board re-rendering
2. **State Synchronization**: Bidirectional updates between FEN, board, and controls prevent inconsistencies
3. **Arrow System**: Proper z-index management and cleanup are essential for performance
4. **Transposition Detection**: Add positions to analyzed set AFTER processing to prevent self-detection
5. **Tree Digger**: Recursive analysis with user-defined white moves provides deep position understanding
6. **TypeScript Compilation**: The human handles watch mode and notifies of compilation errors
7. **Memory Management**: Clean up event listeners, DOM elements, and avoid circular references

The application provides a comprehensive chess analysis platform with advanced move validation, interactive navigation, enhanced notation display, color-coded analysis arrows, real-time status updates, and deep position analysis through the tree digger. The modular architecture allows for easy extension and enhancement of features.
