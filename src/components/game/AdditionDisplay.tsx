import { useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SIZES } from '../../models/types';

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
}

// Single digit box component - sized to match soroban rod width
function DigitBox({
  value,
  verificationState,
  showAsCounter = false,
  rodWidth,
}: {
  value: number;
  verificationState?: 'pending' | 'sliding' | 'matched' | 'mismatched';
  showAsCounter?: boolean;
  rodWidth: number;
}) {
  const isMatched = verificationState === 'matched';
  const isMismatched = verificationState === 'mismatched';
  // Size the box to fit within the rod width with some margin
  const boxWidth = rodWidth - 16; // Leave some margin on sides
  const boxHeight = boxWidth * 1.1; // Slightly taller than wide
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
}: AdditionDisplayProps) {
  const firstCounterRefs = useRef<Map<number, HTMLDivElement | null>>(new Map());
  const sumCounterRefs = useRef<Map<number, HTMLDivElement | null>>(new Map());

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

  // Report positions after mount and when counters shown
  useEffect(() => {
    const timer = setTimeout(() => {
      if (showFirstCounters) reportFirstPositions();
      if (showSumCounters) reportSumPositions();
    }, 50);
    return () => clearTimeout(timer);
  }, [showFirstCounters, showSumCounters, reportFirstPositions, reportSumPositions]);

  // Get digits for display
  const operand1Digits = numberToDigits(operand1, rodCount);
  const operand2Digits = numberToDigits(operand2, rodCount);
  const sumDigits = numberToDigits(sum, rodCount);

  // Rod indices for iteration (display order: left = highest)
  const rodIndices = Array.from({ length: rodCount }, (_, i) => rodCount - 1 - i);

  // Determine what to show based on phase
  const showSecondNumber = phase === 'SHOWING_SECOND' || phase === 'ENTERING_SUM' || phase === 'VERIFYING_SUM';
  const showSumRow = phase === 'VERIFYING_SUM';
  const showUserAnswerRow = phase === 'VERIFYING_SUM';

  // Use same rod width as soroban for alignment
  const rodWidth = SIZES.large.rodWidth; // 96px
  const totalWidth = rodCount * rodWidth;

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 8,
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

      {/* Correct sum row (appears during verification) */}
      <AnimatePresence>
        {showSumRow && (
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
              return (
                <div
                  key={`sum-${rodIndex}`}
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
