import { useState } from "react";
import type { GameConfig } from "../types/api";

interface GameSetupProps {
  onStartGame: (config: GameConfig) => void;
  defaultConfig: GameConfig;
}

export const GameSetup: React.FC<GameSetupProps> = ({
  onStartGame,
  defaultConfig,
}) => {
  const [maxRounds, setMaxRounds] = useState(defaultConfig.maxRounds);

  const handleStartGame = () => {
    onStartGame({
      maxRounds,
      wordLength: defaultConfig.wordLength, 
      mode: defaultConfig.mode,
      playerNames: defaultConfig.playerNames,
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md mx-4 w-full">
        <h2 className="text-2xl font-bold mb-4 text-center">
          {defaultConfig.mode === "multiplayer" ? "Multiplayer" : "Wordle"} Game
          Setup
        </h2>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Number of Rounds: {maxRounds}
          </label>
          <input
            type="range"
            min="2"
            max="10"
            value={maxRounds}
            onChange={(e) => setMaxRounds(Number(e.target.value))}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
          />
          <div className="flex justify-between text-sm text-gray-500 mt-1">
            <span>2</span>
            <span>6</span>
            <span>10</span>
          </div>
        </div>

        {defaultConfig.mode === "multiplayer" && defaultConfig.playerNames && (
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Players:
            </label>
            <div className="text-sm text-gray-600">
              {defaultConfig.playerNames.join(", ")}
            </div>
          </div>
        )}

        <button
          onClick={handleStartGame}
          className="w-full bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
        >
          Start Game
        </button>
      </div>
    </div>
  );
};
