// Shared utility functions for feedback animations

import { SIZES, SizeConfig } from '../../../models/types';
import { BeadPosition, RodBeadState } from './types';

/**
 * Extract a single digit from a number at a specific rod position
 * Rod 0 = ones place, rod 1 = tens place, etc.
 */
export function getDigitForRod(value: number, rodIndex: number): number {
  return Math.floor(value / Math.pow(10, rodIndex)) % 10;
}

/**
 * Calculate bead starting positions from soroban rect and rod states
 *
 * Note: When mobileScale < 1, the sorobanRect from getBoundingClientRect() returns
 * screen coordinates after the CSS transform. We need to scale our size calculations
 * to match.
 */
export function calculateBeadPositions(
  rodStates: RodBeadState[],
  sorobanRect: DOMRect,
  rodCount: number,
  sizeConfig?: SizeConfig
): BeadPosition[] {
  const mobileScale = sizeConfig?.mobileScale ?? 1;

  // IMPORTANT: sorobanRect from getBoundingClientRect() is already in scaled screen coordinates
  // (the CSS transform: scale(mobileScale) is applied to the container).
  // So we need to scale our size calculations to match.
  const beadSize = (sizeConfig?.beadSize ?? SIZES.large.beadSize) * mobileScale;
  const beadSpacing = (sizeConfig?.beadSpacing ?? SIZES.large.beadSpacing) * mobileScale;
  const framePadding = (sizeConfig?.framepadding ?? SIZES.large.framepadding) * mobileScale;
  const rodWidth = (sizeConfig?.rodWidth ?? SIZES.large.rodWidth) * mobileScale;

  const heavenSectionHeight = beadSize * 1.5 + beadSpacing * 2;
  const dividerHeight = 12 * mobileScale;
  const earthSectionStart = heavenSectionHeight + dividerHeight;
  const beadHeight = beadSize * 0.7;
  const stackSpacing = beadSpacing * 0.5;
  const heavenBeadHeight = beadSize * 0.9;
  const heavenActiveY = heavenSectionHeight - heavenBeadHeight - beadSpacing;

  const borderWidth = 4 * mobileScale;
  const contentTop = sorobanRect.top + borderWidth + framePadding;

  // Calculate rod positions from frame center for accuracy
  const frameCenter = sorobanRect.left + sorobanRect.width / 2;

  const beads: BeadPosition[] = [];

  for (let rodIdx = 0; rodIdx < rodCount; rodIdx++) {
    const rodState = rodStates.find(r => r.rodIndex === rodIdx);
    if (!rodState) continue;

    // Calculate rod center from frame center directly (symmetric offset)
    const offsetFromCenter = (rodCount / 2 - rodIdx - 0.5) * rodWidth;
    const rodCenterX = frameCenter + offsetFromCenter;

    // Heaven bead first (increments by 5)
    if (rodState.heavenBeadActive) {
      beads.push({
        id: `rod${rodIdx}-heaven`,
        x: rodCenterX,
        y: contentTop + heavenActiveY + heavenBeadHeight / 2,
        isFromHeaven: true,
        rodIndex: rodIdx,
      });
    }

    // Earth beads
    for (let i = 0; i < rodState.earthBeadsActive; i++) {
      const positionY = earthSectionStart + beadSpacing + i * (beadHeight + stackSpacing);
      beads.push({
        id: `rod${rodIdx}-earth-${i}`,
        x: rodCenterX,
        y: contentTop + positionY + beadHeight / 2,
        isFromHeaven: false,
        rodIndex: rodIdx,
      });
    }
  }

  return beads;
}

/**
 * Sort beads for left-to-right rod progression animation
 * Highest rod index (leftmost visually) first, heaven beads before earth within each rod
 */
export function sortBeadsForBurstAnimation(beads: BeadPosition[]): BeadPosition[] {
  return [...beads].sort((a, b) => {
    // First by rod index descending (highest/leftmost first)
    if (b.rodIndex !== a.rodIndex) return b.rodIndex - a.rodIndex;
    // Within same rod, heaven beads first (they're worth 5)
    if (a.isFromHeaven !== b.isFromHeaven) return a.isFromHeaven ? -1 : 1;
    // Then by id for consistent ordering
    return a.id.localeCompare(b.id);
  });
}

/**
 * Calculate stagger delay for a bead in burst animation
 * Left-to-right rod progression with rapid-fire within each rod
 */
export function calculateBeadDelay(
  bead: BeadPosition,
  sortedBeads: BeadPosition[],
  rodPauseMs: number = 150,
  withinRodDelayMs: number = 40
): number {
  const beadIndex = sortedBeads.findIndex(b => b.id === bead.id);
  if (beadIndex === -1) return 0;

  let rodGroupDelay = 0;
  let withinRodDelay = 0;
  let currentRod = -1;
  let beadsInCurrentRod = 0;

  for (let i = 0; i <= beadIndex; i++) {
    const b = sortedBeads[i];
    if (b.rodIndex !== currentRod) {
      // New rod - add gap between rods
      if (currentRod !== -1) {
        rodGroupDelay += rodPauseMs / 1000; // Convert to seconds for framer-motion
      }
      currentRod = b.rodIndex;
      beadsInCurrentRod = 0;
    }
    if (i === beadIndex) {
      withinRodDelay = beadsInCurrentRod * (withinRodDelayMs / 1000);
    }
    beadsInCurrentRod++;
  }

  return rodGroupDelay + withinRodDelay;
}
