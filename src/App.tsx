import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Soroban } from './components/soroban/Soroban';
import { GameContainer } from './components/game/GameContainer';
import { ALL_LEVELS, getLevelById } from './levels/level1-counting';
import { useProgressStore } from './store/progressStore';
import { LevelDefinition } from './models/types';
import { calculateSessionStats } from './engine/LearningEngine';
import './App.css';

type Screen = 'home' | 'practice' | 'game';

function App() {
  const [screen, setScreen] = useState<Screen>('home');
  const [selectedLevel, setSelectedLevel] = useState<LevelDefinition | null>(null);
  const [practiceRodCount, setPracticeRodCount] = useState(1);

  const { getLevelProgress, recordLevelCompletion } = useProgressStore();

  const handleStartLevel = useCallback((level: LevelDefinition) => {
    setSelectedLevel(level);
    setScreen('game');
  }, []);

  const handleExitGame = useCallback(() => {
    setSelectedLevel(null);
    setScreen('home');
  }, []);

  const handleLevelComplete = useCallback(
    (stats: ReturnType<typeof calculateSessionStats>) => {
      if (selectedLevel) {
        recordLevelCompletion(
          selectedLevel.id,
          stats.accuracy,
          stats.correctFirstTry,
          stats.totalProblems,
          stats.hintsUsed
        );
      }
    },
    [selectedLevel, recordLevelCompletion]
  );

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
            background: 'linear-gradient(135deg, #E8DCC8 0%, #D4C4A8 100%)',
            padding: 20,
            gap: 24,
          }}
        >
          <h1
            style={{
              fontSize: 40,
              color: '#2D1810',
              fontFamily: '"Segoe UI", system-ui, sans-serif',
              margin: 0,
              marginTop: 20,
              textShadow: '0 2px 4px rgba(0,0,0,0.1)',
            }}
          >
            Soroban
          </h1>

          <p
            style={{
              color: '#5D4632',
              fontSize: 16,
              textAlign: 'center',
              maxWidth: 400,
              margin: 0,
            }}
          >
            Learn to count with the Japanese abacus
          </p>

          {/* Level selection */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 16,
              width: '100%',
              maxWidth: 400,
              marginTop: 16,
            }}
          >
            <h2
              style={{
                fontSize: 20,
                color: '#2D1810',
                margin: 0,
                fontWeight: 600,
              }}
            >
              Choose a Level
            </h2>

            {ALL_LEVELS.map((level) => {
              const progress = getLevelProgress(level.id);
              // All levels available for testing (no locking)
              const stars = progress.stars;

              return (
                <motion.button
                  key={level.id}
                  onClick={() => handleStartLevel(level)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 16,
                    padding: 16,
                    background: 'linear-gradient(135deg, #FFF8E7 0%, #F5E6C8 100%)',
                    border: 'none',
                    borderRadius: 16,
                    cursor: 'pointer',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                  }}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  {/* Level icon */}
                  <div
                    style={{
                      width: 56,
                      height: 56,
                      borderRadius: '50%',
                      background: 'linear-gradient(135deg, #8B7355 0%, #5D4632 100%)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 24,
                      color: 'white',
                      fontWeight: 'bold',
                    }}
                  >
                    {level.id}
                  </div>

                  {/* Level info */}
                  <div
                    style={{
                      flex: 1,
                      textAlign: 'left',
                    }}
                  >
                    <div
                      style={{
                        fontSize: 18,
                        fontWeight: 'bold',
                        color: '#2D1810',
                      }}
                    >
                      {level.name}
                    </div>
                    <div
                      style={{
                        fontSize: 14,
                        color: '#8B7355',
                      }}
                    >
                      Numbers {level.valueRange.min}-{level.valueRange.max}
                    </div>
                  </div>

                  {/* Stars */}
                  <div style={{ display: 'flex', gap: 4 }}>
                    {[1, 2, 3].map((i) => (
                      <span
                        key={i}
                        style={{
                          fontSize: 20,
                          opacity: i <= stars ? 1 : 0.3,
                        }}
                      >
                        ⭐
                      </span>
                    ))}
                  </div>
                </motion.button>
              );
            })}
          </div>

          {/* Practice mode button */}
          <motion.button
            onClick={() => setScreen('practice')}
            style={{
              marginTop: 24,
              padding: '16px 32px',
              fontSize: 18,
              color: '#5D4632',
              background: 'transparent',
              border: '2px solid #8B7355',
              borderRadius: 12,
              cursor: 'pointer',
            }}
            whileHover={{ scale: 1.05, background: 'rgba(139, 115, 85, 0.1)' }}
            whileTap={{ scale: 0.95 }}
          >
            Free Practice
          </motion.button>
        </motion.div>
      )}

      {screen === 'practice' && (
        <motion.div
          key="practice"
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
            gap: 30,
          }}
        >
          {/* Back button */}
          <motion.button
            onClick={() => setScreen('home')}
            style={{
              position: 'absolute',
              top: 20,
              left: 20,
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

          <h1
            style={{
              fontSize: 32,
              color: '#2D1810',
              fontFamily: '"Segoe UI", system-ui, sans-serif',
              margin: 0,
              textShadow: '0 2px 4px rgba(0,0,0,0.1)',
            }}
          >
            Free Practice
          </h1>

          <Soroban
            rodCount={practiceRodCount}
            size="large"
            showValue={true}
          />

          {/* Rod count controls */}
          <div
            style={{
              display: 'flex',
              gap: 12,
              alignItems: 'center',
            }}
          >
            <span style={{ color: '#2D1810', fontWeight: 500 }}>Rods:</span>
            {[1, 2, 3, 4, 5].map((count) => (
              <button
                key={count}
                onClick={() => setPracticeRodCount(count)}
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: '50%',
                  border:
                    practiceRodCount === count
                      ? '3px solid #4CAF50'
                      : '2px solid #8B7355',
                  background:
                    practiceRodCount === count ? '#E8F5E9' : '#FFF8E7',
                  color: '#2D1810',
                  fontSize: 18,
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
              >
                {count}
              </button>
            ))}
          </div>

          <p
            style={{
              color: '#5D4632',
              fontSize: 14,
              textAlign: 'center',
              maxWidth: 400,
              lineHeight: 1.6,
            }}
          >
            Click on beads to move them. The top bead (heaven bead) is worth 5.
            Each bottom bead (earth bead) is worth 1.
          </p>
        </motion.div>
      )}

      {screen === 'game' && selectedLevel && (
        <motion.div
          key="game"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          style={{ width: '100%', minHeight: '100vh' }}
        >
          <GameContainer
            level={selectedLevel}
            onExit={handleExitGame}
            onLevelComplete={handleLevelComplete}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default App;
