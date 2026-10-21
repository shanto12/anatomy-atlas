import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

export interface QuizBest {
  score: number;
  total: number;
  at: string;
}

export interface ProgressState {
  completedLessons: string[];
  quizBest: Record<string, QuizBest>;
  exploredOrgans: string[];
  bookmarks: string[];
}

const STORAGE_KEY = 'anatomy-atlas:progress:v1';

const EMPTY: ProgressState = {
  completedLessons: [],
  quizBest: {},
  exploredOrgans: [],
  bookmarks: [],
};

function readState(): ProgressState {
  if (typeof window === 'undefined') return EMPTY;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return EMPTY;
    const parsed = JSON.parse(raw) as Partial<ProgressState>;
    return {
      completedLessons: Array.isArray(parsed.completedLessons) ? parsed.completedLessons : [],
      quizBest: parsed.quizBest && typeof parsed.quizBest === 'object' ? parsed.quizBest : {},
      exploredOrgans: Array.isArray(parsed.exploredOrgans) ? parsed.exploredOrgans : [],
      bookmarks: Array.isArray(parsed.bookmarks) ? parsed.bookmarks : [],
    };
  } catch {
    return EMPTY;
  }
}

interface ProgressContextValue {
  state: ProgressState;
  markLessonComplete: (id: string) => void;
  isLessonComplete: (id: string) => boolean;
  saveQuizResult: (quizId: string, score: number, total: number) => void;
  getQuizBest: (quizId: string) => QuizBest | undefined;
  markOrganExplored: (id: string) => void;
  exploredCount: number;
  toggleBookmark: (id: string) => void;
  isBookmarked: (id: string) => boolean;
  resetProgress: () => void;
}

const ProgressContext = createContext<ProgressContextValue | null>(null);

export function ProgressProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<ProgressState>(readState);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      /* private mode / quota — progress simply won't persist */
    }
  }, [state]);

  const value = useMemo<ProgressContextValue>(() => {
    return {
      state,
      markLessonComplete: (id) =>
        setState((prev) =>
          prev.completedLessons.includes(id)
            ? prev
            : { ...prev, completedLessons: [...prev.completedLessons, id] },
        ),
      isLessonComplete: (id) => state.completedLessons.includes(id),
      saveQuizResult: (quizId, score, total) =>
        setState((prev) => {
          const best = prev.quizBest[quizId];
          if (best && best.score >= score) return prev;
          return {
            ...prev,
            quizBest: { ...prev.quizBest, [quizId]: { score, total, at: new Date().toISOString() } },
          };
        }),
      getQuizBest: (quizId) => state.quizBest[quizId],
      markOrganExplored: (id) =>
        setState((prev) =>
          prev.exploredOrgans.includes(id) ? prev : { ...prev, exploredOrgans: [...prev.exploredOrgans, id] },
        ),
      exploredCount: state.exploredOrgans.length,
      toggleBookmark: (id) =>
        setState((prev) => ({
          ...prev,
          bookmarks: prev.bookmarks.includes(id)
            ? prev.bookmarks.filter((x) => x !== id)
            : [...prev.bookmarks, id],
        })),
      isBookmarked: (id) => state.bookmarks.includes(id),
      resetProgress: () => setState(EMPTY),
    };
  }, [state]);

  return <ProgressContext.Provider value={value}>{children}</ProgressContext.Provider>;
}

export function useProgress(): ProgressContextValue {
  const ctx = useContext(ProgressContext);
  if (!ctx) throw new Error('useProgress must be used inside ProgressProvider');
  return ctx;
}
