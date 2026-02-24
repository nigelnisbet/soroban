import { useCallback, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { getFrameLayoutParams } from './TenFrameDisplay';

interface InteractiveTenFrameDisplayProps {
  value: number; // Total filled dots across all frames
  maxValue: number; // Determines frame count (10, 30, 99)
  onChange: (value: number) => void;
  disabled?: boolean;
  collapseToUsedFrames?: boolean; // When true, only show frames that have dots (for animation)
}

// Container for multiple interactive ten frames
// Frames fill left-to-right, first frame fills completely before second starts
export function InteractiveTenFrameDisplay({
  value,
  maxValue,
  onChange,
  disabled = false,
  collapseToUsedFrames = false,
}: InteractiveTenFrameDisplayProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [previewValue, setPreviewValue] = useState<number | null>(null);

  // Get layout params (same as TenFrameDisplay for consistency)
  const { cellSize, frameGap, frameWidth, frameHeight } = getFrameLayoutParams(maxValue);
  const gap = 2;
  const borderWidth = 2;
  const dotSize = Math.round(cellSize * 0.78);

  // Calculate frame count based on maxValue
  const frameCount = Math.ceil(maxValue / 10);

  // Convert global position to total value across all frames
  const positionToValue = useCallback(
    (clientX: number, clientY: number): number => {
      if (!containerRef.current) return 0;

      const containerRect = containerRef.current.getBoundingClientRect();

      // Calculate which frame we're in
      const totalWidth = frameCount * frameWidth + (frameCount - 1) * frameGap;
      const startX = containerRect.left + (containerRect.width - totalWidth) / 2;

      // Relative X from start of frames
      const relX = clientX - startX;

      // Find which frame index (0-based)
      let frameIndex = 0;
      let accumulatedX = 0;
      for (let i = 0; i < frameCount; i++) {
        const frameEnd = accumulatedX + frameWidth + (i < frameCount - 1 ? frameGap : 0);
        if (relX < frameEnd) {
          frameIndex = i;
          break;
        }
        accumulatedX = frameEnd;
        frameIndex = i;
      }

      // Clamp frame index
      frameIndex = Math.max(0, Math.min(frameCount - 1, frameIndex));

      // Position within this frame
      const frameStartX = startX + frameIndex * (frameWidth + frameGap);
      const frameStartY = containerRect.top + (containerRect.height - frameHeight) / 2;

      const frameRelX = clientX - frameStartX;
      const frameRelY = clientY - frameStartY;

      // If we're past the right edge of this frame, count it as full (10)
      // and potentially start filling the next frame
      if (frameRelX > frameWidth && frameIndex < frameCount - 1) {
        // We're in the gap between frames or past current frame
        // All previous frames are full, calculate value in next frame
        const baseValue = (frameIndex + 1) * 10;

        // Check if we're actually in the next frame
        const nextFrameStartX = frameStartX + frameWidth + frameGap;
        if (clientX >= nextFrameStartX) {
          // Recursively calculate for next frame area
          const nextFrameRelX = clientX - nextFrameStartX;
          const nextFrameRelY = clientY - frameStartY;
          const valueInNextFrame = calculateFrameValue(nextFrameRelX, nextFrameRelY, cellSize, gap, borderWidth);
          return Math.min(maxValue, baseValue + valueInNextFrame);
        }

        return Math.min(maxValue, baseValue);
      }

      // Calculate value within current frame
      const valueInFrame = calculateFrameValue(frameRelX, frameRelY, cellSize, gap, borderWidth);

      // Total value = full frames before this one + value in current frame
      const baseValue = frameIndex * 10;
      return Math.min(maxValue, baseValue + valueInFrame);
    },
    [frameCount, frameWidth, frameHeight, frameGap, cellSize, maxValue]
  );

  // Handle pointer events
  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (disabled) return;

      e.preventDefault();
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
      setIsDragging(true);

      const newValue = positionToValue(e.clientX, e.clientY);
      setPreviewValue(newValue);
    },
    [disabled, positionToValue]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!isDragging || disabled) return;

      const newValue = positionToValue(e.clientX, e.clientY);
      setPreviewValue(newValue);
    },
    [isDragging, disabled, positionToValue]
  );

  const handlePointerUp = useCallback(
    (e: React.PointerEvent) => {
      if (!isDragging) return;

      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
      setIsDragging(false);

      if (previewValue !== null) {
        onChange(previewValue);
      }
      setPreviewValue(null);
    },
    [isDragging, previewValue, onChange]
  );

  const handlePointerCancel = useCallback(() => {
    setIsDragging(false);
    setPreviewValue(null);
  }, []);

  // Determine display value
  const displayValue = previewValue !== null ? previewValue : value;

  // Calculate how many dots in each frame
  const getFrameValues = (totalValue: number): number[] => {
    const values: number[] = [];
    let remaining = totalValue;

    for (let i = 0; i < frameCount; i++) {
      const frameValue = Math.min(10, remaining);
      values.push(frameValue);
      remaining -= frameValue;
    }

    return values;
  };

  const frameValues = getFrameValues(displayValue);

  // When collapsing, filter to only frames with dots but keep track of original indices
  // This allows layoutId to stay consistent for smooth animation
  const visibleFrames = collapseToUsedFrames
    ? frameValues
        .map((value, originalIndex) => ({ value, originalIndex }))
        .filter(({ value }, i) => value > 0 || i === 0)
    : frameValues.map((value, originalIndex) => ({ value, originalIndex }));

  return (
    <motion.div
      ref={containerRef}
      style={{
        display: 'flex',
        gap: frameGap,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 16,
        touchAction: 'none',
        userSelect: 'none',
        cursor: disabled ? 'default' : 'pointer',
      }}
      // Only animate layout when collapsing, not on initial mount
      layout={collapseToUsedFrames}
      transition={{ duration: 0.3, ease: 'easeInOut' }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
      onPointerLeave={handlePointerCancel}
    >
      {visibleFrames.map(({ value: frameValue, originalIndex }, displayIndex) => (
        <SingleFrame
          key={originalIndex}
          value={frameValue}
          frameIndex={displayIndex}
          cellSize={cellSize}
          dotSize={dotSize}
          gap={gap}
          borderWidth={borderWidth}
          isPreview={previewValue !== null}
          isDragging={isDragging}
          isCollapsing={collapseToUsedFrames}
        />
      ))}
    </motion.div>
  );
}

