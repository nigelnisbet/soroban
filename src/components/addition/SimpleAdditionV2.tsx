import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Soroban } from '../soroban/Soroban';
import { RodState } from '../../models/types';
import { JiJiCharacter } from '../matching/JiJiCharacter';
import { SimpleAdditionFeedback } from './SimpleAdditionFeedback';
import { SimpleAdditionFeedbackTwo } from './SimpleAdditionFeedbackTwo';

interface SimpleAdditionV2Props {
  onBack: () => void;
}

// Static bead component - rendered at soroban position with full opacity (for beads that haven't flown yet or ghosts)
function StaticBead({
  x,
  y,
  beadSize,
  isHeaven = false,
  opacity = 1,
}: {
  x: number;
  y: number;
  beadSize: number;
  isHeaven?: boolean;
  opacity?: number;
}) {
  const beadHeight = isHeaven ? beadSize * 1.1 : beadSize * 1.0;
  const beadWidth = isHeaven ? beadSize * 1.7 : beadSize * 1.6;
  const activeColor = isHeaven ? '#CD853F' : '#DAA520';
  const activeGradientEnd = isHeaven ? '#8B5A2B' : '#B8860B';

  return (
    <div
      style={{
        position: 'fixed',
        left: x,
        top: y,
        width: beadWidth,
        height: beadHeight,
        marginLeft: -beadWidth / 2,
        marginTop: -beadHeight / 2,
        zIndex: 999,
        opacity,
      }}
    >
      <svg
        width={beadWidth}
        height={beadHeight}
        viewBox={`0 0 ${beadWidth} ${beadHeight}`}
        style={{
          filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))',
        }}
      >
        <defs>
          <linearGradient id={`static-bead-grad-${isHeaven}-${x}-${y}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={activeColor} />
            <stop offset="100%" stopColor={activeGradientEnd} />
          </linearGradient>
          <radialGradient id={`static-hole-gradient-${x}-${y}`}>
            <stop offset="0%" stopColor="#1A0F0A" />
            <stop offset="100%" stopColor="#2D1810" />
          </radialGradient>
        </defs>
        <path
          d={`
            M ${beadWidth / 2} 2
            L ${beadWidth - 4} ${beadHeight / 2}
            L ${beadWidth / 2} ${beadHeight - 2}
            L 4 ${beadHeight / 2}
            Z
          `}
          fill={`url(#static-bead-grad-${isHeaven}-${x}-${y})`}
          stroke="rgba(0,0,0,0.3)"
          strokeWidth="1"
        />
        <circle
          cx={beadWidth / 2}
          cy={beadHeight / 2}
          r={beadSize * 0.12}
          fill={`url(#static-hole-gradient-${x}-${y})`}
          stroke="rgba(0,0,0,0.5)"
          strokeWidth="1"
        />
      </svg>
    </div>
  );
}

// Flying bead component - animates from soroban to counting box
function FlyingBead({
  startX,
  startY,
  targetX,
  targetY,
  beadSize,
  isHeaven = false,
  onArrive,
}: {
  startX: number;
  startY: number;
  targetX: number;
  targetY: number;
  beadSize: number;
  isHeaven?: boolean;
  onArrive?: () => void;
}) {
  const beadHeight = isHeaven ? beadSize * 1.1 : beadSize * 1.0;
  const beadWidth = isHeaven ? beadSize * 1.7 : beadSize * 1.6;
  const activeColor = isHeaven ? '#CD853F' : '#DAA520';
  const activeGradientEnd = isHeaven ? '#8B5A2B' : '#B8860B';

  return (
    <motion.div
      style={{
        position: 'fixed',
        left: startX,
        top: startY,
        width: beadWidth,
        height: beadHeight,
        zIndex: 1100,
        marginLeft: -beadWidth / 2,
        marginTop: -beadHeight / 2,
      }}
      initial={{ x: 0, y: 0, scale: 1, opacity: 1 }}
      animate={{
        x: targetX - startX,
        y: targetY - startY,
        scale: [1, 1.1, 1.1, 1.1, 0],
        opacity: [1, 1, 1, 1, 0],
      }}
      transition={{
        x: {
          duration: 0.5,
          ease: [0.4, 0, 0.2, 1],
        },
        y: {
          duration: 0.5,
          ease: [0.4, 0, 0.2, 1],
        },
        scale: {
          duration: 0.5,
          times: [0, 0.2, 0.8, 0.95, 1],
        },
        opacity: {
          duration: 0.5,
          times: [0, 0.2, 0.8, 0.95, 1],
        },
      }}
      onAnimationComplete={onArrive}
    >
      <svg
        width={beadWidth}
        height={beadHeight}
        viewBox={`0 0 ${beadWidth} ${beadHeight}`}
        style={{
          filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))',
        }}
      >
        <defs>
          <linearGradient id={`flying-bead-grad-${isHeaven}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={activeColor} />
            <stop offset="100%" stopColor={activeGradientEnd} />
          </linearGradient>
          <radialGradient id="flying-hole-gradient">
            <stop offset="0%" stopColor="#1A0F0A" />
            <stop offset="100%" stopColor="#2D1810" />
          </radialGradient>
        </defs>
        <path
          d={`
            M ${beadWidth / 2} 2
            L ${beadWidth - 4} ${beadHeight / 2}
            L ${beadWidth / 2} ${beadHeight - 2}
            L 4 ${beadHeight / 2}
            Z
          `}
          fill={`url(#flying-bead-grad-${isHeaven})`}
          stroke="rgba(0,0,0,0.3)"
          strokeWidth="1"
        />
        <circle
          cx={beadWidth / 2}
          cy={beadHeight / 2}
          r={beadSize * 0.12}
          fill="url(#flying-hole-gradient)"
          stroke="rgba(0,0,0,0.5)"
          strokeWidth="1"
        />
      </svg>
    </motion.div>
  );
}

