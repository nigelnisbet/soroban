import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

interface ChallengeResultsProps {
  time: number; // in milliseconds
  onBack: () => void;
  onRetry: () => void;
}

interface TimeRecord {
  time: number;
  date: string;
}

const STORAGE_KEY = 'soroban_addition_times';

function formatTime(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const centiseconds = Math.floor((ms % 1000) / 10);

  if (minutes > 0) {
    return `${minutes}:${seconds.toString().padStart(2, '0')}.${centiseconds.toString().padStart(2, '0')}`;
  }
  return `${seconds}.${centiseconds.toString().padStart(2, '0')}s`;
}

export function ChallengeResults({ time, onBack, onRetry }: ChallengeResultsProps) {
  const [topTimes, setTopTimes] = useState<TimeRecord[]>([]);
  const [rank, setRank] = useState<number>(0);

  useEffect(() => {
    // Load existing times
    const stored = localStorage.getItem(STORAGE_KEY);
    const times: TimeRecord[] = stored ? JSON.parse(stored) : [];

    // Add new time
    const newRecord: TimeRecord = {
      time,
      date: new Date().toLocaleDateString(),
    };
    times.push(newRecord);

    // Sort and keep top 5
    times.sort((a, b) => a.time - b.time);
    const top5 = times.slice(0, 5);

    // Find rank of current time
    const currentRank = times.findIndex(t => t.time === time && t.date === newRecord.date) + 1;

    // Save top 5
    localStorage.setItem(STORAGE_KEY, JSON.stringify(top5));

    setTopTimes(top5);
    setRank(currentRank);
  }, [time]);

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
        padding: 20,
        gap: 32,
      }}
    >
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 200, damping: 15 }}
        style={{
          fontSize: 48,
          fontWeight: 'bold',
          color: '#2D1810',
        }}
      >
        Complete! 🎉
      </motion.div>

      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.2 }}
        style={{
          fontSize: 64,
          fontWeight: 'bold',
          color: '#4CAF50',
        }}
      >
        {formatTime(time)}
      </motion.div>

      {rank <= 5 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          style={{
            fontSize: 20,
            color: '#5D4632',
          }}
        >
          #{rank} Best Time!
        </motion.div>
      )}

      {/* Top 5 Times */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.5 }}
        style={{
          width: '100%',
          maxWidth: 400,
          background: '#FFF8E7',
          borderRadius: 12,
          padding: 20,
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
        }}
      >
        <div
          style={{
            fontSize: 18,
            fontWeight: 'bold',
            color: '#2D1810',
            marginBottom: 16,
            textAlign: 'center',
          }}
        >
          Top 5 Times
        </div>

        {topTimes.map((record, index) => (
          <div
            key={index}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              padding: '8px 0',
              borderBottom: index < topTimes.length - 1 ? '1px solid #D4C4A8' : 'none',
              background: record.time === time ? 'rgba(76, 175, 80, 0.1)' : 'transparent',
              borderRadius: 4,
              paddingLeft: 8,
              paddingRight: 8,
            }}
          >
            <span style={{ color: '#5D4632', fontWeight: 600 }}>
              #{index + 1}
            </span>
            <span style={{ color: '#2D1810', fontWeight: 'bold' }}>
              {formatTime(record.time)}
            </span>
            <span style={{ color: '#8B7355', fontSize: 14 }}>
              {record.date}
            </span>
          </div>
        ))}
      </motion.div>

      {/* Buttons */}
      <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
        <motion.button
          onClick={onRetry}
          style={{
            padding: '16px 32px',
            fontSize: 18,
            fontWeight: 'bold',
            color: 'white',
            background: 'linear-gradient(135deg, #4CAF50 0%, #2E7D32 100%)',
            border: 'none',
            borderRadius: 12,
            cursor: 'pointer',
            boxShadow: '0 4px 12px rgba(76,175,80,0.4)',
          }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          Try Again
        </motion.button>

        <motion.button
          onClick={onBack}
          style={{
            padding: '16px 32px',
            fontSize: 18,
            fontWeight: 'bold',
            color: '#5D4632',
            background: '#FFF8E7',
            border: '2px solid #D4C4A8',
            borderRadius: 12,
            cursor: 'pointer',
            boxShadow: '0 2px 6px rgba(0,0,0,0.1)',
          }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          Menu
        </motion.button>
      </div>
    </div>
  );
}
