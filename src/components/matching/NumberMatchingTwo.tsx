import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { Soroban } from '../soroban/Soroban';
import { VisualObjects } from './VisualObjects';
import { JiJiCharacter } from './JiJiCharacter';
import { NumberMatchingFeedbackTwo } from './NumberMatchingFeedbackTwo';
import { sounds } from '../../utils/sounds';

interface NumberMatchingProps {
  onBack: () => void;
}

const VERSION = 'v1.0.0-two-digit';

export function NumberMatchingTwo({ onBack }: NumberMatchingProps) {
  const [targetNumber, setTargetNumber] = useState(10);
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

  // Track current soroban states for feedback (both tens and ones)
  const [currentTensHeavenBead, setCurrentTensHeavenBead] = useState(false);
  const [currentTensEarthBeads, setCurrentTensEarthBeads] = useState(0);
  const [currentOnesHeavenBead, setCurrentOnesHeavenBead] = useState(false);
  const [currentOnesEarthBeads, setCurrentOnesEarthBeads] = useState(0);

  // Glow effect for teaching interactivity
  const [showSorobanGlow, setShowSorobanGlow] = useState(false);

  // Red glow for blocking obstacles
  const [showBlockingGlow, setShowBlockingGlow] = useState(false);

  const sorobanValue = onesValue + tensValue * 10;

  useEffect(() => {
    console.log(`🎯 NumberMatchingTwo ${VERSION} loaded`);
  }, []);

  // Generate new problem (10-15 objects)
  const generateProblem = () => {
    const newNumber = Math.floor(Math.random() * 6) + 10; // 10-15
    setTargetNumber(newNumber);
    setResetKey((prev) => prev + 1);
    setShowingFeedback(false);
    setShowJiJi(false);
    setJijiFlying(false);
    setMatchedObjects(new Set());
  };

  const handleObjectMatched = (index: number) => {
    console.log(`🎯 NumberMatching: Adding object ${index} to matched set`);
    setMatchedObjects(prev => {
      const newSet = new Set([...prev, index]);
      console.log(`   Matched objects now:`, Array.from(newSet));
      return newSet;
    });
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

    // Capture current soroban states (tens and ones separately)
    const tensHeaven = tensValue >= 5;
    const tensEarth = tensValue >= 5 ? tensValue - 5 : tensValue;
    const onesHeaven = onesValue >= 5;
    const onesEarth = onesValue >= 5 ? onesValue - 5 : onesValue;

    console.log(`🎯 handleGo: tens=${tensValue} (H:${tensHeaven}, E:${tensEarth}), ones=${onesValue} (H:${onesHeaven}, E:${onesEarth}), total=${sorobanValue}`);

    setCurrentTensHeavenBead(tensHeaven);
    setCurrentTensEarthBeads(tensEarth);
    setCurrentOnesHeavenBead(onesHeaven);
    setCurrentOnesEarthBeads(onesEarth);

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
      setScore((prev) => prev + 1);
      // Generate new problem after correct answer
      setTimeout(() => {
        setProblemNumber((prev) => prev + 1);
        generateProblem();
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
        sorobanValue={sorobanValue}
        objectsContainerRect={objectsRect}
        onBlocked={handleJiJiBlocked}
      />

      {/* Formative Feedback Animation - Two Digit Version */}
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

      {/* Two Soroban area */}
      <div
        ref={sorobanRef}
        style={{
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 0,
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
        {/* Tens place soroban (left) with ×10 label on frame */}
        <div onClick={(e) => e.stopPropagation()}>
          <Soroban
            key={`tens-${resetKey}`}
            rodCount={1}
            initialValue={0}
            onValueChange={setTensValue}
            disabled={showingFeedback}
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

        {/* Ones place soroban (right) with dot on frame */}
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
            showValue={false}
            frameLabel="dot"
          />
        </div>
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
          disabled={showingFeedback || sorobanValue === 0}
          style={{
            flex: 7,
            height: 56,
            borderRadius: 12,
            background: (showingFeedback || sorobanValue === 0)
              ? '#BDBDBD'
              : 'linear-gradient(135deg, #4CAF50 0%, #2E7D32 100%)',
            color: 'white',
            border: 'none',
            fontSize: 20,
            fontWeight: 'bold',
            cursor: (showingFeedback || sorobanValue === 0) ? 'not-allowed' : 'pointer',
            boxShadow: (showingFeedback || sorobanValue === 0) ? 'none' : '0 4px 12px rgba(76,175,80,0.4)',
          }}
          whileHover={(showingFeedback || sorobanValue === 0) ? {} : { scale: 1.02 }}
          whileTap={(showingFeedback || sorobanValue === 0) ? {} : { scale: 0.98 }}
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
