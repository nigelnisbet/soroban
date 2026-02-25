import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { VisualObject, RodState, SIZES, DisplayMode } from '../../models/types';
import { getTenFrameDotPositions, getOnesDotPositions, getTensFramePositions, getPartialFramePosition, getFrameLayoutParams } from './TenFrameDisplay';

// Types for animation state
// Animation now processes rods sequentially: tens rod first (split + match), then ones rod (split + match)
type AnimationPhase =
  | 'IDLE'
  | 'FADING_FRAME'      // Soroban frame fades, beads remain
  | 'SPLITTING_HEAVEN'  // Heaven bead splits into 5 (for current rod)
  | 'MATCHING'          // Beads fly to targets one by one (for current rod)
  | 'SHOWING_RESULT'    // Success or failure display
  | 'COMPLETE';

interface BeadPosition {
  id: string;
  x: number;
  y: number;
  isFromHeaven: boolean;
  rodIndex: number; // Which rod this bead is from (0 = ones, 1 = tens, etc.)
  beadValue: number; // How many dots this bead represents (1 for ones, 10 for tens, etc.)
}

// Rod state for multi-rod support
interface RodBeadState {
  rodIndex: number;
  heavenBeadActive: boolean;
  earthBeadsActive: number;
}

interface FormativeFeedbackProps {
  isActive: boolean;
  objects: VisualObject[];
  sorobanValue: number;
  heavenBeadActive: boolean;
  earthBeadsActive: number;
  sorobanRect: DOMRect | null;       // Position of soroban on screen
  problemDisplayRect: DOMRect | null; // Position of problem display
  onComplete: (isCorrect: boolean) => void;
  onAllTargetsMatched?: () => void; // Called when all targets matched (to hide frames)
  // For ten frames mode
  displayMode?: DisplayMode;
  targetValue?: number; // The number being displayed (for ten frames)
  maxValue?: number; // Max value in level (determines ten frame layout)
  // Multi-rod support
  rodCount?: number;
  rodStates?: RodBeadState[]; // State of each rod (for multi-rod animation)
}

// SVG components for visual objects (copied from ProblemDisplay for animation)
function ObjectIcon({ type, size = 48 }: { type: VisualObject['type']; size?: number }) {
  const iconProps = {
    width: size,
    height: size,
    viewBox: '0 0 48 48',
  };

  switch (type) {
    case 'apple':
      return (
        <svg {...iconProps}>
          <circle cx="24" cy="26" r="18" fill="#E53935" />
          <ellipse cx="24" cy="26" rx="16" ry="14" fill="#EF5350" />
          <path d="M24 8 L26 14 Q28 10 26 6 Z" fill="#4CAF50" />
          <path d="M22 10 Q18 8 20 4" stroke="#8B4513" strokeWidth="2" fill="none" />
          <ellipse cx="18" cy="22" rx="4" ry="6" fill="rgba(255,255,255,0.3)" />
        </svg>
      );

    case 'star':
      return (
        <svg {...iconProps}>
          <path
            d="M24 4 L28 18 L44 18 L31 28 L36 44 L24 34 L12 44 L17 28 L4 18 L20 18 Z"
            fill="#FFD700"
            stroke="#FFA000"
            strokeWidth="1"
          />
          <path
            d="M24 8 L27 18 L38 18 L29 26 L33 38 L24 30 L15 38 L19 26 L10 18 L21 18 Z"
            fill="#FFEB3B"
          />
        </svg>
      );

    case 'butterfly':
      return (
        <svg {...iconProps}>
          <ellipse cx="16" cy="20" rx="12" ry="14" fill="#9C27B0" />
          <ellipse cx="32" cy="20" rx="12" ry="14" fill="#9C27B0" />
          <ellipse cx="16" cy="34" rx="8" ry="10" fill="#E91E63" />
          <ellipse cx="32" cy="34" rx="8" ry="10" fill="#E91E63" />
          <ellipse cx="24" cy="26" rx="3" ry="16" fill="#3E2723" />
          <circle cx="12" cy="16" r="3" fill="#FFD700" />
          <circle cx="36" cy="16" r="3" fill="#FFD700" />
          <path d="M22 10 Q24 4 26 10" stroke="#3E2723" strokeWidth="2" fill="none" />
          <circle cx="22" cy="6" r="2" fill="#3E2723" />
          <circle cx="26" cy="6" r="2" fill="#3E2723" />
        </svg>
      );

    case 'fish':
      return (
        <svg {...iconProps}>
          <ellipse cx="22" cy="24" rx="18" ry="12" fill="#2196F3" />
          <polygon points="40,24 48,16 48,32" fill="#2196F3" />
          <ellipse cx="22" cy="24" rx="14" ry="9" fill="#64B5F6" />
          <circle cx="12" cy="22" r="4" fill="white" />
          <circle cx="12" cy="22" r="2" fill="#1A237E" />
          <path d="M18 20 Q22 18 26 20" stroke="#1565C0" strokeWidth="1" fill="none" />
          <ellipse cx="30" cy="24" rx="2" ry="4" fill="#1565C0" opacity="0.3" />
        </svg>
      );

    case 'flower':
      return (
        <svg {...iconProps}>
          <ellipse cx="24" cy="12" rx="8" ry="10" fill="#E91E63" />
          <ellipse cx="36" cy="20" rx="8" ry="10" fill="#E91E63" transform="rotate(72, 36, 20)" />
          <ellipse cx="32" cy="34" rx="8" ry="10" fill="#E91E63" transform="rotate(144, 32, 34)" />
          <ellipse cx="16" cy="34" rx="8" ry="10" fill="#E91E63" transform="rotate(216, 16, 34)" />
          <ellipse cx="12" cy="20" rx="8" ry="10" fill="#E91E63" transform="rotate(288, 12, 20)" />
          <circle cx="24" cy="24" r="8" fill="#FFC107" />
          <circle cx="22" cy="22" r="2" fill="#FF8F00" />
          <circle cx="26" cy="22" r="2" fill="#FF8F00" />
          <circle cx="24" cy="26" r="2" fill="#FF8F00" />
        </svg>
      );

    case 'ball':
      return (
        <svg {...iconProps}>
          <circle cx="24" cy="24" r="20" fill="#F44336" />
          <circle cx="24" cy="24" r="16" fill="#EF5350" />
          <ellipse cx="18" cy="18" rx="6" ry="8" fill="rgba(255,255,255,0.4)" transform="rotate(-30, 18, 18)" />
          <path d="M8 24 Q24 18 40 24" stroke="white" strokeWidth="3" fill="none" opacity="0.6" />
        </svg>
      );

    default:
      return (
        <svg {...iconProps}>
          <circle cx="24" cy="24" r="20" fill="#9E9E9E" />
        </svg>
      );
  }
}

