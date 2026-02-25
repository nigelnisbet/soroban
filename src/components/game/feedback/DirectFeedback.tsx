import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { AnimatePresence } from 'framer-motion';
import { SIZES, SizeConfig } from '../../../models/types';
import { BeadPosition, RodBeadState, FlashPosition } from './types';
import { calculateBeadPositions, sortBeadsForBurstAnimation, calculateBeadDelay } from './utils';
import { FeedbackBead } from './FeedbackBead';
import { FeedbackFlash } from './FeedbackFlash';

interface DirectFeedbackProps {
  isActive: boolean;
  digitBoxPositions: Map<number, DOMRect>;  // Target digit boxes (not counter boxes)
  sorobanRect: DOMRect | null;
  onDigitFlash: (rodIndex: number) => void;  // Called when bead arrives at digit
  onComplete: () => void;
  rodCount: number;
  rodStates: RodBeadState[];
  sizeConfig?: SizeConfig;
}

/**
 * Streamlined feedback for correct answers in speed mode.
 * Beads fly directly from soroban to digit display boxes - no counter row.
 */
export function DirectFeedback({
  isActive,
  digitBoxPositions,
  sorobanRect,
  onDigitFlash,
  onComplete,
  rodCount,
  rodStates,
  sizeConfig,
}: DirectFeedbackProps) {
  const [phase, setPhase] = useState<'IDLE' | 'FADING' | 'FLYING' | 'COMPLETE'>('IDLE');
  const [allBeadPositions, setAllBeadPositions] = useState<BeadPosition[]>([]);
  const [flashPositions, setFlashPositions] = useState<FlashPosition[]>([]);
  const [beadsLaunched, setBeadsLaunched] = useState(false);
  const [beadsArrived, setBeadsArrived] = useState<Set<string>>(new Set());

  const animationStartedRef = useRef(false);
  const hasCompletedRef = useRef(false);

  // Capture initial values on activation to prevent re-triggers from prop changes
  const capturedRodCountRef = useRef<number>(0);
  const capturedRodStatesRef = useRef<RodBeadState[]>([]);
  const capturedSorobanRectRef = useRef<DOMRect | null>(null);
  const capturedDigitBoxPositionsRef = useRef<Map<number, DOMRect>>(new Map());

  // Reset state when deactivated - only depend on isActive
  useEffect(() => {
    if (!isActive) {
      setPhase('IDLE');
      animationStartedRef.current = false;
      hasCompletedRef.current = false;
      setFlashPositions([]);
      setBeadsLaunched(false);
      setBeadsArrived(new Set());
      setAllBeadPositions([]);
      // Clear captured refs
      capturedRodCountRef.current = 0;
      capturedRodStatesRef.current = [];
      capturedSorobanRectRef.current = null;
      capturedDigitBoxPositionsRef.current = new Map();
    }
  }, [isActive]);

  // Identify which rods have zero value (no beads) - use captured values
  const zeroRods = useMemo(() => {
    const states = capturedRodStatesRef.current;
    const count = capturedRodCountRef.current;
    if (count === 0) return [];

    const rodsWithBeads = new Set<number>();
    states.forEach(rod => {
      if (rod.heavenBeadActive || rod.earthBeadsActive > 0) {
        rodsWithBeads.add(rod.rodIndex);
      }
    });
    // Return rod indices that have no beads (i.e., value is 0)
    const zeros: number[] = [];
    for (let i = 0; i < count; i++) {
      if (!rodsWithBeads.has(i)) {
        zeros.push(i);
      }
    }
    return zeros;
  }, [allBeadPositions]); // Recalculate when beads are set (after capture)

  // Start animation when activated - capture values immediately and only run once
  useEffect(() => {
    if (!isActive || !sorobanRect) return;
    if (digitBoxPositions.size === 0) return;
    if (animationStartedRef.current) return;

    // Capture all values immediately so we're immune to prop changes
    animationStartedRef.current = true;
    capturedRodCountRef.current = rodCount;
    capturedRodStatesRef.current = [...rodStates];
    capturedSorobanRectRef.current = sorobanRect;
    capturedDigitBoxPositionsRef.current = new Map(digitBoxPositions);

    const beads = calculateBeadPositions(rodStates, sorobanRect, rodCount, sizeConfig);
    setAllBeadPositions(beads);

    // Identify zeros for the zero-case handling
    const rodsWithBeads = new Set<number>();
    rodStates.forEach(rod => {
      if (rod.heavenBeadActive || rod.earthBeadsActive > 0) {
        rodsWithBeads.add(rod.rodIndex);
      }
    });
    const currentZeros: number[] = [];
    for (let i = 0; i < rodCount; i++) {
      if (!rodsWithBeads.has(i)) {
        currentZeros.push(i);
      }
    }

    // Quick fade then launch
    setPhase('FADING');

    setTimeout(() => {
      if (beads.length > 0) {
        setBeadsLaunched(true);
        setPhase('FLYING');
      } else {
        // No beads at all (value is 0) - flash all zeros and complete
        // Flash zeros from left to right (highest rod index first)
        const sortedZeros = [...currentZeros].sort((a, b) => b - a);
        const capturedDigitBoxes = capturedDigitBoxPositionsRef.current;
        sortedZeros.forEach((rodIndex, i) => {
          setTimeout(() => {
            onDigitFlash(rodIndex);
            const digitBox = capturedDigitBoxes.get(rodIndex);
            if (digitBox) {
              setFlashPositions(prev => [...prev, {
                x: digitBox.left + digitBox.width / 2,
                y: digitBox.top + digitBox.height / 2,
                delay: 0,
              }]);
            }
          }, i * 100);
        });
        // Complete after all zeros flashed
        setTimeout(() => {
          setPhase('COMPLETE');
          onComplete();
        }, sortedZeros.length * 100 + 200);
      }
    }, 300); // Faster fade for speed mode
  // Only depend on isActive for triggering - all other values are captured on first run
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActive]);

  // Track which rods have been flashed (for zero-rod timing)
  const [rodsFlashed, setRodsFlashed] = useState<Set<number>>(new Set());

  // Reset rodsFlashed when deactivated (already handled in main reset effect, but be explicit)
  useEffect(() => {
    if (!isActive) {
      setRodsFlashed(new Set());
    }
  }, [isActive]);

  // Flash a zero rod and any subsequent zeros - use captured positions
  const flashZeroRod = useCallback((rodIndex: number) => {
    if (rodsFlashed.has(rodIndex)) return;

    setRodsFlashed(prev => {
      const next = new Set(prev);
      next.add(rodIndex);
      return next;
    });

    onDigitFlash(rodIndex);
    const digitBox = capturedDigitBoxPositionsRef.current.get(rodIndex);
    if (digitBox) {
      setFlashPositions(prev => [...prev, {
        x: digitBox.left + digitBox.width / 2,
        y: digitBox.top + digitBox.height / 2,
        delay: 0,
      }]);
    }
  }, [onDigitFlash, rodsFlashed]);

  // Handle bead arriving at digit - use captured positions
  const handleBeadArrive = useCallback((beadId: string, rodIndex: number) => {
    setBeadsArrived(prev => {
      if (prev.has(beadId)) return prev;
      const next = new Set(prev);
      next.add(beadId);
      return next;
    });

    // Mark this rod as flashed
    setRodsFlashed(prev => {
      const next = new Set(prev);
      next.add(rodIndex);
      return next;
    });

    // Notify parent to flash the digit
    onDigitFlash(rodIndex);

    // Flash effect at digit - use captured positions
    const digitBox = capturedDigitBoxPositionsRef.current.get(rodIndex);
    if (digitBox) {
      setFlashPositions(prev => [...prev, {
        x: digitBox.left + digitBox.width / 2,
        y: digitBox.top + digitBox.height / 2,
        delay: 0,
      }]);
    }

    // Check if there are any zero rods that should flash next
    // Zero rods between this rod and the next rod with beads should flash
    // Animation goes left to right (highest rod index to lowest)
    // So after rod N finishes, check if rod N-1, N-2, etc. are zeros and flash them
    setTimeout(() => {
      for (let r = rodIndex - 1; r >= 0; r--) {
        if (zeroRods.includes(r)) {
          flashZeroRod(r);
        } else {
          // Stop at first non-zero rod (beads will handle it)
          break;
        }
      }
    }, 50);
  }, [onDigitFlash, zeroRods, flashZeroRod]);

  // Flash any leading zeros when beads start flying - use captured rod count
  useEffect(() => {
    if (phase !== 'FLYING' || !beadsLaunched) return;

    const capturedRodCount = capturedRodCountRef.current;
    if (capturedRodCount === 0) return;

    // Find the highest rod index that has beads
    const rodsWithBeads = new Set(allBeadPositions.map(b => b.rodIndex));
    const highestRodWithBeads = Math.max(...rodsWithBeads);

    // Flash any zeros above the highest rod with beads (shouldn't happen normally, but handle it)
    // And flash zeros between highest rod and rodCount-1
    for (let r = capturedRodCount - 1; r > highestRodWithBeads; r--) {
      if (zeroRods.includes(r)) {
        setTimeout(() => flashZeroRod(r), (capturedRodCount - 1 - r) * 100);
      }
    }
  }, [phase, beadsLaunched, allBeadPositions, zeroRods, flashZeroRod]);

  // Capture onComplete callback to prevent re-triggers when parent re-renders
  const onCompleteRef = useRef(onComplete);
  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  // Check if all beads have arrived and all zeros flashed
  useEffect(() => {
    if (phase !== 'FLYING') return;
    if (!beadsLaunched) return;
    if (allBeadPositions.length === 0) return;

    const allBeadsArrived = beadsArrived.size >= allBeadPositions.length;
    const allZerosFlashed = zeroRods.every(r => rodsFlashed.has(r));

    if (allBeadsArrived && allZerosFlashed && !hasCompletedRef.current) {
      hasCompletedRef.current = true;
      // Quick completion for speed mode
      setTimeout(() => {
        setPhase('COMPLETE');
        onCompleteRef.current();
      }, 200);
    }
  }, [phase, beadsLaunched, beadsArrived.size, allBeadPositions.length, zeroRods, rodsFlashed]);

  // Sort beads for animation order (must be before early return)
  const sortedBeads = useMemo(() => sortBeadsForBurstAnimation(allBeadPositions), [allBeadPositions]);

  // Calculate delay for a specific bead - even faster for direct mode
  const getBeadDelay = useCallback(
    (bead: BeadPosition) => calculateBeadDelay(bead, sortedBeads, 100, 30), // Faster timing
    [sortedBeads]
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
      {phase === 'FADING' && allBeadPositions.map((bead) => (
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

      {/* Flying beads - burst mode to digit boxes - use captured positions */}
      {phase === 'FLYING' && beadsLaunched && sortedBeads.map((bead) => {
        if (beadsArrived.has(bead.id)) return null;

        const digitBox = capturedDigitBoxPositionsRef.current.get(bead.rodIndex);
        if (!digitBox) return null;

        const targetX = digitBox.left + digitBox.width / 2;
        const targetY = digitBox.top + digitBox.height / 2;
        const delay = getBeadDelay(bead);

        return (
          <FeedbackBead
            key={`flying-${bead.id}`}
            startX={bead.x}
            startY={bead.y}
            endX={targetX}
            endY={targetY}
            delay={delay}
            duration={0.2} // Even faster flight
            onArrive={() => handleBeadArrive(bead.id, bead.rodIndex)}
            isHeaven={bead.isFromHeaven}
            beadSize={beadSize}
          />
        );
      })}

      {/* Flash effects at digits */}
      <AnimatePresence>
        {flashPositions.map((flash, i) => (
          <FeedbackFlash key={`flash-${i}`} x={flash.x} y={flash.y} delay={flash.delay} />
        ))}
      </AnimatePresence>
    </div>
  );
}
