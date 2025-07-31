import type {
  ClientGameState,
  GameConfig,
  StartGameResponse,
  GuessResponse,
  ErrorResponse,
} from "../types/api";

const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://localhost:3001/api";

class ApiService {
  private async handleResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
      const errorData: ErrorResponse = await response.json();
      throw new Error(errorData.error || "API request failed");
    }
    return response.json();
  }

  async createGame(config?: GameConfig): Promise<StartGameResponse> {
    const response = await fetch(`${API_BASE_URL}/games`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(
        config || { maxRounds: 6, wordLength: 5, mode: "single" }
      ),
    });

    return this.handleResponse<StartGameResponse>(response);
  }

  async submitGuess(
    gameId: string,
    guess: string,
    playerId?: string
  ): Promise<GuessResponse> {
    const response = await fetch(`${API_BASE_URL}/games/guess`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ gameId, guess, playerId }),
    });

    return this.handleResponse<GuessResponse>(response);
  }

  async getGame(gameId: string): Promise<{ gameState: ClientGameState }> {
    const response = await fetch(`${API_BASE_URL}/games/${gameId}`);
    return this.handleResponse<{ gameState: ClientGameState }>(response);
  }

  async getGameAnswer(gameId: string): Promise<{ answer: string }> {
    const response = await fetch(`${API_BASE_URL}/games/${gameId}/answer`);
    return this.handleResponse<{ answer: string }>(response);
  }
}

export const apiService = new ApiService();
