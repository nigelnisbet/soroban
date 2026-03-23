import { motion, AnimatePresence } from 'framer-motion';

interface VisualObjectsProps {
  count: number;
  highlighted?: Set<number>; // Indices of objects to highlight (for feedback)
  dimmed?: boolean; // Dim all objects
  matched?: Set<number>; // Indices of matched objects (will be hidden)
  showBlockingGlow?: boolean; // Show red glow on unmatched objects
}

export function VisualObjects({ count, highlighted, dimmed = false, matched, showBlockingGlow = false }: VisualObjectsProps) {
  // Arrange objects in a nice grid pattern
  const getGridLayout = (count: number) => {
    if (count <= 3) return { cols: count, rows: 1 };
    if (count <= 6) return { cols: 3, rows: 2 };
    if (count <= 9) return { cols: 3, rows: 3 };
    return { cols: 4, rows: Math.ceil(count / 4) };
  };

  const { cols, rows } = getGridLayout(count);
  const objects = Array.from({ length: count }, (_, i) => i);

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${cols}, 1fr)`,
        gridTemplateRows: `repeat(${rows}, 1fr)`,
        gap: 16,
        padding: 20,
        justifyItems: 'center',
        alignItems: 'center',
      }}
    >
      {objects.map((i) => {
        const isHighlighted = highlighted?.has(i);
        const isMatched = matched?.has(i);
        const shouldGlowRed = showBlockingGlow && !isMatched;

        return (
          <motion.div
            key={i}
            initial={{ scale: 0, opacity: 0 }}
            animate={{
              scale: isMatched ? 0 : 1,
              opacity: isMatched ? 0 : (dimmed && !isHighlighted ? 0.3 : 1),
            }}
            transition={{
              delay: isMatched ? 0 : i * 0.1,
              type: 'spring',
              stiffness: 300,
              damping: 20,
            }}
            style={{
              width: 60,
              height: 60,
              borderRadius: '50%',
              background: isHighlighted
                ? 'linear-gradient(135deg, #FF5722 0%, #E64A19 100%)'
                : 'linear-gradient(135deg, #4CAF50 0%, #2E7D32 100%)',
              boxShadow: shouldGlowRed
                ? '0 0 20px rgba(255, 0, 0, 1), 0 0 40px rgba(255, 0, 0, 0.8), 0 0 60px rgba(255, 0, 0, 0.6)'
                : isHighlighted
                ? '0 4px 20px rgba(255, 87, 34, 0.6)'
                : '0 4px 12px rgba(76, 175, 80, 0.4)',
              border: '3px solid white',
              visibility: isMatched ? 'hidden' : 'visible',
              position: 'relative',
              zIndex: 1,
              transition: 'box-shadow 0.2s ease-in-out',
            }}
          />
        );
      })}
    </div>
  );
}
