import React, { useState, useEffect, useRef } from "react";
import type { ClientGameState } from "../types/api";
import { LetterTile } from "./LetterTile";
import { apiService } from "../services/apiService";

interface GameGridProps {
  gameState: ClientGameState;
  wordLength: number;
  onNewGame: () => void;
}

/**
 * GameGrid component renders the grid of letter tiles for Wordle gameplay.
 * Handles single-player, multiplayer and absurdle modes with animated revealing effects.
 * 
 * Key Features:
 * - Animated letter revealing (classic Wordle flip effect)
 * - Responsive layout for different game modes
 */
export const GameGrid: React.FC<GameGridProps> = ({
  gameState,
  wordLength,
  onNewGame,
}) => {
  const { players, currentGuess, maxRounds, mode } = gameState;
  
  // Track which guesses are currently animating their reveal
  const [revealingGuesses, setRevealingGuesses] = useState<Set<string>>(new Set());
  
  // Track previous guess counts to detect new submissions
  const previousGuessCountRef = useRef<{ [playerId: string]: number }>({});
  
  // Track the answer when game is over
  const [answer, setAnswer] = useState<string | null>(null);


  useEffect(() => {
    if ((gameState.gameStatus === "lost" || gameState.gameStatus === "won") && gameState.id) {
      apiService
        .getGameAnswer(gameState.id)
        .then((response) => setAnswer(response.answer))
        .catch((err) => console.error("Failed to get game answer:", err));
    }
  }, [gameState.gameStatus, gameState.id]);


  const currentRevealingGuesses = new Set(revealingGuesses);
  players.forEach((player) => {
    const previousCount = previousGuessCountRef.current[player.id] || 0;
    const currentCount = player.guesses.length;
    
    // If there's a new guess for this player, mark it for revealing immediately
    if (currentCount > previousCount) {
      const newGuessIndex = currentCount - 1;
      const guessKey = `${player.id}-${newGuessIndex}`;
      currentRevealingGuesses.add(guessKey);
    }
  });

  /**
   * This effect runs after render and handles:
   * 1. Updating the persistent revealing state
   * 2. Setting up cleanup timers to remove revealing state after animations complete
   * 3. Updating the ref for next render's comparison
   * 
   * Timing calculation:
   * - Each letter has 200ms delay: last letter starts at (wordLength-1) * 200ms
   * - Each flip takes 500ms to complete
   * - Total time = wordLength * 200 + 500 + 300ms buffer = wordLength * 200 + 800ms
   */
  useEffect(() => {
    const newRevealingGuesses = new Set<string>();
    
    players.forEach((player) => {
      const previousCount = previousGuessCountRef.current[player.id] || 0;
      const currentCount = player.guesses.length;
      
      // Detect new guesses (same logic as synchronous detection above)
      if (currentCount > previousCount) {
        const newGuessIndex = currentCount - 1;
        const guessKey = `${player.id}-${newGuessIndex}`;
        newRevealingGuesses.add(guessKey);
        
        // Schedule cleanup: remove revealing state after all animations complete
        setTimeout(() => {
          setRevealingGuesses(prev => {
            const updated = new Set(prev);
            updated.delete(guessKey);
            return updated;
          });
        }, wordLength * 200 + 800); // Staggered delays (200ms each) + flip duration (500ms) + buffer
      }
      
      // Update ref for next comparison
      previousGuessCountRef.current[player.id] = currentCount;
    });
    
    // Update persistent state for newly detected guesses
    if (newRevealingGuesses.size > 0) {
      setRevealingGuesses(prev => new Set([...prev, ...newRevealingGuesses]));
    }
  }, [players, wordLength]);

  /**
   * Helper function to determine if a specific guess should be revealing
   * Uses the synchronous currentRevealingGuesses to prevent flash
   */
  const isGuessRevealing = (playerId: string, guessIndex: number): boolean => {
    const guessKey = `${playerId}-${guessIndex}`;
    return currentRevealingGuesses.has(guessKey);
  };

  // SINGLE PLAYER MODE RENDERING (includes Absurdle)
  if (mode === "single" || mode === "absurdle") {
    const player = players[0];
    const { guesses } = player;

    // Generate empty rows for future guesses
    const emptyRows = Array.from({ length: maxRounds - guesses.length }, () =>
      Array.from({ length: wordLength }, () => ({
        char: "",
        state: "empty" as const,
      }))
    );

    // Build current guess row (letters being typed)
    const currentGuessRow = Array.from({ length: wordLength }, (_, index) => ({
      char: currentGuess[index] || "",
      state: "empty" as const,
    }));

    // Adjust empty rows: if user is typing, reduce empty rows by 1 to make room
    const finalEmptyRows =
      currentGuess.length > 0 ? emptyRows.slice(1) : emptyRows;

    return (
      <div className="flex flex-col items-center gap-2 py-4">
        {gameState.gameStatus !== "playing" && (
          <div className="mb-4 text-center">
            {gameState.gameStatus === "won" ? (
              <div className="text-xl font-bold text-green-600 mb-4">
                🎉 You won!
              </div>
            ) : (
              <div className="mb-4">
                <div className="text-xl font-bold text-red-600 mb-3">😢 Game Over!</div>
                {answer && (
                  <div className="mt-3 p-4 bg-gradient-to-r from-slate-50 to-gray-50 rounded-lg border border-gray-200 shadow-sm">
                    <div className="text-sm text-gray-600 mb-2 font-medium">The correct word was:</div>
                    <div className="text-2xl font-bold text-gray-900 tracking-wider uppercase">
                      {answer}
                    </div>
                  </div>
                )}
              </div>
            )}
            <button
              onClick={onNewGame}
              className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
            >
              New Game
            </button>
          </div>
        )}

        {/* Show New Game button during play as well */}
        {gameState.gameStatus === "playing" && (
          <div className="mb-2">
            <button
              onClick={onNewGame}
              className="bg-gray-500 hover:bg-gray-700 text-white font-bold py-1 px-3 rounded text-sm focus:outline-none focus:shadow-outline"
            >
              New Game
            </button>
          </div>
        )}

        {/* Completed guesses with revealing animations */}
        {guesses.map((guess, rowIndex) => {
          const isRevealing = isGuessRevealing(player.id, rowIndex);
          const guessKey = `${player.id}-${rowIndex}`;
          
          return (
            <div key={rowIndex} className="flex gap-2">
              {guess.map((letter, letterIndex) => (
                <LetterTile
                  key={`${guessKey}-${letterIndex}`} 
                  letter={letter.char}
                  state={letter.state}
                  isRevealing={isRevealing}
                  revealDelay={letterIndex * 200} // Staggered reveal: 0ms, 200ms, 400ms, 600ms, 800ms
                />
              ))}
            </div>
          );
        })}

        {/* Current guess row (only show if typing) */}
        {currentGuess.length > 0 && (
          <div className="flex gap-2">
            {currentGuessRow.map((letter, letterIndex) => (
              <LetterTile
                key={letterIndex}
                letter={letter.char}
                state={letter.state}
              />
            ))}
          </div>
        )}

        {/* Empty rows for future guesses */}
        {finalEmptyRows.map((row, rowIndex) => (
          <div key={rowIndex + guesses.length} className="flex gap-2">
            {row.map((letter, letterIndex) => (
              <LetterTile
                key={letterIndex}
                letter={letter.char}
                state={letter.state}
              />
            ))}
          </div>
        ))}
      </div>
    );
  }

  // MULTIPLAYER MODE RENDERING
  // Side-by-side player grids with turn-based revealing
  const renderPlayerGrid = (player: typeof players[0], playerIndex: number) => {
    const isCurrentPlayer = gameState.gameStatus === "playing" && gameState.currentPlayerIndex === playerIndex;
    
    const rows = [];

    // Iterate through each round (guess attempt)
    for (let round = 0; round < maxRounds; round++) {
      const guess = player.guesses[round];
      
      // Determine if this round should be revealed
      // Only reveal when BOTH players have submitted guesses for this round
      const bothPlayersHaveGuess = players.every(p => p.guesses.length > round);
      const shouldReveal = bothPlayersHaveGuess && isGuessRevealing(player.id, round);
      
      // Show completed guesses
      if (guess) {
        const guessKey = `${player.id}-${round}`;
        
        rows.push(
          <div key={round} className="flex gap-1 justify-center mb-1">
            {guess.map((letter, letterIndex) => (
              <LetterTile
                key={`${guessKey}-${letterIndex}`}
                letter={letter.char}
                state={bothPlayersHaveGuess ? letter.state : "empty"} // Hide state until both players submit
                size="small"
                isRevealing={shouldReveal}
                revealDelay={letterIndex * 200}
              />
            ))}
          </div>
        );
      }
      // Show current guess being typed (show for current round regardless of which player)
      else if (round === gameState.currentRow && currentGuess.length > 0) {
        const currentGuessRow = Array.from(
          { length: wordLength },
          (_, index) => ({
            char: currentGuess[index] || "",
            state: "empty" as const,
          })
        );

        // Only show current guess for the current player
        if (isCurrentPlayer) {
          rows.push(
            <div key={`current-${round}`} className="flex gap-1 justify-center mb-1">
              {currentGuessRow.map((letter, letterIndex) => (
                <LetterTile
                  key={letterIndex}
                  letter={letter.char}
                  state={letter.state}
                  size="small"
                />
              ))}
            </div>
          );
        } else {
          // Show empty row for non-current player during current round
          const emptyRow = Array.from({ length: wordLength }, () => ({
            char: "",
            state: "empty" as const,
          }));

          rows.push(
            <div key={`waiting-${round}`} className="flex gap-1 justify-center mb-1">
              {emptyRow.map((letter, letterIndex) => (
                <LetterTile
                  key={letterIndex}
                  letter={letter.char}
                  state={letter.state}
                  size="small"
                />
              ))}
            </div>
          );
        }
      }
      // Show empty rows for future guesses
      else if (round >= player.guesses.length) {
        const emptyRow = Array.from({ length: wordLength }, () => ({
          char: "",
          state: "empty" as const,
        }));

        rows.push(
          <div key={`empty-${round}`} className="flex gap-1 justify-center mb-1">
            {emptyRow.map((letter, letterIndex) => (
              <LetterTile
                key={letterIndex}
                letter={letter.char}
                state={letter.state}
                size="small"
              />
            ))}
          </div>
        );
      }
    }

    return (
      <div className="flex flex-col items-center">
        {/* Player name header */}
        <div className={`text-lg font-bold mb-2 px-4 py-1 rounded ${
          isCurrentPlayer ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-600'
        }`}>
          {player.name}
          {isCurrentPlayer && gameState.gameStatus === "playing" && (
            <span className="text-sm ml-2">🎯 Your turn</span>
          )}
          {!isCurrentPlayer && gameState.gameStatus === "playing" && (
            <span className="text-sm ml-2">⏳ Waiting</span>
          )}
          {player.isWinner && !isTie && gameState.gameStatus !== "playing" && (
            <span className="text-sm ml-2">👑 Winner!</span>
          )}
        </div>
        
        {/* Player's grid */}
        <div className="flex flex-col gap-1">
          {rows}
        </div>
      </div>
    );
  };

  // Check for tie condition (both players won on the same round)
  const checkTieCondition = () => {
    if (gameState.gameStatus === "won" && players.filter(p => p.isWinner).length > 1) {
      return true;
    }
    return false;
  };

  const isTie = checkTieCondition();

  // Render multiplayer mode with side-by-side grids
  return (
    <div className="flex flex-col items-center py-4">
      {/* Game status indicator */}
      {gameState.gameStatus !== "playing" && (
        <div className="mb-4 text-center">
          {isTie ? (
            <div className="text-xl font-bold text-orange-600 mb-4">
              🤝 It's a tie! Both players guessed correctly!
            </div>
          ) : gameState.gameStatus === "won" ? (
            <div className="text-xl font-bold text-green-600 mb-4">
              🎉 {players.find(p => p.isWinner)?.name} wins!
            </div>
          ) : (
            <div className="mb-4">
              <div className="text-xl font-bold text-red-600 mb-3">
                😔 Game Over - Nobody guessed the word!
              </div>
              {answer && (
                <div className="mt-3 p-4 bg-gradient-to-r from-slate-50 to-gray-50 rounded-lg border border-gray-200 shadow-sm">
                  <div className="text-sm text-gray-600 mb-2 font-medium">The correct word was:</div>
                  <div className="text-2xl font-bold text-gray-900 tracking-wider uppercase letterspaced">
                    {answer}
                  </div>
                </div>
              )}
            </div>
          )}
          <button
            onClick={onNewGame}
            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
          >
            New Game
          </button>
        </div>
      )}

      {/* Show New Game button during play as well */}
      {gameState.gameStatus === "playing" && (
        <div className="mb-4">
          <button
            onClick={onNewGame}
            className="bg-gray-500 hover:bg-gray-700 text-white font-bold py-1 px-3 rounded text-sm focus:outline-none focus:shadow-outline"
          >
            New Game
          </button>
        </div>
      )}
      
      {/* Side-by-side player grids */}
      <div className="flex gap-8 items-start justify-center max-w-4xl">
        {players.map((player, index) => (
          <div key={player.id}>
            {renderPlayerGrid(player, index)}
          </div>
        ))}
      </div>
    </div>
  );
};
