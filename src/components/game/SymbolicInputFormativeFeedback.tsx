import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SIZES } from '../../models/types';

// Animation phases for symbolic input mode
type SymbolicInputPhase =
  | 'IDLE'
  | 'FADING_FRAME'        // Soroban frame fades, beads remain
  | 'BEADS_FLYING'        // Beads fly UP to counter boxes
  | 'VERIFYING_DIGITS'    // Counter digits slide up to compare with user input
  | 'SHOWING_RESULT'
  | 'COMPLETE';

interface BeadPosition {
  id: string;
  x: number;
  y: number;
  isFromHeaven: boolean;
  rodIndex: number;
}

interface RodBeadState {
  rodIndex: number;
  heavenBeadActive: boolean;
  earthBeadsActive: number;
}

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

// Extract a single digit from a number at a specific rod position
function getDigitForRod(value: number, rodIndex: number): number {
  return Math.floor(value / Math.pow(10, rodIndex)) % 10;
}

// Ghost bead component - supports burst mode for rapid-fire animations
function GhostBead({
  startX,
  startY,
  endX,
  endY,
  delay,
  duration = 0.5,
  onArrive,
  isHeaven,
  beadSize,
  isStatic = false,
}: {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  delay: number;
  duration?: number;
  onArrive: () => void;
  isHeaven: boolean;
  beadSize: number;
  isStatic?: boolean;
}) {
  const beadHeight = isHeaven ? beadSize * 0.9 : beadSize * 0.7;
  const beadWidth = beadSize * 0.85;
  const activeColor = isHeaven ? '#CD853F' : '#DAA520';
  const gradientEnd = isHeaven ? '#8B5A2B' : '#B8860B';

  return (
    <motion.div
      style={{
        position: 'fixed',
        left: startX,
        top: startY,
        width: beadWidth,
        height: beadHeight,
        borderRadius: '50%',
        background: `radial-gradient(ellipse at 30% 30%, ${activeColor} 0%, ${gradientEnd} 100%)`,
        boxShadow: 'inset 0 -4px 8px rgba(0,0,0,0.3), 0 2px 4px rgba(0,0,0,0.2)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginLeft: -beadWidth / 2,
        marginTop: -beadHeight / 2,
      }}
      initial={{ x: 0, y: 0, scale: 1, opacity: 1 }}
      animate={isStatic ? {
        x: 0,
        y: 0,
        scale: 1,
        opacity: 1,
      } : {
        x: endX - startX,
        y: endY - startY,
        scale: [1, 1.05, 0.7, 0],
      }}
      transition={isStatic ? { duration: 0 } : {
        duration,
        delay,
        ease: [0.4, 0, 0.2, 1], // Faster ease-out for snappier feel
      }}
      onAnimationComplete={isStatic ? undefined : onArrive}
    >
      <div
        style={{
          width: beadSize * 0.15,
          height: beadSize * 0.15,
          borderRadius: '50%',
          background: 'radial-gradient(circle, #2D1810 0%, #1A0F0A 100%)',
          boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.8)',
        }}
      />
    </motion.div>
  );
}

