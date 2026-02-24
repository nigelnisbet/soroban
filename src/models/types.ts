// Core type definitions for the Soroban Learning App

// === SOROBAN TYPES ===

// State of a single rod on the soroban
export interface RodState {
  rodIndex: number;          // 0 = ones, 1 = tens, etc.
  heavenBeadActive: boolean; // Is the heaven bead pushed down (value = 5)?
  earthBeadsActive: number;  // 0-4, how many earth beads pushed up
}

// Complete soroban state
export interface SorobanState {
  rods: RodState[];
  totalValue: number;
}

// Props for the Soroban component
export interface SorobanProps {
  rodCount: number;
  initialValue?: number;
  onValueChange?: (value: number) => void;
  disabled?: boolean;
  highlightRod?: number;
  showValue?: boolean;
  size?: 'small' | 'medium' | 'large';
}

// === GAME TYPES ===

export type GameState =
  | 'IDLE'
  | 'PRESENTING_PROBLEM'
  | 'AWAITING_INPUT'
  | 'EVALUATING'
  | 'SHOWING_FEEDBACK'
  | 'TRANSITIONING'
  | 'LEVEL_COMPLETE';

export type ProblemType =
  | 'REPRESENT_NUMBER'    // Show this many objects on soroban
  | 'COUNT_OBJECTS'       // Count objects, show on soroban
  | 'ADDITION'            // Visual addition problem
  | 'SUBTRACTION';        // Visual subtraction problem

export type FeedbackType =
  | 'CORRECT'
  | 'INCORRECT'
  | 'CLOSE'               // Off by 1-2
  | 'HINT_LEVEL_1'        // Objects pulse
  | 'HINT_LEVEL_2'        // Counting animation
  | 'HINT_LEVEL_3';       // Highlight beads

// Visual object for problem display
export interface VisualObject {
  id: string;
  type: 'apple' | 'star' | 'butterfly' | 'fish' | 'flower' | 'ball';
  x: number;
  y: number;
}

// A problem to solve
export interface Problem {
  id: string;
  type: ProblemType;
  targetValue: number;
  objects: VisualObject[];
  requiredRods: number;
  // For addition/subtraction problems
  operand1?: number;  // First number (e.g., 427)
  operand2?: number;  // Second number (e.g., 158)
}

// Result of an attempt
export interface AttemptResult {
  problemId: string;
  targetValue: number;
  submittedValue: number;
  isCorrect: boolean;
  attemptNumber: number;
  hintLevel: number;
  timestamp: Date;
}

// === LEVEL TYPES ===

// How numbers are displayed in the problem area
export type DisplayMode =
  | 'objects'           // Countable objects (apples, stars, etc.) - good for 1-9
  | 'tenFrames'         // Dots in vertical ten frames - good for 10-99
  | 'tenFrameInput'     // Interactive ten frames (user fills) to match soroban
  | 'symbolic'          // Numeric digits - beads fly to counters (with heaven bead fanning)
  | 'symbolicAdvanced'  // Numeric digits - heaven beads increment by 5 directly (no fanning)
  | 'symbolicInput'     // Reverse symbolic - user inputs digits via number pad to match soroban
  | 'addition';         // Multi-step addition: enter first number, then add second number

export interface LevelDefinition {
  id: number;
  name: string;
  rodCount: number;
  valueRange: { min: number; max: number };
  useHeavenBead: boolean;
  problemTypes: ProblemType[];
  objectTypes: VisualObject['type'][];
  displayMode: DisplayMode; // How to show numbers in the problem area
  unlockCriteria: {
    levelId: number;
    masteryRequired: number;
  } | null;
}

// === PROGRESS TYPES ===

export type LevelStatus = 'LOCKED' | 'UNLOCKED' | 'IN_PROGRESS' | 'COMPLETED' | 'MASTERED';

export interface LevelProgress {
  levelId: number;
  status: LevelStatus;
  stars: 0 | 1 | 2 | 3;
  attempts: number;
  correctFirstTry: number;
  hintsUsed: number;
  masteryScore: number;
  lastPlayed: Date | null;
}

export interface UserProfile {
  id: string;
  name: string;
  avatar: string;
  createdAt: Date;
  currentLevel: number;
}

// === UI TYPES ===

export interface BeadProps {
  type: 'heaven' | 'earth';
  isActive: boolean;
  onToggle: () => void;
  disabled?: boolean;
  highlighted?: boolean;
  size: number;
}

export interface SorobanRodProps {
  rodIndex: number;
  state: RodState;
  onStateChange: (newState: RodState) => void;
  disabled?: boolean;
  highlighted?: boolean;
  size: 'small' | 'medium' | 'large';
}

// Size configurations
export const SIZES = {
  small: {
    beadSize: 40,
    beadSpacing: 8,
    rodWidth: 56,
    framepadding: 16,
  },
  medium: {
    beadSize: 56,
    beadSpacing: 10,
    rodWidth: 76,
    framepadding: 20,
  },
  large: {
    beadSize: 72,
    beadSpacing: 12,
    rodWidth: 96,
    framepadding: 24,
  },
} as const;

// Calculate total value from rod states
export function calculateSorobanValue(rods: RodState[]): number {
  return rods.reduce((total, rod) => {
    const rodValue = (rod.heavenBeadActive ? 5 : 0) + rod.earthBeadsActive;
    const placeValue = Math.pow(10, rod.rodIndex);
    return total + rodValue * placeValue;
  }, 0);
}

// Convert a number to rod states
export function numberToRodStates(value: number, rodCount: number): RodState[] {
  const rods: RodState[] = [];
  let remaining = value;

  for (let i = 0; i < rodCount; i++) {
    const digit = remaining % 10;
    rods.push({
      rodIndex: i,
      heavenBeadActive: digit >= 5,
      earthBeadsActive: digit % 5,
    });
    remaining = Math.floor(remaining / 10);
  }

  return rods;
}
