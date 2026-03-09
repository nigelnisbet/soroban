// Complete course structure for mobile app
// 55 levels across 5 tracks

export type LevelType =
  | 'object-matching'      // Show objects, match on soroban
  | 'soroban-reading'      // Show soroban, identify value
  | 'simple-addition'      // Basic single-rod addition/subtraction
  | 'two-digit-addition'   // Multi-rod addition without carrying
  | 'carrying-addition'    // Addition with carrying
  | 'speed-drill'          // Timed manipulation drills
  | 'timed-addition'       // Timed addition challenges
  | 'multiplication';      // Multiplication problems

export interface CourseLevel {
  id: number;
  name: string;
  track: 'foundation' | 'expansion' | 'speed' | 'addition' | 'multiplication';
  type: LevelType;
  description: string;

  // Completion criteria
  problemCount: number;  // How many problems to complete
  passingAccuracy: number;  // 0-100, minimum accuracy to pass

  // Star thresholds (accuracy or time-based)
  stars: {
    bronze: number;  // Minimum to get 1 star
    silver: number;  // Minimum to get 2 stars
    gold: number;    // Minimum to get 3 stars (usually 95%+ or time threshold)
  };

  // XP rewards
  xp: {
    complete: number;
    silver: number;
    gold: number;
  };

  // Level-specific config
  config: {
    rodCount?: number;
    valueRange?: { min: number; max: number };
    allowNegative?: boolean;
    timeLimit?: number;  // seconds (for timed challenges)
    operations?: ('add' | 'subtract' | 'multiply')[];
    beltLevel?: number;  // For speed drill levels (0-7)
    multiplicandDigits?: number;
    multiplierDigits?: number;
  };
}

// ============================================
// FOUNDATION TRACK (Levels 1-10)
// Single rod mastery
// ============================================

const FOUNDATION_LEVELS: CourseLevel[] = [
  {
    id: 1,
    name: 'First Numbers',
    track: 'foundation',
    type: 'object-matching',
    description: 'Match 1-4 objects on the soroban',
    problemCount: 10,
    passingAccuracy: 70,
    stars: { bronze: 70, silver: 85, gold: 95 },
    xp: { complete: 50, silver: 25, gold: 50 },
    config: {
      rodCount: 1,
      valueRange: { min: 1, max: 4 },
    },
  },
  {
    id: 2,
    name: 'Reading Beads',
    track: 'foundation',
    type: 'soroban-reading',
    description: 'Identify values 1-4 on the soroban',
    problemCount: 10,
    passingAccuracy: 70,
    stars: { bronze: 70, silver: 85, gold: 95 },
    xp: { complete: 50, silver: 25, gold: 50 },
    config: {
      rodCount: 1,
      valueRange: { min: 1, max: 4 },
    },
  },
  {
    id: 3,
    name: 'The Heaven Bead',
    track: 'foundation',
    type: 'object-matching',
    description: 'Learn the special bead worth 5',
    problemCount: 10,
    passingAccuracy: 70,
    stars: { bronze: 70, silver: 85, gold: 95 },
    xp: { complete: 50, silver: 25, gold: 50 },
    config: {
      rodCount: 1,
      valueRange: { min: 5, max: 9 },
    },
  },
  {
    id: 4,
    name: 'Reading 5-9',
    track: 'foundation',
    type: 'soroban-reading',
    description: 'Identify all single-digit values',
    problemCount: 10,
    passingAccuracy: 70,
    stars: { bronze: 70, silver: 85, gold: 95 },
    xp: { complete: 50, silver: 25, gold: 50 },
    config: {
      rodCount: 1,
      valueRange: { min: 1, max: 9 },
    },
  },
  {
    id: 5,
    name: 'Simple Addition',
    track: 'foundation',
    type: 'simple-addition',
    description: 'Add without crossing 5',
    problemCount: 10,
    passingAccuracy: 70,
    stars: { bronze: 70, silver: 85, gold: 95 },
    xp: { complete: 50, silver: 25, gold: 50 },
    config: {
      rodCount: 1,
      valueRange: { min: 1, max: 4 },
      operations: ['add'],
    },
  },
  {
    id: 6,
    name: 'Simple Subtraction',
    track: 'foundation',
    type: 'simple-addition',
    description: 'Subtract without crossing 5',
    problemCount: 10,
    passingAccuracy: 70,
    stars: { bronze: 70, silver: 85, gold: 95 },
    xp: { complete: 50, silver: 25, gold: 50 },
    config: {
      rodCount: 1,
      valueRange: { min: 1, max: 4 },
      operations: ['subtract'],
      allowNegative: false,
    },
  },
  {
    id: 7,
    name: 'Adding with 5',
    track: 'foundation',
    type: 'simple-addition',
    description: 'Addition crossing the 5 boundary',
    problemCount: 10,
    passingAccuracy: 70,
    stars: { bronze: 70, silver: 85, gold: 95 },
    xp: { complete: 50, silver: 25, gold: 50 },
    config: {
      rodCount: 1,
      valueRange: { min: 1, max: 9 },
      operations: ['add'],
    },
  },
  {
    id: 8,
    name: 'Subtracting with 5',
    track: 'foundation',
    type: 'simple-addition',
    description: 'Subtraction crossing the 5 boundary',
    problemCount: 10,
    passingAccuracy: 70,
    stars: { bronze: 70, silver: 85, gold: 95 },
    xp: { complete: 50, silver: 25, gold: 50 },
    config: {
      rodCount: 1,
      valueRange: { min: 1, max: 9 },
      operations: ['subtract'],
      allowNegative: false,
    },
  },
  {
    id: 9,
    name: 'Complements to 10',
    track: 'foundation',
    type: 'simple-addition',
    description: 'Practice pairs that make 10',
    problemCount: 10,
    passingAccuracy: 80,
    stars: { bronze: 80, silver: 90, gold: 100 },
    xp: { complete: 75, silver: 25, gold: 50 },
    config: {
      rodCount: 1,
      valueRange: { min: 1, max: 9 },
      operations: ['add'],
    },
  },
  {
    id: 10,
    name: 'Foundation Master',
    track: 'foundation',
    type: 'simple-addition',
    description: 'Mixed single-digit operations',
    problemCount: 15,
    passingAccuracy: 85,
    stars: { bronze: 85, silver: 90, gold: 100 },
    xp: { complete: 100, silver: 50, gold: 100 },
    config: {
      rodCount: 1,
      valueRange: { min: 1, max: 9 },
      operations: ['add', 'subtract'],
      allowNegative: false,
    },
  },
];

