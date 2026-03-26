import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

type AnimationPhase =
  | 'IDLE'
  | 'FADING_SOROBAN'        // Soroban frames fade, beads remain visible
  | 'SPLITTING_TENS_EARTH'  // Tens earth bead splits into 10 beads (360° double fan)
  | 'FLYING_TENS'           // Tens beads fly to counting box
  | 'SPLITTING_ONES_HEAVEN' // Ones heaven bead splits into 5 beads (fan animation)
  | 'FLYING_ONES'           // Ones beads fly to counting box
  | 'COMPLETE';

interface BeadPosition {
  id: string;
  x: number;
  y: number;
  isFromHeaven: boolean;
  isFromTens: boolean;      // Track if bead came from tens place
}

interface SimpleAdditionFeedbackTwoProps {
  isActive: boolean;
  // Tens place soroban state
  tensHeavenBeadActive: boolean;
  tensEarthBeadsActive: number;
  // Ones place soroban state
  onesHeavenBeadActive: boolean;
  onesEarthBeadsActive: number;
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
  zIndex = 999,
}: {
  x: number;
  y: number;
  beadSize: number;
  isHeaven?: boolean;
  zIndex?: number;
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
        zIndex,
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

// Flying bead to counting box
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

export function SimpleAdditionFeedbackTwo({
  isActive,
  tensHeavenBeadActive,
  tensEarthBeadsActive,
  onesHeavenBeadActive,
  onesEarthBeadsActive,
  sorobanRect,
  countingBoxRect,
  onComplete,
  onBeadArrived,
}: SimpleAdditionFeedbackTwoProps) {
  const [phase, setPhase] = useState<AnimationPhase>('IDLE');
  const [flyingCount, setFlyingCount] = useState(0);
  const [cumulativeCount, setCumulativeCount] = useState(0); // Total beads flown so far
  const [allBeadPositions, setAllBeadPositions] = useState<BeadPosition[]>([]);
  const [heavenBeadPosition, setHeavenBeadPosition] = useState<{x: number; y: number} | null>(null);
  const [spawnedBeads, setSpawnedBeads] = useState<BeadPosition[]>([]);
  const hasCompletedRef = useRef(false);

  const totalBeads =
    (tensHeavenBeadActive ? 50 : 0) + (tensEarthBeadsActive * 10) +
    (onesHeavenBeadActive ? 5 : 0) + onesEarthBeadsActive;

  // Calculate positions when activated
  useEffect(() => {
    if (!isActive || !sorobanRect || !countingBoxRect) {
      setPhase('IDLE');
      return;
    }

    // Calculate bead positions from soroban
    const beadSize = 42;
    const beadSpacing = 7;
    const framePadding = 14;
    const rodWidth = 60;

    const heavenSectionHeight = beadSize * 2.0 + beadSpacing * 3;
    const dividerHeight = 16;
    const earthSectionStart = heavenSectionHeight + dividerHeight;

    const borderWidth = 4;
    const contentTop = sorobanRect.top + borderWidth + framePadding;

    // Calculate center X for BOTH sorobans
    const singleSorobanWidth = rodWidth + framePadding * 2 + borderWidth * 2;
    const totalSorobanWidth = singleSorobanWidth * 2;
    const sorobansStartX = sorobanRect.left + (sorobanRect.width - totalSorobanWidth) / 2;

    const calculatedTensRodCenterX = sorobansStartX + borderWidth + framePadding + rodWidth / 2 + borderWidth;
    const onesRodCenterX = sorobansStartX + singleSorobanWidth + borderWidth + framePadding + rodWidth / 2 - borderWidth;

    const beads: BeadPosition[] = [];
    const actualEarthBeadHeight = beadSize * 1.0;
    const stackSpacing = beadSpacing * 0.8;

    // Calculate TENS place earth bead positions
    for (let i = 0; i < tensEarthBeadsActive; i++) {
      const positionY = earthSectionStart + beadSpacing * 1.5 + i * (actualEarthBeadHeight + stackSpacing);
      beads.push({
        id: `tens-earth-${i}`,
        x: calculatedTensRodCenterX,
        y: contentTop + positionY + actualEarthBeadHeight / 2,
        isFromHeaven: false,
        isFromTens: true,
      });
    }

    // Calculate ONES place earth bead positions
    for (let i = 0; i < onesEarthBeadsActive; i++) {
      const positionY = earthSectionStart + beadSpacing * 1.5 + i * (actualEarthBeadHeight + stackSpacing);
      beads.push({
        id: `ones-earth-${i}`,
        x: onesRodCenterX,
        y: contentTop + positionY + actualEarthBeadHeight / 2,
        isFromHeaven: false,
        isFromTens: false,
      });
    }

    // Calculate ONES place heaven bead position
    if (onesHeavenBeadActive) {
      const heavenBeadActiveY = heavenSectionHeight - beadSize - beadSpacing;
      const heavenBeadHeight = beadSize * 1.1;
      setHeavenBeadPosition({
        x: onesRodCenterX,
        y: contentTop + heavenBeadActiveY + heavenBeadHeight / 2,
      });
    }

    setAllBeadPositions(beads);
    setFlyingCount(0);
    setCumulativeCount(0);
    setSpawnedBeads([]);
    hasCompletedRef.current = false;

    // Start animation sequence
    setPhase('FADING_SOROBAN');

    setTimeout(() => {
      if (tensEarthBeadsActive > 0) {
        setPhase('SPLITTING_TENS_EARTH');
      } else if (onesHeavenBeadActive) {
        setPhase('SPLITTING_ONES_HEAVEN');
      } else {
        setPhase('FLYING_ONES');
      }
    }, 800);

  }, [isActive, sorobanRect, countingBoxRect, tensHeavenBeadActive, tensEarthBeadsActive, onesHeavenBeadActive, onesEarthBeadsActive]);

  // Handle TENS earth bead split into 10 beads
  const handleTensEarthSplitComplete = useCallback((beadPosition: {x: number; y: number}) => {
    const lineLength = 90;
    const spreadBeads: BeadPosition[] = [];

    // Upper fan: 5 beads
    for (let i = 0; i < 5; i++) {
      const angleDeg = -60 + (i * 30);
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

    // Lower fan: 5 beads
    for (let i = 0; i < 5; i++) {
      const angleDeg = 120 + (i * 30);
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
    setTimeout(() => {
      setPhase('FLYING_TENS');
    }, 100);
  }, []);

  // Handle ONES heaven bead split
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
        isFromHeaven: false,
        isFromTens: false,
      });
    }

    setSpawnedBeads(spreadBeads);
    setPhase('FLYING_ONES');
  }, [heavenBeadPosition]);

  // Handle bead arrival
  const handleBeadArrive = useCallback(() => {
    const newCount = flyingCount + 1;
    const newCumulativeCount = cumulativeCount + 1;

    // Notify parent with cumulative count
    onBeadArrived(newCumulativeCount);

    setFlyingCount(newCount);
    setCumulativeCount(newCumulativeCount);

    // Check if phase complete
    if (phase === 'FLYING_TENS') {
      const tensBeadsCount = spawnedBeads.filter(b => b.isFromTens).length;
      if (newCount >= tensBeadsCount) {
        setTimeout(() => {
          setFlyingCount(0); // Reset for ones phase
          if (onesHeavenBeadActive) {
            setPhase('SPLITTING_ONES_HEAVEN');
          } else if (allBeadPositions.filter(b => !b.isFromTens).length > 0) {
            setPhase('FLYING_ONES');
          } else {
            if (!hasCompletedRef.current) {
              hasCompletedRef.current = true;
              setPhase('COMPLETE');
              onComplete();
            }
          }
        }, 300);
      }
    } else if (phase === 'FLYING_ONES') {
      const currentBeads = [...spawnedBeads.filter(b => !b.isFromTens), ...allBeadPositions.filter(b => !b.isFromTens)];
      if (newCount >= currentBeads.length) {
        setTimeout(() => {
          if (!hasCompletedRef.current) {
            hasCompletedRef.current = true;
            setPhase('COMPLETE');
            onComplete();
          }
        }, 300);
      }
    }
  }, [flyingCount, cumulativeCount, phase, spawnedBeads, allBeadPositions, onesHeavenBeadActive, onBeadArrived, onComplete]);

  // Reset when deactivated
  useEffect(() => {
    if (!isActive) {
      setPhase('IDLE');
      setFlyingCount(0);
      setCumulativeCount(0);
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
  const currentBeads = phase === 'FLYING_TENS'
    ? spawnedBeads.filter(b => b.isFromTens)
    : (phase === 'FLYING_ONES'
        ? [...spawnedBeads.filter(b => !b.isFromTens), ...allBeadPositions.filter(b => !b.isFromTens)]
        : [...spawnedBeads, ...allBeadPositions]);

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
        {/* Static beads during FADING_SOROBAN */}
        {phase === 'FADING_SOROBAN' && allBeadPositions.map((bead) => (
          <StaticBead
            key={`static-${bead.id}`}
            x={bead.x}
            y={bead.y}
            beadSize={beadSize}
            isHeaven={bead.isFromHeaven}
          />
        ))}

        {phase === 'FADING_SOROBAN' && heavenBeadPosition && (
          <StaticBead
            x={heavenBeadPosition.x}
            y={heavenBeadPosition.y}
            beadSize={beadSize}
            isHeaven={true}
          />
        )}

        {/* SPLITTING_TENS_EARTH: Double fan */}
        {phase === 'SPLITTING_TENS_EARTH' && allBeadPositions.filter(b => b.isFromTens).map((tensBead) => {
          const lineLength = 90;
          const beadWidth = beadSize * 1.6;
          const beadHeight = beadSize * 1.0;
          const upperAngles = [-60, -30, 0, 30, 60];
          const lowerAngles = [120, 150, 180, 210, 240];
          const allAngles = [...upperAngles, ...lowerAngles];

          return (
            <div key={`tens-split-${tensBead.id}`}>
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
                initial={{ scale: 1, opacity: 0.3 }}
                animate={{ scale: 0.5, opacity: 0 }}
                transition={{ duration: 0.3, delay: 0.4 }}
              >
                <svg width={beadWidth} height={beadHeight} viewBox={`0 0 ${beadWidth} ${beadHeight}`}>
                  <defs>
                    <linearGradient id="fading-tens-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#DAA520" />
                      <stop offset="100%" stopColor="#B8860B" />
                    </linearGradient>
                    <radialGradient id="fading-tens-hole">
                      <stop offset="0%" stopColor="#1A0F0A" />
                      <stop offset="100%" stopColor="#2D1810" />
                    </radialGradient>
                  </defs>
                  <path
                    d={`M ${beadWidth / 2} 2 L ${beadWidth - 4} ${beadHeight / 2} L ${beadWidth / 2} ${beadHeight - 2} L 4 ${beadHeight / 2} Z`}
                    fill="url(#fading-tens-grad)"
                    stroke="rgba(0,0,0,0.3)"
                    strokeWidth="1"
                  />
                  <circle
                    cx={beadWidth / 2}
                    cy={beadHeight / 2}
                    r={beadSize * 0.12}
                    fill="url(#fading-tens-hole)"
                    stroke="rgba(0,0,0,0.5)"
                    strokeWidth="1"
                  />
                </svg>
              </motion.div>

              {/* Fan lines and beads */}
              {allAngles.map((angleDeg, i) => {
                const angleRad = (angleDeg * Math.PI) / 180;
                const endX = Math.sin(angleRad) * lineLength;
                const endY = -Math.cos(angleRad) * lineLength;
                const isLastBead = i === allAngles.length - 1;

                return (
                  <div key={`tens-fan-${i}`}>
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
                          <radialGradient id={`tens-split-hole-${i}`}>
                            <stop offset="0%" stopColor="#1A0F0A" />
                            <stop offset="100%" stopColor="#2D1810" />
                          </radialGradient>
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
                          fill={`url(#tens-split-hole-${i})`}
                          stroke="rgba(0,0,0,0.5)"
                          strokeWidth="1"
                        />
                      </svg>
                    </motion.div>
                  </div>
                );
              })}

              {/* Show ones beads at full opacity during tens split */}
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

        {/* SPLITTING_ONES_HEAVEN */}
        {phase === 'SPLITTING_ONES_HEAVEN' && heavenBeadPosition && (() => {
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
                <svg width={heavenBeadWidth} height={heavenBeadHeight} viewBox={`0 0 ${heavenBeadWidth} ${heavenBeadHeight}`}>
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
                    d={`M ${heavenBeadWidth / 2} 2 L ${heavenBeadWidth - 4} ${heavenBeadHeight / 2} L ${heavenBeadWidth / 2} ${heavenBeadHeight - 2} L 4 ${heavenBeadHeight / 2} Z`}
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
                      onAnimationComplete={i === 4 ? handleOnesHeavenSplitComplete : undefined}
                    >
                      <svg width={beadWidth} height={beadHeight} viewBox={`0 0 ${beadWidth} ${beadHeight}`}>
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
                          d={`M ${beadWidth / 2} 2 L ${beadWidth - 4} ${beadHeight / 2} L ${beadWidth / 2} ${beadHeight - 2} L 4 ${beadHeight / 2} Z`}
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

              {/* Static ones earth beads during heaven split */}
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

        {/* Static beads during flying */}
        {phase === 'FLYING_TENS' && (
          <>
            {/* Waiting tens beads */}
            {currentBeads.map((bead, index) => {
              if (index < flyingCount) return null;
              if (index === flyingCount) return null;
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
            {/* All ones beads at full opacity (lower z-index so tens beads fly on top) */}
            {allBeadPositions.filter(b => !b.isFromTens).map((bead) => (
              <StaticBead
                key={`waiting-ones-${bead.id}`}
                x={bead.x}
                y={bead.y}
                beadSize={beadSize}
                isHeaven={false}
                zIndex={998}
              />
            ))}
            {heavenBeadPosition && (
              <StaticBead
                key="waiting-ones-heaven"
                x={heavenBeadPosition.x}
                y={heavenBeadPosition.y}
                beadSize={beadSize}
                isHeaven={true}
                zIndex={998}
              />
            )}
          </>
        )}

        {phase === 'FLYING_ONES' && currentBeads.map((bead, index) => {
          if (index < flyingCount) return null;
          if (index === flyingCount) return null;

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
        {(phase === 'FLYING_TENS' || phase === 'FLYING_ONES') && (() => {
          const bead = currentBeads[flyingCount];
          if (!bead || flyingCount >= currentBeads.length) return null;

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
