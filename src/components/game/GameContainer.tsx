import { useEffect, useCallback, useRef, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Soroban } from '../soroban/Soroban';
import { ProblemDisplay } from './ProblemDisplay';
import { FeedbackOverlay } from './FeedbackOverlay';
import { FormativeFeedback } from './FormativeFeedback';
import { InteractiveTenFrameDisplay } from './InteractiveTenFrameDisplay';
import { SymbolicDisplay } from './SymbolicDisplay';
import { SymbolicFormativeFeedback } from './SymbolicFormativeFeedback';
import { SymbolicInputDisplay } from './SymbolicInputDisplay';
import { SymbolicInputFormativeFeedback } from './SymbolicInputFormativeFeedback';
import { AdditionDisplay, AdditionPhase } from './AdditionDisplay';
import { DirectFeedback } from './feedback';
import { LevelInstructionPopup, DEMO_LEVEL_INSTRUCTIONS } from './LevelInstructionPopup';
import { useLearningEngine, calculateSessionStats } from '../../engine/LearningEngine';
import { LevelDefinition, numberToRodStates, SizeConfig } from '../../models/types';
import { generateProblemSequence, generateRollingAdditionProblem, generateComplementSequence } from '../../engine/ProblemGenerator';
import { useResponsiveSize } from '../../hooks/useResponsiveSize';

interface GameContainerProps {
  level: LevelDefinition;
  onExit: () => void;
  onLevelComplete: (stats: ReturnType<typeof calculateSessionStats>) => void;
}

