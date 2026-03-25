import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { sounds } from '../../utils/sounds';

type AnimationPhase =
  | 'IDLE'
  | 'FADING_SOROBAN'        // Soroban frames fade, beads remain visible
  | 'LABELING_TENS'         // Show ×10 label on tens earth beads
  | 'SPLITTING_TENS_EARTH'  // Tens earth bead splits into 10 beads (360° double fan)
  | 'MATCHING_TENS'         // Tens beads fly to objects
  | 'SPLITTING_ONES_HEAVEN' // Ones heaven bead splits into 5 beads (fan animation)
  | 'MATCHING_ONES'         // Ones beads fly to objects
  | 'SHOWING_RESULT'        // JiJi flies or gets blocked
  | 'COMPLETE';

interface BeadPosition {
  id: string;
  x: number;
  y: number;
  isFromHeaven: boolean;
  isFromTens: boolean;      // Track if bead came from tens place
}

interface NumberMatchingFeedbackTwoProps {
  isActive: boolean;
  targetCount: number;         // Number of objects to match (3-18)
  // Tens place soroban state
  tensHeavenBeadActive: boolean;
  tensEarthBeadsActive: number;
  // Ones place soroban state
  onesHeavenBeadActive: boolean;
  onesEarthBeadsActive: number;
  sorobanRect: DOMRect | null;
  objectsContainerRect: DOMRect | null;
  onComplete: (isCorrect: boolean) => void;
  onShowJiJi: (flying: boolean) => void;
  onObjectMatched: (index: number) => void;
  showBlockingGlow: boolean;
}

// Static bead component that matches current kite-shaped design
function StaticBead({
  x,
  y,
  beadSize,
  isHeaven = false,
}: {
  x: number;
  y: number;
  beadSize: number;
  isHeaven?: boolean;
}) {
  const beadHeight = isHeaven ? beadSize * 1.1 : beadSize * 1.0;
  const beadWidth = isHeaven ? beadSize * 1.7 : beadSize * 1.6;
  const activeColor = isHeaven ? '#CD853F' : '#DAA520';
  const activeGradientEnd = isHeaven ? '#8B5A2B' : '#B8860B';

  return (
    <div
      style={{
        position: 'fixed',
        left: x,
        top: y,
        width: beadWidth,
        height: beadHeight,
        marginLeft: -beadWidth / 2,
        marginTop: -beadHeight / 2,
        zIndex: 999,
      }}
    >
      <svg
        width={beadWidth}
        height={beadHeight}
        viewBox={`0 0 ${beadWidth} ${beadHeight}`}
        style={{
          filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))',
        }}
      >
        <defs>
          <linearGradient id={`static-bead-grad-${isHeaven}-${x}-${y}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={activeColor} />
            <stop offset="100%" stopColor={activeGradientEnd} />
          </linearGradient>
          <radialGradient id={`static-hole-gradient-${x}-${y}`}>
            <stop offset="0%" stopColor="#1A0F0A" />
            <stop offset="100%" stopColor="#2D1810" />
          </radialGradient>
        </defs>
        <path
          d={`
            M ${beadWidth / 2} 2
            L ${beadWidth - 4} ${beadHeight / 2}
            L ${beadWidth / 2} ${beadHeight - 2}
            L 4 ${beadHeight / 2}
            Z
          `}
          fill={`url(#static-bead-grad-${isHeaven}-${x}-${y})`}
          stroke="rgba(0,0,0,0.3)"
          strokeWidth="1"
        />
        <circle
          cx={beadWidth / 2}
          cy={beadHeight / 2}
          r={beadSize * 0.12}
          fill={`url(#static-hole-gradient-${x}-${y})`}
          stroke="rgba(0,0,0,0.5)"
          strokeWidth="1"
        />
      </svg>
    </div>
  );
}

// Flying bead that matches an object - matches current kite-shaped bead design
function GhostBead({
  startX,
  startY,
  endX,
  endY,
  delay,
  onArrive,
  beadSize,
  isHeaven = false,
}: {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  delay: number;
  onArrive: () => void;
  beadSize: number;
  isHeaven?: boolean;
}) {
  // Match current bead dimensions from Bead.tsx
  const beadHeight = isHeaven ? beadSize * 1.1 : beadSize * 1.0;
  const beadWidth = isHeaven ? beadSize * 1.7 : beadSize * 1.6;
  const activeColor = isHeaven ? '#CD853F' : '#DAA520';
  const activeGradientEnd = isHeaven ? '#8B5A2B' : '#B8860B';

  return (
    <motion.div
      style={{
        position: 'fixed',
        left: startX,
        top: startY,
        width: beadWidth,
        height: beadHeight,
        zIndex: 1100,
        marginLeft: -beadWidth / 2,
        marginTop: -beadHeight / 2,
      }}
      initial={{ x: 0, y: 0, scale: 1, opacity: 1 }}
      animate={{
        x: endX - startX,
        y: endY - startY,
        scale: [1, 1.1, 1.1, 1.1, 0],
        opacity: [1, 1, 1, 1, 0],
      }}
      transition={{
        x: {
          duration: 0.5,
          delay,
          ease: [0.4, 0, 0.2, 1],
        },
        y: {
          duration: 0.5,
          delay,
          ease: [0.4, 0, 0.2, 1],
        },
        scale: {
          duration: 0.5,
          delay,
          times: [0, 0.2, 0.8, 0.95, 1],
        },
        opacity: {
          duration: 0.5,
          delay,
          times: [0, 0.2, 0.8, 0.95, 1],
        },
      }}
      onAnimationComplete={onArrive}
    >
      {/* Kite-shaped SVG bead matching Bead.tsx */}
      <svg
        width={beadWidth}
        height={beadHeight}
        viewBox={`0 0 ${beadWidth} ${beadHeight}`}
        style={{
          filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))',
        }}
      >
        <defs>
          <linearGradient id={`ghost-bead-grad-${isHeaven}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={activeColor} />
            <stop offset="100%" stopColor={activeGradientEnd} />
          </linearGradient>
          <radialGradient id="ghost-hole-gradient">
            <stop offset="0%" stopColor="#1A0F0A" />
            <stop offset="100%" stopColor="#2D1810" />
          </radialGradient>
        </defs>
        {/* Kite/diamond shape */}
        <path
          d={`
            M ${beadWidth / 2} 2
            L ${beadWidth - 4} ${beadHeight / 2}
            L ${beadWidth / 2} ${beadHeight - 2}
            L 4 ${beadHeight / 2}
            Z
          `}
          fill={`url(#ghost-bead-grad-${isHeaven})`}
          stroke="rgba(0,0,0,0.3)"
          strokeWidth="1"
        />
        {/* Center hole */}
        <circle
          cx={beadWidth / 2}
          cy={beadHeight / 2}
          r={beadSize * 0.12}
          fill="url(#ghost-hole-gradient)"
          stroke="rgba(0,0,0,0.5)"
          strokeWidth="1"
        />
      </svg>
    </motion.div>
  );
}

