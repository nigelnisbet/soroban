# Soroban App Refactoring Plan

## Overview

The codebase has grown organically as we added modes. This refactoring consolidates duplicated patterns and creates a cleaner architecture for adding future modes (subtraction, multiplication, division).

## Phase 1: Extract Shared Feedback Components

### 1.1 Create `src/components/game/feedback/` directory structure

```
src/components/game/feedback/
├── index.ts                    # Re-exports
├── types.ts                    # Shared interfaces
├── utils.ts                    # Shared utility functions
├── FeedbackBead.tsx            # Consolidated GhostBead
├── FeedbackFlash.tsx           # Counter flash animation
├── CounterBoxRow.tsx           # Reusable counter row
└── ResultOverlay.tsx           # Checkmark/X result display
```

### 1.2 Extract shared types (`feedback/types.ts`)

- `BeadPosition` interface (duplicated 4x)
- `RodBeadState` interface (duplicated 4x)
- `FeedbackPhase` type
- `DigitVerificationState` type

### 1.3 Extract shared utilities (`feedback/utils.ts`)

- `getDigitForRod()` - duplicated 3x
- `calculateBeadPositions()` - similar logic in all 4 feedback components
- `sortBeadsForBurstAnimation()` - duplicated in SymbolicInput and Addition

### 1.4 Create `FeedbackBead.tsx`

Consolidate the GhostBead component (45-50 lines × 4 = ~200 lines → 1 component)

### 1.5 Create `FeedbackFlash.tsx`

Consolidate CounterFlash component (20 lines × 3 = ~60 lines → 1 component)

### 1.6 Create `CounterBoxRow.tsx`

Extract the counter box rendering that's repeated in:
- SymbolicDisplay.tsx
- SymbolicInputDisplay.tsx
- AdditionDisplay.tsx (twice - for first number and sum)

---

## Phase 2: Consolidate GameContainer State

### 2.1 Create unified feedback state structure

Replace 24 separate state variables with 2-3 structured state objects:

```typescript
// Current mess of state (lines 48-80 of GameContainer):
// - 4 general feedback states
// - 6 symbolic mode states
// - 6 symbolic input mode states
// - 10 addition mode states

// New structure:
interface FeedbackState {
  isActive: boolean;
  sorobanRect: DOMRect | null;
  counterBoxPositions: Map<number, DOMRect>;
  counterValues: number[];
  digitVerificationState: Map<number, VerificationState>;
  showCounters: boolean;
}

// For addition mode which needs two counter rows:
interface AdditionFeedbackState extends FeedbackState {
  sumCounterBoxPositions: Map<number, DOMRect>;
  sumCounterValues: number[];
  sumDigitVerificationState: Map<number, VerificationState>;
  showSumCounters: boolean;
}
```

### 2.2 Create mode-specific state slice for addition

```typescript
interface AdditionModeState {
  phase: AdditionPhase;
  firstFeedback: FeedbackState;
  sumFeedback: FeedbackState;
}
```

---

## Phase 3: Extract Mode Handlers

### 3.1 Create `src/components/game/handlers/` directory

```
src/components/game/handlers/
├── index.ts
├── types.ts                    # Handler interfaces
├── handleCheckSymbolic.ts
├── handleCheckSymbolicInput.ts
├── handleCheckAddition.ts
└── handleCheckTraditional.ts   # objects, tenFrames, tenFrameInput
```

### 3.2 Simplify handleCheck in GameContainer

```typescript
// Before: 80+ lines of nested if/else
// After:
const handleCheck = useCallback(() => {
  if (gameState !== 'AWAITING_INPUT') return;

  const handler = getCheckHandler(level.displayMode);
  handler({
    level,
    currentValue,
    currentProblem,
    sorobanRef,
    setFeedbackState,
    // ... other needed params
  });
}, [/* deps */]);
```

---

## Phase 4: Refactor Feedback Components

### 4.1 Update existing feedback components to use shared modules

- FormativeFeedback.tsx - use FeedbackBead, ResultOverlay
- SymbolicFormativeFeedback.tsx - use shared types, utils, FeedbackBead, FeedbackFlash
- SymbolicInputFormativeFeedback.tsx - use shared modules
- AdditionFormativeFeedback.tsx - use shared modules

### 4.2 Consider further consolidation

After Phase 1-3, evaluate if SymbolicInputFormativeFeedback and AdditionFormativeFeedback can be merged into a single configurable "BurstFeedback" component since they're nearly identical.

---

## Phase 5: Update Display Components

### 5.1 Refactor SymbolicDisplay to use CounterBoxRow
### 5.2 Refactor SymbolicInputDisplay to use CounterBoxRow
### 5.3 Refactor AdditionDisplay to use CounterBoxRow (×2)

---

## Implementation Order

1. **Phase 1.2-1.3** - Extract types and utils (low risk, immediate benefit)
2. **Phase 1.4-1.5** - Extract FeedbackBead and FeedbackFlash
3. **Phase 4.1** - Update feedback components to use extracted modules
4. **Phase 1.6** - Extract CounterBoxRow
5. **Phase 5** - Update display components
6. **Phase 2** - Consolidate GameContainer state
7. **Phase 3** - Extract mode handlers

This order minimizes risk - we extract shared code first (no behavior changes), then consolidate state (more complex).

---

## Expected Outcomes

| Metric | Before | After |
|--------|--------|-------|
| Lines in feedback components | ~4,000 | ~2,500 |
| State variables in GameContainer | 24 | 6-8 |
| Duplicated code blocks | 15+ | 0 |
| Time to add new mode | High | Low |

---

## Notes for Future Modes

After refactoring, adding subtraction/multiplication/division will follow this pattern:

1. Create level definition in `level1-counting.ts`
2. Add problem generator in `ProblemGenerator.ts`
3. Create `[Mode]Display.tsx` using CounterBoxRow
4. Create handler in `handlers/handleCheck[Mode].ts`
5. Wire up in GameContainer (minimal changes needed)
