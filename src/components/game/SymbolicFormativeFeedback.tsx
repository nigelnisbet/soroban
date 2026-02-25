import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SIZES, SizeConfig } from '../../models/types';
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
  sizeConfig?: SizeConfig;
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
  // Line length scales proportionally with bead size (125 at beadSize 72)
  const lineLength = beadSize * 1.74;
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
  sizeConfig,
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
  // For train-style animation in advanced mode: track which beads are currently flying
  const [trainBeadsFlying, setTrainBeadsFlying] = useState<Set<number>>(new Set());
  const [trainBeadsCompleted, setTrainBeadsCompleted] = useState<Set<number>>(new Set());
  // Track how many heaven beads were in the train (to know when to pause before earth beads)
  const [heavenBeadCount, setHeavenBeadCount] = useState<number>(0);
  // Track if we're in the "earth beads" phase after heaven train completes
  const [earthBeadsPhase, setEarthBeadsPhase] = useState<boolean>(false);
  // Track if we're pausing after heaven train (to prevent fan flash)
  const [pausingAfterHeavenTrain, setPausingAfterHeavenTrain] = useState<boolean>(false);
  // Track if we're pausing between rods (to observe the count)
  const [pausingBetweenRods, setPausingBetweenRods] = useState<boolean>(false);
  // Pre-computed correctness - determines animation speed in advanced mode
  // (correct = fast, incorrect = slow/deliberate to help understand the mistake)
  const [preComputedCorrect, setPreComputedCorrect] = useState<boolean | null>(null);

  const hasCompletedRef = useRef(false);
  const animationStartedRef = useRef(false);

  // Determine if we should use fast animation
  // Fast only when: advanced mode AND answer is correct
  // Slow when: kids mode OR advanced mode with incorrect answer
  const useFastAnimation = advancedMode && preComputedCorrect === true;
  const counterValuesRef = useRef<number[]>(Array(rodCount).fill(0));
  const fadeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
      setTrainBeadsFlying(new Set());
      setTrainBeadsCompleted(new Set());
      setHeavenBeadCount(0);
      setEarthBeadsPhase(false);
      setPausingAfterHeavenTrain(false);
      setPausingBetweenRods(false);
      setPreComputedCorrect(null);
      processingRodCompletionRef.current = false;
      // Clear any pending timer when deactivated
      if (fadeTimerRef.current) {
        clearTimeout(fadeTimerRef.current);
        fadeTimerRef.current = null;
      }
    }
  }, [isActive, rodCount]);

  // Calculate bead positions when activated
  useEffect(() => {
    if (!isActive || !sorobanRect) return;
    if (animationStartedRef.current) return;
    animationStartedRef.current = true;

    // Use responsive size config or fall back to large
    // Scale by mobileScale since sorobanRect is in scaled screen coordinates
    const mobileScale = sizeConfig?.mobileScale ?? 1;
    const beadSize = (sizeConfig?.beadSize ?? SIZES.large.beadSize) * mobileScale;
    const beadSpacing = (sizeConfig?.beadSpacing ?? SIZES.large.beadSpacing) * mobileScale;
    const framePadding = (sizeConfig?.framepadding ?? SIZES.large.framepadding) * mobileScale;
    const rodWidth = (sizeConfig?.rodWidth ?? SIZES.large.rodWidth) * mobileScale;

    const heavenSectionHeight = beadSize * 1.5 + beadSpacing * 2;
    const dividerHeight = 12 * mobileScale;
    const earthSectionStart = heavenSectionHeight + dividerHeight;
    const beadHeight = beadSize * 0.7;
    const stackSpacing = beadSpacing * 0.5;
    const heavenBeadHeight = beadSize * 0.9;
    const heavenActiveY = heavenSectionHeight - heavenBeadHeight - beadSpacing;

    const borderWidth = 4 * mobileScale;
    const contentTop = sorobanRect.top + borderWidth + framePadding;

    // The soroban frame uses box-sizing: border-box.
    // Rod positions are calculated from the frame center for accuracy.
    const frameCenter = sorobanRect.left + sorobanRect.width / 2;

    const beads: BeadPosition[] = [];
    const heavenBeadsToSplit: {x: number; y: number; rodIndex: number}[] = [];

    for (let rodIdx = 0; rodIdx < rodCount; rodIdx++) {
      const rodState = rodStates.find(r => r.rodIndex === rodIdx);
      if (!rodState) continue;

      // Calculate rod center from frame center directly
      // With row-reverse layout: Rod 0 is rightmost, Rod (rodCount-1) is leftmost
      // Rod positions are symmetric around the frame center
      // For 4 rods: positions are at offsets of -1.5, -0.5, +0.5, +1.5 rod widths from center
      // Rod 0 (rightmost) = center + (rodCount/2 - 0.5) * rodWidth = center + 1.5 * rodWidth
      // Rod 3 (leftmost)  = center + (rodCount/2 - 3.5) * rodWidth = center - 1.5 * rodWidth
      const offsetFromCenter = (rodCount / 2 - rodIdx - 0.5) * rodWidth;
      const rodCenterX = frameCenter + offsetFromCenter;

      if (rodState.heavenBeadActive) {
        const heavenY = contentTop + heavenActiveY + heavenBeadHeight / 2;
        // Both modes now use the split/fan animation for heaven beads
        heavenBeadsToSplit.push({
          x: rodCenterX,
          y: heavenY,
          rodIndex: rodIdx,
        });
      }

      for (let i = 0; i < rodState.earthBeadsActive; i++) {
        const positionY = earthSectionStart + beadSpacing + i * (beadHeight + stackSpacing);
        const earthY = contentTop + positionY + beadHeight / 2;
        beads.push({
          id: `rod${rodIdx}-earth-${i}`,
          x: rodCenterX,
          y: earthY,
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

    // Pre-compute correctness to determine animation speed
    // In advanced mode: correct = fast animation, incorrect = slow/deliberate
    let isAnswerCorrect = false;
    if (advancedMode) {
      let userValue = 0;
      for (let rodIdx = 0; rodIdx < rodCount; rodIdx++) {
        const rodState = rodStates.find(r => r.rodIndex === rodIdx);
        if (rodState) {
          const rodValue = (rodState.heavenBeadActive ? 5 : 0) + rodState.earthBeadsActive;
          userValue += rodValue * Math.pow(10, rodIdx);
        }
      }
      isAnswerCorrect = userValue === targetValue;
      setPreComputedCorrect(isAnswerCorrect);
    }

    // Use fast animation only when: advanced mode AND correct
    const shouldUseFastAnimation = advancedMode && isAnswerCorrect;

    setPhase('FADING_FRAME');

    // Faster fade when using fast animation
    const fadeDelay = shouldUseFastAnimation ? 400 : 800;
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
          // In advanced mode, earth-only rods animate sequentially (deliberate pace)
          if (advancedMode && rodBeads.length > 0) {
            setEarthBeadsPhase(true);
          }
          setPhase('BEADS_FLYING');
        }
      } else {
        setPhase('VERIFYING_DIGITS');
      }
    }, fadeDelay);
    fadeTimerRef.current = timer1;

    // No cleanup here - timer is managed by deactivation effect
    // This allows the effect to re-run when sorobanRect becomes available
    // without canceling an in-progress timer
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActive, sorobanRect, rodCount, advancedMode]);

  // Handle heaven bead split completion
  const handleSplitComplete = useCallback(() => {
    if (!currentSplitBeadPosition) return;

    // Line length scales proportionally with bead size (125 at beadSize 72)
    const mobileScale = sizeConfig?.mobileScale ?? 1;
    const beadSize = (sizeConfig?.beadSize ?? SIZES.large.beadSize) * mobileScale;
    const lineLength = beadSize * 1.74;
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

    // Prepend spread beads to existing earth beads
    const newRodBeads = [...spreadBeads, ...currentRodBeads];
    setCurrentRodBeads(newRodBeads);
    setAllBeadPositions(prev => [...spreadBeads, ...prev]);

    setTimeout(() => {
      setCurrentSplitBeadPosition(null);
      setCurrentBeadIndex(0);

      if (useFastAnimation) {
        // Train-style animation: launch only the 5 heaven beads first
        // Earth beads will animate sequentially after a pause
        setTrainBeadsFlying(new Set([0, 1, 2, 3, 4]));
        setHeavenBeadCount(5);
        setEarthBeadsPhase(false);
      } else if (advancedMode) {
        // Incorrect answer in advanced mode: use deliberate sequential animation
        // (same as kids mode but we set earthBeadsPhase for consistent slow pacing)
        setEarthBeadsPhase(true);
      }

      setPhase('BEADS_FLYING');
    }, 200);
  }, [currentSplitBeadPosition, useFastAnimation, advancedMode, currentRodBeads, sizeConfig]);

  // Handle bead arriving at counter
  const handleBeadArrive = useCallback((rodIndex: number, _isHeavenBead: boolean = false, trainBeadIndex?: number) => {
    // Always increment by 1 (each bead = 1, even for split heaven beads)
    const newValue = counterValuesRef.current[rodIndex] + 1;
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

    // Handle train-style completion tracking
    if (trainBeadIndex !== undefined) {
      setTrainBeadsCompleted(prev => new Set([...prev, trainBeadIndex]));
    } else {
      setCurrentBeadIndex(prev => prev + 1);
    }
  }, [counterBoxPositions, onCounterIncrement]);

  // Check if all beads for current rod have been animated
  useEffect(() => {
    if (phase !== 'BEADS_FLYING') return;
    if (counterBoxPositions.size === 0) return;
    if (pausingBetweenRods) return; // Don't process during pause between rods
    if (processingRodCompletionRef.current) return; // Don't re-process during completion

    // Check if heaven beads train is complete (need to transition to earth beads)
    const isHeavenTrainComplete = trainBeadsFlying.size > 0 &&
      trainBeadsCompleted.size >= trainBeadsFlying.size &&
      heavenBeadCount > 0 &&
      !earthBeadsPhase &&
      currentRodBeads.length > heavenBeadCount;

    if (isHeavenTrainComplete) {
      // Heaven beads done, pause to show the "5" then start earth beads sequentially
      setTrainBeadsFlying(new Set());
      setTrainBeadsCompleted(new Set());
      setPausingAfterHeavenTrain(true); // Prevent fan flash during pause
      // Brief pause to let user see the 5 before earth beads start
      setTimeout(() => {
        setPausingAfterHeavenTrain(false);
        setEarthBeadsPhase(true);
        // Start from after the heaven beads
        setCurrentBeadIndex(heavenBeadCount);
      }, 300); // 300ms pause to see the 5
      return;
    }

    // Determine if current rod animation is complete
    const isTrainComplete = trainBeadsFlying.size > 0 && trainBeadsCompleted.size >= trainBeadsFlying.size;
    const isEarthBeadsComplete = earthBeadsPhase && currentBeadIndex >= currentRodBeads.length;
    const isRegularComplete = trainBeadsFlying.size === 0 && !earthBeadsPhase && currentBeadIndex >= currentRodBeads.length;

    if (isTrainComplete || isEarthBeadsComplete || isRegularComplete) {
      processingRodCompletionRef.current = true; // Prevent re-runs during transition
      const currentIdx = rodsToAnimate.indexOf(currentAnimatingRodIndex);
      const nextIdx = currentIdx + 1;

      // Reset train state for next rod and clear current beads to prevent flash
      setTrainBeadsFlying(new Set());
      setTrainBeadsCompleted(new Set());
      setHeavenBeadCount(0);
      setEarthBeadsPhase(false);
      setPausingAfterHeavenTrain(false);
      setCurrentRodBeads([]); // Clear beads immediately to prevent flash

      if (nextIdx < rodsToAnimate.length) {
        // Small pause between rods to observe the count
        setPausingBetweenRods(true);
        const pauseDuration = useFastAnimation ? 250 : 400; // Shorter pause when fast animation

        setTimeout(() => {
          setPausingBetweenRods(false);
          processingRodCompletionRef.current = false; // Allow processing again
          const nextRod = rodsToAnimate[nextIdx];
          setCurrentAnimatingRodIndex(nextRod);

          const rodBeads = allBeadPositions.filter(b => b.rodIndex === nextRod);
          setCurrentRodBeads(rodBeads);
          setCurrentBeadIndex(0);

          const heavenBead = allHeavenBeadPositions.find(h => h.rodIndex === nextRod);
          if (heavenBead) {
            setCurrentSplitBeadPosition(heavenBead);
            setPhase('SPLITTING_HEAVEN');
          } else {
            // No heaven bead - go straight to flying
            // In advanced mode, earth beads animate sequentially
            if (advancedMode && rodBeads.length > 0) {
              setEarthBeadsPhase(true);
            }
            setPhase('BEADS_FLYING');
          }
        }, pauseDuration);
      } else {
        // All rods done - clear bead state to prevent flash, then go to verification
        setCurrentRodBeads([]);
        setAllBeadPositions([]);
        setAllHeavenBeadPositions([]);
        setCurrentAnimatingRodIndex(-1);
        // Faster transition to verification when using fast animation
        const delay = useFastAnimation ? 200 : 500;
        setTimeout(() => {
          processingRodCompletionRef.current = false;
          setPhase('VERIFYING_DIGITS');
        }, delay);
      }
    }
  }, [phase, currentBeadIndex, currentRodBeads.length, rodsToAnimate, currentAnimatingRodIndex, allBeadPositions, allHeavenBeadPositions, counterBoxPositions, trainBeadsFlying, trainBeadsCompleted, advancedMode, heavenBeadCount, earthBeadsPhase, currentRodBeads, pausingBetweenRods, useFastAnimation]);

  // Track if verification has started to prevent re-running
  const verificationStartedRef = useRef(false);
  // Track if we're in the middle of processing rod completion to prevent re-runs
  const processingRodCompletionRef = useRef(false);

  // Handle digit verification
  useEffect(() => {
    if (phase !== 'VERIFYING_DIGITS') {
      verificationStartedRef.current = false;
      return;
    }
    if (verificationStartedRef.current) return;
    verificationStartedRef.current = true;

    // Track verification state locally during async verification
    const localVerificationState = new Map<number, 'pending' | 'sliding' | 'matched' | 'mismatched'>();

    const verifyNextDigit = async (rodIndex: number): Promise<boolean> => {
      const counterDigit = counterValuesRef.current[rodIndex] ?? 0;
      const targetDigit = getDigitForRod(targetValue, rodIndex);

      // Update sliding state
      localVerificationState.set(rodIndex, 'sliding');
      const slidingState = new Map(localVerificationState);
      setVerificationState(slidingState);
      // Call parent callback after a microtask to avoid setState during render
      setTimeout(() => onDigitVerificationStateChange(slidingState), 0);

      // Faster slide animation when using fast animation
      await new Promise(resolve => setTimeout(resolve, useFastAnimation ? 200 : 400));

      const isMatch = counterDigit === targetDigit;
      // Update result state
      localVerificationState.set(rodIndex, isMatch ? 'matched' : 'mismatched');
      const resultState = new Map(localVerificationState);
      setVerificationState(resultState);
      // Call parent callback after a microtask to avoid setState during render
      setTimeout(() => onDigitVerificationStateChange(resultState), 0);

      // Faster pause after match/mismatch when using fast animation
      await new Promise(resolve => setTimeout(resolve, useFastAnimation ? (isMatch ? 250 : 200) : (isMatch ? 500 : 300)));
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
  }, [phase, rodCount, targetValue, onDigitVerificationStateChange, useFastAnimation]);

  // Handle showing result
  useEffect(() => {
    if (phase !== 'SHOWING_RESULT' || isCorrect === null) return;

    if (!hasCompletedRef.current) {
      hasCompletedRef.current = true;
      // Faster result display when using fast animation
      const correctDelay = useFastAnimation ? 800 : 1500;
      const incorrectDelay = useFastAnimation ? 1500 : 2500;
      setTimeout(() => {
        setPhase('COMPLETE');
        onComplete(isCorrect);
      }, isCorrect ? correctDelay : incorrectDelay);
    }
  }, [phase, isCorrect, onComplete, useFastAnimation]);

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
      {(phase === 'SPLITTING_HEAVEN' || phase === 'BEADS_FLYING') && currentAnimatingRodIndex >= 0 && allBeadPositions
        .filter(bead => {
          // Only show beads from rods that haven't started animating yet
          const rodIdx = rodsToAnimate.indexOf(bead.rodIndex);
          const currentRodIdx = rodsToAnimate.indexOf(currentAnimatingRodIndex);
          // Never show beads from the currently animating rod in this section
          if (bead.rodIndex === currentAnimatingRodIndex) {
            return false;
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
            isHeaven={bead.isFromHeaven}
            beadSize={beadSize}
            isStatic={true}
          />
        ))}

      {/* Static heaven beads for rods not yet animated (non-advanced mode only) */}
      {(phase === 'SPLITTING_HEAVEN' || phase === 'BEADS_FLYING') && currentAnimatingRodIndex >= 0 && allHeavenBeadPositions
        .filter(pos => {
          // Never show the currently animating rod's heaven bead here
          if (pos.rodIndex === currentAnimatingRodIndex) {
            return false;
          }
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

      {/* Static beads from current rod that haven't flown yet (non-train mode only) */}
      {phase === 'BEADS_FLYING' && trainBeadsFlying.size === 0 && !earthBeadsPhase && !pausingAfterHeavenTrain && !pausingBetweenRods && currentRodBeads
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

      {/* Static earth beads that haven't flown yet during earth phase */}
      {phase === 'BEADS_FLYING' && earthBeadsPhase && trainBeadsFlying.size === 0 && !pausingBetweenRods && currentRodBeads
        .filter((_, index) => index > currentBeadIndex)
        .map((bead) => (
          <FeedbackBead
            key={`queued-earth-${bead.id}`}
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

      {/* Static earth beads waiting during heaven train animation */}
      {phase === 'BEADS_FLYING' && trainBeadsFlying.size > 0 && heavenBeadCount > 0 && !pausingBetweenRods && currentRodBeads
        .filter((_, index) => index >= heavenBeadCount)
        .map((bead) => (
          <FeedbackBead
            key={`waiting-earth-${bead.id}`}
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

      {/* Static earth beads waiting during pause after heaven train */}
      {phase === 'BEADS_FLYING' && pausingAfterHeavenTrain && heavenBeadCount > 0 && !pausingBetweenRods && currentRodBeads
        .filter((_, index) => index >= heavenBeadCount)
        .map((bead) => (
          <FeedbackBead
            key={`pausing-earth-${bead.id}`}
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

      {/* Static earth beads from current rod during heaven split */}
      {phase === 'SPLITTING_HEAVEN' && currentRodBeads.map((bead) => (
        <FeedbackBead
          key={`splitting-earth-${bead.id}`}
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

      {/* Flying beads - train-style for advanced mode */}
      {phase === 'BEADS_FLYING' && trainBeadsFlying.size > 0 && !pausingBetweenRods && currentRodBeads
        .filter((_, index) => trainBeadsFlying.has(index) && !trainBeadsCompleted.has(index))
        .map((bead) => {
          const beadIndex = currentRodBeads.indexOf(bead);
          const counterBox = counterBoxPositions.get(bead.rodIndex);
          if (!counterBox) return null;

          const targetX = counterBox.left + counterBox.width / 2;
          const targetY = counterBox.top + counterBox.height / 2;

          // Stagger the delays for train effect - faster for advanced mode
          const staggerDelay = beadIndex * 0.08; // 80ms between each bead

          return (
            <FeedbackBead
              key={`flying-train-${bead.id}`}
              startX={bead.x}
              startY={bead.y}
              endX={targetX}
              endY={targetY}
              delay={staggerDelay}
              duration={0.35} // Faster flight
              onArrive={() => handleBeadArrive(bead.rodIndex, bead.isFromHeaven, beadIndex)}
              isHeaven={false}
              beadSize={beadSize}
            />
          );
        })}

      {/* Flying beads - sequential for earth beads in advanced mode (after heaven train) */}
      {phase === 'BEADS_FLYING' && earthBeadsPhase && trainBeadsFlying.size === 0 && !pausingBetweenRods && currentRodBeads.map((bead, index) => {
        if (index !== currentBeadIndex) return null;

        const counterBox = counterBoxPositions.get(bead.rodIndex);
        if (!counterBox) return null;

        const targetX = counterBox.left + counterBox.width / 2;
        const targetY = counterBox.top + counterBox.height / 2;

        return (
          <FeedbackBead
            key={`flying-earth-${bead.id}`}
            startX={bead.x}
            startY={bead.y}
            endX={targetX}
            endY={targetY}
            delay={0.15} // Slightly slower, more deliberate
            duration={0.45} // Slightly slower flight
            onArrive={() => handleBeadArrive(bead.rodIndex, bead.isFromHeaven)}
            isHeaven={bead.isFromHeaven}
            beadSize={beadSize}
          />
        );
      })}

      {/* Flying beads - sequential for non-advanced mode */}
      {phase === 'BEADS_FLYING' && !earthBeadsPhase && !pausingAfterHeavenTrain && !pausingBetweenRods && trainBeadsFlying.size === 0 && currentRodBeads.map((bead, index) => {
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
