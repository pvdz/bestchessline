# App status

This file serves as the AI memory/description for this application. It should reflect the current project status such that an AI can take a task for this project and complete it without having to analyze every file in detail.

### File Organization - COMPLETED ✅

The project has been reorganized with a clean, modular structure:

**Line-specific files organized into subdirectories:**

- `src/line/fish/` - Fish analysis utilities (`line-fisher-ui-utils.ts`, `line-fisher-calculations.ts`)
- `src/line/best/` - Best engine moves analysis (`analysis-manager.ts`, `analysis-utils.ts`, `analysis-config.ts`, `pv-utils.ts`)
- `src/line/board/` - Game board components (`board-utils.ts`, `board-rendering.ts`, `position-controls.ts`, `arrow-utils.ts`, `game-navigation.ts`)
- `src/line/` - Root level line utilities (`line-analysis.ts`, `main.ts`)

**Generic utilities remain in `src/utils/`:**

- Core utilities: `fen-utils.ts`, `notation-utils.ts`, `move-parsing.ts`, `dom-helpers.ts`
- Analysis utilities: `analysis-manager.ts`, `pv-utils.ts`
- UI utilities: `ui-utils.ts`, `button-utils.ts`, `formatting-utils.ts`

### Types Refactoring - COMPLETED ✅

**Shared types moved to `src/utils/types.ts`:**

- Core chess types: `ChessMove`, `ChessPosition`, `PLAYER_COLORS`, `AnalysisMove`, etc.
- Stockfish types: `StockfishState`, `StockfishInstance`, `StockfishOptions`
- UI types: `MoveItemElement`, `AnalysisResultsElement`, `ButtonElement`, etc.
- Piece notation types: `PieceNotation`, `WhitePieceNotation`, `BlackPieceNotation`

**Line-specific types in `src/line/types.ts`:**

- Line Fisher types: `LineFisherConfig`, `LineFisherResult`, `FishLine`, `FishState`
- Tree digger types: `TreeDiggerNode`, `TreeDiggerAnalysis`
- Extended app state: `ExtendedAppState`, `BranchState`

### Fish Function Implementation - COMPLETED ✅

The `fish()` function has been fully implemented with the following features:

- **Queue-based analysis**: Uses WIP (work-in-progress) and done lists
- **Initiator/Responder logic**: Alternates between initiator and responder moves
- **Predefined moves**: Supports `initiatorMoves` array
- **Responder overrides**: Supports `responderMoveCounts` array
- **Stockfish integration**: Uses `analyzePosition` for move generation
- **Delta calculations**: Calculates deltas from baseline score
- **UI integration**: Real-time progress and results display
- **Export functionality**: Clipboard export for WIP and done lines

### Stockfish Integration - COMPLETED ✅

**Stockfish worker paths fixed:**

- Main mode: `../dist/stockfish.js` (multi-threaded)
- Fallback mode: `../dist/stockfish-single.js` (single-threaded)
- Server correctly maps `src/dist/` to `dist/` directory

**SharedArrayBuffer detection:**

- Proper detection of SharedArrayBuffer support
- Automatic fallback to single-threaded mode when not supported
- Server sends required headers: `Cross-Origin-Opener-Policy: same-origin`, `Cross-Origin-Embedder-Policy: require-corp`

### Recent Major Fixes:

- ✅ **File Reorganization**: Moved line-specific files to appropriate subdirectories
- ✅ **Tree Digger Removal**: Eliminated old tree digger components and dependencies
- ✅ **Import Path Cleanup**: Fixed all import paths after reorganization
- ✅ **TypeScript Compilation**: Resolved all compilation errors
- ✅ **createBranch Logic**: Restored without tree digger dependencies
- ✅ **Types Refactoring**: Moved shared types to `src/utils/types.ts`
- ✅ **Piece Notation Fix**: Fixed `isPieceNotation` regex to allow lowercase letters
- ✅ **Stockfish Path Fix**: Fixed worker URLs to use correct relative paths
- ✅ **Castling Detection Fix**: Improved castling detection to work with any king move >1 square
- ✅ **Enhanced Confetti System**: Completely reworked confetti with rainbow effects and focused corner pop

