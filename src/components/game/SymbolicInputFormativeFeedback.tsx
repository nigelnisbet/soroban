import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { AnimatePresence } from 'framer-motion';
import { SIZES } from '../../models/types';
import {
  BeadPosition,
  RodBeadState,
  FeedbackPhase,
  FlashPosition,
  calculateBeadPositions,
  sortBeadsForBurstAnimation,
  calculateBeadDelay,
  FeedbackBead,
  FeedbackFlash,
  ResultOverlay,
} from './feedback';

interface SymbolicInputFormativeFeedbackProps {
  isActive: boolean;
  targetValue: number;
  inputValues: (number | null)[];
  counterBoxPositions: Map<number, DOMRect>;
  sorobanRect: DOMRect | null;
  onCounterIncrement: (rodIndex: number, newValue: number) => void;
  onDigitVerificationStateChange: (state: Map<number, 'pending' | 'sliding' | 'matched' | 'mismatched'>) => void;
  onComplete: (isCorrect: boolean) => void;
  rodCount: number;
  rodStates: RodBeadState[];
}

export function SymbolicInputFormativeFeedback({
  isActive,
  targetValue,
  inputValues,
  counterBoxPositions,
  sorobanRect,
  onCounterIncrement,
  onDigitVerificationStateChange,
  onComplete,
  rodCount,
  rodStates,
}: SymbolicInputFormativeFeedbackProps) {
  const [phase, setPhase] = useState<FeedbackPhase>('IDLE');
  const [allBeadPositions, setAllBeadPositions] = useState<BeadPosition[]>([]);
  const [flashPositions, setFlashPositions] = useState<FlashPosition[]>([]);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [beadsLaunched, setBeadsLaunched] = useState(false);
  const [beadsArrived, setBeadsArrived] = useState<Set<string>>(new Set());

  const hasCompletedRef = useRef(false);
  const animationStartedRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const counterValuesRef = useRef<number[]>(Array(rodCount).fill(0));
  const verificationStateRef = useRef<Map<number, 'pending' | 'sliding' | 'matched' | 'mismatched'>>(new Map());

  // Reset state when deactivated
  useEffect(() => {
    if (!isActive) {
      setPhase('IDLE');
      animationStartedRef.current = false;
      hasCompletedRef.current = false;
      counterValuesRef.current = Array(rodCount).fill(0);
      verificationStateRef.current = new Map();
      setFlashPositions([]);
      setBeadsLaunched(false);
      setBeadsArrived(new Set());
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    }
  }, [isActive, rodCount]);

  // Calculate bead positions when activated
  useEffect(() => {
    if (!isActive || !sorobanRect) return;
    if (counterBoxPositions.size === 0) return;
    if (animationStartedRef.current) return;

    animationStartedRef.current = true;

    const beads = calculateBeadPositions(rodStates, sorobanRect, rodCount);
    setAllBeadPositions(beads);

    // Start animation
    setPhase('FADING_FRAME');

    timerRef.current = setTimeout(() => {
      if (beads.length > 0) {
        setBeadsLaunched(true);
        setPhase('BEADS_FLYING');
      } else {
        setPhase('VERIFYING_DIGITS');
      }
    }, 600);
  }, [isActive, sorobanRect, rodCount, rodStates, counterBoxPositions]);

  // Handle bead arriving at counter
  const handleBeadArrive = useCallback((beadId: string, rodIndex: number, isHeavenBead: boolean = false) => {
    setBeadsArrived(prev => {
      if (prev.has(beadId)) return prev;
      const next = new Set(prev);
      next.add(beadId);
      return next;
    });

    const incrementAmount = isHeavenBead ? 5 : 1;
    const newValue = counterValuesRef.current[rodIndex] + incrementAmount;
    counterValuesRef.current[rodIndex] = newValue;
    onCounterIncrement(rodIndex, newValue);

    // Flash effect
    const counterBox = counterBoxPositions.get(rodIndex);
    if (counterBox) {
      setFlashPositions(prev => [...prev, {
        x: counterBox.left + counterBox.width / 2,
        y: counterBox.top + counterBox.height / 2,
        delay: 0,
      }]);
    }
  }, [counterBoxPositions, onCounterIncrement]);

  // Run digit verification
  const runVerification = useCallback(async () => {
    setPhase('VERIFYING_DIGITS');

    // Verify from highest rod to lowest
    for (let rodIdx = rodCount - 1; rodIdx >= 0; rodIdx--) {
      const counterDigit = counterValuesRef.current[rodIdx] ?? 0;
      const userDigit = inputValues[rodIdx] ?? -1;

      // Mark as sliding
      verificationStateRef.current.set(rodIdx, 'sliding');
      onDigitVerificationStateChange(new Map(verificationStateRef.current));

      await new Promise(resolve => setTimeout(resolve, 400));

      const isMatch = counterDigit === userDigit;

      verificationStateRef.current.set(rodIdx, isMatch ? 'matched' : 'mismatched');
      onDigitVerificationStateChange(new Map(verificationStateRef.current));

      await new Promise(resolve => setTimeout(resolve, isMatch ? 500 : 300));

      if (!isMatch) {
        setIsCorrect(false);
        setPhase('SHOWING_RESULT');
        return;
      }
    }

    setIsCorrect(true);
    setPhase('SHOWING_RESULT');
  }, [rodCount, inputValues, onDigitVerificationStateChange]);

  // Check if all beads have arrived - then start verification
  useEffect(() => {
    if (phase !== 'BEADS_FLYING') return;
    if (!beadsLaunched) return;
    if (allBeadPositions.length === 0) return;

    if (beadsArrived.size >= allBeadPositions.length) {
      setTimeout(() => {
        runVerification();
      }, 200);
    }
  }, [phase, beadsLaunched, beadsArrived.size, allBeadPositions.length, runVerification]);

  // Handle showing result
  useEffect(() => {
    if (phase !== 'SHOWING_RESULT' || isCorrect === null) return;

    if (!hasCompletedRef.current) {
      hasCompletedRef.current = true;

      setTimeout(() => {
        setPhase('COMPLETE');
        onComplete(isCorrect);
      }, isCorrect ? 1500 : 2500);
    }
  }, [phase, isCorrect, onComplete]);

  // Sort beads for animation (must be before early return for consistent hook order)
  const sortedBeads = useMemo(() => sortBeadsForBurstAnimation(allBeadPositions), [allBeadPositions]);

  // Calculate delay for a specific bead
  const getBeadDelay = useCallback(
    (bead: BeadPosition) => calculateBeadDelay(bead, sortedBeads, 150, 40),
    [sortedBeads]
  );

  if (!isActive || phase === 'IDLE' || phase === 'COMPLETE') {
    return null;
  }

  const beadSize = SIZES.large.beadSize;

  return (
    <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 100 }}>
      {/* Static beads during fade phase */}
      {phase === 'FADING_FRAME' && allBeadPositions.map((bead) => (
        <FeedbackBead
          key={`static-${bead.id}`}
          startX={bead.x}
          startY={bead.y}
          endX={bead.x}
          endY={bead.y}
          delay={0}
          onArrive={() => {}}
          isHeaven={bead.isFromHeaven}
          beadSize={beadSize}
          isStatic={true}
        />
      ))}

      {/* Flying beads - burst mode with left-to-right progression */}
      {phase === 'BEADS_FLYING' && beadsLaunched && sortedBeads.map((bead) => {
        if (beadsArrived.has(bead.id)) return null;

        const counterBox = counterBoxPositions.get(bead.rodIndex);
        if (!counterBox) return null;

        const targetX = counterBox.left + counterBox.width / 2;
        const targetY = counterBox.top + counterBox.height / 2;
        const delay = getBeadDelay(bead);

        return (
          <FeedbackBead
            key={`flying-${bead.id}`}
            startX={bead.x}
            startY={bead.y}
            endX={targetX}
            endY={targetY}
            delay={delay}
            duration={0.25}
            onArrive={() => handleBeadArrive(bead.id, bead.rodIndex, bead.isFromHeaven)}
            isHeaven={bead.isFromHeaven}
            beadSize={beadSize}
          />
        );
      })}

      {/* Flash effects */}
      <AnimatePresence>
        {flashPositions.map((flash, i) => (
          <FeedbackFlash key={`flash-${i}`} x={flash.x} y={flash.y} delay={flash.delay} />
        ))}
      </AnimatePresence>

      {/* Result overlay */}
      {phase === 'SHOWING_RESULT' && isCorrect !== null && (
        <ResultOverlay isCorrect={isCorrect} />
      )}
    </div>
  );
}
