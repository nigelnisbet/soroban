import { useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { DigitVerificationState } from './types';

interface CounterBoxRowProps {
  rodCount: number;
  counterValues: number[];
  showCounters: boolean;
  digitVerificationState?: Map<number, DigitVerificationState>;
  onCounterBoxRefs?: (refs: Map<number, DOMRect>) => void;
  /** For initial zeros - show faded until animation starts */
  animationStarted?: boolean;
  /** Rod width in pixels (default 96 to match soroban) */
  rodWidth?: number;
}

/**
 * Reusable counter box row component used in symbolic modes
 * Shows counter values that beads fly into during verification
 */
export function CounterBoxRow({
  rodCount,
  counterValues,
  showCounters,
  digitVerificationState,
  onCounterBoxRefs,
  animationStarted = false,
  rodWidth = 96,
}: CounterBoxRowProps) {
  const counterBoxRefs = useRef<Map<number, HTMLDivElement | null>>(new Map());

  // Build array of rod indices (reversed for display: highest place value on left)
  const rodIndices = Array.from({ length: rodCount }, (_, i) => rodCount - 1 - i);

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
    const timer = setTimeout(() => {
      reportPositions();
    }, 50);
    return () => clearTimeout(timer);
  }, [showCounters, reportPositions]);

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'center',
        gap: 0,
        width: '100%',
        opacity: showCounters ? 1 : 0,
        height: showCounters ? 'auto' : 0,
        overflow: 'hidden',
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
                  ? { y: [0, -10, 0] }
                  : {}
              }
              transition={{ duration: 0.3 }}
            >
              <motion.span
                style={{
                  fontSize: 48,
                  fontWeight: 'bold',
                  color: counterValue === 0 && !animationStarted && !showCounters && !isSliding && !isMatched
                    ? 'rgba(93, 70, 50, 0.3)'
                    : isMatched
                    ? '#4CAF50'
                    : isMismatched
                    ? '#E53935'
                    : '#5D4632',
                  lineHeight: 1,
                }}
                key={`counter-value-${rodIndex}-${counterValue}`}
                initial={{ scale: 1 }}
                animate={
                  isSliding
                    ? { y: -100, opacity: 0 }
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
  );
}