### Current Status:

- ✅ **All TypeScript errors fixed**: 0 errors, 0 warnings
- ✅ **File organization complete**: Clean modular structure
- ✅ **Fish export/import working**: Full state preservation and reconstruction
- ✅ **Button states working**: Proper enable/disable during analysis
- ✅ **Continue functionality working**: Resumes analysis from imported state
- ✅ **UI display correct**: Imported states show proper completion status
- ✅ **createBranch restored**: Simple chess move handling without tree digger
- ✅ **Import paths clean**: All imports correctly resolved
- ✅ **Stockfish integration working**: Both multi-threaded and single-threaded modes
- ✅ **Piece notation validation fixed**: Supports both uppercase and lowercase letters
- ✅ **Castling detection working**: Any king move >1 square triggers castling automatically
- ✅ **Confetti celebration system**: Enhanced rainbow confetti with focused corner pop effect

## Application Overview

A comprehensive web-based chess analysis application that provides interactive board manipulation, Stockfish engine integration, game import/navigation, real-time analysis capabilities, enhanced move validation with effect detection, Fish analysis for deep position analysis, and practice mode with castling detection and celebration effects. Built with simple vanilla TypeScript and HTML/CSS.

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

// Fish analysis state
interface FishState {
  isFishing: boolean;
  wip: FishLine[];
  done: FishLine[];
  config: LineFisherConfig;
}

