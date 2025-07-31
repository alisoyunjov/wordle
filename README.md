# Wordle

A full-stack Wordle implementation featuring three distinct game modes: Classic Wordle, Multiplayer, and Absurdle mode. Built with React + TypeScript frontend and Node.js + Express backend.

## Requirements

### System Requirements
- **Node.js**: v19 or higher
- **npm**: v8.19+

## How to Run Locally

### Quick Start (Recommended)

1. **Clone and install all dependencies**:
   ```bash
   git clone <repository-url>
   cd Wordle
   npm run install:all
   ```

2. **Start both frontend and backend servers**:
   ```bash
   npm run dev
   ```

3. **Open your browser** to `http://localhost:5173` and start playing!

The `npm run dev` command uses `concurrently` to run both servers simultaneously:
- Frontend: `http://localhost:5173` (Vite dev server)
- Backend: `http://localhost:3001` (Express server)

### Manual Setup (Alternative)

If you prefer to run servers separately:

#### Backend Setup
```bash
cd Wordle/backend
npm install
npm run dev
```

#### Frontend Setup (in a new terminal)
```bash
cd Wordle/frontend  
npm install
npm run dev
```

### Production Build
```bash
# Build both frontend and backend
npm run build

# Start production servers
npm start
```

## Project Structure

```
Wordle/
├── package.json              # Root workspace configuration
├── frontend/                 # React + TypeScript + Vite frontend
│   ├── src/
│   │   ├── components/       # UI components (GameGrid, Keyboard, etc.)
│   │   ├── services/         # API communication layer
│   │   ├── types/           # TypeScript type definitions
│   │   ├── utils/           # Helper functions and utilities
│   │   └── App.tsx          # Main application component
│   ├── public/              # Static assets
│   └── package.json         # Frontend dependencies
├── backend/                 # Node.js + Express backend
│   ├── src/
│   │   ├── controllers/     # HTTP request handlers
│   │   ├── services/        # Game logic and business rules
│   │   ├── data/           # Word lists and game data
│   │   ├── types/          # Shared type definitions
│   │   └── server.ts       # Express server setup
│   └── package.json        # Backend dependencies
└── README.md               # This file
```

### Technology Stack

**Frontend:**
- **React 19**: Modern UI library with hooks
- **TypeScript**: Type-safe JavaScript
- **Vite**: Fast build tool and dev server
- **TailwindCSS**: Utility-first styling

**Backend:**
- **Node.js**: JavaScript runtime
- **Express**: Web framework
- **TypeScript**: Type-safe server code

## Game Modes

### 🎮 Single Player (Classic Wordle)

**How it works:**
- Traditional Wordle gameplay with user-configurable attempts to guess a 5-letter word
- The target word is randomly selected at game start
- Players receive immediate feedback with color-coded tiles:
  - 🟩 **Green**: Letter is correct and in the right position
  - 🟨 **Yellow**: Letter is in the word but wrong position  
  - ⬜ **Gray**: Letter is not in the word

**Features:**
- Instant feedback on each guess
- Visual keyboard showing letter states
- Win/loss detection with game statistics

### 👥 Multiplayer

**How it works:**
- Two players take turns guessing the same target word
- Each player enters their guess, but results are only revealed after **both** players submit for that round
- Players compete to see who can guess the word with fewer attempts
- Turn-based system ensures fair gameplay

**Features:**
- Player name customization
- Turn indicator showing whose turn it is
- Synchronized reveal animations when both players submit
- Winner detection (first to guess correctly wins)
- Tie handling when both guess correctly in the same round

**Game Flow:**
1. Player 1 enters guess (then presses Enter) → waits for Player 2
2. Player 2 enters guess (then pressed Enter) → both guesses revealed simultaneously
3. Repeat until someone wins or all attempts exhausted

### 😈 Absurdle

**How it works:**
Absurdle is an "adversarial" version of Wordle that tries to avoid letting you win by being as unhelpful as possible.

