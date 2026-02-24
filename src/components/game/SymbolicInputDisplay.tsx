import { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

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

// Number pad popup component
function NumberPad({
  isOpen,
  onSelect,
  onClose,
  anchorRect,
}: {
  isOpen: boolean;
  onSelect: (value: number) => void;
  onClose: () => void;
  anchorRect: DOMRect | null;
}) {
  if (!isOpen || !anchorRect) return null;

  // Position the pad centered over the digit box
  const padWidth = 180;
  const padHeight = 220; // Approximate height of the pad
  const left = anchorRect.left + anchorRect.width / 2 - padWidth / 2;
  const top = anchorRect.top + anchorRect.height / 2 - padHeight / 2;

  return (
    <>
      {/* Backdrop */}
      <motion.div
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.3)',
          zIndex: 1000,
        }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      />
      {/* Number pad */}
      <motion.div
        style={{
          position: 'fixed',
          left,
          top,
          width: padWidth,
          background: '#F5E6D3',
          borderRadius: 16,
          padding: 12,
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
          zIndex: 1001,
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 8,
        }}
        initial={{ opacity: 0, scale: 0.8, y: -20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.8, y: -20 }}
        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
      >
        {[1, 2, 3, 4, 5, 6, 7, 8, 9, null, 0, 'clear'].map((item) => {
          if (item === null) {
            return <div key="spacer" />;
          }

          const isNumber = typeof item === 'number';

          return (
            <motion.button
              key={item}
              onClick={() => {
                if (isNumber) {
                  onSelect(item);
                } else {
                  onSelect(-1); // -1 signals clear
                }
              }}
              style={{
                width: 50,
                height: 50,
                borderRadius: 12,
                border: 'none',
                background: isNumber ? '#FFFFFF' : '#E8D4C0',
                fontSize: isNumber ? 24 : 14,
                fontWeight: 'bold',
                color: '#5D4632',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
              }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              {isNumber ? item : 'C'}
            </motion.button>
          );
        })}
      </motion.div>
    </>
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
  const [anchorRect, setAnchorRect] = useState<DOMRect | null>(null);
  const [hasUserInteracted, setHasUserInteracted] = useState(false);
  const digitBoxRefs = useRef<Map<number, HTMLDivElement | null>>(new Map());
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

  // Auto-activate the leftmost digit when component becomes enabled
  useEffect(() => {
    if (!disabled && activeRodIndex === null && !hasUserInteracted) {
      // Find the leftmost (highest) rod index and activate it
      const leftmostRod = rodIndices[0]; // First in display order = highest rod index
      const el = digitBoxRefs.current.get(leftmostRod);
      if (el) {
        // Small delay to ensure refs are populated
        const timer = setTimeout(() => {
          setActiveRodIndex(leftmostRod);
          setAnchorRect(el.getBoundingClientRect());
        }, 100);
        return () => clearTimeout(timer);
      }
    }
  }, [disabled, activeRodIndex, hasUserInteracted, rodIndices]);

  // Reset hasUserInteracted when disabled changes (new problem)
  useEffect(() => {
    if (disabled) {
      setHasUserInteracted(false);
      setActiveRodIndex(null);
      setAnchorRect(null);
    }
  }, [disabled]);

  // Calculate display width based on rod count
  const rodWidth = 96;
  const framePadding = 24;
  const totalWidth = rodCount * rodWidth + framePadding * 2;

  const handleDigitBoxClick = (rodIndex: number, el: HTMLDivElement | null) => {
    if (disabled || !el) return;
    setHasUserInteracted(true);
    setActiveRodIndex(rodIndex);
    setAnchorRect(el.getBoundingClientRect());
  };

  const handleNumberSelect = (value: number) => {
    if (activeRodIndex === null) return;

    setHasUserInteracted(true);

    if (value === -1) {
      // Clear - stay on same digit
      onDigitChange(activeRodIndex, null);
    } else {
      // Set value and auto-advance to next digit
      onDigitChange(activeRodIndex, value);

      // Find next digit to the right (lower rod index in display order)
      const currentDisplayIndex = rodIndices.indexOf(activeRodIndex);
      const nextDisplayIndex = currentDisplayIndex + 1;

      if (nextDisplayIndex < rodIndices.length) {
        // Move to next digit
        const nextRodIndex = rodIndices[nextDisplayIndex];
        const el = digitBoxRefs.current.get(nextRodIndex);
        if (el) {
          setActiveRodIndex(nextRodIndex);
          setAnchorRect(el.getBoundingClientRect());
          return;
        }
      }

      // No more digits - close the pad
      setActiveRodIndex(null);
      setAnchorRect(null);
    }
  };

  const handleClose = () => {
    setActiveRodIndex(null);
    setAnchorRect(null);
  };

  return (
    <>
      <div
        style={{
          width: totalWidth,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 16,
        }}
      >
        {/* User input digit boxes row (top) */}
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
                  onClick={() => handleDigitBoxClick(rodIndex, digitBoxRefs.current.get(rodIndex) || null)}
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
                      : activeRodIndex === rodIndex
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

      {/* Number pad popup */}
      <AnimatePresence>
        {activeRodIndex !== null && (
          <NumberPad
            isOpen={activeRodIndex !== null}
            onSelect={handleNumberSelect}
            onClose={handleClose}
            anchorRect={anchorRect}
          />
        )}
      </AnimatePresence>
    </>
  );
}
