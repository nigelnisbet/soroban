import { motion } from 'framer-motion';

interface MatchFeedbackProps {
  status: 'correct' | 'too-few' | 'too-many' | null;
  objectCount: number;
  sorobanValue: number;
}

export function MatchFeedback({ status, objectCount, sorobanValue }: MatchFeedbackProps) {
  if (!status) return null;

  const getMessage = () => {
    switch (status) {
      case 'correct':
        return {
          text: '🎉 Perfect Match!',
          color: '#4CAF50',
          detail: `${objectCount} objects = ${sorobanValue} on soroban`,
        };
      case 'too-few':
        return {
          text: '❌ Not Enough Beads',
          color: '#FF5722',
          detail: `You need ${objectCount} but have ${sorobanValue}`,
        };
      case 'too-many':
        return {
          text: '❌ Too Many Beads',
          color: '#FF5722',
          detail: `You need ${objectCount} but have ${sorobanValue}`,
        };
    }
  };

  const message = getMessage();

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      style={{
        position: 'fixed',
        top: '20%',
        left: '50%',
        transform: 'translateX(-50%)',
        background: 'white',
        padding: '20px 32px',
        borderRadius: 16,
        boxShadow: `0 8px 32px ${message.color}40`,
        border: `4px solid ${message.color}`,
        zIndex: 999,
        textAlign: 'center',
        minWidth: 280,
      }}
    >
      <div
        style={{
          fontSize: 28,
          fontWeight: 'bold',
          color: message.color,
          marginBottom: 8,
        }}
      >
        {message.text}
      </div>
      <div
        style={{
          fontSize: 16,
          color: '#666',
        }}
      >
        {message.detail}
      </div>
    </motion.div>
  );
}
