import { motion } from 'framer-motion';
import { useEffect, useRef, useCallback } from 'react';

interface SymbolicDisplayProps {
  targetValue: number;              // e.g., 63
  rodCount: number;                 // 2 for tens+ones
  counterValues: number[];          // [onesCounter, tensCounter, ...] indexed by rod
  showCounters: boolean;            // Show counter boxes during animation
  animationStarted?: boolean;       // True once user presses Go - zeros become full dark color
  onCounterBoxRefs?: (refs: Map<number, DOMRect>) => void;
  // For digit verification animation
  verifyingRodIndex?: number;       // Which rod's digit is currently sliding up
  digitVerificationState?: Map<number, 'pending' | 'sliding' | 'matched' | 'mismatched'>;
}

// Extract a single digit from a number at a specific rod position
// rodIndex 0 = ones, rodIndex 1 = tens, etc.
function getDigitForRod(value: number, rodIndex: number): number {
  return Math.floor(value / Math.pow(10, rodIndex)) % 10;
}

export function SymbolicDisplay({
  targetValue,
  rodCount,
  counterValues,
  showCounters,
  animationStarted = false,
  onCounterBoxRefs,
  verifyingRodIndex,
  digitVerificationState,
}: SymbolicDisplayProps) {
  const counterBoxRefs = useRef<Map<number, HTMLDivElement | null>>(new Map());

  // Report counter box positions when requested
  const reportPositions = useCallback(() => {
    if (!onCounterBoxRefs) return;

    const positions = new Map<number, DOMRect>();
    counterBoxRefs.current.forEach((el, rodIndex) => {
      if (el) {
        positions.set(rodIndex, el.getBoundingClientRect());
      }
    });
    onCounterBoxRefs(positions);
  }, [onCounterBoxRefs]);

  // Report positions after mount and when showCounters changes
  useEffect(() => {
    // Always report positions after initial mount
    const timer = setTimeout(() => {
      console.log('[DEBUG SymbolicDisplay] Reporting positions, showCounters:', showCounters);
      reportPositions();
    }, 50);
    return () => clearTimeout(timer);
  }, [showCounters, reportPositions]);

  // Calculate display width based on rod count
  // Match the soroban rod spacing (96px per rod for large size)
  const rodWidth = 96;
  const framePadding = 24;
  const totalWidth = rodCount * rodWidth + framePadding * 2;

  // Build array of rod indices (reversed for display: highest place value on left)
  const rodIndices = Array.from({ length: rodCount }, (_, i) => rodCount - 1 - i);

  return (
    <div
      style={{
        width: totalWidth,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 16,
      }}
    >
      {/* Target digits row */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          gap: 0,
          width: '100%',
        }}
      >
        {rodIndices.map((rodIndex) => {
          const digit = getDigitForRod(targetValue, rodIndex);
          const verificationState = digitVerificationState?.get(rodIndex);

          return (
            <div
              key={`target-${rodIndex}`}
              style={{
                width: rodWidth,
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
              <motion.div
                style={{
                  fontSize: 80,
                  fontWeight: 'bold',
                  color: verificationState === 'matched'
                    ? '#4CAF50'
                    : verificationState === 'mismatched'
                    ? '#E53935'
                    : '#5D4632',
                  lineHeight: 1,
                  textShadow: verificationState === 'matched'
                    ? '0 0 20px rgba(76, 175, 80, 0.5)'
                    : 'none',
                }}
                animate={
                  verificationState === 'matched'
                    ? { scale: [1, 1.1, 1] }
                    : verificationState === 'mismatched'
                    ? { x: [0, -5, 5, -5, 5, 0] }
                    : {}
                }
                transition={{ duration: 0.3 }}
              >
                {digit}
              </motion.div>
            </div>
          );
        })}
      </div>

      {/* Counter boxes row */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          gap: 0,
          width: '100%',
          opacity: showCounters ? 1 : 0,
          transition: 'opacity 0.3s ease',
        }}
      >
        {rodIndices.map((rodIndex) => {
          const counterValue = counterValues[rodIndex] ?? 0;
          const verificationState = digitVerificationState?.get(rodIndex);
          const isSliding = verificationState === 'sliding';
          const isMatched = verificationState === 'matched';
          const isMismatched = verificationState === 'mismatched';

          return (
            <div
              key={`counter-${rodIndex}`}
              style={{
                width: rodWidth,
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
              <motion.div
                ref={(el) => { counterBoxRefs.current.set(rodIndex, el); }}
                style={{
                  width: 60,
                  height: 80,
                  background: isMatched
                    ? 'rgba(76, 175, 80, 0.2)'
                    : isMismatched
                    ? 'rgba(229, 57, 53, 0.2)'
                    : '#F5E6D3',
                  borderRadius: 12,
                  border: isMatched
                    ? '3px solid #4CAF50'
                    : isMismatched
                    ? '3px solid #E53935'
                    : '2px solid #D4C4A8',
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  overflow: 'hidden',
                  position: 'relative',
                }}
                animate={
                  isMismatched
                    ? { y: [0, -10, 0] } // Bounce back down on mismatch
                    : {}
                }
                transition={{ duration: 0.3 }}
              >
                <motion.span
                  style={{
                    fontSize: 48,
                    fontWeight: 'bold',
                    // Zeros are faded before animation starts, then become full color
                    color: counterValue === 0 && !animationStarted && !isSliding && !isMatched
                      ? 'rgba(93, 70, 50, 0.3)' // Faded initial 0 (before Go is pressed)
                      : isMatched
                      ? '#4CAF50'
                      : isMismatched
                      ? '#E53935'
                      : '#5D4632', // Full dark color once animation starts
                    lineHeight: 1,
                  }}
                  // Pulse animation when counter increments
                  key={`counter-value-${rodIndex}-${counterValue}`}
                  initial={{ scale: 1 }}
                  animate={
                    isSliding
                      ? { y: -100, opacity: 0 } // Slide up and fade
                      : counterValue > 0
                      ? { scale: [1, 1.2, 1] }
                      : {}
                  }
                  transition={{
                    duration: isSliding ? 0.4 : 0.15,
                    ease: isSliding ? 'easeIn' : 'easeOut'
                  }}
                >
                  {counterValue}
                </motion.span>
              </motion.div>
            </div>
          );
        })}
      </div>

      {/* Rod labels */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          gap: 0,
          width: '100%',
          opacity: 0.5,
        }}
      >
        {rodIndices.map((rodIndex) => {
          const labels = ['Ones', 'Tens', 'Hundreds', 'Thousands'];
          return (
            <div
              key={`label-${rodIndex}`}
              style={{
                width: rodWidth,
                textAlign: 'center',
                fontSize: 12,
                color: '#5D4632',
                fontWeight: 500,
              }}
            >
              {labels[rodIndex] || `10^${rodIndex}`}
            </div>
          );
        })}
      </div>
    </div>
  );
}
