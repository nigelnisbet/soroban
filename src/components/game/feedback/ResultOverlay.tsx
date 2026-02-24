import { motion } from 'framer-motion';

interface ResultOverlayProps {
  isCorrect: boolean;
}

/**
 * Full-screen result overlay showing checkmark or X
 */
export function ResultOverlay({ isCorrect }: ResultOverlayProps) {
  return (
    <motion.div
      style={{
        position: 'fixed',
        inset: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: isCorrect
          ? 'radial-gradient(circle, rgba(76, 175, 80, 0.3) 0%, transparent 70%)'
          : 'radial-gradient(circle, rgba(244, 67, 54, 0.3) 0%, transparent 70%)',
        pointerEvents: 'none',
      }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        style={{
          fontSize: 120,
          textShadow: isCorrect
            ? '0 0 40px rgba(76, 175, 80, 0.8)'
            : '0 0 40px rgba(244, 67, 54, 0.8)',
        }}
        initial={{ scale: 0 }}
        animate={{
          scale: [0, 1.2, 1],
          rotate: isCorrect ? [0, 10, -10, 0] : [0, -5, 5, -5, 5, 0],
        }}
        transition={{ duration: 0.5 }}
      >
        {isCorrect ? '✓' : '✗'}
      </motion.div>
    </motion.div>
  );
}
