import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Soroban } from '../soroban/Soroban';

interface SorobanDrillProps {
  onBack: () => void;
}

// Belt levels with their colors and requirements
const BELTS = [
  { name: 'White', color: '#F5F5F5', borderColor: '#E0E0E0', requirement: 'Single column, no carries' },
  { name: 'Yellow', color: '#FFEB3B', borderColor: '#FBC02D', requirement: 'Single column, heaven bead' },
  { name: 'Orange', color: '#FF9800', borderColor: '#F57C00', requirement: 'Two columns, simple carry' },
  { name: 'Green', color: '#4CAF50', borderColor: '#388E3C', requirement: 'Two columns with heaven' },
  { name: 'Blue', color: '#2196F3', borderColor: '#1976D2', requirement: 'Three column cascades' },
  { name: 'Purple', color: '#9C27B0', borderColor: '#7B1FA2', requirement: 'Complex multi-column' },
  { name: 'Brown', color: '#795548', borderColor: '#5D4037', requirement: 'Speed challenges' },
  { name: 'Black', color: '#212121', borderColor: '#000000', requirement: 'Master level' },
] as const;

type BeltLevel = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7;

// Problem generation based on belt level
interface DrillProblem {
  startValue: number;
  addend: number;
  targetValue: number;
  rodCount: number;
}

// Analyze what kind of carry pattern an addition requires
function analyzeCarryPattern(start: number, addend: number): {
  columnsAffected: number;
  hasHeavenFlip: boolean;
  hasCarry: boolean;
} {
  const target = start + addend;
  let columnsAffected = 0;
  let hasHeavenFlip = false;
  let hasCarry = false;

  // Check each digit position
  for (let place = 0; place < 6; place++) {
    const placeValue = Math.pow(10, place);
    const startDigit = Math.floor(start / placeValue) % 10;
    const addDigit = Math.floor(addend / placeValue) % 10;
    const targetDigit = Math.floor(target / placeValue) % 10;

    if (addDigit > 0 || startDigit !== targetDigit) {
      columnsAffected++;
    }

    // Check for heaven bead flip (crossing 5 boundary)
    const startHasHeaven = startDigit >= 5;
    const targetHasHeaven = targetDigit >= 5;
    if (startHasHeaven !== targetHasHeaven) {
      hasHeavenFlip = true;
    }

    // Check for carry (sum of digits >= 10)
    if (startDigit + addDigit >= 10) {
      hasCarry = true;
    }
  }

  return { columnsAffected, hasHeavenFlip, hasCarry };
}

