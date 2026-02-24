import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SIZES } from '../../models/types';

// Animation phases for symbolic mode
type SymbolicPhase =
  | 'IDLE'
  | 'FADING_FRAME'        // Soroban frame fades, beads remain
  | 'SPLITTING_HEAVEN'    // Heaven bead splits into 5 (for current rod)
  | 'BEADS_FLYING'        // Beads fly UP to counter boxes
  | 'VERIFYING_DIGITS'    // Counter digits slide up to compare with target
  | 'SHOWING_RESULT'      // Success or failure display
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

interface SymbolicFormativeFeedbackProps {
  isActive: boolean;
  targetValue: number;
  sorobanRect: DOMRect | null;
  counterBoxPositions: Map<number, DOMRect>;
  onCounterIncrement: (rodIndex: number, newValue: number) => void;
  onDigitVerificationStateChange: (state: Map<number, 'pending' | 'sliding' | 'matched' | 'mismatched'>) => void;
  onComplete: (isCorrect: boolean) => void;
  rodCount: number;
  rodStates: RodBeadState[];
  advancedMode?: boolean; // If true, heaven beads fly directly and increment by 5 (no fanning)
}

// Extract a single digit from a number at a specific rod position
function getDigitForRod(value: number, rodIndex: number): number {
  return Math.floor(value / Math.pow(10, rodIndex)) % 10;
}

// Ghost bead that looks identical to real bead and flies to counter box
function GhostBead({
  startX,
  startY,
  endX,
  endY,
  delay,
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
  onArrive: () => void;
  isHeaven: boolean;
  beadSize: number;
  isStatic?: boolean;
}) {
  // Match exact dimensions from Bead.tsx
  const beadHeight = isHeaven ? beadSize * 0.9 : beadSize * 0.7;
  const beadWidth = beadSize * 0.85;

  // Match exact colors from Bead.tsx (active state - bright/vibrant)
  const activeColor = isHeaven ? '#CD853F' : '#DAA520'; // Peru / Goldenrod
  const gradientEnd = isHeaven ? '#8B5A2B' : '#B8860B'; // Warm brown / Dark goldenrod

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
        scale: [1, 1.1, 0.8, 0], // Shrink and fade as it enters counter
      }}
      transition={isStatic ? { duration: 0 } : {
        duration: 0.5,
        delay,
        ease: [0.25, 0.46, 0.45, 0.94],
      }}
      onAnimationComplete={isStatic ? undefined : onArrive}
    >
      {/* Center hole matching real bead */}
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

