import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { Soroban } from '../soroban/Soroban';
import { VisualObjects } from './VisualObjects';
import { JiJiCharacter } from './JiJiCharacter';
import { NumberMatchingFeedback } from './NumberMatchingFeedback';
import { NumberMatchingFeedbackTwo } from './NumberMatchingFeedbackTwo';
import { sounds } from '../../utils/sounds';

interface NumberMatchingProps {
  onBack: () => void;
}

const VERSION = 'v1.1.0-progressive';

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

  // Refs for feedback animation
  const sorobanRef = useRef<HTMLDivElement>(null);
  const objectsRef = useRef<HTMLDivElement>(null);
  const [sorobanRect, setSorobanRect] = useState<DOMRect | null>(null);
  const [objectsRect, setObjectsRect] = useState<DOMRect | null>(null);

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

  // Determine if we're using two sorobans (unlocked at 10 stars)
  const useTwoSorobans = score >= 10;

  useEffect(() => {
  }, []);

  // Generate new problem with smart repetition avoidance
  const generateProblem = (currentScore?: number) => {
    // Use passed score if provided, otherwise use state
    const effectiveScore = currentScore !== undefined ? currentScore : score;
    const shouldUseTwoSorobans = effectiveScore >= 10;

    let newNumber: number;
    let min: number;
    let max: number;

    if (shouldUseTwoSorobans) {
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
      // Single soroban
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
    if (objectsRef.current) {
      setObjectsRect(objectsRef.current.getBoundingClientRect());
    }

    // Start feedback animation
    setShowingFeedback(true);
  };

  const handleFeedbackComplete = (isCorrect: boolean) => {
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
  };

  const handleJiJiBlocked = () => {
    // Show red glow at the instant JiJi hits the obstacle
    setShowBlockingGlow(true);
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

  // Regenerate problem when crossing 15-star threshold
  useEffect(() => {
    if (score === 15) {
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
        objectsContainerRect={objectsRect}
        onBlocked={handleJiJiBlocked}
      />

      {/* Formative Feedback Animation - conditional based on mode */}
      {useTwoSorobans ? (
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

      {/* Objects display */}
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
        <VisualObjects count={targetNumber} matched={matchedObjects} showBlockingGlow={showBlockingGlow} />
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
                showValue={true}
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
                showValue={true}
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
              showValue={true}
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
