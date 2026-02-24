import { motion } from 'framer-motion';

interface FeedbackFlashProps {
  x: number;
  y: number;
  delay?: number;
  size?: number;
}

/**
 * Flash effect when bead arrives at counter box
 */
export function FeedbackFlash({ x, y, delay = 0, size = 80 }: FeedbackFlashProps) {
  return (
    <motion.div
      style={{
        position: 'fixed',
        left: x,
        top: y,
        width: size,
        height: size,
        borderRadius: 12,
        background: 'radial-gradient(circle, rgba(255, 193, 7, 0.8) 0%, transparent 70%)',
        marginLeft: -size / 2,
        marginTop: -size / 2,
        zIndex: 999,
        pointerEvents: 'none',
      }}
      initial={{ scale: 0, opacity: 1 }}
      animate={{ scale: 1.5, opacity: 0 }}
      transition={{ duration: 0.3, delay }}
    />
  );
}
