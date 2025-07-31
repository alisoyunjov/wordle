import express from "express";
import cors from "cors";
import {
  createGame,
  submitGuess,
  getGame,
  getGameAnswer,
} from "./controllers/gameController";

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
  })
);
app.use(express.json());

// Game API routes
app.post("/api/games", createGame);
app.post("/api/games/guess", submitGuess);
app.get("/api/games/:gameId", getGame);
app.get("/api/games/:gameId/answer", getGameAnswer);

// Error handling middleware
app.use((req, res) => {
  res.status(404).json({ error: "Endpoint not found" });
});

// Global error handler
app.use(
  (
    err: Error,
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ) => {
    console.error("Unhandled error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
);

app.listen(PORT, () => {
  console.log(`Wordle server running on port ${PORT}`);
  console.log(`API base URL: http://localhost:${PORT}/api`);
});