// ============================================
// EXPANSION TRACK (Levels 11-20)
// Two rods & place value
// ============================================

const EXPANSION_LEVELS: CourseLevel[] = [
  {
    id: 11,
    name: 'Two Rods',
    track: 'expansion',
    type: 'object-matching',
    description: 'Represent numbers 10-15',
    problemCount: 10,
    passingAccuracy: 70,
    stars: { bronze: 70, silver: 85, gold: 95 },
    xp: { complete: 50, silver: 25, gold: 50 },
    config: {
      rodCount: 2,
      valueRange: { min: 10, max: 15 },
    },
  },
  {
    id: 12,
    name: 'Place Value',
    track: 'expansion',
    type: 'soroban-reading',
    description: 'Read two-digit numbers',
    problemCount: 10,
    passingAccuracy: 70,
    stars: { bronze: 70, silver: 85, gold: 95 },
    xp: { complete: 50, silver: 25, gold: 50 },
    config: {
      rodCount: 2,
      valueRange: { min: 10, max: 99 },
    },
  },
  {
    id: 13,
    name: 'Easy Addition',
    track: 'expansion',
    type: 'two-digit-addition',
    description: 'Add 10-30, no carrying',
    problemCount: 10,
    passingAccuracy: 70,
    stars: { bronze: 70, silver: 85, gold: 95 },
    xp: { complete: 50, silver: 25, gold: 50 },
    config: {
      rodCount: 2,
      valueRange: { min: 10, max: 30 },
      operations: ['add'],
    },
  },
  {
    id: 14,
    name: 'Easy Subtraction',
    track: 'expansion',
    type: 'two-digit-addition',
    description: 'Subtract 10-30, no borrowing',
    problemCount: 10,
    passingAccuracy: 70,
    stars: { bronze: 70, silver: 85, gold: 95 },
    xp: { complete: 50, silver: 25, gold: 50 },
    config: {
      rodCount: 2,
      valueRange: { min: 10, max: 30 },
      operations: ['subtract'],
      allowNegative: false,
    },
  },
  {
    id: 15,
    name: 'Two-Digit Mix',
    track: 'expansion',
    type: 'two-digit-addition',
    description: 'Mixed operations 10-50',
    problemCount: 12,
    passingAccuracy: 75,
    stars: { bronze: 75, silver: 85, gold: 95 },
    xp: { complete: 60, silver: 30, gold: 60 },
    config: {
      rodCount: 2,
      valueRange: { min: 10, max: 50 },
      operations: ['add', 'subtract'],
      allowNegative: false,
    },
  },
  {
    id: 16,
    name: 'Learning to Carry',
    track: 'expansion',
    type: 'carrying-addition',
    description: 'Simple carrying (17 + 8)',
    problemCount: 10,
    passingAccuracy: 70,
    stars: { bronze: 70, silver: 85, gold: 95 },
    xp: { complete: 75, silver: 35, gold: 75 },
    config: {
      rodCount: 2,
      valueRange: { min: 10, max: 99 },
      operations: ['add'],
    },
  },
  {
    id: 17,
    name: 'Learning to Borrow',
    track: 'expansion',
    type: 'carrying-addition',
    description: 'Simple borrowing (23 - 8)',
    problemCount: 10,
    passingAccuracy: 70,
    stars: { bronze: 70, silver: 85, gold: 95 },
    xp: { complete: 75, silver: 35, gold: 75 },
    config: {
      rodCount: 2,
      valueRange: { min: 10, max: 99 },
      operations: ['subtract'],
      allowNegative: false,
    },
  },
  {
    id: 18,
    name: 'Carry & Borrow',
    track: 'expansion',
    type: 'carrying-addition',
    description: 'Mixed two-digit with carry/borrow',
    problemCount: 12,
    passingAccuracy: 75,
    stars: { bronze: 75, silver: 85, gold: 95 },
    xp: { complete: 75, silver: 35, gold: 75 },
    config: {
      rodCount: 2,
      valueRange: { min: 10, max: 99 },
      operations: ['add', 'subtract'],
      allowNegative: false,
    },
  },
  {
    id: 19,
    name: 'Big Numbers',
    track: 'expansion',
    type: 'carrying-addition',
    description: 'Practice with 50-99',
    problemCount: 12,
    passingAccuracy: 75,
    stars: { bronze: 75, silver: 85, gold: 95 },
    xp: { complete: 75, silver: 35, gold: 75 },
    config: {
      rodCount: 2,
      valueRange: { min: 50, max: 99 },
      operations: ['add', 'subtract'],
      allowNegative: false,
    },
  },
  {
    id: 20,
    name: 'Expansion Master',
    track: 'expansion',
    type: 'carrying-addition',
    description: 'Two-digit mastery challenge',
    problemCount: 15,
    passingAccuracy: 85,
    stars: { bronze: 85, silver: 90, gold: 100 },
    xp: { complete: 100, silver: 50, gold: 100 },
    config: {
      rodCount: 2,
      valueRange: { min: 10, max: 99 },
      operations: ['add', 'subtract'],
      allowNegative: false,
    },
  },
];

