import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Soroban } from '../soroban/Soroban';
import { RodState } from '../../models/types';
import { JiJiCharacter } from '../matching/JiJiCharacter';

interface SimpleAdditionProps {
  onBack: () => void;
}

export function SimpleAddition({ onBack }: SimpleAdditionProps) {
  const [sorobanValue, setSorobanValue] = useState(0);
  const [rodStates, setRodStates] = useState<RodState[]>([]);
  const [resetKey, setResetKey] = useState(0);
  const [score, setScore] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [countingBoxValue, setCountingBoxValue] = useState<number | null>(null);
  const [flashingBeadIndex, setFlashingBeadIndex] = useState<number>(-1);
  const [showHeavenFan, setShowHeavenFan] = useState(false);
  const [heavenFanFlashIndex, setHeavenFanFlashIndex] = useState<number>(-1); // Which of the 5 fan beads is flashing
  const [heavenBeadPosition, setHeavenBeadPosition] = useState<{ x: number; y: number } | null>(null);
  const sorobanRef = useRef<HTMLDivElement>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationResult, setVerificationResult] = useState<'correct' | 'incorrect' | null>(null);
  const [showJiJi, setShowJiJi] = useState(false);
  const [showBlockingGlow, setShowBlockingGlow] = useState(false);
  const [showFullEquation, setShowFullEquation] = useState(false);

  // Generate random addition problem (sum between 2 and 9)
  const generateProblem = () => {
    const sum = Math.floor(Math.random() * 8) + 2; // 2-9
    const firstAddend = Math.floor(Math.random() * (sum - 1)) + 1; // 1 to (sum-1)
    const secondAddend = sum - firstAddend;
    return { firstAddend, secondAddend };
  };

  const [currentProblem, setCurrentProblem] = useState(() => generateProblem());
  const targetAddend = currentProblem.firstAddend;
  const secondAddend = currentProblem.secondAddend;

  const [flyingParticles, setFlyingParticles] = useState<Array<{ id: number; startX: number; startY: number; targetX: number; targetY: number }>>([]);
  const problemAreaRef = useRef<HTMLDivElement>(null);
  const bottomBoxRef = useRef<HTMLDivElement>(null);
  const [bottomBoxValue, setBottomBoxValue] = useState<number | null>(null);
  const [topBoxValue, setTopBoxValue] = useState<number | null>(null);
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

  const spawnParticle = (beadType: 'heaven' | 'earth', beadIndex?: number) => {
    if (!sorobanRef.current) return;

    // For step 2, target the bottom box; for step 1, target the problem area
    const targetRef = showFullEquation ? bottomBoxRef.current : problemAreaRef.current;
    if (!targetRef) return;

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

    // Calculate target position
    const targetRect = targetRef.getBoundingClientRect();
    const targetX = targetRect.left + targetRect.width / 2;
    const targetY = targetRect.top + targetRect.height / 2;

    // Add particle
    const particleId = Date.now() + Math.random();
    setFlyingParticles(prev => [...prev, {
      id: particleId,
      startX: rodCenterX,
      startY: beadY,
      targetX,
      targetY,
    }]);

    // Remove particle after animation
    setTimeout(() => {
      setFlyingParticles(prev => prev.filter(p => p.id !== particleId));
    }, 600);
  };

  const handleGo = () => {
    // Prevent double-clicks or clicks during animation
    if (isAnimating || isVerifying) return;

    setIsAnimating(true);

    const rod = rodStates[0]; // Single rod
    if (!rod) return;

    const totalBeads = (rod.heavenBeadActive ? 5 : 0) + rod.earthBeadsActive;

    // Step 2: Count soroban beads into bottom box
    if (showFullEquation) {
      // Make bottom box visible immediately
      setBottomBoxValue(0);

      let currentBead = 0;
      const flashNext = () => {
        if (currentBead >= totalBeads) {
          // All done
          setTimeout(() => {
            setFlashingBeadIndex(0);
            setShowHeavenFan(false);
            setHeavenFanFlashIndex(-1);
            setIsAnimating(false);

            // Immediately disable button before starting addend animation
            setAddendAnimationStarted(true);

            // Now animate the addends
            setTimeout(() => {
              animateAddends();
            }, 500);
          }, 500);
          return;
        }

        currentBead++;

        // Same logic as step 1, but increment bottomBoxValue instead
        if (rod.heavenBeadActive && currentBead <= 5) {
          if (currentBead === 1) {
            setShowHeavenFan(true);
            setTimeout(() => {
              setHeavenFanFlashIndex(0);
              spawnParticle('heaven');
              setTimeout(() => {
                setBottomBoxValue(1);
              }, 400);
              setTimeout(() => {
                setHeavenFanFlashIndex(-1);
              }, 300);
              setTimeout(flashNext, 1000);
            }, 1100);
          } else if (currentBead === 5) {
            const fanIndex = currentBead - 1;
            setHeavenFanFlashIndex(fanIndex);
            spawnParticle('heaven');
            setTimeout(() => {
              setBottomBoxValue(currentBead);
            }, 400);
            setTimeout(() => {
              setHeavenFanFlashIndex(-1);
            }, 300);
            setTimeout(() => {
              setShowHeavenFan(false);
            }, 500);
            setTimeout(flashNext, 1500);
          } else {
            const fanIndex = currentBead - 1;
            setHeavenFanFlashIndex(fanIndex);
            spawnParticle('heaven');
            setTimeout(() => {
              setBottomBoxValue(currentBead);
            }, 400);
            setTimeout(() => {
              setHeavenFanFlashIndex(-1);
            }, 300);
            setTimeout(flashNext, 1000);
          }
        } else {
          setFlashingBeadIndex(currentBead);
          const earthBeadIndex = currentBead - (rod.heavenBeadActive ? 6 : 1);
          spawnParticle('earth', earthBeadIndex);
          setTimeout(() => {
            setBottomBoxValue(currentBead);
          }, 400);
          setTimeout(() => {
            setFlashingBeadIndex(0);
          }, 300);
          setTimeout(flashNext, 1000);
        }
      };

      setTimeout(flashNext, 200);
      return;
    }

    // Step 1: Original logic

    let currentBead = 0;

    const flashNext = () => {
      if (currentBead >= totalBeads) {
        // All done - reset flash state and start verification
        setTimeout(() => {
          setFlashingBeadIndex(0);
          setShowHeavenFan(false);
          setHeavenFanFlashIndex(-1);
          setIsAnimating(false);

          // Start verification
          setIsVerifying(true);

          // Wait 500ms, then check if correct
          setTimeout(() => {
            const isCorrect = sorobanValue === targetAddend;
            setVerificationResult(isCorrect ? 'correct' : 'incorrect');

            if (!isCorrect) {
              // If incorrect, show JiJi after number slides up and gets blocked
              setTimeout(() => {
                setShowJiJi(true);
              }, 500); // Number slides up in 0.5s
            } else {
              // If correct, show full equation after green pulse completes
              setTimeout(() => {
                setShowFullEquation(true);
                setIsVerifying(false); // Re-enable button for step 2
              }, 1400); // After slide (0.5s) + pulse (0.6s) + fade (0.3s)
            }
          }, 500);
        }, 500);
        return;
      }

      currentBead++;

      // Check if we need to handle heaven bead
      if (rod.heavenBeadActive && currentBead <= 5) {
        // We're in heaven bead territory
        if (currentBead === 1) {
          // Start fan animation
          console.log('Starting heaven bead fan animation');
          setShowHeavenFan(true);
          // Fan animation completes at ~560ms (last bead delay 0.36s + duration 0.2s)
          // Then wait 500ms pause before starting to flash
          setTimeout(() => {
            setHeavenFanFlashIndex(0); // Flash first fan bead
            spawnParticle('heaven'); // Spawn particle from heaven bead
            // Increment counter 150ms after flash starts (when particle arrives)
            setTimeout(() => {
              setCountingBoxValue(1);
            }, 400);
            // Turn off after 300ms
            setTimeout(() => {
              setHeavenFanFlashIndex(-1);
            }, 300);
            // Call next flash after this one completes
            setTimeout(flashNext, 1000);
          }, 1100); // 560ms fan complete + 500ms pause + 40ms buffer
        } else if (currentBead === 5) {
          // Last heaven bead - close fan after this
          const fanIndex = currentBead - 1; // 0-4
          setHeavenFanFlashIndex(fanIndex);
          spawnParticle('heaven'); // Spawn particle from heaven bead
          // Increment counter when particle arrives
          setTimeout(() => {
            setCountingBoxValue(currentBead);
          }, 400);
          setTimeout(() => {
            setHeavenFanFlashIndex(-1);
          }, 300);
          // Close fan after 500ms, then wait 1000ms before next bead
          setTimeout(() => {
            setShowHeavenFan(false);
          }, 500);
          setTimeout(flashNext, 1500);
        } else {
          // Flash middle fan beads (2-4)
          const fanIndex = currentBead - 1; // 0-4
          setHeavenFanFlashIndex(fanIndex);
          spawnParticle('heaven'); // Spawn particle from heaven bead
          // Increment counter when particle arrives
          setTimeout(() => {
            setCountingBoxValue(currentBead);
          }, 400);
          setTimeout(() => {
            setHeavenFanFlashIndex(-1);
          }, 300);
          // Call next flash 1000ms after this one starts
          setTimeout(flashNext, 1000);
        }
      } else {
        // Regular earth bead flashing
        setFlashingBeadIndex(currentBead);
        const earthBeadIndex = currentBead - (rod.heavenBeadActive ? 6 : 1);
        spawnParticle('earth', earthBeadIndex); // Spawn particle from earth bead
        // Increment counter when particle arrives
        setTimeout(() => {
          setCountingBoxValue(currentBead);
        }, 400);

        // Turn off highlight after 300ms, then wait 700ms more before next flash (total 1000ms)
        setTimeout(() => {
          setFlashingBeadIndex(0);
        }, 300);

        setTimeout(flashNext, 1000);
      }
    };

    // Wait 200ms before starting first flash
    setTimeout(flashNext, 200);
  };

  const handleReset = (loadNewProblem = false) => {
    setResetKey(prev => prev + 1);
    setCountingBoxValue(null);
    setBottomBoxValue(null);
    setTopBoxValue(null);
    setIsAnimating(false);
    setFlashingBeadIndex(0);
    setShowHeavenFan(false);
    setHeavenFanFlashIndex(-1);
    setIsVerifying(false);
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
    // Don't reset jijiAnimationCompleteRef here - it stays true until next JiJi shows

    // Only generate new problem if explicitly requested (on success)
    if (loadNewProblem) {
      setCurrentProblem(generateProblem());
    }
  };

  const handleJiJiBlocked = () => {
    // Show red glow on blocking number
    setShowBlockingGlow(true);
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

  // Calculate heaven bead position when soroban is rendered
  useEffect(() => {
    if (!sorobanRef.current) return;

    const sorobanContainer = sorobanRef.current;
    const sorobanRect = sorobanContainer.getBoundingClientRect();

    // Calculate heaven bead position - matching SorobanRod.tsx calculations
    const beadSize = 42;
    const beadSpacing = 7;
    const framePadding = 14;
    const borderWidth = 4;

    const heavenSectionHeight = beadSize * 2.0 + beadSpacing * 3;
    const heavenBeadActiveY = heavenSectionHeight - beadSize - beadSpacing;
    const heavenBeadHeight = beadSize * 1.1;

    const contentTop = sorobanRect.top + borderWidth + framePadding;
    const rodCenterX = sorobanRect.left + sorobanRect.width / 2;

    setHeavenBeadPosition({
      x: rodCenterX,
      y: contentTop + heavenBeadActiveY + heavenBeadHeight / 2,
    });
  }, [rodStates]);

  // Enable GO button only if soroban has a value > 0 and not animating or verifying
  // For step 2, button is enabled as soon as soroban changes from initial state
  // Once addend animation starts, disable button permanently for this round
  const goButtonEnabled = !isAnimating && !isVerifying && !addendAnimationStarted && (
    !showFullEquation ? sorobanValue > 0 : sorobanValue !== targetAddend
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

        {/* Score/Stars display */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            background: '#FFF8E7',
            borderRadius: 24,
            padding: '8px 16px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          }}
        >
          <span style={{ fontSize: 24 }}>⭐</span>
          <span
            style={{
              fontSize: 20,
              fontWeight: 'bold',
              color: '#2D1810',
            }}
          >
            {score}
          </span>
        </div>

        {/* Right spacer for symmetry */}
        <div style={{ width: 48 }} />
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
              {targetAddend}
              {/* Green objects above first addend */}
              {showAddend1Objects && (
                <div style={{ position: 'absolute', top: -50, left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: 4 }}>
                  {Array.from({ length: targetAddend }).map((_, i) => (
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
                    <div style={{ position: 'absolute', top: -50, left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: 4 }}>
                      {Array.from({ length: secondAddend }).map((_, i) => (
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
                    color: topBoxValue !== null && topBoxValue > 0 ? '#2D1810' : '#BDBDBD',
                  }}
                  initial={{ opacity: 0, scale: 0.5 }}
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
                      : { delay: 0.7 }
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

          {/* Counting box - only for step 1 */}
          {!showFullEquation && (
            <motion.div
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
                isVerifying
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
                        opacity: { duration: 0.3, delay: 1.1 }
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
                    opacity: finalVerificationResult === 'correct' ? { duration: 0.3, delay: 1.1 } : {},
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
          {isVerifying && countingBoxValue !== null && (
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
          flexDirection: 'column',
          alignItems: 'center',
          gap: 16,
          padding: '0 20px',
          flexShrink: 0,
          userSelect: 'none',
          WebkitUserSelect: 'none',
          WebkitTouchCallout: 'none',
          position: 'relative',
        }}
      >
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
          flashBeadIndex={flashingBeadIndex}
          hideHeavenBead={showHeavenFan}
        />
      </div>

      {/* Heaven bead fan animation overlay */}
      <AnimatePresence>
        {showHeavenFan && heavenBeadPosition && (() => {
          const beadSize = 42;
          const angles = [-60, -33, 0, 33, 60];
          const lineLength = 90;
          const beadWidth = beadSize * 1.6;
          const beadHeight = beadSize * 1.0;
          const heavenBeadWidth = beadSize * 1.7;
          const heavenBeadHeight = beadSize * 1.1;

          return (
            <motion.div
              style={{
                position: 'fixed',
                inset: 0,
                zIndex: 1000,
                pointerEvents: 'none',
              }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              {/* Fading heaven bead */}
              <motion.div
                style={{
                  position: 'fixed',
                  left: heavenBeadPosition.x,
                  top: heavenBeadPosition.y,
                  width: heavenBeadWidth,
                  height: heavenBeadHeight,
                  marginLeft: -heavenBeadWidth / 2,
                  marginTop: -heavenBeadHeight / 2,
                  zIndex: 1001,
                }}
                initial={{ scale: 1, opacity: 1 }}
                animate={{ scale: 0.5, opacity: 0 }}
                transition={{ duration: 0.3, delay: 0.4 }}
              >
                <svg
                  width={heavenBeadWidth}
                  height={heavenBeadHeight}
                  viewBox={`0 0 ${heavenBeadWidth} ${heavenBeadHeight}`}
                  style={{
                    filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))',
                  }}
                >
                  <defs>
                    <linearGradient id="fading-heaven-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#CD853F" />
                      <stop offset="100%" stopColor="#8B5A2B" />
                    </linearGradient>
                    <radialGradient id="fading-heaven-hole">
                      <stop offset="0%" stopColor="#1A0F0A" />
                      <stop offset="100%" stopColor="#2D1810" />
                    </radialGradient>
                  </defs>
                  <path
                    d={`
                      M ${heavenBeadWidth / 2} 2
                      L ${heavenBeadWidth - 4} ${heavenBeadHeight / 2}
                      L ${heavenBeadWidth / 2} ${heavenBeadHeight - 2}
                      L 4 ${heavenBeadHeight / 2}
                      Z
                    `}
                    fill="url(#fading-heaven-grad)"
                    stroke="rgba(0,0,0,0.3)"
                    strokeWidth="1"
                  />
                  <circle
                    cx={heavenBeadWidth / 2}
                    cy={heavenBeadHeight / 2}
                    r={beadSize * 0.12}
                    fill="url(#fading-heaven-hole)"
                    stroke="rgba(0,0,0,0.5)"
                    strokeWidth="1"
                  />
                </svg>
              </motion.div>

              {/* Fan lines and beads */}
              {angles.map((angleDeg, i) => {
                const angleRad = (angleDeg * Math.PI) / 180;
                const endX = Math.sin(angleRad) * lineLength;
                const endY = -Math.cos(angleRad) * lineLength;
                const isFlashing = heavenFanFlashIndex === i;

                return (
                  <div key={`split-${i}`}>
                    {/* Line */}
                    <motion.div
                      style={{
                        position: 'fixed',
                        left: heavenBeadPosition.x,
                        top: heavenBeadPosition.y,
                        width: 3,
                        height: 0,
                        background: 'linear-gradient(to top, #B8860B, #FFD700)',
                        transformOrigin: 'center bottom',
                        marginLeft: -1.5,
                        zIndex: 999,
                        borderRadius: 2,
                      }}
                      initial={{ height: 0, rotate: angleDeg, y: 0, opacity: 1 }}
                      animate={{ height: lineLength, rotate: angleDeg, y: -lineLength, opacity: 1 }}
                      exit={{ height: 0, y: 0, opacity: 0 }}
                      transition={{
                        height: { duration: 0.25, delay: i * 0.04 },
                        y: { duration: 0.25, delay: i * 0.04 },
                      }}
                    />

                    {/* Bead at end - flashes yellow when active */}
                    <motion.div
                      style={{
                        position: 'fixed',
                        left: heavenBeadPosition.x + endX,
                        top: heavenBeadPosition.y + endY,
                        width: beadWidth,
                        height: beadHeight,
                        marginLeft: -beadWidth / 2,
                        marginTop: -beadHeight / 2,
                        zIndex: 1000,
                      }}
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{
                        scale: isFlashing ? 1.1 : 1,
                        opacity: 1
                      }}
                      exit={{ scale: 0, opacity: 0 }}
                      transition={{
                        duration: 0.2,
                        delay: 0.2 + i * 0.04,
                        type: 'spring',
                        stiffness: 400,
                        damping: 25,
                      }}
                    >
                      <svg
                        width={beadWidth}
                        height={beadHeight}
                        viewBox={`0 0 ${beadWidth} ${beadHeight}`}
                        style={{
                          filter: isFlashing
                            ? 'drop-shadow(0 0 8px rgba(255, 215, 0, 0.6))'
                            : 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))',
                        }}
                      >
                        <defs>
                          <linearGradient id={`split-bead-${i}`} x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor={isFlashing ? '#FFD700' : '#DAA520'} />
                            <stop offset="100%" stopColor={isFlashing ? '#DAA520' : '#B8860B'} />
                          </linearGradient>
                          <radialGradient id={`split-hole-${i}`}>
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
                          fill={`url(#split-bead-${i})`}
                          stroke={isFlashing ? '#FFD700' : 'rgba(0,0,0,0.3)'}
                          strokeWidth={isFlashing ? '2' : '1'}
                        />
                        <circle
                          cx={beadWidth / 2}
                          cy={beadHeight / 2}
                          r={beadSize * 0.12}
                          fill={`url(#split-hole-${i})`}
                          stroke="rgba(0,0,0,0.5)"
                          strokeWidth="1"
                        />
                      </svg>
                    </motion.div>
                  </div>
                );
              })}
            </motion.div>
          );
        })()}
      </AnimatePresence>

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
