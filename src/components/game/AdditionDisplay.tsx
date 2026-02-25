import { useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SIZES, SizeConfig } from '../../models/types';

// Addition problem phases
export type AdditionPhase =
  | 'ENTERING_FIRST'      // User entering first number on soroban
  | 'VERIFYING_FIRST'     // Animating verification of first number
  | 'SHOWING_SECOND'      // Second number + bar appear
  | 'ENTERING_SUM'        // User entering sum on soroban
  | 'VERIFYING_SUM';      // Animating verification of sum

interface AdditionDisplayProps {
  operand1: number;
  operand2: number;
  sum: number;
  phase: AdditionPhase;
  rodCount: number;
  // Counter values for verification animation
  firstNumberCounterValues: number[];
  sumCounterValues: number[];      // User's answer from soroban
  showFirstCounters: boolean;
  showSumCounters: boolean;
  // Verification state for digit comparison
  firstDigitVerificationState?: Map<number, 'pending' | 'sliding' | 'matched' | 'mismatched'>;
  sumDigitVerificationState?: Map<number, 'pending' | 'sliding' | 'matched' | 'mismatched'>;
  // Refs for animation targeting
  onFirstCounterBoxRefs?: (refs: Map<number, DOMRect>) => void;
  onSumCounterBoxRefs?: (refs: Map<number, DOMRect>) => void;
  // For direct feedback (streamlined correct answer flow)
  onSumDigitBoxRefs?: (refs: Map<number, DOMRect>) => void;
  flashingDigits?: Set<number>;  // Digits that should flash green
  showSumForDirectFeedback?: boolean;  // Show sum row for beads to fly to (correct answer)
  // Responsive sizing
  sizeConfig?: SizeConfig;
}

// Single digit box component - sized to match soroban rod width
function DigitBox({
  value,
  verificationState,
  showAsCounter = false,
  rodWidth,
  isFlashing = false,
  isCompact = false,
}: {
  value: number;
  verificationState?: 'pending' | 'sliding' | 'matched' | 'mismatched';
  showAsCounter?: boolean;
  rodWidth: number;
  isFlashing?: boolean;  // Flash green on correct answer
  isCompact?: boolean;
}) {
  const isMatched = verificationState === 'matched' || isFlashing;
  const isMismatched = verificationState === 'mismatched';
  // Size the box to fit within the rod width with some margin
  const margin = isCompact ? 12 : 16;
  const boxWidth = rodWidth - margin;
  const boxHeight = boxWidth * (isCompact ? 0.9 : 1.1); // Shorter in compact mode
  const fontSize = boxWidth * 0.65;

  return (
    <motion.div
      style={{
        width: boxWidth,
        height: boxHeight,
        background: isMatched
          ? 'rgba(76, 175, 80, 0.2)'
          : isMismatched
          ? 'rgba(229, 57, 53, 0.2)'
          : showAsCounter
          ? '#F5E6D3'
          : '#FFFFFF',
        borderRadius: 12,
        border: isMatched
          ? '3px solid #4CAF50'
          : isMismatched
          ? '3px solid #E53935'
          : '2px solid #D4C4A8',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        transition: 'border-color 0.2s ease, background 0.2s ease',
      }}
      animate={
        isMismatched
          ? { x: [0, -5, 5, -5, 5, 0] }
          : {}
      }
      transition={{ duration: 0.3 }}
    >
      <motion.span
        style={{
          fontSize,
          fontWeight: 'bold',
          color: isMatched
            ? '#4CAF50'
            : isMismatched
            ? '#E53935'
            : '#5D4632',
          lineHeight: 1,
        }}
        key={`value-${value}`}
        initial={{ scale: 1 }}
        animate={
          value > 0 && showAsCounter
            ? { scale: [1, 1.2, 1] }
            : {}
        }
        transition={{ duration: 0.15 }}
      >
        {value}
      </motion.span>
    </motion.div>
  );
}

// Convert number to array of digits (left to right)
function numberToDigits(value: number, digitCount: number): number[] {
  const digits: number[] = [];
  let remaining = value;
  for (let i = 0; i < digitCount; i++) {
    digits.unshift(remaining % 10);
    remaining = Math.floor(remaining / 10);
  }
  return digits;
}

