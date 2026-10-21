/**
 * Quiz engine — src/lib/quiz.ts.
 *
 * Covers deterministic shuffling, system quizzes, the 24-question final exam,
 * grading/answer keys, and feedback bands. Answer-key integrity is checked
 * against the real content in @/data.
 */
import { describe, expect, it } from 'vitest';

import { systems } from '@/data';
import {
  FINAL_EXAM_ID,
  FINAL_EXAM_QUESTION_TOTAL,
  buildFinalExam,
  buildSystemQuiz,
  difficultyLabel,
  finalExamSize,
  formatPercent,
  formatScore,
  gradeBand,
  gradeFeedback,
  hashString,
  isUsableQuestion,
  optionLetter,
  percentOf,
  prepareQuestion,
  quizRecommendations,
  scoreQuiz,
  seededRandom,
  seededShuffle,
  type PreparedQuestion,
} from '@/lib/quiz';
import type { QuizQuestion } from '@/lib/types';

describe('deterministic helpers', () => {
  it('hashString is stable and sensitive to input', () => {
    expect(hashString('heart')).toBe(hashString('heart'));
    expect(hashString('heart')).not.toBe(hashString('liver'));
    expect(hashString('')).toBe(2166136261);
  });

  it('seededRandom produces the same sequence for the same seed', () => {
    const a = seededRandom('seed');
    const b = seededRandom('seed');
    const first = Array.from({ length: 8 }, () => a());
    const second = Array.from({ length: 8 }, () => b());
    expect(first).toEqual(second);
    expect(first.every((value) => value >= 0 && value < 1)).toBe(true);
  });

  it('seededShuffle is deterministic, returns a permutation, and does not mutate', () => {
    const input = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    const shuffled = seededShuffle(input, 'seed');
    expect(shuffled).toEqual(seededShuffle(input, 'seed'));
    expect([...shuffled].sort((a, b) => a - b)).toEqual(input);
    expect(input).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    expect(seededShuffle(input, 'other-seed')).not.toEqual(shuffled);
  });
});

describe('prepareQuestion', () => {
  const question: QuizQuestion = {
    id: 'test-q1',
    systemId: 'cardiovascular',
    question: 'Which chamber pumps blood to the body?',
    options: ['Right atrium', 'Left ventricle', 'Right ventricle', 'Left atrium'],
    answerIndex: 1,
    explanation: 'The left ventricle has the thickest wall because it pushes blood through the aorta to the whole body.',
    difficulty: 'easy',
  };

  it('keeps the correct answer text at the new answerIndex', () => {
    const correctText = question.options[question.answerIndex];
    for (const seed of ['a', 'b', 'c']) {
      const prepared = prepareQuestion(question, seed);
      expect(prepared.options[prepared.answerIndex]).toBe(correctText);
      expect(prepared.options).toHaveLength(4);
      expect([...prepared.options].sort()).toEqual([...question.options].sort());
      expect(prepared.optionOrder).toHaveLength(4);
      expect([...prepared.optionOrder].sort()).toEqual([0, 1, 2, 3]);
    }
  });

  it('is stable for the same seed and content', () => {
    expect(prepareQuestion(question)).toEqual(prepareQuestion(question));
  });
});

describe('isUsableQuestion', () => {
  const valid: QuizQuestion = {
    id: 'q',
    systemId: 'skeletal',
    question: 'Q?',
    options: ['a', 'b', 'c', 'd'],
    answerIndex: 2,
    explanation: 'Because.',
    difficulty: 'medium',
  };
  it('accepts valid questions', () => {
    expect(isUsableQuestion(valid)).toBe(true);
  });
  it('rejects malformed questions', () => {
    const cases: unknown[] = [
      null,
      undefined,
      {},
      { ...valid, id: '' },
      { ...valid, question: '  ' },
      { ...valid, options: [] },
      { ...valid, options: ['a', 'b'] },
      { ...valid, options: ['a', '', 'c', 'd'] },
      { ...valid, answerIndex: 4 },
      { ...valid, answerIndex: -1 },
      { ...valid, answerIndex: 1.5 },
      { ...valid, explanation: '' },
    ];
    for (const candidate of cases) expect(isUsableQuestion(candidate as QuizQuestion)).toBe(false);
  });
});

