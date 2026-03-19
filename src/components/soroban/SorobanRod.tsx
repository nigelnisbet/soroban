import { useRef, useEffect, useState } from 'react';
import { Bead } from './Bead';
import { RodState, SIZES, SizeConfig } from '../../models/types';
import { Haptics, ImpactStyle } from '@capacitor/haptics';

interface SorobanRodProps {
  rodIndex: number;
  state: RodState;
  onStateChange: (newState: RodState) => void;
  disabled?: boolean;
  highlighted?: boolean;
  /** Strong glow highlight for multi-rod selection */
  glowHighlight?: boolean;
  size: 'small' | 'medium' | 'large' | 'mobile';
  /** Custom size config (overrides size preset if provided) */
  sizeConfig?: SizeConfig;
}

export function SorobanRod({
  rodIndex,
  state,
  onStateChange,
  disabled = false,
  highlighted = false,
  glowHighlight = false,
  size,
  sizeConfig: customSizeConfig,
}: SorobanRodProps) {
  const sizeConfig = customSizeConfig || SIZES[size];
  const { beadSize, beadSpacing } = sizeConfig;

  const rodRef = useRef<HTMLDivElement>(null);
  const [previewTouches, setPreviewTouches] = useState<{
    heaven?: boolean;
    earthBead?: number;
  }>({});
  const touchStartPositions = useRef<Map<number, {
    x: number;
    y: number;
    section: 'heaven' | 'earth';
    earthBeadIndex?: number;
  }>>(new Map());
  const hasTriggeredHeavenToggle = useRef(false);
  const hasTriggeredEarthToggle = useRef(false);

  // Calculate positions - INCREASED for better multitouch spacing
  // Heaven section at top, divider bar in middle, earth section at bottom
  const heavenSectionHeight = beadSize * 2.0 + beadSpacing * 3; // More space
  const dividerHeight = 16; // Thicker divider
  const earthSectionHeight = beadSize * 5.5 + beadSpacing * 7; // More space
  const totalHeight = heavenSectionHeight + dividerHeight + earthSectionHeight;

  // Heaven bead positions
  // Inactive: at top of heaven section (away from divider)
  // Active: pushed down toward divider
  const actualHeavenBeadHeight = beadSize * 1.1; // Match Bead.tsx heaven size
  const heavenInactiveY = beadSpacing * 1.5;
  const heavenActiveY = heavenSectionHeight - actualHeavenBeadHeight - beadSpacing * 1.5;

  // Earth bead positions
  // Beads are indexed 0-3 where:
  //   - Bead 0 = first to activate (worth 1 when active)
  //   - Bead 3 = last to activate (worth 1 when active, total becomes 4)
  //
  // Visual layout:
  //   INACTIVE: All beads rest at BOTTOM of earth section
  //             Bead 0 is at TOP of stack (closest to divider, first to move up)
  //             Bead 3 is at BOTTOM of stack (furthest from divider)
  //   ACTIVE:   Beads pushed UP against divider bar
  //             Bead 0 is closest to divider
  //             Active beads stack downward from divider
  const getEarthBeadY = (beadIndex: number, isActive: boolean) => {
    const earthSectionStart = heavenSectionHeight + dividerHeight;
    const actualEarthBeadHeight = beadSize * 1.0; // Match Bead.tsx earth size
    const stackSpacing = beadSpacing * 0.8;

    if (isActive) {
      // Active: pushed up against divider
      // Bead 0 closest to divider, stack downward
      return earthSectionStart + beadSpacing * 1.5 + beadIndex * (actualEarthBeadHeight + stackSpacing);
    } else {
      // Inactive: resting at bottom of earth section
      // Bead 0 at TOP of inactive stack (closest to divider, ready to move first)
      // Bead 3 at BOTTOM of inactive stack
      const bottomY = earthSectionStart + earthSectionHeight - actualEarthBeadHeight - beadSpacing * 1.5;
      return bottomY - (3 - beadIndex) * (actualEarthBeadHeight + stackSpacing);
    }
  };

  const toggleHeavenBead = () => {
    onStateChange({
      ...state,
      heavenBeadActive: !state.heavenBeadActive,
    });
  };

  const toggleEarthBead = (beadIndex: number) => {
    // If clicking an inactive bead, activate it and all below it
    // If clicking an active bead, deactivate it and all above it
    const isCurrentlyActive = beadIndex < state.earthBeadsActive;

    if (isCurrentlyActive) {
      // Deactivate this bead and all above it
      onStateChange({
        ...state,
        earthBeadsActive: beadIndex,
      });
    } else {
      // Activate this bead and all below it
      onStateChange({
        ...state,
        earthBeadsActive: beadIndex + 1,
      });
    }
  };

  // Multitouch gesture handling - detect which beads are touched, call toggle functions
  useEffect(() => {
    if (disabled || !rodRef.current) return;

    const rodElement = rodRef.current;
    const DRAG_THRESHOLD = 15;

    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        e.preventDefault();
        hasTriggeredHeavenToggle.current = false;
        hasTriggeredEarthToggle.current = false;

        const touch1 = e.touches[0];
        const touch2 = e.touches[1];
        const rect = rodElement.getBoundingClientRect();

        // Detect which bead was touched with STATE-AWARE touch zones
        const getTouchInfo = (clientY: number) => {
          const relativeY = clientY - rect.top;
          const heavenSectionHeight = beadSize * 2.0 + beadSpacing * 3;
          const dividerHeight = 16;
          const earthSectionStart = heavenSectionHeight + dividerHeight;

          if (relativeY < heavenSectionHeight) {
            return { section: 'heaven' as const };
          } else {
            // STATE-AWARE: Each bead has a touch zone based on where you'd naturally touch it
            const earthY = relativeY - earthSectionStart;
            const actualEarthBeadHeight = beadSize * 1.0;

            let selectedBead = -1;

            // Check each bead's state-aware touch zone
            for (let i = 0; i < 4; i++) {
              const isActive = i < state.earthBeadsActive;
              const beadCenterY = getEarthBeadY(i, isActive);

              let touchZoneStart, touchZoneEnd;

              if (isActive) {
                // ACTIVE beads (at top): Touch zone extends MORE on the UPPER side
                // You naturally touch the top part to drag down
                touchZoneStart = beadCenterY - actualEarthBeadHeight * 1.2;
                touchZoneEnd = beadCenterY + actualEarthBeadHeight * 0.5;
              } else {
                // INACTIVE beads (at bottom): Touch zone extends MORE on the LOWER side
                // You naturally touch the bottom part to drag up
                touchZoneStart = beadCenterY - actualEarthBeadHeight * 0.5;
                touchZoneEnd = beadCenterY + actualEarthBeadHeight * 1.2;
              }

              // Check if touch is in this bead's zone
              if (earthY >= touchZoneStart && earthY <= touchZoneEnd) {
                selectedBead = i;
                break; // Found it!
              }
            }

            // Fallback to closest if no zone matched
            if (selectedBead === -1) {
              let minDistance = Infinity;
              for (let i = 0; i < 4; i++) {
                const beadY = getEarthBeadY(i, i < state.earthBeadsActive);
                const distance = Math.abs(earthY - beadY);
                if (distance < minDistance) {
                  minDistance = distance;
                  selectedBead = i;
                }
              }
            }

            return {
              section: 'earth' as const,
              earthBeadIndex: selectedBead,
            };
          }
        };

        const info1 = getTouchInfo(touch1.clientY);
        const info2 = getTouchInfo(touch2.clientY);

        touchStartPositions.current.set(touch1.identifier, {
          x: touch1.clientX,
          y: touch1.clientY,
          ...info1,
        });
        touchStartPositions.current.set(touch2.identifier, {
          x: touch2.clientX,
          y: touch2.clientY,
          ...info2,
        });

        // Show visual preview of what will be affected
        setPreviewTouches({
          heaven: info1.section === 'heaven' || info2.section === 'heaven',
          earthBead: info1.section === 'earth' ? info1.earthBeadIndex :
                     info2.section === 'earth' ? info2.earthBeadIndex : undefined,
        });

        try {
          Haptics.impact({ style: ImpactStyle.Light });
        } catch (e) {
          // Haptics not available
        }
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        e.preventDefault();

        const touch1 = e.touches[0];
        const touch2 = e.touches[1];

        const start1 = touchStartPositions.current.get(touch1.identifier);
        const start2 = touchStartPositions.current.get(touch2.identifier);

        if (!start1 || !start2) return;

        // HEAVEN FINGER
        const heavenTouch = start1.section === 'heaven' ? { touch: touch1, start: start1 } :
                           start2.section === 'heaven' ? { touch: touch2, start: start2 } : null;

        if (heavenTouch && !hasTriggeredHeavenToggle.current) {
          const dy = heavenTouch.touch.clientY - heavenTouch.start.y;

          // Heaven: drag DOWN to activate, drag UP to deactivate
          let shouldToggle = false;
          if (!state.heavenBeadActive && dy > DRAG_THRESHOLD) {
            shouldToggle = true;
          } else if (state.heavenBeadActive && dy < -DRAG_THRESHOLD) {
            shouldToggle = true;
          }

          if (shouldToggle) {
            hasTriggeredHeavenToggle.current = true;
            toggleHeavenBead();
            try {
              Haptics.impact({ style: ImpactStyle.Medium });
            } catch (e) {
              // Haptics not available
            }
          }
        }

        // EARTH FINGER
        const earthTouch = start1.section === 'earth' ? { touch: touch1, start: start1 } :
                          start2.section === 'earth' ? { touch: touch2, start: start2 } : null;

        if (earthTouch && earthTouch.start.earthBeadIndex !== undefined && !hasTriggeredEarthToggle.current) {
          const dy = earthTouch.touch.clientY - earthTouch.start.y;
          const beadIndex = earthTouch.start.earthBeadIndex;
          const isCurrentlyActive = beadIndex < state.earthBeadsActive;

          // Earth: drag UP to activate, drag DOWN to deactivate
          let shouldToggle = false;
          if (!isCurrentlyActive && dy < -DRAG_THRESHOLD) {
            shouldToggle = true;
          } else if (isCurrentlyActive && dy > DRAG_THRESHOLD) {
            shouldToggle = true;
          }

          if (shouldToggle) {
            hasTriggeredEarthToggle.current = true;
            toggleEarthBead(beadIndex); // Calls existing function with correct logic!
            try {
              Haptics.impact({ style: ImpactStyle.Medium });
            } catch (e) {
              // Haptics not available
            }
          }
        }
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      for (let i = 0; i < e.changedTouches.length; i++) {
        touchStartPositions.current.delete(e.changedTouches[i].identifier);
      }
      if (e.touches.length === 0) {
        touchStartPositions.current.clear();
        hasTriggeredHeavenToggle.current = false;
        hasTriggeredEarthToggle.current = false;
        setPreviewTouches({}); // Clear visual preview
      }
    };

    rodElement.addEventListener('touchstart', handleTouchStart, { passive: false });
    rodElement.addEventListener('touchmove', handleTouchMove, { passive: false });
    rodElement.addEventListener('touchend', handleTouchEnd);
    rodElement.addEventListener('touchcancel', handleTouchEnd);

    return () => {
      rodElement.removeEventListener('touchstart', handleTouchStart);
      rodElement.removeEventListener('touchmove', handleTouchMove);
      rodElement.removeEventListener('touchend', handleTouchEnd);
      rodElement.removeEventListener('touchcancel', handleTouchEnd);
    };
  }, [disabled, state, onStateChange, beadSize, beadSpacing]);

  return (
    <div
      ref={rodRef}
      style={{
        position: 'relative',
        width: sizeConfig.rodWidth,
        height: totalHeight,
        // Glow highlight effect
        ...(glowHighlight && {
          background: 'rgba(255, 215, 0, 0.15)',
          boxShadow: 'inset 0 0 20px rgba(255, 215, 0, 0.4), 0 0 15px rgba(255, 215, 0, 0.3)',
          borderRadius: 4,
        }),
        transition: 'all 0.2s ease',
      }}
    >
      {/* The rod (vertical beam) */}
      <div
        style={{
          position: 'absolute',
          left: '50%',
          transform: 'translateX(-50%)',
          width: 6,
          height: '100%',
          background: 'linear-gradient(90deg, #3D2914 0%, #5D3A1A 50%, #3D2914 100%)',
          borderRadius: 3,
          boxShadow: 'inset 1px 0 2px rgba(0,0,0,0.3)',
        }}
      />

      {/* Divider bar */}
      <div
        style={{
          position: 'absolute',
          top: heavenSectionHeight,
          left: 0,
          right: 0,
          height: dividerHeight,
          background: 'linear-gradient(180deg, #4A3728 0%, #2D1810 50%, #4A3728 100%)',
          boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
          zIndex: 20,
        }}
      />

      {/* Heaven bead (1 bead worth 5) */}
      <Bead
        type="heaven"
        isActive={state.heavenBeadActive}
        onToggle={toggleHeavenBead}
        disabled={disabled}
        highlighted={highlighted || previewTouches.heaven}
        size={beadSize}
        positionY={state.heavenBeadActive ? heavenActiveY : heavenInactiveY}
      />

      {/* Earth beads (4 beads, each worth 1) */}
      {[0, 1, 2, 3].map((beadIndex) => {
        const isActive = beadIndex < state.earthBeadsActive;

        // Calculate which beads will be affected by the touch
        let willBeAffected = false;
        if (previewTouches.earthBead !== undefined) {
          const touchedBead = previewTouches.earthBead;
          const touchedBeadIsActive = touchedBead < state.earthBeadsActive;

          if (touchedBeadIsActive) {
            // Deactivating ACTIVE bead: affects touched bead and all ACTIVE beads BELOW it
            willBeAffected = isActive && beadIndex >= touchedBead;
          } else {
            // Activating INACTIVE bead: affects touched bead and all INACTIVE beads ABOVE it
            willBeAffected = !isActive && beadIndex <= touchedBead;
          }
        }

        return (
          <Bead
            key={`earth-${beadIndex}`}
            type="earth"
            isActive={isActive}
            onToggle={() => toggleEarthBead(beadIndex)}
            disabled={disabled}
            highlighted={highlighted || willBeAffected}
            size={beadSize}
            positionY={getEarthBeadY(beadIndex, isActive)}
          />
        );
      })}
    </div>
  );
}
