import { LevelDefinition } from '../models/types';

// Level 1: Numbers 1-4 (Earth beads only, single rod)
// Target age: 4-5 years old
// Concept: Basic counting and one-to-one correspondence
// NOTE: Max is 4 because we have only 4 earth beads. Number 5 requires the heaven bead.
export const LEVEL_1: LevelDefinition = {
  id: 1,
  name: 'Little Numbers',
  rodCount: 1,
  valueRange: { min: 1, max: 4 },
  useHeavenBead: false, // Only earth beads for this level
  problemTypes: ['REPRESENT_NUMBER', 'COUNT_OBJECTS'],
  objectTypes: ['apple', 'star', 'butterfly', 'fish', 'flower'],
  displayMode: 'objects', // Countable objects for small numbers
  unlockCriteria: null, // Always available - starting level
};

// Level 2: Numbers 1-9 (Introduce heaven bead)
// Target age: 5-6 years old
// Concept: The heaven bead represents 5
export const LEVEL_2: LevelDefinition = {
  id: 2,
  name: 'The Special Bead',
  rodCount: 1,
  valueRange: { min: 1, max: 9 },
  useHeavenBead: true,
  problemTypes: ['REPRESENT_NUMBER', 'COUNT_OBJECTS'],
  objectTypes: ['apple', 'star', 'ball', 'fish', 'flower'],
  displayMode: 'objects', // Still countable objects for single digits
  unlockCriteria: {
    levelId: 1,
    masteryRequired: 70,
  },
};

// Level 3: Place Value - Tens and Ones (10-30)
// Target age: 6-7 years old
// Concept: Two-digit numbers with place value, ten frames for counting
export const LEVEL_3: LevelDefinition = {
  id: 3,
  name: 'Teen Numbers',
  rodCount: 2,
  valueRange: { min: 10, max: 30 },
  useHeavenBead: true,
  problemTypes: ['REPRESENT_NUMBER'],
  objectTypes: [], // Not used for ten frames mode
  displayMode: 'tenFrames', // Dots in vertical ten frames
  unlockCriteria: {
    levelId: 2,
    masteryRequired: 70,
  },
};

// Level 4: Bigger Place Value (10-99)
// Target age: 7-8 years old
// Concept: Full two-digit range with ten frames
export const LEVEL_4_PLACE_VALUE: LevelDefinition = {
  id: 4,
  name: 'Bigger Numbers',
  rodCount: 2,
  valueRange: { min: 10, max: 99 },
  useHeavenBead: true,
  problemTypes: ['REPRESENT_NUMBER'],
  objectTypes: [], // Not used for ten frames mode
  displayMode: 'tenFrames', // Dots in vertical ten frames (2-row layout)
  unlockCriteria: {
    levelId: 3,
    masteryRequired: 70,
  },
};

// === REVERSE MODE LEVELS ===
// Child fills ten frames to match a displayed soroban value

// Level 5: Reverse - Fill ten frame to match soroban (1-10)
// Target age: 5-6 years old
// Concept: Recognize soroban value, represent with ten frame
export const LEVEL_5_REVERSE_BASIC: LevelDefinition = {
  id: 5,
  name: 'Fill the Frame',
  rodCount: 1,
  valueRange: { min: 1, max: 10 },
  useHeavenBead: true,
  problemTypes: ['REPRESENT_NUMBER'],
  objectTypes: [], // Not used for ten frame input mode
  displayMode: 'tenFrameInput',
  unlockCriteria: {
    levelId: 2,
    masteryRequired: 70,
  },
};

// Level 6: Reverse - Fill ten frames to match soroban (10-30)
// Target age: 6-7 years old
// Concept: Two-digit numbers, multiple ten frames
export const LEVEL_6_REVERSE_MEDIUM: LevelDefinition = {
  id: 6,
  name: 'More Frames',
  rodCount: 2,
  valueRange: { min: 10, max: 30 },
  useHeavenBead: true,
  problemTypes: ['REPRESENT_NUMBER'],
  objectTypes: [],
  displayMode: 'tenFrameInput',
  unlockCriteria: {
    levelId: 5,
    masteryRequired: 70,
  },
};

// Level 7: Reverse - Fill ten frames to match soroban (10-99)
// Target age: 7-8 years old
// Concept: Full two-digit range with up to 10 ten frames
export const LEVEL_7_REVERSE_FULL: LevelDefinition = {
  id: 7,
  name: 'Big Numbers',
  rodCount: 2,
  valueRange: { min: 10, max: 99 },
  useHeavenBead: true,
  problemTypes: ['REPRESENT_NUMBER'],
  objectTypes: [],
  displayMode: 'tenFrameInput',
  unlockCriteria: {
    levelId: 6,
    masteryRequired: 70,
  },
};

// === SYMBOLIC MODE LEVELS ===
// Child manipulates soroban, beads fly to digit counters

