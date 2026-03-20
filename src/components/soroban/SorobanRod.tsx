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
  glowHighlight?: boolean;
  size: 'small' | 'medium' | 'large' | 'mobile';
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
    earthBeads?: Set<number>;
  }>({});

  // Track pending toggles for multi-touch
  const pendingToggles = useRef<{
    heaven: boolean;
    earthBeads: Set<number>;
  }>({
    heaven: false,
    earthBeads: new Set(),
  });

  const touchStartPositions = useRef<Map<number, { x: number; y: number }>>(new Map());
  const highlightTimeoutRef = useRef<number | null>(null);

  // Layout calculations
  const heavenSectionHeight = beadSize * 2.0 + beadSpacing * 3;
  const dividerHeight = 16;
  const earthSectionHeight = beadSize * 5.5 + beadSpacing * 7;
  const totalHeight = heavenSectionHeight + dividerHeight + earthSectionHeight;

  // Bead positions
  const heavenBeadInactiveY = beadSpacing;
  const heavenBeadActiveY = heavenSectionHeight - beadSize - beadSpacing;
  const heavenBeadY = state.heavenBeadActive ? heavenBeadActiveY : heavenBeadInactiveY;

  const dividerY = heavenSectionHeight;
  const earthSectionTop = dividerY + dividerHeight;

  const getEarthBeadY = (beadIndex: number, isActive: boolean) => {
    const actualEarthBeadHeight = beadSize * 1.0;
    const stackSpacing = beadSpacing * 0.8;

    if (isActive) {
      // Active: pushed up against divider
      // Bead 0 closest to divider, stack downward
      return earthSectionTop + beadSpacing * 1.5 + beadIndex * (actualEarthBeadHeight + stackSpacing);
    } else {
      // Inactive: resting at bottom of earth section
      // Bead 0 at TOP of inactive stack (closest to divider, ready to move first)
      // Bead 3 at BOTTOM of inactive stack
      const bottomY = earthSectionTop + earthSectionHeight - actualEarthBeadHeight - beadSpacing * 1.5;
      return bottomY - (3 - beadIndex) * (actualEarthBeadHeight + stackSpacing);
    }
  };

  useEffect(() => {
    if (disabled) return;

    const rod = rodRef.current;
    if (!rod) return;

    const handleTouchStart = (e: TouchEvent) => {
      e.preventDefault();

      const rect = rod.getBoundingClientRect();
      console.log(`🔵 TOUCH START on rod ${rodIndex}`);
      console.log(`   Rod bounds: top=${rect.top.toFixed(1)}, height=${rect.height.toFixed(1)}`);
      console.log(`   Current state: heaven=${state.heavenBeadActive}, earth=${state.earthBeadsActive}`);

      // Clear any previous highlights and pending toggles
      setPreviewTouches({});
      touchStartPositions.current.clear();
      pendingToggles.current = { heaven: false, earthBeads: new Set() };

      // Clear any existing timeout
      if (highlightTimeoutRef.current !== null) {
        clearTimeout(highlightTimeoutRef.current);
        highlightTimeoutRef.current = null;
      }

      const newPreviews: typeof previewTouches = {};

      // Process all touches
      for (let i = 0; i < e.touches.length; i++) {
        const touch = e.touches[i];
        console.log(`   Touch ${i}: x=${touch.clientX.toFixed(1)}, y=${touch.clientY.toFixed(1)}`);

        touchStartPositions.current.set(touch.identifier, {
          x: touch.clientX,
          y: touch.clientY,
        });

        const relativeY = touch.clientY - rect.top;
        console.log(`   relativeY=${relativeY.toFixed(1)} (dividerY=${dividerY}, earthTop=${earthSectionTop})`);


        // Detect heaven bead
        if (relativeY >= 0 && relativeY < dividerY) {
          console.log(`   → Detected HEAVEN bead`);
          newPreviews.heaven = true;
          pendingToggles.current.heaven = true;
          Haptics.impact({ style: ImpactStyle.Light });
        }
        // Detect earth beads
        else if (relativeY >= earthSectionTop && relativeY < rect.height) {
          const earthY = relativeY - earthSectionTop;

          // Check each earth bead
          let touchedBead = -1;
          for (let beadIdx = 0; beadIdx < 4; beadIdx++) {
            const isActive = beadIdx < state.earthBeadsActive;
            const beadY = getEarthBeadY(beadIdx, isActive);
            const localBeadY = beadY - earthSectionTop;
            const distance = Math.abs(earthY - localBeadY);

            console.log(`   Earth bead ${beadIdx} (${isActive ? 'active' : 'inactive'}): beadY=${beadY.toFixed(1)}, distance=${distance.toFixed(1)}, threshold=${(beadSize * 1.0).toFixed(1)}`);

            if (distance < beadSize * 1.0) {
              touchedBead = beadIdx;
              break;
            }
          }

          if (touchedBead >= 0) {
            console.log(`   → Detected EARTH bead ${touchedBead}`);
            // Highlight all beads that will be affected
            const affectedBeads = new Set<number>();
            const isCurrentlyActive = touchedBead < state.earthBeadsActive;

            if (isCurrentlyActive) {
              // Deactivating: highlight this bead and all above (higher indices up to active count)
              for (let i = touchedBead; i < state.earthBeadsActive; i++) {
                affectedBeads.add(i);
              }
            } else {
              // Activating: highlight this bead and all below (lower indices down to 0)
              for (let i = 0; i <= touchedBead; i++) {
                affectedBeads.add(i);
              }
            }

            newPreviews.earthBeads = affectedBeads;
            pendingToggles.current.earthBeads.add(touchedBead);
            Haptics.impact({ style: ImpactStyle.Light });
          } else {
            console.log(`   → NO BEAD detected (outside all touch zones)`);
          }
        } else {
          console.log(`   → Touch outside valid zones`);
        }
      }

      setPreviewTouches(newPreviews);

      // Failsafe timeout to clear stuck highlights
      highlightTimeoutRef.current = window.setTimeout(() => {
        setPreviewTouches({});
        touchStartPositions.current.clear();
        pendingToggles.current = { heaven: false, earthBeads: new Set() };
      }, 2000);
    };

    const handleTouchEnd = (_e: TouchEvent) => {
      console.log(`🔴 TOUCH END on rod ${rodIndex}`);

      // Clear timeout
      if (highlightTimeoutRef.current !== null) {
        clearTimeout(highlightTimeoutRef.current);
        highlightTimeoutRef.current = null;
      }

      // Apply pending toggles
      let newState = { ...state };

      if (pendingToggles.current.heaven) {
        console.log(`   Toggling heaven bead: ${state.heavenBeadActive} → ${!state.heavenBeadActive}`);
        newState.heavenBeadActive = !state.heavenBeadActive;
        Haptics.impact({ style: ImpactStyle.Medium });
      }

      if (pendingToggles.current.earthBeads.size > 0) {
        const toggledBead = Math.min(...Array.from(pendingToggles.current.earthBeads));
        const wasActive = toggledBead < state.earthBeadsActive;

        if (wasActive) {
          console.log(`   Deactivating earth bead ${toggledBead}: earth count ${state.earthBeadsActive} → ${toggledBead}`);
          newState.earthBeadsActive = toggledBead;
        } else {
          console.log(`   Activating earth bead ${toggledBead}: earth count ${state.earthBeadsActive} → ${toggledBead + 1}`);
          newState.earthBeadsActive = toggledBead + 1;
        }
        Haptics.impact({ style: ImpactStyle.Medium });
      }

      // Commit state change
      if (newState.heavenBeadActive !== state.heavenBeadActive ||
          newState.earthBeadsActive !== state.earthBeadsActive) {
        const oldValue = state.earthBeadsActive + (state.heavenBeadActive ? 5 : 0);
        const newValue = newState.earthBeadsActive + (newState.heavenBeadActive ? 5 : 0);
        console.log(`   ✅ STATE CHANGED: value ${oldValue} → ${newValue}`);
        onStateChange(newState);
      } else {
        console.log(`   ⚠️ No state change (no toggles applied)`);
      }

      // Clear previews and pending toggles
      setPreviewTouches({});
      touchStartPositions.current.clear();
      pendingToggles.current = { heaven: false, earthBeads: new Set() };
    };

    const handleTouchCancel = (_e: TouchEvent) => {
      if (highlightTimeoutRef.current !== null) {
        clearTimeout(highlightTimeoutRef.current);
        highlightTimeoutRef.current = null;
      }
      touchStartPositions.current.clear();
      setPreviewTouches({});
      pendingToggles.current = { heaven: false, earthBeads: new Set() };
    };

    rod.addEventListener('touchstart', handleTouchStart, { passive: false });
    rod.addEventListener('touchend', handleTouchEnd);
    rod.addEventListener('touchcancel', handleTouchCancel);

    return () => {
      rod.removeEventListener('touchstart', handleTouchStart);
      rod.removeEventListener('touchend', handleTouchEnd);
      rod.removeEventListener('touchcancel', handleTouchCancel);
      if (highlightTimeoutRef.current !== null) {
        clearTimeout(highlightTimeoutRef.current);
      }
    };
  }, [disabled, state, onStateChange, beadSize, beadSpacing, dividerY, earthSectionTop, totalHeight]);

  return (
    <div
      ref={rodRef}
      style={{
        position: 'relative',
        width: sizeConfig.rodWidth,
        height: totalHeight,
        display: 'flex',
        flexDirection: 'column',
        touchAction: 'none',
        userSelect: 'none',
        WebkitUserSelect: 'none',
        WebkitTouchCallout: 'none',
        cursor: disabled ? 'default' : 'pointer',
      }}
    >
      {/* Rod bar */}
      <div
        style={{
          position: 'absolute',
          left: '50%',
          transform: 'translateX(-50%)',
          width: 4,
          height: '100%',
          background: 'linear-gradient(90deg, #3D2914 0%, #6B5344 50%, #3D2914 100%)',
          borderRadius: 2,
          boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.3)',
        }}
      />

      {/* Heaven bead */}
      <Bead
        type="heaven"
        isActive={state.heavenBeadActive}
        disabled={disabled}
        highlighted={previewTouches.heaven || (highlighted && glowHighlight)}
        size={beadSize}
        positionY={heavenBeadY}
      />

      {/* Divider bar */}
      <div
        style={{
          position: 'absolute',
          top: dividerY,
          left: 0,
          right: 0,
          height: dividerHeight,
          background: 'linear-gradient(180deg, #4A3728 0%, #6B5344 50%, #4A3728 100%)',
          borderRadius: 4,
          boxShadow: '0 2px 6px rgba(0,0,0,0.3), inset 0 1px 2px rgba(255,255,255,0.1)',
          border: '2px solid #3D2914',
        }}
      />

      {/* Earth beads (0-3) */}
      {[0, 1, 2, 3].map((beadIndex) => {
        const isActive = beadIndex < state.earthBeadsActive;
        return (
          <Bead
            key={beadIndex}
            type="earth"
            isActive={isActive}
            disabled={disabled}
            highlighted={previewTouches.earthBeads?.has(beadIndex) || (highlighted && glowHighlight)}
            size={beadSize}
            positionY={getEarthBeadY(beadIndex, isActive)}
          />
        );
      })}
    </div>
  );
}
