import { motion } from 'framer-motion';

interface TenFrameDisplayProps {
  value: number;
  maxValue: number; // Determines layout: 20 = 2 frames, 30 = 3 frames, 99 = 10 frames (2 rows)
  hideDots?: boolean; // Hide dots but keep frames visible (for formative feedback)
}

// A single vertical ten frame (2 columns x 5 rows)
// Fills from bottom-left, then bottom-right, working upward
function TenFrame({
  filled,
  frameIndex,
  totalFrames,
  hideDots,
  dotSize,
  cellSize,
  isFull, // If true, show as solid grey (no individual dots)
}: {
  filled: number; // 0-10 dots to show
  frameIndex: number;
  totalFrames: number;
  hideDots?: boolean;
  dotSize: number;
  cellSize: number;
  isFull?: boolean; // Full frames render as solid grey background
}) {
  const gap = 2;
  const borderWidth = 2;

  // Generate dot positions - fill entire left column first (bottom to top), then right column
  const getDotPositions = () => {
    const positions: { row: number; col: number; index: number }[] = [];
    let dotIndex = 0;

    // Fill entire left column first (bottom to top), then entire right column
    for (let col = 0; col <= 1 && dotIndex < filled; col++) {
      for (let row = 4; row >= 0 && dotIndex < filled; row--) {
        positions.push({ row, col, index: dotIndex });
        dotIndex++;
      }
    }

    return positions;
  };

  const dotPositions = getDotPositions();

  // Full frames show slightly off-white background with visible dots
  if (isFull) {
    return (
      <motion.div
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(2, ${cellSize}px)`,
          gridTemplateRows: `repeat(5, ${cellSize}px)`,
          gap,
          padding: borderWidth,
          background: '#e8e8e8', // Light off-white frame background
          border: `${borderWidth}px solid #999`,
          borderRadius: 4,
        }}
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: frameIndex * 0.1, duration: 0.3 }}
      >
        {/* Render cells with dots */}
        {Array.from({ length: 10 }).map((_, cellIndex) => (
          <div
            key={cellIndex}
            style={{
              width: cellSize,
              height: cellSize,
              background: '#efefef', // Very light grey cells
              border: '1px solid #ccc',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {/* Dot - black like regular dots */}
            {!hideDots && (
              <motion.div
                style={{
                  width: dotSize,
                  height: dotSize,
                  borderRadius: '50%',
                  background: '#333', // Same black as partial frame dots
                  boxShadow: '0 1px 2px rgba(0,0,0,0.3)',
                }}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{
                  delay: frameIndex * 0.1 + cellIndex * 0.02,
                  duration: 0.15,
                  type: 'spring',
                  stiffness: 400,
                  damping: 20,
                }}
              />
            )}
          </div>
        ))}
      </motion.div>
    );
  }

  return (
    <motion.div
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(2, ${cellSize}px)`,
        gridTemplateRows: `repeat(5, ${cellSize}px)`,
        gap,
        padding: borderWidth,
        background: 'white',
        border: `${borderWidth}px solid #666`,
        borderRadius: 4,
      }}
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: frameIndex * 0.1, duration: 0.3 }}
    >
      {/* Render cells */}
      {Array.from({ length: 10 }).map((_, cellIndex) => {
        const row = Math.floor(cellIndex / 2);
        const col = cellIndex % 2;

        // Check if this cell has a dot
        const dotInfo = dotPositions.find(d => d.row === row && d.col === col);

        return (
          <div
            key={cellIndex}
            style={{
              width: cellSize,
              height: cellSize,
              background: '#f5f5f5',
              border: '1px solid #ddd',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {/* Dot - simple black circle */}
            {dotInfo && !hideDots && (
              <motion.div
                style={{
                  width: dotSize,
                  height: dotSize,
                  borderRadius: '50%',
                  background: '#333',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.3)',
                }}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{
                  delay: frameIndex * 0.1 + dotInfo.index * 0.05,
                  duration: 0.2,
                  type: 'spring',
                  stiffness: 400,
                  damping: 20,
                }}
              />
            )}
          </div>
        );
      })}
    </motion.div>
  );
}

