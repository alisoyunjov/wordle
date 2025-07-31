import { Request, Response } from "express";
import { gameService } from "../services/gameService";
import { GameConfig, GuessRequest, ErrorResponse } from "../types/game";

/**
 * Game Controller - API layer for Wordle
 *
 * Responsibilities:
 * - HTTP request/response handling
 * - Input validation 
 * - Error handling and appropriate HTTP status codes
 * - Delegating business logic to GameService
 *
 * This controller provides a RESTful API for:
 * - Creating new games
 * - Submitting guesses
 * - Retrieving game state
 * - Getting game answers
 */

/**
 * POST /api/games - Creates a new game instance
 *
 * Request body should contain GameConfig:
 * - maxRounds: number of attempts allowed
 * - wordLength: length of words (typically 5)
 * - mode: "single" | "multiplayer" | "absurdle"
 * - playerNames?: string[] (required for multiplayer)
 *
 * Success response (201):
 * - gameId: unique identifier for the game
 * - gameState: initial client-safe game state
 *
 * Error response (500):
 * - error: descriptive error message
 */
export const createGame = (req: Request, res: Response) => {
  try {
    // Use default config if no body provided
    const config: GameConfig = req.body || {
      maxRounds: 6,
      wordLength: 5,
      mode: "single",
    };

    const result = gameService.createGame(config);

    // Return 201 Created with game details
    res.status(201).json({
      gameId: result.gameId,
      gameState: result.gameState,
    });
  } catch (error) {
    // Handle business logic errors (invalid config, etc.)
    const errorResponse: ErrorResponse = {
      error: error instanceof Error ? error.message : "Failed to create game",
    };
    res.status(500).json(errorResponse);
  }
};

/**
 * POST /api/games/guess - Submits a player's word guess
 *
 * Request body should contain GuessRequest:
 * - gameId: unique game identifier
 * - guess: the player's word guess
 * - playerId?: player identifier (for multiplayer turn validation)
 *
 * Success response (200):
 * - gameState: updated game state
 * - scoredGuess: guess results with hit/present/miss feedback
 *
 * Error responses:
 * - 400: Invalid input (missing fields, bad guess format, wrong turn, etc.)
 * - 404: Game not found
 * - 500: Internal server error
 */
export const submitGuess = (req: Request, res: Response) => {
  try {
    const { gameId, guess, playerId }: GuessRequest = req.body;

    // Basic input validation
    if (!gameId || !guess) {
      const errorResponse: ErrorResponse = {
        error: "Game ID and guess are required",
      };
      return res.status(400).json(errorResponse);
    }

    const result = gameService.submitGuess(gameId, guess, playerId);

    // Success - return updated game state and guess feedback
    res.json({
      gameState: result.gameState,
      scoredGuess: result.scoredGuess,
    });
  } catch (error) {
    const errorResponse: ErrorResponse = {
      error: error instanceof Error ? error.message : "Failed to submit guess",
    };

    // Map specific errors to appropriate HTTP status codes
    if (error instanceof Error && error.message === "Game not found") {
      return res.status(404).json(errorResponse);
    }

    // Client errors: validation failures, game rule violations
    if (
      error instanceof Error &&
      (error.message.includes("must be") || // Word length errors
        error.message.includes("Not a valid") || // Invalid word errors
        error.message.includes("contain only") || // Non-letter characters
        error.message.includes("not in playing") || // Game state errors
        error.message.includes("turn")) // Turn order errors
    ) {
      return res.status(400).json(errorResponse);
    }

    // Default to 500 for unexpected errors
    res.status(500).json(errorResponse);
  }
};

/**
 * GET /api/games/:gameId - Retrieves current game state
 *
 * Used for:
 * - Reconnecting to existing games
 * - Syncing game state across multiple clients
 * - Refreshing UI after network issues
 *
 * Success response (200):
 * - gameState: current client-safe game state
 *
 * Error responses:
 * - 400: Missing game ID
 * - 404: Game not found
 * - 500: Internal server error
 */
export const getGame = (req: Request, res: Response) => {
  try {
    const { gameId } = req.params;

    if (!gameId) {
      const errorResponse: ErrorResponse = {
        error: "Game ID is required",
      };
      return res.status(400).json(errorResponse);
    }

    const gameState = gameService.getGame(gameId);

    if (!gameState) {
      const errorResponse: ErrorResponse = {
        error: "Game not found",
      };
      return res.status(404).json(errorResponse);
    }

    res.json({ gameState });
  } catch (error) {
    const errorResponse: ErrorResponse = {
      error: error instanceof Error ? error.message : "Failed to get game",
    };
    res.status(500).json(errorResponse);
  }
};

/**
 * GET /api/games/:gameId/answer - Retrieves the game's answer
 *
 * Security considerations:
 * - Only returns answer after game completion (won/lost)
 * - For Absurdle: only returns if an answer was actually selected
 *
 * Used for:
 * - Showing solution after game ends
 * - Verifying correct answers in multiplayer
 *
 * Success response (200):
 * - answer: the target word
 *
 * Error responses:
 * - 400: Missing game ID
 * - 404: Game not found or still in progress
 * - 500: Internal server error
 */
export const getGameAnswer = (req: Request, res: Response) => {
  try {
    const { gameId } = req.params;

    if (!gameId) {
      const errorResponse: ErrorResponse = {
        error: "Game ID is required",
      };
      return res.status(400).json(errorResponse);
    }

    const answer = gameService.getGameAnswer(gameId);

    if (answer === null) {
      const errorResponse: ErrorResponse = {
        error: "Game not found or still in progress",
      };
      return res.status(404).json(errorResponse);
    }

    res.json({ answer });
  } catch (error) {
    const errorResponse: ErrorResponse = {
      error:
        error instanceof Error ? error.message : "Failed to get game answer",
    };
    res.status(500).json(errorResponse);
  }
};