// Splitting animation for heaven bead - lines emanate and beads appear at ends
function SplittingAnimation({
  originX,
  originY,
  onComplete,
  beadSize,
}: {
  originX: number;
  originY: number;
  onComplete: () => void;
  beadSize: number;
}) {
  const lineLength = 125;
  const angles = [-60, -30, 0, 30, 60]; // Fan out upward
  const earthBeadWidth = beadSize * 0.85;
  const earthBeadHeight = beadSize * 0.7;

  return (
    <>
      {angles.map((angleDeg, i) => {
        const angleRad = (angleDeg * Math.PI) / 180;
        const endX = Math.sin(angleRad) * lineLength;
        const endY = -Math.cos(angleRad) * lineLength; // Negative = upward

        return (
          <React.Fragment key={`split-${i}`}>
            {/* Line from heaven bead center going outward */}
            <motion.div
              style={{
                position: 'fixed',
                left: originX,
                top: originY,
                width: 3,
                height: 0,
                background: 'linear-gradient(to top, #B8860B, #FFD700)',
                transformOrigin: 'center bottom',
                marginLeft: -1.5,
                zIndex: 999,
                borderRadius: 2,
              }}
              initial={{ height: 0, rotate: angleDeg, y: 0, opacity: 1 }}
              animate={{ height: lineLength, rotate: angleDeg, y: -lineLength, opacity: [1, 1, 0] }}
              transition={{
                height: { duration: 0.25, delay: i * 0.04 },
                y: { duration: 0.25, delay: i * 0.04 },
                opacity: { duration: 0.6, delay: i * 0.04, times: [0, 0.7, 1] },
              }}
            />

            {/* Bead appearing at end of line - goldenrod color (earth bead) */}
            <motion.div
              style={{
                position: 'fixed',
                left: originX + endX,
                top: originY + endY,
                width: earthBeadWidth,
                height: earthBeadHeight,
                borderRadius: '50%',
                background: 'radial-gradient(ellipse at 30% 30%, #DAA520 0%, #B8860B 100%)',
                boxShadow: 'inset 0 -4px 8px rgba(0,0,0,0.3), 0 2px 4px rgba(0,0,0,0.2)',
                marginLeft: -earthBeadWidth / 2,
                marginTop: -earthBeadHeight / 2,
                zIndex: 1000,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{
                delay: 0.2 + i * 0.04,
                type: 'spring',
                stiffness: 400,
                damping: 25,
              }}
              onAnimationComplete={i === 4 ? () => {
                console.log('[DEBUG SplittingAnimation] Last bead animation complete');
                onComplete();
              } : undefined}
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
          </React.Fragment>
        );
      })}
    </>
  );
}

export function SymbolicFormativeFeedback({
  isActive,
  targetValue,
  sorobanRect,
  counterBoxPositions,
  onCounterIncrement,
  onDigitVerificationStateChange,
  onComplete,
  rodCount,
  rodStates,
  advancedMode = false,
}: SymbolicFormativeFeedbackProps) {
  const [phase, setPhase] = useState<SymbolicPhase>('IDLE');
  const [allBeadPositions, setAllBeadPositions] = useState<BeadPosition[]>([]);
  const [currentRodBeads, setCurrentRodBeads] = useState<BeadPosition[]>([]);
  const [currentAnimatingRodIndex, setCurrentAnimatingRodIndex] = useState<number>(-1);
  const [rodsToAnimate, setRodsToAnimate] = useState<number[]>([]);
  const [allHeavenBeadPositions, setAllHeavenBeadPositions] = useState<{x: number; y: number; rodIndex: number}[]>([]);
  const [currentSplitBeadPosition, setCurrentSplitBeadPosition] = useState<{x: number; y: number; rodIndex: number} | null>(null);
  const [flashPositions, setFlashPositions] = useState<{x: number; y: number; delay: number}[]>([]);
  const [counterValues, setCounterValues] = useState<number[]>(Array(rodCount).fill(0));
  const [currentBeadIndex, setCurrentBeadIndex] = useState<number>(0);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [verificationState, setVerificationState] = useState<Map<number, 'pending' | 'sliding' | 'matched' | 'mismatched'>>(new Map());

  const hasCompletedRef = useRef(false);
  const animationStartedRef = useRef(false);
  const counterValuesRef = useRef<number[]>(Array(rodCount).fill(0));

  // Calculate total bead value from all rods
  const totalBeadValue = rodStates.reduce((sum, rod) => {
    const placeValue = Math.pow(10, rod.rodIndex);
    const rodValue = (rod.heavenBeadActive ? 5 : 0) + rod.earthBeadsActive;
    return sum + rodValue * placeValue;
  }, 0);

  // Reset state when deactivated
  useEffect(() => {
    if (!isActive) {
      setPhase('IDLE');
      animationStartedRef.current = false;
      hasCompletedRef.current = false;
      setCounterValues(Array(rodCount).fill(0));
      counterValuesRef.current = Array(rodCount).fill(0);
      setCurrentBeadIndex(0);
      setFlashPositions([]);
      setVerificationState(new Map());
    }
  }, [isActive, rodCount]);

  // Calculate bead positions when activated
  useEffect(() => {
    console.log('[DEBUG SymbolicFormativeFeedback] useEffect check:', {
      isActive,
      sorobanRect: sorobanRect ? 'present' : 'null',
      counterBoxPositionsSize: counterBoxPositions.size,
      animationStartedRef: animationStartedRef.current,
    });

    if (!isActive || !sorobanRect) {
      return;
    }

    // Don't require counterBoxPositions to be populated - they may come later
    // We'll wait for them in the BEADS_FLYING phase

    if (animationStartedRef.current) {
      return;
    }
    animationStartedRef.current = true;

    console.log('[DEBUG SymbolicFormativeFeedback] Starting animation with rodStates:', rodStates);

    // Calculate bead starting positions - MUST match SorobanRod.tsx exactly
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
    const heavenBeadsToSplit: {x: number; y: number; rodIndex: number}[] = [];

    // Process each rod
    for (let rodIdx = 0; rodIdx < rodCount; rodIdx++) {
      const rodState = rodStates.find(r => r.rodIndex === rodIdx);
      if (!rodState) continue;

      // Rod center X - rods are arranged with index 0 on the right
      const rodCenterX = frameLeft + (rodCount - 1 - rodIdx) * rodWidth + rodWidth / 2;

      // Handle heaven bead FIRST (so it animates before earth beads)
      if (rodState.heavenBeadActive) {
        if (advancedMode) {
          // In advanced mode, heaven bead flies directly (no splitting)
          // Add it FIRST so it animates before earth beads
          beads.push({
            id: `rod${rodIdx}-heaven-direct`,
            x: rodCenterX,
            y: contentTop + heavenActiveY + heavenBeadHeight / 2,
            isFromHeaven: true, // Mark as heaven so we know to increment by 5
            rodIndex: rodIdx,
          });
        } else {
          // In basic mode, track for splitting animation
          heavenBeadsToSplit.push({
            x: rodCenterX,
            y: contentTop + heavenActiveY + heavenBeadHeight / 2,
            rodIndex: rodIdx,
          });
        }
      }

      // Add earth beads for this rod (after heaven bead in advanced mode)
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

    console.log('[DEBUG SymbolicFormativeFeedback] Calculated positions:', {
      beads: beads.length,
      heavenBeadsToSplit: heavenBeadsToSplit.length,
      beadDetails: beads,
      heavenDetails: heavenBeadsToSplit,
    });

    setAllHeavenBeadPositions(heavenBeadsToSplit);
    setAllBeadPositions(beads);

    // Determine which rods have beads and need to be animated
    // Sort from highest index (tens) to lowest (ones) for animation order
    const rodsWithBeads = [...new Set(beads.map(b => b.rodIndex))].sort((a, b) => b - a);

    // Also include rods that only have heaven beads
    heavenBeadsToSplit.forEach(hb => {
      if (!rodsWithBeads.includes(hb.rodIndex)) {
        rodsWithBeads.push(hb.rodIndex);
        rodsWithBeads.sort((a, b) => b - a);
      }
    });

    setRodsToAnimate(rodsWithBeads);

    console.log('[DEBUG SymbolicFormativeFeedback] Rods to animate:', rodsWithBeads);

    // Start animation sequence
    setPhase('FADING_FRAME');

    const timer1 = setTimeout(() => {
      console.log('[DEBUG SymbolicFormativeFeedback] Timer fired, rodsWithBeads:', rodsWithBeads.length);
      if (rodsWithBeads.length > 0) {
        const firstRod = rodsWithBeads[0];
        setCurrentAnimatingRodIndex(firstRod);

        const rodBeads = beads.filter(b => b.rodIndex === firstRod);
        console.log('[DEBUG SymbolicFormativeFeedback] First rod:', firstRod, 'beads:', rodBeads.length);
        setCurrentRodBeads(rodBeads);
        setCurrentBeadIndex(0);

        const heavenBead = heavenBeadsToSplit.find(h => h.rodIndex === firstRod);
        if (heavenBead) {
          console.log('[DEBUG SymbolicFormativeFeedback] Starting SPLITTING_HEAVEN for rod', firstRod);
          setCurrentSplitBeadPosition(heavenBead);
          setPhase('SPLITTING_HEAVEN');
        } else {
          console.log('[DEBUG SymbolicFormativeFeedback] Starting BEADS_FLYING for rod', firstRod);
          setCurrentSplitBeadPosition(null);
          setPhase('BEADS_FLYING');
        }
      } else {
        // No beads - go straight to verification
        console.log('[DEBUG SymbolicFormativeFeedback] No beads, going to VERIFYING_DIGITS');
        setPhase('VERIFYING_DIGITS');
      }
    }, 800);

    return () => {
      clearTimeout(timer1);
    };
    // Note: counterBoxPositions intentionally excluded - we wait for them in BEADS_FLYING phase
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActive, sorobanRect, rodCount, rodStates]);

  // Handle heaven bead split completion
  const handleSplitComplete = useCallback(() => {
    if (!currentSplitBeadPosition) return;

    console.log('[DEBUG SymbolicFormativeFeedback] Split animation complete, preparing beads to fly');

    const lineLength = 125;
    const angles = [-60, -30, 0, 30, 60];

    const heavenBead = currentSplitBeadPosition;

    const spreadBeads: BeadPosition[] = [];

    for (let i = 0; i < 5; i++) {
      const angleRad = (angles[i] * Math.PI) / 180;
      const endX = Math.sin(angleRad) * lineLength;
      const endY = -Math.cos(angleRad) * lineLength;
      spreadBeads.push({
        id: `rod${heavenBead.rodIndex}-heaven-${i}`,
        x: heavenBead.x + endX,
        y: heavenBead.y + endY,
        isFromHeaven: false, // Use earth bead color (goldenrod) for split beads
        rodIndex: heavenBead.rodIndex,
      });
    }

    // Add spread beads to current rod beads (heaven beads first, then earth beads)
    setCurrentRodBeads(prev => [...spreadBeads, ...prev]);
    setAllBeadPositions(prev => [...spreadBeads, ...prev]);

    // Small delay to let split animation fully show before transitioning
    setTimeout(() => {
      console.log('[DEBUG SymbolicFormativeFeedback] Transitioning to BEADS_FLYING after split');
      setCurrentSplitBeadPosition(null);
      setCurrentBeadIndex(0);
      setPhase('BEADS_FLYING');
    }, 200);
  }, [currentSplitBeadPosition]);

  // Handle bead arriving at counter
  const handleBeadArrive = useCallback((rodIndex: number, isHeavenBead: boolean = false) => {
    // Increment counter for this rod
    // In advanced mode, heaven beads increment by 5; otherwise by 1
    const incrementAmount = (advancedMode && isHeavenBead) ? 5 : 1;
    const newValue = counterValuesRef.current[rodIndex] + incrementAmount;
    counterValuesRef.current[rodIndex] = newValue;
    setCounterValues([...counterValuesRef.current]);
    onCounterIncrement(rodIndex, newValue);

    // Get counter box position for flash
    const counterBox = counterBoxPositions.get(rodIndex);
    if (counterBox) {
      setFlashPositions(prev => [...prev, {
        x: counterBox.left + counterBox.width / 2,
        y: counterBox.top + counterBox.height / 2,
        delay: 0,
      }]);
    }

    // Move to next bead
    setCurrentBeadIndex(prev => prev + 1);
  }, [counterBoxPositions, onCounterIncrement, advancedMode]);

  // Wait for counter box positions if we're in BEADS_FLYING but positions aren't available
  useEffect(() => {
    if (phase !== 'BEADS_FLYING') return;
    if (counterBoxPositions.size === 0) {
      console.log('[DEBUG SymbolicFormativeFeedback] Waiting for counter box positions...');
      return;
    }
    // Force re-render by updating a dummy state if we have positions now
    console.log('[DEBUG SymbolicFormativeFeedback] Counter box positions available:', [...counterBoxPositions.keys()]);
  }, [phase, counterBoxPositions]);

  // Check if all beads for current rod have been animated
  useEffect(() => {
    if (phase !== 'BEADS_FLYING') return;
    if (counterBoxPositions.size === 0) return; // Wait for positions

    if (currentBeadIndex >= currentRodBeads.length) {
      // Current rod done, move to next
      const currentIdx = rodsToAnimate.indexOf(currentAnimatingRodIndex);
      const nextIdx = currentIdx + 1;

      if (nextIdx < rodsToAnimate.length) {
        // Move to next rod
        const nextRod = rodsToAnimate[nextIdx];
        console.log('[DEBUG SymbolicFormativeFeedback] Moving to next rod:', nextRod);
        setCurrentAnimatingRodIndex(nextRod);

        const rodBeads = allBeadPositions.filter(b => b.rodIndex === nextRod);
        console.log('[DEBUG SymbolicFormativeFeedback] Rod', nextRod, 'has', rodBeads.length, 'beads');
        setCurrentRodBeads(rodBeads);
        setCurrentBeadIndex(0);

        const heavenBead = allHeavenBeadPositions.find(h => h.rodIndex === nextRod);
        console.log('[DEBUG SymbolicFormativeFeedback] Heaven bead for rod', nextRod, ':', heavenBead ? 'found' : 'not found');
        if (heavenBead) {
          console.log('[DEBUG SymbolicFormativeFeedback] Setting SPLITTING_HEAVEN for rod', nextRod);
          setCurrentSplitBeadPosition(heavenBead);
          setPhase('SPLITTING_HEAVEN');
        }
      } else {
        // All rods done - move to verification
        setTimeout(() => {
          setPhase('VERIFYING_DIGITS');
        }, 500);
      }
    }
  }, [phase, currentBeadIndex, currentRodBeads.length, rodsToAnimate, currentAnimatingRodIndex, allBeadPositions, allHeavenBeadPositions]);

  // Handle digit verification
  useEffect(() => {
    if (phase !== 'VERIFYING_DIGITS') return;

    // Verify digits one at a time, left to right (highest rod index first)
    const verifyNextDigit = async (rodIndex: number): Promise<boolean> => {
      const counterDigit = counterValuesRef.current[rodIndex] ?? 0;
      const targetDigit = getDigitForRod(targetValue, rodIndex);

      // Mark as sliding
      const slidingState = new Map(verificationState);
      slidingState.set(rodIndex, 'sliding');
      setVerificationState(slidingState);
      onDigitVerificationStateChange(slidingState);

      // Wait for slide animation
      await new Promise(resolve => setTimeout(resolve, 400));

      // Check if match
      const isMatch = counterDigit === targetDigit;

      const resultState = new Map(slidingState);
      resultState.set(rodIndex, isMatch ? 'matched' : 'mismatched');
      setVerificationState(resultState);
      onDigitVerificationStateChange(resultState);

      // Wait for result animation
      await new Promise(resolve => setTimeout(resolve, isMatch ? 500 : 300));

      return isMatch;
    };

    const runVerification = async () => {
      // Verify from highest rod (tens) to lowest (ones)
      for (let rodIdx = rodCount - 1; rodIdx >= 0; rodIdx--) {
        const isMatch = await verifyNextDigit(rodIdx);
        if (!isMatch) {
          // Mismatch - stop verification, show failure
          setIsCorrect(false);
          setPhase('SHOWING_RESULT');
          return;
        }
      }

      // All digits matched
      setIsCorrect(true);
      setPhase('SHOWING_RESULT');
    };

    runVerification();
  }, [phase, rodCount, targetValue, onDigitVerificationStateChange]);

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

  if (!isActive || phase === 'IDLE' || phase === 'COMPLETE') {
    return null;
  }

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

      {/* Static heaven beads during fade (not yet split) */}
      {phase === 'FADING_FRAME' && allHeavenBeadPositions.map((pos, i) => (
        <GhostBead
          key={`static-heaven-${i}`}
          startX={pos.x}
          startY={pos.y}
          endX={pos.x}
          endY={pos.y}
          delay={0}
          onArrive={() => {}}
          isHeaven={true}
          beadSize={beadSize}
          isStatic={true}
        />
      ))}

      {/* Static beads for rods not yet animated (during SPLITTING_HEAVEN and BEADS_FLYING) */}
      {(phase === 'SPLITTING_HEAVEN' || phase === 'BEADS_FLYING') && allBeadPositions
        .filter(bead => {
          // Show beads from rods that haven't started animating yet
          const rodIdx = rodsToAnimate.indexOf(bead.rodIndex);
          const currentRodIdx = rodsToAnimate.indexOf(currentAnimatingRodIndex);

          // During SPLITTING_HEAVEN, also show earth beads from current rod (they haven't flown yet)
          if (phase === 'SPLITTING_HEAVEN' && bead.rodIndex === currentAnimatingRodIndex) {
            // Show earth beads (not the split heaven beads which are rendered by SplittingAnimation)
            return !bead.id.includes('heaven-');
          }

          return rodIdx > currentRodIdx; // Rods after current one in the animation queue
        })
        .map((bead) => (
          <GhostBead
            key={`waiting-${bead.id}`}
            startX={bead.x}
            startY={bead.y}
            endX={bead.x}
            endY={bead.y}
            delay={0}
            onArrive={() => {}}
            isHeaven={false}
            beadSize={beadSize}
            isStatic={true}
          />
        ))}

      {/* Static heaven beads for rods not yet animated */}
      {(phase === 'SPLITTING_HEAVEN' || phase === 'BEADS_FLYING') && allHeavenBeadPositions
        .filter(pos => {
          const rodIdx = rodsToAnimate.indexOf(pos.rodIndex);
          const currentRodIdx = rodsToAnimate.indexOf(currentAnimatingRodIndex);
          return rodIdx > currentRodIdx;
        })
        .map((pos, i) => (
          <GhostBead
            key={`waiting-heaven-${pos.rodIndex}`}
            startX={pos.x}
            startY={pos.y}
            endX={pos.x}
            endY={pos.y}
            delay={0}
            onArrive={() => {}}
            isHeaven={true}
            beadSize={beadSize}
            isStatic={true}
          />
        ))}

      {/* Static beads from current rod that haven't flown yet (during BEADS_FLYING) */}
      {phase === 'BEADS_FLYING' && (() => {
        const queuedBeads = currentRodBeads.filter((bead, index) => index > currentBeadIndex);
        if (queuedBeads.length > 0) {
          console.log('[DEBUG SymbolicFormativeFeedback] Rendering queued beads:', queuedBeads.map(b => b.id));
        }
        return queuedBeads;
      })()
        .map((bead) => (
          <GhostBead
            key={`queued-${bead.id}`}
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

      {/* Splitting animation */}
      {phase === 'SPLITTING_HEAVEN' && currentSplitBeadPosition && (
        <>
          {/* The heaven bead being split - fades and shrinks as it splits */}
          {(() => {
            const heavenBeadWidth = beadSize * 0.85;
            const heavenBeadHeight = beadSize * 0.9;
            return (
              <motion.div
                key={`splitting-heaven-${currentSplitBeadPosition.rodIndex}`}
                style={{
                  position: 'fixed',
                  left: currentSplitBeadPosition.x,
                  top: currentSplitBeadPosition.y,
                  width: heavenBeadWidth,
                  height: heavenBeadHeight,
                  borderRadius: '50%',
                  background: 'radial-gradient(ellipse at 30% 30%, #CD853F 0%, #8B5A2B 100%)',
                  boxShadow: 'inset 0 -4px 8px rgba(0,0,0,0.3), 0 2px 4px rgba(0,0,0,0.2)',
                  marginLeft: -heavenBeadWidth / 2,
                  marginTop: -heavenBeadHeight / 2,
                  zIndex: 1001,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
                initial={{ scale: 1, opacity: 1 }}
                animate={{ scale: 0.5, opacity: 0 }}
                transition={{ duration: 0.3, delay: 0.4 }}
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
          })()}
          {/* Splitting animation with lines and beads */}
          <SplittingAnimation
            originX={currentSplitBeadPosition.x}
            originY={currentSplitBeadPosition.y}
            onComplete={handleSplitComplete}
            beadSize={beadSize}
          />
        </>
      )}

      {/* Flying beads */}
      {phase === 'BEADS_FLYING' && currentRodBeads.map((bead, index) => {
        if (index !== currentBeadIndex) return null;

        const counterBox = counterBoxPositions.get(bead.rodIndex);
        if (!counterBox) {
          console.log('[DEBUG SymbolicFormativeFeedback] No counter box for rod', bead.rodIndex, 'available positions:', [...counterBoxPositions.keys()]);
          return null;
        }

        // Target is center of counter box
        const targetX = counterBox.left + counterBox.width / 2;
        const targetY = counterBox.top + counterBox.height / 2;

        console.log('[DEBUG SymbolicFormativeFeedback] Flying bead to counter box:', {
          beadId: bead.id,
          rodIndex: bead.rodIndex,
          from: { x: bead.x, y: bead.y },
          to: { x: targetX, y: targetY },
        });

        return (
          <GhostBead
            key={`flying-${bead.id}`}
            startX={bead.x}
            startY={bead.y}
            endX={targetX}
            endY={targetY}
            delay={0.1}
            onArrive={() => handleBeadArrive(bead.rodIndex, bead.isFromHeaven)}
            isHeaven={bead.isFromHeaven}
            beadSize={beadSize}
          />
        );
      })}

      {/* Flash effects at counter boxes */}
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
