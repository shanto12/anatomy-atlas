import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

/**
 * Device-local learning progress for Anatomy Atlas.
 *
 * Contract (docs/ARCHITECTURE.md §3) — keep stable:
 *   localStorage key `anatomy-atlas:progress:v1`
 *   state: { completedLessons, quizBest, exploredOrgans, bookmarks }
 *
 * Progress never leaves the browser. The store is deliberately forgiving:
 * corrupt JSON, private-mode storage failures and partially-written values
 * must never break the app.
 */

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

export const PROGRESS_STORAGE_KEY = 'anatomy-atlas:progress:v1';

const MAX_LESSONS = 500;
const MAX_ORGANS = 2000;
const MAX_BOOKMARKS = 500;
const MAX_QUIZ_KEYS = 200;

export function emptyProgressState(): ProgressState {
  return { completedLessons: [], quizBest: {}, exploredOrgans: [], bookmarks: [] };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function uniqueStrings(value: unknown, limit: number): string[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of value) {
    if (typeof item !== 'string') continue;
    const id = item.trim();
    if (!id || seen.has(id)) continue;
    seen.add(id);
    out.push(id);
    if (out.length >= limit) break;
  }
  return out;
}

function toCount(value: unknown, min: number, max: number): number | undefined {
  if (typeof value !== 'number' || !Number.isFinite(value)) return undefined;
  const rounded = Math.round(value);
  if (rounded < min || rounded > max) return undefined;
  return rounded;
}

function sanitizeQuizBest(value: unknown): Record<string, QuizBest> {
  if (!isRecord(value)) return {};
  const out: Record<string, QuizBest> = {};
  for (const [quizId, raw] of Object.entries(value)) {
    if (!quizId || Object.keys(out).length >= MAX_QUIZ_KEYS) continue;
    if (!isRecord(raw)) continue;
    const total = toCount(raw.total, 1, 1000);
    const score = toCount(raw.score, 0, total ?? 1000);
    if (total === undefined || score === undefined || score > total) continue;
    const at =
      typeof raw.at === 'string' && !Number.isNaN(Date.parse(raw.at)) ? raw.at : new Date().toISOString();
    out[quizId] = { score, total, at };
  }
  return out;
}

/** Parse a serialized progress payload, falling back to a clean state on any corruption. */
export function parseProgress(raw: string | null | undefined): ProgressState {
  if (!raw) return emptyProgressState();
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!isRecord(parsed)) return emptyProgressState();
    return {
      completedLessons: uniqueStrings(parsed.completedLessons, MAX_LESSONS),
      quizBest: sanitizeQuizBest(parsed.quizBest),
      exploredOrgans: uniqueStrings(parsed.exploredOrgans, MAX_ORGANS),
      bookmarks: uniqueStrings(parsed.bookmarks, MAX_BOOKMARKS),
    };
  } catch {
    return emptyProgressState();
  }
}

function getStorage(): Storage | null {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return null;
    // Touch the store once: some browsers throw here in private mode.
    const probe = '__anatomy-atlas-probe__';
    window.localStorage.setItem(probe, '1');
    window.localStorage.removeItem(probe);
    return window.localStorage;
  } catch {
    return null;
  }
}

function readState(): ProgressState {
  const storage = getStorage();
  if (!storage) return emptyProgressState();
  try {
    return parseProgress(storage.getItem(PROGRESS_STORAGE_KEY));
  } catch {
    return emptyProgressState();
  }
}

