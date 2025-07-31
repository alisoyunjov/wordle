import { useState, useEffect, useCallback } from "react";
import { GameGrid } from "./components/GameGrid";
import { Keyboard } from "./components/Keyboard";
import { GameSetup } from "./components/GameSetup";
import { GameModeSelector } from "./components/GameModeSelector";
import { Toaster } from "./components/ui/sonner";
import { apiService } from "./services/apiService";
import type { ClientGameState, GameConfig, GameMode } from "./types/api";
import type { Guess } from "./types/game";
import { updateKeyboardState } from "./utils/helpers";
import { toast } from "sonner";

function App() {
  // Core game state from backend
  const [gameState, setGameState] = useState<ClientGameState | null>(null);
  
  // UI state management
  const [keyState, setKeyState] = useState({});          // Keyboard visual feedback
  const [showModeSelector, setShowModeSelector] = useState(true);  // Game mode selection UI
  const [showSetup, setShowSetup] = useState(false);      // Game configuration UI
  const [loading, setLoading] = useState(false);         // API loading states
  
  // Game configuration state
  const [selectedMode, setSelectedMode] = useState<GameMode>("single");
  const [playerNames, setPlayerNames] = useState<string[]>([]);

  /**
   * Update keyboard visual feedback based on all guesses made
   * For multiplayer: only show states from rounds where both players have submitted
   */
  useEffect(() => {
    if (gameState) {
      let allGuesses: Guess[] = [];
      
      if (gameState.mode === "multiplayer") {
        // For multiplayer: only include guesses from completed rounds (both players submitted)
        for (let round = 0; round < gameState.maxRounds; round++) {
          const roundGuesses = gameState.players
            .map(player => player.guesses[round])
            .filter(guess => guess !== undefined);
          
          // Only include guesses if ALL players have submitted for this round
          if (roundGuesses.length === gameState.players.length) {
            allGuesses = [...allGuesses, ...roundGuesses];
          }
        }
      } else {
        // Single player: just use the one player's guesses
        allGuesses = gameState.players[0]?.guesses || [];
      }
      
      setKeyState(updateKeyboardState(allGuesses));
    }
  }, [gameState?.players, gameState?.mode, gameState?.maxRounds]);

  /**
   * Get the current player's ID for multiplayer mode
   * Returns undefined for single-player or absurdle games
   */
  const getCurrentPlayerId = () => {
    if (!gameState || gameState.mode === "single" || gameState.mode === "absurdle") return undefined;
    return gameState.players[gameState.currentPlayerIndex]?.id;
  };

  /**
   * Determine if the current user can make input
   */
  const canInput = () => {
    if (!gameState) return false;
    return gameState.gameStatus === "playing";
  };

  /**
   * Handle letter input from keyboard or on-screen keyboard
   * Guards against invalid input states and length limits
   */
  const handleKeyPress = useCallback(
    (key: string) => {
      // Validate game state - allow input for both players in multiplayer
      if (!gameState || !canInput()) return;

      // Prevent exceeding word length
      if (gameState.currentGuess.length >= gameState.wordLength) return;

      // Add letter to current guess (uppercase for consistency)
      setGameState((prev) =>
        prev
          ? {
              ...prev,
              currentGuess: prev.currentGuess + key.toUpperCase(),
            }
          : null
      );

    },
    [gameState]
  );

  /**
   * Handle backspace input to remove the last typed letter
   * Same validation guards as handleKeyPress
   */
  const handleBackspace = useCallback(() => {
    // Allow backspace for both players in multiplayer
    if (!gameState || !canInput()) return;

    // Remove last character from current guess
    setGameState((prev) =>
      prev
        ? {
            ...prev,
            currentGuess: prev.currentGuess.slice(0, -1),
          }
        : null
    );
  }, [gameState]);

  /**
   * Handle guess submission when user presses Enter
   * 
   * Flow:
   * 1. Validate game state and input completeness
   * 2. Send guess to backend for validation and scoring
   * 3. Update game state with results (triggers revealing animation)
   * 4. Handle any errors from invalid words or network issues
   * 
   * For multiplayer: Backend handles turn validation and advancement.
   * Frontend shows both players' typing but only reveals colors after both submit.
   */
  const handleEnter = useCallback(async () => {
    // Basic validation guards
    if (!gameState || gameState.gameStatus !== "playing")
      return;

    // Validate guess length
    if (gameState.currentGuess.length !== gameState.wordLength) {
      toast.error(`Guess must be ${gameState.wordLength} letters long`);
      return;
    }

    // Validate guess exists
    if (!gameState.currentGuess) {
      toast.error("Please enter a word");
      return;
    }

    setLoading(true); // Show loading state during API call
    try {
      const playerId = getCurrentPlayerId();
      
      // Submit guess to backend for validation and scoring
      const response = await apiService.submitGuess(
        gameState.id,
        gameState.currentGuess,
        playerId
      );
      
      // Update game state with new guess results
      setGameState({
        ...response.gameState,
        currentGuess: "", // Reset current guess for next input
      });
    } catch (err) {
      // Handle API errors (invalid words, network issues, etc.)
      toast.error(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false); // Hide loading state
    }
  }, [gameState]);

  const handleNewGame = useCallback(() => {
    setShowModeSelector(true);
    setGameState(null);
  }, []);

  const handleModeSelect = useCallback(
    async (mode: GameMode, names?: string[]) => {
      setSelectedMode(mode);
      setPlayerNames(names || []);
      setShowModeSelector(false);

      // Show setup for all modes now
      setShowSetup(true);
    },
    []
  );

  const handleStartGame = useCallback(
    async (config: GameConfig) => {
      setLoading(true);
      try {
        const gameConfig: GameConfig = {
          ...config,
          mode: selectedMode,
          playerNames: selectedMode === "multiplayer" ? playerNames : undefined,
        };

        const response = await apiService.createGame(gameConfig);
        setGameState({
          ...response.gameState,
          currentGuess: "",
        });
        setKeyState({});
        setShowSetup(false);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to start game");
      } finally {
        setLoading(false);
      }
    },
    [selectedMode, playerNames]
  );

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (
        !gameState ||
        showModeSelector ||
        showSetup ||
        loading ||
        !canInput()
      )
        return;

      const key = event.key.toUpperCase();

      if (key === "ENTER") {
        handleEnter();
      } else if (key === "BACKSPACE") {
        handleBackspace();
      } else if (/^[A-Z]$/.test(key)) {
        handleKeyPress(key);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [
    gameState,
    showModeSelector,
    showSetup,
    loading,
    handleEnter,
    handleBackspace,
    handleKeyPress,
  ]);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col overflow-hidden">
      <main className="flex-1 flex flex-col min-h-0 overflow-y-auto">
        <div className="flex-1 flex flex-col py-1 px-2">
          {gameState && (
            <>
              <div className="flex-shrink-0">
                <GameGrid
                  gameState={gameState}
                  wordLength={gameState.wordLength}
                  onNewGame={handleNewGame}
                />
              </div>

              <div className="flex-shrink-0">
                <Keyboard
                  keyState={keyState}
                  onKeyPress={handleKeyPress}
                  onEnter={handleEnter}
                  onBackspace={handleBackspace}
                  disabled={loading || !canInput()}
                />
              </div>
            </>
          )}

          {loading && (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-lg text-gray-600">Loading...</div>
            </div>
          )}
        </div>
      </main>

      {showModeSelector && <GameModeSelector onModeSelect={handleModeSelect} />}

      {showSetup && (
        <GameSetup
          onStartGame={handleStartGame}
          defaultConfig={{ maxRounds: 6, wordLength: 5, mode: selectedMode }}
        />
      )}
      
      <Toaster />
    </div>
  );
}

export default App;