// Flash effect when bead matches object (puff of smoke)
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
        background: 'radial-gradient(circle, rgba(255, 235, 59, 0.8) 0%, rgba(255, 193, 7, 0.4) 40%, transparent 70%)',
        marginLeft: -size / 2,
        marginTop: -size / 2,
        zIndex: 999,
        pointerEvents: 'none',
      }}
      initial={{ scale: 0, opacity: 1 }}
      animate={{ scale: 2.5, opacity: 0 }}
      transition={{ duration: 0.6, delay }}
    />
  );
}

export function NumberMatchingFeedbackTwo({
  isActive,
  targetCount,
  tensHeavenBeadActive,
  tensEarthBeadsActive,
  onesHeavenBeadActive,
  onesEarthBeadsActive,
  sorobanRect,
  objectsContainerRect,
  onComplete,
  onShowJiJi,
  onObjectMatched,
  showBlockingGlow,
}: NumberMatchingFeedbackTwoProps) {
  const [phase, setPhase] = useState<AnimationPhase>('IDLE');
  const [matchedCount, setMatchedCount] = useState(0);
  const [allBeadPositions, setAllBeadPositions] = useState<BeadPosition[]>([]);
  const [heavenBeadPosition, setHeavenBeadPosition] = useState<{x: number; y: number} | null>(null);
  const [spawnedBeads, setSpawnedBeads] = useState<BeadPosition[]>([]);
  const [objectPositions, setObjectPositions] = useState<{x: number; y: number}[]>([]);
  const [flashPositions, setFlashPositions] = useState<{x: number; y: number; delay: number}[]>([]);
  const [blockingBeads, setBlockingBeads] = useState<{x: number; y: number}[]>([]);
  const [tensRodCenterX, setTensRodCenterX] = useState<number>(0);
  const [frameLabelCenterY, setFrameLabelCenterY] = useState<number>(0);
  const hasCompletedRef = useRef(false);

  const totalBeads =
    (tensHeavenBeadActive ? 50 : 0) + (tensEarthBeadsActive * 10) +
    (onesHeavenBeadActive ? 5 : 0) + onesEarthBeadsActive;

  useEffect(() => {
    // Component loaded
  }, []);

  // Calculate tens rod center X and frame label Y whenever sorobanRect changes (for debug lines)
  useEffect(() => {
    if (!sorobanRect) return;

    const beadSize = 42;
    const beadSpacing = 7;
    const framePadding = 14;
    const rodWidth = 60;
    const borderWidth = 4;

    const singleSorobanWidth = rodWidth + framePadding * 2 + borderWidth * 2;
    const totalSorobanWidth = singleSorobanWidth * 2;
    const sorobansStartX = sorobanRect.left + (sorobanRect.width - totalSorobanWidth) / 2;
    const calculatedTensRodCenterX = sorobansStartX + borderWidth + framePadding + rodWidth / 2 + borderWidth;

    // Query the PARENT div of the bottom ×10 label (the frame bar with height=14)
    const labelElements = document.querySelectorAll('[style*="font-size: 10px"][style*="font-weight: 700"]');
    const labelPositions: { y: number; parentY: number }[] = [];

    // Find all ×10 labels and their parent divs
    for (const el of Array.from(labelElements)) {
      if (el.textContent?.includes('×10')) {
        const rect = el.getBoundingClientRect();
        const centerY = rect.top + rect.height / 2;

        // Get parent div center
        const parent = el.parentElement;
        const parentRect = parent?.getBoundingClientRect();
        const parentCenterY = parentRect ? parentRect.top + parentRect.height / 2 : centerY;

        labelPositions.push({ y: centerY, parentY: parentCenterY });
      }
    }

    // The BOTTOM one has the highest Y value - use the parent's center
    const bottomLabel = labelPositions.length > 0
      ? labelPositions.reduce((max, curr) => curr.parentY > max.parentY ? curr : max)
      : { parentY: 0 };
    const actualLabelY = bottomLabel.parentY;

    setTensRodCenterX(calculatedTensRodCenterX);
    setFrameLabelCenterY(actualLabelY);
  }, [sorobanRect]);

  // Calculate positions when activated
  useEffect(() => {
    if (!isActive || !sorobanRect || !objectsContainerRect) {
      setPhase('IDLE');
      return;
    }

    // Calculate object positions (grid layout) - MUST match VisualObjects.tsx
    const getGridLayout = (count: number) => {
      if (count <= 3) return { cols: count, rows: 1 };
      if (count <= 6) return { cols: 3, rows: 2 };
      if (count <= 9) return { cols: 3, rows: 3 };
      // For 10-18, always use 6 columns (two-soroban range)
      if (count <= 18) return { cols: 6, rows: Math.ceil(count / 6) };
      return { cols: 4, rows: Math.ceil(count / 4) };
    };

    const { cols, rows } = getGridLayout(targetCount);
    const objectSize = 50;
    const gap = 16;
    const padding = 20; // Container padding
    const paddingBottom = 40; // Extra bottom padding from parent

    const gridWidth = cols * objectSize + (cols - 1) * gap;
    const gridHeight = rows * objectSize + (rows - 1) * gap;

    // Account for padding in the container
    const availableWidth = objectsContainerRect.width - padding * 2;
    const availableHeight = objectsContainerRect.height - padding - paddingBottom;

    const startX = objectsContainerRect.left + padding + (availableWidth - gridWidth) / 2;
    const startY = objectsContainerRect.top + padding + (availableHeight - gridHeight) / 2;

    const objPos: {x: number; y: number}[] = [];
    for (let i = 0; i < targetCount; i++) {
      const col = i % cols;
      const row = Math.floor(i / cols);
      objPos.push({
        x: startX + col * (objectSize + gap) + objectSize / 2,
        y: startY + row * (objectSize + gap) + objectSize / 2,
      });
    }
    setObjectPositions(objPos);

    // Calculate bead positions from soroban - MUST match SorobanRod.tsx exactly
    const beadSize = 42; // Mobile config
    const beadSpacing = 7;
    const framePadding = 14;
    const rodWidth = 60;

    const heavenSectionHeight = beadSize * 2.0 + beadSpacing * 3;
    const dividerHeight = 16;
    const earthSectionStart = heavenSectionHeight + dividerHeight;
    const earthSectionHeight = beadSize * 5.5 + beadSpacing * 7;

    const borderWidth = 4;
    const contentTop = sorobanRect.top + borderWidth + framePadding;

    // Calculate center X for BOTH sorobans (they're side by side, no gap)
    const singleSorobanWidth = rodWidth + framePadding * 2 + borderWidth * 2;
    const totalSorobanWidth = singleSorobanWidth * 2; // Two sorobans side by side

    // The sorobans are centered in the container, so calculate where they actually start
    const sorobansStartX = sorobanRect.left + (sorobanRect.width - totalSorobanWidth) / 2;

    // Now calculate rod centers relative to where the sorobans actually are
    // For each soroban: start + border + padding + half rod width = rod center
    // Tens place: sorobansStartX + border + padding + rodWidth/2 + borderWidth (empirical correction)
    const calculatedTensRodCenterX = sorobansStartX + borderWidth + framePadding + rodWidth / 2 + borderWidth;
    // Ones place: starts after full first soroban width, same base calculation
    const onesRodCenterX = sorobansStartX + singleSorobanWidth + borderWidth + framePadding + rodWidth / 2 - borderWidth;

    setTensRodCenterX(calculatedTensRodCenterX);


    const beads: BeadPosition[] = [];
    const actualEarthBeadHeight = beadSize * 1.0;
    const stackSpacing = beadSpacing * 0.8;

    // Calculate TENS place earth bead positions (these will become 10 beads each)
    for (let i = 0; i < tensEarthBeadsActive; i++) {
      const positionY = earthSectionStart + beadSpacing * 1.5 + i * (actualEarthBeadHeight + stackSpacing);
      const beadX = calculatedTensRodCenterX;
      const beadY = contentTop + positionY + actualEarthBeadHeight / 2;
      beads.push({
        id: `tens-earth-${i}`,
        x: beadX,
        y: beadY,
        isFromHeaven: false,
        isFromTens: true,
      });
    }

    // Calculate ONES place earth bead positions
    for (let i = 0; i < onesEarthBeadsActive; i++) {
      const positionY = earthSectionStart + beadSpacing * 1.5 + i * (actualEarthBeadHeight + stackSpacing);
      const beadX = onesRodCenterX;
      const beadY = contentTop + positionY + actualEarthBeadHeight / 2;
      beads.push({
        id: `ones-earth-${i}`,
        x: beadX,
        y: beadY,
        isFromHeaven: false,
        isFromTens: false,
      });
    }

    // Calculate ONES place heaven bead position (if active)
    if (onesHeavenBeadActive) {
      const heavenBeadActiveY = heavenSectionHeight - beadSize - beadSpacing;
      const heavenBeadHeight = beadSize * 1.1;
      setHeavenBeadPosition({
        x: onesRodCenterX,
        y: contentTop + heavenBeadActiveY + heavenBeadHeight / 2,
      });
    }


    setAllBeadPositions(beads);
    setMatchedCount(0);
    setSpawnedBeads([]);
    setFlashPositions([]);
    setBlockingBeads([]);
    hasCompletedRef.current = false;

    // Start animation sequence
    setPhase('FADING_SOROBAN');

    setTimeout(() => {
      // Decide what to do first based on what's active
      if (tensEarthBeadsActive > 0) {
        setPhase('LABELING_TENS');

        setTimeout(() => {
          setPhase('SPLITTING_TENS_EARTH');
        }, 800);
      } else if (onesHeavenBeadActive) {
        setPhase('SPLITTING_ONES_HEAVEN');
      } else {
        setPhase('MATCHING_ONES');
      }
    }, 800);

  }, [isActive, sorobanRect, objectsContainerRect, targetCount, tensHeavenBeadActive, tensEarthBeadsActive, onesHeavenBeadActive, onesEarthBeadsActive]);

  // Handle TENS earth bead split into 10 beads (double fan: 5 above, 5 below)
  const handleTensEarthSplitComplete = useCallback((beadPosition: {x: number; y: number}) => {

    const lineLength = 90;
    // 10 beads: 5 upward fan (like heaven bead), 5 downward fan (mirrored)
    const spreadBeads: BeadPosition[] = [];

    // Upper fan: 5 beads from -60° to 60° (left to right, upward arc)
    for (let i = 0; i < 5; i++) {
      const angleDeg = -60 + (i * 30); // -60, -30, 0, 30, 60
      const angleRad = (angleDeg * Math.PI) / 180;
      const endX = Math.sin(angleRad) * lineLength;
      const endY = -Math.cos(angleRad) * lineLength;

      spreadBeads.push({
        id: `tens-split-up-${i}`,
        x: beadPosition.x + endX,
        y: beadPosition.y + endY,
        isFromHeaven: false,
        isFromTens: true,
      });
    }

    // Lower fan: 5 beads from 120° to 240° (left to right, downward arc)
    // 120° = down-left, 180° = straight down, 240° = down-right
    for (let i = 0; i < 5; i++) {
      const angleDeg = 120 + (i * 30); // 120, 150, 180, 210, 240
      const angleRad = (angleDeg * Math.PI) / 180;
      const endX = Math.sin(angleRad) * lineLength;
      const endY = -Math.cos(angleRad) * lineLength;

      spreadBeads.push({
        id: `tens-split-down-${i}`,
        x: beadPosition.x + endX,
        y: beadPosition.y + endY,
        isFromHeaven: false,
        isFromTens: true,
      });
    }

    setSpawnedBeads(prev => [...prev, ...spreadBeads]);

    // After split, move to matching tens beads
    setTimeout(() => {
      setPhase('MATCHING_TENS');
    }, 100);
  }, []);

  // Handle ONES heaven bead split completion (existing 5-bead fan)
  const handleOnesHeavenSplitComplete = useCallback(() => {
    if (!heavenBeadPosition) return;


    const lineLength = 90;
    const angles = [-60, -33, 0, 33, 60];

    const spreadBeads: BeadPosition[] = [];
    for (let i = 0; i < 5; i++) {
      const angleRad = (angles[i] * Math.PI) / 180;
      const endX = Math.sin(angleRad) * lineLength;
      const endY = -Math.cos(angleRad) * lineLength;
      spreadBeads.push({
        id: `ones-heaven-${i}`,
        x: heavenBeadPosition.x + endX,
        y: heavenBeadPosition.y + endY,
        isFromHeaven: false, // These are now earth beads!
        isFromTens: false,
      });
    }

    setSpawnedBeads(spreadBeads);
    setPhase('MATCHING_ONES');
  }, [heavenBeadPosition]);

  // Handle bead arrival at object
  const handleBeadArrive = useCallback(() => {
    // Calculate the actual object index based on phase
    const tensBeadsCount = spawnedBeads.filter(b => b.isFromTens).length;
    const actualObjectIndex = phase === 'MATCHING_ONES' ? tensBeadsCount + matchedCount : matchedCount;


    // Notify parent that this object was matched (immediately) - only if there's an object to match
    if (actualObjectIndex < targetCount) {
      onObjectMatched(actualObjectIndex);

      // Haptic feedback for match
      Haptics.impact({ style: ImpactStyle.Light });

      // Add flash effect for matched object
      const targetObj = objectPositions[actualObjectIndex];
      if (targetObj) {
        setFlashPositions(prev => [...prev, { x: targetObj.x, y: targetObj.y, delay: 0 }]);
      }
    } else {
      // Extra bead - add to blocking beads array in JiJi's path
      const extraBeadIndex = actualObjectIndex - targetCount;
      const totalExtraBeads = totalBeads - targetCount;
      // JiJi flies near top of objects area
      const jijiPathY = objectsContainerRect
        ? objectsContainerRect.top + 60 // Start near top of objects area
        : window.innerHeight * 0.25;
      const jijiPathX = window.innerWidth / 2;

      // Arrange in rows if too many for one line (max 4 per row on mobile)
      const beadsPerRow = 4;
      const beadSpacing = 70;
      const rowSpacing = 70;
      const row = Math.floor(extraBeadIndex / beadsPerRow);
      const col = extraBeadIndex % beadsPerRow;
      const beadsInThisRow = Math.min(beadsPerRow, totalExtraBeads - row * beadsPerRow);
      const offsetX = (col - (beadsInThisRow - 1) / 2) * beadSpacing;
      const offsetY = row * rowSpacing;

      setBlockingBeads(prev => [...prev, { x: jijiPathX + offsetX, y: jijiPathY + offsetY }]);
    }

    setMatchedCount(prev => {
      const newCount = prev + 1;

      // Check if we've finished matching tens beads and need to transition to ones
      const tensBeadsCount = spawnedBeads.filter(b => b.isFromTens).length;

      if (phase === 'MATCHING_TENS' && newCount >= tensBeadsCount) {
        // Check if ones heaven bead needs to split first
        const onesEarthBeadsToMatch = allBeadPositions.filter(b => !b.isFromTens).length;
        const hasOnesHeaven = heavenBeadPosition !== null;

        if (hasOnesHeaven) {
          setTimeout(() => {
            setPhase('SPLITTING_ONES_HEAVEN');
          }, 300);
        } else if (onesEarthBeadsToMatch > 0) {
          setTimeout(() => {
            setMatchedCount(0); // Reset counter for ones phase
            setPhase('MATCHING_ONES');
          }, 300);
        } else {
          // No ones beads, go straight to result
          setTimeout(() => {
            if (!hasCompletedRef.current) {
              hasCompletedRef.current = true;
              const correct = totalBeads === targetCount;
              setPhase('SHOWING_RESULT');
              onShowJiJi(correct);
              setTimeout(() => {
                setPhase('COMPLETE');
                if (correct) {
                  sounds.ding();
                }
                onComplete(correct);
              }, correct ? 2500 : 1500);
            }
          }, 300);
        }
        return newCount;
      }

      // During MATCHING_ONES, check if all beads used
      const allBeadsUsed = phase === 'MATCHING_ONES' && newCount >= currentBeads.length;

      if (allBeadsUsed) {
        // All beads used - show result
        setTimeout(() => {
          if (!hasCompletedRef.current) {
            hasCompletedRef.current = true;
            const correct = totalBeads === targetCount;
            setPhase('SHOWING_RESULT');

            // Play success sound and update score at midpoint of JiJi's journey (1 second in)
            if (correct) {
              setTimeout(() => {
                sounds.ding();
                onComplete(correct); // Update score immediately
              }, 1000);
            }
            // Failure sound is triggered by JiJi component when it hits obstacle

            // Trigger JiJi animation
            onShowJiJi(correct);

            // Complete phase after JiJi animation
            setTimeout(() => {
              setPhase('COMPLETE');
              if (!correct) {
                onComplete(correct); // For incorrect, call onComplete here
              }
            }, correct ? 2500 : 1500);
          }
        }, 300);
      }

      return newCount;
    });
  }, [totalBeads, targetCount, onComplete, onShowJiJi, onObjectMatched, matchedCount, objectPositions, phase, spawnedBeads, allBeadPositions]);

  // Reset when deactivated
  useEffect(() => {
    if (!isActive) {
      setPhase('IDLE');
      setMatchedCount(0);
      setAllBeadPositions([]);
      setHeavenBeadPosition(null);
      setSpawnedBeads([]);
      setObjectPositions([]);
      setFlashPositions([]);
      setBlockingBeads([]);
      hasCompletedRef.current = false;
    }
  }, [isActive]);

  if (!isActive || phase === 'IDLE') {
    return null;
  }

  const beadSize = 42;
  // During MATCHING_TENS, use only the 10 spawned tens beads
  // During MATCHING_ONES, use spawned ones beads (from heaven split) + ones earth beads
  const currentBeads = phase === 'MATCHING_TENS'
    ? spawnedBeads.filter(b => b.isFromTens)
    : (phase === 'MATCHING_ONES'
        ? [...spawnedBeads.filter(b => !b.isFromTens), ...allBeadPositions.filter(b => !b.isFromTens)]
        : [...spawnedBeads, ...allBeadPositions]);

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
        {/* Static beads during FADING_SOROBAN - earth beads */}
        {phase === 'FADING_SOROBAN' && allBeadPositions.map((bead) => (
          <StaticBead
            key={`static-${bead.id}`}
            x={bead.x}
            y={bead.y}
            beadSize={beadSize}
            isHeaven={bead.isFromHeaven}
          />
        ))}

        {/* Static heaven bead during FADING_SOROBAN */}
        {phase === 'FADING_SOROBAN' && heavenBeadPosition && (
          <StaticBead
            x={heavenBeadPosition.x}
            y={heavenBeadPosition.y}
            beadSize={beadSize}
            isHeaven={true}
          />
        )}

        {/* LABELING_TENS: ×10 rises from frame to bead */}
        {phase === 'LABELING_TENS' && (() => {
          if (!sorobanRect) return null;

          // Use calculated positions from DOM query
          const tensFrameX = tensRodCenterX;
          const frameBottomY = frameLabelCenterY;

          return (
            <>
              {/* Pulse the frame ×10 label */}
              <motion.div
                animate={{
                  scale: [1, 1.3, 1],
                  opacity: [1, 0.7, 1]
                }}
                transition={{
                  duration: 0.4,
                  times: [0, 0.5, 1],
                  repeat: 1
                }}
                style={{
                  position: 'fixed',
                  left: tensFrameX,
                  top: frameBottomY,
                  fontSize: 10,
                  fontWeight: '700',
                  color: '#FFF8E7',
                  textShadow: '0 1px 2px rgba(0,0,0,0.4), 0 0 8px rgba(255,255,255,0.8)',
                  zIndex: 1002,
                  pointerEvents: 'none',
                  marginLeft: '-5px', // Half of approximate text width to center
                  marginTop: '-7px',  // Half of fontSize + some spacing
                }}
              >
                ×10
              </motion.div>

              {/* Rising ×10 labels */}
              {allBeadPositions.map((bead) => (
            <div key={`labeled-${bead.id}`} style={{ position: 'relative' }}>
              <StaticBead
                x={bead.x}
                y={bead.y}
                beadSize={beadSize}
                isHeaven={false}
              />
              {/* Animated ×10 label rises from frame to bead (tens only) */}
              {bead.isFromTens && (
                <motion.div
                  initial={{
                    left: bead.x,
                    top: frameBottomY,
                    opacity: 0,
                    scale: 0.8
                  }}
                  animate={{
                    left: bead.x,
                    top: bead.y + 30, // Below the bead
                    opacity: 1,
                    scale: [0.8, 1.2, 1.0] // Pulse on arrival
                  }}
                  transition={{
                    duration: 0.5,
                    scale: {
                      times: [0, 0.8, 1],
                      duration: 0.5
                    }
                  }}
                  style={{
                    position: 'fixed',
                    transform: 'translate(-50%, -50%)',
                    fontSize: 16,
                    fontWeight: '900',
                    color: '#2D1810',
                    textShadow: '0 0 4px rgba(255,255,255,0.8), 0 0 8px rgba(255,255,255,0.6)',
                    zIndex: 1001,
                    pointerEvents: 'none',
                  }}
                >
                  ×10
                </motion.div>
              )}
            </div>
          ))}
            </>
          );
        })()}

        {/* Show heaven bead during LABELING_TENS if present */}
        {phase === 'LABELING_TENS' && heavenBeadPosition && (
          <StaticBead
            x={heavenBeadPosition.x}
            y={heavenBeadPosition.y}
            beadSize={beadSize}
            isHeaven={true}
          />
        )}

        {/* ONES Heaven bead splitting animation (original 5-bead fan) */}
        {phase === 'SPLITTING_ONES_HEAVEN' && heavenBeadPosition && (() => {
          const angles = [-60, -33, 0, 33, 60];
          const lineLength = 90;
          // Earth bead dimensions (what the split beads will be)
          const beadWidth = beadSize * 1.6;
          const beadHeight = beadSize * 1.0;
          // Heaven bead dimensions (for the fading bead)
          const heavenBeadWidth = beadSize * 1.7;
          const heavenBeadHeight = beadSize * 1.1;

          return (
            <>
              {/* Fading heaven bead - kite shaped */}
              <motion.div
                style={{
                  position: 'fixed',
                  left: heavenBeadPosition.x,
                  top: heavenBeadPosition.y,
                  width: heavenBeadWidth,
                  height: heavenBeadHeight,
                  marginLeft: -heavenBeadWidth / 2,
                  marginTop: -heavenBeadHeight / 2,
                  zIndex: 1001,
                }}
                initial={{ scale: 1, opacity: 1 }}
                animate={{ scale: 0.5, opacity: 0 }}
                transition={{ duration: 0.3, delay: 0.4 }}
              >
                <svg
                  width={heavenBeadWidth}
                  height={heavenBeadHeight}
                  viewBox={`0 0 ${heavenBeadWidth} ${heavenBeadHeight}`}
                  style={{
                    filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))',
                  }}
                >
                  <defs>
                    <linearGradient id="fading-heaven-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#CD853F" />
                      <stop offset="100%" stopColor="#8B5A2B" />
                    </linearGradient>
                    <radialGradient id="fading-heaven-hole">
                      <stop offset="0%" stopColor="#1A0F0A" />
                      <stop offset="100%" stopColor="#2D1810" />
                    </radialGradient>
                  </defs>
                  <path
                    d={`
                      M ${heavenBeadWidth / 2} 2
                      L ${heavenBeadWidth - 4} ${heavenBeadHeight / 2}
                      L ${heavenBeadWidth / 2} ${heavenBeadHeight - 2}
                      L 4 ${heavenBeadHeight / 2}
                      Z
                    `}
                    fill="url(#fading-heaven-grad)"
                    stroke="rgba(0,0,0,0.3)"
                    strokeWidth="1"
                  />
                  <circle
                    cx={heavenBeadWidth / 2}
                    cy={heavenBeadHeight / 2}
                    r={beadSize * 0.12}
                    fill="url(#fading-heaven-hole)"
                    stroke="rgba(0,0,0,0.5)"
                    strokeWidth="1"
                  />
                </svg>
              </motion.div>

              {/* Fan lines and beads */}
              {angles.map((angleDeg, i) => {
                const angleRad = (angleDeg * Math.PI) / 180;
                const endX = Math.sin(angleRad) * lineLength;
                const endY = -Math.cos(angleRad) * lineLength;

                return (
                  <div key={`split-${i}`}>
                    {/* Line */}
                    <motion.div
                      style={{
                        position: 'fixed',
                        left: heavenBeadPosition.x,
                        top: heavenBeadPosition.y,
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

                    {/* Bead at end - kite shaped */}
                    <motion.div
                      style={{
                        position: 'fixed',
                        left: heavenBeadPosition.x + endX,
                        top: heavenBeadPosition.y + endY,
                        width: beadWidth,
                        height: beadHeight,
                        marginLeft: -beadWidth / 2,
                        marginTop: -beadHeight / 2,
                        zIndex: 1000,
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
                      onAnimationComplete={i === 4 ? () => {
                        const spreadBeads: BeadPosition[] = [];
                        for (let j = 0; j < 5; j++) {
                          const angleDeg = angles[j];
                          const angleRad = (angleDeg * Math.PI) / 180;
                          const endX = Math.sin(angleRad) * lineLength;
                          const endY = -Math.cos(angleRad) * lineLength;
                          spreadBeads.push({
                            id: `ones-split-${j}`,
                            x: heavenBeadPosition.x + endX,
                            y: heavenBeadPosition.y + endY,
                            isFromHeaven: false, // These are earth beads (came from heaven, but ARE earth)
                            isFromTens: false,
                          });
                        }
                        setSpawnedBeads(prev => [...prev, ...spreadBeads]);
                        setMatchedCount(0); // Reset for ones matching
                        setPhase('MATCHING_ONES');
                      } : undefined}
                    >
                      <svg
                        width={beadWidth}
                        height={beadHeight}
                        viewBox={`0 0 ${beadWidth} ${beadHeight}`}
                        style={{
                          filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))',
                        }}
                      >
                        <defs>
                          <linearGradient id={`split-bead-${i}`} x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#DAA520" />
                            <stop offset="100%" stopColor="#B8860B" />
                          </linearGradient>
                          <radialGradient id={`split-hole-${i}`}>
                            <stop offset="0%" stopColor="#1A0F0A" />
                            <stop offset="100%" stopColor="#2D1810" />
                          </radialGradient>
                        </defs>
                        <path
                          d={`
                            M ${beadWidth / 2} 2
                            L ${beadWidth - 4} ${beadHeight / 2}
                            L ${beadWidth / 2} ${beadHeight - 2}
                            L 4 ${beadHeight / 2}
                            Z
                          `}
                          fill={`url(#split-bead-${i})`}
                          stroke="rgba(0,0,0,0.3)"
                          strokeWidth="1"
                        />
                        <circle
                          cx={beadWidth / 2}
                          cy={beadHeight / 2}
                          r={beadSize * 0.12}
                          fill={`url(#split-hole-${i})`}
                          stroke="rgba(0,0,0,0.5)"
                          strokeWidth="1"
                        />
                      </svg>
                    </motion.div>
                  </div>
                );
              })}

              {/* Static ones earth beads during heaven split (not tens beads) */}
              {allBeadPositions.filter(b => !b.isFromTens).map((bead) => (
                <StaticBead
                  key={`splitting-ones-${bead.id}`}
                  x={bead.x}
                  y={bead.y}
                  beadSize={beadSize}
                  isHeaven={false}
                />
              ))}
            </>
          );
        })()}

        {/* SPLITTING_TENS_EARTH: Double fan (5 above, 5 below) */}
        {phase === 'SPLITTING_TENS_EARTH' && allBeadPositions.filter(b => b.isFromTens).map((tensBead) => {
          const lineLength = 90;
          const beadWidth = beadSize * 1.6;
          const beadHeight = beadSize * 1.0;

          // 10 beads total: 5 upward fan, 5 downward fan
          const upperAngles = [-60, -30, 0, 30, 60];
          const lowerAngles = [120, 150, 180, 210, 240];
          const allAngles = [...upperAngles, ...lowerAngles];

          return (
            <div key={`tens-split-${tensBead.id}`}>
              {/* Fading ×10 label */}
              <motion.div
                initial={{ opacity: 1, scale: 1 }}
                animate={{ opacity: 0, scale: 0.5 }}
                transition={{ duration: 0.4 }}
                style={{
                  position: 'fixed',
                  left: tensBead.x,
                  top: tensBead.y,
                  transform: 'translate(-50%, -50%)',
                  fontSize: 16,
                  fontWeight: '900',
                  color: '#2D1810',
                  zIndex: 1001,
                }}
              >
                ×10
              </motion.div>

              {/* Fading tens earth bead */}
              <motion.div
                style={{
                  position: 'fixed',
                  left: tensBead.x,
                  top: tensBead.y,
                  width: beadWidth,
                  height: beadHeight,
                  marginLeft: -beadWidth / 2,
                  marginTop: -beadHeight / 2,
                  zIndex: 1001,
                }}
                initial={{ scale: 1, opacity: 1 }}
                animate={{ scale: 0.5, opacity: 0 }}
                transition={{ duration: 0.3, delay: 0.4 }}
              >
                <svg width={beadWidth} height={beadHeight} viewBox={`0 0 ${beadWidth} ${beadHeight}`}>
                  <defs>
                    <linearGradient id="fading-tens-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#DAA520" />
                      <stop offset="100%" stopColor="#B8860B" />
                    </linearGradient>
                  </defs>
                  <path
                    d={`M ${beadWidth / 2} 2 L ${beadWidth - 4} ${beadHeight / 2} L ${beadWidth / 2} ${beadHeight - 2} L 4 ${beadHeight / 2} Z`}
                    fill="url(#fading-tens-grad)"
                    stroke="rgba(0,0,0,0.3)"
                    strokeWidth="1"
                  />
                </svg>
              </motion.div>

              {/* Fan lines and beads in 360° */}
              {allAngles.map((angleDeg, i) => {
                const angleRad = (angleDeg * Math.PI) / 180;
                const endX = Math.sin(angleRad) * lineLength;
                const endY = -Math.cos(angleRad) * lineLength;
                const isLastBead = i === allAngles.length - 1;

                return (
                  <div key={`tens-fan-${i}`}>
                    {/* Line */}
                    <motion.div
                      style={{
                        position: 'fixed',
                        left: tensBead.x,
                        top: tensBead.y,
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
                        height: { duration: 0.25, delay: 0.4 + i * 0.03 },
                        y: { duration: 0.25, delay: 0.4 + i * 0.03 },
                        opacity: { duration: 0.6, delay: 0.4 + i * 0.03, times: [0, 0.7, 1] },
                      }}
                    />

                    {/* Bead at end */}
                    <motion.div
                      style={{
                        position: 'fixed',
                        left: tensBead.x + endX,
                        top: tensBead.y + endY,
                        width: beadWidth,
                        height: beadHeight,
                        marginLeft: -beadWidth / 2,
                        marginTop: -beadHeight / 2,
                        zIndex: 1000,
                      }}
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{
                        duration: 0.2,
                        delay: 0.6 + i * 0.03,
                        type: 'spring',
                        stiffness: 400,
                        damping: 25,
                      }}
                      onAnimationComplete={isLastBead ? () => handleTensEarthSplitComplete(tensBead) : undefined}
                    >
                      <svg width={beadWidth} height={beadHeight} viewBox={`0 0 ${beadWidth} ${beadHeight}`}>
                        <defs>
                          <linearGradient id={`tens-split-bead-${i}`} x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#DAA520" />
                            <stop offset="100%" stopColor="#B8860B" />
                          </linearGradient>
                        </defs>
                        <path
                          d={`M ${beadWidth / 2} 2 L ${beadWidth - 4} ${beadHeight / 2} L ${beadWidth / 2} ${beadHeight - 2} L 4 ${beadHeight / 2} Z`}
                          fill={`url(#tens-split-bead-${i})`}
                          stroke="rgba(0,0,0,0.3)"
                          strokeWidth="1"
                        />
                        <circle
                          cx={beadWidth / 2}
                          cy={beadHeight / 2}
                          r={beadSize * 0.12}
                          fill="#1A0F0A"
                          stroke="rgba(0,0,0,0.5)"
                          strokeWidth="1"
                        />
                      </svg>
                    </motion.div>
                  </div>
                );
              })}

              {/* Show other beads (ones place) during tens split */}
              {allBeadPositions.filter(b => !b.isFromTens).map((bead) => (
                <StaticBead
                  key={`other-${bead.id}`}
                  x={bead.x}
                  y={bead.y}
                  beadSize={beadSize}
                  isHeaven={false}
                />
              ))}
              {heavenBeadPosition && (
                <StaticBead
                  x={heavenBeadPosition.x}
                  y={heavenBeadPosition.y}
                  beadSize={beadSize}
                  isHeaven={true}
                />
              )}
            </div>
          );
        })}

        {/* Static beads during MATCHING_TENS (render order: ones first, tens second for correct z-index) */}
        {phase === 'MATCHING_TENS' && (
          <>
            {/* All ones beads (not yet their turn) - render first (behind tens beads) */}
            {allBeadPositions.filter(b => !b.isFromTens).map((bead) => (
              <StaticBead
                key={`waiting-ones-${bead.id}`}
                x={bead.x}
                y={bead.y}
                beadSize={beadSize}
                isHeaven={bead.isFromHeaven}
              />
            ))}
            {/* Ones heaven bead if present (only during MATCHING_TENS, will split before MATCHING_ONES) */}
            {heavenBeadPosition && phase === 'MATCHING_TENS' && (
              <StaticBead
                key="waiting-ones-heaven-tens"
                x={heavenBeadPosition.x}
                y={heavenBeadPosition.y}
                beadSize={beadSize}
                isHeaven={true}
              />
            )}
            {/* Waiting tens beads - render last (on top) */}
            {currentBeads.map((bead, index) => {
              if (index < matchedCount) return null; // Already animated
              if (index === matchedCount) return null; // Currently animating

              return (
                <StaticBead
                  key={`waiting-tens-${bead.id}`}
                  x={bead.x}
                  y={bead.y}
                  beadSize={beadSize}
                  isHeaven={bead.isFromHeaven}
                />
              );
            })}
          </>
        )}

        {/* Flying bead animation - TENS */}
        {phase === 'MATCHING_TENS' && (() => {
          const bead = currentBeads[matchedCount];
          if (!bead || matchedCount >= currentBeads.length) {
            return null;
          }

          // Tens beads map directly to object indices (0, 1, 2, ...)
          const objectIndex = matchedCount;
          const targetObj = objectPositions[objectIndex];
          if (targetObj) {
            return (
              <GhostBead
                key={`flying-${bead.id}-${matchedCount}`}
                startX={bead.x}
                startY={bead.y}
                endX={targetObj.x}
                endY={targetObj.y}
                delay={0.3}
                onArrive={handleBeadArrive}
                beadSize={beadSize}
              />
            );
          } else {
            // Extra bead - fly to blocking position in front of JiJi
            const extraBeadIndex = matchedCount - targetCount;
            const totalExtraBeads = totalBeads - targetCount;
            // Position at top of objects area (where object grid starts) to avoid overlapping soroban
            const jijiPathY = objectsContainerRect
              ? objectsContainerRect.top + 60 // Start near top of objects area
              : window.innerHeight * 0.25;
            const jijiPathX = window.innerWidth / 2;

            // Arrange in rows (max 4 per row, up to 4 rows for 15 extra beads)
            const beadsPerRow = 4;
            const beadSpacing = 70;
            const rowSpacing = 70;
            const row = Math.floor(extraBeadIndex / beadsPerRow);
            const col = extraBeadIndex % beadsPerRow;
            const beadsInThisRow = Math.min(beadsPerRow, totalExtraBeads - row * beadsPerRow);
            const offsetX = (col - (beadsInThisRow - 1) / 2) * beadSpacing;
            const offsetY = row * rowSpacing;

            return (
              <GhostBead
                key={`flying-${bead.id}-${matchedCount}`}
                startX={bead.x}
                startY={bead.y}
                endX={jijiPathX + offsetX}
                endY={jijiPathY + offsetY}
                delay={0.3}
                onArrive={handleBeadArrive}
                beadSize={beadSize}
              />
            );
          }
        })()}

        {/* Static beads during MATCHING_ONES (waiting ones beads + heaven bead) */}
        {phase === 'MATCHING_ONES' && (
          <>
            {currentBeads.map((bead, index) => {
              if (index < matchedCount) return null; // Already animated
              if (index === matchedCount) return null; // Currently animating

              return (
                <StaticBead
                  key={`waiting-ones-${bead.id}`}
                  x={bead.x}
                  y={bead.y}
                  beadSize={beadSize}
                  isHeaven={bead.isFromHeaven}
                />
              );
            })}
            {/* Heaven bead already split by this phase, no need to show it */}
          </>
        )}

        {/* Flying bead animation - ONES */}
        {phase === 'MATCHING_ONES' && (() => {
          const bead = currentBeads[matchedCount];
          if (!bead || matchedCount >= currentBeads.length) {
            return null;
          }

          // Ones beads start after tens beads in object list
          const tensBeadsCount = spawnedBeads.filter(b => b.isFromTens).length;
          const objectIndex = tensBeadsCount + matchedCount;
          const targetObj = objectPositions[objectIndex];

          if (targetObj) {
            return (
              <GhostBead
                key={`flying-ones-${bead.id}-${matchedCount}`}
                startX={bead.x}
                startY={bead.y}
                endX={targetObj.x}
                endY={targetObj.y}
                delay={0.3}
                onArrive={handleBeadArrive}
                beadSize={beadSize}
              />
            );
          } else {
            // Extra bead - fly to blocking position in front of JiJi
            const extraBeadIndex = objectIndex - targetCount;
            const totalExtraBeads = totalBeads - targetCount;
            const jijiPathY = objectsContainerRect
              ? objectsContainerRect.top + 60 // Start near top of objects area
              : window.innerHeight * 0.25;
            const jijiPathX = window.innerWidth / 2;

            const beadsPerRow = 4;
            const beadSpacing = 70;
            const rowSpacing = 70;
            const row = Math.floor(extraBeadIndex / beadsPerRow);
            const col = extraBeadIndex % beadsPerRow;
            const beadsInThisRow = Math.min(beadsPerRow, totalExtraBeads - row * beadsPerRow);
            const offsetX = (col - (beadsInThisRow - 1) / 2) * beadSpacing;
            const offsetY = row * rowSpacing;

            return (
              <GhostBead
                key={`flying-ones-${bead.id}-${matchedCount}`}
                startX={bead.x}
                startY={bead.y}
                endX={jijiPathX + offsetX}
                endY={jijiPathY + offsetY}
                delay={0.3}
                onArrive={handleBeadArrive}
                beadSize={beadSize}
              />
            );
          }
        })()}

        {/* Flash effects */}
        {flashPositions.map((flash, i) => (
          <MatchFlash key={`flash-${i}`} x={flash.x} y={flash.y} delay={flash.delay} />
        ))}

        {/* Blocking beads (extra beads that stay visible in JiJi's path) */}
        {blockingBeads.map((pos, i) => (
          <motion.div
            key={`blocking-${i}`}
            initial={{ opacity: 1 }}
            animate={{ opacity: 1 }}
            style={{
              position: 'fixed',
              left: pos.x,
              top: pos.y,
              width: beadSize * 1.6,
              height: beadSize * 1.0,
              marginLeft: -(beadSize * 1.6) / 2,
              marginTop: -(beadSize * 1.0) / 2,
              zIndex: 999,
              transition: 'filter 0.2s ease-in-out',
              filter: showBlockingGlow
                ? 'drop-shadow(0 0 20px rgba(255, 0, 0, 1)) drop-shadow(0 0 40px rgba(255, 0, 0, 0.8)) drop-shadow(0 0 60px rgba(255, 0, 0, 0.6))'
                : 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))',
            }}
          >
            <svg
              width={beadSize * 1.6}
              height={beadSize * 1.0}
              viewBox={`0 0 ${beadSize * 1.6} ${beadSize * 1.0}`}
            >
              <defs>
                <linearGradient id={`blocking-bead-${i}`} x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#DAA520" />
                  <stop offset="100%" stopColor="#B8860B" />
                </linearGradient>
                <radialGradient id={`blocking-hole-${i}`}>
                  <stop offset="0%" stopColor="#1A0F0A" />
                  <stop offset="100%" stopColor="#2D1810" />
                </radialGradient>
              </defs>
              <path
                d={`
                  M ${(beadSize * 1.6) / 2} 2
                  L ${beadSize * 1.6 - 4} ${(beadSize * 1.0) / 2}
                  L ${(beadSize * 1.6) / 2} ${beadSize * 1.0 - 2}
                  L 4 ${(beadSize * 1.0) / 2}
                  Z
                `}
                fill={`url(#blocking-bead-${i})`}
                stroke="rgba(0,0,0,0.3)"
                strokeWidth="1"
              />
              <circle
                cx={(beadSize * 1.6) / 2}
                cy={(beadSize * 1.0) / 2}
                r={beadSize * 0.12}
                fill={`url(#blocking-hole-${i})`}
                stroke="rgba(0,0,0,0.5)"
                strokeWidth="1"
              />
            </svg>
          </motion.div>
        ))}
      </motion.div>
    </AnimatePresence>
  );
}
