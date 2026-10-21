import { useEffect, useRef } from 'react';
import { Check, X } from 'lucide-react';

import { difficultyLabel, optionLetter, type PreparedQuestion } from '@/lib/quiz';

export interface QuestionCardProps {
  question: PreparedQuestion;
  index: number;
  total: number;
  systemName?: string;
  selectedIndex: number | null;
  revealed: boolean;
  isLast: boolean;
  onSelect: (index: number) => void;
  onSubmit: () => void;
  onNext: () => void;
}

/**
 * One question, one screen. Options are native radios so ↑/↓ and Tab behaviour
 * is the browser's own; after Submit, every answer is explained — right or wrong.
 */
export default function QuestionCard({
  question,
  index,
  total,
  systemName,
  selectedIndex,
  revealed,
  isLast,
  onSelect,
  onSubmit,
  onNext,
}: QuestionCardProps) {
  const headingRef = useRef<HTMLHeadingElement>(null);
  const nextRef = useRef<HTMLButtonElement>(null);
  const headingId = `question-${question.id}-label`;

  // Move focus to the new question so keyboard and screen-reader readers land here.
  useEffect(() => {
    headingRef.current?.focus({ preventScroll: true });
  }, [question.id]);

  // After the answer is revealed, move focus to the one useful next action.
  useEffect(() => {
    if (revealed) nextRef.current?.focus({ preventScroll: true });
  }, [revealed]);

  const correct = selectedIndex !== null && selectedIndex === question.answerIndex;

  return (
    <section className="question-card" aria-labelledby={headingId}>
      <header className="question-card__header">
        <span className="question-card__chips">
          {systemName ? <span className="quiz-chip">{systemName}</span> : null}
          <span className={`quiz-chip quiz-chip--${question.difficulty}`}>
            {difficultyLabel(question.difficulty)}
          </span>
        </span>
      </header>

      <h2 ref={headingRef} tabIndex={-1} id={headingId} className="question-card__question">
        {question.question}
      </h2>

      <fieldset className="quiz-options" disabled={revealed}>
        <legend className="visually-hidden">Choose one answer</legend>
        {question.options.map((option, optionIndex) => {
          const isCorrect = optionIndex === question.answerIndex;
          const isChosen = optionIndex === selectedIndex;
          let stateClass = '';
          if (revealed) {
            stateClass = isCorrect ? ' is-correct' : isChosen ? ' is-incorrect' : ' is-muted';
          } else if (isChosen) {
            stateClass = ' is-selected';
          }
          return (
            <label key={`${question.id}-option-${optionIndex}`} className={`quiz-option${stateClass}`}>
              <input
                type="radio"
                className="quiz-option__input"
                name={`answers-${question.id}`}
                value={optionIndex}
                checked={isChosen}
                onChange={() => onSelect(optionIndex)}
                disabled={revealed}
              />
              <span className="quiz-option__letter" aria-hidden="true">
                {optionLetter(optionIndex)}
              </span>
              <span className="quiz-option__text">{option}</span>
              {revealed && isCorrect ? (
                <span className="quiz-option__verdict quiz-option__verdict--correct" aria-hidden="true">
                  <Check size={18} />
                </span>
              ) : null}
              {revealed && isChosen && !isCorrect ? (
                <span className="quiz-option__verdict quiz-option__verdict--incorrect" aria-hidden="true">
                  <X size={18} />
                </span>
              ) : null}
              {revealed ? (
                <span className="visually-hidden">
                  {isCorrect ? ' Correct answer.' : ''}
                  {isChosen && !isCorrect ? ' Your answer — not correct.' : ''}
                </span>
              ) : null}
            </label>
          );
        })}
      </fieldset>

      {revealed ? (
        <div className={`quiz-feedback${correct ? ' is-correct' : ' is-incorrect'}`} role="status">
          <p className="quiz-feedback__headline">
            {correct ? (
              <>
                <Check size={18} aria-hidden="true" /> Correct.
              </>
            ) : (
              <>
                <X size={18} aria-hidden="true" /> Not quite.
              </>
            )}
          </p>
          {!correct ? (
            <p className="quiz-feedback__answer">
              The answer is {optionLetter(question.answerIndex)}.{' '}
              <span className="quiz-feedback__answer-text">{question.options[question.answerIndex]}</span>
            </p>
          ) : null}
          <p className="quiz-feedback__explanation">{question.explanation}</p>
        </div>
      ) : null}

      <footer className="question-card__actions">
        {revealed ? (
          <button ref={nextRef} type="button" className="btn btn--primary" onClick={onNext}>
            {isLast ? 'See results' : 'Next question'}
          </button>
        ) : (
          <button type="button" className="btn btn--primary" onClick={onSubmit} disabled={selectedIndex === null}>
            Submit answer
          </button>
        )}
        <p className="question-card__hint">
          {revealed
            ? 'Read the explanation, then continue when you are ready.'
            : 'Choose an answer, then submit. Every answer comes with an explanation.'}
        </p>
      </footer>
    </section>
  );
}