**The Algorithm:**
1. **No predetermined answer**: Unlike normal Wordle, Absurdle starts with all possible words as candidates
2. **Score calculation**: For each guess, it calculates the feedback pattern and assigns a "helpfulness score" against every remaining candidate word
3. **Minimize helpfulness**: It finds the minimum score across all candidates (the least helpful feedback possible)
4. **Keep worst options**: It retains ALL candidate words that produce this minimum score, discarding words that would give more helpful feedback
5. **Decision logic**:
   - **Score = 0 with multiple candidates**: Give no feedback (all gray tiles) and continue Absurdle mode
   - **Score = 0 with one candidate**: Forced to select that word as the answer and give real feedback
   - **Score > 0**: Must transition to normal Wordle mode with a selected answer to avoid giving helpful feedback


## Technical Decisions

### 🏗️ Architecture Choices

**In-Memory Storage Instead of Database**
- **Decision**: Games are stored in a JavaScript `Map` on the server
- **Reasoning**: Eliminates database setup complexity for development and demonstration
- **Trade-offs**: Games don't persist between server restarts, limited to single server instance

**Hardcoded Word List**
- **Location**: `/backend/src/data/words.ts` 
- **Configurable**: Easily expandable by adding words to the `WORDS` array
- **Reasoning**: Keeps the demo simple while being easily configurable
- **Extension Path**: Could be replaced with external word API or database table

**No Authentication System**
- **Decision**: No user accounts, login, or persistent player profiles
- **Reasoning**: Focuses on core game mechanics without authentication complexity
- **Multiplayer Handling**: Uses temporary player IDs and names for session duration

**TypeScript Throughout**
- **Decision**: Both frontend and backend use TypeScript
- **Benefits**: Compile-time error checking, better IDE support, shared type definitions

### 🚀 Development Optimizations

**Concurrent Development Scripts**
- Root `package.json` includes scripts to run both servers simultaneously
- Uses `concurrently` package for parallel execution
- Simplifies development workflow

**Hot Reloading**
- Frontend: Vite provides instant hot module replacement
- Backend: `ts-node-dev` provides automatic server restart on changes

**API Design**
- RESTful endpoints with clear separation of concerns
- Comprehensive error handling with appropriate HTTP status codes

## API Reference

### Game Management

**Create New Game**
```http
POST /api/games
Content-Type: application/json

{
  "mode": "single" | "multiplayer" | "absurdle",
  "maxRounds": 6,
  "wordLength": 5,
  "playerNames": ["Player1", "Player2"]
}
```

**Response:**
```json
{
  "gameId": "unique-uuid",
  "gameState": {
    "id": "unique-uuid",
    "mode": "single",
    "players": [...],
    "gameStatus": "playing",
    "currentPlayerIndex": 0,
    "currentRow": 0,
    "maxRounds": 6,
    "currentGuess": ""
  }
}
```

### Gameplay

**Submit Guess**
```http
POST /api/games/guess
Content-Type: application/json

{
  "gameId": "unique-uuid",
  "guess": "HELLO",
  "playerId": "player-uuid"
}
```

**Response:**
```json
{
  "gameState": { /* Updated game state */ },
  "scoredGuess": [
    { "char": "H", "state": "miss" },
    { "char": "E", "state": "present" },
    { "char": "L", "state": "hit" },
    { "char": "L", "state": "hit" },
    { "char": "O", "state": "miss" }
  ]
}
```

**Get Game Answer**
```http
GET /api/games/:id/answer
```

**Purpose:**
- Shows the solution after game completion (won/lost)
- Verifies correct answer
- **Security**: Only returns answer when game is finished, prevents cheating

**Response:**
```json
{
  "answer": "HELLO"
}
```

### Error Handling

All endpoints return appropriate HTTP status codes:
- `200`: Success
- `201`: Game created successfully  
- `400`: Invalid input (wrong turn, invalid guess format, etc.)
- `404`: Game not found
- `500`: Internal server error

Error responses include descriptive messages:
```json
{
  "error": "It's Player 2's turn"
}
```