describe('system quizzes use real content', () => {
  it('every system builds an 8-question quiz with correct answer keys', () => {
    const problems: string[] = [];
    for (const system of systems) {
      const quiz = buildSystemQuiz(system);
      if (quiz.id !== system.id) problems.push(`${system.id}: quiz id ${quiz.id}`);
      if (quiz.questions.length !== 8) problems.push(`${system.id}: ${quiz.questions.length} questions`);
      const byId = new Map(system.quiz.map((question) => [question.id, question]));
      for (const prepared of quiz.questions) {
        const original = byId.get(prepared.id);
        if (!original) {
          problems.push(`${system.id}: unknown prepared question ${prepared.id}`);
          continue;
        }
        if (prepared.options[prepared.answerIndex] !== original.options[original.answerIndex]) {
          problems.push(`${system.id}/${prepared.id}: answer key mismatch after shuffle`);
        }
        if (prepared.options.length !== 4) problems.push(`${system.id}/${prepared.id}: options ${prepared.options.length}`);
        if (!prepared.explanation.trim()) problems.push(`${system.id}/${prepared.id}: missing explanation`);
      }
      if (quiz.systemIds.length !== 1 || quiz.systemIds[0] !== system.id) {
        problems.push(`${system.id}: systemIds ${JSON.stringify(quiz.systemIds)}`);
      }
    }
    expect(problems).toEqual([]);
  });

  it('is deterministic across rebuilds', () => {
    for (const system of systems.slice(0, 3)) {
      expect(buildSystemQuiz(system)).toEqual(buildSystemQuiz(system));
    }
  });
});

describe('final exam', () => {
  it('builds a deterministic 24-question paper with two questions per system', () => {
    const exam = buildFinalExam(systems);
    expect(exam.id).toBe(FINAL_EXAM_ID);
    expect(exam.questions).toHaveLength(FINAL_EXAM_QUESTION_TOTAL);
    expect(finalExamSize(systems)).toBe(FINAL_EXAM_QUESTION_TOTAL);
    expect(exam.systemIds).toHaveLength(12);
    const examIds = exam.questions.map((question) => question.id);
    expect(new Set(examIds).size).toBe(examIds.length);
    const perSystem = new Map<string, number>();
    for (const question of exam.questions) {
      perSystem.set(question.systemId, (perSystem.get(question.systemId) ?? 0) + 1);
    }
    expect(Object.fromEntries(perSystem)).toEqual(
      Object.fromEntries(systems.map((system) => [system.id, 2])),
    );
    expect(buildFinalExam(systems)).toEqual(exam);
  });

  it('degrades gracefully with partial content', () => {
    const partial = buildFinalExam(systems.slice(0, 3));
    expect(partial.questions).toHaveLength(6);
    expect(finalExamSize(systems.slice(0, 3))).toBe(6);
  });

  it('keeps answer keys aligned after shuffling', () => {
    const exam = buildFinalExam(systems);
    const original = new Map<string, { options: string[]; answerIndex: number }>(
      systems.flatMap((system) =>
        system.quiz.map((question) => [question.id, { options: question.options, answerIndex: question.answerIndex }]),
      ),
    );
    const problems: string[] = [];
    for (const prepared of exam.questions) {
      const source = original.get(prepared.id);
      if (!source) {
        problems.push(`unknown question ${prepared.id}`);
        continue;
      }
      if (prepared.options[prepared.answerIndex] !== source.options[source.answerIndex]) {
        problems.push(`${prepared.id}: answer key mismatch`);
      }
    }
    expect(problems).toEqual([]);
  });
});

const questions: PreparedQuestion[] = buildSystemQuiz(systems[0]).questions;

