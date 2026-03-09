import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface CourseLevelProgress {
  levelId: number;
  stars: 0 | 1 | 2 | 3;  // 0 = not completed, 1-3 = bronze/silver/gold
  bestAccuracy: number;  // 0-100
  bestTime?: number;  // seconds (for timed levels)
  attempts: number;
  lastPlayed: Date | null;
  xpEarned: number;  // Total XP from this level
}

export interface CourseProgress {
  // Level completion tracking
  levels: Record<number, CourseLevelProgress>;

  // Overall progress
  currentLevelId: number;  // Next level to play
  totalXP: number;
  streak: number;  // Days in a row
  lastPlayedDate: string | null;  // ISO date string for streak tracking

  // Achievements/badges
  badges: string[];  // Badge IDs
}

interface CourseProgressStore extends CourseProgress {
  // Actions
  getLevelProgress: (levelId: number) => CourseLevelProgress;
  recordLevelAttempt: (
    levelId: number,
    accuracy: number,
    stars: 0 | 1 | 2 | 3,
    xpEarned: number,
    timeTaken?: number
  ) => void;
  unlockBadge: (badgeId: string) => void;
  updateStreak: () => void;
  resetProgress: () => void;
}

const DEFAULT_LEVEL_PROGRESS: CourseLevelProgress = {
  levelId: 0,
  stars: 0,
  bestAccuracy: 0,
  attempts: 0,
  lastPlayed: null,
  xpEarned: 0,
};

const INITIAL_STATE: CourseProgress = {
  levels: {},
  currentLevelId: 1,  // Start at level 1
  totalXP: 0,
  streak: 0,
  lastPlayedDate: null,
  badges: [],
};

export const useCourseProgressStore = create<CourseProgressStore>()(
  persist(
    (set, get) => ({
      ...INITIAL_STATE,

      getLevelProgress: (levelId: number): CourseLevelProgress => {
        const progress = get().levels[levelId];
        if (!progress) {
          return { ...DEFAULT_LEVEL_PROGRESS, levelId };
        }
        return progress;
      },

      recordLevelAttempt: (
        levelId: number,
        accuracy: number,
        stars: 0 | 1 | 2 | 3,
        xpEarned: number,
        timeTaken?: number
      ) => {
        set((state) => {
          const currentProgress = state.levels[levelId] || {
            ...DEFAULT_LEVEL_PROGRESS,
            levelId,
          };

          // Update best scores
          const newBestAccuracy = Math.max(currentProgress.bestAccuracy, accuracy);
          const newBestTime =
            timeTaken !== undefined && currentProgress.bestTime !== undefined
              ? Math.min(currentProgress.bestTime, timeTaken)
              : timeTaken ?? currentProgress.bestTime;

          // Update stars (keep the best)
          const newStars = Math.max(currentProgress.stars, stars) as 0 | 1 | 2 | 3;

          // Calculate XP gained (only if improved)
          const xpGained = newStars > currentProgress.stars ? xpEarned : 0;

          const updatedProgress: CourseLevelProgress = {
            ...currentProgress,
            stars: newStars,
            bestAccuracy: newBestAccuracy,
            bestTime: newBestTime,
            attempts: currentProgress.attempts + 1,
            lastPlayed: new Date(),
            xpEarned: currentProgress.xpEarned + xpGained,
          };

          // Advance current level if this was completed and is the current level
          const newCurrentLevel =
            levelId === state.currentLevelId && stars > 0
              ? levelId + 1
              : state.currentLevelId;

          return {
            levels: {
              ...state.levels,
              [levelId]: updatedProgress,
            },
            currentLevelId: newCurrentLevel,
            totalXP: state.totalXP + xpGained,
          };
        });

        // Update streak
        get().updateStreak();
      },

      unlockBadge: (badgeId: string) => {
        set((state) => {
          if (state.badges.includes(badgeId)) {
            return state; // Already unlocked
          }
          return {
            badges: [...state.badges, badgeId],
          };
        });
      },

      updateStreak: () => {
        set((state) => {
          const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
          const lastPlayed = state.lastPlayedDate;

          if (!lastPlayed) {
            // First time playing
            return {
              lastPlayedDate: today,
              streak: 1,
            };
          }

          if (lastPlayed === today) {
            // Already played today, keep streak
            return state;
          }

          // Check if yesterday
          const yesterday = new Date();
          yesterday.setDate(yesterday.getDate() - 1);
          const yesterdayStr = yesterday.toISOString().split('T')[0];

          if (lastPlayed === yesterdayStr) {
            // Played yesterday, increment streak
            return {
              lastPlayedDate: today,
              streak: state.streak + 1,
            };
          }

          // Streak broken, reset to 1
          return {
            lastPlayedDate: today,
            streak: 1,
          };
        });
      },

      resetProgress: () => {
        set(INITIAL_STATE);
      },
    }),
    {
      name: 'soroban-course-progress',
    }
  )
);
