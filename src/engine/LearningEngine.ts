import { create } from 'zustand';
import {
  GameState,
  Problem,
  AttemptResult,
  LevelDefinition,
  FeedbackType,
} from '../models/types';

interface LearningEngineState {
  // Game state
  gameState: GameState;
  currentProblem: Problem | null;
  currentLevel: LevelDefinition | null;

  // Attempt tracking
  attemptCount: number;
  hintLevel: number;
  currentValue: number;

  // Session tracking
  sessionProblems: Problem[];
  sessionResults: AttemptResult[];
  problemIndex: number;

  // Feedback
  feedbackType: FeedbackType | null;
  isCorrect: boolean | null;
}

interface LearningEngineActions {
  // Level management
  startLevel: (level: LevelDefinition, problems: Problem[]) => void;
  exitLevel: () => void;

  // Game flow
  presentProblem: () => void;
  startAwaitingInput: () => void;
  updateCurrentValue: (value: number) => void;
  submitAnswer: () => void;
  submitAnswerImmediate: (wasCorrect: boolean) => void; // For formative feedback - no extra delay
  requestHint: () => void;
  nextProblem: () => void;
  completeLevel: () => void;

  // Reset
  reset: () => void;
}

const initialState: LearningEngineState = {
  gameState: 'IDLE',
  currentProblem: null,
  currentLevel: null,
  attemptCount: 0,
  hintLevel: 0,
  currentValue: 0,
  sessionProblems: [],
  sessionResults: [],
  problemIndex: 0,
  feedbackType: null,
  isCorrect: null,
};

