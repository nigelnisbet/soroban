import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { NumberMatching } from './components/matching/NumberMatching';
import { SimpleAdditionV2 } from './components/addition/SimpleAdditionV2';
import { PracticeMode } from './components/practice/PracticeMode';
import { AdditionChallenge } from './components/challenge/AdditionChallenge';
import { TwoDigitAddition } from './components/challenge/TwoDigitAddition';
import { MultiplicationPrototype } from './components/multiplication/MultiplicationPrototype';
import { ChallengeResults } from './components/challenge/ChallengeResults';
import { HandTrackingDemo } from './components/demo/HandTrackingDemo';
import './App.css';

const APP_VERSION = 'v1.1.0';

type Screen = 'menu' | 'matching' | 'simple-addition' | 'practice' | 'addition' | 'two-digit-addition' | 'multiplication-area' | 'multiplication-symbolic' | 'results' | 'hand-tracking';

// Demo curriculum levels
interface CurriculumLevel {
  id: number;
  name: string;
  screen: Screen | null;
  implemented: boolean;
}

const CURRICULUM_LEVELS: CurriculumLevel[] = [
  { id: 1, name: 'Number Reading/Representation', screen: 'matching', implemented: true },
  { id: 2, name: 'Simple Addition', screen: 'simple-addition', implemented: true },
  { id: 3, name: '5s Complements', screen: null, implemented: false },
  { id: 4, name: '10s Complements', screen: null, implemented: false },
  { id: 5, name: 'Multi-digit Addition', screen: 'two-digit-addition', implemented: true },
  { id: 6, name: 'Subtraction', screen: null, implemented: false },
  { id: 7, name: 'Multiplication', screen: 'multiplication-symbolic', implemented: true },
  { id: 8, name: 'Division', screen: null, implemented: false },
];