describe('grading', () => {

  it('scores all-correct, all-wrong, and partially-answered attempts', () => {
    const correct = scoreQuiz(questions, questions.map((q) => q.answerIndex), 'test');
    expect(correct).toMatchObject({ score: 8, total: 8, percent: 100, quizId: 'test' });
    expect(correct.missed).toEqual([]);

    const wrong = scoreQuiz(questions, questions.map((q) => (q.answerIndex + 1) % 4), 'test');
    expect(wrong).toMatchObject({ score: 0, total: 8, percent: 0 });
    expect(wrong.missed).toHaveLength(8);

    const blank = scoreQuiz(questions, [], 'test');
    expect(blank.score).toBe(0);
    expect(blank.answers.every((record) => record.selectedIndex === null)).toBe(true);

    const partialAnswers = questions.map((q, index) => (index % 2 === 0 ? q.answerIndex : null));
    const half = scoreQuiz(questions, partialAnswers, 'test');
    expect(half.score).toBe(4);
    expect(half.percent).toBe(50);
    expect(half.answers.filter((record) => record.correct)).toHaveLength(4);
  });

  it('treats out-of-range and non-integer answers as unanswered', () => {
    const answers = questions.map(() => 99 as number | null);
    const result = scoreQuiz(questions, answers);
    expect(result.score).toBe(0);
    expect(result.answers.every((record) => record.selectedIndex === null)).toBe(true);
  });

  it('handles an empty quiz', () => {
    expect(scoreQuiz([], [])).toMatchObject({ score: 0, total: 0, percent: 0 });
  });

  it('percentOf clamps and guards degenerate inputs', () => {
    expect(percentOf(0, 0)).toBe(0);
    expect(percentOf(4, 8)).toBe(50);
    expect(percentOf(8, 8)).toBe(100);
    expect(percentOf(9, 8)).toBe(100);
    expect(percentOf(-1, 8)).toBe(0);
    expect(percentOf(Number.NaN, 8)).toBe(0);
    expect(percentOf(1, Number.POSITIVE_INFINITY)).toBe(0);
  });
});

describe('feedback and formatting', () => {
  it('gradeBand uses the documented thresholds', () => {
    expect(gradeBand(100)).toBe('excellent');
    expect(gradeBand(90)).toBe('excellent');
    expect(gradeBand(89)).toBe('strong');
    expect(gradeBand(75)).toBe('strong');
    expect(gradeBand(74)).toBe('steady');
    expect(gradeBand(55)).toBe('steady');
    expect(gradeBand(54)).toBe('beginning');
    expect(gradeBand(0)).toBe('beginning');
  });

  it('gradeFeedback returns warm, non-shaming feedback for every band', () => {
    const bands = new Set<string>();
    for (const percent of [100, 80, 60, 10]) {
      const feedback = gradeFeedback(percent);
      bands.add(feedback.band);
      expect(feedback.headline.length).toBeGreaterThan(0);
      expect(feedback.message.length).toBeGreaterThan(0);
      expect(feedback.message.toLowerCase()).not.toContain('you failed');
      expect(feedback.headline.toLowerCase()).not.toContain('fail');
    }
    expect(bands.size).toBe(4);
  });

  it('quizRecommendations reacts to score and provided links', () => {
    const low = scoreQuiz(questions, [], 'q');
    const recs = quizRecommendations(low, { lessonHref: '/learn/lesson-x' });
    expect(recs[0]?.href).toBe('/learn/lesson-x');

    const high = scoreQuiz(questions, questions.map((q) => q.answerIndex), 'q');
    const nextRecs = quizRecommendations(high, { nextHref: '/quiz', nextLabel: 'Next' });
    expect(nextRecs.map((r) => r.href)).toContain('/quiz');
    expect(quizRecommendations(high, {})).toEqual([]);
  });

  it('formats scores, percentages, difficulty and option letters', () => {
    expect(formatScore(5, 8)).toBe('5 / 8');
    expect(formatPercent(62.5)).toBe('63%');
    expect(difficultyLabel('easy')).toBe('Easy');
    expect(difficultyLabel('medium')).toBe('Medium');
    expect(difficultyLabel('hard')).toBe('Hard');
    expect(optionLetter(0)).toBe('A');
    expect(optionLetter(3)).toBe('D');
    expect(optionLetter(9)).toBe('10');
  });
});
