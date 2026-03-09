import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GameContainer } from './components/game/GameContainer';
import { MultiplicationPrototype } from './components/multiplication/MultiplicationPrototype';
import { SorobanDrill } from './components/drill/SorobanDrill';
import { ADULT_LEVEL_5_COMPETITION } from './levels/level1-counting';
import { useProgressStore } from './store/progressStore';
import { calculateSessionStats } from './engine/LearningEngine';
import './App.css';

type Screen = 'home' | 'drill' | 'addition' | 'multiplication' | 'multiplicationLevels';
type MultiplicationLevel = '2x2' | '2x3' | '3x3';

function AppMobile() {
  const [screen, setScreen] = useState<Screen>('home');
  const [multiplicationLevel, setMultiplicationLevel] = useState<MultiplicationLevel>('2x2');

  const { recordLevelCompletion } = useProgressStore();

  const handleExitToHome = useCallback(() => {
    setScreen('home');
  }, []);

  const handleLevelComplete = useCallback(
    (stats: ReturnType<typeof calculateSessionStats>) => {
      recordLevelCompletion(
        105, // Speed Challenge level ID
        stats.accuracy,
        stats.correctFirstTry,
        stats.totalProblems,
        stats.hintsUsed
      );
    },
    [recordLevelCompletion]
  );

  const handleMultiplicationLevelSelect = (level: MultiplicationLevel) => {
    setMultiplicationLevel(level);
    setScreen('multiplication');
  };

  return (
    <AnimatePresence mode="wait">
      {screen === 'home' && (
        <motion.div
          key="home"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          style={{
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'linear-gradient(135deg, #E8DCC8 0%, #D4C4A8 100%)',
            padding: 20,
            gap: 32,
          }}
        >
          <h1
            style={{
              fontSize: 48,
              color: '#2D1810',
              fontFamily: '"Segoe UI", system-ui, sans-serif',
              margin: 0,
              textShadow: '0 2px 4px rgba(0,0,0,0.1)',
            }}
          >
            Soroban
          </h1>

          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 20,
              width: '100%',
              maxWidth: 400,
            }}
          >
            {/* Drill Mode */}
            <motion.button
              onClick={() => setScreen('drill')}
              style={{
                padding: '24px 32px',
                fontSize: 24,
                fontWeight: 600,
                color: 'white',
                background: 'linear-gradient(135deg, #FF5722 0%, #E64A19 100%)',
                border: 'none',
                borderRadius: 16,
                cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(255, 87, 34, 0.3)',
              }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              Speed Drill
            </motion.button>

            {/* Addition Mode */}
            <motion.button
              onClick={() => setScreen('addition')}
              style={{
                padding: '24px 32px',
                fontSize: 24,
                fontWeight: 600,
                color: 'white',
                background: 'linear-gradient(135deg, #4CAF50 0%, #388E3C 100%)',
                border: 'none',
                borderRadius: 16,
                cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(76, 175, 80, 0.3)',
              }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              Addition Challenge
            </motion.button>

            {/* Multiplication Mode */}
            <motion.button
              onClick={() => setScreen('multiplicationLevels')}
              style={{
                padding: '24px 32px',
                fontSize: 24,
                fontWeight: 600,
                color: 'white',
                background: 'linear-gradient(135deg, #9C27B0 0%, #6A1B9A 100%)',
                border: 'none',
                borderRadius: 16,
                cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(156, 39, 176, 0.3)',
              }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              Multiplication
            </motion.button>
          </div>
        </motion.div>
      )}

      {screen === 'drill' && (
        <motion.div
          key="drill"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          style={{ width: '100%', minHeight: '100vh' }}
        >
          <SorobanDrill onBack={handleExitToHome} />
        </motion.div>
      )}

      {screen === 'addition' && (
        <motion.div
          key="addition"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          style={{ width: '100%', minHeight: '100vh' }}
        >
          <GameContainer
            level={ADULT_LEVEL_5_COMPETITION}
            onExit={handleExitToHome}
            onLevelComplete={handleLevelComplete}
          />
        </motion.div>
      )}

      {screen === 'multiplicationLevels' && (
        <motion.div
          key="multiplicationLevels"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          style={{
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            background: 'linear-gradient(135deg, #E8DCC8 0%, #D4C4A8 100%)',
            padding: 20,
            gap: 24,
          }}
        >
          {/* Back button */}
          <motion.button
            onClick={handleExitToHome}
            style={{
              position: 'absolute',
              top: 20,
              left: 20,
              width: 56,
              height: 56,
              borderRadius: '50%',
              border: 'none',
              background: '#FFF8E7',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 28,
            }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
          >
            ←
          </motion.button>

          <h1
            style={{
              fontSize: 40,
              color: '#2D1810',
              fontFamily: '"Segoe UI", system-ui, sans-serif',
              margin: 0,
              marginTop: 40,
              textShadow: '0 2px 4px rgba(0,0,0,0.1)',
            }}
          >
            Multiplication
          </h1>

          <p
            style={{
              color: '#5D4632',
              fontSize: 18,
              textAlign: 'center',
              maxWidth: 400,
              margin: 0,
            }}
          >
            Choose a difficulty level
          </p>

          {/* Level selection buttons */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 16,
              width: '100%',
              maxWidth: 400,
              marginTop: 20,
            }}
          >
            <motion.button
              onClick={() => handleMultiplicationLevelSelect('2x2')}
              style={{
                padding: '20px 24px',
                fontSize: 20,
                fontWeight: 600,
                color: 'white',
                background: 'linear-gradient(135deg, #9C27B0 0%, #7B1FA2 100%)',
                border: 'none',
                borderRadius: 12,
                cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(156, 39, 176, 0.3)',
                textAlign: 'left',
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
              }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <div>2 × 2 Digits</div>
              <div style={{ fontSize: 14, opacity: 0.9, fontWeight: 400 }}>
                Two-digit multiplication
              </div>
            </motion.button>

            <motion.button
              onClick={() => handleMultiplicationLevelSelect('2x3')}
              style={{
                padding: '20px 24px',
                fontSize: 20,
                fontWeight: 600,
                color: 'white',
                background: 'linear-gradient(135deg, #7B1FA2 0%, #6A1B9A 100%)',
                border: 'none',
                borderRadius: 12,
                cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(123, 31, 162, 0.3)',
                textAlign: 'left',
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
              }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <div>2 × 3 Digits</div>
              <div style={{ fontSize: 14, opacity: 0.9, fontWeight: 400 }}>
                Medium difficulty
              </div>
            </motion.button>

            <motion.button
              onClick={() => handleMultiplicationLevelSelect('3x3')}
              style={{
                padding: '20px 24px',
                fontSize: 20,
                fontWeight: 600,
                color: 'white',
                background: 'linear-gradient(135deg, #6A1B9A 0%, #4A148C 100%)',
                border: 'none',
                borderRadius: 12,
                cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(106, 27, 154, 0.3)',
                textAlign: 'left',
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
              }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <div>3 × 3 Digits</div>
              <div style={{ fontSize: 14, opacity: 0.9, fontWeight: 400 }}>
                Advanced multiplication
              </div>
            </motion.button>
          </div>
        </motion.div>
      )}

      {screen === 'multiplication' && (
        <motion.div
          key="multiplication"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          style={{ width: '100%', minHeight: '100vh' }}
        >
          <MultiplicationPrototype
            onBack={() => setScreen('multiplicationLevels')}
            mode="symbolic"
            initialLevel={multiplicationLevel}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default AppMobile;
