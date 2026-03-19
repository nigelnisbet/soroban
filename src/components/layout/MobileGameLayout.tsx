import { ReactNode } from 'react';
import { motion } from 'framer-motion';

interface MobileGameLayoutProps {
  /** Back button handler */
  onBack: () => void;

  /** Progress display (e.g., "5 / 10" or custom component) */
  progress?: string | ReactNode;

  /** Main game content - appears in flexible top area */
  children: ReactNode;

  /** Soroban component - appears in fixed bottom area */
  soroban?: ReactNode;

  /** GO button handler */
  onGo: () => void;

  /** Reset button handler */
  onReset: () => void;

  /** Optional: disable GO button */
  goDisabled?: boolean;

  /** Optional: custom GO button text */
  goText?: string;

  /** Optional: custom background gradient */
  background?: string;

  /** Optional: additional header content (right side) */
  headerRight?: ReactNode;
}

/**
 * Standardized mobile game layout wrapper.
 * Provides consistent header, content area, and bottom control bar across all mobile screens.
 */
export function MobileGameLayout({
  onBack,
  progress,
  children,
  soroban,
  onGo,
  onReset,
  goDisabled = false,
  goText = 'GO ➤',
  background = 'linear-gradient(135deg, #E8DCC8 0%, #D4C4A8 100%)',
  headerRight,
}: MobileGameLayoutProps) {
  // Fixed heights for layout calculation
  const CONTROL_BAR_HEIGHT = 88; // 56px button + 32px padding
  const SOROBAN_AREA_HEIGHT = 520; // INCREASED for taller soroban + value display

  // Calculate soroban area position from bottom
  const sorobanBottomPosition = CONTROL_BAR_HEIGHT;

  return (
    <div
      style={{
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        background,
        paddingTop: 'calc(env(safe-area-inset-top) + 50px)',
        position: 'relative',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '16px 20px',
          flexShrink: 0,
        }}
      >
        {/* Back button */}
        <motion.button
          onClick={onBack}
          style={{
            width: 48,
            height: 48,
            borderRadius: '50%',
            border: 'none',
            background: '#FFF8E7',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 24,
          }}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
        >
          ←
        </motion.button>

        {/* Progress or custom header content */}
        {progress && (
          typeof progress === 'string' ? (
            <div
              style={{
                fontSize: 18,
                fontWeight: 'bold',
                color: '#2D1810',
              }}
            >
              {progress}
            </div>
          ) : (
            progress
          )
        )}

        {/* Right side content or spacer */}
        {headerRight || <div style={{ width: 48 }} />}
      </div>

      {/* Top flexible content area - for objects, numbers, problems, etc */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '0 20px',
          overflow: 'auto',
          minHeight: 0, // Allow flex shrinking
        }}
      >
        {children}
      </div>

      {/* Fixed Soroban Area - ALWAYS at same position */}
      <div
        style={{
          height: SOROBAN_AREA_HEIGHT,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          padding: '0 20px',
        }}
      >
        {soroban}
      </div>

      {/* Bottom control bar - Fixed height */}
      <div
        style={{
          display: 'flex',
          gap: 12,
          padding: '16px 20px',
          paddingBottom: 'max(16px, env(safe-area-inset-bottom))',
          background: 'rgba(255, 248, 231, 0.9)',
          borderTop: '1px solid rgba(0,0,0,0.1)',
          height: CONTROL_BAR_HEIGHT,
          flexShrink: 0,
        }}
      >
        {/* GO button */}
        <motion.button
          onClick={onGo}
          disabled={goDisabled}
          style={{
            flex: 7,
            height: 56,
            borderRadius: 12,
            background: goDisabled
              ? '#BDBDBD'
              : 'linear-gradient(135deg, #4CAF50 0%, #2E7D32 100%)',
            color: 'white',
            border: 'none',
            fontSize: 20,
            fontWeight: 'bold',
            cursor: goDisabled ? 'not-allowed' : 'pointer',
            boxShadow: goDisabled ? 'none' : '0 4px 12px rgba(76,175,80,0.4)',
          }}
          whileHover={goDisabled ? {} : { scale: 1.02 }}
          whileTap={goDisabled ? {} : { scale: 0.98 }}
        >
          {goText}
        </motion.button>

        {/* Reset button */}
        <motion.button
          onClick={onReset}
          style={{
            flex: 3,
            height: 56,
            borderRadius: 12,
            background: '#FFF8E7',
            color: '#5D4632',
            border: '2px solid #D4C4A8',
            fontSize: 16,
            fontWeight: 'bold',
            cursor: 'pointer',
            boxShadow: '0 2px 6px rgba(0,0,0,0.1)',
          }}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          ↻
        </motion.button>
      </div>
    </div>
  );
}