export function AdditionDisplay({
  operand1,
  operand2,
  sum,
  phase,
  rodCount,
  firstNumberCounterValues,
  sumCounterValues,
  showFirstCounters,
  showSumCounters,
  firstDigitVerificationState,
  sumDigitVerificationState,
  onFirstCounterBoxRefs,
  onSumCounterBoxRefs,
  onSumDigitBoxRefs,
  flashingDigits,
  showSumForDirectFeedback = false,
  sizeConfig,
}: AdditionDisplayProps) {
  const firstCounterRefs = useRef<Map<number, HTMLDivElement | null>>(new Map());
  const sumCounterRefs = useRef<Map<number, HTMLDivElement | null>>(new Map());
  const sumDigitRefs = useRef<Map<number, HTMLDivElement | null>>(new Map());

  // Report counter box positions
  const reportFirstPositions = useCallback(() => {
    if (!onFirstCounterBoxRefs) return;
    const positions = new Map<number, DOMRect>();
    firstCounterRefs.current.forEach((el, rodIndex) => {
      if (el) {
        positions.set(rodIndex, el.getBoundingClientRect());
      }
    });
    onFirstCounterBoxRefs(positions);
  }, [onFirstCounterBoxRefs]);

  const reportSumPositions = useCallback(() => {
    if (!onSumCounterBoxRefs) return;
    const positions = new Map<number, DOMRect>();
    sumCounterRefs.current.forEach((el, rodIndex) => {
      if (el) {
        positions.set(rodIndex, el.getBoundingClientRect());
      }
    });
    onSumCounterBoxRefs(positions);
  }, [onSumCounterBoxRefs]);

  const reportSumDigitPositions = useCallback(() => {
    if (!onSumDigitBoxRefs) return;
    const positions = new Map<number, DOMRect>();
    sumDigitRefs.current.forEach((el, rodIndex) => {
      if (el) {
        positions.set(rodIndex, el.getBoundingClientRect());
      }
    });
    onSumDigitBoxRefs(positions);
  }, [onSumDigitBoxRefs]);

  // Determine what to show based on phase (moved before useEffect that depends on these)
  const showSecondNumber = phase === 'SHOWING_SECOND' || phase === 'ENTERING_SUM' || phase === 'VERIFYING_SUM';
  // Show sum target row ONLY during verification OR during direct feedback animation
  const showSumTargetRow = phase === 'VERIFYING_SUM' || showSumForDirectFeedback;
  // Only show counter row during verification (wrong answer path)
  const showUserAnswerRow = phase === 'VERIFYING_SUM';

  // Report positions after mount and when visibility changes
  useEffect(() => {
    const timer = setTimeout(() => {
      if (showFirstCounters) reportFirstPositions();
      if (showSumCounters) reportSumPositions();
      // Report sum digit positions when sum row becomes visible
      if (showSumTargetRow) {
        reportSumDigitPositions();
      }
    }, 50);
    return () => clearTimeout(timer);
  }, [showFirstCounters, showSumCounters, showSumTargetRow, reportFirstPositions, reportSumPositions, reportSumDigitPositions]);

  // Get digits for display
  const operand1Digits = numberToDigits(operand1, rodCount);
  const operand2Digits = numberToDigits(operand2, rodCount);
  const sumDigits = numberToDigits(sum, rodCount);

  // Rod indices for iteration (display order: left = highest)
  const rodIndices = Array.from({ length: rodCount }, (_, i) => rodCount - 1 - i);

  // Use same rod width as soroban for alignment (responsive or fallback to large)
  const rodWidth = sizeConfig?.rodWidth ?? SIZES.large.rodWidth;
  const totalWidth = rodCount * rodWidth;
  const isCompact = sizeConfig?.isCompact ?? false;

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: isCompact ? 4 : 8,
        width: totalWidth,
      }}
    >
      {/* First number row - each digit centered over its rod */}
      <div style={{ display: 'flex', width: '100%' }}>
        {rodIndices.map((rodIndex) => {
          const displayIndex = rodCount - 1 - rodIndex;
          const digit = operand1Digits[displayIndex];
          const verificationState = firstDigitVerificationState?.get(rodIndex);
          return (
            <div
              key={`op1-${rodIndex}`}
              style={{
                width: rodWidth,
                display: 'flex',
                justifyContent: 'center',
              }}
            >
              <DigitBox
                value={digit}
                verificationState={verificationState}
                rodWidth={rodWidth}
                isCompact={isCompact}
              />
            </div>
          );
        })}
      </div>

      {/* First number counter row (verification) */}
      <AnimatePresence>
        {showFirstCounters && (
          <motion.div
            style={{ display: 'flex', width: '100%' }}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
          >
            {rodIndices.map((rodIndex) => {
              const counterValue = firstNumberCounterValues[rodIndex] ?? 0;
              const verificationState = firstDigitVerificationState?.get(rodIndex);
              return (
                <div
                  key={`counter1-${rodIndex}`}
                  ref={(el) => { firstCounterRefs.current.set(rodIndex, el); }}
                  style={{
                    width: rodWidth,
                    display: 'flex',
                    justifyContent: 'center',
                  }}
                >
                  <DigitBox
                    value={counterValue}
                    verificationState={verificationState}
                    showAsCounter={true}
                    rodWidth={rodWidth}
                    isCompact={isCompact}
                  />
                </div>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Second number row with + sign */}
      <AnimatePresence>
        {showSecondNumber && (
          <motion.div
            style={{ display: 'flex', width: '100%', alignItems: 'center', position: 'relative' }}
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
          >
            {/* Plus sign - positioned to the left */}
            <span
              style={{
                position: 'absolute',
                left: -60,
                fontSize: 48,
                fontWeight: 'bold',
                color: '#5D4632',
              }}
            >
              +
            </span>
            {/* Second number digits */}
            {rodIndices.map((rodIndex) => {
              const displayIndex = rodCount - 1 - rodIndex;
              const digit = operand2Digits[displayIndex];
              return (
                <div
                  key={`op2-${rodIndex}`}
                  style={{
                    width: rodWidth,
                    display: 'flex',
                    justifyContent: 'center',
                  }}
                >
                  <DigitBox
                    value={digit}
                    rodWidth={rodWidth}
                  />
                </div>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Horizontal bar */}
      <AnimatePresence>
        {showSecondNumber && (
          <motion.div
            style={{
              width: totalWidth,
              height: 4,
              background: '#5D4632',
              borderRadius: 2,
            }}
            initial={{ scaleX: 0, opacity: 0 }}
            animate={{ scaleX: 1, opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3, delay: 0.2 }}
          />
        )}
      </AnimatePresence>

      {/* Sum target row (visible during ENTERING_SUM for direct feedback targets) */}
      <AnimatePresence>
        {showSumTargetRow && (
          <motion.div
            style={{ display: 'flex', width: '100%' }}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            {rodIndices.map((rodIndex) => {
              const displayIndex = rodCount - 1 - rodIndex;
              const digit = sumDigits[displayIndex];
              const verificationState = sumDigitVerificationState?.get(rodIndex);
              const isFlashing = flashingDigits?.has(rodIndex);
              return (
                <div
                  key={`sum-${rodIndex}`}
                  ref={(el) => { sumDigitRefs.current.set(rodIndex, el); }}
                  style={{
                    width: rodWidth,
                    display: 'flex',
                    justifyContent: 'center',
                  }}
                >
                  <DigitBox
                    value={digit}
                    verificationState={verificationState}
                    isFlashing={isFlashing}
                    rodWidth={rodWidth}
                    isCompact={isCompact}
                  />
                </div>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>

      {/* User's answer counter row (beads animate into this) */}
      <AnimatePresence>
        {showUserAnswerRow && (
          <motion.div
            style={{ display: 'flex', width: '100%' }}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
          >
            {rodIndices.map((rodIndex) => {
              const counterValue = sumCounterValues[rodIndex] ?? 0;
              const verificationState = sumDigitVerificationState?.get(rodIndex);
              return (
                <div
                  key={`user-sum-${rodIndex}`}
                  ref={(el) => { sumCounterRefs.current.set(rodIndex, el); }}
                  style={{
                    width: rodWidth,
                    display: 'flex',
                    justifyContent: 'center',
                  }}
                >
                  <DigitBox
                    value={counterValue}
                    verificationState={verificationState}
                    showAsCounter={true}
                    rodWidth={rodWidth}
                    isCompact={isCompact}
                  />
                </div>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Rod labels */}
      <div
        style={{
          display: 'flex',
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
                fontSize: 11,
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
