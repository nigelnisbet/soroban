import { useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { sounds } from '../../utils/sounds';

interface JiJiCharacterProps {
  show: boolean;
  isFlying: boolean; // true = flying across screen, false = blocked/stuck
  targetNumber: number;
  sorobanValue: number;
  objectsContainerRect: DOMRect | null;
  onAnimationComplete?: () => void;
  onBlocked?: () => void; // Called when JiJi hits obstacle
}

export function JiJiCharacter({
  show,
  isFlying,
  targetNumber,
  sorobanValue,
  objectsContainerRect,
  onAnimationComplete,
  onBlocked,
}: JiJiCharacterProps) {
  const hasPlayedBlockedSound = useRef(false);

  // Reset the flag when show changes (new animation starts)
  useEffect(() => {
    if (show) {
      hasPlayedBlockedSound.current = false;
    }
  }, [show]);

  // Calculate JiJi's vertical position (middle of objects area)
  const getJiJiVerticalPosition = () => {
    if (objectsContainerRect) {
      return objectsContainerRect.top + objectsContainerRect.height / 2;
    }
    return window.innerHeight * 0.30; // fallback
  };

  // Calculate where JiJi should stop when blocked
  const getBlockedPosition = () => {
    const jijiWidth = 200;
    const screenCenterX = window.innerWidth / 2;

    if (sorobanValue > targetNumber) {
      // Too many beads - blocked by extra beads in center
      // Arrange in rows (max 4 per row)
      const extraBeads = sorobanValue - targetNumber;
      const beadsPerRow = 4;
      const beadSpacing = 70;
      const beadsInFirstRow = Math.min(beadsPerRow, extraBeads);
      const leftmostBeadX = screenCenterX - ((beadsInFirstRow - 1) / 2) * beadSpacing;
      const beadWidth = 42 * 1.6; // beadSize * 1.6 for earth bead width
      return leftmostBeadX - beadWidth / 2 - jijiWidth;
    } else if (sorobanValue < targetNumber && objectsContainerRect) {
      // Too few beads - blocked by remaining objects
      const remainingObjects = targetNumber - sorobanValue;
      // Calculate position of first remaining object (leftmost in grid)
      const getGridLayout = (count: number) => {
        if (count <= 3) return { cols: count, rows: 1 };
        if (count <= 6) return { cols: 3, rows: 2 };
        return { cols: 3, rows: 3 };
      };
      const { cols, rows } = getGridLayout(targetNumber);
      const objectSize = 60;
      const gap = 16;
      const gridWidth = cols * objectSize + (cols - 1) * gap;
      const startX = objectsContainerRect.left + (objectsContainerRect.width - gridWidth) / 2;
      const firstRemainingIndex = sorobanValue;
      const col = firstRemainingIndex % cols;
      const row = Math.floor(firstRemainingIndex / cols);
      const leftmostObjectX = startX + col * (objectSize + gap);
      return leftmostObjectX - jijiWidth;
    }

    // Default fallback
    return screenCenterX - 100;
  };

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ x: -200, y: 0 }}
          animate={
            isFlying
              ? {
                  x: window.innerWidth + 200,
                  y: 0,
                }
              : {
                  x: getBlockedPosition(),
                  y: 0,
                }
          }
          exit={{ opacity: 0 }}
          transition={
            isFlying
              ? {
                  duration: 2,
                  ease: 'easeInOut',
                }
              : {
                  duration: 0.6,
                  ease: [0.25, 0.1, 0.25, 1],
                }
          }
          onAnimationComplete={(definition) => {
            // Heavy haptic bump and donk sound when blocked (only once)
            if (!isFlying && !hasPlayedBlockedSound.current) {
              hasPlayedBlockedSound.current = true;
              sounds.donk();
              Haptics.impact({ style: ImpactStyle.Heavy });
              onBlocked?.(); // Trigger red glow on obstacles
            }
            onAnimationComplete?.();
          }}
          style={{
            position: 'fixed',
            top: getJiJiVerticalPosition(),
            left: 0,
            zIndex: 1000,
            pointerEvents: 'none',
            marginTop: -100, // Center JiJi vertically (half its height)
          }}
        >
          <img
            src="/jiji-rocket-nobg.png"
            alt="JiJi"
            style={{
              width: 200,
              height: 'auto',
              filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.3))',
            }}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