// Ghost bead that looks identical to real bead and flies to match an object
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
        scale: [1, 1.1, 1],
      }}
      transition={isStatic ? { duration: 0 } : {
        duration: 0.5,
        delay,
        ease: [0.25, 0.46, 0.45, 0.94], // Smooth ease out
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

// Green flash effect when bead matches object
function MatchFlash({ x, y, delay }: { x: number; y: number; delay: number }) {
  const size = 80;
  return (
    <motion.div
      style={{
        position: 'fixed',
        left: x,
        top: y,
        width: size,
        height: size,
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(76, 175, 80, 0.8) 0%, transparent 70%)',
        // Use margins instead of transform (transform conflicts with Framer Motion)
        marginLeft: -size / 2,
        marginTop: -size / 2,
        zIndex: 999,
        pointerEvents: 'none',
      }}
      initial={{ scale: 0, opacity: 1 }}
      animate={{ scale: 2, opacity: 0 }}
      transition={{ duration: 0.5, delay }}
    />
  );
}

// Red glow for unmatched items
function UnmatchedGlow({ x, y, isObject }: { x: number; y: number; isObject: boolean }) {
  const width = isObject ? 60 : 44;
  const height = isObject ? 60 : 32;
  return (
    <motion.div
      style={{
        position: 'fixed',
        left: x,
        top: y,
        width,
        height,
        borderRadius: isObject ? '50%' : 16,
        background: 'transparent',
        // Use margins instead of transform (transform conflicts with Framer Motion)
        marginLeft: -width / 2,
        marginTop: -height / 2,
        zIndex: 998,
        pointerEvents: 'none',
        boxShadow: '0 0 20px 10px rgba(244, 67, 54, 0.6)',
      }}
      initial={{ opacity: 0 }}
      animate={{ opacity: [0, 1, 1, 0.7, 1] }}
      transition={{ duration: 1.5, repeat: 2 }}
    />
  );
}

// Floating bead from split heaven bead
function SplitBead({
  index,
  originX,
  originY,
  targetX,
  targetY,
  onSplitComplete,
}: {
  index: number;
  originX: number;
  originY: number;
  targetX: number;
  targetY: number;
  onSplitComplete?: () => void;
}) {
  // Fan out animation
  const angle = (index - 2) * 20; // -40, -20, 0, 20, 40 degrees
  const spreadX = Math.sin(angle * Math.PI / 180) * 60;
  const spreadY = -30;

  return (
    <motion.div
      style={{
        position: 'fixed',
        left: originX,
        top: originY,
        width: 40,
        height: 28,
        borderRadius: 14,
        background: 'linear-gradient(180deg, #D4A574 0%, #C4956A 50%, #A67C52 100%)',
        boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
        zIndex: 1000,
        transform: 'translate(-50%, -50%)',
      }}
      initial={{ scale: 0.5, opacity: 0 }}
      animate={{
        x: [0, spreadX, targetX - originX],
        y: [0, spreadY, targetY - originY],
        scale: [0.5, 1, 1],
        opacity: [0, 1, 1],
      }}
      transition={{
        duration: 0.8,
        delay: index * 0.1,
        times: [0, 0.4, 1],
        ease: 'easeOut',
      }}
      onAnimationComplete={index === 4 ? onSplitComplete : undefined}
    />
  );
}

export function FormativeFeedback({
  isActive,
  objects,
  sorobanValue,
  heavenBeadActive,
  earthBeadsActive,
  sorobanRect,
  problemDisplayRect,
  onComplete,
  onAllTargetsMatched,
  displayMode = 'objects',
  targetValue = 0,
  maxValue = 9,
  rodCount = 1,
  rodStates = [],
}: FormativeFeedbackProps) {
  const [phase, setPhase] = useState<AnimationPhase>('IDLE');
  const [matchedPairs, setMatchedPairs] = useState<number>(0);
  const [matchedObjectIndices, setMatchedObjectIndices] = useState<Set<number>>(new Set());
  const [matchedTensFrameIndices, setMatchedTensFrameIndices] = useState<Set<number>>(new Set()); // Track matched tens frames (by tens beads)
  const [matchedFullFrameDots, setMatchedFullFrameDots] = useState<Map<number, Set<number>>>(new Map()); // Track individual dots matched in full frames by ones beads
  const [allHeavenBeadPositions, setAllHeavenBeadPositions] = useState<{x: number; y: number; rodIndex: number}[]>([]); // All heaven beads
  const [currentSplitBeadPosition, setCurrentSplitBeadPosition] = useState<{x: number; y: number; rodIndex: number} | null>(null); // Current rod's heaven bead being split
  const [spawnedHeavenBeads, setSpawnedHeavenBeads] = useState<{x: number; y: number}[]>([]); // Beads spawned from heaven split
  const [allBeadPositions, setAllBeadPositions] = useState<BeadPosition[]>([]); // All beads from all rods
  const [currentRodBeads, setCurrentRodBeads] = useState<BeadPosition[]>([]); // Beads for current rod being animated
  const [objectPositions, setObjectPositions] = useState<{x: number; y: number; id: string; type: VisualObject['type']}[]>([]);
  const [tensFramePositions, setTensFramePositions] = useState<{x: number; y: number; id: string}[]>([]); // For tens beads
  const [onesDotPositions, setOnesDotPositions] = useState<{x: number; y: number; id: string}[]>([]); // For ones beads
  const [flashPositions, setFlashPositions] = useState<{x: number; y: number; delay: number}[]>([]);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const hasCompletedRef = useRef(false); // Guard against double-completion
  const allTargetsMatchedRef = useRef(false); // Synchronous check for all targets matched (avoids async state issues)
  const pendingMoveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null); // Track pending moveToNextRod timeout
  // Refs for synchronous tracking of matched items (state updates are async, refs are sync)
  const matchedObjectIndicesRef = useRef<Set<number>>(new Set()); // Ones dots matched in partial frame
  const matchedTensFrameIndicesRef = useRef<Set<number>>(new Set()); // Full frames matched by tens beads
  const matchedFullFrameDotsRef = useRef<Map<number, Set<number>>>(new Map()); // Individual dots in full frames matched by ones beads

  // Sequential rod animation: process rods from highest index (tens) to lowest (ones)
  const [currentAnimatingRodIndex, setCurrentAnimatingRodIndex] = useState<number>(-1); // -1 = not started
  const [currentRodMatchedCount, setCurrentRodMatchedCount] = useState<number>(0); // Beads matched in current rod
  const [rodsToAnimate, setRodsToAnimate] = useState<number[]>([]); // Rod indices to animate, in order
  const [completedRodIndices, setCompletedRodIndices] = useState<Set<number>>(new Set()); // Rods that have finished animating
  const [allTargetsMatched, setAllTargetsMatched] = useState<boolean>(false); // True when all dots/frames have been matched
  const [extraBeadPositions, setExtraBeadPositions] = useState<{x: number; y: number; id: string}[]>([]); // Extra beads that have arrived in blue area
  const [partialFrameInfo, setPartialFrameInfo] = useState<{x: number; y: number; dotsInFrame: number} | null>(null); // Partial frame position
  const [partialFrameMismatch, setPartialFrameMismatch] = useState<boolean>(false); // True when tens bead tries to match partial frame

  // Calculate total bead value from all rods
  const totalBeadValue = rodStates.reduce((sum, rod) => {
    const placeValue = Math.pow(10, rod.rodIndex);
    const rodValue = (rod.heavenBeadActive ? 5 : 0) + rod.earthBeadsActive;
    return sum + rodValue * placeValue;
  }, 0);

  // For animation purposes, we count "animation units":
  // - In objects mode: each bead is one unit matching one object
  // - In tenFrames mode with multi-rod: ones beads match dots, tens beads match frames
  // Count total beads across all rods for animation
  const totalBeads = rodStates.reduce((sum, rod) => {
    return sum + (rod.heavenBeadActive ? 5 : 0) + rod.earthBeadsActive;
  }, 0) || ((heavenBeadActive ? 5 : 0) + earthBeadsActive); // Fallback to single-rod props

  // For ten frames mode with multi-rod, target count is ones dots + tens frames
  // For objects mode, it's the number of objects
  const tens = Math.floor(targetValue / 10);
  const ones = targetValue % 10;
  const targetCount = displayMode === 'tenFrames' && rodCount > 1
    ? ones + tens  // ones beads match dots, tens beads match frames
    : displayMode === 'tenFrames'
      ? targetValue  // single-rod: each bead matches a dot
      : objects.length;

  // Track if animation has started (to prevent re-initialization)
  const animationStartedRef = useRef(false);

  // Calculate positions when activated
  useEffect(() => {
    if (!isActive || !sorobanRect || !problemDisplayRect) {
      setPhase('IDLE');
      animationStartedRef.current = false; // Reset when deactivated
      return;
    }

    // CRITICAL: Don't re-initialize if animation has already started
    // This prevents prop changes (like hideFrames) from resetting the animation
    if (animationStartedRef.current) {
      return;
    }
    animationStartedRef.current = true;

    // Calculate target positions (objects or dots)
    let objPositions: {x: number; y: number; id: string; type: VisualObject['type']}[];

    if (displayMode === 'tenFrames') {
      // For multi-rod ten frames mode, we need separate positions for ones dots and tens frames
      const onesDots = getOnesDotPositions(targetValue, maxValue, problemDisplayRect);
      const tensFrames = getTensFramePositions(targetValue, maxValue, problemDisplayRect);
      const partialFrame = getPartialFramePosition(targetValue, maxValue, problemDisplayRect);

      setOnesDotPositions(onesDots);
      setTensFramePositions(tensFrames);
      setPartialFrameInfo(partialFrame);

      // For single-rod, still use all dots as positions
      // For multi-rod, we'll handle tens/ones separately in the animation logic
      if (rodCount === 1) {
        const dotPositions = getTenFrameDotPositions(targetValue, maxValue, problemDisplayRect);
        objPositions = dotPositions.map(dot => ({
          x: dot.x,
          y: dot.y,
          id: dot.id,
          type: 'ball' as const,
        }));
      } else {
        // Multi-rod: combine ones dots and tens frames as animation targets
        // Ones beads will target onesDots, tens beads will target tensFrames
        objPositions = [
          ...onesDots.map(dot => ({
            x: dot.x,
            y: dot.y,
            id: dot.id,
            type: 'ball' as const,
          })),
          ...tensFrames.map(frame => ({
            x: frame.x,
            y: frame.y,
            id: frame.id,
            type: 'ball' as const,
          })),
        ];
      }
    } else {
      // Calculate object screen positions
      objPositions = objects.map(obj => ({
        x: problemDisplayRect.left + (obj.x / 100) * problemDisplayRect.width,
        y: problemDisplayRect.top + (obj.y / 100) * problemDisplayRect.height,
        id: obj.id,
        type: obj.type,
      }));
    }
    setObjectPositions(objPositions);
    setMatchedObjectIndices(new Set());
    setMatchedTensFrameIndices(new Set());
    setMatchedFullFrameDots(new Map());
    // Also reset the synchronous tracking refs
    matchedObjectIndicesRef.current = new Set();
    matchedTensFrameIndicesRef.current = new Set();
    matchedFullFrameDotsRef.current = new Map();

    // Calculate bead starting positions - MUST match SorobanRod.tsx exactly
    const beadSize = SIZES.large.beadSize;
    const beadSpacing = SIZES.large.beadSpacing;
    const framePadding = SIZES.large.framepadding;
    const rodWidth = SIZES.large.rodWidth;

    // These match SorobanRod.tsx calculations exactly
    const heavenSectionHeight = beadSize * 1.5 + beadSpacing * 2;
    const dividerHeight = 12;
    const earthSectionStart = heavenSectionHeight + dividerHeight;
    const beadHeight = beadSize * 0.7;
    const stackSpacing = beadSpacing * 0.5;
    const heavenBeadHeight = beadSize * 0.9;
    const heavenActiveY = heavenSectionHeight - heavenBeadHeight - beadSpacing;

    // Frame border and padding
    const borderWidth = 4;
    const contentTop = sorobanRect.top + borderWidth + framePadding;

    // Calculate frame width to find rod centers
    const totalRodWidth = rodCount * rodWidth;
    const frameContentWidth = totalRodWidth;
    const frameLeft = sorobanRect.left + (sorobanRect.width - frameContentWidth - 2 * framePadding - 2 * borderWidth) / 2 + borderWidth + framePadding;

    const beads: BeadPosition[] = [];
    const heavenBeadsToSplit: {x: number; y: number; rodIndex: number}[] = [];

    // Process each rod (from right to left for visual order: ones first, then tens)
    // Rod 0 = ones (rightmost), Rod 1 = tens (left of ones), etc.
    for (let rodIdx = 0; rodIdx < rodCount; rodIdx++) {
      const rodState = rodStates.find(r => r.rodIndex === rodIdx);
      if (!rodState) continue;

      // Rod center X - rods are arranged with index 0 on the right
      const rodCenterX = frameLeft + (rodCount - 1 - rodIdx) * rodWidth + rodWidth / 2;
      const placeValue = Math.pow(10, rodIdx);
      const beadValue = placeValue; // Each bead on this rod is worth placeValue

      // Add earth beads for this rod
      for (let i = 0; i < rodState.earthBeadsActive; i++) {
        const positionY = earthSectionStart + beadSpacing + i * (beadHeight + stackSpacing);
        beads.push({
          id: `rod${rodIdx}-earth-${i}`,
          x: rodCenterX,
          y: contentTop + positionY + beadHeight / 2,
          isFromHeaven: false,
          rodIndex: rodIdx,
          beadValue: beadValue,
        });
      }

      // Track heaven bead for splitting
      if (rodState.heavenBeadActive) {
        heavenBeadsToSplit.push({
          x: rodCenterX,
          y: contentTop + heavenActiveY + heavenBeadHeight / 2,
          rodIndex: rodIdx,
        });
      }
    }

    setAllHeavenBeadPositions(heavenBeadsToSplit);
    setAllBeadPositions(beads);

    // Determine which rods have beads and need to be animated
    // Sort from highest index (tens) to lowest (ones) for animation order
    const rodsWithBeads = [...new Set(beads.map(b => b.rodIndex))].sort((a, b) => b - a);

    // Also include rods that only have heaven beads (no earth beads)
    heavenBeadsToSplit.forEach(hb => {
      if (!rodsWithBeads.includes(hb.rodIndex)) {
        rodsWithBeads.push(hb.rodIndex);
        rodsWithBeads.sort((a, b) => b - a);
      }
    });

    setRodsToAnimate(rodsWithBeads);

    // Start animation sequence
    setPhase('FADING_FRAME');

    // After fading, start with the first rod (highest index = tens)
    const timer1 = setTimeout(() => {
      if (rodsWithBeads.length > 0) {
        const firstRod = rodsWithBeads[0];
        setCurrentAnimatingRodIndex(firstRod);

        // Get beads for this rod
        const rodBeads = beads.filter(b => b.rodIndex === firstRod);
        setCurrentRodBeads(rodBeads);
        setCurrentRodMatchedCount(0);

        // Check if this rod has a heaven bead to split
        const heavenBead = heavenBeadsToSplit.find(h => h.rodIndex === firstRod);
        if (heavenBead) {
          setCurrentSplitBeadPosition(heavenBead);
          setPhase('SPLITTING_HEAVEN');
        } else {
          setCurrentSplitBeadPosition(null);
          setPhase('MATCHING');
        }
      } else {
        // No beads at all - go straight to result
        setPhase('SHOWING_RESULT');
      }
    }, 800);

    return () => {
      clearTimeout(timer1);
    };
  }, [isActive, sorobanRect, problemDisplayRect, objects, heavenBeadActive, earthBeadsActive, displayMode, targetValue, maxValue, rodCount, rodStates]);

  // Handle heaven bead split completion for current rod only
  const handleSplitComplete = useCallback(() => {
    // Add 5 beads from the current rod's heaven bead split
    if (!currentSplitBeadPosition) return;

    const lineLength = 125;
    const angles = [-60, -30, 0, 30, 60]; // Fan angles - wider spread to avoid overlap

    const heavenBead = currentSplitBeadPosition;
    const placeValue = Math.pow(10, heavenBead.rodIndex);

    // Create bead positions at the exact end positions of the lines
    const spreadBeads: BeadPosition[] = [];
    const spawnedPositions: {x: number; y: number}[] = [];

    for (let i = 0; i < 5; i++) {
      const angleRad = (angles[i] * Math.PI) / 180;
      const endX = Math.sin(angleRad) * lineLength;
      const endY = -Math.cos(angleRad) * lineLength;
      const pos = {
        x: heavenBead.x + endX,
        y: heavenBead.y + endY,
      };
      spreadBeads.push({
        id: `rod${heavenBead.rodIndex}-heaven-${i}`,
        ...pos,
        isFromHeaven: false, // Use earth bead appearance (goldenrod)
        rodIndex: heavenBead.rodIndex,
        beadValue: placeValue,
      });
      spawnedPositions.push(pos);
    }

    setSpawnedHeavenBeads(prev => [...prev, ...spawnedPositions]);

    // Add spread beads to current rod beads
    setCurrentRodBeads(prev => [...spreadBeads, ...prev]);

    // Also add to all beads for reference
    setAllBeadPositions(prev => [...spreadBeads, ...prev]);

    // Clear the split position and go to matching
    // But only if we haven't already matched all targets
    if (!allTargetsMatchedRef.current) {
      setCurrentSplitBeadPosition(null);
      setPhase('MATCHING');
    }
  }, [currentSplitBeadPosition]);

  // Ref to track if moveToNextRod has already been called for current rod
  const moveToNextRodCalledRef = useRef(false);

  // Helper to move to the next rod or finish
  const moveToNextRod = useCallback(() => {
    // Prevent duplicate calls (React StrictMode or timing issues)
    if (moveToNextRodCalledRef.current) {
      return;
    }
    moveToNextRodCalledRef.current = true;

    // CRITICAL: Check ref synchronously - state may not have updated yet due to React async batching
    if (allTargetsMatchedRef.current) {
      // All targets matched - skip directly to result, no more animations
      if (!hasCompletedRef.current) {
        hasCompletedRef.current = true;
        // Short delay then show result
        setTimeout(() => {
          const correct = totalBeads === targetCount;
          setIsCorrect(correct);
          setPhase('SHOWING_RESULT');

          setTimeout(() => {
            setPhase('COMPLETE');
            onComplete(correct);
          }, correct ? 1500 : 2500);
        }, 300);
      }
      return;
    }

    const currentIdx = rodsToAnimate.indexOf(currentAnimatingRodIndex);
    const nextIdx = currentIdx + 1;

    // Mark current rod as completed
    setCompletedRodIndices(prev => new Set([...prev, currentAnimatingRodIndex]));

    if (nextIdx < rodsToAnimate.length) {
      // Move to next rod
      const nextRod = rodsToAnimate[nextIdx];
      setCurrentAnimatingRodIndex(nextRod);

      // Get beads for this rod (including any that were split earlier)
      const rodBeads = allBeadPositions.filter(b => b.rodIndex === nextRod);
      setCurrentRodBeads(rodBeads);
      setCurrentRodMatchedCount(0);

      // Reset the guard for the next rod
      moveToNextRodCalledRef.current = false;

      // Check if this rod has a heaven bead to split
      const heavenBead = allHeavenBeadPositions.find(h => h.rodIndex === nextRod);
      if (heavenBead) {
        setCurrentSplitBeadPosition(heavenBead);
        setPhase('SPLITTING_HEAVEN');
      } else {
        setCurrentSplitBeadPosition(null);
        setPhase('MATCHING');
      }
    } else {
      // All rods done - show result
      if (!hasCompletedRef.current) {
        hasCompletedRef.current = true;
        setTimeout(() => {
          const correct = totalBeads === targetCount;
          setIsCorrect(correct);
          setPhase('SHOWING_RESULT');

          setTimeout(() => {
            setPhase('COMPLETE');
            onComplete(correct);
          }, correct ? 1500 : 2500);
        }, 500);
      }
    }
  }, [rodsToAnimate, currentAnimatingRodIndex, allBeadPositions, allHeavenBeadPositions, totalBeads, targetCount, onComplete]);

  // Handle bead matching animation - now tracks per-rod progress
  // Uses refs for synchronous tracking so the next bead's targeting sees updated values immediately
  const handleBeadArrive = useCallback((index: number, targetX: number, targetY: number, isExtra: boolean) => {
    const bead = currentRodBeads[index];
    if (!bead) return;

    // If this is an extra bead (no target to match), track its position
    if (isExtra) {
      setExtraBeadPositions(prev => [...prev, {
        x: targetX,
        y: targetY,
        id: `extra-${bead.id}`,
      }]);
    } else {
      // Track what was matched based on bead type and display mode
      // Use refs for synchronous tracking - state updates are async and would cause race conditions

      if (displayMode === 'tenFrames' && rodCount > 1) {
        if (bead.rodIndex === 0) {
          // Ones bead matched a dot - FIRST check full frames (left to right), THEN partial frame
          // This matches the targeting logic order
          const { cellSize, gap, contentOffset, frameWidth, frameHeight } = getFrameLayoutParams(maxValue);
          const fillOrder = [8, 6, 4, 2, 0, 9, 7, 5, 3, 1];

          let matchedInFullFrame = false;

          // First try to match in full frames (left to right)
          for (let frameIdx = 0; frameIdx < tensFramePositions.length; frameIdx++) {
            // Skip frames already matched by tens beads
            if (matchedTensFrameIndicesRef.current.has(frameIdx)) continue;

            const matchedDotsInFrame = matchedFullFrameDotsRef.current.get(frameIdx) || new Set<number>();

            for (const cellIdx of fillOrder) {
              if (!matchedDotsInFrame.has(cellIdx)) {
                // This is the dot that was matched
                const frame = tensFramePositions[frameIdx];
                const frameLeft = frame.x - frameWidth / 2;
                const frameTop = frame.y - frameHeight / 2;

                const row = Math.floor(cellIdx / 2);
                const col = cellIdx % 2;
                const dotX = frameLeft + contentOffset + col * (cellSize + gap) + cellSize / 2;
                const dotY = frameTop + contentOffset + row * (cellSize + gap) + cellSize / 2;

                // Add flash at this position
                setFlashPositions(prev => [...prev, { x: dotX, y: dotY, delay: 0 }]);

                // Update ref FIRST (synchronous)
                const newDotsSet = new Set(matchedDotsInFrame);
                newDotsSet.add(cellIdx);
                const newMap = new Map(matchedFullFrameDotsRef.current);
                newMap.set(frameIdx, newDotsSet);
                matchedFullFrameDotsRef.current = newMap;

                // If all 10 dots in this frame are matched, mark the whole frame as matched
                if (newDotsSet.size >= 10) {
                  matchedTensFrameIndicesRef.current = new Set([...matchedTensFrameIndicesRef.current, frameIdx]);
                  setMatchedTensFrameIndices(new Set(matchedTensFrameIndicesRef.current));
                }

                // Then update state (for rendering)
                setMatchedFullFrameDots(new Map(matchedFullFrameDotsRef.current));

                matchedInFullFrame = true;
                break;
              }
            }
            if (matchedInFullFrame) break; // Only match one dot per bead
          }

          // If no full frame dot was matched, try partial frame (rightmost)
          if (!matchedInFullFrame) {
            const partialDotIndex = matchedObjectIndicesRef.current.size;
            if (partialDotIndex < onesDotPositions.length) {
              // Matched a partial frame dot
              // Update ref FIRST (synchronous)
              matchedObjectIndicesRef.current = new Set([...matchedObjectIndicesRef.current, partialDotIndex]);
              // Then update state (for rendering)
              setMatchedObjectIndices(new Set(matchedObjectIndicesRef.current));
              setFlashPositions(prev => [...prev, {
                x: onesDotPositions[partialDotIndex].x,
                y: onesDotPositions[partialDotIndex].y,
                delay: 0,
              }]);
            }
          }
        } else {
          // Tens bead matched a frame - mark frame as matched (dots disappear)
          const frameIndex = matchedTensFrameIndicesRef.current.size;
          if (frameIndex < tensFramePositions.length) {
            // Update ref FIRST (synchronous)
            matchedTensFrameIndicesRef.current = new Set([...matchedTensFrameIndicesRef.current, frameIndex]);
            // Then update state (for rendering)
            setMatchedTensFrameIndices(new Set(matchedTensFrameIndicesRef.current));
            setFlashPositions(prev => [...prev, {
              x: tensFramePositions[frameIndex].x,
              y: tensFramePositions[frameIndex].y,
              delay: 0,
            }]);
          }
        }

        // Check if all targets have been matched (all ones dots + all tens frames)
        // For full frames being consumed by ones beads, check matchedFullFrameDotsRef
        const totalFullFramesMatched = matchedTensFrameIndicesRef.current.size +
          Array.from(matchedFullFrameDotsRef.current.values()).filter(s => s.size >= 10).length;
        const matchedOnesCount = matchedObjectIndicesRef.current.size;

        // Total number of targets (must be > 0 to be considered "all matched")
        const totalTargets = onesDotPositions.length + tensFramePositions.length;
        const totalMatched = matchedOnesCount + totalFullFramesMatched;

        // Only mark as "all matched" if there ARE targets AND we've matched all of them
        // Guard against false positive when targets haven't been populated yet (0 >= 0)
        if (totalTargets > 0 && totalMatched > 0 &&
            matchedOnesCount >= onesDotPositions.length &&
            totalFullFramesMatched >= tensFramePositions.length) {
          // CRITICAL: Set ref FIRST for synchronous checking in moveToNextRod
          allTargetsMatchedRef.current = true;
          // Cancel any pending moveToNextRod timeout to prevent further animations
          if (pendingMoveTimeoutRef.current) {
            clearTimeout(pendingMoveTimeoutRef.current);
            pendingMoveTimeoutRef.current = null;
          }
          // Then update state (for rendering) and notify parent
          setAllTargetsMatched(true);
          onAllTargetsMatched?.();
        }
      } else {
        // Objects mode or single-rod: use objectPositions
        const objIndex = matchedPairs;
        if (objIndex < objectPositions.length) {
          setMatchedObjectIndices(prev => new Set([...prev, objIndex]));
          setFlashPositions(prev => [...prev, {
            x: objectPositions[objIndex].x,
            y: objectPositions[objIndex].y,
            delay: 0,
          }]);

          // Check if all objects have been matched
          if (objIndex + 1 >= objectPositions.length) {
            // CRITICAL: Set ref FIRST for synchronous checking in moveToNextRod
            allTargetsMatchedRef.current = true;
            // Cancel any pending moveToNextRod timeout to prevent further animations
            if (pendingMoveTimeoutRef.current) {
              clearTimeout(pendingMoveTimeoutRef.current);
              pendingMoveTimeoutRef.current = null;
            }
            // Then update state (for rendering) and notify parent
            setAllTargetsMatched(true);
            onAllTargetsMatched?.();
          }
        }
      }

      // Increment matched pair count only for actual matches
      setMatchedPairs(prev => prev + 1);
    }

    // Increment current rod's matched count
    setCurrentRodMatchedCount(prev => {
      const newCount = prev + 1;

      // Check if all beads in current rod are done
      if (newCount >= currentRodBeads.length) {
        // Small delay then move to next rod - store ref so we can cancel if all targets matched
        pendingMoveTimeoutRef.current = setTimeout(() => {
          pendingMoveTimeoutRef.current = null;
          moveToNextRod();
        }, 300);
      }

      return newCount;
    });
  }, [currentRodBeads, displayMode, rodCount, onesDotPositions, tensFramePositions, objectPositions, matchedObjectIndices.size, matchedTensFrameIndices.size, matchedFullFrameDots, matchedPairs, moveToNextRod, currentAnimatingRodIndex, maxValue, onAllTargetsMatched]);

  // Reset when deactivated
  useEffect(() => {
    if (!isActive) {
      setPhase('IDLE');
      setMatchedPairs(0);
      setMatchedObjectIndices(new Set());
      setMatchedTensFrameIndices(new Set());
      setMatchedFullFrameDots(new Map());
      setAllHeavenBeadPositions([]);
      setCurrentSplitBeadPosition(null);
      setSpawnedHeavenBeads([]);
      setAllBeadPositions([]);
      setCurrentRodBeads([]);
      setObjectPositions([]);
      setTensFramePositions([]);
      setOnesDotPositions([]);
      setFlashPositions([]);
      setIsCorrect(null);
      setCurrentAnimatingRodIndex(-1);
      setCurrentRodMatchedCount(0);
      setRodsToAnimate([]);
      setCompletedRodIndices(new Set());
      setAllTargetsMatched(false);
      setExtraBeadPositions([]);
      setPartialFrameInfo(null);
      setPartialFrameMismatch(false);
      hasCompletedRef.current = false; // Reset completion guard
      allTargetsMatchedRef.current = false; // Reset matched ref
      moveToNextRodCalledRef.current = false; // Reset moveToNextRod guard
      animationStartedRef.current = false; // Reset animation started flag
      // Reset synchronous tracking refs
      matchedObjectIndicesRef.current = new Set();
      matchedTensFrameIndicesRef.current = new Set();
      matchedFullFrameDotsRef.current = new Map();
      // Clear any pending timeout
      if (pendingMoveTimeoutRef.current) {
        clearTimeout(pendingMoveTimeoutRef.current);
        pendingMoveTimeoutRef.current = null;
      }
    }
  }, [isActive]);

  if (!isActive || phase === 'IDLE') {
    return null;
  }

  return (
    <AnimatePresence>
      <motion.div
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 500,
          pointerEvents: 'none',
        }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        {/* Success/Error background overlay on problem display */}
        {phase === 'SHOWING_RESULT' && problemDisplayRect && (
          <motion.div
            style={{
              position: 'fixed',
              left: problemDisplayRect.left,
              top: problemDisplayRect.top,
              width: problemDisplayRect.width,
              height: problemDisplayRect.height,
              borderRadius: 20,
              background: isCorrect
                ? 'rgba(76, 175, 80, 0.3)'
                : 'rgba(244, 67, 54, 0.25)',
              pointerEvents: 'none',
              zIndex: 550,
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
          />
        )}

        {/* Success glow around problem display container only */}
        {phase === 'SHOWING_RESULT' && isCorrect && problemDisplayRect && (
          <motion.div
            style={{
              position: 'fixed',
              left: problemDisplayRect.left - 20,
              top: problemDisplayRect.top - 20,
              width: problemDisplayRect.width + 40,
              height: problemDisplayRect.height + 40,
              borderRadius: 30,
              background: 'transparent',
              boxShadow: '0 0 60px 20px rgba(76, 175, 80, 0.5)',
              pointerEvents: 'none',
            }}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
          />
        )}

        {/* Error indication - pulsing border glow on problem display only */}
        {phase === 'SHOWING_RESULT' && !isCorrect && problemDisplayRect && (
          <motion.div
            style={{
              position: 'fixed',
              left: problemDisplayRect.left - 10,
              top: problemDisplayRect.top - 10,
              width: problemDisplayRect.width + 20,
              height: problemDisplayRect.height + 20,
              borderRadius: 25,
              boxShadow: '0 0 30px 10px rgba(244, 67, 54, 0.4)',
              pointerEvents: 'none',
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 1, 0.7, 1] }}
            transition={{ duration: 0.8 }}
          />
        )}

        {/* Real soroban is now faded in GameContainer, no need for ghost frame */}

        {/* Objects rendered in overlay - they disappear when matched (objects mode only) */}
        {displayMode === 'objects' && (phase === 'FADING_FRAME' || phase === 'SPLITTING_HEAVEN' || phase === 'MATCHING') && (
          <AnimatePresence>
            {objectPositions.map((obj, index) => {
              const isMatched = matchedObjectIndices.has(index);
              if (isMatched) return null; // Don't render matched objects

              const objSize = 56;
              return (
                <motion.div
                  key={obj.id}
                  style={{
                    position: 'fixed',
                    left: obj.x,
                    top: obj.y,
                    // Use margins instead of transform (transform conflicts with Framer Motion)
                    marginLeft: -objSize / 2,
                    marginTop: -objSize / 2,
                    zIndex: 600,
                  }}
                  initial={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0, opacity: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <ObjectIcon type={obj.type} size={objSize} />
                </motion.div>
              );
            })}
          </AnimatePresence>
        )}

        {/* Ones dots rendered in overlay - disappear when matched by ones beads */}
        {/* Hide completely when all targets matched (empty blue space for extra beads) */}
        {displayMode === 'tenFrames' && !allTargetsMatched && (phase === 'FADING_FRAME' || phase === 'SPLITTING_HEAVEN' || phase === 'MATCHING') && (() => {
          // Use the same layout params as TenFrameDisplay
          const { cellSize } = getFrameLayoutParams(maxValue);
          const dotSize = Math.round(cellSize * 0.78); // Same ratio as TenFrameDisplay

          return (
          <AnimatePresence>
            {onesDotPositions.map((dot, index) => {
              const isMatched = matchedObjectIndices.has(index);
              if (isMatched) return null; // Don't render matched dots

              return (
                <motion.div
                  key={dot.id}
                  style={{
                    position: 'fixed',
                    left: dot.x,
                    top: dot.y,
                    width: dotSize,
                    height: dotSize,
                    marginLeft: -dotSize / 2,
                    marginTop: -dotSize / 2,
                    borderRadius: '50%',
                    background: '#333', // Simple black to match TenFrameDisplay
                    boxShadow: '0 1px 2px rgba(0,0,0,0.3)',
                    zIndex: 600,
                  }}
                  initial={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0, opacity: 0 }}
                  transition={{ duration: 0.3 }}
                />
              );
            })}
          </AnimatePresence>
          );
        })()}

        {/* Full ten frame dots overlay - dots disappear when matched by tens beads OR by ones beads individually */}
        {/* Hide completely when all targets matched (empty blue space for extra beads) */}
        {displayMode === 'tenFrames' && !allTargetsMatched && (phase === 'FADING_FRAME' || phase === 'SPLITTING_HEAVEN' || phase === 'MATCHING') && (() => {
          // Use the same layout params as TenFrameDisplay
          const { cellSize, gap, contentOffset, frameWidth, frameHeight } = getFrameLayoutParams(maxValue);
          const dotSize = Math.round(cellSize * 0.78); // Same ratio as TenFrameDisplay

          return (
            <AnimatePresence>
              {tensFramePositions.map((frame, frameIndex) => {
                // Skip if this frame has been fully matched by a tens bead (all dots cleared at once)
                if (matchedTensFrameIndices.has(frameIndex)) return null;

                // Get the set of individually matched dots for this frame (matched by ones beads)
                const matchedDotsInFrame = matchedFullFrameDots.get(frameIndex) || new Set<number>();

                // Calculate dot positions within this frame
                const frameLeft = frame.x - frameWidth / 2;
                const frameTop = frame.y - frameHeight / 2;

                return (
                  <motion.div
                    key={frame.id}
                    style={{
                      position: 'fixed',
                      left: frameLeft,
                      top: frameTop,
                      width: frameWidth,
                      height: frameHeight,
                      zIndex: 600,
                      pointerEvents: 'none',
                    }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    {/* Render 10 dots in a 2x5 grid, but skip dots that have been individually matched */}
                    {Array.from({ length: 10 }).map((_, cellIndex) => {
                      // Skip dots that have been individually matched by ones beads
                      if (matchedDotsInFrame.has(cellIndex)) return null;

                      const row = Math.floor(cellIndex / 2);
                      const col = cellIndex % 2;
                      const dotX = contentOffset + col * (cellSize + gap) + cellSize / 2;
                      const dotY = contentOffset + row * (cellSize + gap) + cellSize / 2;

                      return (
                        <motion.div
                          key={`${frame.id}-dot-${cellIndex}`}
                          style={{
                            position: 'absolute',
                            left: dotX,
                            top: dotY,
                            width: dotSize,
                            height: dotSize,
                            marginLeft: -dotSize / 2,
                            marginTop: -dotSize / 2,
                            borderRadius: '50%',
                            background: '#333', // Same black as partial frame dots
                            boxShadow: '0 1px 2px rgba(0,0,0,0.3)',
                          }}
                          initial={{ scale: 1, opacity: 1 }}
                          exit={{ scale: 0, opacity: 0 }}
                          transition={{ duration: 0.2, delay: cellIndex * 0.02 }}
                        />
                      );
                    })}
                  </motion.div>
                );
              })}
            </AnimatePresence>
          );
        })()}

        {/* Heaven bead ghost - visible during SPLITTING_HEAVEN for current rod */}
        {/* Hide completely if all targets already matched */}
        {phase === 'SPLITTING_HEAVEN' && currentSplitBeadPosition && !allTargetsMatched && (() => {
          const beadSize = SIZES.large.beadSize;
          const heavenBeadWidth = beadSize * 0.85;
          const heavenBeadHeight = beadSize * 0.9;

          return (
            <motion.div
              key={`heaven-ghost-${currentSplitBeadPosition.rodIndex}`}
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

        {/* Heaven bead splitting animation - lines emanate upward, beads appear at ends */}
        {/* Hide completely if all targets already matched */}
        {phase === 'SPLITTING_HEAVEN' && currentSplitBeadPosition && !allTargetsMatched && (() => {
          const beadSize = SIZES.large.beadSize;
          const earthBeadWidth = beadSize * 0.85;
          const earthBeadHeight = beadSize * 0.7;
          const lineLength = 125;

          // Fan angles: wider spread to avoid overlap between beads
          const angles = [-60, -30, 0, 30, 60];
          const heavenBead = currentSplitBeadPosition;

          return (
            <>
              {angles.map((angleDeg, i) => {
                // Convert to radians, where 0 = straight up
                const angleRad = (angleDeg * Math.PI) / 180;
                // End position relative to heaven bead center
                const endX = Math.sin(angleRad) * lineLength;
                const endY = -Math.cos(angleRad) * lineLength; // Negative because up is negative Y

                return (
                  <React.Fragment key={`split-group-${heavenBead.rodIndex}-${i}`}>
                    {/* Line from heaven bead center going outward */}
                    <motion.div
                      style={{
                        position: 'fixed',
                        left: heavenBead.x,
                        top: heavenBead.y,
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

                    {/* Bead appearing at end of line - stays visible, ghost bead will overlay when animating */}
                    <motion.div
                      style={{
                        position: 'fixed',
                        left: heavenBead.x + endX,
                        top: heavenBead.y + endY,
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
                        duration: 0.2,
                        delay: 0.2 + i * 0.04,
                        type: 'spring',
                        stiffness: 400,
                        damping: 25,
                      }}
                      onAnimationComplete={i === 4 ? handleSplitComplete : undefined}
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
        })()}

        {/* Ghost beads for EARTH beads - visible during FADING_FRAME */}
        {/* These overlay the real earth beads when soroban fades */}
        {phase === 'FADING_FRAME' && allBeadPositions.map((bead, index) => {
          // Only render earth beads here (heaven beads handled separately below)
          if (bead.id.includes('heaven-')) return null;

          return (
            <GhostBead
              key={`${bead.id}-static`}
              startX={bead.x}
              startY={bead.y}
              endX={bead.x}
              endY={bead.y}
              delay={0}
              onArrive={() => {}}
              isHeaven={bead.isFromHeaven}
              beadSize={SIZES.large.beadSize}
              isStatic={true}
            />
          );
        })}

        {/* Ghost heaven beads - visible during FADING_FRAME */}
        {/* These overlay the real heaven beads when soroban fades */}
        {phase === 'FADING_FRAME' && allHeavenBeadPositions.map((heavenBead) => {
          const beadSize = SIZES.large.beadSize;
          const heavenBeadWidth = beadSize * 0.85;
          const heavenBeadHeight = beadSize * 0.9;

          return (
            <motion.div
              key={`heaven-static-${heavenBead.rodIndex}`}
              style={{
                position: 'fixed',
                left: heavenBead.x,
                top: heavenBead.y,
                width: heavenBeadWidth,
                height: heavenBeadHeight,
                borderRadius: '50%',
                background: 'radial-gradient(ellipse at 30% 30%, #CD853F 0%, #8B5A2B 100%)',
                boxShadow: 'inset 0 -4px 8px rgba(0,0,0,0.3), 0 2px 4px rgba(0,0,0,0.2)',
                marginLeft: -heavenBeadWidth / 2,
                marginTop: -heavenBeadHeight / 2,
                zIndex: 999,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
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
        })}

        {/* Static earth beads during SPLITTING_HEAVEN - show earth beads from current rod */}
        {/* These stay visible while the heaven bead is splitting */}
        {/* Hide completely if all targets already matched */}
        {phase === 'SPLITTING_HEAVEN' && !allTargetsMatched && allBeadPositions
          .filter(bead => bead.rodIndex === currentAnimatingRodIndex && !bead.id.includes('heaven-'))
          .map((bead) => {
            const beadSize = SIZES.large.beadSize;
            const beadWidth = beadSize * 0.85;
            const beadHeight = beadSize * 0.7;

            return (
              <motion.div
                key={`splitting-earth-${bead.id}`}
                style={{
                  position: 'fixed',
                  left: bead.x,
                  top: bead.y,
                  width: beadWidth,
                  height: beadHeight,
                  borderRadius: '50%',
                  background: 'radial-gradient(ellipse at 30% 30%, #DAA520 0%, #B8860B 100%)',
                  boxShadow: 'inset 0 -4px 8px rgba(0,0,0,0.3), 0 2px 4px rgba(0,0,0,0.2)',
                  marginLeft: -beadWidth / 2,
                  marginTop: -beadHeight / 2,
                  zIndex: 999,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
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
          })}

        {/* Static beads during MATCHING - show beads from current rod that haven't animated yet */}
        {/* IMPORTANT: Keep visible even after allTargetsMatched - extra beads need to be seen before they animate */}
        {/* When partialFrameMismatch, remaining beads stay visible but animation stops */}
        {(phase === 'MATCHING' || (phase === 'SHOWING_RESULT' && partialFrameMismatch)) && currentRodBeads.map((bead, index) => {
          // Hide beads that have already animated
          if (index < currentRodMatchedCount) return null;
          // Hide the bead that's currently animating (ghost bead handles it)
          // When partialFrameMismatch, that bead is shown by the error display, so skip it too
          // Only show beads AFTER currentRodMatchedCount when partialFrameMismatch
          if (index === currentRodMatchedCount) return null;

          const beadSize = SIZES.large.beadSize;
          const beadWidth = beadSize * 0.85;
          const beadHeight = bead.isFromHeaven ? beadSize * 0.9 : beadSize * 0.7;
          const activeColor = bead.isFromHeaven ? '#CD853F' : '#DAA520';
          const gradientEnd = bead.isFromHeaven ? '#8B5A2B' : '#B8860B';

          return (
            <motion.div
              key={`static-${bead.id}`}
              style={{
                position: 'fixed',
                left: bead.x,
                top: bead.y,
                width: beadWidth,
                height: beadHeight,
                borderRadius: '50%',
                background: `radial-gradient(ellipse at 30% 30%, ${activeColor} 0%, ${gradientEnd} 100%)`,
                boxShadow: 'inset 0 -4px 8px rgba(0,0,0,0.3), 0 2px 4px rgba(0,0,0,0.2)',
                marginLeft: -beadWidth / 2,
                marginTop: -beadHeight / 2,
                zIndex: 999,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
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
        })}

        {/* Static beads from rods that haven't started animating yet */}
        {/* These stay visible while earlier rods (tens) are being animated */}
        {/* Hide completely if all targets already matched (but NOT for partialFrameMismatch - beads should stay) */}
        {(phase === 'SPLITTING_HEAVEN' || phase === 'MATCHING' || (phase === 'SHOWING_RESULT' && partialFrameMismatch)) && !allTargetsMatched && allBeadPositions.map((bead) => {
          // Skip beads from rods that have completed their animation
          if (completedRodIndices.has(bead.rodIndex)) return null;

          // Only show beads from rods that come AFTER the current animating rod
          // (lower rod index = ones, which animates after tens)
          const currentIdx = rodsToAnimate.indexOf(currentAnimatingRodIndex);
          const beadRodIdx = rodsToAnimate.indexOf(bead.rodIndex);

          // Skip if this rod has already animated or is currently animating
          if (beadRodIdx <= currentIdx) return null;

          // Skip heaven-split beads (they're handled separately when their rod animates)
          if (bead.id.includes('heaven-')) return null;

          const beadSize = SIZES.large.beadSize;
          const beadWidth = beadSize * 0.85;
          const beadHeight = bead.isFromHeaven ? beadSize * 0.9 : beadSize * 0.7;
          const activeColor = bead.isFromHeaven ? '#CD853F' : '#DAA520';
          const gradientEnd = bead.isFromHeaven ? '#8B5A2B' : '#B8860B';

          return (
            <motion.div
              key={`waiting-${bead.id}`}
              style={{
                position: 'fixed',
                left: bead.x,
                top: bead.y,
                width: beadWidth,
                height: beadHeight,
                borderRadius: '50%',
                background: `radial-gradient(ellipse at 30% 30%, ${activeColor} 0%, ${gradientEnd} 100%)`,
                boxShadow: 'inset 0 -4px 8px rgba(0,0,0,0.3), 0 2px 4px rgba(0,0,0,0.2)',
                marginLeft: -beadWidth / 2,
                marginTop: -beadHeight / 2,
                zIndex: 999,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
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
        })}

        {/* Static heaven beads from rods that haven't started animating yet */}
        {/* These stay visible while earlier rods (tens) are being animated */}
        {/* Hide completely if all targets already matched (but NOT for partialFrameMismatch - beads should stay) */}
        {(phase === 'SPLITTING_HEAVEN' || phase === 'MATCHING' || (phase === 'SHOWING_RESULT' && partialFrameMismatch)) && !allTargetsMatched && allHeavenBeadPositions.map((heavenBead) => {
          // Skip heaven beads from rods that have completed their animation
          if (completedRodIndices.has(heavenBead.rodIndex)) return null;

          // Only show heaven beads from rods that come AFTER the current animating rod
          const currentIdx = rodsToAnimate.indexOf(currentAnimatingRodIndex);
          const heavenRodIdx = rodsToAnimate.indexOf(heavenBead.rodIndex);

          // Skip if this rod has already animated or is currently animating
          if (heavenRodIdx <= currentIdx) return null;

          const beadSize = SIZES.large.beadSize;
          const heavenBeadWidth = beadSize * 0.85;
          const heavenBeadHeight = beadSize * 0.9;

          return (
            <motion.div
              key={`waiting-heaven-${heavenBead.rodIndex}`}
              style={{
                position: 'fixed',
                left: heavenBead.x,
                top: heavenBead.y,
                width: heavenBeadWidth,
                height: heavenBeadHeight,
                borderRadius: '50%',
                background: 'radial-gradient(ellipse at 30% 30%, #CD853F 0%, #8B5A2B 100%)',
                boxShadow: 'inset 0 -4px 8px rgba(0,0,0,0.3), 0 2px 4px rgba(0,0,0,0.2)',
                marginLeft: -heavenBeadWidth / 2,
                marginTop: -heavenBeadHeight / 2,
                zIndex: 999,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
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
        })}

        {/* Ghost beads during MATCHING - animate to objects one at a time */}
        {/* Now processes beads per-rod: all tens beads first, then all ones beads */}
        {/* IMPORTANT: Continue animating even after allTargetsMatched - extra beads need to fly to blue area */}
        {/* IMPORTANT: Stop rendering when partialFrameMismatch - the error display handles showing the bead */}
        {phase === 'MATCHING' && problemDisplayRect && !partialFrameMismatch && (() => {
          const index = currentRodMatchedCount;
          const bead = currentRodBeads[index];
          if (!bead) return null;

          // Calculate target position based on bead type and display mode
          let targetX: number;
          let targetY: number;
          let hasTarget = false;

          // Track if this is a partial frame mismatch (tens bead trying to match incomplete frame)
          let isPartialFrameMismatch = false;

          if (displayMode === 'tenFrames' && rodCount > 1) {
            // Multi-rod ten frames mode:
            // - Ones beads (rod 0) match individual dots (partial frame first, then dots in full frames)
            // - Tens beads (rod 1+) match entire frames
            // IMPORTANT: Use refs for targeting to get synchronous, up-to-date values
            if (bead.rodIndex === 0) {
              // Ones bead - match next available dot
              // FIRST check full frames (left to right), THEN partial frame dots (rightmost)
              // This ensures consistent left-to-right consumption across all scenarios
              const { cellSize, gap, contentOffset, frameWidth, frameHeight } = getFrameLayoutParams(maxValue);

              // Ten frame fill order: left column bottom-to-top, then right column bottom-to-top
              const fillOrder = [8, 6, 4, 2, 0, 9, 7, 5, 3, 1];

              // First, check for dots in unmatched full frames (left to right)
              for (let frameIdx = 0; frameIdx < tensFramePositions.length; frameIdx++) {
                // Skip frames that were already matched by tens beads
                if (matchedTensFrameIndicesRef.current.has(frameIdx)) {
                  continue;
                }

                // Get or create the set of matched dots for this frame
                const matchedDotsInFrame = matchedFullFrameDotsRef.current.get(frameIdx) || new Set<number>();

                // Find the next unmatched dot in fill order
                for (const cellIdx of fillOrder) {
                  if (!matchedDotsInFrame.has(cellIdx)) {
                    // Found an unmatched dot - calculate its position
                    const frame = tensFramePositions[frameIdx];
                    const frameLeft = frame.x - frameWidth / 2;
                    const frameTop = frame.y - frameHeight / 2;

                    const row = Math.floor(cellIdx / 2);
                    const col = cellIdx % 2;
                    const dotX = frameLeft + contentOffset + col * (cellSize + gap) + cellSize / 2;
                    const dotY = frameTop + contentOffset + row * (cellSize + gap) + cellSize / 2;

                    targetX = dotX;
                    targetY = dotY;
                    hasTarget = true;
                    break;
                  }
                }
                if (hasTarget) break;
              }

              // If no full frame dots available, check partial frame dots (rightmost)
              if (!hasTarget) {
                const partialDotIndex = matchedObjectIndicesRef.current.size;
                if (partialDotIndex < onesDotPositions.length) {
                  targetX = onesDotPositions[partialDotIndex].x;
                  targetY = onesDotPositions[partialDotIndex].y;
                  hasTarget = true;
                }
              }
            } else {
              // Tens bead (rod 1+) - match next available tens frame
              const frameIndex = matchedTensFrameIndicesRef.current.size;
              if (frameIndex < tensFramePositions.length) {
                targetX = tensFramePositions[frameIndex].x;
                targetY = tensFramePositions[frameIndex].y;
                hasTarget = true;
              } else if (partialFrameInfo && !partialFrameMismatch) {
                // No more full frames, but there's a partial frame
                // This is an ERROR - tens bead can't match a partial frame
                targetX = partialFrameInfo.x;
                targetY = partialFrameInfo.y;
                isPartialFrameMismatch = true;
                // Don't set hasTarget - we want to trigger error handling
              }
            }
          } else {
            // Objects mode or single-rod ten frames: use objectPositions in order
            const objIndex = matchedPairs;
            if (objIndex < objectPositions.length) {
              targetX = objectPositions[objIndex].x;
              targetY = objectPositions[objIndex].y;
              hasTarget = true;
            }
          }

          if (!hasTarget && !isPartialFrameMismatch) {
            // Extra bead - animate to center of problem display
            // Spread out multiple extra beads so they don't stack
            // Calculate which extra bead this is: current index minus total targets
            // For objects mode: index is within currentRodBeads, matchedPairs tells us how many have matched
            // So extraIndex = how many extra beads have already been processed
            const extraIndex = extraBeadPositions.length;

            const spacing = 60;
            const cols = 3;
            const col = extraIndex % cols;
            const row = Math.floor(extraIndex / cols);
            // Center the beads horizontally
            const totalExtraBeads = currentRodBeads.length - objectPositions.length;
            const beadsInThisRow = Math.min(cols, totalExtraBeads - row * cols);
            const offsetX = (col - (beadsInThisRow - 1) / 2) * spacing;
            const offsetY = row * spacing - 20; // Slightly above center

            targetX = problemDisplayRect.left + problemDisplayRect.width / 2 + offsetX;
            targetY = problemDisplayRect.top + problemDisplayRect.height / 2 + offsetY;
          }

          // Handle arrival differently for partial frame mismatch
          const handleArrival = () => {
            if (isPartialFrameMismatch) {
              // Tens bead tried to match partial frame - this is an error
              // Set the mismatch state and immediately go to error result
              setPartialFrameMismatch(true);
              // Cancel any pending timeouts
              if (pendingMoveTimeoutRef.current) {
                clearTimeout(pendingMoveTimeoutRef.current);
                pendingMoveTimeoutRef.current = null;
              }
              // Go directly to error result after a short delay to show the mismatch
              if (!hasCompletedRef.current) {
                hasCompletedRef.current = true;
                setTimeout(() => {
                  setIsCorrect(false);
                  setPhase('SHOWING_RESULT');
                  setTimeout(() => {
                    setPhase('COMPLETE');
                    onComplete(false);
                  }, 2500);
                }, 800); // Longer delay to show the error clearly
              }
            } else {
              handleBeadArrive(index, targetX!, targetY!, !hasTarget);
            }
          };

          return (
            <GhostBead
              key={`${bead.id}-animate-${currentAnimatingRodIndex}-${currentRodMatchedCount}-extra${extraBeadPositions.length}`}
              startX={bead.x}
              startY={bead.y}
              endX={targetX!}
              endY={targetY!}
              delay={0.3} // Small delay before starting animation
              onArrive={handleArrival}
              isHeaven={bead.isFromHeaven}
              beadSize={SIZES.large.beadSize}
              isStatic={false}
            />
          );
        })()}

        {/* Extra beads that have arrived in the blue area - stay visible during MATCHING */}
        {(phase === 'MATCHING' || phase === 'SHOWING_RESULT') && extraBeadPositions.map((extraBead) => {
          const beadSize = SIZES.large.beadSize;
          const beadWidth = beadSize * 0.85;
          const beadHeight = beadSize * 0.7;

          return (
            <motion.div
              key={extraBead.id}
              style={{
                position: 'fixed',
                left: extraBead.x,
                top: extraBead.y,
                width: beadWidth,
                height: beadHeight,
                borderRadius: '50%',
                background: 'radial-gradient(ellipse at 30% 30%, #DAA520 0%, #B8860B 100%)',
                boxShadow: 'inset 0 -4px 8px rgba(0,0,0,0.3), 0 2px 4px rgba(0,0,0,0.2)',
                marginLeft: -beadWidth / 2,
                marginTop: -beadHeight / 2,
                zIndex: 1000,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              initial={{ scale: 1, opacity: 1 }}
              animate={phase === 'SHOWING_RESULT' ? {
                filter: [
                  'drop-shadow(0 0 0px transparent)',
                  'drop-shadow(0 0 12px rgba(244, 67, 54, 0.8))',
                  'drop-shadow(0 0 20px rgba(244, 67, 54, 1))',
                  'drop-shadow(0 0 12px rgba(244, 67, 54, 0.8))',
                ],
                scale: [1, 1.1, 1],
              } : {}}
              transition={{
                filter: { duration: 0.8, repeat: 2 },
                scale: { duration: 0.8, repeat: 2 },
              }}
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
        })}

        {/* Flash effects on match */}
        {flashPositions.map((flash, i) => (
          <MatchFlash key={i} x={flash.x} y={flash.y} delay={flash.delay} />
        ))}

        {/* Remaining objects/dots that weren't matched (too few beads) - show with red glow */}
        {phase === 'SHOWING_RESULT' && !isCorrect && targetCount > totalBeads && displayMode === 'objects' && (
          <>
            {objectPositions.slice(totalBeads).map((obj, i) => {
              const objSize = 56;
              return (
                <motion.div
                  key={`unmatched-obj-${i}`}
                  style={{
                    position: 'fixed',
                    left: obj.x,
                    top: obj.y,
                    marginLeft: -objSize / 2,
                    marginTop: -objSize / 2,
                    zIndex: 600,
                    filter: 'drop-shadow(0 0 8px rgba(244, 67, 54, 0.8))',
                  }}
                  animate={{
                    scale: [1, 1.1, 1],
                    filter: [
                      'drop-shadow(0 0 8px rgba(244, 67, 54, 0.8))',
                      'drop-shadow(0 0 16px rgba(244, 67, 54, 1))',
                      'drop-shadow(0 0 8px rgba(244, 67, 54, 0.8))',
                    ],
                  }}
                  transition={{ duration: 0.8, repeat: 2 }}
                >
                  <ObjectIcon type={obj.type} size={objSize} />
                </motion.div>
              );
            })}
          </>
        )}

        {/* Remaining dots that weren't matched (too few beads) - ten frames mode */}
        {/* Shows: unmatched partial frame dots, unmatched dots in full frames, and unmatched full frames */}
        {phase === 'SHOWING_RESULT' && !isCorrect && displayMode === 'tenFrames' && (() => {
          const { cellSize, gap, contentOffset, frameWidth, frameHeight } = getFrameLayoutParams(maxValue);
          const dotSize = Math.round(cellSize * 0.78);

          // Calculate how many ones beads were used
          const onesBeadsUsed = allBeadPositions.filter(b => b.rodIndex === 0).length;
          const unmatchedOnesDots = onesDotPositions.slice(matchedObjectIndices.size);

          return (
            <>
              {/* Unmatched partial frame dots (from onesDotPositions) */}
              {unmatchedOnesDots.map((dot, i) => {
                return (
                  <motion.div
                    key={`unmatched-partial-dot-${i}`}
                    style={{
                      position: 'fixed',
                      left: dot.x,
                      top: dot.y,
                      width: dotSize,
                      height: dotSize,
                      marginLeft: -dotSize / 2,
                      marginTop: -dotSize / 2,
                      borderRadius: '50%',
                      background: '#333',
                      boxShadow: '0 1px 2px rgba(0,0,0,0.3)',
                      zIndex: 600,
                    }}
                    animate={{
                      scale: [1, 1.2, 1],
                      boxShadow: [
                        '0 0 8px rgba(244, 67, 54, 0.8)',
                        '0 0 16px rgba(244, 67, 54, 1)',
                        '0 0 8px rgba(244, 67, 54, 0.8)',
                      ],
                    }}
                    transition={{ duration: 0.8, repeat: 2 }}
                  />
                );
              })}

              {/* Unmatched dots in full frames - show remaining dots that weren't matched by ones beads */}
              {tensFramePositions.map((frame, frameIdx) => {
                // Skip frames fully matched by tens beads
                if (matchedTensFrameIndices.has(frameIdx)) return null;

                // Get matched dots in this frame
                const matchedDotsInFrame = matchedFullFrameDots.get(frameIdx) || new Set<number>();

                // Calculate frame position
                const frameLeft = frame.x - frameWidth / 2;
                const frameTop = frame.y - frameHeight / 2;

                // Render all 10 dots, but only unmatched ones with red glow
                return Array.from({ length: 10 }).map((_, cellIndex) => {
                  // Skip dots that were matched by ones beads
                  if (matchedDotsInFrame.has(cellIndex)) return null;

                  const row = Math.floor(cellIndex / 2);
                  const col = cellIndex % 2;
                  const dotX = frameLeft + contentOffset + col * (cellSize + gap) + cellSize / 2;
                  const dotY = frameTop + contentOffset + row * (cellSize + gap) + cellSize / 2;

                  return (
                    <motion.div
                      key={`unmatched-full-frame-${frameIdx}-dot-${cellIndex}`}
                      style={{
                        position: 'fixed',
                        left: dotX,
                        top: dotY,
                        width: dotSize,
                        height: dotSize,
                        marginLeft: -dotSize / 2,
                        marginTop: -dotSize / 2,
                        borderRadius: '50%',
                        background: '#333',
                        boxShadow: '0 1px 2px rgba(0,0,0,0.3)',
                        zIndex: 600,
                      }}
                      animate={{
                        scale: [1, 1.2, 1],
                        boxShadow: [
                          '0 0 8px rgba(244, 67, 54, 0.8)',
                          '0 0 16px rgba(244, 67, 54, 1)',
                          '0 0 8px rgba(244, 67, 54, 0.8)',
                        ],
                      }}
                      transition={{ duration: 0.8, repeat: 2 }}
                    />
                  );
                });
              })}
            </>
          );
        })()}

        {/* Extra beads rendering is now handled above during MATCHING phase */}
        {/* They remain visible and get red glow animation during SHOWING_RESULT */}

        {/* Partial frame mismatch error - show the tens bead on the partial frame */}
        {/* and highlight the EMPTY cells (the missing dots) in red */}
        {(partialFrameMismatch || phase === 'SHOWING_RESULT') && partialFrameMismatch && partialFrameInfo && (() => {
          const { cellSize, gap, contentOffset, frameWidth, frameHeight } = getFrameLayoutParams(maxValue);
          const dotSize = Math.round(cellSize * 0.78);
          const frameLeft = partialFrameInfo.x - frameWidth / 2;
          const frameTop = partialFrameInfo.y - frameHeight / 2;

          // The bead that tried to match this partial frame
          const beadSize = SIZES.large.beadSize;
          const beadWidth = beadSize * 0.85;
          const beadHeight = beadSize * 0.7;

          return (
            <>
              {/* The tens bead sitting on the partial frame */}
              <motion.div
                style={{
                  position: 'fixed',
                  left: partialFrameInfo.x,
                  top: partialFrameInfo.y,
                  width: beadWidth,
                  height: beadHeight,
                  borderRadius: '50%',
                  background: 'radial-gradient(ellipse at 30% 30%, #DAA520 0%, #B8860B 100%)',
                  boxShadow: 'inset 0 -4px 8px rgba(0,0,0,0.3), 0 2px 4px rgba(0,0,0,0.2)',
                  marginLeft: -beadWidth / 2,
                  marginTop: -beadHeight / 2,
                  zIndex: 1001,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
                animate={{
                  filter: [
                    'drop-shadow(0 0 0px transparent)',
                    'drop-shadow(0 0 12px rgba(244, 67, 54, 0.8))',
                    'drop-shadow(0 0 20px rgba(244, 67, 54, 1))',
                    'drop-shadow(0 0 12px rgba(244, 67, 54, 0.8))',
                  ],
                  scale: [1, 1.1, 1],
                }}
                transition={{
                  filter: { duration: 0.8, repeat: 2 },
                  scale: { duration: 0.8, repeat: 2 },
                }}
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

              {/* The EMPTY cells of the partial frame - highlight in red */}
              {/* Dots fill left column first (bottom to top), then right column (bottom to top) */}
              {/* We need to find which cells are NOT filled based on dotsInFrame */}
              {(() => {
                // Generate filled cell positions (same logic as TenFrameDisplay)
                const filledCells = new Set<string>();
                let dotIndex = 0;
                for (let col = 0; col <= 1 && dotIndex < partialFrameInfo.dotsInFrame; col++) {
                  for (let row = 4; row >= 0 && dotIndex < partialFrameInfo.dotsInFrame; row--) {
                    filledCells.add(`${row}-${col}`);
                    dotIndex++;
                  }
                }

                // Now render all 10 cells, but only show the empty ones
                return Array.from({ length: 10 }).map((_, cellIndex) => {
                  const row = Math.floor(cellIndex / 2);
                  const col = cellIndex % 2;
                  const cellKey = `${row}-${col}`;

                  // Skip filled cells - only show empty ones
                  if (filledCells.has(cellKey)) return null;

                  const cellX = frameLeft + contentOffset + col * (cellSize + gap) + cellSize / 2;
                  const cellY = frameTop + contentOffset + row * (cellSize + gap) + cellSize / 2;

                  return (
                    <motion.div
                      key={`empty-cell-${cellIndex}`}
                      style={{
                        position: 'fixed',
                        left: cellX,
                        top: cellY,
                        width: dotSize,
                        height: dotSize,
                        marginLeft: -dotSize / 2,
                        marginTop: -dotSize / 2,
                        borderRadius: '50%',
                        border: '3px dashed rgba(244, 67, 54, 0.8)',
                        background: 'rgba(244, 67, 54, 0.2)',
                        zIndex: 1000,
                      }}
                      animate={{
                        scale: [1, 1.2, 1],
                        borderColor: [
                          'rgba(244, 67, 54, 0.8)',
                          'rgba(244, 67, 54, 1)',
                          'rgba(244, 67, 54, 0.8)',
                        ],
                        background: [
                          'rgba(244, 67, 54, 0.2)',
                          'rgba(244, 67, 54, 0.4)',
                          'rgba(244, 67, 54, 0.2)',
                        ],
                      }}
                      transition={{ duration: 0.8, repeat: 2 }}
                    />
                  );
                });
              })()}
            </>
          );
        })()}

        {/* Success celebration - placeholder for JiJi walking through later */}
        {/* Currently the matching animation itself is the feedback */}
      </motion.div>
    </AnimatePresence>
  );
}
