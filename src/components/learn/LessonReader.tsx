import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Check, CheckCircle2, Clock, ListChecks } from 'lucide-react';

import OrganSpecimen from '@/components/learn/OrganSpecimen';
import StepProgress from '@/components/learn/StepProgress';
import { getOrgan, systems } from '@/data';
import type { AnatomySystem, Lesson } from '@/lib/types';
import { useProgress } from '@/lib/progress';

export interface LessonReaderProps {
  lesson: Lesson;
  system?: AnatomySystem;
}

function readSavedStep(lessonId: string, stepCount: number): number {
  try {
    const raw = window.sessionStorage.getItem(`anatomy-atlas:lesson-step:${lessonId}`);
    const parsed = Number(raw);
    if (Number.isInteger(parsed) && parsed >= 0 && parsed < stepCount) return parsed;
  } catch {
    /* session storage may be unavailable — start at the beginning */
  }
  return 0;
}

function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/** Splits a lesson body into paragraphs without interpreting markdown. */
function paragraphsOf(body: string): string[] {
  return body
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
}

/**
 * The guided lesson reader: one idea per screen, a visible thread of progress,
 * the organ in question beside the text, and a deliberate completion step.
 */
export default function LessonReader({ lesson, system }: LessonReaderProps) {
  const { isLessonComplete, markLessonComplete, markOrganExplored } = useProgress();
  const [step, setStep] = useState(() => readSavedStep(lesson.id, lesson.steps.length));
  const headingRef = useRef<HTMLHeadingElement>(null);
  const mainRef = useRef<HTMLDivElement>(null);
  const mountedRef = useRef(false);

  const stepCount = lesson.steps.length;
  const current = lesson.steps[step] ?? lesson.steps[0];
  const organ = current?.organId ? getOrgan(current.organId) : undefined;
  const isLast = step === stepCount - 1;
  const isComplete = isLessonComplete(lesson.id);
  const takeaways = lesson.steps
    .map((item) => item.keyPoint?.trim())
    .filter((point): point is string => Boolean(point));

  const systemIndex = system ? systems.findIndex((item) => item.id === system.id) : -1;
  const nextSystem = systemIndex >= 0 ? systems[systemIndex + 1] : undefined;
  const quizHref = system ? `/quiz/${system.id}` : '/quiz';

  const goTo = useCallback(
    (target: number) => {
      setStep(Math.max(0, Math.min(stepCount - 1, target)));
    },
    [stepCount],
  );

  // Persist the reading position for the rest of the browser session.
  useEffect(() => {
    try {
      window.sessionStorage.setItem(`anatomy-atlas:lesson-step:${lesson.id}`, String(step));
    } catch {
      /* progress within the page still works without session storage */
    }
  }, [lesson.id, step]);

  // Reading an organ's step counts as exploring that organ.
  useEffect(() => {
    if (current?.organId) markOrganExplored(current.organId);
  }, [current?.organId, markOrganExplored]);

  // On step changes (not first paint), bring the new step into view and focus its heading.
  useEffect(() => {
    if (!mountedRef.current) {
      mountedRef.current = true;
      return;
    }
    mainRef.current?.scrollIntoView({ block: 'start', behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
    headingRef.current?.focus({ preventScroll: true });
  }, [step]);

  // ← / → move between steps when the reader is not typing.
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey) return;
      const target = event.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable)
      ) {
        return;
      }
      if (event.key === 'ArrowRight') {
        event.preventDefault();
        setStep((value) => Math.min(stepCount - 1, value + 1));
      } else if (event.key === 'ArrowLeft') {
        event.preventDefault();
        setStep((value) => Math.max(0, value - 1));
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [stepCount]);

  if (!current) {
    return (
      <div className="container container--narrow section">
        <p className="lede">This lesson has no steps yet. The content team is still writing it.</p>
        <Link className="btn btn--ghost" to="/learn" style={{ marginTop: 24 }}>
          Back to lessons
        </Link>
      </div>
    );
  }

  const accentStyle = system ? ({ '--sys': system.color } as CSSProperties) : undefined;

  return (
    <div className={`lesson-reader${system ? ' sys-accent' : ''}`} style={accentStyle}>
      <div className="lesson-reader__top container">
        <Link to="/learn" className="lesson-reader__back">
          <ArrowLeft size={15} aria-hidden="true" />
          Back to lessons
        </Link>

        <header className="lesson-reader__header">
          <div className="lesson-reader__eyebrow-row">
            {system ? (
              <Link to={`/systems/${system.id}`} className="lesson-reader__system">
                <span className="lesson-reader__dot" aria-hidden="true" />
                {system.name}
              </Link>
            ) : null}
            {isComplete ? (
              <span className="lesson-reader__completed">
                <Check size={13} aria-hidden="true" />
                Completed
              </span>
            ) : null}
          </div>
          <h1 className="h1 lesson-reader__title">{lesson.title}</h1>
          <p className="lede lesson-reader__subtitle">{lesson.subtitle}</p>
          <ul className="lesson-reader__meta">
            <li>
              <Clock size={15} aria-hidden="true" />
              {lesson.durationMin} min
            </li>
            <li>
              <ListChecks size={15} aria-hidden="true" />
              {stepCount} steps
            </li>
            <li className="lesson-reader__level">{lesson.level === 'beginner' ? 'Beginner' : 'Intermediate'}</li>
          </ul>
        </header>
      </div>

      <div className="container lesson-reader__body">
        <div className="lesson-reader__main" ref={mainRef}>
          <StepProgress
            total={stepCount}
            current={step}
            titles={lesson.steps.map((item) => item.title)}
            onSelect={goTo}
            className="lesson-reader__progress"
          />

          <article className="lesson-step" aria-labelledby="lesson-step-title" key={step}>
            <p className="lesson-step__kicker">
              Step {step + 1} · {organ ? organ.name : system?.shortName ?? 'Lesson'}
            </p>
            <h2 id="lesson-step-title" ref={headingRef} tabIndex={-1} className="lesson-step__title">
              {current.title}
            </h2>

            <div className="lesson-step__prose">
              {paragraphsOf(current.body).map((paragraph, index) => (
                <p key={index}>{paragraph}</p>
              ))}
            </div>

            {current.keyPoint ? (
              <blockquote className="lesson-keypoint lesson-step__keypoint">
                <p className="caps lesson-keypoint__caps">Key point</p>
                <p>{current.keyPoint}</p>
              </blockquote>
            ) : null}

            {organ ? (
              <div className="lesson-step__organ">
                <p className="caps">Follow this thread</p>
                <p className="lesson-step__organ-tagline">{organ.tagline}</p>
                <Link to={`/organs/${organ.id}`} className="text-link">
                  Explore the {organ.name} in full →
                </Link>
              </div>
            ) : null}
          </article>

          {isLast ? (
            <section
              className={`lesson-finish${isComplete ? ' is-complete' : ''}`}
              aria-labelledby="lesson-finish-title"
            >
              {isComplete ? (
                <CheckCircle2 className="lesson-finish__icon" size={28} aria-hidden="true" />
              ) : (
                <ListChecks className="lesson-finish__icon" size={28} aria-hidden="true" />
              )}
              <h3 id="lesson-finish-title" className="h3 lesson-finish__title">
                {isComplete ? 'Lesson complete.' : 'You have reached the end of the lesson.'}
              </h3>
              <p className="lesson-finish__text">
                {isComplete
                  ? 'This one is marked as read on this device. The quiz is the best way to find out what stuck.'
                  : 'Mark it complete when the ideas feel settled. Completion is saved in this browser — it is not a test.'}
              </p>
              {takeaways.length > 0 ? (
                <div className="lesson-finish__takeaways">
                  <p className="caps">Key takeaways</p>
                  <ul>
                    {takeaways.map((takeaway) => (
                      <li key={takeaway}>{takeaway}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
              <div className="lesson-finish__actions">
                {!isComplete ? (
                  <button type="button" className="btn btn--primary" onClick={() => markLessonComplete(lesson.id)}>
                    Mark lesson complete
                  </button>
                ) : null}
                <Link className="btn btn--ghost" to={quizHref}>
                  Take the quiz
                </Link>
                {nextSystem ? (
                  <Link className="lesson-finish__next" to={`/learn/${nextSystem.lesson.id}`}>
                    Next lesson: {nextSystem.lesson.title}
                    <ArrowRight size={15} aria-hidden="true" />
                  </Link>
                ) : (
                  <Link className="lesson-finish__next" to="/learn">
                    Browse all lessons
                    <ArrowRight size={15} aria-hidden="true" />
                  </Link>
                )}
              </div>
            </section>
          ) : null}

          <nav className="lesson-nav" aria-label="Lesson navigation">
            <button
              type="button"
              className="btn btn--ghost"
              onClick={() => goTo(step - 1)}
              disabled={step === 0}
            >
              <ArrowLeft size={16} aria-hidden="true" />
              Previous step
            </button>
            {!isLast ? (
              <button type="button" className="btn btn--primary" onClick={() => goTo(step + 1)}>
                Next step
                <ArrowRight size={16} aria-hidden="true" />
              </button>
            ) : (
              <p className="lesson-nav__hint">End of lesson · Use ← → to move between steps</p>
            )}
          </nav>
        </div>

        <aside className="lesson-reader__rail">
          <nav className="lesson-outline" aria-label="Lesson contents">
            <p className="caps">Contents</p>
            <ol>
              {lesson.steps.map((item, index) => (
                <li key={`${item.title}-${index}`}>
                  <button
                    type="button"
                    className={`lesson-outline__link${index === step ? ' is-current' : ''}`}
                    onClick={() => goTo(index)}
                    aria-current={index === step ? 'step' : undefined}
                  >
                    <span className="lesson-outline__number" aria-hidden="true">
                      {String(index + 1).padStart(2, '0')}
                    </span>
                    <span>{item.title}</span>
                  </button>
                </li>
              ))}
            </ol>
          </nav>

          {organ ? <OrganSpecimen key={organ.id} organ={organ} /> : null}

          <div className="lesson-rail-card">
            <p className="caps">This lesson</p>
            <dl>
              <div>
                <dt>Level</dt>
                <dd>{lesson.level === 'beginner' ? 'Beginner' : 'Intermediate'}</dd>
              </div>
              <div>
                <dt>Reading time</dt>
                <dd>{lesson.durationMin} min</dd>
              </div>
              <div>
                <dt>Status</dt>
                <dd>{isComplete ? 'Lesson complete' : 'In progress'}</dd>
              </div>
            </dl>
            {!isComplete ? (
              <p className="lesson-rail-card__note">
                Finish the last step to mark this lesson complete. Progress stays on this device.
              </p>
            ) : null}
          </div>
        </aside>
      </div>
    </div>
  );
}
