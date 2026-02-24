import { motion } from 'framer-motion';

interface FeedbackBeadProps {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  delay: number;
  duration?: number;
  onArrive: () => void;
  isHeaven: boolean;
  beadSize: number;
  isStatic?: boolean;
}

/**
 * Animated bead that flies from soroban to target position
 * Used in all feedback animations
 */
export function FeedbackBead({
  startX,
  startY,
  endX,
  endY,
  delay,
  duration = 0.5,
  onArrive,
  isHeaven,
  beadSize,
  isStatic = false,
}: FeedbackBeadProps) {
  const beadHeight = isHeaven ? beadSize * 0.9 : beadSize * 0.7;
  const beadWidth = beadSize * 0.85;
  const activeColor = isHeaven ? '#CD853F' : '#DAA520';
  const gradientEnd = isHeaven ? '#8B5A2B' : '#B8860B';

  return (
    <motion.div
      style={{
        position: 'fixed',
        left: startX,
        top: startY,
        width: beadWidth,
        height: beadHeight,
        borderRadius: '50%',
        background: `radial-gradient(ellipse at 30% 30%, ${activeColor} 0%, ${gradientEnd} 100%)`,
        boxShadow: 'inset 0 -4px 8px rgba(0,0,0,0.3), 0 2px 4px rgba(0,0,0,0.2)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginLeft: -beadWidth / 2,
        marginTop: -beadHeight / 2,
      }}
      initial={{ x: 0, y: 0, scale: 1, opacity: 1 }}
      animate={isStatic ? {
        x: 0,
        y: 0,
        scale: 1,
        opacity: 1,
      } : {
        x: endX - startX,
        y: endY - startY,
        scale: [1, 1.05, 0.7, 0],
      }}
      transition={isStatic ? { duration: 0 } : {
        duration,
        delay,
        ease: [0.4, 0, 0.2, 1],
      }}
      onAnimationComplete={isStatic ? undefined : onArrive}
    >
      {/* Rod hole in center of bead */}
      <div
        style={{
          width: beadSize * 0.15,
          height: beadSize * 0.15,
          borderRadius: '50%',
          background: 'radial-gradient(circle, #2D1810 0%, #1A0F0A 100%)',
          boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.8)',
        }}
      />
    </motion.div>
  );
}
