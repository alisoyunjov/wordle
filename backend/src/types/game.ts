export type LetterState = "hit" | "present" | "miss" | "empty";

export interface Letter {
  char: string;
  state: LetterState;
}

export type Guess = Letter[];

export type GameStatus = "playing" | "won" | "lost";
export type GameMode = "single" | "multiplayer" | "absurdle";

export interface Player {
  id: string;
  name: string;
  guesses: Guess[];
  isWinner: boolean;
}

// Server-side game state (never exposes the answer to client)
export interface ServerGameState {
  id: string;
  answer: string; // Only stored on server
  mode: GameMode;
  players: Player[];
  currentPlayerIndex: number;
  currentRow: number;
  gameStatus: GameStatus;
  winnerId?: string;
  maxRounds: number;
  wordLength: number;
  candidateWords?: string[]; // For Absurdle mode
}

// Client-side game state (answer is never included)
export interface ClientGameState {
  id: string;
  mode: GameMode;
  players: Player[];
  currentPlayerIndex: number;
  currentRow: number;
  gameStatus: GameStatus;
  winnerId?: string;
  maxRounds: number;
  wordLength: number;
  currentGuess: string; // Only used on client for input
}

export interface GameConfig {
  maxRounds: number;
  wordLength: number;
  mode: GameMode;
  playerNames?: string[]; // For multiplayer
}

// API Request/Response types
export interface StartGameResponse {
  gameId: string;
  gameState: ClientGameState;
}

export interface GuessRequest {
  gameId: string;
  guess: string;
  playerId?: string; // For multiplayer validation
}

export interface GuessResponse {
  gameState: ClientGameState;
  scoredGuess: Guess;
}

export interface ErrorResponse {
  error: string;
}
