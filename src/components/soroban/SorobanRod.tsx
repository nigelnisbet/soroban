import { Bead } from './Bead';
import { RodState, SIZES, SizeConfig } from '../../models/types';

interface SorobanRodProps {
  rodIndex: number;
  state: RodState;
  onStateChange: (newState: RodState) => void;
  disabled?: boolean;
  highlighted?: boolean;
  size: 'small' | 'medium' | 'large';
  /** Custom size config (overrides size preset if provided) */
  sizeConfig?: SizeConfig;
}

export function SorobanRod({
  rodIndex,
  state,
  onStateChange,
  disabled = false,
  highlighted = false,
  size,
  sizeConfig: customSizeConfig,
}: SorobanRodProps) {
  const sizeConfig = customSizeConfig || SIZES[size];
  const { beadSize, beadSpacing } = sizeConfig;

  // Calculate positions
  // Heaven section at top, divider bar in middle, earth section at bottom
  const heavenSectionHeight = beadSize * 1.5 + beadSpacing * 2;
  const dividerHeight = 12;
  const earthSectionHeight = beadSize * 4 + beadSpacing * 5;
  const totalHeight = heavenSectionHeight + dividerHeight + earthSectionHeight;

  // Heaven bead positions
  // Inactive: at top of heaven section (away from divider)
  // Active: pushed down toward divider
  const heavenInactiveY = beadSpacing;
  const heavenActiveY = heavenSectionHeight - beadSize * 0.9 - beadSpacing;

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
    const beadHeight = beadSize * 0.7;
    const stackSpacing = beadSpacing * 0.5;

    if (isActive) {
      // Active: pushed up against divider
      // Bead 0 closest to divider, stack downward
      return earthSectionStart + beadSpacing + beadIndex * (beadHeight + stackSpacing);
    } else {
      // Inactive: resting at bottom of earth section
      // Bead 0 at TOP of inactive stack (closest to divider, ready to move first)
      // Bead 3 at BOTTOM of inactive stack
      const bottomY = earthSectionStart + earthSectionHeight - beadHeight - beadSpacing;
      return bottomY - (3 - beadIndex) * (beadHeight + stackSpacing);
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

  return (
    <div
      style={{
        position: 'relative',
        width: sizeConfig.rodWidth,
        height: totalHeight,
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
        highlighted={highlighted}
        size={beadSize}
        positionY={state.heavenBeadActive ? heavenActiveY : heavenInactiveY}
      />

      {/* Earth beads (4 beads, each worth 1) */}
      {[0, 1, 2, 3].map((beadIndex) => {
        const isActive = beadIndex < state.earthBeadsActive;
        return (
          <Bead
            key={`earth-${beadIndex}`}
            type="earth"
            isActive={isActive}
            onToggle={() => toggleEarthBead(beadIndex)}
            disabled={disabled}
            highlighted={highlighted && !isActive && beadIndex === state.earthBeadsActive}
            size={beadSize}
            positionY={getEarthBeadY(beadIndex, isActive)}
          />
        );
      })}
    </div>
  );
}
