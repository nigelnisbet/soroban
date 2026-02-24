import { Problem, LevelDefinition, VisualObject } from '../models/types';

// Generate a unique ID
function generateId(): string {
  return Math.random().toString(36).substring(2, 9);
}

// Shuffle an array
function shuffle<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

// Generate centered position for objects
function generateObjectPositions(
  count: number,
  arrangement: 'row' | 'grid' | 'random' | 'scattered'
): { x: number; y: number }[] {
  const positions: { x: number; y: number }[] = [];

  // Add padding to keep objects away from edges (in percentage)
  const padding = 15;
  const usableArea = 100 - padding * 2;

  if (arrangement === 'row') {
    // Single row, horizontally centered at vertical middle
    // For better centering, calculate total width needed and center the group
    const objectSpacing = 18; // percentage spacing between objects
    const totalWidth = (count - 1) * objectSpacing;
    const startX = 50 - totalWidth / 2; // Center the row

    for (let i = 0; i < count; i++) {
      const x = startX + i * objectSpacing;
      positions.push({
        x,
        y: 50,
      });
    }
  } else if (arrangement === 'grid') {
    // Grid arrangement, centered
    const cols = Math.ceil(Math.sqrt(count));
    const rows = Math.ceil(count / cols);
    const objectSpacing = 18; // percentage spacing between objects

    // Calculate total dimensions and center the grid
    const totalWidth = (cols - 1) * objectSpacing;
    const totalHeight = (rows - 1) * objectSpacing;
    const startX = 50 - totalWidth / 2;
    const startY = 50 - totalHeight / 2;

    for (let i = 0; i < count; i++) {
      const col = i % cols;
      const row = Math.floor(i / cols);
      positions.push({
        x: startX + col * objectSpacing,
        y: startY + row * objectSpacing,
      });
    }
  } else if (arrangement === 'scattered') {
    // Scattered but centered - use a 3x3 grid centered around the middle
    const gridSize = 3;
    const cellSpacing = 22; // percentage spacing between cell centers
    const jitter = 5; // small random offset

    // Center the grid
    const totalSpan = (gridSize - 1) * cellSpacing;
    const startX = 50 - totalSpan / 2;
    const startY = 50 - totalSpan / 2;

    const availableCells: { x: number; y: number }[] = [];
    for (let row = 0; row < gridSize; row++) {
      for (let col = 0; col < gridSize; col++) {
        availableCells.push({
          x: startX + col * cellSpacing,
          y: startY + row * cellSpacing,
        });
      }
    }

    const shuffled = shuffle(availableCells);
    for (let i = 0; i < count; i++) {
      // Add small random offset for natural feel
      const cell = shuffled[i % shuffled.length];
      positions.push({
        x: cell.x + (Math.random() - 0.5) * jitter,
        y: cell.y + (Math.random() - 0.5) * jitter,
      });
    }
  } else {
    // Random positions within centered area
    for (let i = 0; i < count; i++) {
      positions.push({
        x: padding + Math.random() * usableArea,
        y: padding + Math.random() * usableArea,
      });
    }
  }

  return positions;
}

// Generate visual objects for a problem
function generateObjects(
  count: number,
  objectTypes: VisualObject['type'][],
  arrangement: 'row' | 'grid' | 'random' | 'scattered' = 'scattered'
): VisualObject[] {
  const positions = generateObjectPositions(count, arrangement);
  const objectType = objectTypes[Math.floor(Math.random() * objectTypes.length)];

  return positions.map((pos, index) => ({
    id: generateId(),
    type: objectType,
    x: pos.x,
    y: pos.y,
  }));
}

// Generate an addition problem with two operands
function generateAdditionProblem(level: LevelDefinition): Problem {
  const { rodCount } = level;

  // For 3-digit addition, generate two numbers that sum to 3 digits (100-999)
  // Each operand should be 100-499 to ensure sum stays in range
  const maxOperand = Math.pow(10, rodCount) / 2 - 1; // e.g., 499 for 3 digits
  const minOperand = Math.pow(10, rodCount - 1); // e.g., 100 for 3 digits

  const operand1 = Math.floor(Math.random() * (maxOperand - minOperand + 1)) + minOperand;
  // For operand2, ensure sum doesn't exceed max (999 for 3 digits)
  const maxOperand2 = Math.min(maxOperand, Math.pow(10, rodCount) - 1 - operand1);
  const operand2 = Math.floor(Math.random() * (maxOperand2 - minOperand + 1)) + minOperand;

  const sum = operand1 + operand2;

  return {
    id: generateId(),
    type: 'ADDITION',
    targetValue: sum,
    objects: [],
    requiredRods: rodCount,
    operand1,
    operand2,
  };
}

