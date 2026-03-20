import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Soroban } from '../soroban/Soroban';

interface Problem {
  startValue: number;
  operation: '+' | '-';
  operand: number;
  targetValue: number;
  rodCount: number;
}

function generateProblem(level: number): Problem {
  // Start simple for now - we can add belt levels later
  const rodCount = Math.min(level + 1, 3);
  const maxValue = Math.pow(10, rodCount) - 1;

  let startValue = 0;
  let operand = 1;
  let targetValue = 0;
  const operation: '+' | '-' = Math.random() < 0.5 ? '+' : '-';

  // Keep trying until we get a solvable problem
  let attempts = 0;
  do {
    if (operation === '+') {
      // For addition: start can be 0 to maxValue-1
      startValue = Math.floor(Math.random() * maxValue);
      const maxOperand = maxValue - startValue;
      if (maxOperand < 1) continue;
      operand = Math.floor(Math.random() * maxOperand) + 1;
      targetValue = startValue + operand;
    } else {
      // For subtraction: start must be at least 1
      startValue = Math.floor(Math.random() * maxValue) + 1;
      operand = Math.floor(Math.random() * startValue) + 1;
      targetValue = startValue - operand;
    }

    attempts++;
  } while ((targetValue > maxValue || targetValue < 0) && attempts < 100);

  return { startValue, operation, operand, targetValue, rodCount };
}

interface PracticeModeProps {
  onBack: () => void;
}

export function PracticeMode({ onBack }: PracticeModeProps) {
  const [problem, setProblem] = useState<Problem>(() => generateProblem(0));
  const [sorobanValue, setSorobanValue] = useState(0);
  const [resetKey, setResetKey] = useState(0);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [showFeedback, setShowFeedback] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);

  // Initialize soroban to start value
  useEffect(() => {
    setResetKey(prev => prev + 1);
  }, [problem.startValue]);

  const handleGo = () => {
    const correct = sorobanValue === problem.targetValue;
    setIsCorrect(correct);
    setShowFeedback(true);

    if (correct) {
      const newStreak = streak + 1;
      setStreak(newStreak);
      if (newStreak > bestStreak) {
        setBestStreak(newStreak);
      }

      // Move to next problem quickly
      setTimeout(() => {
        const level = Math.floor(streak / 5); // Increase difficulty every 5 correct
        setProblem(generateProblem(level));
        setShowFeedback(false);
      }, 400);
    } else {
      setStreak(0);
      // Reset soroban after showing feedback
      setTimeout(() => {
        setResetKey(prev => prev + 1);
        setShowFeedback(false);
      }, 600);
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

        {/* Streak display */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 4,
          }}
        >
          <div
            style={{
              fontSize: 28,
              fontWeight: 'bold',
              color: '#2D1810',
            }}
          >
            🔥 {streak}
          </div>
          <div
            style={{
              fontSize: 12,
              color: '#5D4632',
              opacity: 0.7,
            }}
          >
            Best: {bestStreak}
          </div>
        </div>

        {/* Right spacer */}
        <div style={{ width: 48 }} />
      </div>

      {/* Problem display */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px',
          minHeight: 0,
        }}
      >
        <motion.div
          key={`${problem.startValue}-${problem.operand}`}
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          style={{
            fontSize: 72,
            fontWeight: 'bold',
            color: '#2D1810',
            textAlign: 'center',
          }}
        >
          {problem.operation}{problem.operand}
        </motion.div>
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
            key={`${resetKey}-${problem.startValue}`}
            rodCount={problem.rodCount}
            initialValue={problem.startValue}
            onValueChange={setSorobanValue}
            sizeConfig={{
              beadSize: 42,
              beadSpacing: 7,
              rodWidth: 60,
              framepadding: 14,
            }}
            showValue={false}
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
