import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Soroban } from '../soroban/Soroban';
import { CourseLevel } from '../../levels/courseLevels';
import { VisualObject, numberToRodStates } from '../../models/types';
import { FormativeFeedback } from '../game/FormativeFeedback';
import { useResponsiveSize } from '../../hooks/useResponsiveSize';

interface ObjectMatchingProps {
  level: CourseLevel;
  onBack: () => void;
  onComplete: (stats: {
    totalProblems: number;
    correctFirstTry: number;
    totalCorrect: number;
    hintsUsed: number;
    accuracy: number;
  }) => void;
}

const OBJECT_TYPES: VisualObject['type'][] = [
  'apple',
  'butterfly',
  'flower',
  'fish',
  'ball',
];

export function ObjectMatching({ level, onBack, onComplete }: ObjectMatchingProps) {
  const [currentProblem, setCurrentProblem] = useState(0);
  const [targetValue, setTargetValue] = useState(0);
  const [currentObjectType, setCurrentObjectType] = useState<VisualObject['type']>('apple');
  const [visualObjects, setVisualObjects] = useState<VisualObject[]>([]);
  const [userValue, setUserValue] = useState(0);
  const [showFeedback, setShowFeedback] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [correctFirstTry, setCorrectFirstTry] = useState(0);
  const [totalCorrect, setTotalCorrect] = useState(0);

  const [sorobanRect, setSorobanRect] = useState<DOMRect | null>(null);
  const [problemDisplayRect, setProblemDisplayRect] = useState<DOMRect | null>(null);

  const sorobanRef = useRef<HTMLDivElement>(null);
  const problemDisplayRef = useRef<HTMLDivElement>(null);
  const objectRefs = useRef<(HTMLDivElement | null)[]>([]);

  const rodCount = level.config.rodCount || 1;
  const valueRange = level.config.valueRange || { min: 1, max: 4 };

  // Responsive sizing for mobile
  const responsiveSizeConfig = useResponsiveSize({ rodCount });

  // Generate new problem
  const generateProblem = useCallback(() => {
    const value = Math.floor(Math.random() * (valueRange.max - valueRange.min + 1)) + valueRange.min;
    const objectType = OBJECT_TYPES[Math.floor(Math.random() * OBJECT_TYPES.length)];

    setTargetValue(value);
    setCurrentObjectType(objectType);
    setUserValue(0);
    setShowFeedback(false);
    setAttempts(0);

    // Create visual objects - positions will be set after render
    const objects: VisualObject[] = [];
    for (let i = 0; i < value; i++) {
      objects.push({
        id: `obj-${i}`,
        type: objectType,
        x: 0,
        y: 0,
      });
    }
    setVisualObjects(objects);
  }, [valueRange]);

  // Initialize first problem
  useEffect(() => {
    generateProblem();
  }, [generateProblem]);

  // Calculate rod states for animation - memoized to prevent re-initialization
  const rodBeadStates = useMemo(() => {
    const rodStates = numberToRodStates(userValue, rodCount);
    return rodStates.map(rod => ({
      rodIndex: rod.rodIndex,
      heavenBeadActive: rod.heavenBeadActive,
      earthBeadsActive: rod.earthBeadsActive,
    }));
  }, [userValue, rodCount]);

  const handleCheck = useCallback(() => {
    // Capture actual positions of rendered objects
    const updatedObjects = visualObjects.map((obj, i) => {
      const element = objectRefs.current[i];
      if (element) {
        const rect = element.getBoundingClientRect();
        return {
          ...obj,
          x: rect.left + rect.width / 2,
          y: rect.top + rect.height / 2,
        };
      }
      return obj;
    });

    setVisualObjects(updatedObjects);
    setShowFeedback(true);

    // Capture element positions
    if (sorobanRef.current && problemDisplayRef.current) {
      setSorobanRect(sorobanRef.current.getBoundingClientRect());
      setProblemDisplayRect(problemDisplayRef.current.getBoundingClientRect());
    }
  }, [visualObjects]);

  const handleAllTargetsMatched = useCallback(() => {
    // Called when all objects have been matched - can add visual feedback here if needed
  }, []);

  const handleFeedbackComplete = useCallback((isCorrect: boolean) => {
    if (isCorrect) {
      const isFirstAttempt = attempts === 0;
      setTotalCorrect(totalCorrect + 1);
      if (isFirstAttempt) {
        setCorrectFirstTry(correctFirstTry + 1);
      }

      // Move to next problem or complete
      setTimeout(() => {
        if (currentProblem + 1 >= level.problemCount) {
          // Level complete
          const finalTotal = totalCorrect + 1;
          const finalFirstTry = correctFirstTry + (isFirstAttempt ? 1 : 0);
          const accuracy = (finalTotal / level.problemCount) * 100;
          onComplete({
            totalProblems: level.problemCount,
            correctFirstTry: finalFirstTry,
            totalCorrect: finalTotal,
            hintsUsed: 0,
            accuracy,
          });
        } else {
          setCurrentProblem(currentProblem + 1);
          generateProblem();
        }
      }, 300);
    } else {
      // Incorrect - reset and try again after delay
      setAttempts(attempts + 1);
      setTimeout(() => {
        generateProblem();
      }, 500);
    }
  }, [attempts, correctFirstTry, totalCorrect, currentProblem, level.problemCount, onComplete, generateProblem]);

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        background: 'linear-gradient(135deg, #E8DCC8 0%, #D4C4A8 100%)',
        paddingTop: 'calc(env(safe-area-inset-top) + 50px)',
        paddingBottom: 'max(20px, env(safe-area-inset-bottom))',
      }}
    >
      {/* Header */}
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
            background: 'linear-gradient(135deg, #8B7355 0%, #6B5344 100%)',
            color: 'white',
            border: 'none',
            fontSize: 24,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
          }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          ←
        </motion.button>

        {/* Progress */}
        <div
          style={{
            fontSize: 16,
            fontWeight: 'bold',
            color: '#2D1810',
          }}
        >
          {currentProblem + 1} / {level.problemCount}
        </div>

        {/* Spacer for balance */}
        <div style={{ width: 48 }} />
      </div>

      {/* Main content */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          padding: 20,
          position: 'relative',
        }}
      >
        {/* Objects display - takes flexible space at top */}
        <div
          ref={problemDisplayRef}
          style={{
            flex: 1,
            display: 'flex',
            flexWrap: 'wrap',
            gap: 16,
            justifyContent: 'center',
            alignItems: 'center',
            alignContent: 'center',
            width: '100%',
            maxWidth: 400,
          }}
        >
          {visualObjects.map((obj, i) => (
            <motion.div
              key={obj.id}
              ref={(el) => {
                objectRefs.current[i] = el;
              }}
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ delay: i * 0.1, type: 'spring' }}
              style={{
                fontSize: 52,
              }}
            >
              {obj.type === 'apple' && '🍎'}
              {obj.type === 'butterfly' && '🦋'}
              {obj.type === 'flower' && '🌸'}
              {obj.type === 'fish' && '🐠'}
              {obj.type === 'ball' && '⚽'}
            </motion.div>
          ))}
        </div>

        {/* Soroban - fixed position at bottom */}
        <div
          ref={sorobanRef}
          style={{
            position: 'relative',
            marginTop: 'auto',
            marginBottom: 80,
            opacity: showFeedback ? 0.25 : 1,
            transition: 'opacity 0.3s ease',
          }}
        >
          <Soroban
            size="mobile"
            rodCount={rodCount}
            showValue={false}
            initialValue={0}
            key={currentProblem}
            onValueChange={(value: number) => setUserValue(value)}
            disabled={showFeedback}
            sizeConfig={responsiveSizeConfig}
          />
        </div>

        {/* Go button - fixed at bottom */}
        <div
          style={{
            position: 'absolute',
            bottom: 20,
            left: 0,
            right: 0,
            display: 'flex',
            justifyContent: 'center',
          }}
        >
          <motion.button
            onClick={handleCheck}
            disabled={showFeedback}
            style={{
              width: 64,
              height: 64,
              borderRadius: '50%',
              background: showFeedback
                ? '#BDBDBD'
                : 'linear-gradient(135deg, #4CAF50 0%, #2E7D32 100%)',
              color: 'white',
              border: 'none',
              fontSize: 32,
              cursor: showFeedback ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: showFeedback ? 'none' : '0 4px 12px rgba(76,175,80,0.4)',
            }}
            whileHover={!showFeedback ? { scale: 1.1 } : {}}
            whileTap={!showFeedback ? { scale: 0.95 } : {}}
          >
            <div style={{ marginLeft: 4 }}>➤</div>
          </motion.button>
        </div>
      </div>

      {/* Formative Feedback Animation */}
      {showFeedback && sorobanRect && problemDisplayRect && (
        <FormativeFeedback
          isActive={showFeedback}
          objects={visualObjects}
          sorobanValue={userValue}
          heavenBeadActive={rodBeadStates[0]?.heavenBeadActive || false}
          earthBeadsActive={rodBeadStates[0]?.earthBeadsActive || 0}
          sorobanRect={sorobanRect}
          problemDisplayRect={problemDisplayRect}
          onComplete={handleFeedbackComplete}
          onAllTargetsMatched={handleAllTargetsMatched}
          displayMode="objects"
          targetValue={targetValue}
          maxValue={valueRange.max}
          rodCount={rodCount}
          rodStates={rodBeadStates}
        />
      )}
    </div>
  );
}
