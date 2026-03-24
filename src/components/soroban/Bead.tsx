import { motion } from 'framer-motion';

interface BeadProps {
  type: 'heaven' | 'earth';
  isActive: boolean;
  disabled?: boolean;
  highlighted?: boolean;
  size: number;
  positionY: number;
  locked?: boolean; // Bead is locked and cannot be activated
}

export function Bead({
  type,
  isActive,
  disabled = false,
  highlighted = false,
  size,
  positionY,
  locked = false,
}: BeadProps) {

  // Kite-shaped beads like real soroban - wider horizontally than vertically
  // Heaven beads are slightly larger - INCREASED HEIGHT for better multitouch
  const beadHeight = type === 'heaven' ? size * 1.1 : size * 1.0; // TALLER vertically
  const beadWidth = type === 'heaven' ? size * 1.7 : size * 1.6; // Keep width the same

  // Colors - Active beads should be brighter/more vibrant than inactive
  // Inactive: muted, darker tones (beads at rest)
  // Active: warm, bright tones (beads that are "counting")
  const inactiveColor = type === 'heaven' ? '#6B4423' : '#8B6914';
  const inactiveGradientEnd = type === 'heaven' ? '#3D2914' : '#4A3810';
  const activeColor = type === 'heaven' ? '#CD853F' : '#DAA520'; // Peru / Goldenrod - bright!
  const activeGradientEnd = type === 'heaven' ? '#8B5A2B' : '#B8860B'; // Warm brown / Dark goldenrod
  const highlightColor = '#FFD700';

  return (
    <motion.div
      style={{
        position: 'absolute',
        left: '50%',
        touchAction: 'none',
        userSelect: 'none',
        WebkitUserSelect: 'none',
        zIndex: type === 'heaven' ? 10 : 5,
        pointerEvents: 'none', // Let rod handle all touch events
        opacity: locked ? 0.3 : 1, // Dim locked beads
      }}
      initial={false}
      animate={{
        y: positionY,
        x: '-50%',
        scale: highlighted ? 1.1 : 1,
      }}
      transition={{
        type: 'spring',
        stiffness: 300,
        damping: 20,
      }}
    >
      {/* Kite-shaped bead like real soroban - wider than tall */}
      <div
        style={{
          width: beadWidth,
          height: beadHeight,
          position: 'relative',
          overflow: 'visible', // Allow glow to extend beyond bead
        }}
      >
        {/* Use SVG for proper kite/diamond shape with correct proportions */}
        <svg
          width={beadWidth}
          height={beadHeight}
          viewBox={`0 0 ${beadWidth} ${beadHeight}`}
          style={{
            position: 'absolute',
            filter: highlighted
              ? 'drop-shadow(0 0 8px rgba(255, 215, 0, 0.6))'
              : 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))',
          }}
        >
          <defs>
            <linearGradient id={`bead-grad-${type}-${isActive}-${highlighted}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop
                offset="0%"
                stopColor={highlighted ? highlightColor : isActive ? activeColor : inactiveColor}
              />
              <stop
                offset="100%"
                stopColor={highlighted ? '#DAA520' : isActive ? activeGradientEnd : inactiveGradientEnd}
              />
            </linearGradient>
            <filter id={`bevel-${type}`}>
              <feGaussianBlur in="SourceAlpha" stdDeviation="2" />
              <feOffset dx="1" dy="1" result="offsetblur" />
              <feComponentTransfer>
                <feFuncA type="linear" slope="0.5" />
              </feComponentTransfer>
              <feMerge>
                <feMergeNode />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          {/* Kite/diamond shape - wider horizontally than vertically */}
          <path
            d={`
              M ${beadWidth / 2} 2
              L ${beadWidth - 4} ${beadHeight / 2}
              L ${beadWidth / 2} ${beadHeight - 2}
              L 4 ${beadHeight / 2}
              Z
            `}
            fill={`url(#bead-grad-${type}-${isActive}-${highlighted})`}
            stroke={highlighted ? '#FFD700' : 'rgba(0,0,0,0.3)'}
            strokeWidth={highlighted ? '2' : '1'}
            filter={`url(#bevel-${type})`}
          />
          {/* Center hole */}
          <circle
            cx={beadWidth / 2}
            cy={beadHeight / 2}
            r={size * 0.12}
            fill="url(#hole-gradient)"
            stroke="rgba(0,0,0,0.5)"
            strokeWidth="1"
          />
          <defs>
            <radialGradient id="hole-gradient">
              <stop offset="0%" stopColor="#1A0F0A" />
              <stop offset="100%" stopColor="#2D1810" />
            </radialGradient>
          </defs>
        </svg>

        {/* Lock icon for locked beads */}
        {locked && (
          <div
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              fontSize: size * 0.35,
              color: '#000',
              textShadow: '0 1px 2px rgba(255,255,255,0.5)',
              pointerEvents: 'none',
            }}
          >
            🔒
          </div>
        )}
      </div>
    </motion.div>
  );
}