// ============================================
// SPEED TRACK (Levels 21-35)
// Belt progression - building fluency
// ============================================

const SPEED_LEVELS: CourseLevel[] = [
  // White Belt (21-23)
  { id: 21, name: 'White Belt I', track: 'speed', type: 'speed-drill', description: 'Simple single-column moves', problemCount: 20, passingAccuracy: 75, stars: { bronze: 75, silver: 85, gold: 95 }, xp: { complete: 60, silver: 30, gold: 60 }, config: { beltLevel: 0 } },
  { id: 22, name: 'White Belt II', track: 'speed', type: 'speed-drill', description: 'Build consistency', problemCount: 20, passingAccuracy: 80, stars: { bronze: 80, silver: 90, gold: 95 }, xp: { complete: 60, silver: 30, gold: 60 }, config: { beltLevel: 0 } },
  { id: 23, name: 'White Belt Master', track: 'speed', type: 'speed-drill', description: 'White belt mastery', problemCount: 25, passingAccuracy: 85, stars: { bronze: 85, silver: 92, gold: 98 }, xp: { complete: 75, silver: 40, gold: 75 }, config: { beltLevel: 0 } },

  // Yellow Belt (24-26)
  { id: 24, name: 'Yellow Belt I', track: 'speed', type: 'speed-drill', description: 'Heaven bead transitions', problemCount: 20, passingAccuracy: 75, stars: { bronze: 75, silver: 85, gold: 95 }, xp: { complete: 60, silver: 30, gold: 60 }, config: { beltLevel: 1 } },
  { id: 25, name: 'Yellow Belt II', track: 'speed', type: 'speed-drill', description: 'Smooth heaven moves', problemCount: 20, passingAccuracy: 80, stars: { bronze: 80, silver: 90, gold: 95 }, xp: { complete: 60, silver: 30, gold: 60 }, config: { beltLevel: 1 } },
  { id: 26, name: 'Yellow Belt Master', track: 'speed', type: 'speed-drill', description: 'Yellow belt mastery', problemCount: 25, passingAccuracy: 85, stars: { bronze: 85, silver: 92, gold: 98 }, xp: { complete: 75, silver: 40, gold: 75 }, config: { beltLevel: 1 } },

  // Orange Belt (27-29)
  { id: 27, name: 'Orange Belt I', track: 'speed', type: 'speed-drill', description: 'Two-column carries', problemCount: 20, passingAccuracy: 75, stars: { bronze: 75, silver: 85, gold: 95 }, xp: { complete: 75, silver: 35, gold: 75 }, config: { beltLevel: 2 } },
  { id: 28, name: 'Orange Belt II', track: 'speed', type: 'speed-drill', description: 'Fast carries', problemCount: 20, passingAccuracy: 80, stars: { bronze: 80, silver: 90, gold: 95 }, xp: { complete: 75, silver: 35, gold: 75 }, config: { beltLevel: 2 } },
  { id: 29, name: 'Orange Belt Master', track: 'speed', type: 'speed-drill', description: 'Orange belt mastery', problemCount: 25, passingAccuracy: 85, stars: { bronze: 85, silver: 92, gold: 98 }, xp: { complete: 100, silver: 50, gold: 100 }, config: { beltLevel: 2 } },

  // Green Belt (30-31)
  { id: 30, name: 'Green Belt', track: 'speed', type: 'speed-drill', description: 'Complex two-column patterns', problemCount: 25, passingAccuracy: 80, stars: { bronze: 80, silver: 90, gold: 95 }, xp: { complete: 100, silver: 50, gold: 100 }, config: { beltLevel: 3 } },
  { id: 31, name: 'Green Belt Master', track: 'speed', type: 'speed-drill', description: 'Green belt mastery', problemCount: 30, passingAccuracy: 85, stars: { bronze: 85, silver: 92, gold: 98 }, xp: { complete: 125, silver: 60, gold: 125 }, config: { beltLevel: 3 } },

  // Blue Belt (32)
  { id: 32, name: 'Blue Belt', track: 'speed', type: 'speed-drill', description: 'Three-column cascades', problemCount: 30, passingAccuracy: 85, stars: { bronze: 85, silver: 92, gold: 98 }, xp: { complete: 125, silver: 60, gold: 125 }, config: { beltLevel: 4 } },

  // Purple Belt (33)
  { id: 33, name: 'Purple Belt', track: 'speed', type: 'speed-drill', description: 'Complex multi-column', problemCount: 30, passingAccuracy: 85, stars: { bronze: 85, silver: 92, gold: 98 }, xp: { complete: 150, silver: 75, gold: 150 }, config: { beltLevel: 5 } },

  // Brown Belt (34)
  { id: 34, name: 'Brown Belt', track: 'speed', type: 'speed-drill', description: 'Speed challenges', problemCount: 40, passingAccuracy: 90, stars: { bronze: 90, silver: 95, gold: 98 }, xp: { complete: 175, silver: 85, gold: 175 }, config: { beltLevel: 6 } },

  // Black Belt (35)
  { id: 35, name: 'Black Belt', track: 'speed', type: 'speed-drill', description: 'Master level proficiency', problemCount: 50, passingAccuracy: 90, stars: { bronze: 90, silver: 95, gold: 98 }, xp: { complete: 200, silver: 100, gold: 200 }, config: { beltLevel: 7 } },
];