export function TenFrameDisplay({ value, maxValue, hideDots = false }: TenFrameDisplayProps) {
  // Layout: ALWAYS side-by-side (left to right)
  // Full frames on LEFT, partial frame on RIGHT
  // (matches place value reading: tens on left, ones on right)

  const tens = Math.floor(value / 10);
  const ones = value % 10;

  // Calculate frame count needed
  const maxFrameCount = Math.ceil(maxValue / 10);

  // Scale down cell size as frame count increases to fit in container
  // 1-2 frames: 36px, 3-4 frames: 32px, 5-6 frames: 28px, 7+ frames: 24px
  const cellSize = maxFrameCount <= 2 ? 36 : maxFrameCount <= 4 ? 32 : maxFrameCount <= 6 ? 28 : 24;
  const dotSize = Math.round(cellSize * 0.78); // Proportional dot size
  const frameGap = maxFrameCount <= 4 ? 16 : 12;

  // Build frames array: only include frames that have content
  const frames: { filled: number; isFull: boolean; key: string }[] = [];

  // Add full frames (tens) on the left
  for (let i = 0; i < tens; i++) {
    frames.push({ filled: 10, isFull: true, key: `tens-${i}` });
  }

  // Add partial frame (ones) on the right - only if there are ones
  if (ones > 0) {
    frames.push({ filled: ones, isFull: false, key: `ones` });
  }

  // If value is 0, show one empty frame
  if (frames.length === 0) {
    frames.push({ filled: 0, isFull: false, key: `empty` });
  }

  return (
    <div
      style={{
        display: 'flex',
        gap: frameGap,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 16,
        // No flexWrap - all frames must stay in one row (L-R layout)
      }}
    >
      {frames.map((frame, i) => (
        <TenFrame
          key={frame.key}
          filled={frame.filled}
          frameIndex={i}
          totalFrames={frames.length}
          hideDots={hideDots}
          dotSize={dotSize}
          cellSize={cellSize}
          isFull={frame.isFull}
        />
      ))}
    </div>
  );
}

// Helper function to calculate frame layout dimensions
// Must match TenFrameDisplay component exactly
// Exported for use in FormativeFeedback overlay
export function getFrameLayoutParams(maxValue: number) {
  const maxFrameCount = Math.ceil(maxValue / 10);
  const cellSize = maxFrameCount <= 2 ? 36 : maxFrameCount <= 4 ? 32 : maxFrameCount <= 6 ? 28 : 24;
  const gap = 2;
  const borderWidth = 2;
  const padding = borderWidth; // Frame uses borderWidth as padding
  const contentOffset = borderWidth + padding;
  const frameGap = maxFrameCount <= 4 ? 16 : 12;
  const frameWidth = cellSize * 2 + gap + borderWidth * 2 + padding * 2;
  const frameHeight = cellSize * 5 + gap * 4 + borderWidth * 2 + padding * 2;

  return { cellSize, gap, borderWidth, padding, contentOffset, frameGap, frameWidth, frameHeight };
}

// Export dot positions for use in FormativeFeedback
// NOTE: This returns positions for ALL dots (including in full frames)
// For animation purposes, use getOnesDotPositions() and getTensFramePositions() instead
export function getTenFrameDotPositions(
  value: number,
  maxValue: number,
  containerRect: DOMRect
): { x: number; y: number; id: string }[] {
  const positions: { x: number; y: number; id: string }[] = [];
  const tens = Math.floor(value / 10);
  const ones = value % 10;

  const { cellSize, gap, contentOffset, frameGap, frameWidth, frameHeight } = getFrameLayoutParams(maxValue);

  // Calculate actual frame count (only frames with content)
  const actualFrameCount = tens + (ones > 0 ? 1 : 0) || 1;
  const totalWidth = actualFrameCount * frameWidth + (actualFrameCount - 1) * frameGap;
  const startX = containerRect.left + (containerRect.width - totalWidth) / 2;
  const startY = containerRect.top + (containerRect.height - frameHeight) / 2;

  let dotIndex = 0;

  // Full frames (tens) on the LEFT
  for (let frame = 0; frame < tens; frame++) {
    const frameX = startX + frame * (frameWidth + frameGap);
    // Fill entire left column first, then entire right column
    for (let col = 0; col <= 1; col++) {
      for (let row = 4; row >= 0; row--) {
        const x = frameX + contentOffset + col * (cellSize + gap) + cellSize / 2;
        const y = startY + contentOffset + row * (cellSize + gap) + cellSize / 2;
        positions.push({ x, y, id: `dot-${dotIndex}` });
        dotIndex++;
      }
    }
  }

  // Partial frame (ones) on the RIGHT
  if (ones > 0) {
    const onesFrameX = startX + tens * (frameWidth + frameGap);
    for (let col = 0; col <= 1 && dotIndex < value; col++) {
      for (let row = 4; row >= 0 && dotIndex < value; row--) {
        const x = onesFrameX + contentOffset + col * (cellSize + gap) + cellSize / 2;
        const y = startY + contentOffset + row * (cellSize + gap) + cellSize / 2;
        positions.push({ x, y, id: `dot-${dotIndex}` });
        dotIndex++;
      }
    }
  }

  return positions;
}

