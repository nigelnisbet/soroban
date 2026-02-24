# Soroban Learning App - Development Notes

## Project Overview

Interactive soroban (Japanese abacus) learning app for children ages 4-9. Uses ST Math-style perception-action learning with visual problems, direct manipulation, and informative feedback. No reading required for youngest learners.

## Current Status

### Completed
- Core Soroban component with touch/drag interactions
- Multi-rod support (ones and tens columns)
- Heaven bead splitting animation (1 bead → 5 beads fan out)
- Sequential rod animation (tens rod animates first, then ones rod)
- Ten frame display mode for larger numbers
- Formative feedback system with one-to-one correspondence matching
- Ghost beads that fly from soroban to match targets
- Correct answer flow: beads match targets → ten frames disappear → green success overlay

### Nearly Complete - Visual Feedback
The positive feedback (correct answers) is working smoothly. The animation flow is:
1. FADING_FRAME - Soroban fades to 25% opacity, ghost beads overlay
2. SPLITTING_HEAVEN - Heaven bead splits into 5 (if active)
3. MATCHING - Beads fly one-by-one to match targets
4. All targets matched → soroban hides completely, ten frames disappear
5. SHOWING_RESULT - Green glow on problem display
6. COMPLETE - Advance to next problem

### Still TODO - Ten Frame Negative Feedback
When the child has **too few beads** (wrong answer):
- Extra unmatched dots/frames should pulse red
- Need visual indication of what's missing

When the child has **too many beads** (wrong answer):
- Extra beads fly to empty blue area ✓ (implemented)
- Extra beads pulse red ✓ (implemented)
- May need refinement of positioning/visibility

### Next Phase - Fully Symbolic Mode
After visual feedback is complete, implement symbolic mode:
- Display target as a number (not objects/ten frames)
- Child represents the number on soroban
- Feedback shows correctness without visual matching

## Key Files

### Core Components
- `src/components/soroban/Soroban.tsx` - Main soroban component
- `src/components/soroban/SorobanRod.tsx` - Single rod with beads
- `src/components/soroban/Bead.tsx` - Individual draggable bead

### Game Components
- `src/components/game/GameContainer.tsx` - Main game orchestration
- `src/components/game/FormativeFeedback.tsx` - ST Math-style feedback animations
- `src/components/game/ProblemDisplay.tsx` - Visual problem presentation
- `src/components/game/TenFrameDisplay.tsx` - Ten frame grid display

### Engine
- `src/engine/LearningEngine.ts` - Game state machine
- `src/engine/ProblemGenerator.ts` - Problem generation

### Types
- `src/models/types.ts` - Core type definitions

## Technical Details

### Animation Timing Fix (Important!)
The FormativeFeedback component had complex timing issues with React's async state batching. Key fixes:

1. **`animationStartedRef`** - Prevents useEffect from re-initializing animation when props change mid-animation. This was causing phase to reset to FADING_FRAME unexpectedly.

2. **`allTargetsMatchedRef`** - Synchronous ref checked at start of `moveToNextRod()` to skip directly to result. State updates are async, so checking `allTargetsMatched` state wasn't reliable.

3. **`moveToNextRodCalledRef`** - Prevents duplicate calls due to React StrictMode double-invocation.

4. **`pendingMoveTimeoutRef`** - Tracks setTimeout IDs so they can be cancelled when all targets match.

5. **Direct DOM manipulation** - In `handleAllTargetsMatched`, we set `sorobanRef.current.style.opacity = '0'` immediately to hide soroban synchronously, bypassing React's batching delay.

### Multi-Rod Animation Flow
```
rodsToAnimate = [1, 0]  // tens first, then ones

For each rod:
  1. If heaven bead active → SPLITTING_HEAVEN phase
  2. handleSplitComplete() → creates 5 spread beads
  3. MATCHING phase → beads fly to targets one by one
  4. handleBeadArrive() → tracks matches, detects completion
  5. moveToNextRod() → advance to next rod or show result
```

### Ten Frames Mode
- Ones beads (rod 0) → match individual dots in partial frame
- Tens beads (rod 1) → match entire 10-dot frames
- `getOnesDotPositions()` - Returns positions for ones dots
- `getTensFramePositions()` - Returns center positions for full frames

## Running the App

```bash
cd /Users/mindadmin/soroban-app
npm run dev    # Development server
npm run build  # Production build
```

## Level Configuration

Levels are defined in `src/levels/` with properties:
- `rodCount` - Number of soroban rods (1 or 2)
- `displayMode` - 'objects' | 'tenFrames'
- `valueRange` - { min, max } for problem values
- Object types for visual mode

## Known Issues / Edge Cases

1. React StrictMode causes double-invocations - handled with refs
2. Framer Motion animations can conflict with React state updates - use refs for synchronous checks
3. Ten frame layout needs `maxValue` to determine grid sizing

## Next Session Priorities

1. Test and refine negative feedback for ten frames mode
2. Ensure "too few beads" case shows unmatched targets clearly
3. Implement fully symbolic mode (number display, no visual matching)
4. Consider adding audio feedback (Howler.js is in the plan)

## Architecture Notes

The app uses:
- React 18 + TypeScript
- Vite for build tooling
- Framer Motion for animations and gestures
- Zustand for state management (game progress)

The feedback system is intentionally modeled after ST Math's approach:
- Visual problems that don't require reading
- Direct manipulation (drag beads)
- Immediate, informative feedback at every step
- Progressive hints if needed