// Flash effect when bead enters counter
function CounterFlash({ x, y, delay }: { x: number; y: number; delay: number }) {
  const size = 80;
  return (
    <motion.div
      style={{
        position: 'fixed',
        left: x,
        top: y,
        width: size,
        height: size,
        borderRadius: 12,
        background: 'radial-gradient(circle, rgba(255, 193, 7, 0.8) 0%, transparent 70%)',
        marginLeft: -size / 2,
        marginTop: -size / 2,
        zIndex: 999,
        pointerEvents: 'none',
      }}
      initial={{ scale: 0, opacity: 1 }}
      animate={{ scale: 1.5, opacity: 0 }}
      transition={{ duration: 0.3, delay }}
    />
  );
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
  const [phase, setPhase] = useState<SymbolicInputPhase>('IDLE');
  const [allBeadPositions, setAllBeadPositions] = useState<BeadPosition[]>([]);
  const [flashPositions, setFlashPositions] = useState<{x: number; y: number; delay: number}[]>([]);
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
    console.log('[SymbolicInputFeedback] Effect triggered:', {
      isActive,
      sorobanRect: sorobanRect ? 'exists' : 'null',
      counterBoxPositions: counterBoxPositions.size,
      animationStarted: animationStartedRef.current,
    });

    if (!isActive || !sorobanRect) {
      return;
    }

    // Wait for counter box positions to be available
    if (counterBoxPositions.size === 0) {
      console.log('[SymbolicInputFeedback] Waiting for counter box positions...');
      return;
    }

    if (animationStartedRef.current) {
      return;
    }
    animationStartedRef.current = true;
    console.log('[SymbolicInputFeedback] Starting animation!');
    console.log('[SymbolicInputFeedback] rodStates:', rodStates);
    console.log('[SymbolicInputFeedback] sorobanRect:', {
      top: sorobanRect.top,
      left: sorobanRect.left,
      width: sorobanRect.width,
      height: sorobanRect.height,
    });

    // Calculate bead starting positions from soroban
    const beadSize = SIZES.large.beadSize;
    const beadSpacing = SIZES.large.beadSpacing;
    const framePadding = SIZES.large.framepadding;
    const rodWidth = SIZES.large.rodWidth;

    const heavenSectionHeight = beadSize * 1.5 + beadSpacing * 2;
    const dividerHeight = 12;
    const earthSectionStart = heavenSectionHeight + dividerHeight;
    const beadHeight = beadSize * 0.7;
    const stackSpacing = beadSpacing * 0.5;
    const heavenBeadHeight = beadSize * 0.9;
    const heavenActiveY = heavenSectionHeight - heavenBeadHeight - beadSpacing;

    const borderWidth = 4;
    const contentTop = sorobanRect.top + borderWidth + framePadding;

    const totalRodWidth = rodCount * rodWidth;
    const frameContentWidth = totalRodWidth;
    const frameLeft = sorobanRect.left + (sorobanRect.width - frameContentWidth - 2 * framePadding - 2 * borderWidth) / 2 + borderWidth + framePadding;

    const beads: BeadPosition[] = [];

    // Process each rod - heaven beads first (they increment by 5)
    for (let rodIdx = 0; rodIdx < rodCount; rodIdx++) {
      const rodState = rodStates.find(r => r.rodIndex === rodIdx);
      if (!rodState) continue;

      const rodCenterX = frameLeft + (rodCount - 1 - rodIdx) * rodWidth + rodWidth / 2;

      // Heaven bead first (increments by 5)
      if (rodState.heavenBeadActive) {
        beads.push({
          id: `rod${rodIdx}-heaven-direct`,
          x: rodCenterX,
          y: contentTop + heavenActiveY + heavenBeadHeight / 2,
          isFromHeaven: true,
          rodIndex: rodIdx,
        });
      }

      // Earth beads
      for (let i = 0; i < rodState.earthBeadsActive; i++) {
        const positionY = earthSectionStart + beadSpacing + i * (beadHeight + stackSpacing);
        beads.push({
          id: `rod${rodIdx}-earth-${i}`,
          x: rodCenterX,
          y: contentTop + positionY + beadHeight / 2,
          isFromHeaven: false,
          rodIndex: rodIdx,
        });
      }
    }

    console.log('[SymbolicInputFeedback] Calculated beads:', beads);
    setAllBeadPositions(beads);

    // Start animation
    setPhase('FADING_FRAME');
    console.log('[SymbolicInputFeedback] Set phase to FADING_FRAME');

    timerRef.current = setTimeout(() => {
      console.log('[SymbolicInputFeedback] Timer fired, launching all beads at once');
      if (beads.length > 0) {
        setBeadsLaunched(true);
        setPhase('BEADS_FLYING');
        console.log('[SymbolicInputFeedback] Set phase to BEADS_FLYING - burst mode');
      } else {
        setPhase('VERIFYING_DIGITS');
      }
    }, 600); // Slightly shorter fade time

    // Don't clear timer on re-render - only clear on deactivation
  }, [isActive, sorobanRect, rodCount, rodStates, counterBoxPositions]);

  // Handle bead arriving at counter - called for each bead in burst mode
  const handleBeadArrive = useCallback((beadId: string, rodIndex: number, isHeavenBead: boolean = false) => {
    // Prevent double-counting
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

    // Check if all beads have arrived
    if (beadsArrived.size >= allBeadPositions.length) {
      console.log('[SymbolicInputFeedback] All beads arrived, starting verification');
      setTimeout(() => {
        runVerification();
      }, 200); // Short pause after last bead lands
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

  // Sort beads for left-to-right rod progression (highest rod index first = leftmost in display)
  // Within each rod, beads fly in rapid succession
  // IMPORTANT: This must be before the early return to maintain consistent hook order
  const sortedBeads = useMemo(() => {
    const sorted = [...allBeadPositions].sort((a, b) => {
      // First by rod index descending (highest/leftmost first)
      if (b.rodIndex !== a.rodIndex) return b.rodIndex - a.rodIndex;
      // Within same rod, heaven beads first (they're worth 5)
      if (a.isFromHeaven !== b.isFromHeaven) return a.isFromHeaven ? -1 : 1;
      // Then by id for consistent ordering
      return a.id.localeCompare(b.id);
    });
    return sorted;
  }, [allBeadPositions]);

  // Calculate stagger delays for burst animation
  // Left-to-right rod progression with rapid-fire within each rod
  const getBeadDelay = useCallback((bead: BeadPosition): number => {
    const beadIndex = sortedBeads.findIndex(b => b.id === bead.id);
    if (beadIndex === -1) return 0;

    // Find which rod group this bead is in and its position within that rod
    let rodGroupDelay = 0;
    let withinRodDelay = 0;
    let currentRod = -1;
    let beadsInCurrentRod = 0;

    for (let i = 0; i <= beadIndex; i++) {
      const b = sortedBeads[i];
      if (b.rodIndex !== currentRod) {
        // New rod - add gap between rods
        if (currentRod !== -1) {
          rodGroupDelay += 0.15; // 150ms pause between rods for visual separation
        }
        currentRod = b.rodIndex;
        beadsInCurrentRod = 0;
      }
      if (i === beadIndex) {
        withinRodDelay = beadsInCurrentRod * 0.04; // 40ms between beads in same rod
      }
      beadsInCurrentRod++;
    }

    return rodGroupDelay + withinRodDelay;
  }, [sortedBeads]);

  if (!isActive || phase === 'IDLE' || phase === 'COMPLETE') {
    return null;
  }

  console.log('[SymbolicInputFeedback] Render:', {
    phase,
    beadsLaunched,
    beadsArrivedCount: beadsArrived.size,
    allBeadPositionsCount: allBeadPositions.length,
  });

  const beadSize = SIZES.large.beadSize;

  return (
    <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 100 }}>
      {/* Static beads during fade phase */}
      {phase === 'FADING_FRAME' && allBeadPositions.map((bead) => (
        <GhostBead
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

      {/* All beads fly with staggered delays - left-to-right rod progression, rapid within each rod */}
      {phase === 'BEADS_FLYING' && beadsLaunched && sortedBeads.map((bead) => {
        // Skip beads that have already arrived
        if (beadsArrived.has(bead.id)) return null;

        const counterBox = counterBoxPositions.get(bead.rodIndex);
        if (!counterBox) return null;

        const targetX = counterBox.left + counterBox.width / 2;
        const targetY = counterBox.top + counterBox.height / 2;
        const delay = getBeadDelay(bead);

        return (
          <GhostBead
            key={`flying-${bead.id}`}
            startX={bead.x}
            startY={bead.y}
            endX={targetX}
            endY={targetY}
            delay={delay}
            duration={0.25} // Fast flight - snappy!
            onArrive={() => handleBeadArrive(bead.id, bead.rodIndex, bead.isFromHeaven)}
            isHeaven={bead.isFromHeaven}
            beadSize={beadSize}
          />
        );
      })}

      {/* Flash effects */}
      <AnimatePresence>
        {flashPositions.map((flash, i) => (
          <CounterFlash key={`flash-${i}`} x={flash.x} y={flash.y} delay={flash.delay} />
        ))}
      </AnimatePresence>

      {/* Result overlay */}
      {phase === 'SHOWING_RESULT' && isCorrect !== null && (
        <motion.div
          style={{
            position: 'fixed',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: isCorrect
              ? 'radial-gradient(circle, rgba(76, 175, 80, 0.3) 0%, transparent 70%)'
              : 'radial-gradient(circle, rgba(244, 67, 54, 0.3) 0%, transparent 70%)',
            pointerEvents: 'none',
          }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            style={{
              fontSize: 120,
              textShadow: isCorrect
                ? '0 0 40px rgba(76, 175, 80, 0.8)'
                : '0 0 40px rgba(244, 67, 54, 0.8)',
            }}
            initial={{ scale: 0 }}
            animate={{ scale: [0, 1.2, 1], rotate: isCorrect ? [0, 10, -10, 0] : [0, -5, 5, -5, 5, 0] }}
            transition={{ duration: 0.5 }}
          >
            {isCorrect ? '✓' : '✗'}
          </motion.div>
        </motion.div>
      )}
    </div>
  );
}
