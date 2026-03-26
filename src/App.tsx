import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { NumberMatching } from './components/matching/NumberMatching';
import { SimpleAdditionV2 } from './components/addition/SimpleAdditionV2';
import { PracticeMode } from './components/practice/PracticeMode';
import { AdditionChallenge } from './components/challenge/AdditionChallenge';
import { ChallengeResults } from './components/challenge/ChallengeResults';
import './App.css';

const APP_VERSION = 'v1.1.0';

type Screen = 'menu' | 'matching' | 'simple-addition' | 'practice' | 'addition' | 'results';

function App() {
  const [screen, setScreen] = useState<Screen>('menu');
  const [completionTime, setCompletionTime] = useState(0);

  useEffect(() => {
  }, []);

  if (screen === 'menu') {
    return (
      <div
        style={{
          height: '100vh',
          width: '100vw',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #E8DCC8 0%, #D4C4A8 100%)',
          gap: 24,
          padding: 20,
        }}
      >
        <h1
          style={{
            fontSize: 40,
            color: '#2D1810',
            margin: 0,
            textShadow: '0 2px 4px rgba(0,0,0,0.1)',
          }}
        >
          Soroban Learning
        </h1>

        <motion.button
          onClick={() => setScreen('matching')}
          style={{
            padding: '20px 40px',
            fontSize: 24,
            fontWeight: 'bold',
            color: 'white',
            background: 'linear-gradient(135deg, #9C27B0 0%, #7B1FA2 100%)',
            border: 'none',
            borderRadius: 12,
            cursor: 'pointer',
            boxShadow: '0 4px 12px rgba(156, 39, 176, 0.3)',
          }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          Level 1: Number Matching
        </motion.button>

        <motion.button
          onClick={() => setScreen('simple-addition')}
          style={{
            padding: '20px 40px',
            fontSize: 24,
            fontWeight: 'bold',
            color: 'white',
            background: 'linear-gradient(135deg, #4CAF50 0%, #2E7D32 100%)',
            border: 'none',
            borderRadius: 12,
            cursor: 'pointer',
            boxShadow: '0 4px 12px rgba(76, 175, 80, 0.3)',
          }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          Level 2: Simple Addition
        </motion.button>

        <motion.button
          onClick={() => setScreen('addition')}
          style={{
            padding: '20px 40px',
            fontSize: 24,
            fontWeight: 'bold',
            color: 'white',
            background: 'linear-gradient(135deg, #2196F3 0%, #1976D2 100%)',
            border: 'none',
            borderRadius: 12,
            cursor: 'pointer',
            boxShadow: '0 4px 12px rgba(33, 150, 243, 0.3)',
          }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          Addition Challenge
        </motion.button>

        <motion.button
          onClick={() => setScreen('practice')}
          style={{
            padding: '20px 40px',
            fontSize: 24,
            fontWeight: 'bold',
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
          Speed Practice
        </motion.button>
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

  if (screen === 'results') {
    return (
      <ChallengeResults
        time={completionTime}
        onBack={() => setScreen('menu')}
        onRetry={() => setScreen('addition')}
      />
    );
  }

  return null;
}

export default App;
