import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Soroban } from '../soroban/Soroban';
import { CourseLevel } from '../../levels/courseLevels';
import { VisualObject, numberToRodStates } from '../../models/types';
import { MobileGameLayout } from '../layout/MobileGameLayout';
// import { FormativeFeedback } from '../game/FormativeFeedback'; // TEMPORARILY DISABLED for mobile consolidation
// import { useResponsiveSize } from '../../hooks/useResponsiveSize'; // TEMPORARILY DISABLED for mobile consolidation

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

  // TEMPORARILY DISABLED: Responsive sizing for mobile consolidation
  // const responsiveSizeConfig = useResponsiveSize({ rodCount });

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

  const handleAllTargetsMatched = useCallback(() => {
    // Called when all objects have been matched - can add visual feedback here if needed
  }, []);

  const handleFeedbackComplete = useCallback((isCorrect: boolean) => {
    // TEMPORARY: Simple immediate feedback while FormativeFeedback is disabled
    const isFirstAttempt = attempts === 0;

    if (isCorrect) {
      setTotalCorrect(totalCorrect + 1);
      if (isFirstAttempt) {
        setCorrectFirstTry(correctFirstTry + 1);
      }

      // Move to next problem or complete immediately
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
        setShowFeedback(false);
        generateProblem();
      }
    } else {
      // Incorrect - reset and try again
      setAttempts(attempts + 1);
      setShowFeedback(false);
      generateProblem();
    }
  }, [attempts, correctFirstTry, totalCorrect, currentProblem, level.problemCount, onComplete, generateProblem]);

  const handleCheck = useCallback(() => {
    // TEMPORARY: Simple check while FormativeFeedback is disabled
    const isCorrect = userValue === targetValue;
    setShowFeedback(true);

    // Give brief visual feedback then advance
    setTimeout(() => {
      handleFeedbackComplete(isCorrect);
    }, 500);
  }, [userValue, targetValue, handleFeedbackComplete]);

  return (
    <MobileGameLayout
      onBack={onBack}
      progress={`${currentProblem + 1} / ${level.problemCount}`}
      onGo={handleCheck}
      onReset={generateProblem}
      soroban={
        <div
          ref={sorobanRef}
          style={{
            opacity: showFeedback ? 0.25 : 1,
            transition: 'opacity 0.3s ease',
          }}
        >
          <Soroban
            size="mobile"
            rodCount={rodCount}
            showValue={true}
            initialValue={0}
            key={currentProblem}
            onValueChange={(value: number) => setUserValue(value)}
            disabled={showFeedback}
          />
        </div>
      }
    >
      {/* Objects display - takes flexible space at top */}
      <div
        ref={problemDisplayRef}
        style={{
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

      {/* TEMPORARILY DISABLED: Formative Feedback Animation */}
      {/* Will re-enable after mobile consolidation is complete */}
      {/* {showFeedback && sorobanRect && problemDisplayRect && (
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
      )} */}
    </MobileGameLayout>
  );
}