// Level 8: Symbolic Mode - Basic (10-30)
// Target age: 7-8 years old
// Concept: Match soroban to numeric digits, visual connection
export const LEVEL_8_SYMBOLIC_BASIC: LevelDefinition = {
  id: 8,
  name: 'Number Match',
  rodCount: 2,
  valueRange: { min: 10, max: 30 },
  useHeavenBead: true,
  problemTypes: ['REPRESENT_NUMBER'],
  objectTypes: [],
  displayMode: 'symbolic',
  unlockCriteria: {
    levelId: 4,
    masteryRequired: 70,
  },
};

// Level 9: Symbolic Mode - Full Range (10-99)
// Target age: 8-9 years old
// Concept: Full two-digit symbolic matching
export const LEVEL_9_SYMBOLIC_FULL: LevelDefinition = {
  id: 9,
  name: 'Big Number Match',
  rodCount: 2,
  valueRange: { min: 10, max: 99 },
  useHeavenBead: true,
  problemTypes: ['REPRESENT_NUMBER'],
  objectTypes: [],
  displayMode: 'symbolic',
  unlockCriteria: {
    levelId: 8,
    masteryRequired: 70,
  },
};

// === SYMBOLIC ADVANCED MODE LEVELS ===
// Heaven beads increment counter by 5 directly (no fanning animation)
// For larger numbers where fanning would be too slow

// Level 10: Symbolic Advanced - Three Digits (100-999)
// Target age: 8-9 years old
// Concept: Three-digit numbers with streamlined animation
export const LEVEL_10_SYMBOLIC_3DIGIT: LevelDefinition = {
  id: 10,
  name: 'Hundreds',
  rodCount: 3,
  valueRange: { min: 100, max: 999 },
  useHeavenBead: true,
  problemTypes: ['REPRESENT_NUMBER'],
  objectTypes: [],
  displayMode: 'symbolicAdvanced',
  unlockCriteria: {
    levelId: 9,
    masteryRequired: 70,
  },
};

// Level 11: Symbolic Advanced - Four Digits (1000-9999)
// Target age: 9-10 years old
// Concept: Four-digit numbers with streamlined animation
export const LEVEL_11_SYMBOLIC_4DIGIT: LevelDefinition = {
  id: 11,
  name: 'Thousands',
  rodCount: 4,
  valueRange: { min: 1000, max: 9999 },
  useHeavenBead: true,
  problemTypes: ['REPRESENT_NUMBER'],
  objectTypes: [],
  displayMode: 'symbolicAdvanced',
  unlockCriteria: {
    levelId: 10,
    masteryRequired: 70,
  },
};

// === SYMBOLIC INPUT MODE LEVELS ===
// User inputs digits via number pad to match displayed soroban value

// Level 12: Symbolic Input - Five Digits (10000-99999)
// Target age: 9-10 years old
// Concept: Read soroban, input digits via number pad
export const LEVEL_12_SYMBOLIC_INPUT: LevelDefinition = {
  id: 12,
  name: 'Read & Type',
  rodCount: 5,
  valueRange: { min: 10000, max: 99999 },
  useHeavenBead: true,
  problemTypes: ['REPRESENT_NUMBER'],
  objectTypes: [],
  displayMode: 'symbolicInput',
  unlockCriteria: {
    levelId: 11,
    masteryRequired: 70,
  },
};

// === ADDITION MODE LEVELS ===
// Multi-step addition: enter first number, then add second number

// Level 13: Addition - Three Digits (100-499 + 100-499, sum 200-998)
// Target age: 8-10 years old
// Concept: Basic soroban addition with carries
export const LEVEL_13_ADDITION_3DIGIT: LevelDefinition = {
  id: 13,
  name: 'Addition',
  rodCount: 3,
  valueRange: { min: 200, max: 998 }, // Sum range
  useHeavenBead: true,
  problemTypes: ['ADDITION'],
  objectTypes: [],
  displayMode: 'addition',
  unlockCriteria: {
    levelId: 10,
    masteryRequired: 70,
  },
};

// All levels for easy access
export const ALL_LEVELS: LevelDefinition[] = [
  LEVEL_1,
  LEVEL_2,
  LEVEL_3,
  LEVEL_4_PLACE_VALUE,
  LEVEL_5_REVERSE_BASIC,
  LEVEL_6_REVERSE_MEDIUM,
  LEVEL_7_REVERSE_FULL,
  LEVEL_8_SYMBOLIC_BASIC,
  LEVEL_9_SYMBOLIC_FULL,
  LEVEL_10_SYMBOLIC_3DIGIT,
  LEVEL_11_SYMBOLIC_4DIGIT,
  LEVEL_12_SYMBOLIC_INPUT,
  LEVEL_13_ADDITION_3DIGIT,
];

// Get a level by ID
export function getLevelById(id: number): LevelDefinition | undefined {
  return ALL_LEVELS.find((level) => level.id === id);
}

// Get available (unlocked) levels based on progress
export function getAvailableLevels(
  levelProgress: Map<number, { masteryScore: number }>
): LevelDefinition[] {
  return ALL_LEVELS.filter((level) => {
    if (!level.unlockCriteria) return true; // No criteria = always available

    const prerequisiteProgress = levelProgress.get(level.unlockCriteria.levelId);
    if (!prerequisiteProgress) return false;

    return prerequisiteProgress.masteryScore >= level.unlockCriteria.masteryRequired;
  });
}
