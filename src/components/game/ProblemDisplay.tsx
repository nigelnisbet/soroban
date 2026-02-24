import { motion, AnimatePresence } from 'framer-motion';
import { VisualObject, Problem, DisplayMode } from '../../models/types';
import { TenFrameDisplay, getFrameLayoutParams } from './TenFrameDisplay';

interface ProblemDisplayProps {
  problem: Problem | null;
  showCounting?: boolean;
  highlightObjects?: boolean;
  hideObjects?: boolean; // Hide objects but keep container visible (for formative feedback)
  hideFrames?: boolean; // Hide entire ten frame structure (for when all targets matched)
  displayMode?: DisplayMode; // How to display the number
  maxValue?: number; // Used for ten frame layout (determines frame count)
}

// SVG components for visual objects
function ObjectIcon({ type, size = 48 }: { type: VisualObject['type']; size?: number }) {
  const iconProps = {
    width: size,
    height: size,
    viewBox: '0 0 48 48',
  };

  switch (type) {
    case 'apple':
      return (
        <svg {...iconProps}>
          <circle cx="24" cy="26" r="18" fill="#E53935" />
          <ellipse cx="24" cy="26" rx="16" ry="14" fill="#EF5350" />
          <path d="M24 8 L26 14 Q28 10 26 6 Z" fill="#4CAF50" />
          <path d="M22 10 Q18 8 20 4" stroke="#8B4513" strokeWidth="2" fill="none" />
          <ellipse cx="18" cy="22" rx="4" ry="6" fill="rgba(255,255,255,0.3)" />
        </svg>
      );

    case 'star':
      return (
        <svg {...iconProps}>
          <path
            d="M24 4 L28 18 L44 18 L31 28 L36 44 L24 34 L12 44 L17 28 L4 18 L20 18 Z"
            fill="#FFD700"
            stroke="#FFA000"
            strokeWidth="1"
          />
          <path
            d="M24 8 L27 18 L38 18 L29 26 L33 38 L24 30 L15 38 L19 26 L10 18 L21 18 Z"
            fill="#FFEB3B"
          />
        </svg>
      );

    case 'butterfly':
      return (
        <svg {...iconProps}>
          <ellipse cx="16" cy="20" rx="12" ry="14" fill="#9C27B0" />
          <ellipse cx="32" cy="20" rx="12" ry="14" fill="#9C27B0" />
          <ellipse cx="16" cy="34" rx="8" ry="10" fill="#E91E63" />
          <ellipse cx="32" cy="34" rx="8" ry="10" fill="#E91E63" />
          <ellipse cx="24" cy="26" rx="3" ry="16" fill="#3E2723" />
          <circle cx="12" cy="16" r="3" fill="#FFD700" />
          <circle cx="36" cy="16" r="3" fill="#FFD700" />
          <path d="M22 10 Q24 4 26 10" stroke="#3E2723" strokeWidth="2" fill="none" />
          <circle cx="22" cy="6" r="2" fill="#3E2723" />
          <circle cx="26" cy="6" r="2" fill="#3E2723" />
        </svg>
      );

    case 'fish':
      return (
        <svg {...iconProps}>
          <ellipse cx="22" cy="24" rx="18" ry="12" fill="#2196F3" />
          <polygon points="40,24 48,16 48,32" fill="#2196F3" />
          <ellipse cx="22" cy="24" rx="14" ry="9" fill="#64B5F6" />
          <circle cx="12" cy="22" r="4" fill="white" />
          <circle cx="12" cy="22" r="2" fill="#1A237E" />
          <path d="M18 20 Q22 18 26 20" stroke="#1565C0" strokeWidth="1" fill="none" />
          <ellipse cx="30" cy="24" rx="2" ry="4" fill="#1565C0" opacity="0.3" />
        </svg>
      );

    case 'flower':
      return (
        <svg {...iconProps}>
          <ellipse cx="24" cy="12" rx="8" ry="10" fill="#E91E63" />
          <ellipse cx="36" cy="20" rx="8" ry="10" fill="#E91E63" transform="rotate(72, 36, 20)" />
          <ellipse cx="32" cy="34" rx="8" ry="10" fill="#E91E63" transform="rotate(144, 32, 34)" />
          <ellipse cx="16" cy="34" rx="8" ry="10" fill="#E91E63" transform="rotate(216, 16, 34)" />
          <ellipse cx="12" cy="20" rx="8" ry="10" fill="#E91E63" transform="rotate(288, 12, 20)" />
          <circle cx="24" cy="24" r="8" fill="#FFC107" />
          <circle cx="22" cy="22" r="2" fill="#FF8F00" />
          <circle cx="26" cy="22" r="2" fill="#FF8F00" />
          <circle cx="24" cy="26" r="2" fill="#FF8F00" />
        </svg>
      );

    case 'ball':
      return (
        <svg {...iconProps}>
          <circle cx="24" cy="24" r="20" fill="#F44336" />
          <circle cx="24" cy="24" r="16" fill="#EF5350" />
          <ellipse cx="18" cy="18" rx="6" ry="8" fill="rgba(255,255,255,0.4)" transform="rotate(-30, 18, 18)" />
          <path d="M8 24 Q24 18 40 24" stroke="white" strokeWidth="3" fill="none" opacity="0.6" />
        </svg>
      );

    default:
      return (
        <svg {...iconProps}>
          <circle cx="24" cy="24" r="20" fill="#9E9E9E" />
        </svg>
      );
  }
}