// Generate a problem appropriate for the belt level
function generateProblem(belt: BeltLevel): DrillProblem {
  let startValue: number;
  let addend: number;
  let attempts = 0;
  const maxAttempts = 100;

  while (attempts < maxAttempts) {
    attempts++;

    switch (belt) {
      case 0: // White - Single column, no carries, no heaven flip
        // Examples: 21 + 3, 127 + 20, 3451 + 300
        {
          const place = Math.floor(Math.random() * 3); // ones, tens, or hundreds
          const placeValue = Math.pow(10, place);
          const baseDigits = Math.floor(Math.random() * 3) + 1; // 1-3 extra digits
          startValue = Math.floor(Math.random() * Math.pow(10, baseDigits + place)) + placeValue;
          const startDigit = Math.floor(startValue / placeValue) % 10;
          const startEarth = startDigit % 5;
          // Add 1-4 but stay within earth beads and don't cross 5 or 10
          const maxAdd = Math.min(4 - startEarth, 4);
          if (maxAdd < 1) continue;
          addend = (Math.floor(Math.random() * maxAdd) + 1) * placeValue;
        }
        break;

      case 1: // Yellow - Single column, heaven bead flip
        // Examples: 21 + 7, 143 + 50
        {
          const place = Math.floor(Math.random() * 3);
          const placeValue = Math.pow(10, place);
          startValue = Math.floor(Math.random() * 900) + 10 + placeValue;
          const startDigit = Math.floor(startValue / placeValue) % 10;
          // Need to cross 5 but not 10
          if (startDigit < 5) {
            const needed = 5 - startDigit;
            const extra = Math.floor(Math.random() * (9 - 5 - startDigit + 1));
            addend = (needed + extra) * placeValue;
            if (startDigit + Math.floor(addend / placeValue) >= 10) continue;
          } else {
            // Start >= 5, need to go below 5... but we're doing addition only
            // So start with 0-4 and add enough to get to 5-9
            continue; // Skip this case for now
          }
        }
        break;

      case 2: // Orange - Two columns, simple carry (no heaven complexity in the carry)
        // Examples: 12 + 9, 134 + 80
        {
          startValue = Math.floor(Math.random() * 900) + 10;
          const onesDigit = startValue % 10;
          // Need ones to overflow but not involve heaven flips
          if (onesDigit < 5) {
            // Add enough to carry but result stays under 5
            const needed = 10 - onesDigit;
            const extra = Math.floor(Math.random() * Math.min(4, 14 - onesDigit - needed));
            addend = needed + extra;
            if (addend > 9 || addend < 1) continue;
            const resultOnes = (onesDigit + addend) % 10;
            if (resultOnes >= 5) continue; // Would flip heaven
          } else {
            continue; // Skip heaven cases for this belt
          }
        }
        break;

      case 3: // Green - Two columns with heaven bead
        // Examples: 17 + 9, 163 + 80
        {
          startValue = Math.floor(Math.random() * 900) + 10;
          addend = Math.floor(Math.random() * 9) + 1;
          const analysis = analyzeCarryPattern(startValue, addend);
          if (analysis.columnsAffected !== 2 || !analysis.hasHeavenFlip || !analysis.hasCarry) {
            continue;
          }
        }
        break;

      case 4: // Blue - Three column cascades
        // Examples: 192 + 9, 3947 + 60
        {
          startValue = Math.floor(Math.random() * 9000) + 100;
          addend = Math.floor(Math.random() * 90) + 1;
          const analysis = analyzeCarryPattern(startValue, addend);
          if (analysis.columnsAffected < 3) continue;
        }
        break;

      case 5: // Purple - Complex multi-column
        // Examples: 999 + 1, 4567 + 555
        {
          startValue = Math.floor(Math.random() * 9000) + 100;
          addend = Math.floor(Math.random() * 900) + 10;
          const analysis = analyzeCarryPattern(startValue, addend);
          if (analysis.columnsAffected < 3 || !analysis.hasCarry) continue;
        }
        break;

      case 6: // Brown - Speed (same as earlier levels but mixed)
      case 7: // Black - Master (all patterns)
        {
          const subBelt = Math.floor(Math.random() * 6) as BeltLevel;
          return generateProblem(subBelt);
        }

      default:
        startValue = 10;
        addend = 5;
    }

    // Validate the problem
    const target = startValue + addend;
    if (target > 999999) continue; // Too big
    if (addend < 1) continue; // Invalid

    // Calculate rod count needed
    const rodCount = Math.max(
      String(startValue).length,
      String(target).length,
      2 // Minimum 2 rods
    );

    return { startValue, addend, targetValue: target, rodCount };
  }

  // Fallback simple problem
  return { startValue: 23, addend: 4, targetValue: 27, rodCount: 2 };
}

// Game state
type GamePhase = 'ready' | 'playing' | 'correct' | 'incorrect' | 'showAnswer';

