import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { Soroban } from '../soroban/Soroban';
import { VisualObjects } from './VisualObjects';
import { JiJiCharacter } from './JiJiCharacter';
import { NumberMatchingFeedback } from './NumberMatchingFeedback';
import { NumberMatchingFeedbackTwo } from './NumberMatchingFeedbackTwo';
import { SimpleAdditionFeedback } from '../addition/SimpleAdditionFeedback';
import { SimpleAdditionFeedbackTwo } from '../addition/SimpleAdditionFeedbackTwo';
import { sounds } from '../../utils/sounds';

interface NumberMatchingProps {
  onBack: () => void;
}

const VERSION = 'v1.2.0-dev1';

export function NumberMatching({ onBack }: NumberMatchingProps) {
  const [targetNumber, setTargetNumber] = useState(5);
  const [previousNumber, setPreviousNumber] = useState<number | null>(null);
  const [sorobanValue, setSorobanValue] = useState(0);
  const [onesValue, setOnesValue] = useState(0);
  const [tensValue, setTensValue] = useState(0);
  const [resetKey, setResetKey] = useState(0);
  const [score, setScore] = useState(0);
  const [problemNumber, setProblemNumber] = useState(1);

  // Feedback state
  const [showingFeedback, setShowingFeedback] = useState(false);
  const [showJiJi, setShowJiJi] = useState(false);
  const [jijiFlying, setJijiFlying] = useState(false);
  const [matchedObjects, setMatchedObjects] = useState<Set<number>>(new Set());
  const [verificationResult, setVerificationResult] = useState<'correct' | 'incorrect' | null>(null);
  const [countingBoxValue, setCountingBoxValue] = useState(0); // Increments as beads arrive

  // Refs for feedback animation
  const sorobanRef = useRef<HTMLDivElement>(null);
  const objectsRef = useRef<HTMLDivElement>(null);
  const countingBoxRef = useRef<HTMLDivElement>(null); // For symbolic mode
  const targetBoxRef = useRef<HTMLDivElement>(null); // For symbolic mode target number position
  const [sorobanRect, setSorobanRect] = useState<DOMRect | null>(null);
  const [objectsRect, setObjectsRect] = useState<DOMRect | null>(null);
  const [countingBoxRect, setCountingBoxRect] = useState<DOMRect | null>(null);

  // Track current soroban state for feedback (both single and two-digit)
  const [currentHeavenBead, setCurrentHeavenBead] = useState(false);
  const [currentEarthBeads, setCurrentEarthBeads] = useState(0);
  const [currentTensHeavenBead, setCurrentTensHeavenBead] = useState(false);
  const [currentTensEarthBeads, setCurrentTensEarthBeads] = useState(0);
  const [currentOnesHeavenBead, setCurrentOnesHeavenBead] = useState(false);
  const [currentOnesEarthBeads, setCurrentOnesEarthBeads] = useState(0);

  // Glow effect for teaching interactivity
  const [showSorobanGlow, setShowSorobanGlow] = useState(false);

  // Red glow for blocking obstacles
  const [showBlockingGlow, setShowBlockingGlow] = useState(false);

  // Prevent duplicate JiJi animation complete calls
  const jijiAnimationCompleteRef = useRef(false);

  // Determine display mode based on score
  // 0-9: Visual objects with single soroban (1-9)
  // 10-19: Visual objects with two sorobans (10-18)
  // 20-29: Symbolic single-digit (1-9) with single soroban
  // 30-39: Symbolic two-digit (10-18) with two sorobans
  // 40+: Symbolic mixed (1-18) with two sorobans
  const useSymbolicDisplay = score >= 20;
  const useTwoSorobans = (score >= 10 && score < 20) || score >= 30; // Two sorobans for visual 10-19 and symbolic 30+

  useEffect(() => {
  }, []);

  // Generate new problem with smart repetition avoidance
  const generateProblem = (currentScore?: number) => {
    // Use passed score if provided, otherwise use state
    const effectiveScore = currentScore !== undefined ? currentScore : score;

    let newNumber: number;
    let min: number;
    let max: number;

    // Score tiers:
    // 0-9: Visual objects with single soroban (1-9)
    // 10-19: Visual objects with two sorobans (10-18)
    // 20-29: Symbolic single-digit (1-9)
    // 30-39: Symbolic two-digit (10-18)
    // 40+: Symbolic mixed (1-18)

    if (effectiveScore >= 40) {
      // Symbolic mixed mode: 1-18 with two sorobans
      min = 1;
      max = 18;
    } else if (effectiveScore >= 30) {
      // Symbolic two-digit mode: 10-18
      // Scores 30-33: Intro range (10-15)
      // Scores 34-39: Full range (10-18)
      if (effectiveScore >= 30 && effectiveScore <= 33) {
        min = 10;
        max = 15;
      } else {
        min = 10;
        max = 18;
      }
    } else if (effectiveScore >= 20) {
      // Symbolic single-digit mode (always 1-9)
      min = 1;
      max = 9;
    } else if (effectiveScore >= 10) {
      // Visual objects, two sorobans (old system)
      // Scores 10-13: Intro range (10-15)
      // Scores 14+: Full range (3-18)
      if (effectiveScore >= 10 && effectiveScore <= 13) {
        min = 10;
        max = 15;
      } else {
        min = 3;
        max = 18;
      }
    } else {
      // Visual objects, single soroban
      // Scores 0-2: Early intro (1-4)
      // Scores 3+: Full single range (1-9)
      if (effectiveScore <= 2) {
        min = 1;
        max = 4;
      } else {
        min = 1;
        max = 9;
      }
    }

    const range = max - min + 1;

    // Try to avoid repeating the previous number
    // If range is small (≤3), allow repetition after one try
    let attempts = range <= 3 ? 1 : 3;
    do {
      newNumber = Math.floor(Math.random() * range) + min;
      attempts--;
    } while (newNumber === previousNumber && attempts > 0);

    setPreviousNumber(newNumber);
    setTargetNumber(newNumber);
    setResetKey((prev) => prev + 1);
    setShowingFeedback(false);
    setShowJiJi(false);
    setJijiFlying(false);
    setMatchedObjects(new Set());
    setCountingBoxValue(0); // Reset counting box for next problem
    setVerificationResult(null);
  };

  const handleObjectMatched = (index: number) => {
    setMatchedObjects(prev => new Set([...prev, index]));
  };

  // Update refs when layout changes
  useEffect(() => {
    if (sorobanRef.current) {
      setSorobanRect(sorobanRef.current.getBoundingClientRect());
    }
    if (objectsRef.current) {
      setObjectsRect(objectsRef.current.getBoundingClientRect());
    }
  }, [targetNumber, resetKey]);

  const handleGo = () => {
    // Haptic feedback
    Haptics.impact({ style: ImpactStyle.Medium });

    if (useTwoSorobans) {
      // Two-soroban mode: capture both sorobans' states
      const totalValue = onesValue + tensValue * 10;
      const tensHeaven = tensValue >= 5;
      const tensEarth = tensValue >= 5 ? tensValue - 5 : tensValue;
      const onesHeaven = onesValue >= 5;
      const onesEarth = onesValue >= 5 ? onesValue - 5 : onesValue;


      setCurrentTensHeavenBead(tensHeaven);
      setCurrentTensEarthBeads(tensEarth);
      setCurrentOnesHeavenBead(onesHeaven);
      setCurrentOnesEarthBeads(onesEarth);
    } else {
      // Single-soroban mode: capture single soroban state
      const heavenBead = sorobanValue >= 5;
      const earthBeads = sorobanValue >= 5 ? sorobanValue - 5 : sorobanValue;


      setCurrentHeavenBead(heavenBead);
      setCurrentEarthBeads(earthBeads);
    }

    // Get fresh rects
    if (sorobanRef.current) {
      setSorobanRect(sorobanRef.current.getBoundingClientRect());
    }

    if (useSymbolicDisplay) {
      // Symbolic mode: get counting box rect
      if (countingBoxRef.current) {
        setCountingBoxRect(countingBoxRef.current.getBoundingClientRect());
      }
    } else {
      // Visual objects mode: get objects container rect
      if (objectsRef.current) {
        setObjectsRect(objectsRef.current.getBoundingClientRect());
      }
    }

    // Start feedback animation
    setShowingFeedback(true);
  };

  const handleFeedbackComplete = (isCorrect: boolean) => {
    if (useSymbolicDisplay) {
      // Symbolic mode: Show verification animation (number slides up)
      setTimeout(() => {
        setVerificationResult(isCorrect ? 'correct' : 'incorrect');

        if (!isCorrect) {
          // Incorrect: show JiJi blocked after number comparison
          setTimeout(() => {
            jijiAnimationCompleteRef.current = false; // Reset flag when NEW JiJi appears
            setJijiFlying(false);
            setShowJiJi(true);
          }, 500);
        } else {
          // Correct: show JiJi flying after number comparison
          setTimeout(() => {
            jijiAnimationCompleteRef.current = false; // Reset flag when NEW JiJi appears
            setJijiFlying(true);
            setShowJiJi(true);
          }, 1000);
        }
      }, 500);
    } else {
      // Visual objects mode: Original behavior
      if (isCorrect) {
        let newScore: number;
        setScore((prev) => {
          newScore = prev + 1;
          return newScore;
        });
        // Generate new problem after correct answer
        setTimeout(() => {
          setProblemNumber((prev) => prev + 1);
          generateProblem(newScore);
        }, 500);
      } else {
        // Red glow will be triggered by JiJi when it hits obstacle
        // Reset soroban for incorrect answer (keep same problem) after showing glow
        setTimeout(() => {
          setShowBlockingGlow(false);
          setResetKey((prev) => prev + 1);
          setShowingFeedback(false);
          setShowJiJi(false);
          setJijiFlying(false);
          setMatchedObjects(new Set());
        }, 1800);
      }
    }
  };

  const handleJiJiBlocked = () => {
    // Show red glow at the instant JiJi hits the obstacle
    setShowBlockingGlow(true);
  };

  const handleJiJiAnimationComplete = () => {
    // Prevent multiple calls from the same JiJi animation (Level 2 pattern)
    if (!showJiJi || jijiAnimationCompleteRef.current) {
      return;
    }

    // Set flag IMMEDIATELY to block any concurrent calls
    jijiAnimationCompleteRef.current = true;

    if (useSymbolicDisplay) {
      if (verificationResult === 'incorrect') {
        // Symbolic mode incorrect: reset for retry
        setTimeout(() => {
          setShowBlockingGlow(false);
          setResetKey((prev) => prev + 1);
          setShowingFeedback(false);
          setVerificationResult(null);
          setCountingBoxValue(0);
          setShowJiJi(false);
          setJijiFlying(false);
          // DON'T reset ref here - it will be reset when next JiJi appears
        }, 1000);
      } else if (verificationResult === 'correct') {
        // Symbolic mode correct: move to next problem
        setTimeout(() => {
          let newScore: number;
          setScore((prev) => {
            newScore = prev + 1;
            return newScore;
          });
          setProblemNumber((prev) => prev + 1);
          setVerificationResult(null);
          setShowingFeedback(false);
          setCountingBoxValue(0);
          generateProblem(newScore); // This will reset showJiJi
          // DON'T reset ref here - it will be reset when next JiJi appears
        }, 1000);
      }
    }
  };

  const handleShowJiJi = (flying: boolean) => {
    setJijiFlying(flying);
    setShowJiJi(true);
  };

  const handleReset = () => {
    setResetKey((prev) => prev + 1);
  };

  const handleNonInteractiveClick = () => {
    // Show glow effect to guide user to soroban
    setShowSorobanGlow(true);
    setTimeout(() => {
      setShowSorobanGlow(false);
    }, 300);
  };

  // Initialize first problem
  useEffect(() => {
    generateProblem();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Regenerate problem when crossing tier thresholds
  useEffect(() => {
    if (score === 10 || score === 15 || score === 20 || score === 30 || score === 40) {
      setTimeout(() => {
        generateProblem();
      }, 1000);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [score]);

  return (
    <div
      onClick={handleNonInteractiveClick}
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
      {/* JiJi Animation */}
      <JiJiCharacter
        show={showJiJi}
        isFlying={jijiFlying}
        targetNumber={targetNumber}
        sorobanValue={useTwoSorobans ? onesValue + tensValue * 10 : sorobanValue}
        objectsContainerRect={useSymbolicDisplay ? null : objectsRect}
        onBlocked={handleJiJiBlocked}
        onAnimationComplete={handleJiJiAnimationComplete}
      />

      {/* Formative Feedback Animation - conditional based on mode */}
      {useSymbolicDisplay && useTwoSorobans ? (
        /* Symbolic two-digit mode (score >= 30): Use SimpleAdditionFeedbackTwo for counting box */
        <SimpleAdditionFeedbackTwo
          isActive={showingFeedback}
          tensHeavenBeadActive={currentTensHeavenBead}
          tensEarthBeadsActive={currentTensEarthBeads}
          onesHeavenBeadActive={currentOnesHeavenBead}
          onesEarthBeadsActive={currentOnesEarthBeads}
          sorobanRect={sorobanRect}
          countingBoxRect={countingBoxRect}
          onComplete={() => {
            const isCorrect = (tensValue * 10 + onesValue) === targetNumber;
            handleFeedbackComplete(isCorrect);
          }}
          onBeadArrived={(count) => {
            // Update counting box display as beads arrive
            setCountingBoxValue(count);
          }}
        />
      ) : useSymbolicDisplay ? (
        /* Symbolic single-digit mode (score 20-29): Use SimpleAdditionFeedback (just flies beads to counting box) */
        <SimpleAdditionFeedback
          isActive={showingFeedback}
          heavenBeadActive={currentHeavenBead}
          earthBeadsActive={currentEarthBeads}
          sorobanRect={sorobanRect}
          countingBoxRect={countingBoxRect}
          onComplete={() => {
            const isCorrect = sorobanValue === targetNumber;
            handleFeedbackComplete(isCorrect);
          }}
          onBeadArrived={(count) => {
            // Update counting box display as beads arrive
            setCountingBoxValue(count);
          }}
        />
      ) : useTwoSorobans ? (
        <NumberMatchingFeedbackTwo
          isActive={showingFeedback}
          targetCount={targetNumber}
          tensHeavenBeadActive={currentTensHeavenBead}
          tensEarthBeadsActive={currentTensEarthBeads}
          onesHeavenBeadActive={currentOnesHeavenBead}
          onesEarthBeadsActive={currentOnesEarthBeads}
          sorobanRect={sorobanRect}
          objectsContainerRect={objectsRect}
          onComplete={handleFeedbackComplete}
          onShowJiJi={handleShowJiJi}
          onObjectMatched={handleObjectMatched}
          showBlockingGlow={showBlockingGlow}
        />
      ) : (
        <NumberMatchingFeedback
          isActive={showingFeedback}
          targetCount={targetNumber}
          heavenBeadActive={currentHeavenBead}
          earthBeadsActive={currentEarthBeads}
          sorobanRect={sorobanRect}
          objectsContainerRect={objectsRect}
          onComplete={handleFeedbackComplete}
          onShowJiJi={handleShowJiJi}
          onObjectMatched={handleObjectMatched}
          showBlockingGlow={showBlockingGlow}
        />
      )}

      {/* Header */}
      <div
        onClick={(e) => e.stopPropagation()}
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

        {/* Score display */}
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

      {/* Objects display - conditional: symbolic number OR visual objects */}
      <div
        ref={objectsRef}
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px',
          paddingBottom: '40px',
          minHeight: 0,
        }}
      >
        {useSymbolicDisplay ? (
          /* Symbolic mode: Show target number and counting box */
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
            {/* Target number box */}
            <div ref={targetBoxRef} style={{ position: 'relative', width: useTwoSorobans ? 96 : 64, height: 76 }}>
              {/* Box fades out */}
              <motion.div
                style={{
                  position: 'absolute',
                  width: useTwoSorobans ? 96 : 64,
                  height: 76,
                  border: '3px solid #5D4632',
                  borderRadius: 8,
                  background: '#FFF8E7',
                }}
                animate={
                  verificationResult
                    ? { opacity: 0 }
                    : { opacity: 1 }
                }
                transition={{ duration: 0.3 }}
              />
              {/* Number stays visible during verification, fades when JiJi flies */}
              <motion.div
                style={{
                  position: 'absolute',
                  width: useTwoSorobans ? 96 : 64,
                  height: 76,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 64,
                  fontWeight: 'bold',
                  color: '#2D1810',
                }}
                animate={{
                  opacity: (verificationResult === 'correct' && jijiFlying) ? 0 : 1
                }}
                transition={{ duration: 0.3 }}
              >
                {targetNumber}
              </motion.div>
            </div>

            {/* Counting box - appears during verification */}
            <motion.div
              ref={countingBoxRef}
              style={{
                width: useTwoSorobans ? 96 : 64,
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
              key={countingBoxValue} // Key change triggers new animation on each increment
              animate={
                verificationResult
                  ? { opacity: 0, scale: 0.8 }
                  : (countingBoxValue > 0)
                  ? { scale: [1, 1.2, 1], opacity: 1 }
                  : { opacity: showingFeedback ? 1 : 0, scale: 1 }
              }
              transition={{ duration: 0.3 }}
            >
              {countingBoxValue > 0 ? countingBoxValue : ''}
            </motion.div>

            {/* Sliding number for verification - invisible box approach */}
            {verificationResult && countingBoxValue > 0 && targetBoxRef.current && countingBoxRef.current && (() => {
              const targetRect = targetBoxRef.current.getBoundingClientRect();
              const countingRect = countingBoxRef.current.getBoundingClientRect();

              // Start position: counting box center
              const startX = countingRect.left + countingRect.width / 2;
              const startY = countingRect.top + countingRect.height / 2;

              // End position: target box center
              const endX = targetRect.left + targetRect.width / 2;
              const endY = targetRect.top + targetRect.height / 2;

              // Calculate distance to move
              const deltaX = endX - startX;
              const deltaY = endY - startY;

              return (
                <motion.div
                  style={{
                    position: 'fixed',
                    left: startX,
                    top: startY,
                    width: 64,
                    height: 76,
                    marginLeft: -32, // Half width to center
                    marginTop: -38,  // Half height to center
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 64,
                    fontWeight: 'bold',
                    zIndex: 1000,
                    pointerEvents: 'none',
                  }}
                  initial={{ x: 0, y: 0, opacity: 1, color: '#2D1810' }}
                  animate={{
                    x: verificationResult === 'correct' ? deltaX : verificationResult === 'incorrect' ? deltaX : 0,
                    y: verificationResult === 'correct' ? deltaY : verificationResult === 'incorrect' ? deltaY * 0.5 : 0,
                    color: verificationResult === 'correct'
                      ? ['#2D1810', '#2D1810', '#4CAF50', '#4CAF50', '#4CAF50']
                      : verificationResult === 'incorrect' ? '#F44336' : '#2D1810',
                    scale: verificationResult === 'correct' ? [1, 1, 1.2, 1, 1.2, 1] : 1,
                    opacity: verificationResult === 'correct' ? [1, 1, 1, 1, 1, 0] : 1,
                  }}
                  transition={{
                    x: { duration: 0.5, ease: verificationResult === 'incorrect' ? [0.25, 0.1, 0.25, 1] : 'easeInOut' },
                    y: { duration: 0.5, ease: verificationResult === 'incorrect' ? [0.25, 0.1, 0.25, 1] : 'easeInOut' },
                    color: verificationResult === 'correct' ? { duration: 0.6, delay: 0.5, times: [0, 0.45, 0.5, 0.75, 1] } : {},
                    scale: verificationResult === 'correct' ? { duration: 0.6, delay: 0.5, times: [0, 0.45, 0.5, 0.75, 1] } : {},
                    opacity: verificationResult === 'correct' ? { duration: 0.8, delay: 1.1 } : {}, // Slower fade: 0.8s instead of 0.3s
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
              );
            })()}
          </div>
        ) : (
          /* Visual objects mode */
          <VisualObjects count={targetNumber} matched={matchedObjects} showBlockingGlow={showBlockingGlow} />
        )}
      </div>

      {/* Soroban area - conditional single or two sorobans */}
      <div
        ref={sorobanRef}
        style={{
          display: 'flex',
          flexDirection: useTwoSorobans ? 'row' : 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: useTwoSorobans ? 0 : 16,
          padding: '0 20px',
          flexShrink: 0,
          userSelect: 'none',
          WebkitUserSelect: 'none',
          WebkitTouchCallout: 'none',
          opacity: showingFeedback ? 0.3 : 1,
          transition: 'opacity 0.8s ease, filter 0.1s ease-out',
          filter: showSorobanGlow
            ? 'drop-shadow(0 0 30px rgba(255, 255, 255, 1)) drop-shadow(0 0 60px rgba(255, 255, 255, 1)) drop-shadow(0 0 90px rgba(255, 255, 255, 0.8))'
            : 'none',
        }}
      >
        {useTwoSorobans ? (
          <>
            {/* Tens place soroban (left) with ×10 label - limited to 1 earth bead */}
            <div onClick={(e) => e.stopPropagation()}>
              <Soroban
                key={`tens-${resetKey}`}
                rodCount={1}
                initialValue={0}
                onValueChange={setTensValue}
                disabled={showingFeedback}
                maxValue={1}
                sizeConfig={{
                  beadSize: 42,
                  beadSpacing: 7,
                  rodWidth: 60,
                  framepadding: 14,
                }}
                showValue={!useSymbolicDisplay}
                frameLabel="×10"
              />
            </div>

            {/* Ones place soroban (right) with dot */}
            <div onClick={(e) => e.stopPropagation()}>
              <Soroban
                key={`ones-${resetKey}`}
                rodCount={1}
                initialValue={0}
                onValueChange={setOnesValue}
                disabled={showingFeedback}
                sizeConfig={{
                  beadSize: 42,
                  beadSpacing: 7,
                  rodWidth: 60,
                  framepadding: 14,
                }}
                showValue={!useSymbolicDisplay}
                frameLabel="dot"
              />
            </div>
          </>
        ) : (
          <div onClick={(e) => e.stopPropagation()}>
            <Soroban
              key={resetKey}
              rodCount={1}
              initialValue={0}
              onValueChange={setSorobanValue}
              disabled={showingFeedback}
              sizeConfig={{
                beadSize: 42,
                beadSpacing: 7,
                rodWidth: 60,
                framepadding: 14,
              }}
              showValue={!useSymbolicDisplay}
              frameLabel="dot"
            />
          </div>
        )}
      </div>

      {/* Bottom control bar */}
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          display: 'flex',
          gap: 12,
          padding: '16px 20px',
          flexShrink: 0,
        }}
      >
        {/* GO button */}
        <motion.button
          onClick={handleGo}
          disabled={showingFeedback || (useTwoSorobans ? (onesValue + tensValue * 10) === 0 : sorobanValue === 0)}
          style={{
            flex: 7,
            height: 56,
            borderRadius: 12,
            background: (showingFeedback || (useTwoSorobans ? (onesValue + tensValue * 10) === 0 : sorobanValue === 0))
              ? '#BDBDBD'
              : 'linear-gradient(135deg, #4CAF50 0%, #2E7D32 100%)',
            color: 'white',
            border: 'none',
            fontSize: 20,
            fontWeight: 'bold',
            cursor: (showingFeedback || (useTwoSorobans ? (onesValue + tensValue * 10) === 0 : sorobanValue === 0)) ? 'not-allowed' : 'pointer',
            boxShadow: (showingFeedback || (useTwoSorobans ? (onesValue + tensValue * 10) === 0 : sorobanValue === 0)) ? 'none' : '0 4px 12px rgba(76,175,80,0.4)',
          }}
          whileHover={(showingFeedback || (useTwoSorobans ? (onesValue + tensValue * 10) === 0 : sorobanValue === 0)) ? {} : { scale: 1.02 }}
          whileTap={(showingFeedback || (useTwoSorobans ? (onesValue + tensValue * 10) === 0 : sorobanValue === 0)) ? {} : { scale: 0.98 }}
        >
          GO ➤
        </motion.button>

        {/* Reset button */}
        <motion.button
          onClick={handleReset}
          disabled={showingFeedback}
          style={{
            flex: 3,
            height: 56,
            borderRadius: 12,
            background: showingFeedback ? '#E0E0E0' : '#FFF8E7',
            color: '#5D4632',
            border: '2px solid #D4C4A8',
            fontSize: 16,
            fontWeight: 'bold',
            cursor: showingFeedback ? 'not-allowed' : 'pointer',
            boxShadow: '0 2px 6px rgba(0,0,0,0.1)',
          }}
          whileHover={showingFeedback ? {} : { scale: 1.02 }}
          whileTap={showingFeedback ? {} : { scale: 0.98 }}
        >
          ↻
        </motion.button>
      </div>

    </div>
  );
}
