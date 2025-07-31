import { v4 as uuidv4 } from "uuid";
import {
  ServerGameState,
  ClientGameState,
  Guess,
  Letter,
  GameConfig,
  Player,
  LetterState,
} from "../types/game";
import { WORDS } from "../data/words";

/**
 * GameService handles all game logic for Wordle including:
 * - Single player Wordle
 * - Multiplayer Wordle 
 * - Absurdle 
 *
 * Key responsibilities:
 * - Game state management
 * - Guess validation and scoring
 * - Absurdle logic
 * - Game mode transitions
 */
class GameService {
  // In-memory storage for active games (should be replaced with database in production)
  private games: Map<string, ServerGameState> = new Map();
  // Word dictionary for validation and Absurdle candidates
  private wordList: string[] = [];

  constructor() {
    this.loadWordList();
  }

  /**
   * Loads the word dictionary from the data file
   * This list is used for:
   * - Validating player guesses
   * - Initial candidate pool for Absurdle mode
   */
  private loadWordList(): void {
    this.wordList = WORDS;
  }

  /**
   * Selects a random word from the dictionary for normal Wordle games
   * Not used in Absurdle mode where no answer is selected upfront
   */
  private getRandomWord(): string {
    const randomIndex = Math.floor(Math.random() * this.wordList.length);
    return this.wordList[randomIndex].toUpperCase();
  }

  /**
   * Validates that a guess is a real word from our dictionary
   * Prevents invalid/made-up words from being submitted
   */
  private isValidWord(word: string): boolean {
    return this.wordList.includes(word.toUpperCase());
  }

  /**
   * Core Wordle scoring algorithm - compares a guess against a target word
   * This handles duplicate letters correctly (e.g., if target has one 'L'
   * but guess has two 'L's, only one can be marked as present/hit)
   */
  private scoreGuess(guess: string, answer: string): Guess {
    const guessArray = guess.toUpperCase().split("");
    const answerArray = answer.toUpperCase().split("");
    const result: Letter[] = [];
    const answerLetterCount: { [key: string]: number } = {};

    // Count frequency of each letter in the answer
    answerArray.forEach((letter) => {
      answerLetterCount[letter] = (answerLetterCount[letter] || 0) + 1;
    });

    // First pass: mark exact matches (hits) and decrement counts
    guessArray.forEach((letter, index) => {
      if (letter === answerArray[index]) {
        result[index] = { char: letter, state: "hit" };
        answerLetterCount[letter]--;
      } else {
        result[index] = { char: letter, state: "empty" };
      }
    });

    // Second pass: mark wrong-position matches (presents) and remaining misses
    result.forEach((letterObj, index) => {
      if (letterObj.state === "empty") {
        const letter = letterObj.char;
        if (answerLetterCount[letter] > 0) {
          result[index] = { char: letter, state: "present" };
          answerLetterCount[letter]--;
        } else {
          result[index] = { char: letter, state: "miss" };
        }
      }
    });

    return result;
  }

  /**
   * Calculates numeric score for a guess pattern
   * Used by Absurdle to determine which pattern gives least helpful feedback
   *
   * Scoring system:
   * - Hit: 6 points (very helpful to player)
   * - Present: 1 point (somewhat helpful to player)
   * - Miss: 0 points (not helpful to player)
   *
   * Lower scores are preferred by Absurdle (worse for player)
   * Hit value > 5 ensures hits always outweigh any number of presents
   */
  private scorePattern(pattern: Guess): number {
    let score = 0;
    pattern.forEach((letter) => {
      if (letter.state === "hit")
        score += 6; // Make hits worth more than 5 presents
      else if (letter.state === "present") score += 1;
      // miss = 0 points
    });
    return score;
  }