export function GameContainer({ level, onExit, onLevelComplete }: GameContainerProps) {
  const {
    gameState,
    currentProblem,
    currentValue,
    attemptCount,
    hintLevel,
    feedbackType,
    isCorrect,
    sessionResults,
    problemIndex,
    sessionProblems,
    startLevel,
    updateCurrentValue,
    submitAnswerImmediate,
    requestHint,
    exitLevel,
  } = useLearningEngine();

  // Refs for element positioning (for formative feedback animation)
  const problemDisplayRef = useRef<HTMLDivElement>(null);
  const sorobanRef = useRef<HTMLDivElement>(null);

  // State for formative feedback animation
  const [showFormativeFeedback, setShowFormativeFeedback] = useState(false);
  const [sorobanRect, setSorobanRect] = useState<DOMRect | null>(null);
  const [problemDisplayRect, setProblemDisplayRect] = useState<DOMRect | null>(null);
  const [sorobanResetKey, setSorobanResetKey] = useState(0); // Increment to force soroban reset
  const [hideFrames, setHideFrames] = useState(false); // Hide ten frames when all targets matched
  const hideFramesRef = useRef(false); // Synchronous ref for immediate soroban hiding
  const [flashActiveElement, setFlashActiveElement] = useState(false); // Flash to show what's interactive
  // Frozen problem state - captures problem when feedback starts to prevent flash during transition
  const [frozenProblem, setFrozenProblem] = useState<typeof currentProblem>(null);

  // State for symbolic mode
  const [symbolicCounterValues, setSymbolicCounterValues] = useState<number[]>(Array(level.rodCount).fill(0));
  const [symbolicShowCounters, setSymbolicShowCounters] = useState(false);
  const [counterBoxPositions, setCounterBoxPositions] = useState<Map<number, DOMRect>>(new Map());
  const [digitVerificationState, setDigitVerificationState] = useState<Map<number, 'pending' | 'sliding' | 'matched' | 'mismatched'>>(new Map());
  const symbolicDisplayRef = useRef<HTMLDivElement>(null);

  // State for symbolic input mode (reverse symbolic)
  const [symbolicInputValues, setSymbolicInputValues] = useState<(number | null)[]>(Array(level.rodCount).fill(null));
  const [symbolicInputCounterValues, setSymbolicInputCounterValues] = useState<number[]>(Array(level.rodCount).fill(0));
  const [symbolicInputShowCounters, setSymbolicInputShowCounters] = useState(false);
  const [symbolicInputCounterBoxPositions, setSymbolicInputCounterBoxPositions] = useState<Map<number, DOMRect>>(new Map());
  const symbolicInputDisplayRef = useRef<HTMLDivElement>(null);

  // State for addition mode
  const [additionPhase, setAdditionPhase] = useState<AdditionPhase>('ENTERING_FIRST');
  const [additionFirstCounterValues, setAdditionFirstCounterValues] = useState<number[]>(Array(level.rodCount).fill(0));
  const [additionSumCounterValues, setAdditionSumCounterValues] = useState<number[]>(Array(level.rodCount).fill(0));
  const [additionShowFirstCounters, setAdditionShowFirstCounters] = useState(false);
  const [additionShowSumCounters, setAdditionShowSumCounters] = useState(false);
  const [additionFirstCounterBoxPositions, setAdditionFirstCounterBoxPositions] = useState<Map<number, DOMRect>>(new Map());
  const [additionSumCounterBoxPositions, setAdditionSumCounterBoxPositions] = useState<Map<number, DOMRect>>(new Map());
  const [additionFirstDigitVerificationState, setAdditionFirstDigitVerificationState] = useState<Map<number, 'pending' | 'sliding' | 'matched' | 'mismatched'>>(new Map());
  const [additionSumDigitVerificationState, setAdditionSumDigitVerificationState] = useState<Map<number, 'pending' | 'sliding' | 'matched' | 'mismatched'>>(new Map());
  const additionDisplayRef = useRef<HTMLDivElement>(null);
  // For streamlined direct feedback (correct answer path)
  const [additionSumDigitBoxPositions, setAdditionSumDigitBoxPositions] = useState<Map<number, DOMRect>>(new Map());
  const [additionFlashingDigits, setAdditionFlashingDigits] = useState<Set<number>>(new Set());
  const [showDirectFeedback, setShowDirectFeedback] = useState(false);
  const [showSumForDirectFeedback, setShowSumForDirectFeedback] = useState(false);
  // Initial value for addition soroban (reset to operand1 after wrong sum)
  const [additionSorobanInitialValue, setAdditionSorobanInitialValue] = useState(0);

  // State for rolling addition mode
  const [rollingSum, setRollingSum] = useState<number | null>(null);
  const [rollingProblem, setRollingProblem] = useState<ReturnType<typeof generateRollingAdditionProblem> | null>(null);

  // Timer state for rolling addition leaderboard
  const [levelStartTime, setLevelStartTime] = useState<number | null>(null);
  const [levelElapsedTime, setLevelElapsedTime] = useState<number>(0);
  const [leaderboardRank, setLeaderboardRank] = useState<number | null>(null);

  // Level instruction popup state
  const [showInstructionPopup, setShowInstructionPopup] = useState(false);

  // Calculate effective rod count (dynamic for rolling addition)
  const effectiveRodCount = useMemo(() => {
    if (level.displayMode === 'rollingAddition' && rollingProblem) {
      return rollingProblem.requiredRods;
    }
    return level.rodCount;
  }, [level.displayMode, level.rodCount, rollingProblem]);

  // Effective problem for rolling addition (uses rollingProblem instead of currentProblem)
  const effectiveProblem = useMemo(() => {
    if (level.displayMode === 'rollingAddition' && rollingProblem) {
      return rollingProblem;
    }
    return currentProblem;
  }, [level.displayMode, rollingProblem, currentProblem]);

  // Display problem - uses frozen problem during feedback to prevent flash
  const displayProblem = useMemo(() => {
    if ((showFormativeFeedback || showDirectFeedback || showSumForDirectFeedback) && frozenProblem) {
      return frozenProblem;
    }
    return effectiveProblem;
  }, [showFormativeFeedback, showDirectFeedback, showSumForDirectFeedback, frozenProblem, effectiveProblem]);

  // Responsive sizing for phone screens (uses effective rod count)
  const responsiveSizeConfig = useResponsiveSize({ rodCount: effectiveRodCount });

  // Initialize level on mount (generate problems for this level)
  // Use a ref tied to the level.id to handle both Strict Mode and level changes
  const levelIdRef = useRef<number | null>(null);

  useEffect(() => {
    // Skip if already initialized for THIS specific level (handles React Strict Mode double-mount)
    if (levelIdRef.current === level.id) return;
    levelIdRef.current = level.id;

    if (level.displayMode === 'rollingAddition') {
      // For rolling addition, generate the first problem and use a single placeholder in the sequence
      const firstProblem = generateRollingAdditionProblem(null, level.rodCount);
      setRollingProblem(firstProblem);
      setRollingSum(null);
      // Start timer for leaderboard
      setLevelStartTime(Date.now());
      setLevelElapsedTime(0);
      setLeaderboardRank(null);
      // Use 10 problems for rolling mode
      const placeholderProblems = Array.from({ length: 10 }, () => firstProblem);
      useLearningEngine.getState().startLevel(level, placeholderProblems);
    } else if (level.id >= 201 && level.id <= 210) {
      // Complement drilling levels - 201-209 use fixed addend, 210 uses random 1-9
      const problems = generateComplementSequence(level.id, 10);
      useLearningEngine.getState().startLevel(level, problems);
    } else {
      const problems = generateProblemSequence(level, 10);
      useLearningEngine.getState().startLevel(level, problems);
    }

    // Show instruction popup for demo levels on first visit
    if (DEMO_LEVEL_INSTRUCTIONS[level.id]) {
      const seenKey = `soroban-level-${level.id}-seen`;
      const hasSeenInstruction = localStorage.getItem(seenKey);
      if (!hasSeenInstruction) {
        setShowInstructionPopup(true);
      }
    }
  }, [level]);

  // Auto-transition to awaiting input when in PRESENTING_PROBLEM state
  useEffect(() => {
    if (gameState === 'PRESENTING_PROBLEM') {
      const timer = setTimeout(() => {
        useLearningEngine.getState().startAwaitingInput();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [gameState]);

  // Leaderboard helpers for rolling addition
  const getLeaderboard = useCallback((levelId: number): number[] => {
    try {
      const stored = localStorage.getItem(`soroban-leaderboard-${levelId}`);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }, []);

  const saveToLeaderboard = useCallback((levelId: number, timeMs: number): number => {
    const leaderboard = getLeaderboard(levelId);
    leaderboard.push(timeMs);
    leaderboard.sort((a, b) => a - b); // Sort fastest first
    const top5 = leaderboard.slice(0, 5);
    localStorage.setItem(`soroban-leaderboard-${levelId}`, JSON.stringify(top5));
    // Return rank (1-based, or 0 if not in top 5)
    const rank = top5.indexOf(timeMs);
    return rank >= 0 ? rank + 1 : 0;
  }, [getLeaderboard]);

  // Handle level completion
  useEffect(() => {
    if (gameState === 'LEVEL_COMPLETE') {
      const stats = calculateSessionStats(sessionResults);
      onLevelComplete(stats);

      // For rolling addition, calculate elapsed time and save to leaderboard
      if (level.displayMode === 'rollingAddition' && levelStartTime) {
        const elapsed = Date.now() - levelStartTime;
        setLevelElapsedTime(elapsed);
        const rank = saveToLeaderboard(level.id, elapsed);
        setLeaderboardRank(rank);
      }
    }
  }, [gameState, sessionResults, onLevelComplete, level.displayMode, level.id, levelStartTime, saveToLeaderboard]);

  // Handle soroban value change
  const handleValueChange = useCallback(
    (value: number) => {
      updateCurrentValue(value);
    },
    [updateCurrentValue]
  );

  // Handle check button click - now triggers formative feedback animation
  const handleCheck = useCallback(() => {
    if (gameState === 'AWAITING_INPUT') {
      // Reset sorobanRect to null to ensure feedback component waits for fresh position
      // This prevents using stale rect from previous problem
      setSorobanRect(null);

      // Capture positions for animation before state changes
      if (level.displayMode === 'symbolic' || level.displayMode === 'symbolicAdvanced') {
        // Symbolic modes use symbolicDisplayRef instead of problemDisplayRef
        // First show counters, then capture soroban position after layout settles
        setSymbolicCounterValues(Array(level.rodCount).fill(0));
        setSymbolicShowCounters(true);
        setDigitVerificationState(new Map());
        // Wait for counter row animation (300ms) to complete before capturing position
        setTimeout(() => {
          if (sorobanRef.current) {
            setSorobanRect(sorobanRef.current.getBoundingClientRect());
          }
        }, 350);
      } else if (level.displayMode === 'symbolicInput') {
        // Symbolic input mode - beads fly up to counter boxes, then counter verifies against user input
        // First show the counter row, then capture soroban position after layout settles
        setSymbolicInputCounterValues(Array(level.rodCount).fill(0));
        setSymbolicInputShowCounters(true);
        setDigitVerificationState(new Map());
        // Wait for counter row animation (300ms) to complete before capturing position
        setTimeout(() => {
          if (sorobanRef.current) {
            setSorobanRect(sorobanRef.current.getBoundingClientRect());
          }
        }, 350);
      } else if (level.displayMode === 'addition' || level.displayMode === 'rollingAddition') {
        // Addition mode - handle based on current phase
        const activeProblem = effectiveProblem;
        const activeRodCount = effectiveRodCount;

        if (additionPhase === 'ENTERING_FIRST') {
          // Check if first number is correct
          const isFirstCorrect = currentValue === activeProblem?.operand1;

          if (isFirstCorrect) {
            // Correct! Skip verification animation, go straight to showing second number
            setAdditionPhase('SHOWING_SECOND');
            setTimeout(() => {
              setAdditionPhase('ENTERING_SUM');
            }, 800);
            return; // Don't set showFormativeFeedback
          } else {
            // Wrong - show verification animation to reveal the error
            setAdditionPhase('VERIFYING_FIRST');
            setAdditionFirstCounterValues(Array(activeRodCount).fill(0));
            setAdditionShowFirstCounters(true);
            setAdditionFirstDigitVerificationState(new Map());
            // Delay capturing soroban rect until after counter row animation completes (300ms) and layout has settled
            setTimeout(() => {
              if (sorobanRef.current) {
                setSorobanRect(sorobanRef.current.getBoundingClientRect());
              }
            }, 350);
          }
        } else if (additionPhase === 'ENTERING_SUM') {
          // Check if sum is correct
          const expectedSum = (activeProblem?.operand1 ?? 0) + (activeProblem?.operand2 ?? 0);
          const isSumCorrect = currentValue === expectedSum;

          if (isSumCorrect) {
            // Correct! Show sum row first, then start direct feedback once positions are captured
            setAdditionFlashingDigits(new Set());
            setShowSumForDirectFeedback(true);
            // Freeze the problem to prevent flash during transition
            setFrozenProblem(effectiveProblem);
            // Wait for sum row to render and report positions
            setTimeout(() => {
              if (sorobanRef.current) {
                setSorobanRect(sorobanRef.current.getBoundingClientRect());
              }
              setShowDirectFeedback(true);
            }, 100);
            return; // Don't set showFormativeFeedback
          } else {
            // Wrong - show full verification with counter row
            setAdditionPhase('VERIFYING_SUM');
            setAdditionSumCounterValues(Array(activeRodCount).fill(0));
            setAdditionShowSumCounters(true);
            setAdditionSumDigitVerificationState(new Map());
            // Wait for counter row animation (300ms) to complete before capturing position
            setTimeout(() => {
              if (sorobanRef.current) {
                setSorobanRect(sorobanRef.current.getBoundingClientRect());
              }
            }, 350);
          }
        } else {
          // Not in an input phase, ignore
          return;
        }
      } else if (sorobanRef.current && problemDisplayRef.current) {
        setSorobanRect(sorobanRef.current.getBoundingClientRect());
        setProblemDisplayRect(problemDisplayRef.current.getBoundingClientRect());
      }

      // Freeze the current problem to prevent display flash during transition
      setFrozenProblem(effectiveProblem);
      setShowFormativeFeedback(true);
    }
  }, [gameState, level.displayMode, effectiveRodCount, additionPhase, currentValue, effectiveProblem]);

  // Handle try again after incorrect
  const handleTryAgain = useCallback(() => {
    if (feedbackType === 'INCORRECT' || feedbackType === 'CLOSE') {
      // Just dismiss feedback and let them try again
      requestHint();
    }
  }, [feedbackType, requestHint]);

  // Handle dismissing the instruction popup
  const handleDismissInstructionPopup = useCallback(() => {
    setShowInstructionPopup(false);
    // Mark this level's instruction as seen
    const seenKey = `soroban-level-${level.id}-seen`;
    localStorage.setItem(seenKey, 'true');
  }, [level.id]);

  // Handle restart for rolling addition leaderboard mode
  const handleRestartLevel = useCallback(() => {
    if (level.displayMode === 'rollingAddition') {
      // Reset all rolling addition state
      const firstProblem = generateRollingAdditionProblem(null, level.rodCount);
      setRollingProblem(firstProblem);
      setRollingSum(null);
      setAdditionPhase('ENTERING_FIRST');
      setAdditionSorobanInitialValue(0);
      setSorobanResetKey(prev => prev + 1);
      setLevelStartTime(Date.now());
      setLevelElapsedTime(0);
      setLeaderboardRank(null);
      // Restart the level with fresh problems
      const placeholderProblems = Array.from({ length: 10 }, () => firstProblem);
      useLearningEngine.getState().startLevel(level, placeholderProblems);
    }
  }, [level]);

  // Handle formative feedback animation completion
  const handleFormativeFeedbackComplete = useCallback((wasCorrect: boolean) => {
    // Record result and advance to next problem
    submitAnswerImmediate(wasCorrect);
    // If incorrect, increment reset key to force soroban to reset to 0
    if (!wasCorrect) {
      setSorobanResetKey(prev => prev + 1);
    }
    // Keep overlay visible while new puzzle renders and animates in
    // 500ms = enough time for objects to animate in (300ms + stagger delays)
    setTimeout(() => {
      setShowFormativeFeedback(false);
      setFrozenProblem(null); // Clear frozen problem now that feedback is done
      setHideFrames(false); // Reset hideFrames for next problem
      hideFramesRef.current = false; // Reset ref too
      // Reset symbolic mode state
      setSymbolicShowCounters(false);
      setSymbolicCounterValues(Array(level.rodCount).fill(0));
      setDigitVerificationState(new Map());
      // Reset symbolic input mode state
      setSymbolicInputValues(Array(level.rodCount).fill(null));
      setSymbolicInputShowCounters(false);
      setSymbolicInputCounterValues(Array(level.rodCount).fill(0));
      // Reset soroban opacity via DOM (will be overridden by React on next render anyway)
      if (sorobanRef.current) {
        sorobanRef.current.style.opacity = '';
      }
    }, wasCorrect ? 500 : 50);
  }, [submitAnswerImmediate, level.rodCount]);

  // Handle click on game area - flash interactive element if clicking elsewhere
  const handleGameAreaClick = useCallback((e: React.MouseEvent) => {
    // Only trigger if we're awaiting input and not already flashing
    if (gameState !== 'AWAITING_INPUT' || flashActiveElement) return;

    // Check if the click was on the interactive element
    // In tenFrameInput mode, problemDisplayRef is interactive
    // In symbolicInput mode, symbolicInputDisplayRef is interactive
    // Otherwise sorobanRef is interactive
    let interactiveElement: HTMLElement | null = null;
    if (level.displayMode === 'tenFrameInput') {
      interactiveElement = problemDisplayRef.current;
    } else if (level.displayMode === 'symbolicInput') {
      interactiveElement = symbolicInputDisplayRef.current;
    } else {
      interactiveElement = sorobanRef.current;
    }

    if (interactiveElement && interactiveElement.contains(e.target as Node)) {
      return; // Click was on interactive element, don't flash
    }

    // Flash the interactive element
    setFlashActiveElement(true);
    setTimeout(() => setFlashActiveElement(false), 300); // Single pulse
  }, [gameState, flashActiveElement, level.displayMode]);

  // Handle when all targets are matched (hide the ten frames)
  const handleAllTargetsMatched = useCallback(() => {
    // Set ref FIRST for synchronous DOM update, then state for React re-render
    hideFramesRef.current = true;
    // Immediately update the soroban wrapper opacity via direct DOM manipulation
    // This avoids the React state batching delay that causes the flash
    if (sorobanRef.current) {
      sorobanRef.current.style.opacity = '0';
    }
    setHideFrames(true);
  }, []);

  // Handle symbolic mode counter box position updates
  const handleCounterBoxRefs = useCallback((refs: Map<number, DOMRect>) => {
    setCounterBoxPositions(refs);
  }, []);

  // Handle symbolic mode counter increment
  const handleSymbolicCounterIncrement = useCallback((rodIndex: number, newValue: number) => {
    setSymbolicCounterValues(prev => {
      const next = [...prev];
      next[rodIndex] = newValue;
      return next;
    });
  }, []);

  // Handle symbolic digit verification state change
  const handleDigitVerificationStateChange = useCallback((state: Map<number, 'pending' | 'sliding' | 'matched' | 'mismatched'>) => {
    setDigitVerificationState(state);
  }, []);

  // Handle symbolic input mode digit change
  const handleSymbolicInputDigitChange = useCallback((rodIndex: number, value: number | null) => {
    setSymbolicInputValues(prev => {
      const next = [...prev];
      next[rodIndex] = value;
      return next;
    });
  }, []);

  // Handle symbolic input mode counter box position updates
  const handleSymbolicInputCounterBoxRefs = useCallback((refs: Map<number, DOMRect>) => {
    setSymbolicInputCounterBoxPositions(refs);
  }, []);

  // Handle symbolic input mode counter increment
  const handleSymbolicInputCounterIncrement = useCallback((rodIndex: number, newValue: number) => {
    setSymbolicInputCounterValues(prev => {
      const next = [...prev];
      next[rodIndex] = newValue;
      return next;
    });
  }, []);

  // Reset symbolic input values when problem changes
  useEffect(() => {
    if (currentProblem) {
      setSymbolicInputValues(Array(level.rodCount).fill(null));
    }
  }, [currentProblem?.id, level.rodCount]);

  // Reset addition mode state when problem changes
  useEffect(() => {
    if (currentProblem && level.displayMode === 'addition') {
      setAdditionPhase('ENTERING_FIRST');
      setAdditionFirstCounterValues(Array(level.rodCount).fill(0));
      setAdditionSumCounterValues(Array(level.rodCount).fill(0));
      setAdditionShowFirstCounters(false);
      setAdditionShowSumCounters(false);
      setAdditionFirstDigitVerificationState(new Map());
      setAdditionSumDigitVerificationState(new Map());
      setAdditionSorobanInitialValue(0); // Start fresh for new problem
    }
  }, [currentProblem?.id, level.displayMode, level.rodCount]);

  // Handle addition mode counter box position updates
  const handleAdditionFirstCounterBoxRefs = useCallback((refs: Map<number, DOMRect>) => {
    setAdditionFirstCounterBoxPositions(refs);
  }, []);

  const handleAdditionSumCounterBoxRefs = useCallback((refs: Map<number, DOMRect>) => {
    setAdditionSumCounterBoxPositions(refs);
  }, []);

  // Handle addition mode counter increments
  const handleAdditionFirstCounterIncrement = useCallback((rodIndex: number, newValue: number) => {
    setAdditionFirstCounterValues(prev => {
      const next = [...prev];
      next[rodIndex] = newValue;
      return next;
    });
  }, []);

  const handleAdditionSumCounterIncrement = useCallback((rodIndex: number, newValue: number) => {
    setAdditionSumCounterValues(prev => {
      const next = [...prev];
      next[rodIndex] = newValue;
      return next;
    });
  }, []);

  // Handle addition first number verification complete
  const handleAdditionFirstComplete = useCallback((wasCorrect: boolean) => {
    if (wasCorrect) {
      // First number correct - hide counters, show second number
      setAdditionShowFirstCounters(false);
      setAdditionFirstDigitVerificationState(new Map());
      setShowFormativeFeedback(false);
      // Small delay then show second number
      setTimeout(() => {
        setAdditionPhase('SHOWING_SECOND');
        // After second number animates in, enable sum entry
        setTimeout(() => {
          setAdditionPhase('ENTERING_SUM');
        }, 800);
      }, 300);
    } else {
      // First number wrong - reset soroban and try again
      setSorobanResetKey(prev => prev + 1);
      setShowFormativeFeedback(false);
      setAdditionShowFirstCounters(false);
      setAdditionFirstCounterValues(Array(level.rodCount).fill(0));
      setAdditionFirstDigitVerificationState(new Map());
      setAdditionPhase('ENTERING_FIRST');
    }
  }, [level.rodCount]);

  // Handle addition sum verification complete
  const handleAdditionSumComplete = useCallback((wasCorrect: boolean) => {
    const activeProblem = effectiveProblem;
    const activeRodCount = effectiveRodCount;

    if (wasCorrect) {
      // Sum correct - advance to next problem
      submitAnswerImmediate(true);
      setTimeout(() => {
        setShowFormativeFeedback(false);
        setAdditionShowSumCounters(false);
        setAdditionSumCounterValues(Array(activeRodCount).fill(0));
        setAdditionSumDigitVerificationState(new Map());
        if (sorobanRef.current) {
          sorobanRef.current.style.opacity = '';
        }

        // For rolling addition, generate next problem with current sum as operand1
        if (level.displayMode === 'rollingAddition') {
          const newSum = activeProblem?.targetValue ?? 0;
          setRollingSum(newSum);
          const nextProblem = generateRollingAdditionProblem(newSum, level.rodCount);
          setRollingProblem(nextProblem);
          // Set initial value to the new operand1 (which is the previous sum)
          setAdditionSorobanInitialValue(newSum);
          setSorobanResetKey(prev => prev + 1);
          setAdditionPhase('SHOWING_SECOND'); // Skip entering first since it's already set
          setTimeout(() => {
            setAdditionPhase('ENTERING_SUM');
          }, 800);
        } else {
          setAdditionPhase('ENTERING_FIRST');
        }
      }, 500);
    } else {
      // Sum wrong - reset soroban to operand1 value so user can try again
      const operand1 = activeProblem?.operand1 ?? 0;
      setAdditionSorobanInitialValue(operand1);
      setSorobanResetKey(prev => prev + 1);
      setShowFormativeFeedback(false);
      setAdditionShowSumCounters(false);
      setAdditionSumCounterValues(Array(activeRodCount).fill(0));
      setAdditionSumDigitVerificationState(new Map());
      setAdditionPhase('ENTERING_SUM');
    }
  }, [effectiveRodCount, submitAnswerImmediate, effectiveProblem, level.displayMode, level.rodCount]);

  // Handle direct feedback digit flash (when bead arrives at digit in correct answer flow)
  const handleDirectDigitFlash = useCallback((rodIndex: number) => {
    setAdditionFlashingDigits(prev => {
      const next = new Set(prev);
      next.add(rodIndex);
      return next;
    });
  }, []);

  // Track if direct feedback complete has been called to prevent double-triggering
  const directFeedbackCompleteCalledRef = useRef(false);

  // Handle direct feedback complete (correct sum - streamlined flow)
  const handleDirectFeedbackComplete = useCallback(() => {
    // Guard against multiple calls
    if (directFeedbackCompleteCalledRef.current) {
      return;
    }
    directFeedbackCompleteCalledRef.current = true;

    // Advance to next problem
    submitAnswerImmediate(true);
    setTimeout(() => {
      setShowDirectFeedback(false);
      setShowSumForDirectFeedback(false);
      setFrozenProblem(null); // Clear frozen problem now that feedback is done
      setAdditionFlashingDigits(new Set());
      if (sorobanRef.current) {
        sorobanRef.current.style.opacity = '';
      }

      // Reset the guard for the next problem
      directFeedbackCompleteCalledRef.current = false;

      // For rolling addition, generate next problem with current sum as operand1
      if (level.displayMode === 'rollingAddition') {
        const newSum = effectiveProblem?.targetValue ?? 0;
        setRollingSum(newSum);
        const nextProblem = generateRollingAdditionProblem(newSum, level.rodCount);
        setRollingProblem(nextProblem);
        // Set initial value to the new operand1 (which is the previous sum)
        setAdditionSorobanInitialValue(newSum);
        setSorobanResetKey(prev => prev + 1);
        setAdditionPhase('SHOWING_SECOND'); // Skip entering first since it's already on soroban
        setTimeout(() => {
          setAdditionPhase('ENTERING_SUM');
        }, 800);
      } else {
        setAdditionPhase('ENTERING_FIRST');
      }
    }, 300); // Quick transition for speed mode
  }, [submitAnswerImmediate, level.displayMode, level.rodCount, effectiveProblem]);

  // Calculate progress
  const progress = sessionProblems.length > 0
    ? ((problemIndex + (isCorrect ? 1 : 0)) / sessionProblems.length) * 100
    : 0;

  // Memoize animation values to prevent FormativeFeedback from re-initializing on unrelated renders
  // For tenFrameInput mode: beads come from soroban (target), dots are user input (currentValue)
  // For symbolicInput mode: beads come from soroban (target), user input is digit boxes
  // For other modes: beads come from soroban (user input), targets are objects/dots (target value)
  const isTenFrameInput = level.displayMode === 'tenFrameInput';
  const isSymbolicInput = level.displayMode === 'symbolicInput';

  const animationSourceValue = useMemo(() => {
    // In reverse modes, the soroban shows the target and beads fly FROM it
    return (isTenFrameInput || isSymbolicInput)
      ? (currentProblem?.targetValue || 0)
      : currentValue;
  }, [isTenFrameInput, isSymbolicInput, currentProblem?.targetValue, currentValue]);

  const animationTargetValue = useMemo(() => {
    return isTenFrameInput
      ? currentValue
      : (currentProblem?.targetValue || 0);
  }, [isTenFrameInput, currentValue, currentProblem?.targetValue]);

  // Calculate rod states for animation - memoized to prevent array reference changes
  // Uses effectiveRodCount for rolling addition mode where rod count can grow
  const rodBeadStates = useMemo(() => {
    const rodStates = numberToRodStates(animationSourceValue, effectiveRodCount);
    return rodStates.map(rod => ({
      rodIndex: rod.rodIndex,
      heavenBeadActive: rod.heavenBeadActive,
      earthBeadsActive: rod.earthBeadsActive,
    }));
  }, [animationSourceValue, effectiveRodCount]);

  // Extract rod0 for single-rod fallback props
  const rod0 = useMemo(() => {
    return rodBeadStates[0] || { heavenBeadActive: false, earthBeadsActive: 0 };
  }, [rodBeadStates]);

  // Determine if hints should show
  const showCounting = hintLevel >= 2;
  const showHighlight = hintLevel >= 1;

  // Determine which rod to highlight based on target value
  const getHighlightRod = (): number | undefined => {
    if (hintLevel < 3 || !currentProblem) return undefined;
    // For single rod, always highlight rod 0
    if (level.rodCount === 1) return 0;
    // For multi-rod, highlight based on which digit needs work
    const targetDigits = String(currentProblem.targetValue).split('').reverse();
    const currentDigits = String(currentValue).split('').reverse();
    for (let i = 0; i < targetDigits.length; i++) {
      if (targetDigits[i] !== currentDigits[i]) {
        return i;
      }
    }
    return 0;
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        background: 'linear-gradient(135deg, #E8DCC8 0%, #D4C4A8 100%)',
        padding: responsiveSizeConfig.isCompact ? 12 : 20,
        paddingTop: responsiveSizeConfig.isCompact ? 8 : 20,
        paddingBottom: responsiveSizeConfig.isCompact ? 8 : 20,
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: responsiveSizeConfig.isCompact ? 8 : 16,
        }}
      >
        {/* Exit button */}
        <motion.button
          onClick={onExit}
          style={{
            width: responsiveSizeConfig.isCompact ? 40 : 48,
            height: responsiveSizeConfig.isCompact ? 40 : 48,
            borderRadius: '50%',
            border: 'none',
            background: '#FFF8E7',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: responsiveSizeConfig.isCompact ? 20 : 24,
          }}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
        >
          ×
        </motion.button>

        {/* Progress bar - centered */}
        <div
          style={{
            flex: 1,
            maxWidth: 200,
            height: responsiveSizeConfig.isCompact ? 8 : 12,
            background: '#D4C4A8',
            borderRadius: 6,
            overflow: 'hidden',
            marginLeft: responsiveSizeConfig.isCompact ? 8 : 16,
            marginRight: responsiveSizeConfig.isCompact ? 8 : 16,
          }}
        >
          <motion.div
            style={{
              height: '100%',
              background: 'linear-gradient(90deg, #4CAF50, #8BC34A)',
              borderRadius: 6,
            }}
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.5 }}
          />
        </div>

        {/* Problem counter */}
        <span
          style={{
            color: '#5D4632',
            fontWeight: 'bold',
            fontSize: responsiveSizeConfig.isCompact ? 14 : 18,
            marginRight: responsiveSizeConfig.isCompact ? 8 : 16,
          }}
        >
          {problemIndex + 1}/{sessionProblems.length}
        </span>

        {/* ST Math style Go button - chevron arrow */}
        <motion.button
          onClick={(e) => {
            e.stopPropagation();
            handleCheck();
          }}
          disabled={gameState !== 'AWAITING_INPUT'}
          style={{
            width: responsiveSizeConfig.isCompact ? 48 : 64,
            height: responsiveSizeConfig.isCompact ? 48 : 64,
            border: 'none',
            borderRadius: responsiveSizeConfig.isCompact ? 10 : 12,
            cursor: gameState === 'AWAITING_INPUT' ? 'pointer' : 'default',
            background: gameState === 'AWAITING_INPUT'
              ? 'linear-gradient(180deg, #4CAF50 0%, #388E3C 100%)'
              : '#BDBDBD',
            boxShadow: gameState === 'AWAITING_INPUT'
              ? '0 4px 12px rgba(76, 175, 80, 0.4), inset 0 2px 0 rgba(255,255,255,0.2)'
              : '0 2px 4px rgba(0,0,0,0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
            overflow: 'hidden',
          }}
          whileHover={gameState === 'AWAITING_INPUT' ? { scale: 1.08, boxShadow: '0 6px 20px rgba(76, 175, 80, 0.5)' } : {}}
          whileTap={gameState === 'AWAITING_INPUT' ? { scale: 0.95 } : {}}
        >
          {/* Chevron arrow icon */}
          <svg
            width={responsiveSizeConfig.isCompact ? 24 : 32}
            height={responsiveSizeConfig.isCompact ? 24 : 32}
            viewBox="0 0 24 24"
            fill="none"
            style={{
              filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.2))',
            }}
          >
            <path
              d="M9 6l6 6-6 6"
              stroke="white"
              strokeWidth="3.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </motion.button>
      </div>

      {/* Main game area - click anywhere to flash the interactive element */}
      <div
        onClick={handleGameAreaClick}
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: responsiveSizeConfig.isCompact ? 12 : 24,
          justifyContent: 'center',
          // Apply mobile scale to reduce cramping on phones
          transform: responsiveSizeConfig.mobileScale < 1 ? `scale(${responsiveSizeConfig.mobileScale})` : undefined,
          transformOrigin: 'top center',
        }}
      >
        {(level.displayMode === 'symbolic' || level.displayMode === 'symbolicAdvanced') ? (
          // SYMBOLIC MODE: Target digits + counters on top, interactive soroban below
          <>
            {/* Symbolic display with target digits and counter boxes */}
            {displayProblem && (
              <div ref={symbolicDisplayRef}>
                <SymbolicDisplay
                  targetValue={displayProblem.targetValue}
                  rodCount={level.rodCount}
                  counterValues={symbolicCounterValues}
                  showCounters={symbolicShowCounters}
                  animationStarted={showFormativeFeedback}
                  onCounterBoxRefs={handleCounterBoxRefs}
                  digitVerificationState={digitVerificationState}
                />
              </div>
            )}

            {/* Interactive soroban */}
            <div
              ref={sorobanRef}
              style={{
                width: 'fit-content',
                opacity: showFormativeFeedback ? 0.25 : 1,
                transition: 'opacity 0.3s ease',
                animation: flashActiveElement ? 'flash-highlight 0.3s ease-in-out' : 'none',
              }}
            >
              <Soroban
                key={`${currentProblem?.id || 'initial'}-${sorobanResetKey}`}
                rodCount={level.rodCount}
                initialValue={0}
                onValueChange={handleValueChange}
                disabled={gameState !== 'AWAITING_INPUT' || showFormativeFeedback}
                highlightRod={getHighlightRod()}
                showValue={false}
                size="large"
                sizeConfig={responsiveSizeConfig}
              />
            </div>
          </>
        ) : level.displayMode === 'symbolicInput' ? (
          // SYMBOLIC INPUT MODE: User inputs digits on top, read-only soroban below
          <>
            {/* Symbolic input display - user taps digits to enter them */}
            {displayProblem && (
              <div
                ref={symbolicInputDisplayRef}
                style={{
                  animation: flashActiveElement ? 'flash-highlight 0.3s ease-in-out' : 'none',
                }}
              >
                <SymbolicInputDisplay
                  rodCount={level.rodCount}
                  inputValues={symbolicInputValues}
                  onDigitChange={handleSymbolicInputDigitChange}
                  disabled={gameState !== 'AWAITING_INPUT' || showFormativeFeedback}
                  counterValues={symbolicInputCounterValues}
                  showCounters={symbolicInputShowCounters}
                  onCounterBoxRefs={handleSymbolicInputCounterBoxRefs}
                  digitVerificationState={digitVerificationState}
                />
              </div>
            )}

            {/* Read-only soroban showing target value */}
            {displayProblem && displayProblem.targetValue > 0 && (
              <div
                ref={sorobanRef}
                style={{
                  width: 'fit-content',
                  opacity: showFormativeFeedback ? 0.25 : 1,
                  transition: 'opacity 0.3s ease',
                }}
              >
                <Soroban
                  key={`soroban-${displayProblem.id}-${displayProblem.targetValue}`}
                  rodCount={level.rodCount}
                  initialValue={displayProblem.targetValue}
                  disabled={true}
                  showValue={false}
                  size="large"
                  sizeConfig={responsiveSizeConfig}
                />
              </div>
            )}
          </>
        ) : (level.displayMode === 'addition' || level.displayMode === 'rollingAddition') ? (
          // ADDITION MODE: Multi-step addition problem (also handles rolling addition)
          <>
            {/* Addition display showing operands and counter rows */}
            {displayProblem && displayProblem.operand1 !== undefined && displayProblem.operand2 !== undefined && (
              <div ref={additionDisplayRef}>
                <AdditionDisplay
                  operand1={displayProblem.operand1}
                  operand2={displayProblem.operand2}
                  sum={displayProblem.targetValue}
                  phase={additionPhase}
                  rodCount={effectiveRodCount}
                  firstNumberCounterValues={additionFirstCounterValues}
                  sumCounterValues={additionSumCounterValues}
                  showFirstCounters={additionShowFirstCounters}
                  showSumCounters={additionShowSumCounters}
                  firstDigitVerificationState={additionFirstDigitVerificationState}
                  sumDigitVerificationState={additionSumDigitVerificationState}
                  onFirstCounterBoxRefs={handleAdditionFirstCounterBoxRefs}
                  onSumCounterBoxRefs={handleAdditionSumCounterBoxRefs}
                  onSumDigitBoxRefs={setAdditionSumDigitBoxPositions}
                  flashingDigits={additionFlashingDigits}
                  showSumForDirectFeedback={showSumForDirectFeedback}
                  sizeConfig={responsiveSizeConfig}
                />
              </div>
            )}

            {/* Interactive soroban */}
            <div
              ref={sorobanRef}
              style={{
                width: 'fit-content',
                opacity: (showFormativeFeedback || showDirectFeedback) ? 0.25 : 1,
                transition: 'opacity 0.3s ease',
                animation: flashActiveElement ? 'flash-highlight 0.3s ease-in-out' : 'none',
              }}
            >
              <Soroban
                key={`addition-${effectiveProblem?.id || 'initial'}-${sorobanResetKey}`}
                rodCount={effectiveRodCount}
                initialValue={additionSorobanInitialValue}
                onValueChange={handleValueChange}
                disabled={
                  gameState !== 'AWAITING_INPUT' ||
                  showFormativeFeedback ||
                  showDirectFeedback ||
                  (additionPhase !== 'ENTERING_FIRST' && additionPhase !== 'ENTERING_SUM')
                }
                showValue={false}
                size="large"
                sizeConfig={responsiveSizeConfig}
              />
            </div>
          </>
        ) : level.displayMode === 'tenFrameInput' ? (
          // REVERSE MODE: Interactive ten frames on top, read-only soroban below
          <>
            {/* Interactive ten frames - user fills these to match soroban */}
            <div
              ref={problemDisplayRef}
              style={{
                opacity: showFormativeFeedback ? (hideFrames ? 0 : 0.25) : 1,
                transition: 'opacity 0.3s ease',
                animation: flashActiveElement ? 'flash-highlight 0.3s ease-in-out' : 'none',
              }}
            >
              <InteractiveTenFrameDisplay
                key={`${currentProblem?.id || 'initial'}-${sorobanResetKey}`}
                value={currentValue}
                maxValue={level.valueRange.max}
                onChange={handleValueChange}
                disabled={gameState !== 'AWAITING_INPUT' || showFormativeFeedback}
                collapseToUsedFrames={showFormativeFeedback}
              />
            </div>

            {/* Read-only soroban showing target value */}
            {/* Only render when we have a valid problem with non-zero target to avoid showing 0 */}
            {displayProblem && displayProblem.targetValue > 0 && (
              <div
                ref={sorobanRef}
                style={{
                  width: 'fit-content',
                  opacity: showFormativeFeedback ? (hideFrames ? 0 : 0.25) : 1,
                  transition: 'opacity 0.3s ease',
                }}
              >
                <Soroban
                  key={`soroban-${displayProblem.id}-${displayProblem.targetValue}`}
                  rodCount={level.rodCount}
                  initialValue={displayProblem.targetValue}
                  disabled={true} // Read-only in this mode
                  showValue={false}
                  size="large"
                  sizeConfig={responsiveSizeConfig}
                />
              </div>
            )}
          </>
        ) : (
          // NORMAL MODE: Problem display on top, interactive soroban below
          <>
            {/* Problem display - container stays visible, objects hidden during formative feedback */}
            {displayProblem && (
              <div ref={problemDisplayRef}>
                <ProblemDisplay
                  problem={displayProblem}
                  showCounting={showCounting}
                  highlightObjects={showHighlight}
                  hideObjects={showFormativeFeedback}
                  hideFrames={hideFrames}
                  displayMode={level.displayMode}
                  maxValue={level.valueRange.max}
                />
              </div>
            )}

            {/* Soroban - key resets it when problem changes */}
            {/* During formative feedback, fade to 25% so ghost beads can animate from same position */}
            {/* width: fit-content ensures wrapper shrinks to frame size for accurate positioning */}
            <div
              ref={sorobanRef}
              style={{
                width: 'fit-content',
                // During feedback: 25% opacity normally, fully hidden when all targets matched
                opacity: showFormativeFeedback ? (hideFrames ? 0 : 0.25) : 1,
                transition: 'opacity 0.3s ease',
                animation: flashActiveElement ? 'flash-highlight 0.3s ease-in-out' : 'none',
              }}
            >
              <Soroban
                key={`${currentProblem?.id || 'initial'}-${sorobanResetKey}`}
                rodCount={level.rodCount}
                initialValue={0}
                onValueChange={handleValueChange}
                disabled={gameState !== 'AWAITING_INPUT' || showFormativeFeedback}
                highlightRod={getHighlightRod()}
                showValue={false} // Hide value during visual learning phase - symbolic matching comes later
                size="large"
                sizeConfig={responsiveSizeConfig}
              />
            </div>
          </>
        )}

      </div>

      {/* Formative feedback - ST Math style one-to-one correspondence */}
      {level.displayMode !== 'symbolic' && level.displayMode !== 'symbolicAdvanced' && (
        <FormativeFeedback
          isActive={showFormativeFeedback}
          objects={currentProblem?.objects || []}
          sorobanValue={animationSourceValue}
          heavenBeadActive={rod0.heavenBeadActive}
          earthBeadsActive={rod0.earthBeadsActive}
          sorobanRect={sorobanRect}
          problemDisplayRect={problemDisplayRect}
          onComplete={handleFormativeFeedbackComplete}
          onAllTargetsMatched={handleAllTargetsMatched}
          displayMode={isTenFrameInput ? 'tenFrames' : level.displayMode}
          targetValue={animationTargetValue}
          maxValue={level.valueRange.max}
          rodCount={level.rodCount}
          rodStates={rodBeadStates}
        />
      )}

      {/* Symbolic formative feedback - beads fly to counters, digits verify */}
      {(level.displayMode === 'symbolic' || level.displayMode === 'symbolicAdvanced') && (
        <SymbolicFormativeFeedback
          isActive={showFormativeFeedback}
          targetValue={currentProblem?.targetValue || 0}
          sorobanRect={sorobanRect}
          counterBoxPositions={counterBoxPositions}
          onCounterIncrement={handleSymbolicCounterIncrement}
          onDigitVerificationStateChange={handleDigitVerificationStateChange}
          onComplete={handleFormativeFeedbackComplete}
          rodCount={level.rodCount}
          rodStates={rodBeadStates}
          advancedMode={level.displayMode === 'symbolicAdvanced'}
          sizeConfig={responsiveSizeConfig}
        />
      )}

      {/* Symbolic input formative feedback - beads fly up to counter boxes, then verify against user input */}
      {level.displayMode === 'symbolicInput' && (
        <SymbolicInputFormativeFeedback
          isActive={showFormativeFeedback}
          targetValue={currentProblem?.targetValue || 0}
          inputValues={symbolicInputValues}
          counterBoxPositions={symbolicInputCounterBoxPositions}
          sorobanRect={sorobanRect}
          onCounterIncrement={handleSymbolicInputCounterIncrement}
          onDigitVerificationStateChange={handleDigitVerificationStateChange}
          onComplete={handleFormativeFeedbackComplete}
          rodCount={level.rodCount}
          rodStates={rodBeadStates}
          advancedMode={true}
          sizeConfig={responsiveSizeConfig}
        />
      )}

      {/* Addition mode feedback - verifying first number (uses advanced animation) */}
      {(level.displayMode === 'addition' || level.displayMode === 'rollingAddition') && additionPhase === 'VERIFYING_FIRST' && (
        <SymbolicFormativeFeedback
          isActive={showFormativeFeedback}
          targetValue={effectiveProblem?.operand1 || 0}
          counterBoxPositions={additionFirstCounterBoxPositions}
          sorobanRect={sorobanRect}
          onCounterIncrement={handleAdditionFirstCounterIncrement}
          onDigitVerificationStateChange={setAdditionFirstDigitVerificationState}
          onComplete={handleAdditionFirstComplete}
          rodCount={effectiveRodCount}
          rodStates={rodBeadStates}
          advancedMode={true}
          sizeConfig={responsiveSizeConfig}
        />
      )}

      {/* Addition mode feedback - verifying sum (wrong answer path, uses advanced animation) */}
      {(level.displayMode === 'addition' || level.displayMode === 'rollingAddition') && additionPhase === 'VERIFYING_SUM' && (
        <SymbolicFormativeFeedback
          isActive={showFormativeFeedback}
          targetValue={effectiveProblem?.targetValue || 0}
          counterBoxPositions={additionSumCounterBoxPositions}
          sorobanRect={sorobanRect}
          onCounterIncrement={handleAdditionSumCounterIncrement}
          onDigitVerificationStateChange={setAdditionSumDigitVerificationState}
          onComplete={handleAdditionSumComplete}
          rodCount={effectiveRodCount}
          rodStates={rodBeadStates}
          advancedMode={true}
          sizeConfig={responsiveSizeConfig}
        />
      )}

      {/* Direct feedback - streamlined correct answer flow (beads fly to digits, no counter row) */}
      {(level.displayMode === 'addition' || level.displayMode === 'rollingAddition') && additionPhase === 'ENTERING_SUM' && (
        <DirectFeedback
          isActive={showDirectFeedback}
          digitBoxPositions={additionSumDigitBoxPositions}
          sorobanRect={sorobanRect}
          onDigitFlash={handleDirectDigitFlash}
          onComplete={handleDirectFeedbackComplete}
          rodCount={effectiveRodCount}
          rodStates={rodBeadStates}
          sizeConfig={responsiveSizeConfig}
        />
      )}

      {/* Level instruction popup - shown on first visit to demo levels */}
      <LevelInstructionPopup
        isVisible={showInstructionPopup}
        instruction={DEMO_LEVEL_INSTRUCTIONS[level.id] || ''}
        onDismiss={handleDismissInstructionPopup}
      />

      {/* Feedback overlay - only for hints now, formative feedback handles correct/incorrect */}
      <FeedbackOverlay
        feedbackType={feedbackType}
        isVisible={
          gameState === 'SHOWING_FEEDBACK' &&
          feedbackType !== null &&
          !showFormativeFeedback &&
          (feedbackType === 'HINT_LEVEL_1' || feedbackType === 'HINT_LEVEL_2' || feedbackType === 'HINT_LEVEL_3')
        }
        targetValue={currentProblem?.targetValue}
        currentValue={currentValue}
        onDismiss={handleTryAgain}
      />

      {/* Level complete overlay */}
      <AnimatePresence>
        {gameState === 'LEVEL_COMPLETE' && (
          <motion.div
            style={{
              position: 'fixed',
              inset: 0,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'rgba(0,0,0,0.5)',
              zIndex: 200,
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              style={{
                background: 'white',
                padding: 40,
                borderRadius: 24,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 24,
                boxShadow: '0 16px 64px rgba(0,0,0,0.3)',
                maxWidth: '90vw',
              }}
              initial={{ scale: 0.8, y: 50 }}
              animate={{ scale: 1, y: 0 }}
              transition={{ type: 'spring', stiffness: 200, damping: 20 }}
            >
              <motion.div
                style={{ fontSize: 64 }}
                animate={{ rotate: [0, 10, -10, 10, 0] }}
                transition={{ duration: 0.5, delay: 0.3 }}
              >
                {leaderboardRank === 1 ? '🏆' : leaderboardRank && leaderboardRank <= 3 ? '🥇' : '🎉'}
              </motion.div>

              <h2 style={{ margin: 0, color: '#2D1810', fontSize: 32 }}>
                {leaderboardRank === 1 ? 'New Record!' : 'Great Job!'}
              </h2>

              {/* Time display for rolling addition */}
              {level.displayMode === 'rollingAddition' && levelElapsedTime > 0 && (
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 48, fontWeight: 'bold', color: '#2D1810' }}>
                    {Math.floor(levelElapsedTime / 60000)}:{String(Math.floor((levelElapsedTime % 60000) / 1000)).padStart(2, '0')}.{String(Math.floor((levelElapsedTime % 1000) / 100))}
                  </div>
                  <div style={{ color: '#757575', fontSize: 14 }}>Time</div>
                  {leaderboardRank && leaderboardRank <= 5 && (
                    <div style={{
                      marginTop: 8,
                      color: leaderboardRank === 1 ? '#FFD700' : '#4CAF50',
                      fontWeight: 'bold',
                      fontSize: 16,
                    }}>
                      #{leaderboardRank} on leaderboard!
                    </div>
                  )}
                </div>
              )}

              {/* Leaderboard for rolling addition */}
              {level.displayMode === 'rollingAddition' && (
                <div style={{
                  background: '#F5F5F5',
                  borderRadius: 12,
                  padding: 16,
                  minWidth: 200,
                }}>
                  <div style={{ fontWeight: 'bold', color: '#2D1810', marginBottom: 8, textAlign: 'center' }}>
                    Top 5 Times
                  </div>
                  {(() => {
                    const leaderboard = getLeaderboard(level.id);
                    if (leaderboard.length === 0) {
                      return <div style={{ color: '#757575', textAlign: 'center', fontSize: 14 }}>No times yet</div>;
                    }
                    return leaderboard.map((time, i) => (
                      <div
                        key={i}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          padding: '4px 8px',
                          background: time === levelElapsedTime ? 'rgba(76, 175, 80, 0.2)' : 'transparent',
                          borderRadius: 4,
                        }}
                      >
                        <span style={{ color: i < 3 ? '#FFD700' : '#757575' }}>
                          {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`}
                        </span>
                        <span style={{ fontWeight: time === levelElapsedTime ? 'bold' : 'normal', color: '#2D1810' }}>
                          {Math.floor(time / 60000)}:{String(Math.floor((time % 60000) / 1000)).padStart(2, '0')}.{String(Math.floor((time % 1000) / 100))}
                        </span>
                      </div>
                    ));
                  })()}
                </div>
              )}

              {/* Stats for non-rolling modes */}
              {level.displayMode !== 'rollingAddition' && (
                <div
                  style={{
                    display: 'flex',
                    gap: 32,
                  }}
                >
                  {(() => {
                    const stats = calculateSessionStats(sessionResults);
                    return (
                      <>
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ fontSize: 36, fontWeight: 'bold', color: '#4CAF50' }}>
                            {Math.round(stats.accuracy * 100)}%
                          </div>
                          <div style={{ color: '#757575', fontSize: 14 }}>Accuracy</div>
                        </div>
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ fontSize: 36, fontWeight: 'bold', color: '#FFD700' }}>
                            {stats.correctFirstTry}
                          </div>
                          <div style={{ color: '#757575', fontSize: 14 }}>Perfect</div>
                        </div>
                      </>
                    );
                  })()}
                </div>
              )}

              {/* Buttons */}
              <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', justifyContent: 'center' }}>
                {level.displayMode === 'rollingAddition' && (
                  <motion.button
                    onClick={handleRestartLevel}
                    style={{
                      padding: '16px 32px',
                      fontSize: 18,
                      fontWeight: 'bold',
                      color: '#5D4632',
                      background: 'transparent',
                      border: '2px solid #8B7355',
                      borderRadius: 12,
                      cursor: 'pointer',
                    }}
                    whileHover={{ scale: 1.05, background: 'rgba(139, 115, 85, 0.1)' }}
                    whileTap={{ scale: 0.95 }}
                  >
                    Try Again
                  </motion.button>
                )}
                <motion.button
                  onClick={onExit}
                  style={{
                    padding: '16px 48px',
                    fontSize: 20,
                    fontWeight: 'bold',
                    color: 'white',
                    background: 'linear-gradient(180deg, #4CAF50 0%, #388E3C 100%)',
                    border: 'none',
                    borderRadius: 12,
                    cursor: 'pointer',
                  }}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  {level.displayMode === 'rollingAddition' ? 'Exit' : 'Continue'}
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
