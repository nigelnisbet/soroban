import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CourseMap } from './components/course/CourseMap';
import { GameContainer } from './components/game/GameContainer';
import { MultiplicationPrototype } from './components/multiplication/MultiplicationPrototype';
import { SorobanDrill } from './components/drill/SorobanDrill';
import { ObjectMatching } from './components/levels/ObjectMatching';
import { ADULT_LEVEL_5_COMPETITION } from './levels/level1-counting';
import { CourseLevel } from './levels/courseLevels';
import { useCourseProgressStore } from './store/courseProgressStore';
import { useProgressStore } from './store/progressStore';
import { calculateSessionStats } from './engine/LearningEngine';
import './App.css';

type Screen = 'courseMap' | 'level';

function AppMobile() {
  const [screen, setScreen] = useState<Screen>('courseMap');
  const [selectedLevel, setSelectedLevel] = useState<CourseLevel | null>(null);
  const [savedScrollPosition, setSavedScrollPosition] = useState<number>(0);

  const { recordLevelAttempt } = useCourseProgressStore();
  const { recordLevelCompletion } = useProgressStore();

  const handleSelectLevel = useCallback((level: CourseLevel, scrollPosition: number) => {
    setSavedScrollPosition(scrollPosition);
    setSelectedLevel(level);
    setScreen('level');
  }, []);

  const handleExitToMap = useCallback(() => {
    setSelectedLevel(null);
    setScreen('courseMap');
  }, []);

  const handleLevelComplete = useCallback(
    (stats: ReturnType<typeof calculateSessionStats>) => {
      if (!selectedLevel) return;

      // Calculate stars based on accuracy
      let stars: 0 | 1 | 2 | 3 = 0;
      if (stats.accuracy >= selectedLevel.stars.gold) stars = 3;
      else if (stats.accuracy >= selectedLevel.stars.silver) stars = 2;
      else if (stats.accuracy >= selectedLevel.stars.bronze) stars = 1;

      // Calculate XP
      let xp = selectedLevel.xp.complete;
      if (stars === 3) xp += selectedLevel.xp.gold;
      else if (stars === 2) xp += selectedLevel.xp.silver;

      // Record progress
      recordLevelAttempt(selectedLevel.id, stats.accuracy, stars, xp);

      // Also record in old system for compatibility
      recordLevelCompletion(
        105,
        stats.accuracy,
        stats.correctFirstTry,
        stats.totalProblems,
        stats.hintsUsed
      );
    },
    [selectedLevel, recordLevelAttempt, recordLevelCompletion]
  );

  // Render level based on type
  const renderLevel = () => {
    if (!selectedLevel) return null;

    // For now, map to existing components based on level type
    // We'll build the new level types later
    switch (selectedLevel.type) {
      case 'object-matching':
        return (
          <ObjectMatching
            level={selectedLevel}
            onBack={handleExitToMap}
            onComplete={handleLevelComplete}
          />
        );

      case 'speed-drill':
        return <SorobanDrill onBack={handleExitToMap} />;

      case 'timed-addition':
        return (
          <GameContainer
            level={ADULT_LEVEL_5_COMPETITION}
            onExit={handleExitToMap}
            onLevelComplete={handleLevelComplete}
          />
        );

      case 'multiplication': {
        const multiplicandDigits = selectedLevel.config.multiplicandDigits || 2;
        const multiplierDigits = selectedLevel.config.multiplierDigits || 2;
        const levelMap: Record<string, '2x2' | '2x3' | '3x3'> = {
          '2-1': '2x2',
          '2-2': '2x2',
          '2-3': '2x3',
          '3-3': '3x3',
        };
        const key = `${multiplicandDigits}-${multiplierDigits}`;
        return (
          <MultiplicationPrototype
            onBack={handleExitToMap}
            mode="symbolic"
            initialLevel={levelMap[key] || '2x2'}
          />
        );
      }

      default:
        // Placeholder for levels we haven't built yet
        return (
          <div
            style={{
              minHeight: '100vh',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'linear-gradient(135deg, #E8DCC8 0%, #D4C4A8 100%)',
              padding: 20,
              gap: 20,
            }}
          >
            <h2 style={{ color: '#2D1810' }}>{selectedLevel.name}</h2>
            <p style={{ color: '#5D4632', textAlign: 'center', maxWidth: 300 }}>
              {selectedLevel.description}
            </p>
            <div style={{ color: '#8B7355', fontSize: 14 }}>
              Type: {selectedLevel.type}
            </div>
            <p style={{ color: '#5D4632', fontSize: 16 }}>Coming soon!</p>
            <button
              onClick={handleExitToMap}
              style={{
                padding: '12px 24px',
                fontSize: 16,
                background: '#8B7355',
                color: 'white',
                border: 'none',
                borderRadius: 8,
                cursor: 'pointer',
              }}
            >
              Back to Map
            </button>
          </div>
        );
    }
  };

  return (
    <AnimatePresence mode="wait">
      {screen === 'courseMap' && (
        <motion.div
          key="courseMap"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <CourseMap
            onSelectLevel={handleSelectLevel}
            initialScrollPosition={savedScrollPosition}
          />
        </motion.div>
      )}

      {screen === 'level' && (
        <motion.div
          key="level"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          {renderLevel()}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default AppMobile;
