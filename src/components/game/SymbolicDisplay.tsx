import { motion } from 'framer-motion';
import { getDigitForRod, CounterBoxRow } from './feedback';

interface SymbolicDisplayProps {
  targetValue: number;
  rodCount: number;
  counterValues: number[];
  showCounters: boolean;
  animationStarted?: boolean;
  onCounterBoxRefs?: (refs: Map<number, DOMRect>) => void;
  verifyingRodIndex?: number;
  digitVerificationState?: Map<number, 'pending' | 'sliding' | 'matched' | 'mismatched'>;
}

export function SymbolicDisplay({
  targetValue,
  rodCount,
  counterValues,
  showCounters,
  animationStarted = false,
  onCounterBoxRefs,
  digitVerificationState,
}: SymbolicDisplayProps) {
  // Calculate display width based on rod count
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
      <CounterBoxRow
        rodCount={rodCount}
        counterValues={counterValues}
        showCounters={showCounters}
        digitVerificationState={digitVerificationState}
        onCounterBoxRefs={onCounterBoxRefs}
        animationStarted={animationStarted}
        rodWidth={rodWidth}
      />

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