// Single visual object with animation
const OBJECT_SIZE = 56; // Size of the object icon

function VisualObjectDisplay({
  object,
  index,
  showNumber,
  highlight,
}: {
  object: VisualObject;
  index: number;
  showNumber?: boolean;
  highlight?: boolean;
}) {
  return (
    <motion.div
      style={{
        position: 'absolute',
        left: `${object.x}%`,
        top: `${object.y}%`,
        // Use margins to center instead of transform (transform conflicts with Framer Motion)
        marginLeft: -OBJECT_SIZE / 2,
        marginTop: -OBJECT_SIZE / 2,
      }}
      initial={{ scale: 0, opacity: 0 }}
      animate={{
        scale: highlight ? [1, 1.2, 1] : 1,
        opacity: 1,
      }}
      exit={{ scale: 0, opacity: 0 }}
      transition={{
        delay: index * 0.1,
        duration: 0.3,
        scale: highlight
          ? { duration: 0.6, repeat: Infinity, repeatDelay: 0.5 }
          : { duration: 0.3 },
      }}
    >
      <motion.div
        animate={
          highlight
            ? {
                filter: [
                  'drop-shadow(0 0 0px transparent)',
                  'drop-shadow(0 0 12px rgba(255, 215, 0, 0.8))',
                  'drop-shadow(0 0 0px transparent)',
                ],
              }
            : {}
        }
        transition={{ duration: 1, repeat: Infinity }}
      >
        <ObjectIcon type={object.type} size={56} />
      </motion.div>

      {/* Counting number overlay */}
      <AnimatePresence>
        {showNumber && (
          <motion.div
            initial={{ scale: 0, y: -20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0, y: -20 }}
            style={{
              position: 'absolute',
              top: -20,
              left: '50%',
              transform: 'translateX(-50%)',
              background: '#4CAF50',
              color: 'white',
              borderRadius: '50%',
              width: 28,
              height: 28,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 'bold',
              fontSize: 16,
              boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
            }}
          >
            {index + 1}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export function ProblemDisplay({
  problem,
  showCounting = false,
  highlightObjects = false,
  hideObjects = false,
  hideFrames = false,
  displayMode = 'objects',
  maxValue = 9,
}: ProblemDisplayProps) {
  if (!problem) {
    return null;
  }

  // Calculate container size based on display mode and max value
  // Objects mode: fixed 350x350 (works well for 1-9 objects)
  // Ten frames mode: dynamically sized to fit all frames in a row
  const getContainerSize = () => {
    if (displayMode === 'objects') {
      return { width: 350, height: 350 };
    }

    // Ten frames mode - calculate based on actual frame dimensions
    const { frameWidth, frameHeight, frameGap } = getFrameLayoutParams(maxValue);
    const maxFrameCount = Math.ceil(maxValue / 10);

    // Width: all possible frames in a row + padding
    const contentWidth = maxFrameCount * frameWidth + (maxFrameCount - 1) * frameGap;
    const containerWidth = contentWidth + 48; // 24px padding on each side

    // Height: single frame height + padding
    const containerHeight = frameHeight + 48; // 24px padding top and bottom

    return {
      width: Math.max(containerWidth, 200), // Minimum 200px
      height: Math.max(containerHeight, 250), // Minimum 250px
    };
  };

  const { width, height } = getContainerSize();

  return (
    <motion.div
      style={{
        position: 'relative',
        width,
        height,
        background: 'linear-gradient(135deg, #E3F2FD 0%, #BBDEFB 100%)',
        borderRadius: 20,
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1), inset 0 2px 4px rgba(255,255,255,0.5)',
        overflow: 'hidden',
        border: '3px solid #90CAF9',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      {/* Decorative background elements */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: `
            radial-gradient(circle at 20% 80%, rgba(255,255,255,0.3) 0%, transparent 30%),
            radial-gradient(circle at 80% 20%, rgba(255,255,255,0.3) 0%, transparent 30%)
          `,
          pointerEvents: 'none',
        }}
      />

      {/* Display mode: objects (countable items) */}
      {displayMode === 'objects' && !hideObjects && (
        <AnimatePresence mode="popLayout">
          {problem.objects.map((obj, index) => (
            <VisualObjectDisplay
              key={obj.id}
              object={obj}
              index={index}
              showNumber={showCounting}
              highlight={highlightObjects}
            />
          ))}
        </AnimatePresence>
      )}

      {/* Display mode: ten frames (dots in frames) */}
      {/* hideFrames hides entire structure, hideDots only hides the dots */}
      {displayMode === 'tenFrames' && !hideFrames && (
        <TenFrameDisplay
          value={problem.targetValue}
          maxValue={maxValue}
          hideDots={hideObjects}
        />
      )}

    </motion.div>
  );
}
