import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Soroban } from '../soroban/Soroban';

interface TwoDigitAdditionProps {
  onBack: () => void;
  onComplete: (time: number) => void;
}

function generateTwoDigitAddend(): number {
  // Generate smaller 2-digit numbers (10-49) to keep sums within 2 digits
  return Math.floor(Math.random() * 40) + 10; // 10-49
}

export function TwoDigitAddition({ onBack, onComplete }: TwoDigitAdditionProps) {
  const totalProblems = 10;

  const [currentSum, setCurrentSum] = useState(0);
  const [currentAddend, setCurrentAddend] = useState(() => generateTwoDigitAddend());
  const [rodCount, setRodCount] = useState(2);
  const [displaySum, setDisplaySum] = useState<number | null>(null);
  const [sorobanValue, setSorobanValue] = useState(0);
  const [resetKey, setResetKey] = useState(0);
  const [problemCount, setProblemCount] = useState(0);
  const [showFeedback, setShowFeedback] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [isFirstAddend, setIsFirstAddend] = useState(true);
  const [showRunningTotal, setShowRunningTotal] = useState(false);

  // Start timer on mount
  useEffect(() => {
    setStartTime(Date.now());
  }, []);

  const handleGo = () => {
    if (isFirstAddend) {
      // Check if they entered the first addend correctly
      const correct = sorobanValue === currentAddend;
      setIsCorrect(correct);
      setShowFeedback(true);

      if (correct) {
        // Move to second addend
        setTimeout(() => {
          setDisplaySum(currentAddend);
          setCurrentSum(currentAddend);
          const newAddend = generateTwoDigitAddend();
          setCurrentAddend(newAddend);

          // Keep at 2 rods for 2-digit addition
          setRodCount(2);

          setIsFirstAddend(false);
          setShowFeedback(false);
          // Hide running total on success
          setShowRunningTotal(false);
        }, 400);
      } else {
        // Show running total on error
        setShowRunningTotal(true);
        // Reset and try again
        setTimeout(() => {
          setResetKey(prev => prev + 1);
          setShowFeedback(false);
        }, 600);
      }
    } else {
      // Check if they did the addition correctly
      const expectedSum = currentSum + currentAddend;
      const correct = sorobanValue === expectedSum;
      setIsCorrect(correct);
      setShowFeedback(true);

      if (correct) {
        const newProblemCount = problemCount + 1;

        if (newProblemCount >= totalProblems) {
          // Challenge complete!
          const elapsedTime = Date.now() - (startTime || Date.now());
          setTimeout(() => {
            onComplete(elapsedTime);
          }, 400);
        } else {
          // Move to next addition
          setTimeout(() => {
            setDisplaySum(expectedSum);
            setCurrentSum(expectedSum);
            const newAddend = generateTwoDigitAddend();
            setCurrentAddend(newAddend);

            // Keep at 2 rods for 2-digit addition
            setRodCount(2);

            setProblemCount(newProblemCount);
            setShowFeedback(false);
            // Hide running total on success
            setShowRunningTotal(false);
          }, 400);
        }
      } else {
        // Show running total on error
        setShowRunningTotal(true);
        // Reset to current sum and try again
        setTimeout(() => {
          setResetKey(prev => prev + 1);
          setShowFeedback(false);
        }, 600);
      }
    }
  };

  const handleReset = () => {
    setResetKey(prev => prev + 1);
  };

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

        {/* Progress */}
        <div
          style={{
            fontSize: 18,
            fontWeight: 'bold',
            color: '#2D1810',
          }}
        >
          {problemCount} / {totalProblems}
        </div>

        {/* Right spacer */}
        <div style={{ width: 48 }} />
      </div>

      {/* Problem display - two rows */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px',
          minHeight: 0,
          gap: 8,
        }}
      >
        {/* Container to center */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          {/* Current addend with + sign if not first */}
          <motion.div
            key={`addend-${currentAddend}-${isFirstAddend}`}
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            style={{
              fontSize: 48,
              fontWeight: 'bold',
              color: '#2D1810',
              minHeight: 60,
              fontFamily: 'monospace',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            {!isFirstAddend && <span>+</span>}
            <span>{currentAddend}</span>
          </motion.div>
        </div>
      </div>

      {/* Soroban area */}
      <div
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
        }}
      >
        <div
          style={{
            transition: 'filter 0.15s ease',
            filter: showFeedback
              ? isCorrect
                ? 'drop-shadow(0 0 20px rgba(76, 175, 80, 0.8))'
                : 'drop-shadow(0 0 20px rgba(244, 67, 54, 0.8))'
              : 'none',
          }}
        >
          <Soroban
            key={`${resetKey}-${isFirstAddend ? 0 : currentSum}`}
            rodCount={rodCount}
            initialValue={isFirstAddend ? 0 : currentSum}
            onValueChange={setSorobanValue}
            sizeConfig={{
              beadSize: 42,
              beadSpacing: 7,
              rodWidth: 60,
              framepadding: 14,
            }}
            showValue={showRunningTotal}
          />
        </div>
      </div>

      {/* Bottom control bar */}
      <div
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
          disabled={showFeedback}
          style={{
            flex: 7,
            height: 56,
            borderRadius: 12,
            background: showFeedback
              ? '#BDBDBD'
              : 'linear-gradient(135deg, #4CAF50 0%, #2E7D32 100%)',
            color: 'white',
            border: 'none',
            fontSize: 20,
            fontWeight: 'bold',
            cursor: showFeedback ? 'not-allowed' : 'pointer',
            boxShadow: showFeedback ? 'none' : '0 4px 12px rgba(76,175,80,0.4)',
          }}
          whileHover={showFeedback ? {} : { scale: 1.02 }}
          whileTap={showFeedback ? {} : { scale: 0.98 }}
        >
          GO ➤
        </motion.button>

        {/* Reset button */}
        <motion.button
          onClick={handleReset}
          disabled={showFeedback}
          style={{
            flex: 3,
            height: 56,
            borderRadius: 12,
            background: showFeedback ? '#E0E0E0' : '#FFF8E7',
            color: '#5D4632',
            border: '2px solid #D4C4A8',
            fontSize: 16,
            fontWeight: 'bold',
            cursor: showFeedback ? 'not-allowed' : 'pointer',
            boxShadow: '0 2px 6px rgba(0,0,0,0.1)',
          }}
          whileHover={showFeedback ? {} : { scale: 1.02 }}
          whileTap={showFeedback ? {} : { scale: 0.98 }}
        >
          ↻
        </motion.button>
      </div>
    </div>
  );
}