// Fish line representation
interface FishLine {
  sanGame: string;
  pcns: string[];
  score: number;
  delta: number;
  position: string;
  isDone: boolean;
  isFull: boolean;
}
```

### Key Components

#### 1. Main Application (`src/line/main.ts`)

- **Orchestration**: Coordinates board, Stockfish, and UI updates
- **Event Management**: Handles all user interactions and state changes
- **Game Logic**: Manages move validation, game import, and navigation
- **Analysis Control**: Manages Stockfish analysis and result display
- **Branching System**: Temporary move branches for exploring variations
- **UI State Management**: Button states, analysis status, format controls

#### 2. Fish Analysis (`src/line/fish/fish.ts`)

- **Queue-based Analysis**: WIP and done lists for progressive analysis
- **Initiator/Responder Logic**: Alternates between predefined and Stockfish moves
- **Delta Calculations**: Score deltas from baseline position
- **Export/Import**: Full state preservation and reconstruction
- **Real-time Updates**: Progress tracking and UI updates

#### 3. Stockfish Integration (`src/utils/stockfish-client.ts`)

- **Multi-threaded Mode**: Uses SharedArrayBuffer for full performance
- **Single-threaded Fallback**: Automatic fallback when SharedArrayBuffer not available
- **Worker Management**: Web Worker communication with Stockfish engine
- **Analysis Queue**: Manages multiple analysis requests
- **Error Handling**: Comprehensive crash detection and recovery

#### 4. Line Organization (`src/line/`)

- **Fish Utilities** (`src/line/fish/`): Line Fisher UI and calculation utilities
- **Best Moves** (`src/line/best/`): Analysis management and principal variation utilities
- **Board Components** (`src/line/board/`): Board rendering, position controls, game navigation
- **Line Analysis** (`src/line/`): Core line analysis and main application logic

#### 5. Generic Utilities (`src/utils/`)

- **Core Utilities**: FEN manipulation, notation conversion, move parsing
- **UI Utilities**: DOM helpers, button management, formatting
- **Analysis Utilities**: Stockfish integration, analysis management
- **Celebration Utilities**: Enhanced confetti system with rainbow effects
- **Shared Types**: All core chess types and interfaces

## Key Features & Implementation

### 1. Fish Analysis System

#### Queue-based Analysis

**Critical implementation details:**

- Uses WIP (work-in-progress) and done lists for progressive analysis
- Alternates between initiator moves (predefined or Stockfish best) and responder moves (multiple Stockfish options)
- Supports predefined moves via `initiatorMoves` array
- Supports responder count overrides via `responderMoveCounts` array
- Calculates deltas from baseline score for move quality assessment

**Analysis Flow:**

1. **Initialization**: Create state, get root score, set baseline
2. **Initial move**: Create first move (predefined or Stockfish)
3. **Main loop**: Process WIP queue until empty
4. **Initiator moves**: Get best move (predefined or Stockfish)
5. **Responder moves**: Get N best moves, create new lines
6. **State updates**: Update global state for export functionality

#### Delta Calculation System

**Delta calculation logic:**

- **Baseline**: Root position score (0.0 delta)
- **Formula**: `delta = moveScore - baselineScore`
- **Display**: Formatted as "+0.5", "-0.3", "="

### 2. Stockfish Integration

#### Multi-threaded vs Single-threaded

**Detection logic:**

- **SharedArrayBuffer support**: Detected via WebAssembly.Memory with shared flag
- **Automatic fallback**: Single-threaded mode when SharedArrayBuffer not available
- **Performance difference**: Multi-threaded significantly faster for complex analysis

**Worker paths:**

- **Multi-threaded**: `../dist/stockfish.js`
- **Single-threaded**: `../dist/stockfish-single.js`
- **Server mapping**: `src/dist/` → `dist/` directory

### 3. File Organization

#### Modular Structure

**Line-specific organization:**

- **Fish analysis**: `src/line/fish/` - Line Fisher UI and calculations
- **Best moves**: `src/line/best/` - Analysis management and PV utilities
- **Board components**: `src/line/board/` - Board rendering and game navigation
- **Core line logic**: `src/line/` - Main application and line analysis

**Generic utilities:**

- **Core utilities**: `src/utils/` - FEN, notation, move parsing, DOM helpers
- **Analysis utilities**: `src/utils/` - Stockfish integration, analysis management
- **UI utilities**: `src/utils/` - Button management, formatting, notifications

### 4. Import/Export System

#### State Preservation

**Export functionality:**

- **Full state export**: Complete `FishState` object with WIP and done lines
- **Format preservation**: PCN moves, scores, deltas, completion status
- **Import reconstruction**: Full state restoration from exported data
- **Toast notifications**: Success/error feedback to user

### 5. Practice Mode System

#### Castling Detection

**Enhanced castling logic:**

- **Distance-based detection**: Any king move >1 square triggers castling
- **Direction detection**: Right movement = kingside (O-O), left = queenside (O-O-O)
- **No validation**: Castling always works regardless of position map
- **Automatic rook movement**: Both king and rook move simultaneously

#### Celebration System

**Enhanced confetti effects:**

- **Focused corner pop**: All confetti launches from bottom-right corner
- **Rainbow color palette**: 12 vibrant colors with varied particle shapes
- **Realistic physics**: Gravity, air resistance, rotation, and scaling
- **High velocity**: 700-1500+ initial speed for dramatic effect
- **Trail effects**: Particles leave colorful trails as they move
- **Performance optimized**: Efficient particle management and cleanup

## Development Patterns

### File Organization

- **Line-specific files**: Organized into appropriate subdirectories under `src/line/`
- **Generic utilities**: Remain in `src/utils/` for shared access
- **Import paths**: Use relative paths from current file location
- **Type definitions**: Centralized in `src/utils/types.ts` and `src/line/types.ts`

### Code Style

- **TypeScript**: Strict typing with proper interfaces
- **Error handling**: Comprehensive try-catch blocks with user feedback
- **Logging**: Debug logging for development and troubleshooting
- **Modular design**: Clear separation of concerns with focused modules

### Testing Approach

- **TypeScript compilation**: Always check for errors before testing
- **Incremental development**: Small, focused changes with immediate validation
- **User feedback**: Toast notifications and status updates for user guidance

### Stockfish Configuration

- **Multi-threaded mode**: Default when SharedArrayBuffer supported
- **Single-threaded fallback**: Automatic when SharedArrayBuffer not available
- **Server headers**: Required for SharedArrayBuffer support
- **Worker paths**: Correctly mapped for both modes
