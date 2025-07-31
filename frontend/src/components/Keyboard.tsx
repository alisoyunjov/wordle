import React from 'react';
import type { KeyState } from '../types/game';
import { cn } from '../lib/utils';

interface KeyboardProps {
  keyState: KeyState;
  onKeyPress: (key: string) => void;
  onEnter: () => void;
  onBackspace: () => void;
  disabled?: boolean;
}

const KEYBOARD_ROWS = [
  ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
  ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
  ['ENTER', 'Z', 'X', 'C', 'V', 'B', 'N', 'M', 'BACKSPACE']
];

export const Keyboard: React.FC<KeyboardProps> = ({
  keyState,
  onKeyPress,
  onEnter,
  onBackspace,
  disabled = false
}) => {
  const getKeyStyles = (key: string): string => {
    if (disabled) return 'bg-gray-200 text-gray-400 cursor-not-allowed';
    
    const state = keyState[key];
    switch (state) {
      case 'hit':
        return 'bg-green-500 text-white hover:bg-green-600';
      case 'present':
        return 'bg-yellow-500 text-white hover:bg-yellow-600';
      case 'miss':
        return 'bg-gray-500 text-white hover:bg-gray-600';
      default:
        return 'bg-gray-200 text-gray-900 hover:bg-gray-300';
    }
  };

  const handleKeyClick = (key: string) => {
    if (disabled) return;
    
    if (key === 'ENTER') {
      onEnter();
    } else if (key === 'BACKSPACE') {
      onBackspace();
    } else {
      onKeyPress(key);
    }
  };

  const getKeySize = (key: string): string => {
    if (key === 'ENTER' || key === 'BACKSPACE') {
      return 'px-3 py-3 min-w-[56px] text-sm font-semibold';
    }
    return 'w-9 h-11 text-base font-bold';
  };

  return (
    <div className="max-w-lg mx-auto px-2">
      <div className="space-y-2">
        {KEYBOARD_ROWS.map((row, rowIndex) => (
          <div key={rowIndex} className="flex justify-center gap-2">
            {row.map((key) => (
              <button
                key={key}
                onClick={() => handleKeyClick(key)}
                disabled={disabled}
                className={cn(
                  'rounded uppercase flex items-center justify-center transition-all duration-150 active:transform active:scale-95',
                  getKeySize(key),
                  getKeyStyles(key)
                )}
              >
                {key === 'BACKSPACE' ? '⌫' : key}
              </button>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}; 