  /**
   * Absurdle logic
   *
   * The goal is to make the game as difficult as possible by:
   * 1. Never committing to an answer until forced to
   * 2. Always choosing the feedback pattern that helps the player least
   * 3. Maintaining a pool of candidate words that could still be the answer
   *
   * Algorithm:
   * 1. Score the guess against every candidate word
   * 2. Find the minimum score (least helpful feedback)
   * 3. Keep all candidates that produce this minimum score
   * 4. Decide whether to give feedback or transition to normal mode
   *
   * Transition conditions:
   * - Score > 0: Player would get helpful feedback, so pick an answer
   * - Score = 0 but only 1 candidate: Forced to pick that word as answer
   * - Score = 0 with multiple candidates: Continue Absurdle mode (no feedback)
   */
  private absurdleScoreGuess(
    guess: string,
    candidateWords: string[]
  ): {
    pattern: Guess;
    remainingWords: string[];
    selectedAnswer: string | null;
  } {
    const guessUpper = guess.toUpperCase();

    // Calculate score for each candidate word
    const wordScores: { word: string; pattern: Guess; score: number }[] = [];

    candidateWords.forEach((candidate) => {
      const pattern = this.scoreGuess(guessUpper, candidate);
      const score = this.scorePattern(pattern);
      wordScores.push({ word: candidate, pattern, score });
    });

    // Find the minimum score across all candidates
    const minScore = Math.min(...wordScores.map((ws) => ws.score));

    // Keep ALL words that produce the minimum (worst for player) score
    const lowestScoringWords = wordScores.filter((ws) => ws.score === minScore);

    if (lowestScoringWords.length === 0) {
      throw new Error("No valid patterns found");
    }

    let finalPattern: Guess;
    let selectedAnswer: string | null = null;

    if (minScore === 0) {
      if (lowestScoringWords.length === 1) {
        // Case: Only one candidate left with score 0
        // Must select it as the answer and start giving real feedback
        selectedAnswer = lowestScoringWords[0].word;
        finalPattern = lowestScoringWords[0].pattern;
      } else {
        // Case: Multiple candidates with score 0
        // Continue Absurdle mode - give no feedback (all empty states)
        finalPattern = guessUpper.split("").map((char) => ({
          char,
          state: "empty" as LetterState,
        }));
      }
    } else {
      // Case: Minimum score > 0
      // Player would get helpful feedback, so pick an answer and transition to normal mode
      selectedAnswer = lowestScoringWords[0].word;
      finalPattern = lowestScoringWords[0].pattern;
    }

    return {
      pattern: finalPattern,
      remainingWords: lowestScoringWords.map((ws) => ws.word),
      selectedAnswer,
    };
  }

  /**
   * Converts server game state to client-safe format
   * Removes sensitive information like the answer and candidate words
   * Adds client-specific fields like currentGuess
   */
  private toClientGameState(
    serverState: ServerGameState,
    currentGuess: string = ""
  ): ClientGameState {
    return {
      id: serverState.id,
      mode: serverState.mode,
      players: serverState.players,
      currentPlayerIndex: serverState.currentPlayerIndex,
      currentRow: serverState.currentRow,
      gameStatus: serverState.gameStatus,
      winnerId: serverState.winnerId,
      maxRounds: serverState.maxRounds,
      wordLength: serverState.wordLength,
      currentGuess,
    };
  }

  /**
   * Creates a new game instance
   *
   * Different initialization based on game mode:
   * - Single/Multiplayer: Select random answer upfront
   * - Absurdle: No answer, start with full word list as candidates
   *
   */
  createGame(
    config: GameConfig = { maxRounds: 6, wordLength: 5, mode: "single" }
  ): {
    gameId: string;
    gameState: ClientGameState;
  } {
    const gameId = uuidv4();

    // For Absurdle, we don't select an answer upfront - that's the key difference
    const answer = config.mode === "absurdle" ? "" : this.getRandomWord();

    // Create player objects based on game mode
    let players: Player[] = [];
    if (config.mode === "single" || config.mode === "absurdle") {
      players = [
        {
          id: uuidv4(),
          name: "Player",
          guesses: [],
          isWinner: false,
        },
      ];
    } else if (config.mode === "multiplayer" && config.playerNames) {
      players = config.playerNames.map((name) => ({
        id: uuidv4(),
        name: name.trim() || "Player",
        guesses: [],
        isWinner: false,
      }));
    } else {
      throw new Error("Player names are required for multiplayer mode");
    }

    const serverState: ServerGameState = {
      id: gameId,
      answer,
      mode: config.mode,
      players,
      currentPlayerIndex: 0,
      currentRow: 0,
      gameStatus: "playing",
      maxRounds: config.maxRounds,
      wordLength: config.wordLength,
      // Absurdle starts with all words as candidates, others don't need this
      candidateWords:
        config.mode === "absurdle" ? [...this.wordList] : undefined,
    };

    this.games.set(gameId, serverState);

    return {
      gameId,
      gameState: this.toClientGameState(serverState),
    };
  }

