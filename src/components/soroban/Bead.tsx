import { useRef } from 'react';
import { motion, PanInfo } from 'framer-motion';
import { Haptics, ImpactStyle } from '@capacitor/haptics';

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
  const hasTriggeredRef = useRef(false);

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

  const DRAG_THRESHOLD = 15; // pixels

  const handlePanStart = () => {
    if (disabled) return;
    hasTriggeredRef.current = false;

    // Light haptic on touch (will be silent in browser)
    try {
      Haptics.impact({ style: ImpactStyle.Light });
    } catch (e) {
      // Haptics not available in browser
    }
  };

  const handlePan = (_event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    if (disabled || hasTriggeredRef.current) return;

    const dragDistance = info.offset.y;

    // Heaven beads: drag DOWN to activate, drag UP to deactivate
    // Earth beads: drag UP to activate, drag DOWN to deactivate
    let shouldToggle = false;

    if (type === 'heaven') {
      if (!isActive && dragDistance > DRAG_THRESHOLD) {
        shouldToggle = true; // Drag down to activate
      } else if (isActive && dragDistance < -DRAG_THRESHOLD) {
        shouldToggle = true; // Drag up to deactivate
      }
    } else {
      // earth bead
      if (!isActive && dragDistance < -DRAG_THRESHOLD) {
        shouldToggle = true; // Drag up to activate
      } else if (isActive && dragDistance > DRAG_THRESHOLD) {
        shouldToggle = true; // Drag down to deactivate
      }
    }

    if (shouldToggle) {
      hasTriggeredRef.current = true;

      // Medium haptic on toggle
      try {
        Haptics.impact({ style: ImpactStyle.Medium });
      } catch (e) {
        // Haptics not available in browser
      }

      onToggle();
    }
  };

  return (
    <motion.div
      onPanStart={handlePanStart}
      onPan={handlePan}
      style={{
        position: 'absolute',
        left: '50%',
        cursor: disabled ? 'default' : 'grab',
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
      {/* Kite-shaped bead like real soroban - wider than tall */}
      <div
        style={{
          width: beadWidth,
          height: beadHeight,
          position: 'relative',
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
      </div>
    </motion.div>
  );
}
