import { useState, useEffect, useMemo } from 'react';

export interface ResponsiveSizeConfig {
  beadSize: number;
  beadSpacing: number;
  rodWidth: number;
  framepadding: number;
  /** Whether we're in compact mode (small viewport height) */
  isCompact: boolean;
  /** Scale factor for mobile devices (0.9 = 90% scale) */
  mobileScale: number;
}

interface UseResponsiveSizeOptions {
  rodCount: number;
  /** Minimum padding on sides of screen (default 16) */
  minPadding?: number;
  /** Maximum bead size to cap at (default 72 for large) */
  maxBeadSize?: number;
  /** Minimum bead size for usability (default 36) */
  minBeadSize?: number;
}

/**
 * Hook that calculates optimal soroban sizing based on viewport and rod count.
 * Ensures the soroban fits on screen while maintaining touch-friendly bead sizes.
 * Also considers viewport height to enable compact mode on short screens.
 */
export function useResponsiveSize({
  rodCount,
  minPadding = 16,
  maxBeadSize = 72,
  minBeadSize = 36,
}: UseResponsiveSizeOptions): ResponsiveSizeConfig {
  const [viewportWidth, setViewportWidth] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth : 1024
  );
  const [viewportHeight, setViewportHeight] = useState(() =>
    typeof window !== 'undefined' ? window.innerHeight : 768
  );

  useEffect(() => {
    const handleResize = () => {
      setViewportWidth(window.innerWidth);
      setViewportHeight(window.innerHeight);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const sizeConfig = useMemo(() => {
    // Determine if we're in compact mode (phone in portrait with browser chrome)
    // Typical phone viewport with browser chrome: ~650-700px height
    const isCompact = viewportHeight < 750;

    // Available width for the soroban (accounting for padding on both sides)
    const availableWidth = viewportWidth - (minPadding * 2);

    // Calculate frame padding as proportion of available space
    // Smaller on phones, larger on desktop
    const framePaddingRatio = viewportWidth < 480 ? 0.03 : 0.04;
    const framePadding = Math.max(12, Math.min(24, availableWidth * framePaddingRatio));

    // Width available for rods (minus frame padding and border)
    const borderWidth = 4;
    const rodsAreaWidth = availableWidth - (framePadding * 2) - (borderWidth * 2);

    // Calculate rod width based on number of rods
    const idealRodWidth = rodsAreaWidth / rodCount;

    // Rod width determines bead size (bead is roughly 85% of rod width)
    const beadSizeFromRod = idealRodWidth * 0.75;

    // In compact mode, also constrain by height
    // Estimate needed height: header (~50) + digits (~60) + soroban + button (~70) + padding
    // Soroban height ≈ beadSize * 6.5 (heaven + earth + divider + padding)
    const maxBeadSizeFromHeight = isCompact
      ? (viewportHeight - 200) / 6.5  // Leave room for UI elements
      : maxBeadSize;

    // Clamp bead size to usable range, also considering height constraint
    const effectiveMaxBead = Math.min(maxBeadSize, maxBeadSizeFromHeight);
    const beadSize = Math.max(minBeadSize, Math.min(effectiveMaxBead, beadSizeFromRod));

    // Recalculate rod width from clamped bead size
    const rodWidth = beadSize / 0.75;

    // Bead spacing scales with bead size (tighter in compact mode)
    const beadSpacing = isCompact
      ? Math.max(4, beadSize * 0.10)
      : Math.max(6, beadSize * 0.15);

    // Mobile scale factor - slightly smaller on phones to reduce cramping
    // Apply 85% scale on narrow or short viewports
    const isMobile = viewportWidth < 500 || viewportHeight < 750;
    const mobileScale = isMobile ? 0.85 : 1.0;

    return {
      beadSize: Math.round(beadSize),
      beadSpacing: Math.round(beadSpacing),
      rodWidth: Math.round(rodWidth),
      framepadding: Math.round(framePadding),
      isCompact,
      mobileScale,
    };
  }, [viewportWidth, viewportHeight, rodCount, minPadding, maxBeadSize, minBeadSize]);

  return sizeConfig;
}

/**
 * Calculate the total frame width for a given size config and rod count
 */
export function calculateFrameWidth(config: ResponsiveSizeConfig, rodCount: number): number {
  return rodCount * config.rodWidth + config.framepadding * 2 + 8; // 8 for border
}

/**
 * Calculate the total frame height for a given size config
 */
export function calculateFrameHeight(config: ResponsiveSizeConfig): number {
  const { beadSize, beadSpacing, framepadding } = config;
  const heavenSectionHeight = beadSize * 1.5 + beadSpacing * 2;
  const dividerHeight = 12;
  const earthSectionHeight = beadSize * 4 + beadSpacing * 5;
  return heavenSectionHeight + dividerHeight + earthSectionHeight + framepadding * 2;
}
