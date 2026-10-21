import type { AnatomySystem, Difficulty, QuizQuestion } from '@/lib/types';

/**
 * Quiz engine for Anatomy Atlas.
 *
 * Everything here is deterministic: given the same content and the same seed,
 * the shuffled exam and the shuffled options come out identical on every render,
 * refresh and build. Nothing is stored — progress saves only the best score.
 */

export const FINAL_EXAM_ID = 'final-exam';
export const FINAL_EXAM_QUESTIONS_PER_SYSTEM = 2;
export const FINAL_EXAM_QUESTION_TOTAL = 24;

export const OPTION_LETTERS = ['A', 'B', 'C', 'D'] as const;

/* ------------------------------------------------------------------ */
/* Deterministic randomness                                            */
/* ------------------------------------------------------------------ */

/** FNV-1a 32-bit hash — stable across browsers and builds. */
export function hashString(input: string): number {
  let hash = 2166136261 >>> 0;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

/** Small, fast seeded PRNG (mulberry32). */
export function seededRandom(seed: string | number): () => number {
  const numeric = typeof seed === 'number' ? seed : hashString(seed);
  let state = numeric >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Fisher–Yates shuffle driven by a seeded PRNG. Never mutates the input. */
export function seededShuffle<T>(items: readonly T[], seed: string | number): T[] {
  const out = items.slice();
  const random = seededRandom(seed);
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    const tmp = out[i];
    out[i] = out[j];
    out[j] = tmp;
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* Preparing questions                                                 */
/* ------------------------------------------------------------------ */

export interface PreparedQuestion {
  id: string;
  systemId: QuizQuestion['systemId'];
  question: string;
  /** Options in display order (shuffled deterministically). */
  options: string[];
  /** Correct option index in display order. */
  answerIndex: number;
  explanation: string;
  difficulty: Difficulty;
  /** Original option index for each display slot (useful for debugging/review). */
  optionOrder: number[];
}

export interface PreparedQuiz {
  id: string;
  title: string;
  subtitle: string;
  questions: PreparedQuestion[];
  systemIds: QuizQuestion['systemId'][];
}

/** A question is usable only if its options and answer are internally consistent. */
export function isUsableQuestion(question: QuizQuestion | undefined | null): question is QuizQuestion {
  if (!question) return false;
  if (typeof question.id !== 'string' || !question.id) return false;
  if (typeof question.question !== 'string' || !question.question.trim()) return false;
  if (!Array.isArray(question.options) || question.options.length < 2) return false;
  if (question.options.some((option) => typeof option !== 'string' || !option.trim())) return false;
  if (!Number.isInteger(question.answerIndex)) return false;
  if (question.answerIndex < 0 || question.answerIndex >= question.options.length) return false;
  if (typeof question.explanation !== 'string' || !question.explanation.trim()) return false;
  return true;
}

/**
 * Shuffle a question's options but keep the correct answer pointing at the same
 * text. A stable seed derived from the question id means repeat visits show the
 * same order, so a learner can't lose their place.
 */
export function prepareQuestion(question: QuizQuestion, seed = 'anatomy-atlas'): PreparedQuestion {
  const indices = question.options.map((_, index) => index);
  const optionOrder = seededShuffle(indices, `${seed}:${question.id}`);
  const options = optionOrder.map((index) => question.options[index]);
  const answerIndex = optionOrder.indexOf(question.answerIndex);
  return {
    id: question.id,
    systemId: question.systemId,
    question: question.question,
    options,
    answerIndex: answerIndex >= 0 ? answerIndex : 0,
    explanation: question.explanation,
    difficulty: question.difficulty,
    optionOrder,
  };
}

/* ------------------------------------------------------------------ */
/* Quiz builders                                                       */
/* ------------------------------------------------------------------ */

/** The eight-question quiz that belongs to one system. */
export function buildSystemQuiz(system: AnatomySystem, seed = 'system-quiz-v1'): PreparedQuiz {
  const questions = system.quiz
    .filter(isUsableQuestion)
    .map((question) => prepareQuestion(question, `${seed}:${system.id}`));
  return {
    id: system.id,
    title: `${system.name} quiz`,
    subtitle: system.tagline,
    questions,
    systemIds: questions.length > 0 ? [system.id] : [],
  };
}

/** How many questions a final exam will contain with the currently available content. */
export function finalExamSize(systems: readonly AnatomySystem[]): number {
  return systems.reduce(
    (total, system) =>
      Math.min(FINAL_EXAM_QUESTIONS_PER_SYSTEM, system.quiz.filter(isUsableQuestion).length) + total,
    0,
  );
}

/**
 * Build the final exam: exactly two questions per system (24 when all twelve
 * systems are present), deterministically chosen and mixed into one paper.
 * Partial content degrades gracefully — the exam is 2 × available systems.
 */
export function buildFinalExam(systems: readonly AnatomySystem[], seed = 'final-exam-v1'): PreparedQuiz {
  const picks = systems.map((system, systemIndex) => {
    const usable = system.quiz.filter(isUsableQuestion);
    const shuffled = seededShuffle(usable, `${seed}:pick:${system.id}`);
    return shuffled
      .slice(0, FINAL_EXAM_QUESTIONS_PER_SYSTEM)
      .map((question, questionIndex) =>
        prepareQuestion(question, `${seed}:prepare:${systemIndex}:${questionIndex}`),
      );
  });
  const mixed = seededShuffle(picks.flat(), `${seed}:order`);
  return {
    id: FINAL_EXAM_ID,
    title: 'Final exam',
    subtitle: 'Two questions from every body system, gathered into one paper.',
    questions: mixed,
    systemIds: systems.filter((system) => system.quiz.some(isUsableQuestion)).map((system) => system.id),
  };
}

/* ------------------------------------------------------------------ */
/* Attempts & grading                                                  */
/* ------------------------------------------------------------------ */

export type QuizAnswers = readonly (number | null)[];

export interface AnswerRecord {
  question: PreparedQuestion;
  selectedIndex: number | null;
  correct: boolean;
}

export interface QuizResult {
  quizId: string;
  score: number;
  total: number;
  percent: number;
  answers: AnswerRecord[];
  missed: AnswerRecord[];
}

export function percentOf(score: number, total: number): number {
  if (!Number.isFinite(score) || !Number.isFinite(total) || total <= 0) return 0;
  return Math.max(0, Math.min(100, Math.round((score / total) * 100)));
}

/** Grade an attempt. Unanswered questions count as incorrect but are tracked separately. */
export function scoreQuiz(
  questions: readonly PreparedQuestion[],
  answers: QuizAnswers,
  quizId = 'quiz',
): QuizResult {
  const records = questions.map((question, index) => {
    const raw = answers[index];
    const selectedIndex =
      typeof raw === 'number' && Number.isInteger(raw) && raw >= 0 && raw < question.options.length
        ? raw
        : null;
    return {
      question,
      selectedIndex,
      correct: selectedIndex !== null && selectedIndex === question.answerIndex,
    };
  });
  const score = records.filter((record) => record.correct).length;
  return {
    quizId,
    score,
    total: records.length,
    percent: percentOf(score, records.length),
    answers: records,
    missed: records.filter((record) => !record.correct),
  };
}

export type GradeBand = 'excellent' | 'strong' | 'steady' | 'beginning';

export interface GradeFeedback {
  band: GradeBand;
  headline: string;
  message: string;
}

export function gradeBand(percent: number): GradeBand {
  if (percent >= 90) return 'excellent';
  if (percent >= 75) return 'strong';
  if (percent >= 55) return 'steady';
  return 'beginning';
}

/**
 * Warm, honest feedback. No streaks, no shame, no "you failed" language —
 * just a clear read on the attempt and one useful next step.
 */
export function gradeFeedback(percent: number): GradeFeedback {
  switch (gradeBand(percent)) {
    case 'excellent':
      return {
        band: 'excellent',
        headline: 'Beautifully done.',
        message:
          'You answered almost everything correctly. Read the explanations for the ones you missed — that is usually where the real learning hides.',
      };
    case 'strong':
      return {
        band: 'strong',
        headline: 'A strong pass.',
        message:
          'You have a solid grip on this material. Skim the explanations below, then try the final exam when you want to see it all together.',
      };
    case 'steady':
      return {
        band: 'steady',
        headline: 'The foundation is there.',
        message:
          'You know the broad shape of it, and the details will settle with another pass. Review the missed questions, then retry — there is no penalty.',
      };
    default:
      return {
        band: 'beginning',
        headline: 'This is a beginning, not a verdict.',
        message:
          'Quizzes work best after the lesson, when the story is already in your head. Walk through the recommendations below, then come back and try again.',
      };
  }
}

/** Sensible next step after a quiz, based on how it went. */
export interface QuizRecommendation {
  label: string;
  href: string;
  description: string;
}

export function quizRecommendations(
  result: QuizResult,
  options: {
    lessonHref?: string;
    lessonLabel?: string;
    retryLabel?: string;
    nextHref?: string;
    nextLabel?: string;
  } = {},
): QuizRecommendation[] {
  const { lessonHref, lessonLabel, nextHref, nextLabel } = options;
  const recommendations: QuizRecommendation[] = [];
  if (result.percent < 75 && lessonHref) {
    recommendations.push({
      label: lessonLabel ?? 'Return to the lesson',
      href: lessonHref,
      description: 'The lesson gives the context this quiz is testing for.',
    });
  }
  if (result.percent >= 55 && nextHref) {
    recommendations.push({
      label: nextLabel ?? 'Keep going',
      href: nextHref,
      description: 'You have enough of the groundwork for the next system.',
    });
  }
  if (recommendations.length === 0 && lessonHref) {
    recommendations.push({
      label: lessonLabel ?? 'Return to the lesson',
      href: lessonHref,
      description: 'A quiet second pass through the steps will make the details stick.',
    });
  }
  return recommendations;
}

/* ------------------------------------------------------------------ */
/* Formatting helpers                                                  */
/* ------------------------------------------------------------------ */

export function formatScore(score: number, total: number): string {
  return `${score} / ${total}`;
}

export function formatPercent(percent: number): string {
  return `${Math.round(percent)}%`;
}

export function difficultyLabel(difficulty: Difficulty): string {
  switch (difficulty) {
    case 'easy':
      return 'Easy';
    case 'medium':
      return 'Medium';
    default:
      return 'Hard';
  }
}

export function optionLetter(index: number): string {
  return OPTION_LETTERS[index] ?? String(index + 1);
}
