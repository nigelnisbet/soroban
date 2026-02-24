import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SIZES } from '../../models/types';
import {
  BeadPosition,
  RodBeadState,
  FlashPosition,
  getDigitForRod,
  FeedbackBead,
  FeedbackFlash,
  ResultOverlay,
} from './feedback';

// Animation phases for symbolic mode
type SymbolicPhase =
  | 'IDLE'
  | 'FADING_FRAME'
  | 'SPLITTING_HEAVEN'
  | 'BEADS_FLYING'
  | 'VERIFYING_DIGITS'
  | 'SHOWING_RESULT'
  | 'COMPLETE';

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
  advancedMode?: boolean;
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
  const angles = [-60, -30, 0, 30, 60];
  const earthBeadWidth = beadSize * 0.85;
  const earthBeadHeight = beadSize * 0.7;

  return (
    <>
      {angles.map((angleDeg, i) => {
        const angleRad = (angleDeg * Math.PI) / 180;
        const endX = Math.sin(angleRad) * lineLength;
        const endY = -Math.cos(angleRad) * lineLength;

        return (
          <React.Fragment key={`split-${i}`}>
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
              onAnimationComplete={i === 4 ? onComplete : undefined}
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
  const [flashPositions, setFlashPositions] = useState<FlashPosition[]>([]);
  const [counterValues, setCounterValues] = useState<number[]>(Array(rodCount).fill(0));
  const [currentBeadIndex, setCurrentBeadIndex] = useState<number>(0);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [verificationState, setVerificationState] = useState<Map<number, 'pending' | 'sliding' | 'matched' | 'mismatched'>>(new Map());

  const hasCompletedRef = useRef(false);
  const animationStartedRef = useRef(false);
  const counterValuesRef = useRef<number[]>(Array(rodCount).fill(0));

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
    if (!isActive || !sorobanRect) return;
    if (animationStartedRef.current) return;
    animationStartedRef.current = true;

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

    for (let rodIdx = 0; rodIdx < rodCount; rodIdx++) {
      const rodState = rodStates.find(r => r.rodIndex === rodIdx);
      if (!rodState) continue;

      const rodCenterX = frameLeft + (rodCount - 1 - rodIdx) * rodWidth + rodWidth / 2;

      if (rodState.heavenBeadActive) {
        if (advancedMode) {
          beads.push({
            id: `rod${rodIdx}-heaven-direct`,
            x: rodCenterX,
            y: contentTop + heavenActiveY + heavenBeadHeight / 2,
            isFromHeaven: true,
            rodIndex: rodIdx,
          });
        } else {
          heavenBeadsToSplit.push({
            x: rodCenterX,
            y: contentTop + heavenActiveY + heavenBeadHeight / 2,
            rodIndex: rodIdx,
          });
        }
      }

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

    setAllHeavenBeadPositions(heavenBeadsToSplit);
    setAllBeadPositions(beads);

    const rodsWithBeads = [...new Set(beads.map(b => b.rodIndex))].sort((a, b) => b - a);
    heavenBeadsToSplit.forEach(hb => {
      if (!rodsWithBeads.includes(hb.rodIndex)) {
        rodsWithBeads.push(hb.rodIndex);
        rodsWithBeads.sort((a, b) => b - a);
      }
    });

    setRodsToAnimate(rodsWithBeads);
    setPhase('FADING_FRAME');

    const timer1 = setTimeout(() => {
      if (rodsWithBeads.length > 0) {
        const firstRod = rodsWithBeads[0];
        setCurrentAnimatingRodIndex(firstRod);

        const rodBeads = beads.filter(b => b.rodIndex === firstRod);
        setCurrentRodBeads(rodBeads);
        setCurrentBeadIndex(0);

        const heavenBead = heavenBeadsToSplit.find(h => h.rodIndex === firstRod);
        if (heavenBead) {
          setCurrentSplitBeadPosition(heavenBead);
          setPhase('SPLITTING_HEAVEN');
        } else {
          setCurrentSplitBeadPosition(null);
          setPhase('BEADS_FLYING');
        }
      } else {
        setPhase('VERIFYING_DIGITS');
      }
    }, 800);

    return () => clearTimeout(timer1);
  }, [isActive, sorobanRect, rodCount, rodStates, advancedMode]);

  // Handle heaven bead split completion
  const handleSplitComplete = useCallback(() => {
    if (!currentSplitBeadPosition) return;

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
        isFromHeaven: false,
        rodIndex: heavenBead.rodIndex,
      });
    }

    setCurrentRodBeads(prev => [...spreadBeads, ...prev]);
    setAllBeadPositions(prev => [...spreadBeads, ...prev]);

    setTimeout(() => {
      setCurrentSplitBeadPosition(null);
      setCurrentBeadIndex(0);
      setPhase('BEADS_FLYING');
    }, 200);
  }, [currentSplitBeadPosition]);

  // Handle bead arriving at counter
  const handleBeadArrive = useCallback((rodIndex: number, isHeavenBead: boolean = false) => {
    const incrementAmount = (advancedMode && isHeavenBead) ? 5 : 1;
    const newValue = counterValuesRef.current[rodIndex] + incrementAmount;
    counterValuesRef.current[rodIndex] = newValue;
    setCounterValues([...counterValuesRef.current]);
    onCounterIncrement(rodIndex, newValue);

    const counterBox = counterBoxPositions.get(rodIndex);
    if (counterBox) {
      setFlashPositions(prev => [...prev, {
        x: counterBox.left + counterBox.width / 2,
        y: counterBox.top + counterBox.height / 2,
        delay: 0,
      }]);
    }

    setCurrentBeadIndex(prev => prev + 1);
  }, [counterBoxPositions, onCounterIncrement, advancedMode]);

  // Check if all beads for current rod have been animated
  useEffect(() => {
    if (phase !== 'BEADS_FLYING') return;
    if (counterBoxPositions.size === 0) return;

    if (currentBeadIndex >= currentRodBeads.length) {
      const currentIdx = rodsToAnimate.indexOf(currentAnimatingRodIndex);
      const nextIdx = currentIdx + 1;

      if (nextIdx < rodsToAnimate.length) {
        const nextRod = rodsToAnimate[nextIdx];
        setCurrentAnimatingRodIndex(nextRod);

        const rodBeads = allBeadPositions.filter(b => b.rodIndex === nextRod);
        setCurrentRodBeads(rodBeads);
        setCurrentBeadIndex(0);

        const heavenBead = allHeavenBeadPositions.find(h => h.rodIndex === nextRod);
        if (heavenBead) {
          setCurrentSplitBeadPosition(heavenBead);
          setPhase('SPLITTING_HEAVEN');
        }
      } else {
        setTimeout(() => setPhase('VERIFYING_DIGITS'), 500);
      }
    }
  }, [phase, currentBeadIndex, currentRodBeads.length, rodsToAnimate, currentAnimatingRodIndex, allBeadPositions, allHeavenBeadPositions, counterBoxPositions]);

  // Handle digit verification
  useEffect(() => {
    if (phase !== 'VERIFYING_DIGITS') return;

    const verifyNextDigit = async (rodIndex: number): Promise<boolean> => {
      const counterDigit = counterValuesRef.current[rodIndex] ?? 0;
      const targetDigit = getDigitForRod(targetValue, rodIndex);

      const slidingState = new Map(verificationState);
      slidingState.set(rodIndex, 'sliding');
      setVerificationState(slidingState);
      onDigitVerificationStateChange(slidingState);

      await new Promise(resolve => setTimeout(resolve, 400));

      const isMatch = counterDigit === targetDigit;
      const resultState = new Map(slidingState);
      resultState.set(rodIndex, isMatch ? 'matched' : 'mismatched');
      setVerificationState(resultState);
      onDigitVerificationStateChange(resultState);

      await new Promise(resolve => setTimeout(resolve, isMatch ? 500 : 300));
      return isMatch;
    };

    const runVerification = async () => {
      for (let rodIdx = rodCount - 1; rodIdx >= 0; rodIdx--) {
        const isMatch = await verifyNextDigit(rodIdx);
        if (!isMatch) {
          setIsCorrect(false);
          setPhase('SHOWING_RESULT');
          return;
        }
      }
      setIsCorrect(true);
      setPhase('SHOWING_RESULT');
    };

    runVerification();
  }, [phase, rodCount, targetValue, onDigitVerificationStateChange, verificationState]);

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

      {/* Static heaven beads during fade */}
      {phase === 'FADING_FRAME' && allHeavenBeadPositions.map((pos, i) => (
        <FeedbackBead
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

      {/* Static beads for rods not yet animated */}
      {(phase === 'SPLITTING_HEAVEN' || phase === 'BEADS_FLYING') && allBeadPositions
        .filter(bead => {
          const rodIdx = rodsToAnimate.indexOf(bead.rodIndex);
          const currentRodIdx = rodsToAnimate.indexOf(currentAnimatingRodIndex);
          if (phase === 'SPLITTING_HEAVEN' && bead.rodIndex === currentAnimatingRodIndex) {
            return !bead.id.includes('heaven-');
          }
          return rodIdx > currentRodIdx;
        })
        .map((bead) => (
          <FeedbackBead
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
        .map((pos) => (
          <FeedbackBead
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

      {/* Static beads from current rod that haven't flown yet */}
      {phase === 'BEADS_FLYING' && currentRodBeads
        .filter((_, index) => index > currentBeadIndex)
        .map((bead) => (
          <FeedbackBead
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
        if (!counterBox) return null;

        const targetX = counterBox.left + counterBox.width / 2;
        const targetY = counterBox.top + counterBox.height / 2;

        return (
          <FeedbackBead
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
