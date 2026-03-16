import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Soroban } from '../soroban/Soroban';
import { MobileGameLayout } from '../layout/MobileGameLayout';

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
  operation: 'add' | 'subtract';
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
  const operation: 'add' | 'subtract' = Math.random() < 0.5 ? 'add' : 'subtract';

  while (attempts < maxAttempts) {
    attempts++;

    switch (belt) {
      case 0: // White - Single column, no carries/borrows, no heaven flip
        // Examples: 21 + 3, 127 + 20, 87 - 4, 145 - 30
        {
          const place = Math.floor(Math.random() * 3); // ones, tens, or hundreds
          const placeValue = Math.pow(10, place);
          const baseDigits = Math.floor(Math.random() * 3) + 1; // 1-3 extra digits

          if (operation === 'add') {
            startValue = Math.floor(Math.random() * Math.pow(10, baseDigits + place)) + placeValue;
            const startDigit = Math.floor(startValue / placeValue) % 10;
            const startEarth = startDigit % 5;
            // Add 1-4 but stay within earth beads and don't cross 5 or 10
            const maxAdd = Math.min(4 - startEarth, 4);
            if (maxAdd < 1) continue;
            addend = (Math.floor(Math.random() * maxAdd) + 1) * placeValue;
          } else {
            // Subtraction - ensure we don't go negative and stay within earth beads
            startValue = Math.floor(Math.random() * Math.pow(10, baseDigits + place)) + placeValue * 2;
            const startDigit = Math.floor(startValue / placeValue) % 10;
            const startEarth = startDigit % 5;
            // Subtract 1-4 but stay within earth beads and don't cross 5 or 0
            const maxSub = Math.min(startEarth, 4);
            if (maxSub < 1) continue;
            addend = (Math.floor(Math.random() * maxSub) + 1) * placeValue;
            // Ensure we don't go negative
            if (startValue - addend < 0) continue;
          }
        }
        break;

      case 1: // Yellow - Single column, heaven bead flip
        // Examples: 21 + 7 (4→11, heaven flip), 87 - 4 (7→3, heaven flip)
        {
          const place = Math.floor(Math.random() * 3);
          const placeValue = Math.pow(10, place);
          startValue = Math.floor(Math.random() * 900) + 10 + placeValue * 2;
          const startDigit = Math.floor(startValue / placeValue) % 10;

          if (operation === 'add') {
            // Need to cross 5 but not 10
            if (startDigit < 5) {
              const needed = 5 - startDigit;
              const extra = Math.floor(Math.random() * (9 - 5 - startDigit + 1));
              addend = (needed + extra) * placeValue;
              if (startDigit + Math.floor(addend / placeValue) >= 10) continue;
            } else {
              continue; // Skip for now
            }
          } else {
            // Subtraction - cross the 5 boundary going down
            if (startDigit >= 5) {
              const maxSub = startDigit - 5 + 1; // Can subtract to cross 5
              addend = (Math.floor(Math.random() * Math.min(maxSub, 4)) + 1) * placeValue;
              if (startValue - addend < 0) continue;
            } else {
              continue; // Need to start >=5 to cross down
            }
          }
        }
        break;

      case 2: // Orange - Two columns, simple carry/borrow
        // Examples: 12 + 9 (carry), 34 - 8 (borrow)
        {
          startValue = Math.floor(Math.random() * 900) + 20;

          if (operation === 'add') {
            const onesDigit = startValue % 10;
            // Need ones to overflow but not involve heaven flips
            if (onesDigit < 5) {
              const needed = 10 - onesDigit;
              const extra = Math.floor(Math.random() * Math.min(4, 14 - onesDigit - needed));
              addend = needed + extra;
              if (addend > 9 || addend < 1) continue;
              const resultOnes = (onesDigit + addend) % 10;
              if (resultOnes >= 5) continue;
            } else {
              continue;
            }
          } else {
            // Subtraction with borrowing
            const onesDigit = startValue % 10;
            // Need to borrow from tens
            if (onesDigit < 5) {
              addend = (Math.floor(Math.random() * (9 - onesDigit)) + onesDigit + 1);
              if (addend > 9) continue;
              if (startValue - addend < 0) continue;
            } else {
              continue;
            }
          }
        }
        break;

      case 3: // Green - Two columns with heaven bead and carry/borrow
        // Examples: 17 + 9, 163 + 80, 72 - 8
        {
          startValue = Math.floor(Math.random() * 900) + 20;
          addend = Math.floor(Math.random() * 9) + 1;

          if (operation === 'subtract' && addend > startValue) continue;

          const target = operation === 'add' ? startValue + addend : startValue - addend;
          if (target < 0) continue;

          const analysis = analyzeCarryPattern(startValue, addend);
          if (analysis.columnsAffected !== 2 || !analysis.hasHeavenFlip || !analysis.hasCarry) {
            continue;
          }
        }
        break;

      case 4: // Blue - Three column cascades
        // Examples: 192 + 9, 3947 + 60, 503 - 48
        {
          startValue = Math.floor(Math.random() * 9000) + 100;
          addend = Math.floor(Math.random() * 90) + 1;

          if (operation === 'subtract' && addend > startValue) continue;
          const target = operation === 'add' ? startValue + addend : startValue - addend;
          if (target < 0) continue;

          const analysis = analyzeCarryPattern(startValue, addend);
          if (analysis.columnsAffected < 3) continue;
        }
        break;

      case 5: // Purple - Complex multi-column
        // Examples: 999 + 1, 4567 + 555, 8234 - 567
        {
          startValue = Math.floor(Math.random() * 9000) + 100;
          addend = Math.floor(Math.random() * 900) + 10;

          if (operation === 'subtract' && addend > startValue) continue;
          const target = operation === 'add' ? startValue + addend : startValue - addend;
          if (target < 0) continue;

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
    const target = operation === 'add' ? startValue + addend : startValue - addend;
    if (target > 999999 || target < 0) continue; // Too big or negative
    if (addend < 1) continue; // Invalid

    // Calculate rod count needed
    const rodCount = Math.max(
      String(startValue).length,
      String(target).length,
      2 // Minimum 2 rods
    );

    return { startValue, addend, targetValue: target, rodCount, operation };
  }

  // Fallback simple problem
  return { startValue: 23, addend: 4, targetValue: 27, rodCount: 2, operation: 'add' };
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

  // Fixed heights matching MobileGameLayout
  const HEADER_HEIGHT = 80;
  const CONTROL_BAR_HEIGHT = 88;
  const SOROBAN_AREA_HEIGHT = 420;

  return (
    <div
      style={{
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        background: `linear-gradient(135deg, ${currentBelt.color}22 0%, #E8DCC8 50%, ${currentBelt.color}22 100%)`,
        paddingTop: 'calc(env(safe-area-inset-top) + 50px)',
      }}
    >
      {/* Header - Fixed height */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '16px 20px',
        height: HEADER_HEIGHT,
        flexShrink: 0,
      }}>
        {/* Back button */}
        <motion.button
          onClick={onBack}
          style={{
            width: 48,
            height: 48,
            borderRadius: '50%',
            border: 'none',
            background: '#FFF8E7',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 24,
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

      {/* Top flexible content area */}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '0 20px',
        overflow: 'auto',
        minHeight: 0,
      }}>
        {/* Problem display */}
        <motion.div
        style={{
          fontSize: 28,
          fontWeight: 'bold',
          color: '#2D1810',
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
        {problem.operation === 'add' ? '+' : '−'} {problem.addend}
      </motion.div>
      </div>

      {/* Fixed Soroban Area - ALWAYS at same position */}
      <div style={{
        height: SOROBAN_AREA_HEIGHT,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        padding: '0 20px',
      }}>
        <div style={{ position: 'relative' }}>
          <Soroban
            rodCount={problem.rodCount}
            initialValue={animatingValue ?? problem.startValue}
            onValueChange={animatingValue === null ? setSorobanValue : undefined}
            disabled={phase === 'showAnswer'}
            size="mobile"
            showValue={true}
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
      </div>

      {/* Bottom control bar - Fixed height */}
      <div
      style={{
        display: 'flex',
        gap: 12,
        padding: '16px 20px',
        paddingBottom: 'max(16px, env(safe-area-inset-bottom))',
        background: 'rgba(255, 248, 231, 0.9)',
        borderTop: '1px solid rgba(0,0,0,0.1)',
        height: CONTROL_BAR_HEIGHT,
        flexShrink: 0,
      }}
    >
      {/* Go button - or error state buttons */}
      {phase === 'incorrect' ? (
        <>
          <motion.button
            onClick={handleTryAgain}
            style={{
              flex: 4,
              height: 56,
              borderRadius: 12,
              background: '#FFF8E7',
              color: '#2D1810',
              border: '2px solid #8B7355',
              fontSize: 16,
              fontWeight: 'bold',
              cursor: 'pointer',
            }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            Try Again
          </motion.button>
          <motion.button
            onClick={handleShowAnswer}
            style={{
              flex: 3,
              height: 56,
              borderRadius: 12,
              background: 'linear-gradient(135deg, #2196F3 0%, #1976D2 100%)',
              color: 'white',
              border: 'none',
              fontSize: 16,
              fontWeight: 'bold',
              cursor: 'pointer',
            }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            Show Me
          </motion.button>
          <motion.button
            onClick={handleSkip}
            style={{
              flex: 3,
              height: 56,
              borderRadius: 12,
              background: '#E0E0E0',
              color: '#666',
              border: 'none',
              fontSize: 16,
              fontWeight: 'bold',
              cursor: 'pointer',
            }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            Skip
          </motion.button>
        </>
      ) : (
        <>
          <motion.button
            onClick={handleCommit}
            disabled={!(phase === 'playing' || phase === 'ready')}
            style={{
              flex: 7,
              height: 56,
              borderRadius: 12,
              background: (phase === 'playing' || phase === 'ready')
                ? 'linear-gradient(135deg, #4CAF50 0%, #2E7D32 100%)'
                : '#BDBDBD',
              color: 'white',
              border: 'none',
              fontSize: 20,
              fontWeight: 'bold',
              cursor: (phase === 'playing' || phase === 'ready') ? 'pointer' : 'not-allowed',
              boxShadow: (phase === 'playing' || phase === 'ready') ? '0 4px 12px rgba(76,175,80,0.4)' : 'none',
            }}
            whileHover={(phase === 'playing' || phase === 'ready') ? { scale: 1.02 } : {}}
            whileTap={(phase === 'playing' || phase === 'ready') ? { scale: 0.98 } : {}}
          >
            GO ➤
          </motion.button>

          <motion.button
            onClick={() => {
              // Reset current problem
              setSorobanValue(problem.startValue);
            }}
            style={{
              flex: 3,
              height: 56,
              borderRadius: 12,
              background: '#FFF8E7',
              color: '#5D4632',
              border: '2px solid #D4C4A8',
              fontSize: 16,
              fontWeight: 'bold',
              cursor: 'pointer',
              boxShadow: '0 2px 6px rgba(0,0,0,0.1)',
            }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            ↻
          </motion.button>
        </>
      )}
      </div>
    </div>
  );
}
