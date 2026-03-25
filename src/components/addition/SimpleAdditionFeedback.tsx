import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

type AnimationPhase =
  | 'IDLE'
  | 'FADING_SOROBAN'
  | 'SPLITTING_HEAVEN'
  | 'FLYING_BEADS'
  | 'COMPLETE';

interface BeadPosition {
  id: string;
  x: number;
  y: number;
  isFromHeaven: boolean;
}

interface SimpleAdditionFeedbackProps {
  isActive: boolean;
  heavenBeadActive: boolean;
  earthBeadsActive: number;
  sorobanRect: DOMRect | null;
  countingBoxRect: DOMRect | null;
  onComplete: () => void;
  onBeadArrived: (count: number) => void;
}

// Static bead component
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

// Flying bead component
function FlyingBead({
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
        x: { duration: 0.5, delay, ease: [0.4, 0, 0.2, 1] },
        y: { duration: 0.5, delay, ease: [0.4, 0, 0.2, 1] },
        scale: { duration: 0.5, delay, times: [0, 0.2, 0.8, 0.95, 1] },
        opacity: { duration: 0.5, delay, times: [0, 0.2, 0.8, 0.95, 1] },
      }}
      onAnimationComplete={onArrive}
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
          <linearGradient id={`flying-bead-grad-${isHeaven}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={activeColor} />
            <stop offset="100%" stopColor={activeGradientEnd} />
          </linearGradient>
          <radialGradient id="flying-hole-gradient">
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
          fill={`url(#flying-bead-grad-${isHeaven})`}
          stroke="rgba(0,0,0,0.3)"
          strokeWidth="1"
        />
        <circle
          cx={beadWidth / 2}
          cy={beadHeight / 2}
          r={beadSize * 0.12}
          fill="url(#flying-hole-gradient)"
          stroke="rgba(0,0,0,0.5)"
          strokeWidth="1"
        />
      </svg>
    </motion.div>
  );
}

export function SimpleAdditionFeedback({
  isActive,
  heavenBeadActive,
  earthBeadsActive,
  sorobanRect,
  countingBoxRect,
  onComplete,
  onBeadArrived,
}: SimpleAdditionFeedbackProps) {
  const [phase, setPhase] = useState<AnimationPhase>('IDLE');
  const [flyingCount, setFlyingCount] = useState(0);
  const [allBeadPositions, setAllBeadPositions] = useState<BeadPosition[]>([]);
  const [heavenBeadPosition, setHeavenBeadPosition] = useState<{x: number; y: number} | null>(null);
  const [spawnedBeads, setSpawnedBeads] = useState<BeadPosition[]>([]);
  const hasCompletedRef = useRef(false);

  const totalBeads = (heavenBeadActive ? 5 : 0) + earthBeadsActive;

  useEffect(() => {
    if (!isActive || !sorobanRect || !countingBoxRect) {
      setPhase('IDLE');
      return;
    }

    // Calculate bead positions from soroban
    const beadSize = 42;
    const beadSpacing = 7;
    const framePadding = 14;
    const borderWidth = 4;

    const heavenSectionHeight = beadSize * 2.0 + beadSpacing * 3;
    const dividerHeight = 16;
    const earthSectionStart = heavenSectionHeight + dividerHeight;

    const contentTop = sorobanRect.top + borderWidth + framePadding;
    const rodCenterX = sorobanRect.left + sorobanRect.width / 2;

    const beads: BeadPosition[] = [];

    // Earth beads
    const actualEarthBeadHeight = beadSize * 1.0;
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

    // Heaven bead (for splitting)
    if (heavenBeadActive) {
      const heavenBeadActiveY = heavenSectionHeight - beadSize - beadSpacing;
      const heavenBeadHeight = beadSize * 1.1;
      setHeavenBeadPosition({
        x: rodCenterX,
        y: contentTop + heavenBeadActiveY + heavenBeadHeight / 2,
      });
    }

    setAllBeadPositions(beads);
    setFlyingCount(0);
    setSpawnedBeads([]);
    hasCompletedRef.current = false;

    // Start animation
    setPhase('FADING_SOROBAN');

    setTimeout(() => {
      if (heavenBeadActive) {
        setPhase('SPLITTING_HEAVEN');
      } else {
        setPhase('FLYING_BEADS');
      }
    }, 800);

  }, [isActive, sorobanRect, countingBoxRect, heavenBeadActive, earthBeadsActive]);

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
        isFromHeaven: false,
      });
    }

    setSpawnedBeads(spreadBeads);
    setPhase('FLYING_BEADS');
  }, [heavenBeadPosition]);

  // Handle bead arrival at counting box
  const handleBeadArrive = useCallback(() => {
    const currentIndex = flyingCount;
    const newCount = currentIndex + 1;

    // Notify parent
    onBeadArrived(newCount);

    setFlyingCount(newCount);

    // Check if all beads have flown
    if (newCount >= totalBeads) {
      setTimeout(() => {
        if (!hasCompletedRef.current) {
          hasCompletedRef.current = true;
          setPhase('COMPLETE');
          onComplete();
        }
      }, 300);
    }
  }, [flyingCount, totalBeads, onBeadArrived, onComplete]);

  // Reset when deactivated
  useEffect(() => {
    if (!isActive) {
      setPhase('IDLE');
      setFlyingCount(0);
      setAllBeadPositions([]);
      setHeavenBeadPosition(null);
      setSpawnedBeads([]);
      hasCompletedRef.current = false;
    }
  }, [isActive]);

  if (!isActive || phase === 'IDLE' || !countingBoxRect) {
    return null;
  }

  const beadSize = 42;
  const currentBeads = [...spawnedBeads, ...allBeadPositions];
  const targetX = countingBoxRect.left + countingBoxRect.width / 2;
  const targetY = countingBoxRect.top + countingBoxRect.height / 2;

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
          const beadWidth = beadSize * 1.6;
          const beadHeight = beadSize * 1.0;
          const heavenBeadWidth = beadSize * 1.7;
          const heavenBeadHeight = beadSize * 1.1;

          return (
            <>
              {/* Fading heaven bead */}
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

                    {/* Bead at end */}
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

        {/* Static beads during FLYING_BEADS (ones not yet animated) */}
        {phase === 'FLYING_BEADS' && currentBeads.map((bead, index) => {
          if (index < flyingCount) return null; // Already flown
          if (index === flyingCount) return null; // Currently flying

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
        {phase === 'FLYING_BEADS' && (() => {
          const bead = currentBeads[flyingCount];
          if (!bead || flyingCount >= totalBeads) return null;

          return (
            <FlyingBead
              key={`flying-${bead.id}-${flyingCount}`}
              startX={bead.x}
              startY={bead.y}
              endX={targetX}
              endY={targetY}
              delay={0.3}
              onArrive={handleBeadArrive}
              beadSize={beadSize}
            />
          );
        })()}
      </motion.div>
    </AnimatePresence>
  );
}
