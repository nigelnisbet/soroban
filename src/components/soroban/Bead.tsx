import { motion } from 'framer-motion';

interface BeadProps {
  type: 'heaven' | 'earth';
  isActive: boolean;
  onToggle: () => void;
  disabled?: boolean;
  highlighted?: boolean;
  size: number;
  positionY: number;
}

export function Bead({
  type,
  isActive,
  onToggle,
  disabled = false,
  highlighted = false,
  size,
  positionY,
}: BeadProps) {
  // Heaven beads are slightly larger and a different color
  const beadHeight = type === 'heaven' ? size * 0.9 : size * 0.7;
  const beadWidth = size * 0.85;

  // Colors - Active beads should be brighter/more vibrant than inactive
  // Inactive: muted, darker tones (beads at rest)
  // Active: warm, bright tones (beads that are "counting")
  const inactiveColor = type === 'heaven' ? '#6B4423' : '#8B6914';
  const inactiveGradientEnd = type === 'heaven' ? '#3D2914' : '#4A3810';
  const activeColor = type === 'heaven' ? '#CD853F' : '#DAA520'; // Peru / Goldenrod - bright!
  const activeGradientEnd = type === 'heaven' ? '#8B5A2B' : '#B8860B'; // Warm brown / Dark goldenrod
  const highlightColor = '#FFD700';

  const handleClick = () => {
    if (!disabled) {
      onToggle();
    }
  };

  return (
    <motion.div
      onClick={handleClick}
      style={{
        position: 'absolute',
        left: '50%',
        cursor: disabled ? 'default' : 'pointer',
        touchAction: 'none',
        userSelect: 'none',
        WebkitUserSelect: 'none',
        zIndex: type === 'heaven' ? 10 : 5,
      }}
      initial={false}
      animate={{
        y: positionY,
        x: '-50%',
        scale: highlighted ? 1.1 : 1,
      }}
      whileHover={disabled ? {} : { scale: 1.05 }}
      whileTap={disabled ? {} : { scale: 0.95 }}
      transition={{
        type: 'spring',
        stiffness: 300,
        damping: 20,
      }}
    >
      {/* Bead shape - oval/ellipse */}
      <motion.div
        style={{
          width: beadWidth,
          height: beadHeight,
          borderRadius: '50%',
          background: `radial-gradient(ellipse at 30% 30%, ${
            highlighted ? highlightColor : isActive ? activeColor : inactiveColor
          } 0%, ${
            highlighted ? '#DAA520' : isActive ? activeGradientEnd : inactiveGradientEnd
          } 100%)`,
          boxShadow: highlighted
            ? '0 0 20px rgba(255, 215, 0, 0.6), inset 0 -4px 8px rgba(0,0,0,0.3)'
            : 'inset 0 -4px 8px rgba(0,0,0,0.3), 0 2px 4px rgba(0,0,0,0.2)',
          border: highlighted ? '2px solid #FFD700' : 'none',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
        animate={{
          boxShadow: highlighted
            ? [
                '0 0 20px rgba(255, 215, 0, 0.6), inset 0 -4px 8px rgba(0,0,0,0.3)',
                '0 0 30px rgba(255, 215, 0, 0.8), inset 0 -4px 8px rgba(0,0,0,0.3)',
                '0 0 20px rgba(255, 215, 0, 0.6), inset 0 -4px 8px rgba(0,0,0,0.3)',
              ]
            : 'inset 0 -4px 8px rgba(0,0,0,0.3), 0 2px 4px rgba(0,0,0,0.2)',
        }}
        transition={{
          duration: 1,
          repeat: highlighted ? Infinity : 0,
        }}
      >
        {/* Center hole for the rod to pass through */}
        <div
          style={{
            width: size * 0.15,
            height: size * 0.15,
            borderRadius: '50%',
            background: 'radial-gradient(circle, #2D1810 0%, #1A0F0A 100%)',
            boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.8)',
          }}
        />
      </motion.div>
    </motion.div>
  );
}