  /**
   * Processes a player's guess submission
   *
   * Flow:
   * 1. Validate game exists and is active
   * 2. Validate guess format and word validity
   * 3. Score the guess (different logic for Absurdle vs normal)
   * 4. Update game state (player guesses, turn order, win/loss status)
   * 5. Return updated state and scored guess for UI display
   *
   */
  submitGuess(
    gameId: string,
    guess: string,
    playerId?: string
  ): { gameState: ClientGameState; scoredGuess: Guess } {
    const game = this.games.get(gameId);

    if (!game) {
      throw new Error("Game not found");
    }

    if (game.gameStatus !== "playing") {
      throw new Error("Game is not in playing state");
    }

    // Input validation
    if (!guess || typeof guess !== "string") {
      throw new Error("Invalid guess format");
    }

    const normalizedGuess = guess.trim().toUpperCase();

    // Game rule validation
    if (normalizedGuess.length !== game.wordLength) {
      throw new Error(`Guess must be ${game.wordLength} letters long`);
    }

    if (!/^[A-Z]+$/.test(normalizedGuess)) {
      throw new Error("Guess must contain only letters");
    }

    if (!this.isValidWord(normalizedGuess)) {
      throw new Error("Not a valid word");
    }

    // Multiplayer turn validation
    if (game.mode === "multiplayer") {
      const currentPlayer = game.players[game.currentPlayerIndex];
      if (playerId && playerId !== currentPlayer.id) {
        throw new Error(`It's ${currentPlayer.name}'s turn`);
      }
    }

    // Score the guess - different logic for Absurdle vs normal modes
    let scoredGuess: Guess;

    if (game.mode === "absurdle" && game.answer === "") {
      // Still in Absurdle mode (no answer selected yet)
      if (!game.candidateWords || game.candidateWords.length === 0) {
        throw new Error("Invalid game state: no candidate words");
      }

      // Use Absurdle logic to determine response
      const absurdleResult = this.absurdleScoreGuess(
        normalizedGuess,
        game.candidateWords
      );
      scoredGuess = absurdleResult.pattern;
      game.candidateWords = absurdleResult.remainingWords;

      // Check if Absurdle decided to transition to normal mode
      if (absurdleResult.selectedAnswer) {
        // Transition to normal Wordle mode with selected answer
        game.answer = absurdleResult.selectedAnswer;

        // Re-score against the selected answer for accurate feedback
        // This ensures the feedback is consistent with the chosen word
        scoredGuess = this.scoreGuess(normalizedGuess, game.answer);
      }
    } else {
      // Normal Wordle scoring against predetermined answer
      // This includes: regular single/multiplayer games AND Absurdle after answer is selected
      scoredGuess = this.scoreGuess(normalizedGuess, game.answer);
    }

    // Update player state
    const currentPlayer = game.players[game.currentPlayerIndex];
    currentPlayer.guesses.push(scoredGuess);

    // Check win condition
    const isWin =
      game.mode === "absurdle"
        ? game.answer !== "" && normalizedGuess === game.answer // Only win if answer was selected
        : normalizedGuess === game.answer;

    if (isWin) {
      currentPlayer.isWinner = true;
    }

    // Advance turn/round
    if (game.mode === "multiplayer") {
      // Cycle through players
      game.currentPlayerIndex =
        (game.currentPlayerIndex + 1) % game.players.length;

      // Increment round when all players have guessed
      if (game.currentPlayerIndex === 0) {
        game.currentRow++;
      }

      // Check win/loss conditions only after all players in the round have guessed
      if (game.currentPlayerIndex === 0 || game.gameStatus !== "playing") {
        const winners = game.players.filter(player => player.isWinner);
        
        if (winners.length > 0) {
          game.gameStatus = "won";
          // If multiple winners, it's a tie - set winnerId to first winner but frontend handles tie display
          game.winnerId = winners[0].id;
        } else {
          // Check loss condition (out of rounds)
          if (game.currentRow >= game.maxRounds) {
            game.gameStatus = "lost";
          }
        }
      }
    } else {
      // Single player - check win immediately and increment round
      if (isWin) {
        game.gameStatus = "won";
        game.winnerId = currentPlayer.id;
      } else {
        game.currentRow++;
        
        // Check loss condition (out of rounds)
        if (game.currentRow >= game.maxRounds) {
          game.gameStatus = "lost";
        }
      }
    }

    return {
      gameState: this.toClientGameState(game),
      scoredGuess,
    };
  }

  /**
   * Retrieves current game state for a client
   * Returns null if game doesn't exist
   */
  getGame(gameId: string): ClientGameState | null {
    const game = this.games.get(gameId);
    return game ? this.toClientGameState(game) : null;
  }

  /**
   * Retrieves the answer for a completed game
   * Used for displaying the solution after win/loss
   *
   * Security: Only returns answer after game is complete
   * Absurdle: Only returns answer if one was actually selected
   */
  getGameAnswer(gameId: string): string | null {
    const game = this.games.get(gameId);
    if (!game || game.gameStatus === "playing") return null;

    // For Absurdle, return the answer only if it was determined
    if (game.mode === "absurdle") {
      return (
        game.answer ||
        (game.candidateWords && game.candidateWords.length === 1
          ? game.candidateWords[0]
          : null)
      );
    }

    return game.answer;
  }
}

export const gameService = new GameService();
