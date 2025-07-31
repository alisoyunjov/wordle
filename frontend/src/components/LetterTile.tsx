import React, { useState, useEffect } from 'react';
import type { LetterState } from '../types/game';
import { cn } from '../lib/utils';

interface LetterTileProps {
  /** The letter character to display */
  letter: string;
  /** The state of the letter (hit/present/miss/empty) */
  state: LetterState;
  /** Size variant for different contexts */
  size?: 'small' | 'medium' | 'large';
  /** Additional CSS classes */
  className?: string;
  /** Whether this tile is currently animating a reveal */
  isRevealing?: boolean;
  /** Delay before starting the reveal animation (for staggered effects) */
  revealDelay?: number;
}

/**
 * Individual letter tile component that displays a single letter with color-coded feedback.
 * Supports animated revealing effects for the classic Wordle experience.
 * 
 * Animation Flow:
 * 1. When revealing starts: immediately show gray "typed" state
 * 2. After revealDelay: begin flip animation
 * 3. Halfway through flip: switch to final color (green/yellow/gray)
 * 4. Complete flip animation
 */
export const LetterTile: React.FC<LetterTileProps> = ({ 
  letter, 
  state, 
  size = 'medium',
  className,
  isRevealing = false,
  revealDelay = 0
}) => {
  // Current visual state being displayed (may differ from actual state during animation)
  const [showingState, setShowingState] = useState<LetterState>(() => {
    return isRevealing && state !== 'empty' ? 'empty' : state;
  });
  
  // Whether the tile is currently in the middle of a flip animation
  const [isFlipping, setIsFlipping] = useState(false);

  /**
   * Handle the revealing animation sequence
   * This effect manages the three-phase animation:
   * 1. Immediate transition to "typed" appearance (gray background)
   * 2. Delayed flip animation start
   * 3. Mid-flip state change to final color
   */
  useEffect(() => {
    if (isRevealing && state !== 'empty') {
      // Phase 1: Immediately show as 'empty' to create the typed appearance
      // This prevents any flash of final colors
      setShowingState('empty');
      
      // Phase 2: Start flip animation after specified delay (for staggered effect)
      const timer = setTimeout(() => {
        setIsFlipping(true);
        
        // Phase 3: Change to final state halfway through flip (250ms into 500ms animation)
        setTimeout(() => {
          setShowingState(state);
        }, 250); // Half of the 500ms flip duration
        
        // Phase 4: Complete the flip animation
        setTimeout(() => {
          setIsFlipping(false);
        }, 500);
      }, revealDelay);

      return () => clearTimeout(timer);
    } else if (!isRevealing) {
      // Non-revealing state: show actual state immediately
      setShowingState(state);
      setIsFlipping(false);
    }
  }, [isRevealing, state, revealDelay]);
  /**
   * Get CSS classes for different letter states
   * Handles the visual feedback for guess results and special revealing state
   */
  const getStateStyles = (state: LetterState): string => {
    switch (state) {
      case 'hit':
        // Correct letter in correct position (green)
        return 'bg-green-500 text-white border-green-500';
      case 'present':
        // Correct letter in wrong position (yellow)
        return 'bg-yellow-500 text-white border-yellow-500';
      case 'miss':
        // Letter not in word (dark gray)
        return 'bg-gray-500 text-white border-gray-500';
      case 'empty':
      default:
        // Special case: revealing animation shows light gray "typed" state
        if (letter && isRevealing) {
          return 'bg-gray-200 border-gray-400 border-2 text-gray-900';
        }
        // Normal empty state: white with border
        return letter 
          ? 'bg-white border-gray-400 border-2 text-gray-900'  // Has letter, not submitted
          : 'bg-white border-gray-300 text-gray-900';           // Truly empty
    }
  };

  /**
   * Get CSS classes for different tile sizes
   * Used for responsive design and different UI contexts
   */
  const getSizeStyles = (size: string): string => {
    switch (size) {
      case 'small':
        return 'w-12 h-12 text-lg';    // Multiplayer mode
      case 'large':
        return 'w-16 h-16 text-2xl';   // Could be used for emphasis
      case 'medium':
      default:
        return 'w-14 h-14 text-xl';    // Standard single-player mode
    }
  };

  return (
    <div
      className={cn(
        // Base styles: square tile with border and centered content
        'border-2 flex items-center justify-center font-bold uppercase',
        // Smooth transitions for non-flip changes (color, border)
        'transition-all duration-200',
        // Apply flip animation class when actively flipping
        isFlipping && 'animate-flip',
        // Dynamic size based on context
        getSizeStyles(size),
        // Dynamic colors based on current showing state (not final state during animation)
        getStateStyles(showingState),
        // Additional custom classes
        className
      )}
      style={{
        // Manual transform for flip animation control
        // Using rotateX for 3D flip effect along horizontal axis
        transform: isFlipping ? 'rotateX(90deg)' : 'rotateX(0deg)',
        // Different transition timing: fast for flip, normal for other changes
        transition: isFlipping ? 'transform 250ms ease-in-out' : 'all 200ms ease-in-out',
      }}
    >
      {letter}
    </div>
  );
}; 