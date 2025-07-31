import type { Guess, GameStatus } from './game';
export type GameMode = "single" | "multiplayer" | "absurdle";

export interface Player {
  id: string;
  name: string;
  guesses: Guess[];
  isWinner: boolean;
}

// Client game state that never includes the answer
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
  currentGuess: string;
}

export interface GameConfig {
  maxRounds: number;
  wordLength: number;
  mode: GameMode;
  playerNames?: string[];
}

export interface StartGameResponse {
  gameId: string;
  gameState: ClientGameState;
}

export interface GuessResponse {
  gameState: ClientGameState;
  scoredGuess: Guess;
}

export interface ErrorResponse {
  error: string;
}
