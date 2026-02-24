import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { LevelProgress, LevelStatus, UserProfile } from '../models/types';

interface ProgressState {
  // User profiles
  profiles: UserProfile[];
  currentProfileId: string | null;

  // Level progress (keyed by levelId)
  levelProgress: Record<number, LevelProgress>;

  // Session stats
  totalPlayTime: number; // in seconds
  lastPlayedDate: string | null;
}

interface ProgressActions {
  // Profile management
  createProfile: (name: string, avatar?: string) => string;
  selectProfile: (profileId: string) => void;
  getCurrentProfile: () => UserProfile | null;

  // Level progress
  getLevelProgress: (levelId: number) => LevelProgress;
  updateLevelProgress: (levelId: number, updates: Partial<LevelProgress>) => void;
  recordLevelCompletion: (
    levelId: number,
    accuracy: number,
    correctFirstTry: number,
    totalProblems: number,
    hintsUsed: number
  ) => void;

  // Play time
  addPlayTime: (seconds: number) => void;

  // Reset
  resetProgress: () => void;
}

const generateId = () => Math.random().toString(36).substring(2, 9);

const createDefaultLevelProgress = (levelId: number): LevelProgress => ({
  levelId,
  status: levelId === 1 ? 'UNLOCKED' : 'LOCKED',
  stars: 0,
  attempts: 0,
  correctFirstTry: 0,
  hintsUsed: 0,
  masteryScore: 0,
  lastPlayed: null,
});

const initialState: ProgressState = {
  profiles: [],
  currentProfileId: null,
  levelProgress: {
    1: createDefaultLevelProgress(1), // Level 1 always unlocked
  },
  totalPlayTime: 0,
  lastPlayedDate: null,
};

export const useProgressStore = create<ProgressState & ProgressActions>()(
  persist(
    (set, get) => ({
      ...initialState,

      createProfile: (name, avatar = 'default') => {
        const id = generateId();
        const profile: UserProfile = {
          id,
          name,
          avatar,
          createdAt: new Date(),
          currentLevel: 1,
        };

        set((state) => ({
          profiles: [...state.profiles, profile],
          currentProfileId: id,
        }));

        return id;
      },

      selectProfile: (profileId) => {
        set({ currentProfileId: profileId });
      },

      getCurrentProfile: () => {
        const state = get();
        return state.profiles.find((p) => p.id === state.currentProfileId) || null;
      },

      getLevelProgress: (levelId) => {
        const state = get();
        return state.levelProgress[levelId] || createDefaultLevelProgress(levelId);
      },

      updateLevelProgress: (levelId, updates) => {
        set((state) => ({
          levelProgress: {
            ...state.levelProgress,
            [levelId]: {
              ...state.getLevelProgress(levelId),
              ...updates,
            },
          },
        }));
      },

      recordLevelCompletion: (
        levelId,
        accuracy,
        correctFirstTry,
        totalProblems,
        hintsUsed
      ) => {
        const state = get();
        const current = state.getLevelProgress(levelId);

        // Calculate mastery score (0-100)
        // Weighted: accuracy (40%), first-try rate (30%), low hints (30%)
        const firstTryRate = correctFirstTry / totalProblems;
        const hintPenalty = Math.min(hintsUsed / totalProblems, 1);
        const masteryScore = Math.round(
          accuracy * 40 +
          firstTryRate * 30 +
          (1 - hintPenalty) * 30
        );

        // Calculate stars (0-3)
        let stars: 0 | 1 | 2 | 3 = 0;
        if (masteryScore >= 90) stars = 3;
        else if (masteryScore >= 70) stars = 2;
        else if (masteryScore >= 50) stars = 1;

        // Determine new status
        let status: LevelStatus = current.status;
        if (masteryScore >= 90) {
          status = 'MASTERED';
        } else if (masteryScore >= 50) {
          status = 'COMPLETED';
        } else {
          status = 'IN_PROGRESS';
        }

        // Update this level
        set((state) => ({
          levelProgress: {
            ...state.levelProgress,
            [levelId]: {
              levelId,
              status,
              stars: Math.max(current.stars, stars) as 0 | 1 | 2 | 3,
              attempts: current.attempts + 1,
              correctFirstTry: current.correctFirstTry + correctFirstTry,
              hintsUsed: current.hintsUsed + hintsUsed,
              masteryScore: Math.max(current.masteryScore, masteryScore),
              lastPlayed: new Date(),
            },
          },
          lastPlayedDate: new Date().toISOString(),
        }));

        // Check if we should unlock next level
        if (masteryScore >= 70) {
          const nextLevelId = levelId + 1;
          const nextLevel = state.levelProgress[nextLevelId];
          if (!nextLevel || nextLevel.status === 'LOCKED') {
            set((state) => ({
              levelProgress: {
                ...state.levelProgress,
                [nextLevelId]: {
                  ...createDefaultLevelProgress(nextLevelId),
                  status: 'UNLOCKED',
                },
              },
            }));
          }
        }
      },

      addPlayTime: (seconds) => {
        set((state) => ({
          totalPlayTime: state.totalPlayTime + seconds,
        }));
      },

      resetProgress: () => {
        set(initialState);
      },
    }),
    {
      name: 'soroban-progress',
      version: 1,
    }
  )
);

// Helper hook to check if a level is playable
export function isLevelPlayable(levelId: number): boolean {
  const progress = useProgressStore.getState().getLevelProgress(levelId);
  return progress.status !== 'LOCKED';
}