export function SorobanDrill({ onBack }: SorobanDrillProps) {
  const [belt, setBelt] = useState<BeltLevel>(0);
  const [problem, setProblem] = useState<DrillProblem>(() => generateProblem(0));
  const [sorobanValue, setSorobanValue] = useState(0);
  const [phase, setPhase] = useState<GamePhase>('ready');
  const [streak, setStreak] = useState(0);
  const [totalCorrect, setTotalCorrect] = useState(0);
  const [totalAttempts, setTotalAttempts] = useState(0);

  // For animating the correct answer
  const [animatingValue, setAnimatingValue] = useState<number | null>(null);
  const sorobanRef = useRef<{ resetToValue: (v: number) => void } | null>(null);

  // Start a new problem
  const newProblem = useCallback(() => {
    const p = generateProblem(belt);
    setProblem(p);
    setSorobanValue(p.startValue);
    setAnimatingValue(null);
    setPhase('playing');
  }, [belt]);

  // Initialize first problem
  useEffect(() => {
    newProblem();
  }, [belt]);

  // Handle commit/check
  const handleCommit = useCallback(() => {
    if (phase !== 'playing') return;

    setTotalAttempts(prev => prev + 1);

    if (sorobanValue === problem.targetValue) {
      // Correct!
      setPhase('correct');
      setStreak(prev => prev + 1);
      setTotalCorrect(prev => prev + 1);

      // Check for belt advancement (10 correct in a row)
      if (streak + 1 >= 10 && belt < 7) {
        setTimeout(() => {
          setBelt(prev => Math.min(7, prev + 1) as BeltLevel);
          setStreak(0);
        }, 300);
      }

      // Quick flash then next problem
      setTimeout(() => {
        newProblem();
      }, 200);
    } else {
      // Incorrect
      setPhase('incorrect');
      setStreak(0);
    }
  }, [phase, sorobanValue, problem.targetValue, streak, belt, newProblem]);

  // Show the correct answer animation
  const handleShowAnswer = useCallback(() => {
    setPhase('showAnswer');
    setAnimatingValue(problem.targetValue);

    // After animation, let them try again or move on
    setTimeout(() => {
      setPhase('playing');
      setAnimatingValue(null);
    }, 1500);
  }, [problem.targetValue]);

  // Try again (reset to start value)
  const handleTryAgain = useCallback(() => {
    setSorobanValue(problem.startValue);
    setAnimatingValue(null);
    setPhase('playing');
  }, [problem.startValue]);

  // Skip to next problem
  const handleSkip = useCallback(() => {
    newProblem();
  }, [newProblem]);

  const currentBelt = BELTS[belt];

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        background: `linear-gradient(135deg, ${currentBelt.color}22 0%, #E8DCC8 50%, ${currentBelt.color}22 100%)`,
        padding: 16,
        paddingBottom: 20,
      }}
    >
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        width: '100%',
        maxWidth: 400,
        marginBottom: 8,
      }}>
        {/* Back button */}
        <motion.button
          onClick={onBack}
          style={{
            width: 36,
            height: 36,
            borderRadius: '50%',
            border: 'none',
            background: '#FFF8E7',
            boxShadow: '0 2px 6px rgba(0,0,0,0.1)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 18,
          }}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
        >
          ←
        </motion.button>

        {/* Belt indicator */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          padding: '6px 12px',
          background: currentBelt.color,
          border: `2px solid ${currentBelt.borderColor}`,
          borderRadius: 16,
          boxShadow: '0 2px 6px rgba(0,0,0,0.12)',
        }}>
          <span style={{
            fontSize: 12,
            fontWeight: 'bold',
            color: belt >= 6 ? 'white' : '#2D1810',
          }}>
            {currentBelt.name} Belt
          </span>
        </div>

        {/* Streak counter */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          padding: '4px 10px',
          background: '#FFF8E7',
          borderRadius: 10,
          boxShadow: '0 2px 6px rgba(0,0,0,0.1)',
        }}>
          <span style={{ fontSize: 18, fontWeight: 'bold', color: '#4CAF50' }}>{streak}</span>
          <span style={{ fontSize: 10, color: '#666' }}>streak</span>
        </div>
      </div>

      {/* Problem display */}
      <motion.div
        style={{
          fontSize: 28,
          fontWeight: 'bold',
          color: '#2D1810',
          marginBottom: 12,
          padding: '8px 20px',
          background: '#FFF8E7',
          borderRadius: 12,
          boxShadow: '0 3px 12px rgba(0,0,0,0.1)',
        }}
        key={problem.addend}
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      >
        + {problem.addend}
      </motion.div>

      {/* Soroban */}
      <div style={{ position: 'relative' }}>
        <Soroban
          rodCount={problem.rodCount}
          initialValue={animatingValue ?? problem.startValue}
          onValueChange={animatingValue === null ? setSorobanValue : undefined}
          disabled={phase === 'showAnswer'}
          size="large"
          showValue={false}
        />

        {/* Feedback overlay */}
        <AnimatePresence>
          {phase === 'correct' && (
            <motion.div
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.5 }}
              style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'rgba(76, 175, 80, 0.3)',
                borderRadius: 12,
              }}
            >
              <span style={{ fontSize: 48, color: '#4CAF50' }}>✓</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Current value display and GO button together */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        marginTop: 12,
      }}>
        <motion.div
          style={{
            fontSize: 32,
            fontWeight: 'bold',
            fontFamily: '"Segoe UI", system-ui, sans-serif',
            color: phase === 'correct' ? '#4CAF50' : phase === 'incorrect' ? '#F44336' : '#2D1810',
            minWidth: 80,
            textAlign: 'center',
          }}
          animate={{
            scale: phase === 'correct' ? [1, 1.2, 1] : phase === 'incorrect' ? [1, 0.9, 1, 0.9, 1] : 1,
          }}
          transition={{ duration: 0.3 }}
        >
          {animatingValue ?? sorobanValue}
        </motion.div>

        {/* GO button - inline */}
        {(phase === 'playing' || phase === 'ready') && (
          <motion.button
            onClick={handleCommit}
            style={{
              width: 100,
              height: 50,
              fontSize: 20,
              fontWeight: 'bold',
              color: 'white',
              background: 'linear-gradient(135deg, #4CAF50 0%, #388E3C 100%)',
              border: 'none',
              borderRadius: 25,
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(76, 175, 80, 0.4)',
            }}
            whileHover={{ scale: 1.05, boxShadow: '0 6px 16px rgba(76, 175, 80, 0.5)' }}
            whileTap={{ scale: 0.95 }}
          >
            GO
          </motion.button>
        )}
      </div>

      {/* Error state buttons */}
      <AnimatePresence>
        {phase === 'incorrect' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            style={{
              display: 'flex',
              gap: 8,
              marginTop: 12,
              flexWrap: 'wrap',
              justifyContent: 'center',
            }}
          >
            <motion.button
              onClick={handleTryAgain}
              style={{
                padding: '8px 16px',
                fontSize: 14,
                fontWeight: 'bold',
                color: '#2D1810',
                background: '#FFF8E7',
                border: '2px solid #8B7355',
                borderRadius: 8,
                cursor: 'pointer',
              }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              Try Again
            </motion.button>
            <motion.button
              onClick={handleShowAnswer}
              style={{
                padding: '8px 16px',
                fontSize: 14,
                fontWeight: 'bold',
                color: 'white',
                background: 'linear-gradient(135deg, #2196F3 0%, #1976D2 100%)',
                border: 'none',
                borderRadius: 8,
                cursor: 'pointer',
              }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              Show Me
            </motion.button>
            <motion.button
              onClick={handleSkip}
              style={{
                padding: '8px 16px',
                fontSize: 14,
                fontWeight: 'bold',
                color: '#666',
                background: '#E0E0E0',
                border: 'none',
                borderRadius: 8,
                cursor: 'pointer',
              }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              Skip
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Stats inline */}
      <div style={{
        marginTop: 12,
        display: 'flex',
        gap: 16,
        fontSize: 11,
        color: '#888',
      }}>
        <span>{totalCorrect}/{totalAttempts} correct</span>
        <span>•</span>
        <span>10 streak to advance</span>
      </div>
    </div>
  );
}
