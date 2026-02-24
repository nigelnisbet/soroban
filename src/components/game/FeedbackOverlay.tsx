import { motion, AnimatePresence } from 'framer-motion';
import { FeedbackType } from '../../models/types';

interface FeedbackOverlayProps {
  feedbackType: FeedbackType | null;
  isVisible: boolean;
  targetValue?: number;
  currentValue?: number;
  onDismiss?: () => void;
}

// Confetti particle component
function Confetti({ delay }: { delay: number }) {
  const colors = ['#FFD700', '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7'];
  const color = colors[Math.floor(Math.random() * colors.length)];
  const startX = Math.random() * 100;
  const rotation = Math.random() * 720 - 360;

  return (
    <motion.div
      style={{
        position: 'absolute',
        left: `${startX}%`,
        top: -20,
        width: 10,
        height: 10,
        background: color,
        borderRadius: Math.random() > 0.5 ? '50%' : '2px',
      }}
      initial={{ y: 0, rotate: 0, opacity: 1 }}
      animate={{
        y: 400,
        rotate: rotation,
        opacity: 0,
      }}
      transition={{
        duration: 2,
        delay,
        ease: 'easeOut',
      }}
    />
  );
}

// Star burst for correct answers
function StarBurst() {
  return (
    <motion.div
      style={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        pointerEvents: 'none',
      }}
    >
      {/* Central star */}
      <motion.div
        initial={{ scale: 0, rotate: -180 }}
        animate={{ scale: 1, rotate: 0 }}
        exit={{ scale: 0, rotate: 180 }}
        transition={{ type: 'spring', stiffness: 200, damping: 15 }}
      >
        <svg width="120" height="120" viewBox="0 0 120 120">
          <motion.path
            d="M60 10 L70 45 L105 45 L77 65 L87 100 L60 80 L33 100 L43 65 L15 45 L50 45 Z"
            fill="#FFD700"
            stroke="#FFA000"
            strokeWidth="2"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.5 }}
          />
        </svg>
      </motion.div>

      {/* Radiating lines */}
      {[0, 45, 90, 135, 180, 225, 270, 315].map((angle) => (
        <motion.div
          key={angle}
          style={{
            position: 'absolute',
            width: 4,
            height: 40,
            background: 'linear-gradient(180deg, #FFD700 0%, transparent 100%)',
            borderRadius: 2,
            transformOrigin: 'center 80px',
            transform: `rotate(${angle}deg)`,
          }}
          initial={{ scaleY: 0, opacity: 0 }}
          animate={{ scaleY: 1, opacity: [0, 1, 0] }}
          transition={{ duration: 0.6, delay: 0.2 }}
        />
      ))}
    </motion.div>
  );
}

// Checkmark animation
function CheckMark() {
  return (
    <motion.svg
      width="80"
      height="80"
      viewBox="0 0 80 80"
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      transition={{ type: 'spring', stiffness: 200, damping: 15 }}
    >
      <motion.circle
        cx="40"
        cy="40"
        r="35"
        fill="#4CAF50"
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ duration: 0.3 }}
      />
      <motion.path
        d="M22 40 L35 53 L58 27"
        fill="none"
        stroke="white"
        strokeWidth="6"
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.4, delay: 0.2 }}
      />
    </motion.svg>
  );
}

// Thinking face for hints
function ThinkingFace() {
  return (
    <motion.div
      initial={{ scale: 0, rotate: -10 }}
      animate={{ scale: 1, rotate: 0 }}
      transition={{ type: 'spring', stiffness: 200, damping: 15 }}
    >
      <svg width="80" height="80" viewBox="0 0 80 80">
        <circle cx="40" cy="40" r="35" fill="#FFC107" />
        <circle cx="28" cy="35" r="5" fill="#5D4037" />
        <circle cx="52" cy="35" r="5" fill="#5D4037" />
        {/* Thinking eyebrow */}
        <motion.path
          d="M20 28 Q28 24 36 28"
          stroke="#5D4037"
          strokeWidth="3"
          fill="none"
          animate={{ d: ['M20 28 Q28 24 36 28', 'M20 26 Q28 22 36 26', 'M20 28 Q28 24 36 28'] }}
          transition={{ duration: 2, repeat: Infinity }}
        />
        {/* Thinking mouth */}
        <motion.path
          d="M30 52 Q40 48 50 52"
          stroke="#5D4037"
          strokeWidth="3"
          fill="none"
        />
        {/* Thought bubble dots */}
        <motion.circle
          cx="65"
          cy="20"
          r="4"
          fill="#5D4037"
          animate={{ opacity: [0, 1, 0] }}
          transition={{ duration: 1.5, repeat: Infinity, delay: 0 }}
        />
        <motion.circle
          cx="72"
          cy="12"
          r="3"
          fill="#5D4037"
          animate={{ opacity: [0, 1, 0] }}
          transition={{ duration: 1.5, repeat: Infinity, delay: 0.3 }}
        />
        <motion.circle
          cx="78"
          cy="6"
          r="2"
          fill="#5D4037"
          animate={{ opacity: [0, 1, 0] }}
          transition={{ duration: 1.5, repeat: Infinity, delay: 0.6 }}
        />
      </svg>
    </motion.div>
  );
}