// ============================================
// ADDITION MASTERY TRACK (Levels 36-45)
// Timed addition challenges
// ============================================

const ADDITION_LEVELS: CourseLevel[] = [
  // 2-digit timed (36-38)
  { id: 36, name: '2-Digit Speed I', track: 'addition', type: 'timed-addition', description: '10 problems under 90 seconds', problemCount: 10, passingAccuracy: 80, stars: { bronze: 90, silver: 75, gold: 60 }, xp: { complete: 75, silver: 40, gold: 75 }, config: { rodCount: 2, timeLimit: 90 } },
  { id: 37, name: '2-Digit Speed II', track: 'addition', type: 'timed-addition', description: '10 problems under 75 seconds', problemCount: 10, passingAccuracy: 85, stars: { bronze: 75, silver: 60, gold: 50 }, xp: { complete: 100, silver: 50, gold: 100 }, config: { rodCount: 2, timeLimit: 75 } },
  { id: 38, name: '2-Digit Speed Master', track: 'addition', type: 'timed-addition', description: '10 problems under 60 seconds', problemCount: 10, passingAccuracy: 90, stars: { bronze: 60, silver: 50, gold: 45 }, xp: { complete: 125, silver: 60, gold: 125 }, config: { rodCount: 2, timeLimit: 60 } },

  // 3-digit timed (39-41)
  { id: 39, name: '3-Digit Speed I', track: 'addition', type: 'timed-addition', description: '10 problems under 120 seconds', problemCount: 10, passingAccuracy: 80, stars: { bronze: 120, silver: 100, gold: 80 }, xp: { complete: 100, silver: 50, gold: 100 }, config: { rodCount: 3, timeLimit: 120 } },
  { id: 40, name: '3-Digit Speed II', track: 'addition', type: 'timed-addition', description: '10 problems under 90 seconds', problemCount: 10, passingAccuracy: 85, stars: { bronze: 90, silver: 75, gold: 65 }, xp: { complete: 125, silver: 60, gold: 125 }, config: { rodCount: 3, timeLimit: 90 } },
  { id: 41, name: '3-Digit Speed Master', track: 'addition', type: 'timed-addition', description: '10 problems under 60 seconds', problemCount: 10, passingAccuracy: 90, stars: { bronze: 60, silver: 50, gold: 45 }, xp: { complete: 150, silver: 75, gold: 150 }, config: { rodCount: 3, timeLimit: 60 } },

  // Rolling addition (42-44)
  { id: 42, name: 'Rolling Addition I', track: 'addition', type: 'timed-addition', description: 'Chain addition practice', problemCount: 10, passingAccuracy: 80, stars: { bronze: 80, silver: 90, gold: 95 }, xp: { complete: 125, silver: 60, gold: 125 }, config: { rodCount: 3, timeLimit: 120 } },
  { id: 43, name: 'Rolling Addition II', track: 'addition', type: 'timed-addition', description: 'Faster rolling chains', problemCount: 10, passingAccuracy: 85, stars: { bronze: 100, silver: 85, gold: 70 }, xp: { complete: 150, silver: 75, gold: 150 }, config: { rodCount: 3, timeLimit: 100 } },
  { id: 44, name: 'Rolling Addition Master', track: 'addition', type: 'timed-addition', description: 'Expert rolling addition', problemCount: 10, passingAccuracy: 90, stars: { bronze: 90, silver: 75, gold: 65 }, xp: { complete: 175, silver: 85, gold: 175 }, config: { rodCount: 3, timeLimit: 90 } },

  // Ultimate challenge (45)
  { id: 45, name: 'The 60-Second Challenge', track: 'addition', type: 'timed-addition', description: '10 mixed 3-digit in 60 seconds', problemCount: 10, passingAccuracy: 100, stars: { bronze: 60, silver: 50, gold: 45 }, xp: { complete: 200, silver: 100, gold: 200 }, config: { rodCount: 3, timeLimit: 60 } },
];

