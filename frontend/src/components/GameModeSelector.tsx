import { useState } from "react";
import type { GameMode } from "../types/api";

interface GameModeSelectorProps {
  onModeSelect: (mode: GameMode, playerNames?: string[]) => void;
}

export const GameModeSelector: React.FC<GameModeSelectorProps> = ({
  onModeSelect,
}) => {
  const [selectedMode, setSelectedMode] = useState<GameMode | null>(null);
  const [playerNames, setPlayerNames] = useState<string[]>(["", ""]);

  const handleModeSelect = (mode: GameMode) => {
    setSelectedMode(mode);
    if (mode === "single" || mode === "absurdle") {
      onModeSelect(mode);
    }
  };

  const handlePlayerNameChange = (index: number, name: string) => {
    const newNames = [...playerNames];
    newNames[index] = name;
    setPlayerNames(newNames);
  };

  const handleMultiplayerStart = () => {
    const validNames = playerNames
      .slice(0, 2) 
      .map((name) => name.trim())
      .filter((name) => name.length > 0);

    if (validNames.length !== 2) {
      alert("Please enter names for all players");
      return;
    }

    onModeSelect("multiplayer", validNames);
  };

  if (selectedMode === "multiplayer") {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 max-w-md mx-4 w-full">
          <h2 className="text-2xl font-bold mb-4 text-center">
            Multiplayer Setup
          </h2>

          <div className="mb-4">
            <div className="space-y-3">
              {playerNames.slice(0, 2).map((name, index) => (
                <div key={index}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Player {index + 1} Name:
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) =>
                      handlePlayerNameChange(index, e.target.value)
                    }
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder={`Enter player ${index + 1} name`}
                    maxLength={20}
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => setSelectedMode(null)}
              className="flex-1 bg-gray-500 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
            >
              Back
            </button>
            <button
              onClick={handleMultiplayerStart}
              className="flex-1 bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
            >
              Start Game
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md mx-4 w-full">
        <h2 className="text-2xl font-bold mb-6 text-center">
          Choose Game Mode
        </h2>

        <div className="space-y-4">
          <button
            onClick={() => handleModeSelect("single")}
            className="w-full cursor-pointer bg-blue-500 hover:bg-blue-700 text-white font-bold py-4 px-6 rounded-lg text-lg focus:outline-none focus:shadow-outline"
          >
            🎮 Normal Wordle
          </button>

          <button
            onClick={() => handleModeSelect("absurdle")}
            className="w-full cursor-pointer bg-red-500 hover:bg-red-700 text-white font-bold py-4 px-6 rounded-lg text-lg focus:outline-none focus:shadow-outline"
          >
            😈 Absurdle
          </button>

          <button
            onClick={() => handleModeSelect("multiplayer")}
            className="w-full cursor-pointer bg-green-500 hover:bg-green-700 text-white font-bold py-4 px-6 rounded-lg text-lg focus:outline-none focus:shadow-outline"
          >
            👥 Multiplayer
          </button>
        </div>
      </div>
    </div>
  );
};
