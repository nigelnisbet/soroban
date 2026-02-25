import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';

interface SymbolicInputDisplayProps {
  rodCount: number;
  inputValues: (number | null)[];  // User's input for each digit position
  onDigitChange: (rodIndex: number, value: number | null) => void;
  disabled?: boolean;
  // Counter row (appears during animation)
  counterValues: number[];
  showCounters: boolean;
  onCounterBoxRefs?: (refs: Map<number, DOMRect>) => void;
  // For verification animation
  digitVerificationState?: Map<number, 'pending' | 'sliding' | 'matched' | 'mismatched'>;
}

// Digit button row component - always visible above input boxes
function DigitButtonRow({
  onSelect,
  disabled,
  activeRodIndex,
}: {
  onSelect: (value: number) => void;
  disabled: boolean;
  activeRodIndex: number | null;
}) {
  const digits = [1, 2, 3, 4, 5, 6, 7, 8, 9, 0];

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'center',
        gap: 6,
        opacity: disabled ? 0.4 : 1,
        pointerEvents: disabled ? 'none' : 'auto',
        transition: 'opacity 0.2s ease',
      }}
    >
      {digits.map((digit) => (
        <motion.button
          key={digit}
          onClick={() => onSelect(digit)}
          disabled={disabled || activeRodIndex === null}
          style={{
            width: 44,
            height: 44,
            borderRadius: 10,
            border: 'none',
            background: activeRodIndex !== null ? '#FFFFFF' : '#E8D4C0',
            fontSize: 22,
            fontWeight: 'bold',
            color: '#5D4632',
            cursor: disabled || activeRodIndex === null ? 'default' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            transition: 'background 0.15s ease',
          }}
          whileHover={disabled || activeRodIndex === null ? {} : { scale: 1.08, background: '#FFF8F0' }}
          whileTap={disabled || activeRodIndex === null ? {} : { scale: 0.92 }}
        >
          {digit}
        </motion.button>
      ))}
    </div>
  );
}

