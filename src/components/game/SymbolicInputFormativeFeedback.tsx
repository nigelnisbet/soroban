import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SIZES, SizeConfig } from '../../models/types';
import {
  BeadPosition,
  RodBeadState,
  FlashPosition,
  calculateBeadPositions,
  sortBeadsForBurstAnimation,
  calculateBeadDelay,
  FeedbackBead,
  FeedbackFlash,
  ResultOverlay,
} from './feedback';

// Extended phase type to include SPLITTING_HEAVEN for sequential mode
type SymbolicInputPhase =
  | 'IDLE'
  | 'FADING_FRAME'
  | 'SPLITTING_HEAVEN'
  | 'BEADS_FLYING'
  | 'VERIFYING_DIGITS'
  | 'SHOWING_RESULT'
  | 'COMPLETE';

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
  advancedMode?: boolean;
  sizeConfig?: SizeConfig;
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
  advancedMode = false,
  sizeConfig,
}: SymbolicInputFormativeFeedbackProps) {
  const [phase, setPhase] = useState<SymbolicInputPhase>('IDLE');
  const [allBeadPositions, setAllBeadPositions] = useState<BeadPosition[]>([]);
  const [flashPositions, setFlashPositions] = useState<FlashPosition[]>([]);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [beadsLaunched, setBeadsLaunched] = useState(false);
  const [beadsArrived, setBeadsArrived] = useState<Set<string>>(new Set());
  // Pre-computed correctness - determines animation speed in advanced mode
  const [preComputedCorrect, setPreComputedCorrect] = useState<boolean | null>(null);

  // Sequential animation state (used when incorrect - same as Level 1)
  const [useSequentialAnimation, setUseSequentialAnimation] = useState(false);
  const [currentRodBeads, setCurrentRodBeads] = useState<BeadPosition[]>([]);
  const [currentAnimatingRodIndex, setCurrentAnimatingRodIndex] = useState<number>(-1);
  const [rodsToAnimate, setRodsToAnimate] = useState<number[]>([]);
  const [currentBeadIndex, setCurrentBeadIndex] = useState<number>(0);
  const [pausingBetweenRods, setPausingBetweenRods] = useState<boolean>(false);

  // Heaven bead splitting state (for sequential/incorrect mode)
  const [allHeavenBeadPositions, setAllHeavenBeadPositions] = useState<{x: number; y: number; rodIndex: number}[]>([]);
  const [currentSplitBeadPosition, setCurrentSplitBeadPosition] = useState<{x: number; y: number; rodIndex: number} | null>(null);
  // Track if we're in the "earth beads" phase after heaven fan completes
  const [earthBeadsPhase, setEarthBeadsPhase] = useState<boolean>(false);
  // Track how many heaven beads (5) were added from the split
  const [heavenBeadCount, setHeavenBeadCount] = useState<number>(0);
  // Train-style animation for heaven beads (rapid succession before earth beads)
  const [trainBeadsFlying, setTrainBeadsFlying] = useState<Set<number>>(new Set());
  const [trainBeadsCompleted, setTrainBeadsCompleted] = useState<Set<number>>(new Set());
  // Pause after heaven train completes before earth beads start
  const [pausingAfterHeavenTrain, setPausingAfterHeavenTrain] = useState<boolean>(false);

  const hasCompletedRef = useRef(false);

  // Determine if we should use fast animation
  // Fast only when: advanced mode AND answer is correct
  // Slow when: not advanced mode OR advanced mode with incorrect answer
  const useFastAnimation = advancedMode && preComputedCorrect === true;
  const animationStartedRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const counterValuesRef = useRef<number[]>(Array(rodCount).fill(0));
  const verificationStateRef = useRef<Map<number, 'pending' | 'sliding' | 'matched' | 'mismatched'>>(new Map());
  const processingRodCompletionRef = useRef(false);

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
      setPreComputedCorrect(null);
      setUseSequentialAnimation(false);
      setCurrentRodBeads([]);
      setCurrentAnimatingRodIndex(-1);
      setRodsToAnimate([]);
      setCurrentBeadIndex(0);
      setPausingBetweenRods(false);
      // Heaven bead state
      setAllHeavenBeadPositions([]);
      setCurrentSplitBeadPosition(null);
      setEarthBeadsPhase(false);
      setHeavenBeadCount(0);
      // Train animation state
      setTrainBeadsFlying(new Set());
      setTrainBeadsCompleted(new Set());
      setPausingAfterHeavenTrain(false);
      processingRodCompletionRef.current = false;
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

    // Pre-compute correctness by comparing inputValues to targetValue
    // In advanced mode: correct = fast animation, incorrect = slow/deliberate
    let isAnswerCorrect = false;
    if (advancedMode) {
      // Build user's answer from inputValues array
      let userValue = 0;
      let allDigitsEntered = true;
      for (let rodIdx = 0; rodIdx < rodCount; rodIdx++) {
        const digit = inputValues[rodIdx];
        if (digit === null || digit === undefined) {
          allDigitsEntered = false;
          break;
        }
        userValue += digit * Math.pow(10, rodIdx);
      }
      isAnswerCorrect = allDigitsEntered && userValue === targetValue;
      setPreComputedCorrect(isAnswerCorrect);
    }

    // Use fast animation only when: advanced mode AND correct
    const shouldUseFastAnimation = advancedMode && isAnswerCorrect;
    // Use sequential rod-by-rod animation when incorrect (like Level 1)
    const shouldUseSequential = advancedMode && !isAnswerCorrect;
    setUseSequentialAnimation(shouldUseSequential);

    // For sequential mode (incorrect), we need to calculate heaven bead positions separately
    // so they can be animated with the fan/split effect
    if (shouldUseSequential) {
      // Calculate positions manually to separate heaven beads from earth beads
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

      // Calculate rod positions from frame center for accuracy
      const frameCenter = sorobanRect.left + sorobanRect.width / 2;

      const earthBeads: BeadPosition[] = [];
      const heavenBeadsToSplit: {x: number; y: number; rodIndex: number}[] = [];

      for (let rodIdx = 0; rodIdx < rodCount; rodIdx++) {
        const rodState = rodStates.find(r => r.rodIndex === rodIdx);
        if (!rodState) continue;

        // Calculate rod center from frame center directly (symmetric offset)
        const offsetFromCenter = (rodCount / 2 - rodIdx - 0.5) * rodWidth;
        const rodCenterX = frameCenter + offsetFromCenter;

        // Track heaven beads separately for splitting animation
        if (rodState.heavenBeadActive) {
          heavenBeadsToSplit.push({
            x: rodCenterX,
            y: contentTop + heavenActiveY + heavenBeadHeight / 2,
            rodIndex: rodIdx,
          });
        }

        // Track earth beads
        for (let i = 0; i < rodState.earthBeadsActive; i++) {
          const positionY = earthSectionStart + beadSpacing + i * (beadHeight + stackSpacing);
          earthBeads.push({
            id: `rod${rodIdx}-earth-${i}`,
            x: rodCenterX,
            y: contentTop + positionY + beadHeight / 2,
            isFromHeaven: false,
            rodIndex: rodIdx,
          });
        }
      }

      setAllHeavenBeadPositions(heavenBeadsToSplit);
      setAllBeadPositions(earthBeads);

      // Build rods to animate - include rods with either heaven or earth beads
      const rodsWithBeads = [...new Set([...earthBeads.map(b => b.rodIndex), ...heavenBeadsToSplit.map(h => h.rodIndex)])].sort((a, b) => b - a);
      setRodsToAnimate(rodsWithBeads);
    } else {
      // Fast/burst mode - use the standard calculation (heaven beads count as one bead worth 5)
      const beads = calculateBeadPositions(rodStates, sorobanRect, rodCount, sizeConfig);
      setAllBeadPositions(beads);
    }

    // Start animation
    setPhase('FADING_FRAME');

    // Much slower fade when incorrect
    const fadeDelay = shouldUseFastAnimation ? 400 : 800;
    timerRef.current = setTimeout(() => {
      if (shouldUseSequential) {
        // Sequential mode with heaven bead splitting
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

        // Calculate rod positions from frame center for accuracy
        const frameCenter = sorobanRect.left + sorobanRect.width / 2;

        // Re-calculate to get fresh data for first rod
        const earthBeads: BeadPosition[] = [];
        const heavenBeadsToSplit: {x: number; y: number; rodIndex: number}[] = [];

        for (let rodIdx = 0; rodIdx < rodCount; rodIdx++) {
          const rodState = rodStates.find(r => r.rodIndex === rodIdx);
          if (!rodState) continue;

          // Calculate rod center from frame center directly (symmetric offset)
          const offsetFromCenter = (rodCount / 2 - rodIdx - 0.5) * rodWidth;
          const rodCenterX = frameCenter + offsetFromCenter;

          if (rodState.heavenBeadActive) {
            heavenBeadsToSplit.push({
              x: rodCenterX,
              y: contentTop + heavenActiveY + heavenBeadHeight / 2,
              rodIndex: rodIdx,
            });
          }

          for (let i = 0; i < rodState.earthBeadsActive; i++) {
            const positionY = earthSectionStart + beadSpacing + i * (beadHeight + stackSpacing);
            earthBeads.push({
              id: `rod${rodIdx}-earth-${i}`,
              x: rodCenterX,
              y: contentTop + positionY + beadHeight / 2,
              isFromHeaven: false,
              rodIndex: rodIdx,
            });
          }
        }

        const rodsWithBeads = [...new Set([...earthBeads.map(b => b.rodIndex), ...heavenBeadsToSplit.map(h => h.rodIndex)])].sort((a, b) => b - a);

        if (rodsWithBeads.length > 0) {
          const firstRod = rodsWithBeads[0];
          setCurrentAnimatingRodIndex(firstRod);

          const rodEarthBeads = earthBeads.filter(b => b.rodIndex === firstRod);
          setCurrentRodBeads(rodEarthBeads);
          setCurrentBeadIndex(0);

          // Check if first rod has a heaven bead
          const heavenBead = heavenBeadsToSplit.find(h => h.rodIndex === firstRod);
          if (heavenBead) {
            setCurrentSplitBeadPosition(heavenBead);
            setPhase('SPLITTING_HEAVEN');
          } else {
            // No heaven bead on first rod - go straight to flying earth beads
            setEarthBeadsPhase(true);
            setPhase('BEADS_FLYING');
          }
        } else {
          setPhase('VERIFYING_DIGITS');
        }
      } else {
        // Fast/burst mode
        const beads = calculateBeadPositions(rodStates, sorobanRect, rodCount, sizeConfig);
        if (beads.length > 0) {
          setBeadsLaunched(true);
          setPhase('BEADS_FLYING');
        } else {
          setPhase('VERIFYING_DIGITS');
        }
      }
    }, fadeDelay);
  }, [isActive, sorobanRect, rodCount, rodStates, counterBoxPositions, advancedMode, inputValues, targetValue]);

  // Handle bead arriving at counter (for burst mode)
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

  // Handle heaven bead split completion (for sequential/incorrect mode)
  const handleSplitComplete = useCallback(() => {
    if (!currentSplitBeadPosition) return;

    // Line length scales proportionally with bead size (125 at beadSize 72)
    const mobileScale = sizeConfig?.mobileScale ?? 1;
    const beadSize = (sizeConfig?.beadSize ?? SIZES.large.beadSize) * mobileScale;
    const lineLength = beadSize * 1.74;
    const angles = [-60, -30, 0, 30, 60];
    const heavenBead = currentSplitBeadPosition;

    // Create 5 spread beads from the heaven bead split
    const spreadBeads: BeadPosition[] = [];
    for (let i = 0; i < 5; i++) {
      const angleRad = (angles[i] * Math.PI) / 180;
      const endX = Math.sin(angleRad) * lineLength;
      const endY = -Math.cos(angleRad) * lineLength;
      spreadBeads.push({
        id: `rod${heavenBead.rodIndex}-heaven-${i}`,
        x: heavenBead.x + endX,
        y: heavenBead.y + endY,
        isFromHeaven: false, // They're now individual beads worth 1 each
        rodIndex: heavenBead.rodIndex,
      });
    }

    // Prepend spread beads to existing earth beads for this rod
    const newRodBeads = [...spreadBeads, ...currentRodBeads];
    setCurrentRodBeads(newRodBeads);
    setAllBeadPositions(prev => [...spreadBeads, ...prev]);
    setHeavenBeadCount(5);

    setTimeout(() => {
      setCurrentSplitBeadPosition(null);
      setCurrentBeadIndex(0);
      // Launch train-style animation for the 5 heaven beads (rapid succession)
      // Earth beads will animate sequentially after train completes
      setTrainBeadsFlying(new Set([0, 1, 2, 3, 4]));
      setEarthBeadsPhase(false); // Not yet - wait for train to complete
      setPhase('BEADS_FLYING');
    }, 200);
  }, [currentSplitBeadPosition, currentRodBeads, sizeConfig]);

  // Handle sequential bead arriving (for rod-by-rod mode when incorrect)
  const handleSequentialBeadArrive = useCallback((rodIndex: number) => {
    const newValue = counterValuesRef.current[rodIndex] + 1;
    counterValuesRef.current[rodIndex] = newValue;
    onCounterIncrement(rodIndex, newValue);

    const counterBox = counterBoxPositions.get(rodIndex);
    if (counterBox) {
      setFlashPositions(prev => [...prev, {
        x: counterBox.left + counterBox.width / 2,
        y: counterBox.top + counterBox.height / 2,
        delay: 0,
      }]);
    }

    // Advance to next bead
    setCurrentBeadIndex(prev => prev + 1);
  }, [counterBoxPositions, onCounterIncrement]);

  // Handle train bead arriving (for heaven beads in rapid succession)
  const handleTrainBeadArrive = useCallback((rodIndex: number, trainBeadIndex: number) => {
    const newValue = counterValuesRef.current[rodIndex] + 1;
    counterValuesRef.current[rodIndex] = newValue;
    onCounterIncrement(rodIndex, newValue);

    const counterBox = counterBoxPositions.get(rodIndex);
    if (counterBox) {
      setFlashPositions(prev => [...prev, {
        x: counterBox.left + counterBox.width / 2,
        y: counterBox.top + counterBox.height / 2,
        delay: 0,
      }]);
    }

    // Mark this train bead as completed
    setTrainBeadsCompleted(prev => new Set([...prev, trainBeadIndex]));
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

      // Faster slide animation when using fast animation
      await new Promise(resolve => setTimeout(resolve, useFastAnimation ? 200 : 400));

      const isMatch = counterDigit === userDigit;

      verificationStateRef.current.set(rodIdx, isMatch ? 'matched' : 'mismatched');
      onDigitVerificationStateChange(new Map(verificationStateRef.current));

      // Faster pause after match/mismatch when using fast animation
      await new Promise(resolve => setTimeout(resolve, useFastAnimation ? (isMatch ? 250 : 200) : (isMatch ? 500 : 300)));

      if (!isMatch) {
        setIsCorrect(false);
        setPhase('SHOWING_RESULT');
        return;
      }
    }

    setIsCorrect(true);
    setPhase('SHOWING_RESULT');
  }, [rodCount, inputValues, onDigitVerificationStateChange, useFastAnimation]);

  // Check if heaven train is complete - transition to earth beads
  useEffect(() => {
    if (!useSequentialAnimation) return;
    if (phase !== 'BEADS_FLYING') return;
    if (trainBeadsFlying.size === 0) return;
    if (trainBeadsCompleted.size < trainBeadsFlying.size) return;
    if (pausingAfterHeavenTrain) return;

    // Heaven train complete - pause briefly then start earth beads
    setTrainBeadsFlying(new Set());
    setTrainBeadsCompleted(new Set());
    setPausingAfterHeavenTrain(true);

    setTimeout(() => {
      setPausingAfterHeavenTrain(false);
      setEarthBeadsPhase(true);
      // Start from after the heaven beads (index 5)
      setCurrentBeadIndex(heavenBeadCount);
    }, 300); // Brief pause to see the "5" before earth beads
  }, [useSequentialAnimation, phase, trainBeadsFlying.size, trainBeadsCompleted.size, heavenBeadCount, pausingAfterHeavenTrain]);

  // Check if current rod is complete in sequential mode (earth beads done)
  useEffect(() => {
    if (!useSequentialAnimation) return;
    if (phase !== 'BEADS_FLYING') return;
    if (pausingBetweenRods) return;
    if (pausingAfterHeavenTrain) return;
    if (trainBeadsFlying.size > 0) return; // Still doing train animation
    if (processingRodCompletionRef.current) return;
    if (!earthBeadsPhase && heavenBeadCount > 0) return; // Wait for earth phase if there was a heaven bead
    if (currentBeadIndex < currentRodBeads.length) return;
    if (currentRodBeads.length === 0) return;

    processingRodCompletionRef.current = true;

    const currentIdx = rodsToAnimate.indexOf(currentAnimatingRodIndex);
    const nextIdx = currentIdx + 1;

    // Reset state for next rod
    setCurrentRodBeads([]);
    setHeavenBeadCount(0);
    setEarthBeadsPhase(false);
    setTrainBeadsFlying(new Set());
    setTrainBeadsCompleted(new Set());

    if (nextIdx < rodsToAnimate.length) {
      setPausingBetweenRods(true);
      setTimeout(() => {
        setPausingBetweenRods(false);
        processingRodCompletionRef.current = false;
        const nextRod = rodsToAnimate[nextIdx];
        setCurrentAnimatingRodIndex(nextRod);

        // Get earth beads for this rod
        const rodBeads = allBeadPositions.filter(b => b.rodIndex === nextRod);
        setCurrentRodBeads(rodBeads);
        setCurrentBeadIndex(0);

        // Check if next rod has a heaven bead - if so, start splitting
        const heavenBead = allHeavenBeadPositions.find(h => h.rodIndex === nextRod);
        if (heavenBead) {
          setCurrentSplitBeadPosition(heavenBead);
          setPhase('SPLITTING_HEAVEN');
        } else {
          // No heaven bead - go straight to flying earth beads
          setEarthBeadsPhase(true);
          setPhase('BEADS_FLYING');
        }
      }, 400);
    } else {
      // All rods done
      setTimeout(() => {
        processingRodCompletionRef.current = false;
        runVerification();
      }, 500);
    }
  }, [useSequentialAnimation, phase, currentBeadIndex, currentRodBeads.length, rodsToAnimate, currentAnimatingRodIndex, allBeadPositions, allHeavenBeadPositions, pausingBetweenRods, runVerification]);

  // Check if all beads have arrived - then start verification (burst mode only)
  useEffect(() => {
    if (phase !== 'BEADS_FLYING') return;
    if (!beadsLaunched) return;
    if (allBeadPositions.length === 0) return;

    // Only trigger verification from here in burst mode (sequential mode handles it separately)
    if (!useSequentialAnimation && beadsArrived.size >= allBeadPositions.length) {
      setTimeout(() => {
        runVerification();
      }, 200);
    }
  }, [phase, beadsLaunched, beadsArrived.size, allBeadPositions.length, runVerification, useSequentialAnimation]);

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

  // Sort beads for animation (must be before early return for consistent hook order)
  const sortedBeads = useMemo(() => sortBeadsForBurstAnimation(allBeadPositions), [allBeadPositions]);

  // Calculate delay for a specific bead
  // Use slower timing when incorrect (more deliberate animation to help understand)
  const getBeadDelay = useCallback(
    (bead: BeadPosition) => {
      const baseDelay = useFastAnimation ? 100 : 150;
      const stagger = useFastAnimation ? 30 : 50;
      return calculateBeadDelay(bead, sortedBeads, baseDelay, stagger);
    },
    [sortedBeads, useFastAnimation]
  );

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

      {/* Static heaven beads during fade phase (sequential mode) */}
      {phase === 'FADING_FRAME' && useSequentialAnimation && allHeavenBeadPositions.map((pos, i) => (
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

      {/* Static heaven beads for rods not yet animated (sequential mode) */}
      {(phase === 'SPLITTING_HEAVEN' || phase === 'BEADS_FLYING') && useSequentialAnimation && currentAnimatingRodIndex >= 0 && allHeavenBeadPositions
        .filter(pos => {
          if (pos.rodIndex === currentAnimatingRodIndex) return false;
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

      {/* Static earth beads during heaven split */}
      {phase === 'SPLITTING_HEAVEN' && useSequentialAnimation && currentRodBeads.map((bead) => (
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

      {/* Static earth beads for rods not yet animated during SPLITTING_HEAVEN */}
      {phase === 'SPLITTING_HEAVEN' && useSequentialAnimation && currentAnimatingRodIndex >= 0 && allBeadPositions
        .filter(bead => {
          if (bead.rodIndex === currentAnimatingRodIndex) return false;
          const rodIdx = rodsToAnimate.indexOf(bead.rodIndex);
          const currentRodIdx = rodsToAnimate.indexOf(currentAnimatingRodIndex);
          return rodIdx > currentRodIdx;
        })
        .map((bead) => (
          <FeedbackBead
            key={`waiting-split-${bead.id}`}
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
      {phase === 'SPLITTING_HEAVEN' && useSequentialAnimation && currentSplitBeadPosition && (
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

      {/* Static beads for rods not yet animated (sequential mode) */}
      {phase === 'BEADS_FLYING' && useSequentialAnimation && currentAnimatingRodIndex >= 0 && allBeadPositions
        .filter(bead => {
          if (bead.rodIndex === currentAnimatingRodIndex) return false;
          const rodIdx = rodsToAnimate.indexOf(bead.rodIndex);
          const currentRodIdx = rodsToAnimate.indexOf(currentAnimatingRodIndex);
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

      {/* Static earth beads waiting during heaven train animation */}
      {phase === 'BEADS_FLYING' && useSequentialAnimation && trainBeadsFlying.size > 0 && heavenBeadCount > 0 && !pausingBetweenRods && currentRodBeads
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

      {/* Static earth beads during pause after heaven train */}
      {phase === 'BEADS_FLYING' && useSequentialAnimation && pausingAfterHeavenTrain && heavenBeadCount > 0 && !pausingBetweenRods && currentRodBeads
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

      {/* Static beads from current rod that haven't flown yet (earth beads phase) */}
      {phase === 'BEADS_FLYING' && useSequentialAnimation && earthBeadsPhase && !pausingBetweenRods && trainBeadsFlying.size === 0 && currentRodBeads
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

      {/* Flying beads - train-style for heaven beads (rapid succession) */}
      {phase === 'BEADS_FLYING' && useSequentialAnimation && trainBeadsFlying.size > 0 && !pausingBetweenRods && currentRodBeads
        .filter((_, index) => trainBeadsFlying.has(index) && !trainBeadsCompleted.has(index))
        .map((bead) => {
          const beadIndex = currentRodBeads.indexOf(bead);
          const counterBox = counterBoxPositions.get(bead.rodIndex);
          if (!counterBox) return null;

          const targetX = counterBox.left + counterBox.width / 2;
          const targetY = counterBox.top + counterBox.height / 2;

          // Stagger the delays for train effect
          const staggerDelay = beadIndex * 0.08; // 80ms between each bead

          return (
            <FeedbackBead
              key={`flying-train-${bead.id}`}
              startX={bead.x}
              startY={bead.y}
              endX={targetX}
              endY={targetY}
              delay={staggerDelay}
              duration={0.35} // Fast flight
              onArrive={() => handleTrainBeadArrive(bead.rodIndex, beadIndex)}
              isHeaven={false}
              beadSize={beadSize}
            />
          );
        })}

      {/* Flying bead - sequential mode for earth beads (one at a time, deliberate) */}
      {phase === 'BEADS_FLYING' && useSequentialAnimation && earthBeadsPhase && trainBeadsFlying.size === 0 && !pausingBetweenRods && currentRodBeads.map((bead, index) => {
        if (index !== currentBeadIndex) return null;

        const counterBox = counterBoxPositions.get(bead.rodIndex);
        if (!counterBox) return null;

        const targetX = counterBox.left + counterBox.width / 2;
        const targetY = counterBox.top + counterBox.height / 2;

        return (
          <FeedbackBead
            key={`flying-seq-${bead.id}`}
            startX={bead.x}
            startY={bead.y}
            endX={targetX}
            endY={targetY}
            delay={0.15}
            duration={0.45}
            onArrive={() => handleSequentialBeadArrive(bead.rodIndex)}
            isHeaven={bead.isFromHeaven}
            beadSize={beadSize}
          />
        );
      })}

      {/* Flying beads - burst mode with left-to-right progression (fast/correct mode) */}
      {phase === 'BEADS_FLYING' && !useSequentialAnimation && beadsLaunched && sortedBeads.map((bead) => {
        if (beadsArrived.has(bead.id)) return null;

        const counterBox = counterBoxPositions.get(bead.rodIndex);
        if (!counterBox) return null;

        const targetX = counterBox.left + counterBox.width / 2;
        const targetY = counterBox.top + counterBox.height / 2;
        const delay = getBeadDelay(bead);

        const flightDuration = 0.25;

        return (
          <FeedbackBead
            key={`flying-${bead.id}`}
            startX={bead.x}
            startY={bead.y}
            endX={targetX}
            endY={targetY}
            delay={delay}
            duration={flightDuration}
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