// Close indicator (almost correct)
function CloseIndicator({ difference }: { difference: number }) {
  return (
    <motion.div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 8,
      }}
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      transition={{ type: 'spring', stiffness: 200, damping: 15 }}
    >
      <svg width="80" height="80" viewBox="0 0 80 80">
        <circle cx="40" cy="40" r="35" fill="#FF9800" />
        <circle cx="28" cy="35" r="5" fill="#5D4037" />
        <circle cx="52" cy="35" r="5" fill="#5D4037" />
        <path
          d="M28 50 Q40 55 52 50"
          stroke="#5D4037"
          strokeWidth="3"
          fill="none"
        />
      </svg>
      <motion.span
        style={{
          color: '#FF9800',
          fontSize: 18,
          fontWeight: 'bold',
        }}
        animate={{ scale: [1, 1.1, 1] }}
        transition={{ duration: 0.5, repeat: 2 }}
      >
        So close! Off by {difference}
      </motion.span>
    </motion.div>
  );
}

export function FeedbackOverlay({
  feedbackType,
  isVisible,
  targetValue,
  currentValue,
  onDismiss,
}: FeedbackOverlayProps) {
  const difference = targetValue !== undefined && currentValue !== undefined
    ? Math.abs(targetValue - currentValue)
    : 0;

  return (
    <AnimatePresence>
      {isVisible && feedbackType && (
        <motion.div
          style={{
            position: 'fixed',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            pointerEvents: feedbackType === 'CORRECT' ? 'none' : 'auto',
          }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onDismiss}
        >
          {/* Backdrop */}
          <motion.div
            style={{
              position: 'absolute',
              inset: 0,
              background:
                feedbackType === 'CORRECT'
                  ? 'rgba(76, 175, 80, 0.3)'
                  : feedbackType === 'CLOSE'
                    ? 'rgba(255, 152, 0, 0.2)'
                    : 'rgba(0, 0, 0, 0.1)',
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />

          {/* Feedback content */}
          <motion.div
            style={{
              position: 'relative',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 16,
              zIndex: 1,
            }}
          >
            {feedbackType === 'CORRECT' && (
              <>
                <StarBurst />
                <motion.div
                  initial={{ y: 50, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.3 }}
                >
                  <CheckMark />
                </motion.div>
                {/* Confetti */}
                {Array.from({ length: 30 }).map((_, i) => (
                  <Confetti key={i} delay={i * 0.05} />
                ))}
              </>
            )}

            {feedbackType === 'CLOSE' && (
              <CloseIndicator difference={difference} />
            )}

            {feedbackType === 'INCORRECT' && (
              <ThinkingFace />
            )}

            {(feedbackType === 'HINT_LEVEL_1' ||
              feedbackType === 'HINT_LEVEL_2' ||
              feedbackType === 'HINT_LEVEL_3') && (
              <motion.div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 12,
                  padding: 24,
                  background: 'white',
                  borderRadius: 16,
                  boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
                }}
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
              >
                <ThinkingFace />
                <span
                  style={{
                    fontSize: 16,
                    color: '#5D4037',
                    textAlign: 'center',
                  }}
                >
                  {feedbackType === 'HINT_LEVEL_1' && 'Count the objects carefully!'}
                  {feedbackType === 'HINT_LEVEL_2' && 'Watch them count...'}
                  {feedbackType === 'HINT_LEVEL_3' && 'Look at the glowing beads!'}
                </span>
              </motion.div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
