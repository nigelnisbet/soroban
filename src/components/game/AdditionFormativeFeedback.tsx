import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { AnimatePresence } from 'framer-motion';
import { SIZES, SizeConfig } from '../../models/types';
import {
  BeadPosition,
  RodBeadState,
  FeedbackPhase,
  FlashPosition,
  calculateBeadPositions,
  sortBeadsForBurstAnimation,
  calculateBeadDelay,
  getDigitForRod,
  FeedbackBead,
  FeedbackFlash,
  ResultOverlay,
} from './feedback';

interface AdditionFormativeFeedbackProps {
  isActive: boolean;
  targetValue: number;
  counterBoxPositions: Map<number, DOMRect>;
  sorobanRect: DOMRect | null;
  onCounterIncrement: (rodIndex: number, newValue: number) => void;
  onDigitVerificationStateChange: (state: Map<number, 'pending' | 'sliding' | 'matched' | 'mismatched'>) => void;
  onComplete: (isCorrect: boolean) => void;
  rodCount: number;
  rodStates: RodBeadState[];
  sizeConfig?: SizeConfig;
}

export function AdditionFormativeFeedback({
  isActive,
  targetValue,
  counterBoxPositions,
  sorobanRect,
  onCounterIncrement,
  onDigitVerificationStateChange,
  onComplete,
  rodCount,
  rodStates,
  sizeConfig,
}: AdditionFormativeFeedbackProps) {
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
      setAllBeadPositions([]);
      setIsCorrect(null);
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    }
  }, [isActive, rodCount]);

  // Run digit verification
  const runVerification = useCallback(async () => {
    setPhase('VERIFYING_DIGITS');

    // Verify from highest rod to lowest (left to right visually)
    for (let rodIdx = rodCount - 1; rodIdx >= 0; rodIdx--) {
      const counterDigit = counterValuesRef.current[rodIdx] ?? 0;
      const targetDigit = getDigitForRod(targetValue, rodIdx);

      // Mark as sliding
      verificationStateRef.current.set(rodIdx, 'sliding');
      onDigitVerificationStateChange(new Map(verificationStateRef.current));

      await new Promise(resolve => setTimeout(resolve, 300));

      const isMatch = counterDigit === targetDigit;

      verificationStateRef.current.set(rodIdx, isMatch ? 'matched' : 'mismatched');
      onDigitVerificationStateChange(new Map(verificationStateRef.current));

      await new Promise(resolve => setTimeout(resolve, isMatch ? 400 : 250));

      if (!isMatch) {
        setIsCorrect(false);
        setPhase('SHOWING_RESULT');
        return;
      }
    }

    setIsCorrect(true);
    setPhase('SHOWING_RESULT');
  }, [rodCount, targetValue, onDigitVerificationStateChange]);

  // Calculate bead positions when activated
  useEffect(() => {
    if (!isActive || !sorobanRect) return;
    if (counterBoxPositions.size === 0) return;
    if (animationStartedRef.current) return;

    animationStartedRef.current = true;

    const beads = calculateBeadPositions(rodStates, sorobanRect, rodCount, sizeConfig);
    setAllBeadPositions(beads);

    // Start animation
    setPhase('FADING_FRAME');

    timerRef.current = setTimeout(() => {
      if (beads.length > 0) {
        setBeadsLaunched(true);
        setPhase('BEADS_FLYING');
      } else {
        // No beads - go straight to verification
        runVerification();
      }
    }, 600);
  }, [isActive, sorobanRect, rodCount, rodStates, counterBoxPositions, runVerification]);

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

  // Sort beads for animation order (must be before early return)
  const sortedBeads = useMemo(() => sortBeadsForBurstAnimation(allBeadPositions), [allBeadPositions]);

  // Calculate delay for a specific bead
  const getBeadDelay = useCallback(
    (bead: BeadPosition) => calculateBeadDelay(bead, sortedBeads, 150, 40),
    [sortedBeads]
  );

  // Check if all beads have arrived
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
      }, isCorrect ? 1200 : 2000);
    }
  }, [phase, isCorrect, onComplete]);

  if (!isActive || phase === 'IDLE' || phase === 'COMPLETE') {
    return null;
  }

  // On mobile, beads are scaled down - use scaled size for rendering
  const mobileScale = sizeConfig?.mobileScale ?? 1;
  const beadSize = (sizeConfig?.beadSize ?? SIZES.large.beadSize) * mobileScale;

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

      {/* Flying beads - burst mode */}
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
