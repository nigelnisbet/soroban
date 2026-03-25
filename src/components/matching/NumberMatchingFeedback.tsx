import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { SIZES } from '../../models/types';
import { sounds } from '../../utils/sounds';

const VERSION = 'v1.0.0';

type AnimationPhase =
  | 'IDLE'
  | 'FADING_SOROBAN'    // Soroban frame fades, beads remain visible
  | 'SPLITTING_HEAVEN'  // Heaven bead splits into 5 earth beads (fan animation)
  | 'MATCHING'          // Beads fly to objects one by one
  | 'SHOWING_RESULT'    // JiJi flies or gets blocked
  | 'COMPLETE';

interface BeadPosition {
  id: string;
  x: number;
  y: number;
  isFromHeaven: boolean;
}

interface NumberMatchingFeedbackProps {
  isActive: boolean;
  targetCount: number;         // Number of objects to match
  heavenBeadActive: boolean;
  earthBeadsActive: number;
  sorobanRect: DOMRect | null;
  objectsContainerRect: DOMRect | null;
  onComplete: (isCorrect: boolean) => void;
  onShowJiJi: (flying: boolean) => void; // Callback to trigger JiJi animation
  onObjectMatched: (index: number) => void; // Callback when object is matched
  showBlockingGlow: boolean; // Show red glow on blocking beads
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

export function NumberMatchingFeedback({
  isActive,
  targetCount,
  heavenBeadActive,
  earthBeadsActive,
  sorobanRect,
  objectsContainerRect,
  onComplete,
  onShowJiJi,
  onObjectMatched,
  showBlockingGlow,
}: NumberMatchingFeedbackProps) {
  const [phase, setPhase] = useState<AnimationPhase>('IDLE');
  const [matchedCount, setMatchedCount] = useState(0);
  const [allBeadPositions, setAllBeadPositions] = useState<BeadPosition[]>([]);
  const [heavenBeadPosition, setHeavenBeadPosition] = useState<{x: number; y: number} | null>(null);
  const [spawnedBeads, setSpawnedBeads] = useState<BeadPosition[]>([]);
  const [objectPositions, setObjectPositions] = useState<{x: number; y: number}[]>([]);
  const [flashPositions, setFlashPositions] = useState<{x: number; y: number; delay: number}[]>([]);
  const [blockingBeads, setBlockingBeads] = useState<{x: number; y: number}[]>([]);
  const hasCompletedRef = useRef(false);

  const totalBeads = (heavenBeadActive ? 5 : 0) + earthBeadsActive;

  useEffect(() => {
    // Component loaded
  }, []);

  // Calculate positions when activated
  useEffect(() => {
    if (!isActive || !sorobanRect || !objectsContainerRect) {
      setPhase('IDLE');
      return;
    }


    // Calculate object positions (grid layout)
    const getGridLayout = (count: number) => {
      if (count <= 3) return { cols: count, rows: 1 };
      if (count <= 6) return { cols: 3, rows: 2 };
      return { cols: 3, rows: 3 };
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
    const rodCenterX = sorobanRect.left + sorobanRect.width / 2;

    const beads: BeadPosition[] = [];

    // Earth beads - using CURRENT kite bead dimensions
    const actualEarthBeadHeight = beadSize * 1.0; // Match SorobanRod.tsx line 63
    const stackSpacing = beadSpacing * 0.8;
    for (let i = 0; i < earthBeadsActive; i++) {
      const positionY = earthSectionStart + beadSpacing * 1.5 + i * (actualEarthBeadHeight + stackSpacing);
      beads.push({
        id: `earth-${i}`,
        x: rodCenterX,
        y: contentTop + positionY + actualEarthBeadHeight / 2,
        isFromHeaven: false,
      });
    }

    // Heaven bead (for splitting) - using CURRENT kite bead positioning
    if (heavenBeadActive) {
      const heavenBeadActiveY = heavenSectionHeight - beadSize - beadSpacing; // Match SorobanRod.tsx line 56
      const heavenBeadHeight = beadSize * 1.1; // Current heaven bead height from Bead.tsx
      setHeavenBeadPosition({
        x: rodCenterX,
        y: contentTop + heavenBeadActiveY + heavenBeadHeight / 2,
      });
    }

    setAllBeadPositions(beads);
    setMatchedCount(0);
    setSpawnedBeads([]);
    setFlashPositions([]);
    setBlockingBeads([]);
    hasCompletedRef.current = false;

    // Start animation
    setPhase('FADING_SOROBAN');

    setTimeout(() => {
      if (heavenBeadActive) {
        setPhase('SPLITTING_HEAVEN');
      } else {
        setPhase('MATCHING');
      }
    }, 800);

  }, [isActive, sorobanRect, objectsContainerRect, targetCount, heavenBeadActive, earthBeadsActive]);

  // Handle heaven bead split completion
  const handleSplitComplete = useCallback(() => {
    if (!heavenBeadPosition) return;


    const lineLength = 90;
    const angles = [-60, -33, 0, 33, 60];

    const spreadBeads: BeadPosition[] = [];
    for (let i = 0; i < 5; i++) {
      const angleRad = (angles[i] * Math.PI) / 180;
      const endX = Math.sin(angleRad) * lineLength;
      const endY = -Math.cos(angleRad) * lineLength;
      spreadBeads.push({
        id: `heaven-${i}`,
        x: heavenBeadPosition.x + endX,
        y: heavenBeadPosition.y + endY,
        isFromHeaven: false, // These are now earth beads!
      });
    }

    setSpawnedBeads(spreadBeads);
    setPhase('MATCHING');
  }, [heavenBeadPosition]);

  // Handle bead arrival at object
  const handleBeadArrive = useCallback(() => {
    const currentIndex = matchedCount;

    // Notify parent that this object was matched (immediately) - only if there's an object to match
    if (currentIndex < targetCount) {
      onObjectMatched(currentIndex);

      // Haptic feedback for match
      Haptics.impact({ style: ImpactStyle.Light });

      // Add flash effect for matched object
      const targetObj = objectPositions[currentIndex];
      if (targetObj) {
        setFlashPositions(prev => [...prev, { x: targetObj.x, y: targetObj.y, delay: 0 }]);
      }
    } else {
      // Extra bead - add to blocking beads array in JiJi's path
      const extraBeadIndex = currentIndex - targetCount;
      const totalExtraBeads = totalBeads - targetCount;
      // JiJi flies through middle of objects area
      const jijiPathY = objectsContainerRect
        ? objectsContainerRect.top + objectsContainerRect.height / 2
        : window.innerHeight * 0.30;
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

      // Check if this was the last bead
      const allBeadsUsed = newCount >= totalBeads;

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
  }, [totalBeads, targetCount, onComplete, onShowJiJi, onObjectMatched, matchedCount, objectPositions]);

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
  const currentBeads = [...spawnedBeads, ...allBeadPositions];

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

        {/* Heaven bead splitting animation */}
        {phase === 'SPLITTING_HEAVEN' && heavenBeadPosition && (() => {
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
                      onAnimationComplete={i === 4 ? handleSplitComplete : undefined}
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

              {/* Static earth beads during split */}
              {allBeadPositions.map((bead) => (
                <StaticBead
                  key={`splitting-${bead.id}`}
                  x={bead.x}
                  y={bead.y}
                  beadSize={beadSize}
                  isHeaven={bead.isFromHeaven}
                />
              ))}
            </>
          );
        })()}

        {/* Static beads during MATCHING (ones not yet animated) */}
        {phase === 'MATCHING' && currentBeads.map((bead, index) => {
          if (index < matchedCount) return null; // Already animated
          if (index === matchedCount) return null; // Currently animating

          return (
            <StaticBead
              key={`waiting-${bead.id}`}
              x={bead.x}
              y={bead.y}
              beadSize={beadSize}
              isHeaven={bead.isFromHeaven}
            />
          );
        })}

        {/* Flying bead animation */}
        {phase === 'MATCHING' && (() => {
          const bead = currentBeads[matchedCount];
          if (!bead || matchedCount >= totalBeads) return null;

          // If there's an object to match, fly to it
          const targetObj = objectPositions[matchedCount];
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
            // Extra bead - fly to JiJi's path (middle of objects area)
            const extraBeadIndex = matchedCount - targetCount;
            const totalExtraBeads = totalBeads - targetCount;
            // JiJi flies through middle of objects area
            const jijiPathY = objectsContainerRect
              ? objectsContainerRect.top + objectsContainerRect.height / 2
              : window.innerHeight * 0.30;
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