function writeState(state: ProgressState): void {
  const storage = getStorage();
  if (!storage) return;
  try {
    storage.setItem(PROGRESS_STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* private mode / quota — the session still works, progress just won't persist */
  }
}

/* ------------------------------------------------------------------ */
/* Pure selectors (exported so they can be unit-tested without React)  */
/* ------------------------------------------------------------------ */

/** Percentage of lessons completed, rounded to the nearest whole number. */
export function completionPercent(completedLessons: readonly string[], totalLessons: number): number {
  if (!Number.isFinite(totalLessons) || totalLessons <= 0) return 0;
  const completed = completedLessons.length;
  if (completed <= 0) return 0;
  return Math.max(0, Math.min(100, Math.round((completed / totalLessons) * 100)));
}

/** Percentage score for a saved quiz best, or undefined when never attempted. */
export function quizBestPercent(best: QuizBest | undefined): number | undefined {
  if (!best || best.total <= 0) return undefined;
  return Math.max(0, Math.min(100, Math.round((best.score / best.total) * 100)));
}

/** True when a newly finished attempt is better than the saved best (by ratio). */
export function isBetterQuizResult(
  previous: QuizBest | undefined,
  score: number,
  total: number,
): boolean {
  if (!previous || previous.total <= 0) return true;
  if (total <= 0) return false;
  return score / total > previous.score / previous.total;
}

/* ------------------------------------------------------------------ */
/* React context                                                       */
/* ------------------------------------------------------------------ */

export interface ProgressContextValue {
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

  /* ---- additive, non-breaking helpers ---- */
  /** Number of lessons in `completedLessons`. */
  completedLessonCount: number;
  /** Number of attempts recorded in `quizBest` (one best per quiz). */
  quizAttemptCount: number;
  /** Number of saved bookmarks. */
  bookmarkCount: number;
  /** True when the learner has done anything at all. */
  hasProgress: boolean;
  /** Whole-number percentage of `total` lessons completed. */
  completionPercent: (totalLessons: number) => number;
  /** Whole-number percentage for a saved quiz best, or undefined. */
  quizBestPercent: (quizId: string) => number | undefined;
  /** Timestamp (ISO string) of the most recent recorded quiz attempt. */
  lastQuizAt: string | undefined;
}

const ProgressContext = createContext<ProgressContextValue | null>(null);

export function ProgressProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<ProgressState>(readState);
  const mounted = useRef(false);

  // Persist on change, but never before the first read has settled.
  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
      return;
    }
    writeState(state);
  }, [state]);

  // Keep tabs in sync without clobbering newer in-tab state.
  useEffect(() => {
    function onStorage(event: StorageEvent) {
      if (event.key !== PROGRESS_STORAGE_KEY) return;
      if (event.storageArea && event.storageArea !== window.localStorage) return;
      setState((prev) => {
        const next = parseProgress(event.newValue);
        return JSON.stringify(prev) === JSON.stringify(next) ? prev : next;
      });
    }
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const markLessonComplete = useCallback((id: string) => {
    const lessonId = id.trim();
    if (!lessonId) return;
    setState((prev) => {
      if (prev.completedLessons.includes(lessonId) || prev.completedLessons.length >= MAX_LESSONS) {
        return prev;
      }
      return { ...prev, completedLessons: [...prev.completedLessons, lessonId] };
    });
  }, []);

  const saveQuizResult = useCallback((quizId: string, score: number, total: number) => {
    const id = quizId.trim();
    const cleanTotal = Math.round(Number(total));
    const cleanScore = Math.round(Number(score));
    if (!id || !Number.isFinite(cleanTotal) || !Number.isFinite(cleanScore)) return;
    if (cleanTotal <= 0 || cleanScore < 0 || cleanScore > cleanTotal) return;
    setState((prev) => {
      const previous = prev.quizBest[id];
      if (!isBetterQuizResult(previous, cleanScore, cleanTotal)) return prev;
      return {
        ...prev,
        quizBest: {
          ...prev.quizBest,
          [id]: { score: cleanScore, total: cleanTotal, at: new Date().toISOString() },
        },
      };
    });
  }, []);

  const markOrganExplored = useCallback((id: string) => {
    const organId = id.trim();
    if (!organId) return;
    setState((prev) => {
      if (prev.exploredOrgans.includes(organId) || prev.exploredOrgans.length >= MAX_ORGANS) return prev;
      return { ...prev, exploredOrgans: [...prev.exploredOrgans, organId] };
    });
  }, []);

  const toggleBookmark = useCallback((id: string) => {
    const bookmarkId = id.trim();
    if (!bookmarkId) return;
    setState((prev) => {
      if (prev.bookmarks.includes(bookmarkId)) {
        return { ...prev, bookmarks: prev.bookmarks.filter((item) => item !== bookmarkId) };
      }
      if (prev.bookmarks.length >= MAX_BOOKMARKS) return prev;
      return { ...prev, bookmarks: [...prev.bookmarks, bookmarkId] };
    });
  }, []);

  const resetProgress = useCallback(() => {
    setState(emptyProgressState());
    const storage = getStorage();
    try {
      storage?.removeItem(PROGRESS_STORAGE_KEY);
    } catch {
      /* ignore */
    }
  }, []);

  const value = useMemo<ProgressContextValue>(() => {
    const quizValues = Object.values(state.quizBest);
    const lastQuizAt = quizValues.reduce<string | undefined>(
      (latest, best) => (latest === undefined || Date.parse(best.at) > Date.parse(latest) ? best.at : latest),
      undefined,
    );
    return {
      state,
      markLessonComplete,
      isLessonComplete: (id) => state.completedLessons.includes(id),
      saveQuizResult,
      getQuizBest: (quizId) => state.quizBest[quizId],
      markOrganExplored,
      exploredCount: state.exploredOrgans.length,
      toggleBookmark,
      isBookmarked: (id) => state.bookmarks.includes(id),
      resetProgress,

      completedLessonCount: state.completedLessons.length,
      quizAttemptCount: quizValues.length,
      bookmarkCount: state.bookmarks.length,
      hasProgress:
        state.completedLessons.length > 0 ||
        state.exploredOrgans.length > 0 ||
        state.bookmarks.length > 0 ||
        quizValues.length > 0,
      completionPercent: (totalLessons) => completionPercent(state.completedLessons, totalLessons),
      quizBestPercent: (quizId) => quizBestPercent(state.quizBest[quizId]),
      lastQuizAt,
    };
  }, [state, markLessonComplete, saveQuizResult, markOrganExplored, toggleBookmark, resetProgress]);

  return <ProgressContext.Provider value={value}>{children}</ProgressContext.Provider>;
}

export function useProgress(): ProgressContextValue {
  const ctx = useContext(ProgressContext);
  if (!ctx) throw new Error('useProgress must be used inside ProgressProvider');
  return ctx;
}
