import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { SorobanRod } from './SorobanRod';
import {
  RodState,
  SorobanProps,
  SIZES,
  calculateSorobanValue,
  numberToRodStates,
} from '../../models/types';

export function Soroban({
  rodCount,
  initialValue = 0,
  onValueChange,
  disabled = false,
  highlightRod,
  highlightRods,
  showValue = true,
  size = 'medium',
  sizeConfig: customSizeConfig,
}: SorobanProps) {
  const [rods, setRods] = useState<RodState[]>(() =>
    numberToRodStates(initialValue, rodCount)
  );

  // Use custom size config if provided, otherwise use preset
  const sizeConfig = customSizeConfig || SIZES[size];
  const totalValue = calculateSorobanValue(rods);

  // Update rods when rodCount changes
  useEffect(() => {
    setRods((currentRods) => {
      if (currentRods.length === rodCount) return currentRods;
      const currentValue = calculateSorobanValue(currentRods);
      return numberToRodStates(currentValue, rodCount);
    });
  }, [rodCount]);

  // Reset to initialValue when it changes (e.g., new problem)
  useEffect(() => {
    setRods(numberToRodStates(initialValue, rodCount));
  }, [initialValue, rodCount]);

  // Notify parent of value changes
  useEffect(() => {
    onValueChange?.(totalValue);
  }, [totalValue, onValueChange]);

  const handleRodStateChange = useCallback((rodIndex: number, newState: RodState) => {
    setRods((currentRods) =>
      currentRods.map((rod) => (rod.rodIndex === rodIndex ? newState : rod))
    );
  }, []);

  // Reset to a specific value
  const resetToValue = useCallback(
    (value: number) => {
      setRods(numberToRodStates(value, rodCount));
    },
    [rodCount]
  );

  // Expose reset function via ref if needed (could add forwardRef later)

  // Calculate dimensions
  const rodWidth = sizeConfig.rodWidth;
  const framePadding = sizeConfig.framepadding;
  const frameWidth = rodCount * rodWidth + framePadding * 2;

  // Height calculation matching SorobanRod
  const beadSize = sizeConfig.beadSize;
  const beadSpacing = sizeConfig.beadSpacing;
  const heavenSectionHeight = beadSize * 1.5 + beadSpacing * 2;
  const dividerHeight = 12;
  const earthSectionHeight = beadSize * 4 + beadSpacing * 5;
  const frameHeight = heavenSectionHeight + dividerHeight + earthSectionHeight + framePadding * 2;

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 16,
      }}
    >
      {/* Main soroban frame */}
      <motion.div
        style={{
          position: 'relative',
          width: frameWidth,
          height: frameHeight,
          background: 'linear-gradient(135deg, #8B7355 0%, #6B5344 50%, #5D4632 100%)',
          borderRadius: 12,
          boxShadow: `
            0 8px 32px rgba(0, 0, 0, 0.3),
            inset 0 2px 4px rgba(255, 255, 255, 0.1),
            inset 0 -2px 4px rgba(0, 0, 0, 0.2)
          `,
          padding: framePadding,
          border: '4px solid #4A3728',
        }}
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 200, damping: 20 }}
      >
        {/* Inner frame shadow */}
        <div
          style={{
            position: 'absolute',
            inset: framePadding - 4,
            background: 'linear-gradient(180deg, rgba(0,0,0,0.1) 0%, transparent 20%, transparent 80%, rgba(0,0,0,0.1) 100%)',
            borderRadius: 8,
            pointerEvents: 'none',
          }}
        />

        {/* Top frame bar */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: framePadding,
            background: 'linear-gradient(180deg, #7A6548 0%, #5D4632 100%)',
            borderRadius: '8px 8px 0 0',
          }}
        />

        {/* Bottom frame bar */}
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: framePadding,
            background: 'linear-gradient(180deg, #5D4632 0%, #4A3728 100%)',
            borderRadius: '0 0 8px 8px',
          }}
        />

        {/* Rods container */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'row-reverse', // Rightmost rod is ones place
            justifyContent: 'center',
            height: '100%',
          }}
        >
          {rods.map((rod) => (
            <SorobanRod
              key={rod.rodIndex}
              rodIndex={rod.rodIndex}
              state={rod}
              onStateChange={(newState) => handleRodStateChange(rod.rodIndex, newState)}
              disabled={disabled}
              highlighted={highlightRod === rod.rodIndex}
              glowHighlight={highlightRods?.includes(rod.rodIndex)}
              size={size}
              sizeConfig={customSizeConfig}
            />
          ))}
        </div>
      </motion.div>

      {/* Value display - use visibility to preserve layout */}
      <motion.div
        style={{
          fontSize: size === 'large' ? 48 : size === 'medium' ? 36 : 28,
          fontWeight: 'bold',
          color: '#2D1810',
          fontFamily: '"Segoe UI", system-ui, sans-serif',
          textShadow: '0 2px 4px rgba(0,0,0,0.1)',
          visibility: showValue ? 'visible' : 'hidden',
        }}
        key={totalValue}
        initial={{ scale: 1.2, color: '#4CAF50' }}
        animate={{ scale: 1, color: '#2D1810' }}
        transition={{ duration: 0.3 }}
      >
        {totalValue}
      </motion.div>
    </div>
  );
}