// Helper to calculate value within a single frame based on position
function calculateFrameValue(
  relX: number,
  relY: number,
  cellSize: number,
  gap: number,
  borderWidth: number
): number {
  const contentOffset = borderWidth * 2;
  const cellWithGap = cellSize + gap;
  const frameWidth = cellSize * 2 + gap + borderWidth * 4;
  const frameHeight = cellSize * 5 + gap * 4 + borderWidth * 4;

  // Clamp to frame bounds
  if (relX < 0 || relY < 0) return 0;
  if (relX > frameWidth || relY > frameHeight) return 10;

  // Determine column (0 = left, 1 = right)
  const col = relX < frameWidth / 2 ? 0 : 1;

  // Determine row from Y position (0 = top, 4 = bottom)
  const rawRow = Math.floor((relY - contentOffset) / cellWithGap);
  const row = Math.max(0, Math.min(4, rawRow));

  // Convert to fill value
  // Left column: row 4->0 maps to 1->5
  // Right column: row 4->0 maps to 6->10
  if (col === 0) {
    return 5 - row;
  } else {
    return 10 - row;
  }
}

// Single frame display (not directly interactive - parent handles events)
function SingleFrame({
  value,
  frameIndex,
  cellSize,
  dotSize,
  gap,
  borderWidth,
  isPreview,
  isDragging,
  isCollapsing = false,
}: {
  value: number;
  frameIndex: number;
  cellSize: number;
  dotSize: number;
  gap: number;
  borderWidth: number;
  isPreview: boolean;
  isDragging: boolean;
  isCollapsing?: boolean;
}) {
  // Generate dot positions based on fill order
  const getDotPositions = (filled: number) => {
    const positions: { row: number; col: number; index: number }[] = [];
    let dotIndex = 0;

    for (let col = 0; col <= 1 && dotIndex < filled; col++) {
      for (let row = 4; row >= 0 && dotIndex < filled; row--) {
        positions.push({ row, col, index: dotIndex });
        dotIndex++;
      }
    }

    return positions;
  };

  const dotPositions = getDotPositions(value);
  const isFull = value === 10;

  return (
    <motion.div
      layout={isCollapsing}
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(2, ${cellSize}px)`,
        gridTemplateRows: `repeat(5, ${cellSize}px)`,
        gap,
        padding: borderWidth,
        background: isFull ? '#e8e8e8' : 'white',
        border: `${borderWidth}px solid ${isDragging ? '#4CAF50' : isFull ? '#999' : '#666'}`,
        borderRadius: 4,
        pointerEvents: 'none', // Parent handles all events
      }}
      initial={isCollapsing ? false : { opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
    >
      {Array.from({ length: 10 }).map((_, cellIndex) => {
        const row = Math.floor(cellIndex / 2);
        const col = cellIndex % 2;
        const dotInfo = dotPositions.find((d) => d.row === row && d.col === col);
        const hasDot = !!dotInfo;

        return (
          <div
            key={cellIndex}
            style={{
              width: cellSize,
              height: cellSize,
              background: isFull ? '#efefef' : '#f5f5f5',
              border: `1px solid ${isFull ? '#ccc' : '#ddd'}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {hasDot && (
              <motion.div
                style={{
                  width: dotSize,
                  height: dotSize,
                  borderRadius: '50%',
                  background: isPreview ? '#666' : '#333',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.3)',
                }}
                // Skip animation when collapsing - dots are already in place
                initial={isCollapsing ? false : { scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: isPreview ? 0.7 : 1 }}
                transition={isCollapsing ? { duration: 0 } : {
                  duration: 0.15,
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
