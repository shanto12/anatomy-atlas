/**
 * Progress store — src/lib/progress.tsx.
 *
 * The provider exposes pure helpers (parseProgress, completionPercent,
 * quizBestPercent, isBetterQuizResult) which are tested directly. The React
 * provider is then driven through a tiny hook harness (no DOM environment is
 * installed): `react` is mocked with minimal hooks and the real
 * ProgressProvider is invoked, exercising localStorage read/write, the
 * first-paint write guard, best-score rules and cross-tab sync.
 *
 * Browser-level persistence (reload, multi-tab) is also covered by Playwright.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const harness = vi.hoisted(() => {
  const state = {
    slots: [] as unknown[],
    refSlots: [] as Array<{ current: unknown }>,
    renderIndex: 0,
    refIndex: 0,
    effects: [] as Array<() => void>,
    rendering: false,
    dirty: false,
    component: null as null | ((props: { children?: unknown }) => any),
    providerType: Symbol('ProgressProvider'),
    contextValue: undefined as any,
  };

  function render() {
    if (!state.component) throw new Error('No component mounted in hook harness');
    state.dirty = false;
    state.rendering = true;
    state.renderIndex = 0;
    state.refIndex = 0;
    state.effects = [];
    const element = state.component({ children: null });
    state.rendering = false;
    state.contextValue = element.props.value;
    const effects = state.effects;
    state.effects = [];
    for (const effect of effects) effect();
  }

  function flush() {
    let guard = 0;
    do {
      state.dirty = false;
      render();
      guard += 1;
    } while (state.dirty && guard < 20);
  }

  function scheduleRender() {
    state.dirty = true;
    if (!state.rendering) flush();
  }

  function setSlot(index: number) {
    return (next: unknown) => {
      const previous = state.slots[index];
      state.slots[index] = typeof next === 'function' ? (next as (prev: unknown) => unknown)(previous) : next;
      scheduleRender();
    };
  }

  const reactMock = {
    createContext: () => ({ Provider: state.providerType }),
    useContext: () => null,
    useCallback: <T>(fn: T) => fn,
    useEffect: (effect: () => void) => {
      state.effects.push(effect);
    },
    useMemo: <T>(factory: () => T) => factory(),
    useRef: <T>(initial: T) => {
      const index = state.refIndex;
      state.refIndex += 1;
      if (!(index in state.refSlots)) state.refSlots[index] = { current: initial };
      return state.refSlots[index] as { current: T };
    },
    useState: <T>(initial: T | (() => T)) => {
      const index = state.renderIndex;
      state.renderIndex += 1;
      if (!(index in state.slots)) {
        state.slots[index] = typeof initial === 'function' ? (initial as () => T)() : initial;
      }
      return [state.slots[index] as T, setSlot(index)] as const;
    },
  };

  return {
    reactMock,
    mount(component: (props: { children?: unknown }) => any) {
      state.component = component;
      state.slots = [];
      state.refSlots = [];
      state.dirty = false;
      flush();
      return state.contextValue;
    },
    value() {
      return state.contextValue;
    },
  };
});

vi.mock('react', () => harness.reactMock);

const STORAGE_KEY = 'anatomy-atlas:progress:v1';

interface FakeStorage extends Storage {
  data: Map<string, string>;
  failWrites: boolean;
}

interface FakeWindow {
  localStorage: FakeStorage;
  listeners: Map<string, Array<(event: any) => void>>;
  addEventListener(type: string, listener: (event: any) => void): void;
  removeEventListener(type: string, listener: (event: any) => void): void;
}

function makeStorage(seed?: string | null): FakeStorage {
  const storage: FakeStorage = {
    data: new Map(),
    failWrites: false,
    get length() {
      return storage.data.size;
    },
    clear() {
      storage.data.clear();
    },
    getItem(key: string) {
      return storage.data.has(key) ? (storage.data.get(key) as string) : null;
    },
    key(index: number) {
      return [...storage.data.keys()][index] ?? null;
    },
    removeItem(key: string) {
      storage.data.delete(key);
    },
    setItem(key: string, value: string) {
      if (storage.failWrites) throw new Error('QuotaExceededError');
      storage.data.set(key, value);
    },
  };
  if (seed != null) storage.data.set(STORAGE_KEY, seed);
  return storage;
}

function installWindow(storage: FakeStorage): FakeWindow {
  const listeners = new Map<string, Array<(event: any) => void>>();
  const fakeWindow: FakeWindow = {
    localStorage: storage,
    listeners,
    addEventListener(type, listener) {
      const list = listeners.get(type) ?? [];
      list.push(listener);
      listeners.set(type, list);
    },
    removeEventListener(type, listener) {
      const list = listeners.get(type) ?? [];
      listeners.set(
        type,
        list.filter((item) => item !== listener),
      );
    },
  };
  (globalThis as any).window = fakeWindow;
  return fakeWindow;
}

let storage: FakeStorage;
let fakeWindow: FakeWindow;
let progress: typeof import('@/lib/progress');

async function mount(seed?: string | null) {
  storage = makeStorage(seed);
  fakeWindow = installWindow(storage);
  progress = await import('@/lib/progress');
  return { value: harness.mount(progress.ProgressProvider), storage, fakeWindow };
}

function persisted(): any {
  const raw = storage.data.get(STORAGE_KEY);
  return raw === undefined ? undefined : JSON.parse(raw);
}

beforeEach(() => {
  delete (globalThis as any).window;
});

afterEach(() => {
  delete (globalThis as any).window;
  vi.resetModules();
});

describe('progress pure helpers', () => {
  it('parseProgress returns a clean state for empty, corrupt, and non-object payloads', async () => {
    const { parseProgress, emptyProgressState } = await import('@/lib/progress');
    for (const raw of [null, undefined, '', '{broken', 'null', '[]', '"text"', '42']) {
      expect(parseProgress(raw)).toEqual(emptyProgressState());
    }
  });

  it('parseProgress sanitises and dedupes stored values', async () => {
    const { parseProgress } = await import('@/lib/progress');
    const parsed = parseProgress(
      JSON.stringify({
        completedLessons: ['lesson-heart', ' lesson-heart ', 42, '', 'lesson-lungs'],
        quizBest: {
          heart: { score: 7, total: 8, at: '2026-01-02T03:04:05.000Z' },
          broken: { score: 9, total: 8, at: '2026-01-02T03:04:05.000Z' },
          invalidDate: { score: 3, total: 8, at: 'not-a-date' },
          zeroTotal: { score: 0, total: 0, at: '2026-01-02T03:04:05.000Z' },
          notObject: 'nope',
        },
        exploredOrgans: ['heart', 'heart', 'lungs'],
        bookmarks: ['heart', 1, 'lungs', 'heart'],
      }),
    );
    expect(parsed.completedLessons).toEqual(['lesson-heart', 'lesson-lungs']);
    expect(parsed.exploredOrgans).toEqual(['heart', 'lungs']);
    expect(parsed.bookmarks).toEqual(['heart', 'lungs']);
    expect(Object.keys(parsed.quizBest).sort()).toEqual(['heart', 'invalidDate']);
    expect(parsed.quizBest.heart).toEqual({ score: 7, total: 8, at: '2026-01-02T03:04:05.000Z' });
    expect(Number.isNaN(Date.parse(parsed.quizBest.invalidDate.at))).toBe(false);
  });

  it('completionPercent rounds, clamps, and handles degenerate totals', async () => {
    const { completionPercent } = await import('@/lib/progress');
    expect(completionPercent([], 12)).toBe(0);
    expect(completionPercent(['a'], 12)).toBe(8);
    expect(completionPercent(['a', 'b', 'c'], 12)).toBe(25);
    expect(completionPercent(Array.from({ length: 12 }, (_, i) => String(i)), 12)).toBe(100);
    expect(completionPercent(Array.from({ length: 20 }, (_, i) => String(i)), 12)).toBe(100);
    expect(completionPercent(['a'], 0)).toBe(0);
    expect(completionPercent(['a'], -3)).toBe(0);
    expect(completionPercent(['a'], Number.NaN)).toBe(0);
    expect(completionPercent(['a', 'b'], 3)).toBe(67);
  });

  it('quizBestPercent and isBetterQuizResult follow the documented rules', async () => {
    const { quizBestPercent, isBetterQuizResult } = await import('@/lib/progress');
    expect(quizBestPercent(undefined)).toBeUndefined();
    expect(quizBestPercent({ score: 5, total: 8, at: 'x' })).toBe(63);
    expect(quizBestPercent({ score: 8, total: 8, at: 'x' })).toBe(100);
    expect(quizBestPercent({ score: 0, total: 0, at: 'x' })).toBeUndefined();

    expect(isBetterQuizResult(undefined, 1, 8)).toBe(true);
    expect(isBetterQuizResult({ score: 5, total: 8, at: 'x' }, 6, 10)).toBe(false); // 0.60 < 0.625
    expect(isBetterQuizResult({ score: 5, total: 8, at: 'x' }, 6, 8)).toBe(true);
    expect(isBetterQuizResult({ score: 5, total: 8, at: 'x' }, 5, 8)).toBe(false); // equal ratio
    expect(isBetterQuizResult({ score: 5, total: 8, at: 'x' }, 3, 0)).toBe(false);
  });
});

describe('progress provider: storage contract', () => {
  it('uses the documented key and does not write before the first read settles', async () => {
    const { value, storage } = await mount();
    expect(value.state).toEqual({ completedLessons: [], quizBest: {}, exploredOrgans: [], bookmarks: [] });
    expect(storage.data.has(STORAGE_KEY)).toBe(false);
  });

  it('restores previously saved progress from localStorage', async () => {
    const seeded = {
      completedLessons: ['lesson-heart'],
      quizBest: { heart: { score: 7, total: 8, at: '2026-01-02T03:04:05.000Z' } },
      exploredOrgans: ['heart', 'lungs'],
      bookmarks: ['heart'],
    };
    const { value } = await mount(JSON.stringify(seeded));
    expect(value.state).toEqual(seeded);
    expect(value.isLessonComplete('lesson-heart')).toBe(true);
    expect(value.exploredCount).toBe(2);
    expect(value.isBookmarked('heart')).toBe(true);
    expect(value.getQuizBest('heart')).toEqual(seeded.quizBest.heart);
    expect(value.hasProgress).toBe(true);
    expect(value.completionPercent(12)).toBe(8);
    expect(value.lastQuizAt).toBe(seeded.quizBest.heart.at);
  });

  it('falls back to empty state for corrupt JSON and keeps the app alive', async () => {
    const { value } = await mount('{not valid json');
    expect(value.state).toEqual({ completedLessons: [], quizBest: {}, exploredOrgans: [], bookmarks: [] });
  });

  it('sanitises individually corrupt fields on read', async () => {
    const { value } = await mount(JSON.stringify({ completedLessons: 'nope', exploredOrgans: 42 }));
    expect(value.state.completedLessons).toEqual([]);
    expect(value.state.exploredOrgans).toEqual([]);
  });

  it('keeps working in memory when localStorage writes throw (private mode)', async () => {
    storage = makeStorage();
    storage.failWrites = true;
    installWindow(storage);
    progress = await import('@/lib/progress');
    const value = harness.mount(progress.ProgressProvider);
    expect(() => value.markLessonComplete('lesson-heart')).not.toThrow();
    expect(harness.value().state.completedLessons).toContain('lesson-heart');
  });
});

describe('progress provider: lessons', () => {
  it('marks a lesson complete exactly once and persists it', async () => {
    const { value, storage } = await mount();
    value.markLessonComplete('lesson-heart');
    value.markLessonComplete('lesson-heart');
    const current = harness.value();
    expect(current.state.completedLessons).toEqual(['lesson-heart']);
    expect(current.isLessonComplete('lesson-heart')).toBe(true);
    expect(current.isLessonComplete('lesson-lungs')).toBe(false);
    expect(persisted().completedLessons).toEqual(['lesson-heart']);
    expect(storage.getItem(STORAGE_KEY)).not.toBeNull();
  });

  it('ignores empty lesson ids', async () => {
    const { value } = await mount();
    value.markLessonComplete('   ');
    expect(harness.value().state.completedLessons).toEqual([]);
  });
});

describe('progress provider: quiz best scores', () => {
  it('keeps the best ratio and ignores worse or equal attempts', async () => {
    const { value } = await mount();
    value.saveQuizResult('cardiovascular', 5, 8);
    const first = harness.value().getQuizBest('cardiovascular');
    expect(first).toMatchObject({ score: 5, total: 8 });
    expect(typeof first?.at).toBe('string');
    expect(new Date(first!.at).toISOString()).toBe(first!.at);

    value.saveQuizResult('cardiovascular', 6, 10); // worse ratio: 0.60 < 0.625
    expect(harness.value().getQuizBest('cardiovascular')).toEqual(first);

    value.saveQuizResult('cardiovascular', 5, 8); // equal ratio
    expect(harness.value().getQuizBest('cardiovascular')).toEqual(first);

    value.saveQuizResult('cardiovascular', 8, 8);
    expect(harness.value().getQuizBest('cardiovascular')).toMatchObject({ score: 8, total: 8 });
    expect(persisted().quizBest.cardiovascular.score).toBe(8);
  });

  it('validates score/total and ignores impossible results', async () => {
    const { value } = await mount();
    value.saveQuizResult('heart', 9, 8);
    value.saveQuizResult('heart', -1, 8);
    value.saveQuizResult('heart', 4, 0);
    value.saveQuizResult('', 4, 8);
    value.saveQuizResult('heart', Number.NaN, 8);
    expect(harness.value().state.quizBest).toEqual({});
  });

  it('tracks quiz bests per quiz id', async () => {
    const { value } = await mount();
    value.saveQuizResult('cardiovascular', 6, 8);
    value.saveQuizResult('respiratory', 4, 8);
    expect(Object.keys(harness.value().state.quizBest).sort()).toEqual(['cardiovascular', 'respiratory']);
    expect(persisted().quizBest.respiratory.score).toBe(4);
    expect(harness.value().quizAttemptCount).toBe(2);
  });
});

describe('progress provider: explored organs and bookmarks', () => {
  it('dedupes explored organs and reports the count', async () => {
    const { value } = await mount();
    value.markOrganExplored('heart');
    value.markOrganExplored('heart');
    value.markOrganExplored('lungs');
    expect(harness.value().state.exploredOrgans).toEqual(['heart', 'lungs']);
    expect(harness.value().exploredCount).toBe(2);
  });

  it('toggles bookmarks on and off', async () => {
    const { value } = await mount();
    expect(harness.value().isBookmarked('heart')).toBe(false);
    value.toggleBookmark('heart');
    expect(harness.value().isBookmarked('heart')).toBe(true);
    value.toggleBookmark('heart');
    expect(harness.value().isBookmarked('heart')).toBe(false);
    expect(harness.value().state.bookmarks).toEqual([]);
  });

  it('resetProgress clears every slice and the persisted payload', async () => {
    const { value } = await mount();
    value.markLessonComplete('lesson-heart');
    value.saveQuizResult('heart', 4, 8);
    value.markOrganExplored('heart');
    value.toggleBookmark('heart');
    value.resetProgress();
    const current = harness.value();
    expect(current.state).toEqual({ completedLessons: [], quizBest: {}, exploredOrgans: [], bookmarks: [] });
    expect(current.exploredCount).toBe(0);
    expect(current.hasProgress).toBe(false);
    // A reload must observe an empty store, whether the key was removed or
    // rewritten with the empty payload.
    const { parseProgress } = await import('@/lib/progress');
    expect(parseProgress(storage.getItem(STORAGE_KEY))).toEqual({
      completedLessons: [],
      quizBest: {},
      exploredOrgans: [],
      bookmarks: [],
    });
  });
});

describe('progress provider: cross-tab sync', () => {
  it('adopts state written by another tab', async () => {
    const { fakeWindow } = await mount();
    // Snapshot: each render re-registers the listener in this hook harness.
    const listeners = [...(fakeWindow.listeners.get('storage') ?? [])];
    expect(listeners.length).toBeGreaterThan(0);
    const nextState = {
      completedLessons: ['lesson-heart'],
      quizBest: {},
      exploredOrgans: ['heart'],
      bookmarks: [],
    };
    listeners[0]({ key: STORAGE_KEY, storageArea: fakeWindow.localStorage, newValue: JSON.stringify(nextState) });
    expect(harness.value().state).toEqual(nextState);
  });

  it('ignores storage events for other keys', async () => {
    const { fakeWindow } = await mount();
    const listeners = [...(fakeWindow.listeners.get('storage') ?? [])];
    listeners[0]({ key: 'unrelated', storageArea: fakeWindow.localStorage, newValue: '{}' });
    expect(harness.value().state).toEqual({ completedLessons: [], quizBest: {}, exploredOrgans: [], bookmarks: [] });
  });
});
