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
import { AdditionFormativeFeedback } from './AdditionFormativeFeedback';
import { useLearningEngine, calculateSessionStats } from '../../engine/LearningEngine';
import { LevelDefinition, numberToRodStates } from '../../models/types';
import { generateProblemSequence } from '../../engine/ProblemGenerator';

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

  // Initialize level on mount (generate problems for this level)
  // Use a ref tied to the level.id to handle both Strict Mode and level changes
  const levelIdRef = useRef<number | null>(null);

  useEffect(() => {
    // Skip if already initialized for THIS specific level (handles React Strict Mode double-mount)
    if (levelIdRef.current === level.id) return;
    levelIdRef.current = level.id;

    const problems = generateProblemSequence(level, 10);

    // Use the store directly
    useLearningEngine.getState().startLevel(level, problems);
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

  // Handle level completion
  useEffect(() => {
    if (gameState === 'LEVEL_COMPLETE') {
      const stats = calculateSessionStats(sessionResults);
      onLevelComplete(stats);
    }
  }, [gameState, sessionResults, onLevelComplete]);

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
      // Capture positions for animation before state changes
      if (level.displayMode === 'symbolic' || level.displayMode === 'symbolicAdvanced') {
        // Symbolic modes use symbolicDisplayRef instead of problemDisplayRef
        if (sorobanRef.current) {
          setSorobanRect(sorobanRef.current.getBoundingClientRect());
        }
        setSymbolicCounterValues(Array(level.rodCount).fill(0));
        setSymbolicShowCounters(true);
        setDigitVerificationState(new Map());
      } else if (level.displayMode === 'symbolicInput') {
        // Symbolic input mode - beads fly up to counter boxes, then counter verifies against user input
        // First show the counter row, then capture soroban position after layout settles
        setSymbolicInputCounterValues(Array(level.rodCount).fill(0));
        setSymbolicInputShowCounters(true);
        setDigitVerificationState(new Map());
        // Delay capturing soroban rect until after counter row has rendered and pushed layout down
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            if (sorobanRef.current) {
              setSorobanRect(sorobanRef.current.getBoundingClientRect());
            }
          });
        });
      } else if (level.displayMode === 'addition') {
        // Addition mode - handle based on current phase
        if (additionPhase === 'ENTERING_FIRST') {
          // Check if first number is correct
          const isFirstCorrect = currentValue === currentProblem?.operand1;

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
            setAdditionFirstCounterValues(Array(level.rodCount).fill(0));
            setAdditionShowFirstCounters(true);
            setAdditionFirstDigitVerificationState(new Map());
            requestAnimationFrame(() => {
              requestAnimationFrame(() => {
                if (sorobanRef.current) {
                  setSorobanRect(sorobanRef.current.getBoundingClientRect());
                }
              });
            });
          }
        } else if (additionPhase === 'ENTERING_SUM') {
          // Verifying sum entry
          setAdditionPhase('VERIFYING_SUM');
          setAdditionSumCounterValues(Array(level.rodCount).fill(0));
          setAdditionShowSumCounters(true);
          setAdditionSumDigitVerificationState(new Map());
          requestAnimationFrame(() => {
            requestAnimationFrame(() => {
              if (sorobanRef.current) {
                setSorobanRect(sorobanRef.current.getBoundingClientRect());
              }
            });
          });
        } else {
          // Not in an input phase, ignore
          return;
        }
      } else if (sorobanRef.current && problemDisplayRef.current) {
        setSorobanRect(sorobanRef.current.getBoundingClientRect());
        setProblemDisplayRect(problemDisplayRef.current.getBoundingClientRect());
      }

      setShowFormativeFeedback(true);
    }
  }, [gameState, level.displayMode, level.rodCount, additionPhase, currentValue, currentProblem]);

  // Handle try again after incorrect
  const handleTryAgain = useCallback(() => {
    if (feedbackType === 'INCORRECT' || feedbackType === 'CLOSE') {
      // Just dismiss feedback and let them try again
      requestHint();
    }
  }, [feedbackType, requestHint]);

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
    }
  }, [level.rodCount]);

  // Handle addition sum verification complete
  const handleAdditionSumComplete = useCallback((wasCorrect: boolean) => {
    if (wasCorrect) {
      // Sum correct - advance to next problem
      submitAnswerImmediate(true);
      setTimeout(() => {
        setShowFormativeFeedback(false);
        setAdditionPhase('ENTERING_FIRST');
        setAdditionShowSumCounters(false);
        setAdditionSumCounterValues(Array(level.rodCount).fill(0));
        setAdditionSumDigitVerificationState(new Map());
        if (sorobanRef.current) {
          sorobanRef.current.style.opacity = '';
        }
      }, 500);
    } else {
      // Sum wrong - keep the first number on soroban, just retry sum entry
      // Don't reset soroban since we want to keep operand1
      setShowFormativeFeedback(false);
      setAdditionShowSumCounters(false);
      setAdditionSumCounterValues(Array(level.rodCount).fill(0));
      setAdditionSumDigitVerificationState(new Map());
      setAdditionPhase('ENTERING_SUM');
    }
  }, [level.rodCount, submitAnswerImmediate]);

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
  const rodBeadStates = useMemo(() => {
    const rodStates = numberToRodStates(animationSourceValue, level.rodCount);
    return rodStates.map(rod => ({
      rodIndex: rod.rodIndex,
      heavenBeadActive: rod.heavenBeadActive,
      earthBeadsActive: rod.earthBeadsActive,
    }));
  }, [animationSourceValue, level.rodCount]);

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
        padding: 20,
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 16,
        }}
      >
        {/* Exit button */}
        <motion.button
          onClick={onExit}
          style={{
            width: 48,
            height: 48,
            borderRadius: '50%',
            border: 'none',
            background: '#FFF8E7',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 24,
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
            height: 12,
            background: '#D4C4A8',
            borderRadius: 6,
            overflow: 'hidden',
            marginLeft: 16,
            marginRight: 16,
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
            fontSize: 18,
            marginRight: 16,
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
            width: 64,
            height: 64,
            border: 'none',
            borderRadius: 12,
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
            width="32"
            height="32"
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
          gap: 24,
          justifyContent: 'center',
        }}
      >
        {(level.displayMode === 'symbolic' || level.displayMode === 'symbolicAdvanced') ? (
          // SYMBOLIC MODE: Target digits + counters on top, interactive soroban below
          <>
            {/* Symbolic display with target digits and counter boxes */}
            {currentProblem && (
              <div ref={symbolicDisplayRef}>
                <SymbolicDisplay
                  targetValue={currentProblem.targetValue}
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
              />
            </div>
          </>
        ) : level.displayMode === 'symbolicInput' ? (
          // SYMBOLIC INPUT MODE: User inputs digits on top, read-only soroban below
          <>
            {/* Symbolic input display - user taps digits to enter them */}
            {currentProblem && (
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
            {currentProblem && currentProblem.targetValue > 0 && (
              <div
                ref={sorobanRef}
                style={{
                  width: 'fit-content',
                  opacity: showFormativeFeedback ? 0.25 : 1,
                  transition: 'opacity 0.3s ease',
                }}
              >
                <Soroban
                  key={`soroban-${currentProblem.id}-${currentProblem.targetValue}`}
                  rodCount={level.rodCount}
                  initialValue={currentProblem.targetValue}
                  disabled={true}
                  showValue={false}
                  size="large"
                />
              </div>
            )}
          </>
        ) : level.displayMode === 'addition' ? (
          // ADDITION MODE: Multi-step addition problem
          <>
            {/* Addition display showing operands and counter rows */}
            {currentProblem && currentProblem.operand1 !== undefined && currentProblem.operand2 !== undefined && (
              <div ref={additionDisplayRef}>
                <AdditionDisplay
                  operand1={currentProblem.operand1}
                  operand2={currentProblem.operand2}
                  sum={currentProblem.targetValue}
                  phase={additionPhase}
                  rodCount={level.rodCount}
                  firstNumberCounterValues={additionFirstCounterValues}
                  sumCounterValues={additionSumCounterValues}
                  showFirstCounters={additionShowFirstCounters}
                  showSumCounters={additionShowSumCounters}
                  firstDigitVerificationState={additionFirstDigitVerificationState}
                  sumDigitVerificationState={additionSumDigitVerificationState}
                  onFirstCounterBoxRefs={handleAdditionFirstCounterBoxRefs}
                  onSumCounterBoxRefs={handleAdditionSumCounterBoxRefs}
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
                key={`addition-${currentProblem?.id || 'initial'}-${sorobanResetKey}`}
                rodCount={level.rodCount}
                initialValue={0}
                onValueChange={handleValueChange}
                disabled={
                  gameState !== 'AWAITING_INPUT' ||
                  showFormativeFeedback ||
                  (additionPhase !== 'ENTERING_FIRST' && additionPhase !== 'ENTERING_SUM')
                }
                showValue={false}
                size="large"
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
            {/* DEBUG: Log problem info */}
            {(() => {
              console.log('[DEBUG GameContainer] tenFrameInput mode:', {
                currentProblem: currentProblem ? { id: currentProblem.id, targetValue: currentProblem.targetValue } : null,
                problemIndex,
                sessionProblemsCount: sessionProblems.length,
                allTargetValues: sessionProblems.map(p => p.targetValue),
              });
              return null;
            })()}
            {currentProblem && currentProblem.targetValue > 0 && (
              <div
                ref={sorobanRef}
                style={{
                  width: 'fit-content',
                  opacity: showFormativeFeedback ? (hideFrames ? 0 : 0.25) : 1,
                  transition: 'opacity 0.3s ease',
                }}
              >
                <Soroban
                  key={`soroban-${currentProblem.id}-${currentProblem.targetValue}`}
                  rodCount={level.rodCount}
                  initialValue={currentProblem.targetValue}
                  disabled={true} // Read-only in this mode
                  showValue={false}
                  size="large"
                />
              </div>
            )}
          </>
        ) : (
          // NORMAL MODE: Problem display on top, interactive soroban below
          <>
            {/* Problem display - container stays visible, objects hidden during formative feedback */}
            {currentProblem && (
              <div ref={problemDisplayRef}>
                <ProblemDisplay
                  problem={currentProblem}
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
              />
            </div>
          </>
        )}

      </div>

      {/* Formative feedback - ST Math style one-to-one correspondence */}
      {level.displayMode !== 'symbolic' && (
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
        />
      )}

      {/* Addition mode feedback - verifying first number */}
      {level.displayMode === 'addition' && additionPhase === 'VERIFYING_FIRST' && (
        <AdditionFormativeFeedback
          isActive={showFormativeFeedback}
          targetValue={currentProblem?.operand1 || 0}
          counterBoxPositions={additionFirstCounterBoxPositions}
          sorobanRect={sorobanRect}
          onCounterIncrement={handleAdditionFirstCounterIncrement}
          onDigitVerificationStateChange={setAdditionFirstDigitVerificationState}
          onComplete={handleAdditionFirstComplete}
          rodCount={level.rodCount}
          rodStates={rodBeadStates}
        />
      )}

      {/* Addition mode feedback - verifying sum */}
      {level.displayMode === 'addition' && additionPhase === 'VERIFYING_SUM' && (
        <AdditionFormativeFeedback
          isActive={showFormativeFeedback}
          targetValue={currentProblem?.targetValue || 0}
          counterBoxPositions={additionSumCounterBoxPositions}
          sorobanRect={sorobanRect}
          onCounterIncrement={handleAdditionSumCounterIncrement}
          onDigitVerificationStateChange={setAdditionSumDigitVerificationState}
          onComplete={handleAdditionSumComplete}
          rodCount={level.rodCount}
          rodStates={rodBeadStates}
        />
      )}

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
                🎉
              </motion.div>

              <h2 style={{ margin: 0, color: '#2D1810', fontSize: 32 }}>
                Great Job!
              </h2>

              {/* Stats */}
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
                Continue
              </motion.button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
