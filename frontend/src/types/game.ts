export type LetterState = "hit" | "present" | "miss" | "empty";

export interface Letter {
  char: string;
  state: LetterState;
}

export type Guess = Letter[];

export type GameStatus = "playing" | "won" | "lost";

export interface GameState {
  answer: string;
  guesses: Guess[];
  currentGuess: string;
  currentRow: number;
  gameStatus: GameStatus;
  maxRounds: number;
}
export interface KeyState {
  [key: string]: LetterState;
}