// Export frame center positions for tens beads (each bead matches entire frame)
// Full frames are on the LEFT, partial frame on the RIGHT
export function getTenFrameCenterPositions(
  value: number,
  maxValue: number,
  containerRect: DOMRect
): { x: number; y: number; id: string; isFull: boolean }[] {
  const positions: { x: number; y: number; id: string; isFull: boolean }[] = [];
  const tens = Math.floor(value / 10);
  const ones = value % 10;

  const { frameGap, frameWidth, frameHeight } = getFrameLayoutParams(maxValue);

  // Calculate actual frame count (only frames with content)
  const actualFrameCount = tens + (ones > 0 ? 1 : 0) || 1;
  const totalWidth = actualFrameCount * frameWidth + (actualFrameCount - 1) * frameGap;
  const startX = containerRect.left + (containerRect.width - totalWidth) / 2;
  const startY = containerRect.top + (containerRect.height - frameHeight) / 2;

  // Full frames (tens) on the left
  for (let frame = 0; frame < tens; frame++) {
    const frameX = startX + frame * (frameWidth + frameGap);
    positions.push({
      x: frameX + frameWidth / 2,
      y: startY + frameHeight / 2,
      id: `frame-tens-${frame}`,
      isFull: true,
    });
  }

  // Partial frame (ones) - immediately after full frames
  if (ones > 0) {
    const onesFrameX = startX + tens * (frameWidth + frameGap);
    positions.push({
      x: onesFrameX + frameWidth / 2,
      y: startY + frameHeight / 2,
      id: `frame-ones`,
      isFull: false,
    });
  }

  return positions;
}

// Get only the ones dots (for ones rod beads in tenFrames mode)
// Ones frame is on the RIGHT (after full frames)
export function getOnesDotPositions(
  value: number,
  maxValue: number,
  containerRect: DOMRect
): { x: number; y: number; id: string }[] {
  const ones = value % 10;
  if (ones === 0) return [];

  const positions: { x: number; y: number; id: string }[] = [];
  const tens = Math.floor(value / 10);

  const { cellSize, gap, contentOffset, frameGap, frameWidth, frameHeight } = getFrameLayoutParams(maxValue);

  // Calculate actual frame count (only frames with content)
  const actualFrameCount = tens + (ones > 0 ? 1 : 0) || 1;
  const totalWidth = actualFrameCount * frameWidth + (actualFrameCount - 1) * frameGap;
  const startX = containerRect.left + (containerRect.width - totalWidth) / 2;
  const startY = containerRect.top + (containerRect.height - frameHeight) / 2;

  // Ones frame is immediately after tens frames
  const onesFrameX = startX + tens * (frameWidth + frameGap);

  // Fill entire left column first, then entire right column
  let dotIndex = 0;
  for (let col = 0; col <= 1 && dotIndex < ones; col++) {
    for (let row = 4; row >= 0 && dotIndex < ones; row--) {
      const x = onesFrameX + contentOffset + col * (cellSize + gap) + cellSize / 2;
      const y = startY + contentOffset + row * (cellSize + gap) + cellSize / 2;
      positions.push({ x, y, id: `ones-dot-${dotIndex}` });
      dotIndex++;
    }
  }

  return positions;
}

// Get only the full frame positions (for tens rod beads)
// Full frames are on the LEFT
export function getTensFramePositions(
  value: number,
  maxValue: number,
  containerRect: DOMRect
): { x: number; y: number; id: string }[] {
  const tens = Math.floor(value / 10);
  if (tens === 0) return [];

  const positions: { x: number; y: number; id: string }[] = [];
  const ones = value % 10;

  const { frameGap, frameWidth, frameHeight } = getFrameLayoutParams(maxValue);

  // Calculate actual frame count (only frames with content)
  const actualFrameCount = tens + (ones > 0 ? 1 : 0) || 1;
  const totalWidth = actualFrameCount * frameWidth + (actualFrameCount - 1) * frameGap;
  const startX = containerRect.left + (containerRect.width - totalWidth) / 2;
  const startY = containerRect.top + (containerRect.height - frameHeight) / 2;

  // Full frames are on the left side
  for (let frame = 0; frame < tens; frame++) {
    const frameX = startX + frame * (frameWidth + frameGap);
    positions.push({
      x: frameX + frameWidth / 2,
      y: startY + frameHeight / 2,
      id: `tens-frame-${frame}`,
    });
  }

  return positions;
}

// Get the partial frame position (if any) - this is the rightmost frame with < 10 dots
export function getPartialFramePosition(
  value: number,
  maxValue: number,
  containerRect: DOMRect
): { x: number; y: number; dotsInFrame: number } | null {
  const tens = Math.floor(value / 10);
  const ones = value % 10;

  // No partial frame if ones is 0
  if (ones === 0) return null;

  const { frameGap, frameWidth, frameHeight } = getFrameLayoutParams(maxValue);

  // Calculate actual frame count (only frames with content)
  const actualFrameCount = tens + 1; // tens full frames + 1 partial
  const totalWidth = actualFrameCount * frameWidth + (actualFrameCount - 1) * frameGap;
  const startX = containerRect.left + (containerRect.width - totalWidth) / 2;
  const startY = containerRect.top + (containerRect.height - frameHeight) / 2;

  // Partial frame is at position 'tens' (0-indexed, so after all full frames)
  const frameX = startX + tens * (frameWidth + frameGap);

  return {
    x: frameX + frameWidth / 2,
    y: startY + frameHeight / 2,
    dotsInFrame: ones,
  };
}
