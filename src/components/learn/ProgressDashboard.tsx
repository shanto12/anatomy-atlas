import { useState } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, GraduationCap, Lock, RotateCcw, ScanEye } from 'lucide-react';

import { lessons, systems } from '@/data';
import { FINAL_EXAM_ID, formatPercent, percentOf } from '@/lib/quiz';
import { useProgress } from '@/lib/progress';

function formatDate(iso: string): string {
  try {
    return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(new Date(iso));
  } catch {
    return '';
  }
}

const quizTitles = new Map<string, string>([
  [FINAL_EXAM_ID, 'Final exam'],
  ...systems.map((system) => [system.id, `${system.name} quiz`] as const),
]);

/**
 * A calm overview of what the reader has actually done. No streaks, no guilt:
 * progress is a memory aid, not a scoreboard. Everything is device-local.
 */
export default function ProgressDashboard() {
  const {
    state,
    completedLessonCount,
    quizAttemptCount,
    exploredCount,
    hasProgress,
    completionPercent,
    resetProgress,
  } = useProgress();
  const [confirmingReset, setConfirmingReset] = useState(false);

  const totalLessons = lessons.length;
  const lessonPercent = completionPercent(totalLessons);
  const availableQuizzes = systems.length + (systems.length > 0 ? 1 : 0);
  const quizPercent = availableQuizzes > 0 ? percentOf(quizAttemptCount, availableQuizzes) : 0;

  const recentQuizzes = Object.entries(state.quizBest)
    .sort((a, b) => Date.parse(b[1].at) - Date.parse(a[1].at))
    .slice(0, 3);

  // Organ views alone should not trigger a "look how far you've come" headline.
  const hasLearningProgress = completedLessonCount > 0 || quizAttemptCount > 0;

  return (
    <section className="progress-dash" aria-labelledby="progress-dashboard-title">
      <header className="progress-dash__header">
        <div>
          <p className="eyebrow">Your progress</p>
          <h2 id="progress-dashboard-title" className="h3 progress-dash__title">
            {hasLearningProgress ? 'The ground you have covered' : 'A record of what you learn'}
          </h2>
        </div>
        <p className="progress-dash__privacy">
          <Lock size={14} aria-hidden="true" />
          Saved in this browser only.
        </p>
      </header>

      <div className="progress-dash__stats">
        <div className="progress-stat">
          <span className="progress-stat__icon" aria-hidden="true">
            <BookOpen size={18} />
          </span>
          <div className="progress-stat__body">
            <p className="progress-stat__value">
              {completedLessonCount}
              <span className="progress-stat__of"> / {totalLessons}</span>
            </p>
            <p className="progress-stat__label">Lessons completed</p>
            <div
              className="progress-bar"
              role="progressbar"
              aria-label="Lessons completed"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={lessonPercent}
            >
              <span style={{ width: `${lessonPercent}%` }} />
            </div>
          </div>
        </div>

        <div className="progress-stat">
          <span className="progress-stat__icon" aria-hidden="true">
            <GraduationCap size={18} />
          </span>
          <div className="progress-stat__body">
            <p className="progress-stat__value">
              {quizAttemptCount}
              <span className="progress-stat__of"> / {availableQuizzes}</span>
            </p>
            <p className="progress-stat__label">Quizzes attempted</p>
            <div
              className="progress-bar"
              role="progressbar"
              aria-label="Quizzes attempted"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={quizPercent}
            >
              <span style={{ width: `${quizPercent}%` }} />
            </div>
          </div>
        </div>

        <div className="progress-stat">
          <span className="progress-stat__icon" aria-hidden="true">
            <ScanEye size={18} />
          </span>
          <div className="progress-stat__body">
            <p className="progress-stat__value">{exploredCount}</p>
            <p className="progress-stat__label">Organs explored</p>
            <p className="progress-stat__note">
              {exploredCount === 0 ? 'Open an organ page to start' : 'Curiosity, logged'}
            </p>
          </div>
        </div>
      </div>

      {recentQuizzes.length > 0 ? (
        <div className="progress-dash__recent">
          <p className="caps">Recent quiz bests</p>
          <ul>
            {recentQuizzes.map(([quizId, best]) => {
              const title = quizTitles.get(quizId) ?? quizId;
              const percent = percentOf(best.score, best.total);
              return (
                <li key={quizId}>
                  <Link to={quizId === FINAL_EXAM_ID ? '/quiz/final' : `/quiz/${quizId}`} className="progress-dash__recent-link">
                    <span>{title}</span>
                    <span className="mono">
                      {formatPercent(percent)} · {formatDate(best.at)}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}

      {!hasProgress ? (
        <p className="progress-dash__empty">
          Nothing here yet. Finish a lesson or try a quiz and your progress will quietly appear — no account needed,
          nothing leaves this device.
        </p>
      ) : null}

      <div className="progress-dash__footer">
        {confirmingReset ? (
          <div className="progress-dash__confirm" role="status">
            <p>Reset all progress on this device? This cannot be undone.</p>
            <div className="progress-dash__confirm-actions">
              <button
                type="button"
                className="btn btn--ghost btn--sm"
                onClick={() => setConfirmingReset(false)}
              >
                Keep my progress
              </button>
              <button
                type="button"
                className="btn btn--ghost btn--sm progress-dash__danger"
                onClick={() => {
                  resetProgress();
                  setConfirmingReset(false);
                }}
              >
                Yes, reset
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            className="progress-dash__reset"
            onClick={() => setConfirmingReset(true)}
            disabled={!hasProgress}
          >
            <RotateCcw size={14} aria-hidden="true" />
            Reset progress
          </button>
        )}
      </div>
    </section>
  );
}