export const useLearningEngine = create<LearningEngineState & LearningEngineActions>(
  (set, get) => ({
    ...initialState,

    startLevel: (level, problems) => {
      set({
        gameState: 'PRESENTING_PROBLEM',
        currentLevel: level,
        sessionProblems: problems,
        sessionResults: [],
        problemIndex: 0,
        currentProblem: problems[0] || null,
        attemptCount: 0,
        hintLevel: 0,
        currentValue: 0,
        feedbackType: null,
        isCorrect: null,
      });
    },

    exitLevel: () => {
      set(initialState);
    },

    presentProblem: () => {
      const { sessionProblems, problemIndex } = get();
      const problem = sessionProblems[problemIndex];

      if (!problem) {
        get().completeLevel();
        return;
      }

      set({
        gameState: 'PRESENTING_PROBLEM',
        currentProblem: problem,
        attemptCount: 0,
        hintLevel: 0,
        currentValue: 0,
        feedbackType: null,
        isCorrect: null,
      });

      // Auto-transition to awaiting input after presentation
      setTimeout(() => {
        get().startAwaitingInput();
      }, 1500);
    },

    startAwaitingInput: () => {
      set({ gameState: 'AWAITING_INPUT' });
    },

    updateCurrentValue: (value) => {
      set({ currentValue: value });
    },

    submitAnswer: () => {
      const { currentProblem, currentValue, attemptCount, hintLevel, sessionResults, problemIndex } = get();

      if (!currentProblem) return;

      set({ gameState: 'EVALUATING' });

      const isCorrect = currentValue === currentProblem.targetValue;
      const difference = Math.abs(currentValue - currentProblem.targetValue);

      // Determine feedback type
      let feedbackType: FeedbackType;
      if (isCorrect) {
        feedbackType = 'CORRECT';
      } else if (difference <= 2) {
        feedbackType = 'CLOSE';
      } else {
        feedbackType = 'INCORRECT';
      }

      // Record attempt
      const result: AttemptResult = {
        problemId: currentProblem.id,
        targetValue: currentProblem.targetValue,
        submittedValue: currentValue,
        isCorrect,
        attemptNumber: attemptCount + 1,
        hintLevel,
        timestamp: new Date(),
      };

      set({
        gameState: 'SHOWING_FEEDBACK',
        feedbackType,
        isCorrect,
        attemptCount: attemptCount + 1,
        sessionResults: [...sessionResults, result],
      });

      // Auto-advance on correct answer
      if (isCorrect) {
        setTimeout(() => {
          set({ gameState: 'TRANSITIONING' });
          setTimeout(() => {
            get().nextProblem();
          }, 500);
        }, 2000);
      }
    },

    // Called after formative feedback completes - records result and advances immediately
    submitAnswerImmediate: (wasCorrect: boolean) => {
      const { currentProblem, currentValue, attemptCount, hintLevel, sessionResults } = get();

      if (!currentProblem) return;

      // Record attempt
      const result: AttemptResult = {
        problemId: currentProblem.id,
        targetValue: currentProblem.targetValue,
        submittedValue: currentValue,
        isCorrect: wasCorrect,
        attemptNumber: attemptCount + 1,
        hintLevel,
        timestamp: new Date(),
      };

      set({
        sessionResults: [...sessionResults, result],
        attemptCount: attemptCount + 1,
        isCorrect: wasCorrect,
      });

      // Advance immediately if correct (formative feedback already showed the celebration)
      if (wasCorrect) {
        const { problemIndex, sessionProblems } = get();
        const nextIndex = problemIndex + 1;

        if (nextIndex >= sessionProblems.length) {
          get().completeLevel();
          return;
        }

        const nextProblem = sessionProblems[nextIndex];

        // Go directly to next problem in AWAITING_INPUT state (skip PRESENTING_PROBLEM)
        // since formative feedback already provided the visual break
        set({
          gameState: 'AWAITING_INPUT',
          problemIndex: nextIndex,
          currentProblem: nextProblem,
          attemptCount: 0,
          hintLevel: 0,
          currentValue: 0,
          feedbackType: null,
          isCorrect: null,
        });
      } else {
        // For incorrect, go back to awaiting input so they can try again
        // Reset currentValue to 0 so the soroban/ten frames clear
        set({
          gameState: 'AWAITING_INPUT',
          feedbackType: null,
          currentValue: 0,
        });
      }
    },

    requestHint: () => {
      const { hintLevel, attemptCount } = get();

      // Progressive hints based on attempts
      let newHintLevel = hintLevel;
      if (attemptCount >= 3 && hintLevel < 3) {
        newHintLevel = 3; // Show guided hint
      } else if (attemptCount >= 2 && hintLevel < 2) {
        newHintLevel = 2; // Show counting hint
      } else if (attemptCount >= 1 && hintLevel < 1) {
        newHintLevel = 1; // Show highlight hint
      }

      const feedbackType: FeedbackType =
        newHintLevel === 3
          ? 'HINT_LEVEL_3'
          : newHintLevel === 2
            ? 'HINT_LEVEL_2'
            : 'HINT_LEVEL_1';

      set({
        hintLevel: newHintLevel,
        feedbackType,
        gameState: 'AWAITING_INPUT', // Stay in input mode with hint showing
      });
    },

    nextProblem: () => {
      const { problemIndex, sessionProblems } = get();
      const nextIndex = problemIndex + 1;

      if (nextIndex >= sessionProblems.length) {
        get().completeLevel();
        return;
      }

      set({
        problemIndex: nextIndex,
        currentProblem: sessionProblems[nextIndex],
        attemptCount: 0,
        hintLevel: 0,
        currentValue: 0,
        feedbackType: null,
        isCorrect: null,
        gameState: 'PRESENTING_PROBLEM',
      });

      // Auto-transition to awaiting input
      setTimeout(() => {
        get().startAwaitingInput();
      }, 1500);
    },

    completeLevel: () => {
      set({ gameState: 'LEVEL_COMPLETE' });
    },

    reset: () => {
      set(initialState);
    },
  })
);

// Helper to calculate session stats
export function calculateSessionStats(results: AttemptResult[]) {
  if (results.length === 0) {
    return {
      totalProblems: 0,
      correctFirstTry: 0,
      totalCorrect: 0,
      hintsUsed: 0,
      accuracy: 0,
    };
  }

  // Group by problem ID to get unique problems
  const problemGroups = new Map<string, AttemptResult[]>();
  results.forEach((result) => {
    const existing = problemGroups.get(result.problemId) || [];
    problemGroups.set(result.problemId, [...existing, result]);
  });

  let correctFirstTry = 0;
  let totalCorrect = 0;
  let hintsUsed = 0;

  problemGroups.forEach((attempts) => {
    const lastAttempt = attempts[attempts.length - 1];
    if (lastAttempt.isCorrect) {
      totalCorrect++;
      if (attempts.length === 1) {
        correctFirstTry++;
      }
    }
    hintsUsed += Math.max(...attempts.map((a) => a.hintLevel));
  });

  return {
    totalProblems: problemGroups.size,
    correctFirstTry,
    totalCorrect,
    hintsUsed,
    accuracy: totalCorrect / problemGroups.size,
  };
}
