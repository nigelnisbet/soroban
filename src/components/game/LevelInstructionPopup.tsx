import { motion, AnimatePresence } from 'framer-motion';

interface LevelInstructionPopupProps {
  isVisible: boolean;
  instruction: string;
  onDismiss: () => void;
}

export function LevelInstructionPopup({
  isVisible,
  instruction,
  onDismiss,
}: LevelInstructionPopupProps) {
  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 200,
            padding: 24,
          }}
          onClick={onDismiss}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ duration: 0.2, delay: 0.1 }}
            style={{
              background: 'rgba(255, 253, 245, 0.95)',
              borderRadius: 16,
              padding: '32px 40px',
              maxWidth: 420,
              textAlign: 'center',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
              border: '3px solid #8B7355',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <p
              style={{
                fontSize: 20,
                lineHeight: 1.5,
                color: '#3D2914',
                margin: 0,
                marginBottom: 24,
                fontWeight: 500,
              }}
            >
              {instruction}
            </p>
            <button
              onClick={onDismiss}
              style={{
                padding: '12px 32px',
                fontSize: 18,
                fontWeight: 600,
                color: 'white',
                background: 'linear-gradient(180deg, #8B7355 0%, #5D4632 100%)',
                border: 'none',
                borderRadius: 8,
                cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)',
              }}
            >
              Got it!
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// Instructions for each demo level (by level id)
export const DEMO_LEVEL_INSTRUCTIONS: Record<number, string> = {
  101: 'Use the visual abacus to match the given 4-digit number.',
  102: 'Enter the digits to match the visual display on the abacus.',
  103: 'Use the abacus to represent the given 2-digit number, then add another 2-digit number.',
  104: 'Use the abacus to represent the given 3-digit number, then add another 3-digit number.',
  105: 'Practice adding a series of numbers together, one after the other and see how fast you can go and break your own record!',
};
