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
  const BUILD_VERSION = 'v1.2.7'; // UPDATE THIS EVERY CHANGE

  const sizeConfig = customSizeConfig || SIZES[size];
  const { beadSize, beadSpacing } = sizeConfig;

  const rodRef = useRef<HTMLDivElement>(null);
  const [previewTouches, setPreviewTouches] = useState<{
    heaven?: boolean;
    earthBead?: number;
  }>({});

  // Track what needs to toggle when fingers are released
  const pendingToggles = useRef<{
    heaven: boolean;
    earthBeads: Set<number>;
  }>({
    heaven: false,
    earthBeads: new Set(),
  });

  const touchStartPositions = useRef<Map<number, {
    x: number;
    y: number;
    section: 'heaven' | 'earth';
    earthBeadIndex?: number;
  }>>(new Map());

  // Failsafe timeout to clear stuck highlights
  const highlightTimeoutRef = useRef<number | null>(null);

  // Log version on mount and state changes
  useEffect(() => {
    console.log(`🔵 SorobanRod ${BUILD_VERSION} mounted (rod ${rodIndex})`);
  }, []);

  // Log when state changes externally (not from our touch handlers)
  useEffect(() => {
    console.log(`📊 STATE CHANGED (rod ${rodIndex}): value=${state.earthBeadsActive + (state.heavenBeadActive ? 5 : 0)}, heaven=${state.heavenBeadActive}, earth=${state.earthBeadsActive}`);
  }, [state, rodIndex]);

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

  // Unified touch gesture handling - ALL touches (1 or 2 fingers)
  // Detect which beads are touched, call toggle functions
  // Also supports mouse for browser testing
  useEffect(() => {
    if (disabled || !rodRef.current) return;

    const rodElement = rodRef.current;
    let mouseStartPos: { x: number; y: number; section: 'heaven' | 'earth'; earthBeadIndex?: number; hasTriggered: boolean } | null = null;

    const handleTouchStart = (e: TouchEvent) => {
      e.preventDefault(); // Handle ALL touches

      const startingValue = state.earthBeadsActive + (state.heavenBeadActive ? 5 : 0);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('🟢 TOUCH START | Starting value:', startingValue);
      console.log('   Heaven active:', state.heavenBeadActive, '| Earth active beads:', state.earthBeadsActive);

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
          // Simple fixed touch zones: each bead owns space equally around its center
          const earthY = relativeY - earthSectionStart;
          const actualEarthBeadHeight = beadSize * 1.0;
          const touchZoneRadius = actualEarthBeadHeight * 1.5; // Generous touch area

          let selectedBead = -1;
          let minDistance = Infinity;

          // Find the closest bead
          for (let i = 0; i < 4; i++) {
            const isActive = i < state.earthBeadsActive;
            const beadAbsoluteY = getEarthBeadY(i, isActive);
            const beadCenterY = beadAbsoluteY - earthSectionStart;
            const distance = Math.abs(earthY - beadCenterY);

            // Within touch radius of this bead?
            if (distance < touchZoneRadius && distance < minDistance) {
              minDistance = distance;
              selectedBead = i;
            }
          }

          return {
            section: 'earth' as const,
            earthBeadIndex: selectedBead,
          };
        }
      };

      // Clear pending toggles and preview on EVERY touch start
      // This handles the case where user adds/changes fingers without lifting all
      pendingToggles.current = {
        heaven: false,
        earthBeads: new Set(),
      };
      setPreviewTouches({}); // Clear stale previews

      // Process ALL touches
      for (let i = 0; i < e.touches.length; i++) {
        const touch = e.touches[i];
        const absoluteY = touch.clientY;
        const relativeY = absoluteY - rect.top;
        const info = getTouchInfo(absoluteY);

        console.log(`   Touch ${i}: absoluteY=${absoluteY.toFixed(1)} relativeY=${relativeY.toFixed(1)}`);

        if (info.section === 'heaven') {
          console.log('   → Detected: HEAVEN BEAD');
        } else if (info.section === 'earth' && info.earthBeadIndex !== undefined && info.earthBeadIndex !== -1) {
          const isActive = info.earthBeadIndex < state.earthBeadsActive;
          console.log(`   → Detected: Earth Bead ${info.earthBeadIndex} (${isActive ? 'ACTIVE' : 'INACTIVE'})`);
        } else {
          console.log('   → No bead detected at this position');
        }

        touchStartPositions.current.set(touch.identifier, {
          x: touch.clientX,
          y: touch.clientY,
          ...info,
        });

        // Mark what needs to toggle on release
        if (info.section === 'heaven') {
          pendingToggles.current.heaven = true;
        } else if (info.section === 'earth' && info.earthBeadIndex !== undefined && info.earthBeadIndex !== -1) {
          pendingToggles.current.earthBeads.add(info.earthBeadIndex);
        }
      }

      // Clear any existing timeout
      if (highlightTimeoutRef.current !== null) {
        clearTimeout(highlightTimeoutRef.current);
      }

      // Set failsafe timeout to clear highlights if touchend doesn't fire (2 seconds)
      highlightTimeoutRef.current = window.setTimeout(() => {
        console.log('⚠️ Failsafe timeout - clearing stuck highlights');
        setPreviewTouches({});
        touchStartPositions.current.clear();
        pendingToggles.current = {
          heaven: false,
          earthBeads: new Set(),
        };
      }, 2000);

      // Show visual preview
      let heavenPreview = false;
      let earthBeadPreview: number | undefined = undefined;

      for (let i = 0; i < e.touches.length; i++) {
        const info = getTouchInfo(e.touches[i].clientY);
        if (info.section === 'heaven') {
          heavenPreview = true;
        } else if (info.section === 'earth' && earthBeadPreview === undefined) {
          earthBeadPreview = info.earthBeadIndex;
        }
      }

      setPreviewTouches({
        heaven: heavenPreview,
        earthBead: earthBeadPreview,
      });

      try {
        Haptics.impact({ style: ImpactStyle.Light });
      } catch (e) {
        // Haptics not available
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      e.preventDefault(); // Prevent scrolling, but we don't toggle on move anymore
    };

    const handleTouchEnd = (e: TouchEvent) => {
      // Clean up touch tracking
      for (let i = 0; i < e.changedTouches.length; i++) {
        touchStartPositions.current.delete(e.changedTouches[i].identifier);
      }

      // All fingers lifted? Apply all pending toggles in ONE state update
      if (e.touches.length === 0) {
        console.log('🔴 TOUCH END | Applying changes...');

        // Clear the failsafe timeout
        if (highlightTimeoutRef.current !== null) {
          clearTimeout(highlightTimeoutRef.current);
          highlightTimeoutRef.current = null;
        }

        // Calculate the NEW state based on ALL toggles
        let newState = { ...state };

        // Toggle heaven if needed
        if (pendingToggles.current.heaven) {
          console.log('   Toggling heaven bead:', !state.heavenBeadActive ? 'ACTIVATE' : 'DEACTIVATE');
          newState.heavenBeadActive = !state.heavenBeadActive;
        }

        // Toggle earth beads if needed
        pendingToggles.current.earthBeads.forEach(beadIndex => {
          const isCurrentlyActive = beadIndex < state.earthBeadsActive;

          if (isCurrentlyActive) {
            console.log(`   Deactivating earth bead ${beadIndex} (and all above it)`);
            newState.earthBeadsActive = Math.min(newState.earthBeadsActive, beadIndex);
          } else {
            console.log(`   Activating earth bead ${beadIndex} (and all below it)`);
            newState.earthBeadsActive = Math.max(newState.earthBeadsActive, beadIndex + 1);
          }
        });

        const endingValue = newState.earthBeadsActive + (newState.heavenBeadActive ? 5 : 0);
        console.log('   Ending value:', endingValue);
        console.log('   Heaven active:', newState.heavenBeadActive, '| Earth active beads:', newState.earthBeadsActive);
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

        // Apply the complete state change in ONE update
        onStateChange(newState);

        try {
          Haptics.impact({ style: ImpactStyle.Medium });
        } catch (e) {
          // Haptics not available
        }

        touchStartPositions.current.clear();
        setPreviewTouches({});

        // Clear pending toggles
        pendingToggles.current = {
          heaven: false,
          earthBeads: new Set(),
        };
      }
    };

    const handleTouchCancel = (_e: TouchEvent) => {
      console.log('⚠️ TOUCH CANCELLED - cleaning up');

      // Clear the failsafe timeout
      if (highlightTimeoutRef.current !== null) {
        clearTimeout(highlightTimeoutRef.current);
        highlightTimeoutRef.current = null;
      }

      // Clean up everything
      touchStartPositions.current.clear();
      setPreviewTouches({});
      pendingToggles.current = {
        heaven: false,
        earthBeads: new Set(),
      };
    };

    // Mouse handlers for browser testing
    const handleMouseDown = (e: MouseEvent) => {
      e.preventDefault();

      const rect = rodElement.getBoundingClientRect();
      const getTouchInfo = (clientY: number) => {
        const relativeY = clientY - rect.top;
        const heavenSectionHeight = beadSize * 2.0 + beadSpacing * 3;
        const dividerHeight = 16;
        const earthSectionStart = heavenSectionHeight + dividerHeight;

        if (relativeY < heavenSectionHeight) {
          return { section: 'heaven' as const };
        } else {
          const earthY = relativeY - earthSectionStart;
          const actualEarthBeadHeight = beadSize * 1.0;

          let selectedBead = -1;

          for (let i = 0; i < 4; i++) {
            const isActive = i < state.earthBeadsActive;
            const beadCenterY = getEarthBeadY(i, isActive);

            let touchZoneStart, touchZoneEnd;

            if (isActive) {
              touchZoneStart = beadCenterY - actualEarthBeadHeight * 1.2;
              touchZoneEnd = beadCenterY + actualEarthBeadHeight * 0.5;
            } else {
              touchZoneStart = beadCenterY - actualEarthBeadHeight * 0.5;
              touchZoneEnd = beadCenterY + actualEarthBeadHeight * 1.2;
            }

            if (earthY >= touchZoneStart && earthY <= touchZoneEnd) {
              selectedBead = i;
              break;
            }
          }

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

      const info = getTouchInfo(e.clientY);
      mouseStartPos = {
        x: e.clientX,
        y: e.clientY,
        ...info,
        hasTriggered: false,
      };

      setPreviewTouches({
        heaven: info.section === 'heaven',
        earthBead: info.section === 'earth' ? info.earthBeadIndex : undefined,
      });
    };

    const handleMouseMove = (e: MouseEvent) => {
      e.preventDefault(); // Prevent text selection, but we don't toggle on move anymore
    };

    const handleMouseUp = () => {
      // Toggle bead on RELEASE (mouseup) - mouse is always single touch, so simple
      if (mouseStartPos) {
        if (mouseStartPos.section === 'heaven') {
          toggleHeavenBead();
        } else if (mouseStartPos.section === 'earth' && mouseStartPos.earthBeadIndex !== undefined) {
          toggleEarthBead(mouseStartPos.earthBeadIndex);
        }

        try {
          Haptics.impact({ style: ImpactStyle.Medium });
        } catch (e) {
          // Haptics not available
        }
      }

      mouseStartPos = null;
      setPreviewTouches({});
    };

    // Add both touch and mouse event listeners
    rodElement.addEventListener('touchstart', handleTouchStart, { passive: false });
    rodElement.addEventListener('touchmove', handleTouchMove, { passive: false });
    rodElement.addEventListener('touchend', handleTouchEnd);
    rodElement.addEventListener('touchcancel', handleTouchCancel);

    rodElement.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      // Clear timeout on cleanup
      if (highlightTimeoutRef.current !== null) {
        clearTimeout(highlightTimeoutRef.current);
      }

      rodElement.removeEventListener('touchstart', handleTouchStart);
      rodElement.removeEventListener('touchmove', handleTouchMove);
      rodElement.removeEventListener('touchend', handleTouchEnd);
      rodElement.removeEventListener('touchcancel', handleTouchCancel);

      rodElement.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [disabled, state, onStateChange, beadSize, beadSpacing]);

  return (
    <div
      ref={rodRef}
      style={{
        position: 'relative',
        width: sizeConfig.rodWidth,
        height: totalHeight,
        touchAction: 'none', // Prevent default touch behaviors
        userSelect: 'none', // Prevent text selection
        WebkitUserSelect: 'none', // iOS Safari
        WebkitTouchCallout: 'none', // Prevent iOS callout menu
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
            // Deactivating ACTIVE bead: only affects ACTIVE beads from touched bead and higher
            // Example: touching active bead 1 (when value=3) deactivates beads 1 and 2, but NOT bead 3 (already inactive)
            willBeAffected = isActive && beadIndex >= touchedBead;
          } else {
            // Activating INACTIVE bead: only affects INACTIVE beads from touched bead and lower
            // Example: touching inactive bead 2 (when value=1) activates beads 1 and 2, but NOT bead 0 (already active)
            willBeAffected = !isActive && beadIndex <= touchedBead;
          }
        }

        return (
          <Bead
            key={`earth-${beadIndex}`}
            type="earth"
            isActive={isActive}
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