// ============================================
// MULTIPLICATION TRACK (Levels 46-55)
// The summit
// ============================================

const MULTIPLICATION_LEVELS: CourseLevel[] = [
  { id: 46, name: 'Multiply by One', track: 'multiplication', type: 'multiplication', description: 'Practice 2×1 (e.g., 23 × 4)', problemCount: 10, passingAccuracy: 80, stars: { bronze: 80, silver: 90, gold: 100 }, xp: { complete: 100, silver: 50, gold: 100 }, config: { multiplicandDigits: 2, multiplierDigits: 1, rodCount: 3 } },
  { id: 47, name: 'Single Digit Products', track: 'multiplication', type: 'multiplication', description: 'Master 2×1 multiplication', problemCount: 12, passingAccuracy: 85, stars: { bronze: 85, silver: 92, gold: 100 }, xp: { complete: 125, silver: 60, gold: 125 }, config: { multiplicandDigits: 2, multiplierDigits: 1, rodCount: 3 } },

  { id: 48, name: '2×2 Introduction', track: 'multiplication', type: 'multiplication', description: 'Learn 2×2 multiplication', problemCount: 10, passingAccuracy: 75, stars: { bronze: 75, silver: 85, gold: 95 }, xp: { complete: 125, silver: 60, gold: 125 }, config: { multiplicandDigits: 2, multiplierDigits: 2, rodCount: 4 } },
  { id: 49, name: '2×2 Mastery', track: 'multiplication', type: 'multiplication', description: 'Master 2×2 problems', problemCount: 12, passingAccuracy: 80, stars: { bronze: 80, silver: 90, gold: 100 }, xp: { complete: 150, silver: 75, gold: 150 }, config: { multiplicandDigits: 2, multiplierDigits: 2, rodCount: 4 } },

  { id: 50, name: '2×3 Introduction', track: 'multiplication', type: 'multiplication', description: 'Learn 2×3 multiplication', problemCount: 10, passingAccuracy: 75, stars: { bronze: 75, silver: 85, gold: 95 }, xp: { complete: 150, silver: 75, gold: 150 }, config: { multiplicandDigits: 2, multiplierDigits: 3, rodCount: 5 } },
  { id: 51, name: '2×3 Mastery', track: 'multiplication', type: 'multiplication', description: 'Master 2×3 problems', problemCount: 12, passingAccuracy: 80, stars: { bronze: 80, silver: 90, gold: 100 }, xp: { complete: 175, silver: 85, gold: 175 }, config: { multiplicandDigits: 2, multiplierDigits: 3, rodCount: 5 } },

  { id: 52, name: '3×3 Introduction', track: 'multiplication', type: 'multiplication', description: 'Learn 3×3 multiplication', problemCount: 10, passingAccuracy: 75, stars: { bronze: 75, silver: 85, gold: 95 }, xp: { complete: 175, silver: 85, gold: 175 }, config: { multiplicandDigits: 3, multiplierDigits: 3, rodCount: 6 } },
  { id: 53, name: '3×3 Mastery', track: 'multiplication', type: 'multiplication', description: 'Master 3×3 problems', problemCount: 12, passingAccuracy: 80, stars: { bronze: 80, silver: 90, gold: 100 }, xp: { complete: 200, silver: 100, gold: 200 }, config: { multiplicandDigits: 3, multiplierDigits: 3, rodCount: 6 } },

  { id: 54, name: 'Speed Multiplication', track: 'multiplication', type: 'multiplication', description: '5 problems of 2×2 in 90 seconds', problemCount: 5, passingAccuracy: 100, stars: { bronze: 90, silver: 75, gold: 60 }, xp: { complete: 200, silver: 100, gold: 200 }, config: { multiplicandDigits: 2, multiplierDigits: 2, rodCount: 4, timeLimit: 90 } },

  { id: 55, name: 'CAPSTONE', track: 'multiplication', type: 'multiplication', description: '5 problems of 3×3 in 120 seconds', problemCount: 5, passingAccuracy: 100, stars: { bronze: 120, silver: 100, gold: 90 }, xp: { complete: 500, silver: 250, gold: 500 }, config: { multiplicandDigits: 3, multiplierDigits: 3, rodCount: 6, timeLimit: 120 } },
];

// ============================================
// COMBINED LEVEL LIST
// ============================================

export const ALL_COURSE_LEVELS: CourseLevel[] = [
  ...FOUNDATION_LEVELS,
  ...EXPANSION_LEVELS,
  ...SPEED_LEVELS,
  ...ADDITION_LEVELS,
  ...MULTIPLICATION_LEVELS,
];

// Helper function to get level by ID
export function getLevelById(id: number): CourseLevel | undefined {
  return ALL_COURSE_LEVELS.find(level => level.id === id);
}

// Helper to get levels by track
export function getLevelsByTrack(track: CourseLevel['track']): CourseLevel[] {
  return ALL_COURSE_LEVELS.filter(level => level.track === track);
}
