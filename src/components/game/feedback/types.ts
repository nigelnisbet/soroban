// Shared types for feedback animations

export interface BeadPosition {
  id: string;
  x: number;
  y: number;
  isFromHeaven: boolean;
  rodIndex: number;
}

export interface RodBeadState {
  rodIndex: number;
  heavenBeadActive: boolean;
  earthBeadsActive: number;
}

export type FeedbackPhase =
  | 'IDLE'
  | 'FADING_FRAME'
  | 'SPLITTING_HEAVEN'  // Used in symbolic mode (fan-out animation)
  | 'BEADS_FLYING'
  | 'VERIFYING_DIGITS'
  | 'SHOWING_RESULT'
  | 'COMPLETE';

export type DigitVerificationState = 'pending' | 'sliding' | 'matched' | 'mismatched';

export interface FlashPosition {
  x: number;
  y: number;
  delay: number;
}
