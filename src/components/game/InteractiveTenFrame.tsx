import { useRef, useCallback, useState } from 'react';
import { motion } from 'framer-motion';

interface InteractiveTenFrameProps {
  value: number; // Current filled dots (0-10)
  onChange: (value: number) => void;
  disabled?: boolean;
  frameIndex: number; // For staggered animations
  cellSize: number; // Size from layout params
}

// A single interactive vertical ten frame (2 columns x 5 rows)
// User drags/touches to fill dots
// Fills from bottom-left, up the left column, then bottom-right, up the right column
export function InteractiveTenFrame({
  value,
  onChange,
  disabled = false,
  frameIndex,
  cellSize,
}: InteractiveTenFrameProps) {
  const frameRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [previewValue, setPreviewValue] = useState<number | null>(null);

  const gap = 2;
  const borderWidth = 2;
  const dotSize = Math.round(cellSize * 0.78);

  // Convert a position within the frame to a fill value (0-10)
  // Fill order: left column bottom-to-top (1-5), then right column bottom-to-top (6-10)
  const positionToValue = useCallback(
    (clientX: number, clientY: number): number => {
      if (!frameRef.current) return 0;

      const rect = frameRef.current.getBoundingClientRect();
      const relX = clientX - rect.left;
      const relY = clientY - rect.top;

      // Calculate which cell we're in
      const contentOffset = borderWidth * 2; // border + padding
      const cellWithGap = cellSize + gap;

      // Determine column (0 = left, 1 = right)
      const col = relX < rect.width / 2 ? 0 : 1;

      // Determine row (0 = top, 4 = bottom)
      // Clamp to valid range
      const rawRow = Math.floor((relY - contentOffset) / cellWithGap);
      const row = Math.max(0, Math.min(4, rawRow));

      // Convert to fill value based on fill order:
      // Left column (col 0): row 4->0 maps to values 1->5
      // Right column (col 1): row 4->0 maps to values 6->10
      if (col === 0) {
        // Left column: bottom (row 4) = 1, top (row 0) = 5
        return 5 - row;
      } else {
        // Right column: bottom (row 4) = 6, top (row 0) = 10
        return 10 - row;
      }
    },
    [cellSize]
  );

  // Handle pointer events for drag interaction
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

  // Determine how many dots to show (preview or actual value)
  const displayValue = previewValue !== null ? previewValue : value;

  // Generate dot positions based on fill order
  // Fill entire left column first (bottom to top), then entire right column
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

  const dotPositions = getDotPositions(displayValue);

  return (
    <motion.div
      ref={frameRef}
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(2, ${cellSize}px)`,
        gridTemplateRows: `repeat(5, ${cellSize}px)`,
        gap,
        padding: borderWidth,
        background: 'white',
        border: `${borderWidth}px solid ${isDragging ? '#4CAF50' : '#666'}`,
        borderRadius: 4,
        cursor: disabled ? 'default' : 'pointer',
        touchAction: 'none', // Prevent scrolling during drag
        userSelect: 'none',
      }}
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: frameIndex * 0.1, duration: 0.3 }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
      onPointerLeave={handlePointerCancel}
    >
      {/* Render cells */}
      {Array.from({ length: 10 }).map((_, cellIndex) => {
        const row = Math.floor(cellIndex / 2);
        const col = cellIndex % 2;

        // Check if this cell has a dot
        const dotInfo = dotPositions.find((d) => d.row === row && d.col === col);
        const hasDot = !!dotInfo;

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
            {/* Dot */}
            {hasDot && (
              <motion.div
                style={{
                  width: dotSize,
                  height: dotSize,
                  borderRadius: '50%',
                  background: previewValue !== null ? '#666' : '#333',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.3)',
                }}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: previewValue !== null ? 0.7 : 1 }}
                transition={{
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