export function SymbolicInputDisplay({
  rodCount,
  inputValues,
  onDigitChange,
  disabled = false,
  counterValues,
  showCounters,
  onCounterBoxRefs,
  digitVerificationState,
}: SymbolicInputDisplayProps) {
  const [activeRodIndex, setActiveRodIndex] = useState<number | null>(null);
  const digitBoxRefs = useRef<Map<number, HTMLDivElement | null>>(new Map());
  const counterBoxRefs = useRef<Map<number, HTMLDivElement | null>>(new Map());

  // Build array of rod indices (reversed for display: highest place value on left)
  const rodIndices = useMemo(
    () => Array.from({ length: rodCount }, (_, i) => rodCount - 1 - i),
    [rodCount]
  );

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

  // Track previous disabled state to detect transitions
  const prevDisabledRef = useRef(disabled);

  // Auto-activate the leftmost digit when component becomes enabled (new problem)
  useEffect(() => {
    const wasDisabled = prevDisabledRef.current;
    prevDisabledRef.current = disabled;

    if (wasDisabled && !disabled) {
      // Transitioning from disabled to enabled - activate leftmost rod
      const leftmostRod = rodIndices[0];
      setActiveRodIndex(leftmostRod);
    } else if (!wasDisabled && disabled) {
      // Transitioning from enabled to disabled - clear active
      setActiveRodIndex(null);
    }
  }, [disabled, rodIndices]);

  // Also activate on initial mount if not disabled
  useEffect(() => {
    if (!disabled && activeRodIndex === null) {
      const leftmostRod = rodIndices[0];
      setActiveRodIndex(leftmostRod);
    }
    // Only run on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Calculate display width based on rod count
  const rodWidth = 96;
  const framePadding = 24;
  const totalWidth = rodCount * rodWidth + framePadding * 2;

  const handleDigitBoxClick = (rodIndex: number) => {
    if (disabled) return;
    setActiveRodIndex(rodIndex);
  };

  const handleNumberSelect = (value: number) => {
    if (activeRodIndex === null || disabled) return;

    // Set the digit value
    onDigitChange(activeRodIndex, value);

    // Auto-advance to next digit to the right (lower rod index in display order)
    const currentDisplayIndex = rodIndices.indexOf(activeRodIndex);
    const nextDisplayIndex = currentDisplayIndex + 1;

    if (nextDisplayIndex < rodIndices.length) {
      // Move to next digit
      const nextRodIndex = rodIndices[nextDisplayIndex];
      setActiveRodIndex(nextRodIndex);
    }
    // If no more digits, stay on current (user can click to change)
  };

  // Calculate the position of the notch indicator
  const getNotchPosition = () => {
    if (activeRodIndex === null) return null;
    const displayIndex = rodIndices.indexOf(activeRodIndex);
    // Center of the digit box within the row
    const boxCenterOffset = displayIndex * rodWidth + rodWidth / 2;
    return boxCenterOffset;
  };

  const notchPosition = getNotchPosition();

  return (
    <div
      style={{
        width: totalWidth,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 8,
      }}
    >
      {/* Digit button row (always visible) */}
      <DigitButtonRow
        onSelect={handleNumberSelect}
        disabled={disabled}
        activeRodIndex={activeRodIndex}
      />

      {/* Notch indicator row */}
      <div
        style={{
          width: rodCount * rodWidth,
          height: 12,
          position: 'relative',
          opacity: disabled ? 0 : 1,
          transition: 'opacity 0.2s ease',
        }}
      >
        {notchPosition !== null && (
          <motion.div
            style={{
              position: 'absolute',
              left: notchPosition,
              top: 0,
              transform: 'translateX(-50%)',
            }}
            initial={false}
            animate={{ left: notchPosition }}
            transition={{ type: 'spring', stiffness: 500, damping: 35 }}
          >
            {/* Triangle notch pointing down */}
            <div
              style={{
                width: 0,
                height: 0,
                borderLeft: '10px solid transparent',
                borderRight: '10px solid transparent',
                borderTop: '10px solid #8B7355',
              }}
            />
          </motion.div>
        )}
      </div>

      {/* User input digit boxes row */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          gap: 0,
          width: '100%',
        }}
      >
        {rodIndices.map((rodIndex) => {
          const inputValue = inputValues[rodIndex];
          const verificationState = digitVerificationState?.get(rodIndex);
          const isMatched = verificationState === 'matched';
          const isMismatched = verificationState === 'mismatched';
          const hasValue = inputValue !== null;
          const isActive = activeRodIndex === rodIndex && !disabled;

          return (
            <div
              key={`input-${rodIndex}`}
              style={{
                width: rodWidth,
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
              <motion.div
                ref={(el) => { digitBoxRefs.current.set(rodIndex, el); }}
                onClick={() => handleDigitBoxClick(rodIndex)}
                style={{
                  width: 60,
                  height: 80,
                  background: isMatched
                    ? 'rgba(76, 175, 80, 0.2)'
                    : isMismatched
                    ? 'rgba(229, 57, 53, 0.2)'
                    : hasValue
                    ? '#FFFFFF'
                    : '#F5E6D3',
                  borderRadius: 12,
                  border: isMatched
                    ? '3px solid #4CAF50'
                    : isMismatched
                    ? '3px solid #E53935'
                    : isActive
                    ? '3px solid #8B7355'
                    : '2px solid #D4C4A8',
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  cursor: disabled ? 'default' : 'pointer',
                  overflow: 'hidden',
                  position: 'relative',
                  transition: 'border-color 0.2s ease, background 0.2s ease',
                }}
                whileHover={disabled ? {} : { scale: 1.02 }}
                whileTap={disabled ? {} : { scale: 0.98 }}
                animate={
                  isMismatched
                    ? { x: [0, -5, 5, -5, 5, 0] }
                    : {}
                }
                transition={{ duration: 0.3 }}
              >
                <span
                  style={{
                    fontSize: 48,
                    fontWeight: 'bold',
                    color: !hasValue
                      ? 'rgba(93, 70, 50, 0.3)'
                      : isMatched
                      ? '#4CAF50'
                      : isMismatched
                      ? '#E53935'
                      : '#5D4632',
                    lineHeight: 1,
                  }}
                >
                  {hasValue ? inputValue : '?'}
                </span>
              </motion.div>
            </div>
          );
        })}
      </div>

      {/* Counter boxes row (appears during animation) */}
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
                    color: counterValue === 0 && !showCounters && !isSliding && !isMatched
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
                      ? { y: -100, opacity: 0 } // Slide UP to compare with user input
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
          const labels = ['Ones', 'Tens', 'Hundreds', 'Thousands', 'Ten-Thousands'];
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
