import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Soroban } from './components/soroban/Soroban';
import { GameContainer } from './components/game/GameContainer';
import { MultiplicationPrototype } from './components/multiplication/MultiplicationPrototype';
import { SorobanDrill } from './components/drill/SorobanDrill';
import { ALL_LEVELS, DEMO_LEVELS, COMPLEMENT_LEVELS } from './levels/level1-counting';
import { useProgressStore } from './store/progressStore';
import { LevelDefinition } from './models/types';
import { calculateSessionStats } from './engine/LearningEngine';
import './App.css';

type Screen = 'home' | 'practice' | 'game' | 'multiplication' | 'multiplicationMenu' | 'drill';
type LevelSet = 'demo' | 'full' | 'complements';
type MultiplicationMode = 'area' | 'symbolic';

function App() {
  const [screen, setScreen] = useState<Screen>('home');
  const [selectedLevel, setSelectedLevel] = useState<LevelDefinition | null>(null);
  const [practiceRodCount, setPracticeRodCount] = useState(1);
  const [levelSet, setLevelSet] = useState<LevelSet>('demo');
  const [multiplicationMode, setMultiplicationMode] = useState<MultiplicationMode>('area');

  const { getLevelProgress, recordLevelCompletion } = useProgressStore();

  // Get the appropriate level list based on selected set
  const currentLevels = levelSet === 'demo'
    ? DEMO_LEVELS
    : levelSet === 'complements'
    ? COMPLEMENT_LEVELS
    : ALL_LEVELS;

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

          {/* Level set toggle */}
          <div
            style={{
              display: 'flex',
              gap: 8,
              background: '#D4C4A8',
              borderRadius: 12,
              padding: 4,
            }}
          >
            <button
              onClick={() => setLevelSet('demo')}
              style={{
                padding: '8px 16px',
                fontSize: 14,
                fontWeight: 600,
                color: levelSet === 'demo' ? 'white' : '#5D4632',
                background: levelSet === 'demo'
                  ? 'linear-gradient(180deg, #8B7355 0%, #5D4632 100%)'
                  : 'transparent',
                border: 'none',
                borderRadius: 8,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
            >
              Demo
            </button>
            <button
              onClick={() => setLevelSet('full')}
              style={{
                padding: '8px 16px',
                fontSize: 14,
                fontWeight: 600,
                color: levelSet === 'full' ? 'white' : '#5D4632',
                background: levelSet === 'full'
                  ? 'linear-gradient(180deg, #8B7355 0%, #5D4632 100%)'
                  : 'transparent',
                border: 'none',
                borderRadius: 8,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
            >
              Visual Curriculum
            </button>
            <button
              onClick={() => setLevelSet('complements')}
              style={{
                padding: '8px 16px',
                fontSize: 14,
                fontWeight: 600,
                color: levelSet === 'complements' ? 'white' : '#5D4632',
                background: levelSet === 'complements'
                  ? 'linear-gradient(180deg, #8B7355 0%, #5D4632 100%)'
                  : 'transparent',
                border: 'none',
                borderRadius: 8,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
            >
              Complements
            </button>
          </div>

          {/* Level selection */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
              width: '100%',
              maxWidth: 400,
            }}
          >
            <h2
              style={{
                fontSize: 18,
                color: '#2D1810',
                margin: 0,
                fontWeight: 600,
              }}
            >
              {levelSet === 'demo' ? '5 Levels to Experience Soroban' : levelSet === 'complements' ? 'Practice Adding Single Digits' : 'Full Student Curriculum'}
            </h2>

            {currentLevels.map((level, index) => {
              const progress = getLevelProgress(level.id);
              // All levels available for testing (no locking)
              const stars = progress.stars;
              // Display number: use index+1 for demo/complements, actual id for full curriculum
              const displayNumber = (levelSet === 'demo' || levelSet === 'complements') ? index + 1 : level.id;

              return (
                <motion.button
                  key={level.id}
                  onClick={() => handleStartLevel(level)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: 12,
                    background: 'linear-gradient(135deg, #FFF8E7 0%, #F5E6C8 100%)',
                    border: 'none',
                    borderRadius: 12,
                    cursor: 'pointer',
                    boxShadow: '0 3px 8px rgba(0,0,0,0.1)',
                  }}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  {/* Level icon */}
                  <div
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: '50%',
                      background: 'linear-gradient(135deg, #8B7355 0%, #5D4632 100%)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 20,
                      color: 'white',
                      fontWeight: 'bold',
                      flexShrink: 0,
                    }}
                  >
                    {displayNumber}
                  </div>

                  {/* Level info */}
                  <div
                    style={{
                      flex: 1,
                      textAlign: 'left',
                      minWidth: 0,
                    }}
                  >
                    <div
                      style={{
                        fontSize: 16,
                        fontWeight: 'bold',
                        color: '#2D1810',
                      }}
                    >
                      {level.name}
                    </div>
                    <div
                      style={{
                        fontSize: 12,
                        color: '#8B7355',
                      }}
                    >
                      {level.rodCount} rod{level.rodCount > 1 ? 's' : ''} • {level.valueRange.min.toLocaleString()}-{level.valueRange.max.toLocaleString()}
                    </div>
                  </div>

                  {/* Stars */}
                  <div style={{ display: 'flex', gap: 2 }}>
                    {[1, 2, 3].map((i) => (
                      <span
                        key={i}
                        style={{
                          fontSize: 16,
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

          {/* Drill button */}
          <motion.button
            onClick={() => setScreen('drill')}
            style={{
              padding: '16px 32px',
              fontSize: 18,
              color: 'white',
              background: 'linear-gradient(135deg, #FF5722 0%, #E64A19 100%)',
              border: 'none',
              borderRadius: 12,
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(255, 87, 34, 0.3)',
            }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            Speed Drill
          </motion.button>

          {/* Multiplication prototype button */}
          <motion.button
            onClick={() => setScreen('multiplicationMenu')}
            style={{
              padding: '16px 32px',
              fontSize: 18,
              color: 'white',
              background: 'linear-gradient(135deg, #9C27B0 0%, #6A1B9A 100%)',
              border: 'none',
              borderRadius: 12,
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(156, 39, 176, 0.3)',
            }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            Multiplication Lab
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

      {screen === 'multiplicationMenu' && (
        <motion.div
          key="multiplicationMenu"
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
              fontSize: 40,
              color: '#2D1810',
              fontFamily: '"Segoe UI", system-ui, sans-serif',
              margin: 0,
              marginTop: 40,
              textShadow: '0 2px 4px rgba(0,0,0,0.1)',
            }}
          >
            Multiplication Lab
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
            Choose a multiplication learning mode
          </p>

          {/* Mode selection buttons */}
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
              onClick={() => {
                setMultiplicationMode('area');
                setScreen('multiplication');
              }}
              style={{
                padding: '20px 24px',
                fontSize: 18,
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
              <div>Area Model</div>
              <div style={{ fontSize: 14, opacity: 0.9, fontWeight: 400 }}>
                Visual grid showing place value multiplication
              </div>
            </motion.button>

            <motion.button
              onClick={() => {
                setMultiplicationMode('symbolic');
                setScreen('multiplication');
              }}
              style={{
                padding: '20px 24px',
                fontSize: 18,
                fontWeight: 600,
                color: 'white',
                background: 'linear-gradient(135deg, #5DADE2 0%, #3498DB 100%)',
                border: 'none',
                borderRadius: 12,
                cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(52, 152, 219, 0.3)',
                textAlign: 'left',
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
              }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <div>Symbolic Model</div>
              <div style={{ fontSize: 14, opacity: 0.9, fontWeight: 400 }}>
                Practice with numbers and soroban addition
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
            onBack={() => setScreen('multiplicationMenu')}
            mode={multiplicationMode}
          />
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
          <SorobanDrill onBack={() => setScreen('home')} />
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default App;
