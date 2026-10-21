/**
 * Content integrity — lessons and quizzes (docs/CONTENT_SPEC.md).
 */
import { describe, expect, it } from 'vitest';

import { loadParsedSystems } from './helpers/content-files';
import { DIFFICULTIES, SYSTEM_SPECS, wordCount } from './helpers/content-spec';

describe('lessons and quizzes: completeness', () => {
  it('every required system is present before lesson/quiz validation can be complete', () => {
    const missing = SYSTEM_SPECS.filter((spec) => !loadParsedSystems().some((loaded) => loaded.spec.id === spec.id));
    expect(missing.map((s) => s.id)).toEqual([]);
  });
});

describe.each(loadParsedSystems().map((loaded) => [loaded.spec.id, loaded] as const))(
  'lesson + quiz content: %s',
  (_id, loaded) => {
    const system: any = loaded.data;
    const organIds: string[] = Array.isArray(system?.organs) ? system.organs.map((o: any) => o?.id) : [];

    it('lesson object matches the spec', () => {
      const lesson = system?.lesson;
      const errors: string[] = [];
      if (!lesson || typeof lesson !== 'object') {
        expect(lesson, 'lesson object missing').toBeTruthy();
        return;
      }
      if (lesson.id !== `lesson-${system.id}`) errors.push(`lesson.id: ${JSON.stringify(lesson.id)}`);
      if (typeof lesson.title !== 'string' || !lesson.title.trim()) errors.push('lesson.title: missing');
      if (typeof lesson.subtitle !== 'string' || !lesson.subtitle.trim()) errors.push('lesson.subtitle: missing');
      else if (lesson.subtitle.length > 90) errors.push(`lesson.subtitle: ${lesson.subtitle.length} chars (max 90)`);
      if (!Number.isInteger(lesson.durationMin) || lesson.durationMin < 6 || lesson.durationMin > 12) {
        errors.push(`lesson.durationMin: ${lesson.durationMin} (expected 6–12)`);
      }
      if (lesson.level !== 'beginner' && lesson.level !== 'intermediate') {
        errors.push(`lesson.level: ${JSON.stringify(lesson.level)}`);
      }
      expect(errors).toEqual([]);
    });

    it('lesson has exactly 8 steps with valid organ links and prose lengths', () => {
      const steps = Array.isArray(system?.lesson?.steps) ? system.lesson.steps : [];
      const errors: string[] = [];
      if (steps.length !== 8) errors.push(`steps: ${steps.length} (expected exactly 8)`);
      let linkedSteps = 0;
      steps.forEach((step: any, i: number) => {
        const at = `step[${i}]`;
        if (typeof step?.title !== 'string' || !step.title.trim()) errors.push(`${at}.title: missing`);
        else {
          const words = step.title.trim().split(/\s+/).length;
          if (words < 2 || words > 6) errors.push(`${at}.title: ${words} words (expected 2–6)`);
        }
        if (typeof step?.body !== 'string' || !step.body.trim()) errors.push(`${at}.body: missing`);
        else {
          const words = wordCount(step.body);
          if (words < 90 || words > 140) errors.push(`${at}.body: ${words} words (expected 90–140)`);
        }
        if (step?.keyPoint !== undefined) {
          if (typeof step.keyPoint !== 'string' || !step.keyPoint.trim()) errors.push(`${at}.keyPoint: empty`);
          else if (step.keyPoint.length > 110) errors.push(`${at}.keyPoint: ${step.keyPoint.length} chars (max 110)`);
        }
        if (step?.organId !== undefined) {
          linkedSteps += 1;
          if (typeof step.organId !== 'string') errors.push(`${at}.organId: not a string`);
          else if (!organIds.includes(step.organId)) {
            errors.push(`${at}.organId: "${step.organId}" is not an organ in ${system.id}`);
          }
        }
      });
      if (linkedSteps < 5) errors.push(`steps with organId: ${linkedSteps} (required at least 5)`);
      expect(errors).toEqual([]);
    });

    it('quiz has exactly 8 well-formed questions with valid answer keys', () => {
      const quiz = Array.isArray(system?.quiz) ? system.quiz : [];
      const errors: string[] = [];
      if (quiz.length !== 8) errors.push(`quiz: ${quiz.length} questions (expected exactly 8)`);
      const expectedIds = Array.from({ length: 8 }, (_, i) => `${system.id}-q${i + 1}`);
      if (quiz.length === 8 && quiz.map((q: any) => q?.id).join(',') !== expectedIds.join(',')) {
        errors.push(`quiz ids: expected ${expectedIds.join(', ')}`);
      }
      const difficultyCounts: Record<string, number> = { easy: 0, medium: 0, hard: 0 };
      const answerIndexes = new Set<number>();
      const seenQuestions = new Set<string>();
      quiz.forEach((question: any, i: number) => {
        const at = `quiz[${i}] (${question?.id ?? 'no id'})`;
        if (typeof question?.question !== 'string' || !question.question.trim()) errors.push(`${at}.question: missing`);
        else if (seenQuestions.has(question.question.trim())) errors.push(`${at}.question: duplicate text`);
        else seenQuestions.add(question.question.trim());
        if (question?.systemId !== system.id) errors.push(`${at}.systemId: ${JSON.stringify(question?.systemId)}`);
        if (!Array.isArray(question?.options) || question.options.length !== 4) {
          errors.push(`${at}.options: expected exactly 4`);
        } else {
          const options = question.options;
          if (new Set(options).size !== 4) errors.push(`${at}.options: must be distinct`);
          if (options.some((o: unknown) => typeof o !== 'string' || !(o as string).trim())) {
            errors.push(`${at}.options: contains empty/non-string`);
          }
          if (options.some((o: string) => /^(all|none) of the above$/i.test(String(o).trim()))) {
            errors.push(`${at}.options: contains "all/none of the above"`);
          }
        }
        if (!Number.isInteger(question?.answerIndex) || question.answerIndex < 0 || question.answerIndex > 3) {
          errors.push(`${at}.answerIndex: ${JSON.stringify(question?.answerIndex)} (expected integer 0–3)`);
        } else {
          answerIndexes.add(question.answerIndex);
        }
        if (typeof question?.explanation !== 'string' || !question.explanation.trim()) {
          errors.push(`${at}.explanation: missing`);
        } else {
          const words = wordCount(question.explanation);
          if (words < 20 || words > 50) errors.push(`${at}.explanation: ${words} words (expected 20–50)`);
        }
        if (!(DIFFICULTIES as readonly string[]).includes(question?.difficulty)) {
          errors.push(`${at}.difficulty: ${JSON.stringify(question?.difficulty)}`);
        } else {
          difficultyCounts[question.difficulty] += 1;
        }
      });
      if (quiz.length === 8) {
        if (difficultyCounts.easy !== 3 || difficultyCounts.medium !== 3 || difficultyCounts.hard !== 2) {
          errors.push(`difficulty mix: easy=${difficultyCounts.easy} medium=${difficultyCounts.medium} hard=${difficultyCounts.hard} (expected 3/3/2)`);
        }
        if (answerIndexes.size < 3) {
          errors.push(`answerIndex distribution: only ${answerIndexes.size} distinct correct positions (must vary)`);
        }
      }
      expect(errors).toEqual([]);
    });

    it('lesson stubs populate @/data lessons/siteStats consistently', async () => {
      const data = await import('@/data');
      expect(data.lessonsById[`lesson-${system.id}`]).toBeTruthy();
      expect(data.siteStats.lessonCount).toBe(data.systems.length);
      expect(data.siteStats.quizCount).toBe(data.systems.reduce((n, s) => n + s.quiz.length, 0));
      expect(data.siteStats.organCount).toBe(data.organs.length);
    });
  },
);