// Generate a single problem
export function generateProblem(
  level: LevelDefinition,
  forcedValue?: number
): Problem {
  const { valueRange, objectTypes, rodCount, problemTypes } = level;

  // Handle addition problems specially
  if (level.displayMode === 'addition') {
    return generateAdditionProblem(level);
  }

  // Pick a target value (ensure minimum of 1 - zero is not a valid puzzle)
  const rawValue =
    forcedValue ??
    Math.floor(Math.random() * (valueRange.max - valueRange.min + 1)) +
      valueRange.min;
  // Clamp to at least 1, but also respect the level's minimum
  const targetValue = Math.max(1, valueRange.min, rawValue);

  // Pick a problem type
  const problemType =
    problemTypes[Math.floor(Math.random() * problemTypes.length)];

  // Choose arrangement based on count
  let arrangement: 'row' | 'grid' | 'scattered' = 'scattered';
  if (targetValue <= 5) {
    arrangement = 'row';
  } else if (targetValue <= 10) {
    arrangement = Math.random() > 0.5 ? 'grid' : 'scattered';
  }

  const problem = {
    id: generateId(),
    type: problemType,
    targetValue,
    objects: generateObjects(targetValue, objectTypes, arrangement),
    requiredRods: rodCount,
  };

  // DEBUG: Log if we ever generate a zero
  if (targetValue === 0) {
    console.error('[DEBUG ProblemGenerator] Generated problem with targetValue 0!', {
      forcedValue,
      rawValue,
      valueRange,
      problem,
    });
  }

  return problem;
}

// Generate a sequence of problems for a level
export function generateProblemSequence(
  level: LevelDefinition,
  count: number = 10
): Problem[] {
  const problems: Problem[] = [];
  const { valueRange } = level;

  // Generate a balanced set of problems covering the value range
  const range = valueRange.max - valueRange.min + 1;
  const valuesNeeded = Math.min(count, range);

  // First, ensure each value in the range appears at least once
  const values: number[] = [];
  for (let v = valueRange.min; v <= valueRange.max; v++) {
    values.push(v);
  }

  // Shuffle and take what we need
  const shuffledValues = shuffle(values);
  const selectedValues = shuffledValues.slice(0, valuesNeeded);

  // If we need more problems than unique values, add random ones
  while (selectedValues.length < count) {
    selectedValues.push(
      Math.floor(Math.random() * range) + valueRange.min
    );
  }

  // Shuffle the final sequence
  const finalValues = shuffle(selectedValues);

  // Generate problems
  for (const value of finalValues) {
    problems.push(generateProblem(level, value));
  }

  return problems;
}

// Generate an introductory sequence for a new concept
export function generateIntroSequence(
  level: LevelDefinition,
  concept: 'earth_beads' | 'heaven_bead' | 'place_value'
): Problem[] {
  const problems: Problem[] = [];

  switch (concept) {
    case 'earth_beads':
      // Introduce 1, then 2, then 3, etc.
      for (let i = 1; i <= Math.min(5, level.valueRange.max); i++) {
        problems.push(generateProblem(level, i));
        // Add a second problem for each number to reinforce
        if (i <= 3) {
          problems.push(generateProblem(level, i));
        }
      }
      break;

    case 'heaven_bead':
      // First practice 1-4, then introduce 5, then 6-9
      problems.push(generateProblem(level, 4)); // Warmup
      problems.push(generateProblem(level, 5)); // Introduce heaven bead
      problems.push(generateProblem(level, 5)); // Reinforce
      problems.push(generateProblem(level, 6)); // 5 + 1
      problems.push(generateProblem(level, 7)); // 5 + 2
      problems.push(generateProblem(level, 5)); // Back to just 5
      problems.push(generateProblem(level, 8)); // 5 + 3
      problems.push(generateProblem(level, 9)); // 5 + 4
      break;

    case 'place_value':
      // Introduce 10, then teens, then larger
      problems.push(generateProblem(level, 10));
      problems.push(generateProblem(level, 10));
      problems.push(generateProblem(level, 11));
      problems.push(generateProblem(level, 12));
      problems.push(generateProblem(level, 15));
      problems.push(generateProblem(level, 20));
      break;
  }

  return problems;
}
