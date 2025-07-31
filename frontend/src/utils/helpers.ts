import type { Guess, KeyState } from "../types/game";

export const updateKeyboardState = (guesses: Guess[]): KeyState => {
  const keyState: KeyState = {};

  guesses.forEach((guess) => {
    guess.forEach((letter) => {
      const char = letter.char.toUpperCase();
      const currentState = keyState[char];

      // Priority: hit > present > miss
      if (letter.state === "hit") {
        keyState[char] = "hit";
      } else if (letter.state === "present" && currentState !== "hit") {
        keyState[char] = "present";
      } else if (letter.state === "miss" && !currentState) {
        keyState[char] = "miss";
      }
    });
  });

  return keyState;
};
