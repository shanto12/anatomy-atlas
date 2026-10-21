import { Check } from 'lucide-react';

export interface StepProgressProps {
  total: number;
  /** Zero-based index of the step being read. */
  current: number;
  titles?: string[];
  onSelect?: (index: number) => void;
  className?: string;
}

/**
 * The quiet spine of a lesson: a bar for a glance, numbered stops for navigation.
 * Every stop is a real button with a spoken label, so the lesson can be walked
 * with a keyboard or a screen reader without touching the mouse.
 */
export default function StepProgress({ total, current, titles, onSelect, className }: StepProgressProps) {
  if (total <= 0) return null;
  const safeCurrent = Math.max(0, Math.min(total - 1, current));
  const percent = Math.round(((safeCurrent + 1) / total) * 100);
  const steps = Array.from({ length: total }, (_, index) => index);

  return (
    <div className={`step-progress ${className ?? ''}`}>
      <div className="step-progress__meta">
        <span className="caps">
          Step {safeCurrent + 1} of {total}
        </span>
        <span className="step-progress__hint">{percent}% through the lesson</span>
      </div>
      <div className="step-progress__track" aria-hidden="true">
        <span className="step-progress__fill" style={{ width: `${percent}%` }} />
      </div>
      <nav aria-label="Lesson steps">
        <ol className="step-progress__stops">
          {steps.map((index) => {
            const isCurrent = index === safeCurrent;
            const isPast = index < safeCurrent;
            const title = titles?.[index];
            const label = `Step ${index + 1} of ${total}${title ? `: ${title}` : ''}`;
            return (
              <li key={index}>
                <button
                  type="button"
                  className={`step-progress__stop${isCurrent ? ' is-current' : ''}${isPast ? ' is-past' : ''}`}
                  aria-label={label}
                  aria-current={isCurrent ? 'step' : undefined}
                  onClick={() => onSelect?.(index)}
                  disabled={!onSelect}
                >
                  {isPast ? (
                    <Check size={15} aria-hidden="true" />
                  ) : (
                    <span aria-hidden="true">{index + 1}</span>
                  )}
                </button>
              </li>
            );
          })}
        </ol>
      </nav>
    </div>
  );
}