export function SimpleAdditionV2({ onBack }: SimpleAdditionV2Props) {
  const [sorobanValue, setSorobanValue] = useState(0);
  const [onesValue, setOnesValue] = useState(0); // For two-soroban mode
  const [tensValue, setTensValue] = useState(0); // For two-soroban mode
  const [rodStates, setRodStates] = useState<RodState[]>([]);
  const [tensRodStates, setTensRodStates] = useState<RodState[]>([]);
  const [onesRodStates, setOnesRodStates] = useState<RodState[]>([]);
  const [resetKey, setResetKey] = useState(0);
  const [score, setScore] = useState(0);
  const [countingBoxValue, setCountingBoxValue] = useState<number | null>(null);
  const sorobanRef = useRef<HTMLDivElement>(null);
  const tensSorobanRef = useRef<HTMLDivElement>(null);
  const onesSorobanRef = useRef<HTMLDivElement>(null);
  const [showJiJi, setShowJiJi] = useState(false);
  const [showBlockingGlow, setShowBlockingGlow] = useState(false);
  const [showFullEquation, setShowFullEquation] = useState(false);
  const [showStep1Feedback, setShowStep1Feedback] = useState(false);
  const [showStep2Feedback, setShowStep2Feedback] = useState(false);
  const [animatingTensSoroban, setAnimatingTensSoroban] = useState(false);
  const [animatingOnesSoroban, setAnimatingOnesSoroban] = useState(false);
  const tensBeadsFlownRef = useRef(0); // Track how many beads actually flew from tens
  const [sorobanRect, setSorobanRect] = useState<DOMRect | null>(null);
  const [countingBoxRect, setCountingBoxRect] = useState<DOMRect | null>(null);
  const [bottomBoxRect, setBottomBoxRect] = useState<DOMRect | null>(null);
  const [verificationResult, setVerificationResult] = useState<'correct' | 'incorrect' | null>(null);
  const [showTransitionNumber, setShowTransitionNumber] = useState(false); // For sliding number between steps
  const addend1TransitionRef = useRef<HTMLDivElement>(null); // Target position in step 2
  const targetNumberRef = useRef<HTMLDivElement>(null); // Source position in step 1

  // Generate random addition problem based on score
  // CONSTRAINT: Both addends must be single digits (1-9)
  const generateProblem = () => {
    let sum: number;

    if (score < 10) {
      // Problems 1-10: sums 2-9 (single digit)
      sum = Math.floor(Math.random() * 8) + 2; // 2-9
    } else if (score < 20) {
      // Problems 11-20: sums 10-18 (double digit)
      sum = Math.floor(Math.random() * 9) + 10; // 10-18
    } else {
      // Problems 21+: sums 2-18 (mixed)
      sum = Math.floor(Math.random() * 17) + 2; // 2-18
    }

    // Ensure both addends are 1-9
    const minFirstAddend = Math.max(1, sum - 9); // Can't be less than 1, and second addend can't exceed 9
    const maxFirstAddend = Math.min(9, sum - 1); // Can't exceed 9, and second addend must be at least 1
    const firstAddend = Math.floor(Math.random() * (maxFirstAddend - minFirstAddend + 1)) + minFirstAddend;
    const secondAddend = sum - firstAddend;

    return { firstAddend, secondAddend };
  };

  const [currentProblem, setCurrentProblem] = useState(() => generateProblem());
  const targetAddend = currentProblem.firstAddend;
  const secondAddend = currentProblem.secondAddend;
  const sumIsDoubleDigit = (targetAddend + secondAddend) >= 10;
  const forceTwoSorobanMode = score >= 20; // After problem 20, always use two-soroban in step 2

  const [flyingParticles, setFlyingParticles] = useState<Array<{ id: number; startX: number; startY: number; targetX: number; targetY: number }>>([]);
  const problemAreaRef = useRef<HTMLDivElement>(null);
  const bottomBoxRef = useRef<HTMLDivElement>(null);
  const countingBoxRef = useRef<HTMLDivElement>(null);

  // Flying bead animation state
  const [showGhostBeads, setShowGhostBeads] = useState(false);
  const [ghostBeadPositions, setGhostBeadPositions] = useState<Array<{ x: number; y: number; isHeaven: boolean }>>([]);
  const [flyingBeads, setFlyingBeads] = useState<Array<{ id: number; startX: number; startY: number; targetX: number; targetY: number; isHeaven: boolean }>>([]);
  const [beadAnimationInProgress, setBeadAnimationInProgress] = useState(false);
  const [staticBeadPositions, setStaticBeadPositions] = useState<Array<{ x: number; y: number; isHeaven: boolean }>>([]);
  const [fanBeadPositions, setFanBeadPositions] = useState<Array<{ x: number; y: number }>>([]);
  const [bottomBoxValue, setBottomBoxValue] = useState<number | null>(null);
  const [topBoxValue, setTopBoxValue] = useState<number | null>(null);

  // Debug logging for bottomBoxValue changes
  useEffect(() => {
    console.log('bottomBoxValue changed to:', bottomBoxValue);
  }, [bottomBoxValue]);
  const [showAddend1Objects, setShowAddend1Objects] = useState(false);
  const [showAddend2Objects, setShowAddend2Objects] = useState(false);
  const [hiddenAddend1Indices, setHiddenAddend1Indices] = useState<Set<number>>(new Set());
  const [hiddenAddend2Indices, setHiddenAddend2Indices] = useState<Set<number>>(new Set());
  const [addendAnimationStarted, setAddendAnimationStarted] = useState(false);
  const [isComparingFinal, setIsComparingFinal] = useState(false);
  const [finalVerificationResult, setFinalVerificationResult] = useState<'correct' | 'incorrect' | null>(null);
  const [flyingAddendObjects, setFlyingAddendObjects] = useState<Array<{ id: number; fromAddend: 1 | 2; index: number; startX: number; startY: number }>>([]);
  const [shouldTriggerComparison, setShouldTriggerComparison] = useState(false);
  const jijiAnimationCompleteRef = useRef(false);
  const topBoxRef = useRef<HTMLDivElement>(null);
  const addend1Ref = useRef<HTMLDivElement>(null);
  const addend2Ref = useRef<HTMLDivElement>(null);

  const handleSorobanChange = (value: number) => {
    setSorobanValue(value);
  };

  const handleRodStatesChange = (states: RodState[]) => {
    setRodStates(states);
  };

  const handleTensRodStatesChange = (states: RodState[]) => {
    setTensRodStates(states);
  };

  const handleOnesRodStatesChange = (states: RodState[]) => {
    setOnesRodStates(states);
  };

  const handleStep1FeedbackComplete = () => {
    // Don't set showStep1Feedback to false yet - keep soroban faded
    // We'll clear it when we reset or move to step 2

    // Check if correct
    setTimeout(() => {
      const isCorrect = sorobanValue === targetAddend;
      setVerificationResult(isCorrect ? 'correct' : 'incorrect');

      if (!isCorrect) {
        // If incorrect, show JiJi after number slides up and gets blocked
        setTimeout(() => {
          setShowJiJi(true);
        }, 500);
      } else {
        // If correct, show full equation (soroban will fade back in)
        setTimeout(() => {
          setShowFullEquation(true);
          setShowStep1Feedback(false);
          setVerificationResult(null);
          // Set ones value to match step 1 value for two-soroban mode
          if (sumIsDoubleDigit || forceTwoSorobanMode) {
            setOnesValue(targetAddend);
          }
        }, 1400);
      }
    }, 500);
  };

  const handleStep1BeadArrived = (count: number) => {
    setCountingBoxValue(count);
  };

  const handleStep2FeedbackComplete = () => {
    // Don't clear showStep2Feedback yet - keep soroban faded during comparison

    // Start the addend animation immediately
    setAddendAnimationStarted(true);
    setTimeout(() => {
      animateAddends();
    }, 500);
  };

  const handleStep2BeadArrived = (count: number) => {
    setBottomBoxValue(count);
  };

  const handleTensSorobanComplete = () => {
    // Tens animation done, animate ones soroban
    setAnimatingTensSoroban(false);
    console.log('TENS complete, tensBeadsFlownRef:', tensBeadsFlownRef.current);

    setTimeout(() => {
      if (onesSorobanRef.current) {
        setSorobanRect(onesSorobanRef.current.getBoundingClientRect());
      }
      setAnimatingOnesSoroban(true);
    }, 300);
  };

  const handleTensBeadArrived = (count: number) => {
    // Each tens bead counts as 1 in the counting box (1, 2, 3... 10)
    console.log('TENS bead arrived, count:', count, '→ setting bottomBoxValue to:', count);
    setBottomBoxValue(count);
    // Save the count as we go, so we have the final count when complete
    tensBeadsFlownRef.current = count;
  };

  const handleOnesSorobanComplete = () => {
    // Both sorobans done, now start addend animation
    setAnimatingOnesSoroban(false);
    setShowStep2Feedback(true); // This will trigger handleStep2FeedbackComplete
  };

  const handleOnesBeadArrived = (count: number) => {
    // Count is the incremental bead count from ones soroban (1, 2, 3...)
    // Add to the number of beads that flew from tens place (could be 0 or 10)
    const newValue = tensBeadsFlownRef.current + count;
    console.log('ONES bead arrived, count:', count, 'tensBeadsFlown:', tensBeadsFlownRef.current, '→ setting bottomBoxValue to:', newValue);
    setBottomBoxValue(newValue);
  };

  const animateAddends = () => {
    // Button already disabled before this is called

    // Show first addend objects
    setShowAddend1Objects(true);
    setTopBoxValue(0); // Make top box visible

    // After 800ms, show second addend objects
    setTimeout(() => {
      setShowAddend2Objects(true);
    }, 800);

    // After both are visible (1600ms), start flying them
    setTimeout(() => {
      flyAddendsToBox();
    }, 1600);
  };

  const flyAddendsToBox = () => {
    if (!addend1Ref.current || !addend2Ref.current || !topBoxRef.current) return;

    const addend1Rect = addend1Ref.current.getBoundingClientRect();
    const addend2Rect = addend2Ref.current.getBoundingClientRect();
    const topBoxRect = topBoxRef.current.getBoundingClientRect();
    const targetX = topBoxRect.left + topBoxRect.width / 2;
    const targetY = topBoxRect.top + topBoxRect.height / 2;

    let currentCount = 0;

    // Fly addend 1 objects (1 object)
    for (let i = 0; i < targetAddend; i++) {
      setTimeout(() => {
        const objectId = Date.now() + Math.random();
        const startX = addend1Rect.left + addend1Rect.width / 2;
        const startY = addend1Rect.top - 40; // Above the number

        // Hide this specific static object
        setHiddenAddend1Indices(prev => new Set(prev).add(i));

        setFlyingAddendObjects(prev => [...prev, {
          id: objectId,
          fromAddend: 1,
          index: i,
          startX,
          startY,
        }]);

        // Increment top box when object arrives
        setTimeout(() => {
          currentCount++;
          setTopBoxValue(currentCount);
          setFlyingAddendObjects(prev => prev.filter(obj => obj.id !== objectId));
        }, 500);
      }, i * 600);
    }

    // Fly addend 2 objects (3 objects) after addend 1 is done
    const addend1Delay = targetAddend * 600;
    for (let i = 0; i < secondAddend; i++) {
      setTimeout(() => {
        const objectId = Date.now() + Math.random();
        const startX = addend2Rect.left + addend2Rect.width / 2;
        const startY = addend2Rect.top - 40;

        // Hide this specific static object
        setHiddenAddend2Indices(prev => new Set(prev).add(i));

        setFlyingAddendObjects(prev => [...prev, {
          id: objectId,
          fromAddend: 2,
          index: i,
          startX,
          startY,
        }]);

        setTimeout(() => {
          currentCount++;
          setTopBoxValue(currentCount);
          setFlyingAddendObjects(prev => prev.filter(obj => obj.id !== objectId));

          // If this is the last object, trigger comparison flag
          if (i === secondAddend - 1) {
            setTimeout(() => {
              setShouldTriggerComparison(true);
            }, 800);
          }
        }, 500);
      }, addend1Delay + i * 600);
    }
  };

  // Trigger comparison when both values are ready
  useEffect(() => {
    if (shouldTriggerComparison && topBoxValue !== null && bottomBoxValue !== null) {
      setShouldTriggerComparison(false);
      setIsComparingFinal(true);

      setTimeout(() => {
        // Compare user's answer (bottomBox) to the correct answer (targetAddend + secondAddend)
        const correctAnswer = targetAddend + secondAddend;
        const isCorrect = bottomBoxValue === correctAnswer;
        setFinalVerificationResult(isCorrect ? 'correct' : 'incorrect');

        if (isCorrect) {
          // Success: flash green, fade everything, JiJi flies
          setTimeout(() => {
            jijiAnimationCompleteRef.current = false; // Reset for new JiJi
            setShowJiJi(true);
          }, 1200);
        } else {
          // Failure: JiJi gets blocked
          setTimeout(() => {
            setShowJiJi(true);
          }, 800);
        }
      }, 500);
    }
  }, [shouldTriggerComparison, topBoxValue, bottomBoxValue, targetAddend, secondAddend]);

  const calculateBeadPosition = (beadType: 'heaven' | 'earth', beadIndex?: number): { x: number; y: number } | null => {
    if (!sorobanRef.current) return null;

    const sorobanRect = sorobanRef.current.getBoundingClientRect();

    // Calculate bead position (matching SorobanRod.tsx calculations)
    const beadSize = 42;
    const beadSpacing = 7;
    const framePadding = 14;
    const borderWidth = 4;

    const heavenSectionHeight = beadSize * 2.0 + beadSpacing * 3;
    const dividerHeight = 16;
    const earthSectionStart = heavenSectionHeight + dividerHeight;

    const contentTop = sorobanRect.top + borderWidth + framePadding;
    const rodCenterX = sorobanRect.left + sorobanRect.width / 2;

    let beadY: number;
    if (beadType === 'heaven') {
      const heavenBeadActiveY = heavenSectionHeight - beadSize - beadSpacing;
      const heavenBeadHeight = beadSize * 1.1;
      beadY = contentTop + heavenBeadActiveY + heavenBeadHeight / 2;
    } else {
      // Earth bead
      const actualEarthBeadHeight = beadSize * 1.0;
      const stackSpacing = beadSpacing * 0.8;
      const beadYLocal = earthSectionStart + beadSpacing * 1.5 + (beadIndex || 0) * (actualEarthBeadHeight + stackSpacing);
      beadY = contentTop + beadYLocal + actualEarthBeadHeight / 2;
    }

    return { x: rodCenterX, y: beadY };
  };

  // Legacy particle animation for step 2 (will be replaced later)
  const spawnParticle = (beadType: 'heaven' | 'earth', beadIndex?: number) => {
    const targetRef = showFullEquation ? bottomBoxRef.current : problemAreaRef.current;
    if (!targetRef) return;

    const beadPos = calculateBeadPosition(beadType, beadIndex);
    if (!beadPos) return;

    const targetRect = targetRef.getBoundingClientRect();
    const targetX = targetRect.left + targetRect.width / 2;
    const targetY = targetRect.top + targetRect.height / 2;

    // Add particle
    const particleId = Date.now() + Math.random();
    setFlyingParticles(prev => [...prev, {
      id: particleId,
      startX: beadPos.x,
      startY: beadPos.y,
      targetX,
      targetY,
    }]);

    // Remove particle after animation
    setTimeout(() => {
      setFlyingParticles(prev => prev.filter(p => p.id !== particleId));
    }, 600);
  };

  const flyBeadToCountingBox = (beadType: 'heaven' | 'earth', beadIndex?: number): { targetX: number; targetY: number } | null => {
    const targetRef = showFullEquation ? bottomBoxRef.current : countingBoxRef.current;
    if (!targetRef) return null;

    const beadPos = calculateBeadPosition(beadType, beadIndex);
    if (!beadPos) return null;

    const targetRect = targetRef.getBoundingClientRect();
    const targetX = targetRect.left + targetRect.width / 2;
    const targetY = targetRect.top + targetRect.height / 2;

    // Remove this bead from static beads (it's about to fly)
    setStaticBeadPositions(prev => {
      // Find and remove the first matching bead
      const index = prev.findIndex(b =>
        Math.abs(b.x - beadPos.x) < 1 &&
        Math.abs(b.y - beadPos.y) < 1
      );
      if (index >= 0) {
        return [...prev.slice(0, index), ...prev.slice(index + 1)];
      }
      return prev;
    });

    // Add ghost bead at this position (will remain after flying bead disappears)
    setGhostBeadPositions(prev => [...prev, {
      x: beadPos.x,
      y: beadPos.y,
      isHeaven: beadType === 'heaven'
    }]);

    // Create flying bead with target coordinates
    const beadId = Date.now() + Math.random();
    setFlyingBeads(prev => [...prev, {
      id: beadId,
      startX: beadPos.x,
      startY: beadPos.y,
      targetX,
      targetY,
      isHeaven: beadType === 'heaven',
    }]);

    // Remove flying bead after animation
    setTimeout(() => {
      setFlyingBeads(prev => prev.filter(b => b.id !== beadId));
    }, 600);

    return { targetX, targetY };
  };

  const flyFanBeadToCountingBox = (fanBeadIndex: number): { targetX: number; targetY: number } | null => {
    const targetRef = showFullEquation ? bottomBoxRef.current : countingBoxRef.current;
    if (!targetRef) return null;

    if (fanBeadIndex < 0 || fanBeadIndex >= fanBeadPositions.length) return null;

    const beadPos = fanBeadPositions[fanBeadIndex];
    const targetRect = targetRef.getBoundingClientRect();
    const targetX = targetRect.left + targetRect.width / 2;
    const targetY = targetRect.top + targetRect.height / 2;

    // Remove this fan bead from static beads (it's about to fly)
    setStaticBeadPositions(prev => {
      const index = prev.findIndex(b =>
        Math.abs(b.x - beadPos.x) < 1 &&
        Math.abs(b.y - beadPos.y) < 1
      );
      if (index >= 0) {
        return [...prev.slice(0, index), ...prev.slice(index + 1)];
      }
      return prev;
    });

    // Add ghost bead at fan position (will remain after flying bead disappears)
    setGhostBeadPositions(prev => [...prev, {
      x: beadPos.x,
      y: beadPos.y,
      isHeaven: false // Fan beads are earth beads
    }]);

    // Create flying bead with target coordinates
    const beadId = Date.now() + Math.random();
    setFlyingBeads(prev => [...prev, {
      id: beadId,
      startX: beadPos.x,
      startY: beadPos.y,
      targetX,
      targetY,
      isHeaven: false, // Fan beads are earth beads
    }]);

    // Remove flying bead after animation
    setTimeout(() => {
      setFlyingBeads(prev => prev.filter(b => b.id !== beadId));
    }, 600);

    return { targetX, targetY };
  };

  const handleGo = () => {
    // Prevent double-clicks or clicks during animation
    if (showStep1Feedback || showStep2Feedback) return;

    const rod = rodStates[0]; // Single rod
    if (!rod) return;

    // Step 1: Use feedback component
    if (!showFullEquation) {
      // Get fresh rects
      if (sorobanRef.current) {
        setSorobanRect(sorobanRef.current.getBoundingClientRect());
      }
      if (countingBoxRef.current) {
        setCountingBoxRect(countingBoxRef.current.getBoundingClientRect());
      }
      setShowStep1Feedback(true);
      return;
    }

    // Step 2: Use feedback component for bottom box
    if (showFullEquation) {
      setBottomBoxValue(0); // Make bottom box visible

      if (sumIsDoubleDigit || forceTwoSorobanMode) {
        // Two-soroban mode: start animation (handles both tens and ones internally)
        if (sorobanRef.current) {
          setSorobanRect(sorobanRef.current.getBoundingClientRect());
        }
        if (bottomBoxRef.current) {
          setBottomBoxRect(bottomBoxRef.current.getBoundingClientRect());
        }
        setAnimatingTensSoroban(true); // Trigger the two-soroban feedback
      } else {
        // Single-soroban mode
        if (sorobanRef.current) {
          setSorobanRect(sorobanRef.current.getBoundingClientRect());
        }
        if (bottomBoxRef.current) {
          setBottomBoxRect(bottomBoxRef.current.getBoundingClientRect());
        }
        setShowStep2Feedback(true);
      }
      return;
    }

  };

  const handleReset = (loadNewProblem = false) => {
    setResetKey(prev => prev + 1);
    setCountingBoxValue(null);
    setBottomBoxValue(null);
    setTopBoxValue(null);
    setVerificationResult(null);
    setShowJiJi(false);
    setShowBlockingGlow(false);
    setShowFullEquation(false);
    setShowAddend1Objects(false);
    setShowAddend2Objects(false);
    setFlyingAddendObjects([]);
    setHiddenAddend1Indices(new Set());
    setHiddenAddend2Indices(new Set());
    setAddendAnimationStarted(false);
    setIsComparingFinal(false);
    setFinalVerificationResult(null);
    setShouldTriggerComparison(false);
    setShowStep1Feedback(false);
    setShowStep2Feedback(false);
    setAnimatingTensSoroban(false);
    setAnimatingOnesSoroban(false);
    tensBeadsFlownRef.current = 0;
    setSorobanRect(null);
    setCountingBoxRect(null);
    setBottomBoxRect(null);
    setOnesValue(0);
    setTensValue(0);
    // Don't reset jijiAnimationCompleteRef here - it stays true until next JiJi shows

    // Only generate new problem if explicitly requested (on success)
    if (loadNewProblem) {
      setCurrentProblem(generateProblem());
    }
  };

  const handleJiJiBlocked = () => {
    // Show red glow on blocking number
    setShowBlockingGlow(true);

    // Hide JiJi and reset after a delay
    setTimeout(() => {
      setShowJiJi(false);
      setShowBlockingGlow(false);
      jijiAnimationCompleteRef.current = false;
      handleReset(false);
    }, 1500);
  };

  const handleJiJiAnimationComplete = () => {
    // Prevent multiple calls from the same JiJi animation
    if (!showJiJi || jijiAnimationCompleteRef.current) {
      return;
    }

    // Set flag IMMEDIATELY to block any concurrent calls
    jijiAnimationCompleteRef.current = true;

    // Reset and load next problem after JiJi animation
    if (verificationResult === 'incorrect' || finalVerificationResult === 'incorrect') {
      // Incorrect: wait a bit then reset SAME problem
      setTimeout(() => {
        jijiAnimationCompleteRef.current = false; // Reset flag for next attempt
        handleReset(false);
      }, 1000);
    } else if (finalVerificationResult === 'correct') {
      // Correct: celebrate then load NEXT problem
      setTimeout(() => {
        setScore(prev => prev + 1);
        handleReset(true);
      }, 1000);
    }
  };


  // Enable GO button only if soroban has a value > 0 and not showing feedback or verifying
  // For step 2, button is enabled as soon as soroban changes from initial state
  // Once addend animation starts, disable button permanently for this round
  const goButtonEnabled = !showStep1Feedback && !showStep2Feedback && !verificationResult && !addendAnimationStarted && (
    !showFullEquation
      ? sorobanValue > 0
      : (showFullEquation && (sumIsDoubleDigit || forceTwoSorobanMode))
        ? (onesValue > 0 || tensValue > 0) // Two-soroban mode: any touch enables button
        : (sorobanValue !== targetAddend && sorobanValue > 0) // Single-soroban mode: change from initial
  );

  return (
    <div
      style={{
        height: '100vh',
        width: '100vw',
        display: 'flex',
        flexDirection: 'column',
        background: 'linear-gradient(135deg, #E8DCC8 0%, #D4C4A8 100%)',
        paddingTop: 'max(env(safe-area-inset-top), 20px)',
        paddingBottom: 'max(env(safe-area-inset-bottom), 20px)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Header with back button and score */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '16px 20px',
          flexShrink: 0,
        }}
      >
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

        {/* Center spacer */}
        <div style={{ flex: 1 }} />

        {/* Score/Stars display */}
        <div
          style={{
            fontSize: 28,
            fontWeight: 'bold',
            color: '#DAA520',
          }}
        >
          ⭐ {score}
        </div>
      </div>

      {/* Problem Area - Step 1: Show first addend with counting box */}
      <div
        ref={problemAreaRef}
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px',
          minHeight: 0,
          position: 'relative', // So absolute children position relative to this
        }}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 16,
          }}
        >
          {/* Equation display */}
          <motion.div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 16,
              fontSize: 64,
              fontWeight: 'bold',
              color: '#2D1810',
            }}
            animate={{
              opacity: isComparingFinal
                  ? (finalVerificationResult === 'incorrect' ? 0.3 : (finalVerificationResult === 'correct' ? 0 : 1))
                  : 1
            }}
            transition={{ duration: 0.3 }}
          >
            {/* First addend - stays in place, equation builds around it */}
            <motion.div ref={addend1Ref} style={{ position: 'relative' }}>
              <span ref={addend1TransitionRef}>{targetAddend}</span>
              {/* Green objects above first addend - two rows */}
              {showAddend1Objects && (
                <div style={{
                  position: 'absolute',
                  top: -35,
                  left: '50%',
                  transform: 'translateX(-50%)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 4
                }}>
                  {/* Top row - ceil(count/2) items */}
                  <div style={{ display: 'flex', gap: 4 }}>
                    {Array.from({ length: Math.ceil(targetAddend / 2) }).map((_, i) => (
                      !hiddenAddend1Indices.has(i) && (
                        <motion.div
                          key={i}
                          style={{
                            width: 20,
                            height: 20,
                            borderRadius: '50%',
                            background: '#4CAF50',
                            boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                          }}
                          initial={{ scale: 0, y: 20 }}
                          animate={{ scale: 1, y: 0 }}
                          transition={{ delay: i * 0.1, type: 'spring', stiffness: 300, damping: 15 }}
                        />
                      )
                    ))}
                  </div>
                  {/* Bottom row - floor(count/2) items */}
                  {targetAddend > 1 && (
                    <div style={{ display: 'flex', gap: 4 }}>
                      {Array.from({ length: Math.floor(targetAddend / 2) }).map((_, i) => {
                        const actualIndex = Math.ceil(targetAddend / 2) + i;
                        return !hiddenAddend1Indices.has(actualIndex) && (
                          <motion.div
                            key={actualIndex}
                            style={{
                              width: 20,
                              height: 20,
                              borderRadius: '50%',
                              background: '#4CAF50',
                              boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                            }}
                            initial={{ scale: 0, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            transition={{ delay: actualIndex * 0.1, type: 'spring', stiffness: 300, damping: 15 }}
                          />
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </motion.div>

            {/* Rest of equation - appears after 1 slides */}
            {showFullEquation && (
              <>
                <motion.div
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.4 }}
                >
                  +
                </motion.div>
                <motion.div
                  ref={addend2Ref}
                  style={{ position: 'relative' }}
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.5 }}
                >
                  {secondAddend}
                  {/* Green objects above second addend */}
                  {showAddend2Objects && (
                    <div style={{ position: 'absolute', top: -35, left: '50%', transform: 'translateX(-50%)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                      {/* Top row - ceil(count/2) items */}
                      <div style={{ display: 'flex', gap: 4 }}>
                        {Array.from({ length: Math.ceil(secondAddend / 2) }).map((_, i) => (
                          !hiddenAddend2Indices.has(i) && (
                            <motion.div
                              key={i}
                              style={{
                                width: 20,
                                height: 20,
                                borderRadius: '50%',
                                background: '#4CAF50',
                                boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                              }}
                              initial={{ scale: 0, y: 20 }}
                              animate={{ scale: 1, y: 0 }}
                              transition={{ delay: i * 0.1, type: 'spring', stiffness: 300, damping: 15 }}
                            />
                          )
                        ))}
                      </div>
                      {/* Bottom row - floor(count/2) items */}
                      {secondAddend > 1 && (
                        <div style={{ display: 'flex', gap: 4 }}>
                          {Array.from({ length: Math.floor(secondAddend / 2) }).map((_, i) => {
                            const actualIndex = Math.ceil(secondAddend / 2) + i;
                            return !hiddenAddend2Indices.has(actualIndex) && (
                              <motion.div
                                key={actualIndex}
                                style={{
                                  width: 20,
                                  height: 20,
                                  borderRadius: '50%',
                                  background: '#4CAF50',
                                  boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                                }}
                                initial={{ scale: 0, y: 20 }}
                                animate={{ scale: 1, y: 0 }}
                                transition={{ delay: actualIndex * 0.1, type: 'spring', stiffness: 300, damping: 15 }}
                              />
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </motion.div>
                <motion.div
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.6 }}
                >
                  =
                </motion.div>
                {/* Top counting box - inline with equation */}
                <motion.div
                  ref={topBoxRef}
                  key={topBoxValue} // Key change triggers pulse animation on each increment
                  style={{
                    width: (sumIsDoubleDigit || forceTwoSorobanMode) ? 96 : 64,
                    height: 76,
                    border: '3px solid #5D4632',
                    borderRadius: 8,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: '#FFF8E7',
                    fontSize: 64,
                    fontWeight: 'bold',
                    color: topBoxValue !== null && topBoxValue > 0 ? '#2D1810' : '#BDBDBD',
                  }}
                  initial={{ opacity: 1, scale: 1 }} // Start visible with question mark
                  animate={
                    isComparingFinal
                      ? { opacity: 0, scale: 0.8 }
                      : topBoxValue !== null && topBoxValue > 0
                      ? { scale: [1, 1.2, 1], opacity: 1 }
                      : { opacity: 1, scale: 1 }
                  }
                  transition={
                    topBoxValue !== null && topBoxValue > 0
                      ? { duration: 0.3 }
                      : { duration: 0.3 }
                  }
                >
                  {topBoxValue !== null && topBoxValue > 0 ? topBoxValue : '?'}
                </motion.div>
              </>
            )}
          </motion.div>

          {/* Bottom counting box - directly under the top counting box */}
          {showFullEquation && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              {/* Spacer to align with equation - push box to where top box is */}
              <div style={{ width: 64, opacity: 0 }}>{targetAddend}</div>
              <div style={{ width: 32, opacity: 0 }}>+</div>
              <div style={{ width: 32, opacity: 0 }}>{secondAddend}</div>
              <div style={{ width: 32, opacity: 0 }}>=</div>

              {/* Bottom counting box - aligned under top box */}
              <motion.div
                ref={bottomBoxRef}
                key={bottomBoxValue} // Key change triggers pulse animation on each increment
                style={{
                  width: (sumIsDoubleDigit || forceTwoSorobanMode) ? 96 : 64,
                  height: 76,
                  border: '3px solid #5D4632',
                  borderRadius: 8,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: '#FFF8E7',
                  fontSize: 64,
                  fontWeight: 'bold',
                  color: '#2D1810',
                }}
                initial={{ opacity: 0, scale: 0.5 }}
                animate={
                  isComparingFinal
                    ? { opacity: 0, scale: 0.8 }
                    : bottomBoxValue !== null && bottomBoxValue > 0
                    ? { scale: [1, 1.2, 1], opacity: 1 }
                    : bottomBoxValue === 0
                    ? { opacity: 1, scale: 1 }
                    : { opacity: 0, scale: 1 }
                }
                transition={
                  bottomBoxValue !== null && bottomBoxValue > 0
                    ? { duration: 0.3 }
                    : bottomBoxValue === 0
                    ? { duration: 0.2 }
                    : { delay: 0.8, duration: 0.3 }
                }
              >
                {bottomBoxValue !== null && bottomBoxValue > 0 ? bottomBoxValue : ''}
              </motion.div>
            </div>
          )}

          {/* Transition number - slides from step 1 to step 2 */}
          {showTransitionNumber && countingBoxRef.current && addend1TransitionRef.current && (() => {
            const startRect = countingBoxRef.current.getBoundingClientRect();
            const endRect = addend1TransitionRef.current.getBoundingClientRect();

            const startX = startRect.left + startRect.width / 2;
            const startY = startRect.top + startRect.height / 2;
            const endX = endRect.left + endRect.width / 2;
            const endY = endRect.top + endRect.height / 2;

            return (
              <motion.div
                style={{
                  position: 'fixed',
                  left: startX,
                  top: startY,
                  fontSize: 64,
                  fontWeight: 'bold',
                  color: '#2D1810',
                  zIndex: 2000,
                  transform: 'translate(-50%, -50%)',
                }}
                initial={{ x: 0, y: 0 }}
                animate={{ x: endX - startX, y: endY - startY }}
                transition={{ duration: 0.5, ease: 'easeInOut' }}
              >
                {targetAddend}
              </motion.div>
            );
          })()}

          {/* Counting box - only for step 1 */}
          {!showFullEquation && (
            <motion.div
              ref={countingBoxRef}
              key={countingBoxValue} // Key change triggers pulse animation on each increment
              style={{
                width: 64,
                height: 76,
                border: '3px solid #5D4632',
                borderRadius: 8,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: '#FFF8E7',
                fontSize: 64,
                fontWeight: 'bold',
                color: '#2D1810',
              }}
              animate={
                verificationResult
                  ? { opacity: 0, scale: 0.8 }
                  : countingBoxValue !== null && countingBoxValue > 0
                  ? { scale: [1, 1.2, 1], opacity: 1 }
                  : { opacity: 1, scale: 1 }
              }
              transition={{ duration: 0.3 }}
            >
              {countingBoxValue !== null && countingBoxValue > 0 ? countingBoxValue : ''}
            </motion.div>
          )}

          {/* Sliding number for step 2 final comparison */}
          {isComparingFinal && bottomBoxValue !== null && topBoxValue !== null && (() => {
            // Get exact positions of both boxes
            const topBoxRect = topBoxRef.current?.getBoundingClientRect();
            const bottomBoxRect = bottomBoxRef.current?.getBoundingClientRect();
            const problemRect = problemAreaRef.current?.getBoundingClientRect();

            if (!topBoxRect || !bottomBoxRect || !problemRect) return null;

            // Calculate positions relative to problem area
            // problemRect includes the 20px padding, so we subtract it to get content-relative coords
            const padding = 20;

            // Top-left positions for the invisible boxes (matching visible box positions exactly)
            const topBoxRelativeX = topBoxRect.left - problemRect.left;
            const topBoxRelativeY = topBoxRect.top - problemRect.top;

            const bottomBoxRelativeX = bottomBoxRect.left - problemRect.left;
            const bottomBoxRelativeY = bottomBoxRect.top - problemRect.top;

            return (
              <>
                {/* Top number stays in place - positioned exactly where top box was */}
                <motion.div
                  style={{
                    position: 'absolute',
                    width: 64,
                    height: 76,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 64,
                    fontWeight: 'bold',
                    left: topBoxRelativeX,
                    top: topBoxRelativeY,
                  }}
                initial={{ color: '#2D1810', opacity: 1 }}
                animate={{
                  color: finalVerificationResult === 'correct'
                    ? ['#2D1810', '#2D1810', '#4CAF50', '#4CAF50', '#4CAF50']
                    : '#2D1810',
                  scale: finalVerificationResult === 'correct' ? [1, 1, 1.2, 1, 1.2, 1] : 1,
                  opacity: finalVerificationResult === 'correct' ? [1, 1, 1, 1, 1, 0] : 1,
                }}
                transition={
                  finalVerificationResult === 'correct'
                    ? {
                        color: { duration: 0.6, delay: 0.5, times: [0, 0.45, 0.5, 0.75, 1] },
                        scale: { duration: 0.6, delay: 0.5, times: [0, 0.45, 0.5, 0.75, 1] },
                        opacity: { duration: 0.8, delay: 1.1 } // Slower fade: 0.8s instead of 0.3s
                      }
                    : {}
                }
              >
                  {topBoxValue}
                </motion.div>

                {/* Bottom number slides up - starts at bottom box position */}
                <motion.div
                  style={{
                    position: 'absolute',
                    width: 64,
                    height: 76,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 64,
                    fontWeight: 'bold',
                    left: bottomBoxRelativeX,
                    top: bottomBoxRelativeY,
                    filter: showBlockingGlow && finalVerificationResult === 'incorrect'
                      ? 'drop-shadow(0 0 20px rgba(255, 0, 0, 1)) drop-shadow(0 0 40px rgba(255, 0, 0, 0.8))'
                      : 'none',
                  }}
                  initial={{ y: 0, color: '#2D1810' }}
                  animate={{
                    y: finalVerificationResult === 'correct' ? (topBoxRelativeY - bottomBoxRelativeY) : finalVerificationResult === 'incorrect' ? -43 : 0,
                    color: finalVerificationResult === 'correct'
                      ? ['#2D1810', '#2D1810', '#4CAF50', '#4CAF50', '#4CAF50']
                      : finalVerificationResult === 'incorrect' ? '#F44336' : '#2D1810',
                    scale: finalVerificationResult === 'correct' ? [1, 1, 1.2, 1, 1.2, 1] : 1,
                    opacity: finalVerificationResult === 'correct' ? [1, 1, 1, 1, 1, 0] : 1,
                  }}
                  transition={{
                    y: { duration: 0.5, ease: finalVerificationResult === 'incorrect' ? [0.25, 0.1, 0.25, 1] : 'easeInOut' },
                    color: finalVerificationResult === 'correct' ? { duration: 0.6, delay: 0.5, times: [0, 0.45, 0.5, 0.75, 1] } : {},
                    scale: finalVerificationResult === 'correct' ? { duration: 0.6, delay: 0.5, times: [0, 0.45, 0.5, 0.75, 1] } : {},
                    opacity: finalVerificationResult === 'correct' ? { duration: 0.8, delay: 1.1 } : {}, // Slower fade: 0.8s instead of 0.3s
                  }}
                >
                {bottomBoxValue}

                {/* Strike-through for incorrect */}
                {finalVerificationResult === 'incorrect' && showBlockingGlow && (
                  <motion.div
                    style={{
                      position: 'absolute',
                      top: '50%',
                      left: '50%',
                      width: 80,
                      height: 4,
                      background: '#F44336',
                      transformOrigin: 'center',
                      borderRadius: 2,
                    }}
                    initial={{ scale: 0, rotate: -25, x: '-50%', y: '-50%' }}
                    animate={{ scale: 1, rotate: -25, x: '-50%', y: '-50%' }}
                    transition={{ duration: 0.2 }}
                  />
                  )}
                </motion.div>
              </>
            );
          })()}

          {/* Sliding number for verification */}
          {verificationResult && countingBoxValue !== null && (
            <motion.div
              style={{
                position: 'absolute',
                fontSize: 64,
                fontWeight: 'bold',
                filter: showBlockingGlow
                  ? 'drop-shadow(0 0 20px rgba(255, 0, 0, 1)) drop-shadow(0 0 40px rgba(255, 0, 0, 0.8))'
                  : 'none',
                transition: 'filter 0.2s ease-in-out',
              }}
              initial={{ y: 88, opacity: 1, color: '#2D1810' }}
              animate={{
                y: verificationResult === 'correct' ? 0 : verificationResult === 'incorrect' ? 45 : 88,
                color: verificationResult === 'correct'
                  ? ['#2D1810', '#2D1810', '#4CAF50', '#4CAF50', '#4CAF50']
                  : verificationResult === 'incorrect' ? '#F44336' : '#2D1810',
                scale: verificationResult === 'correct' ? [1, 1, 1.2, 1, 1.2, 1] : 1,
                opacity: verificationResult === 'correct' ? [1, 1, 1, 1, 1, 0] : 1,
              }}
              transition={{
                y: { duration: 0.5, ease: verificationResult === 'incorrect' ? [0.25, 0.1, 0.25, 1] : 'easeInOut' },
                color: verificationResult === 'correct' ? { duration: 0.6, delay: 0.5, times: [0, 0.45, 0.5, 0.75, 1] } : {},
                scale: verificationResult === 'correct' ? { duration: 0.6, delay: 0.5, times: [0, 0.45, 0.5, 0.75, 1] } : {},
                opacity: verificationResult === 'correct' ? { duration: 0.3, delay: 1.1 } : {},
              }}
            >
              {countingBoxValue}

              {/* Diagonal strike-through line for incorrect */}
              {verificationResult === 'incorrect' && showBlockingGlow && (
                <motion.div
                  style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    width: 80,
                    height: 4,
                    background: '#F44336',
                    transformOrigin: 'center',
                    borderRadius: 2,
                  }}
                  initial={{ scale: 0, rotate: -25, x: '-50%', y: '-50%' }}
                  animate={{ scale: 1, rotate: -25, x: '-50%', y: '-50%' }}
                  transition={{ duration: 0.2 }}
                />
              )}
            </motion.div>
          )}
        </div>
      </div>

      {/* Soroban Area */}
      <div
        ref={sorobanRef}
        style={{
          display: 'flex',
          flexDirection: (showFullEquation && (sumIsDoubleDigit || forceTwoSorobanMode)) ? 'row' : 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: (showFullEquation && (sumIsDoubleDigit || forceTwoSorobanMode)) ? 0 : 16,
          padding: '0 20px',
          flexShrink: 0,
          userSelect: 'none',
          WebkitUserSelect: 'none',
          WebkitTouchCallout: 'none',
          position: 'relative',
          opacity: (showStep1Feedback || showStep2Feedback || animatingTensSoroban || animatingOnesSoroban || (verificationResult && !showFullEquation)) ? 0.3 : 1,
          transition: 'opacity 0.8s ease',
        }}
      >
        {(showFullEquation && (sumIsDoubleDigit || forceTwoSorobanMode)) ? (
          <>
            {/* Tens place soroban (left) with ×10 label - limited to 1 earth bead */}
            <div ref={tensSorobanRef}>
              <Soroban
                key={`tens-${resetKey}`}
                rodCount={1}
                initialValue={0}
                onValueChange={setTensValue}
                onRodStatesChange={handleTensRodStatesChange}
                disabled={showStep2Feedback || animatingTensSoroban}
                maxValue={1}
                sizeConfig={{
                  beadSize: 42,
                  beadSpacing: 7,
                  rodWidth: 60,
                  framepadding: 14,
                }}
                showValue={false}
                frameLabel="×10"
              />
            </div>

            {/* Ones place soroban (right) with dot */}
            <div ref={onesSorobanRef}>
              <Soroban
                key={`ones-${resetKey}`}
                rodCount={1}
                initialValue={targetAddend}
                onValueChange={setOnesValue}
                onRodStatesChange={handleOnesRodStatesChange}
                disabled={showStep2Feedback || animatingOnesSoroban}
                sizeConfig={{
                  beadSize: 42,
                  beadSpacing: 7,
                  rodWidth: 60,
                  framepadding: 14,
                }}
                showValue={false}
                frameLabel="dot"
              />
            </div>
          </>
        ) : (
          <Soroban
            key={resetKey}
            rodCount={1}
            initialValue={0}
            onValueChange={handleSorobanChange}
            onRodStatesChange={handleRodStatesChange}
            sizeConfig={{
              beadSize: 42,
              beadSpacing: 7,
              rodWidth: 60,
              framepadding: 14,
            }}
            showValue={false}
            frameLabel="dot"
          />
        )}
      </div>


      {/* Flying green objects from addends to top box */}
      <AnimatePresence>
        {flyingAddendObjects.map(obj => {
          if (!topBoxRef.current) return null;
          const topBoxRect = topBoxRef.current.getBoundingClientRect();
          const targetX = topBoxRect.left + topBoxRect.width / 2;
          const targetY = topBoxRect.top + topBoxRect.height / 2;

          return (
            <motion.div
              key={obj.id}
              style={{
                position: 'fixed',
                left: obj.startX,
                top: obj.startY,
                width: 20,
                height: 20,
                borderRadius: '50%',
                background: '#4CAF50',
                boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                zIndex: 2000,
                pointerEvents: 'none',
                marginLeft: -10,
                marginTop: -10,
              }}
              initial={{ x: 0, y: 0, scale: 1, opacity: 1 }}
              animate={{
                x: targetX - obj.startX,
                y: targetY - obj.startY,
                scale: [1, 1.1, 0.5],
                opacity: [1, 1, 0],
              }}
              transition={{
                duration: 0.5,
                ease: [0.25, 0.1, 0.25, 1],
              }}
              exit={{ opacity: 0 }}
            />
          );
        })}
      </AnimatePresence>

      {/* Flying particles from beads to counting box */}
      <AnimatePresence>
        {flyingParticles.map(particle => (
          <motion.div
            key={particle.id}
            style={{
              position: 'fixed',
              left: particle.startX,
              top: particle.startY,
              width: 24,
              height: 24,
              borderRadius: '50%',
              background: 'radial-gradient(circle, #FFD700 0%, #FFA000 100%)',
              boxShadow: '0 0 12px rgba(255, 215, 0, 0.8)',
              zIndex: 2000,
              pointerEvents: 'none',
              marginLeft: -12,
              marginTop: -12,
            }}
            initial={{ x: 0, y: 0, scale: 0, opacity: 1 }}
            animate={{
              x: particle.targetX - particle.startX,
              y: particle.targetY - particle.startY,
              scale: [0, 1, 1, 0.5],
              opacity: [1, 1, 1, 0],
            }}
            transition={{
              duration: 0.5,
              ease: [0.25, 0.1, 0.25, 1],
              times: [0, 0.2, 0.8, 1],
            }}
            exit={{ opacity: 0 }}
          />
        ))}
      </AnimatePresence>

      {/* Step 1 Feedback - Flying beads to counting box */}
      <SimpleAdditionFeedback
        isActive={showStep1Feedback}
        heavenBeadActive={rodStates[0]?.heavenBeadActive || false}
        earthBeadsActive={rodStates[0]?.earthBeadsActive || 0}
        sorobanRect={sorobanRect}
        countingBoxRect={countingBoxRect}
        onComplete={handleStep1FeedbackComplete}
        onBeadArrived={handleStep1BeadArrived}
      />

      {/* Step 2 Feedback - Flying beads to bottom box */}
      <SimpleAdditionFeedback
        isActive={showStep2Feedback && !(sumIsDoubleDigit || forceTwoSorobanMode)}
        heavenBeadActive={rodStates[0]?.heavenBeadActive || false}
        earthBeadsActive={rodStates[0]?.earthBeadsActive || 0}
        sorobanRect={sorobanRect}
        countingBoxRect={bottomBoxRect}
        onComplete={handleStep2FeedbackComplete}
        onBeadArrived={handleStep2BeadArrived}
      />

      {/* Step 2 Two-Soroban Feedback */}
      {(sumIsDoubleDigit || forceTwoSorobanMode) && (
        <SimpleAdditionFeedbackTwo
          key={`two-soroban-${resetKey}`}
          isActive={animatingTensSoroban || animatingOnesSoroban}
          tensHeavenBeadActive={tensRodStates[0]?.heavenBeadActive || false}
          tensEarthBeadsActive={tensRodStates[0]?.earthBeadsActive || 0}
          onesHeavenBeadActive={onesRodStates[0]?.heavenBeadActive || false}
          onesEarthBeadsActive={onesRodStates[0]?.earthBeadsActive || 0}
          sorobanRect={sorobanRect}
          countingBoxRect={bottomBoxRect}
          onComplete={() => {
            setAnimatingTensSoroban(false);
            setAnimatingOnesSoroban(false);
            // Start addend animation
            handleStep2FeedbackComplete();
          }}
          onBeadArrived={(count) => {
            console.log('Two-soroban bead arrived, count:', count);
            setBottomBoxValue(count);
            tensBeadsFlownRef.current = count;
          }}
        />
      )}

      {/* JiJi character */}
      <JiJiCharacter
        show={showJiJi}
        isFlying={finalVerificationResult === 'correct'}
        targetNumber={targetAddend + secondAddend}
        sorobanValue={bottomBoxValue || sorobanValue}
        objectsContainerRect={null}
        onBlocked={handleJiJiBlocked}
        onAnimationComplete={handleJiJiAnimationComplete}
      />

      {/* Bottom control bar with GO and Reset buttons */}
      <div
        style={{
          display: 'flex',
          gap: 12,
          padding: '16px 20px',
          flexShrink: 0,
        }}
      >
        {/* GO button - Yellow for first step */}
        <motion.button
          onClick={handleGo}
          disabled={!goButtonEnabled}
          style={{
            flex: 7,
            height: 56,
            borderRadius: 12,
            background: goButtonEnabled
              ? showFullEquation
                ? 'linear-gradient(135deg, #4CAF50 0%, #2E7D32 100%)' // Green for step 2
                : 'linear-gradient(135deg, #FFC107 0%, #FFA000 100%)' // Yellow for step 1
              : '#BDBDBD',
            color: 'white',
            border: 'none',
            fontSize: 20,
            fontWeight: 'bold',
            cursor: goButtonEnabled ? 'pointer' : 'not-allowed',
            boxShadow: goButtonEnabled
              ? showFullEquation
                ? '0 4px 12px rgba(76,175,80,0.4)' // Green shadow
                : '0 4px 12px rgba(255,193,7,0.4)' // Yellow shadow
              : 'none',
          }}
          whileHover={goButtonEnabled ? { scale: 1.02 } : {}}
          whileTap={goButtonEnabled ? { scale: 0.98 } : {}}
        >
          GO ➤
        </motion.button>

        {/* Reset button */}
        <motion.button
          onClick={() => handleReset(false)}
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
      </div>
    </div>
  );
}
