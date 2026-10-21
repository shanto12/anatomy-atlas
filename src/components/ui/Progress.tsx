import type { ReactNode } from 'react';
import clsx from 'clsx';

function clampPercent(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, value));
}

export interface ProgressRingProps {
  value: number;
  size?: number;
  stroke?: number;
  /** Content shown inside the ring — usually the percentage or a fraction. */
  children?: ReactNode;
  label?: ReactNode;
  ariaLabel?: string;
  tone?: 'oxblood' | 'gold' | 'sys';
  className?: string;
}

/** Compact radial progress indicator used in the learner dashboards. */
export function ProgressRing({
  value,
  size = 76,
  stroke = 5,
  children,
  label,
  ariaLabel,
  tone = 'oxblood',
  className,
}: ProgressRingProps) {
  const percent = clampPercent(value);
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percent / 100) * circumference;

  return (
    <div className={clsx('ring', `ring--${tone}`, className)}>
      <div className="ring__dial" style={{ width: size, height: size }}>
        <svg
          className="ring__svg"
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          role="img"
          aria-label={ariaLabel ?? `${Math.round(percent)} percent complete`}
        >
          <circle className="ring__track" cx={size / 2} cy={size / 2} r={radius} strokeWidth={stroke} fill="none" />
          <circle
            className="ring__fill"
            cx={size / 2}
            cy={size / 2}
            r={radius}
            strokeWidth={stroke}
            fill="none"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
          />
        </svg>
        <span className="ring__center" aria-hidden="true">
          {children ?? Math.round(percent)}
        </span>
      </div>
      {label ? <span className="ring__label">{label}</span> : null}
    </div>
  );
}

export interface ProgressBarProps {
  value: number;
  label?: ReactNode;
  showValue?: boolean;
  tone?: 'oxblood' | 'gold' | 'sys';
  className?: string;
}

/** Linear progress bar with an accessible progressbar role. */
export function ProgressBar({ value, label, showValue = false, tone = 'oxblood', className }: ProgressBarProps) {
  const percent = clampPercent(value);
  return (
    <div className={clsx('meter', `meter--${tone}`, className)}>
      {label || showValue ? (
        <div className="meter__head">
          {label ? <span className="meter__label">{label}</span> : null}
          {showValue ? <span className="meter__value num">{Math.round(percent)}%</span> : null}
        </div>
      ) : null}
      <div
        className="meter__track"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(percent)}
        aria-label={typeof label === 'string' ? label : 'Progress'}
      >
        <span className="meter__fill" style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}