function App() {
  const [screen, setScreen] = useState<Screen>('menu');
  const [completionTime, setCompletionTime] = useState(0);
  const [activeLevel, setActiveLevel] = useState<number | null>(null);

  useEffect(() => {
    // Check URL parameters for demo mode
    const params = new URLSearchParams(window.location.search);
    const demo = params.get('demo');
    const area = params.get('area');
    const handTracking = params.get('hands');

    // Special direct link to hand tracking demo
    if (handTracking === 'true') {
      setScreen('hand-tracking');
      return;
    }

    // Special direct link to area model
    if (area === 'multiplication') {
      setScreen('multiplication-area');
      return;
    }

    if (demo) {
      const levelId = parseInt(demo, 10);
      if (levelId >= 1 && levelId <= 8) {
        setActiveLevel(levelId);
      }
    }
  }, []);

  const getLevelColor = (levelId: number) => {
    const colors = [
      ['#9C27B0', '#7B1FA2'], // Purple
      ['#4CAF50', '#2E7D32'], // Green
      ['#FF9800', '#F57C00'], // Orange
      ['#E91E63', '#C2185B'], // Pink
      ['#2196F3', '#1976D2'], // Blue
      ['#FF5722', '#E64A19'], // Deep Orange
      ['#009688', '#00796B'], // Teal
      ['#673AB7', '#512DA8'], // Deep Purple
    ];
    return colors[levelId - 1] || colors[0];
  };

  if (screen === 'menu') {
    return (
      <div
        style={{
          height: '100vh',
          width: '100vw',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'flex-start',
          background: 'linear-gradient(135deg, #E8DCC8 0%, #D4C4A8 100%)',
          padding: '40px 20px',
          overflowY: 'auto',
        }}
      >
        <h1
          style={{
            fontSize: 48,
            color: '#2D1810',
            margin: '0 0 16px 0',
            textShadow: '0 2px 4px rgba(0,0,0,0.1)',
          }}
        >
          Soroban Learning
        </h1>

        <p
          style={{
            fontSize: 20,
            color: '#5D4E37',
            margin: '0 0 20px 0',
            textAlign: 'center',
            maxWidth: 600,
          }}
        >
          Complete Curriculum
        </p>

        {/* Hand Tracking Demo Button */}
        <motion.button
          onClick={() => setScreen('hand-tracking')}
          style={{
            padding: '16px 32px',
            fontSize: 18,
            fontWeight: 'bold',
            color: 'white',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            border: 'none',
            borderRadius: 12,
            cursor: 'pointer',
            boxShadow: '0 4px 12px rgba(102, 126, 234, 0.4)',
            marginBottom: 24,
            width: '100%',
            maxWidth: 600,
          }}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          🤚 Hand Tracking Demo (Camera)
        </motion.button>

        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 16,
            width: '100%',
            maxWidth: 600,
          }}
        >
          {CURRICULUM_LEVELS.map((level) => {
            const [color1, color2] = getLevelColor(level.id);
            const isActive = activeLevel === null || activeLevel === level.id;
            const isClickable = isActive && level.implemented;

            return (
              <motion.button
                key={level.id}
                onClick={() => {
                  if (isClickable && level.screen) {
                    setScreen(level.screen);
                  }
                }}
                disabled={!isClickable}
                style={{
                  padding: '20px 32px',
                  fontSize: 22,
                  fontWeight: 'bold',
                  color: isClickable ? 'white' : '#888',
                  background: isClickable
                    ? `linear-gradient(135deg, ${color1} 0%, ${color2} 100%)`
                    : 'linear-gradient(135deg, #D0D0D0 0%, #B0B0B0 100%)',
                  border: 'none',
                  borderRadius: 12,
                  cursor: isClickable ? 'pointer' : 'not-allowed',
                  boxShadow: isClickable
                    ? `0 4px 12px ${color1}40`
                    : '0 2px 6px rgba(0,0,0,0.1)',
                  opacity: isClickable ? 1 : 0.5,
                  textAlign: 'left',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 16,
                  position: 'relative',
                }}
                whileHover={isClickable ? { scale: 1.02 } : {}}
                whileTap={isClickable ? { scale: 0.98 } : {}}
              >
                <span
                  style={{
                    fontSize: 28,
                    fontWeight: 'bold',
                    opacity: 0.8,
                    minWidth: 40,
                  }}
                >
                  {level.id}
                </span>
                <span style={{ flex: 1 }}>{level.name}</span>
                {!level.implemented && (
                  <span
                    style={{
                      fontSize: 14,
                      fontWeight: 'normal',
                      opacity: 0.7,
                      fontStyle: 'italic',
                    }}
                  >
                    Coming Soon
                  </span>
                )}
              </motion.button>
            );
          })}
        </div>

        {activeLevel && (
          <p
            style={{
              marginTop: 32,
              fontSize: 16,
              color: '#5D4E37',
              textAlign: 'center',
              fontStyle: 'italic',
            }}
          >
            Demo Mode: Only Level {activeLevel} is active
          </p>
        )}
      </div>
    );
  }

  if (screen === 'matching') {
    return <NumberMatching onBack={() => setScreen('menu')} />;
  }

  if (screen === 'simple-addition') {
    return <SimpleAdditionV2 onBack={() => setScreen('menu')} />;
  }

  if (screen === 'practice') {
    return <PracticeMode onBack={() => setScreen('menu')} />;
  }

  if (screen === 'two-digit-addition') {
    return (
      <TwoDigitAddition
        onBack={() => setScreen('menu')}
        onComplete={(time) => {
          setCompletionTime(time);
          setScreen('results');
        }}
      />
    );
  }

  if (screen === 'addition') {
    return (
      <AdditionChallenge
        onBack={() => setScreen('menu')}
        onComplete={(time) => {
          setCompletionTime(time);
          setScreen('results');
        }}
      />
    );
  }

  if (screen === 'multiplication-area') {
    return (
      <MultiplicationPrototype
        onBack={() => setScreen('menu')}
        mode="area"
        initialLevel="2x2"
      />
    );
  }

  if (screen === 'multiplication-symbolic') {
    return (
      <MultiplicationPrototype
        onBack={() => setScreen('menu')}
        mode="symbolic"
        initialLevel="2x2"
      />
    );
  }

  if (screen === 'results') {
    return (
      <ChallengeResults
        time={completionTime}
        onBack={() => setScreen('menu')}
        onRetry={() => setScreen('addition')}
      />
    );
  }

  if (screen === 'hand-tracking') {
    return <HandTrackingDemo />;
  }

  return null;
}

export default App;
