import type { ReactNode } from 'react';
import clsx from 'clsx';

export type StatSize = 'sm' | 'md' | 'lg' | 'xl';

export interface StatProps {
  value: ReactNode;
  label: ReactNode;
  note?: ReactNode;
  size?: StatSize;
  align?: 'start' | 'center';
  className?: string;
}

/** A single museum-label statistic: large display figure over a quiet caption. */
export function Stat({ value, label, note, size = 'md', align = 'start', className }: StatProps) {
  return (
    <div className={clsx('stat', `stat--${size}`, align === 'center' && 'stat--center', className)}>
      <span className="stat__value num">{value}</span>
      <span className="stat__label">{label}</span>
      {note ? <span className="stat__note">{note}</span> : null}
    </div>
  );
}

export interface StatGroupProps {
  children: ReactNode;
  className?: string;
  /** Hairline dividers between stats (desktop only). */
  divided?: boolean;
  columns?: 2 | 3 | 4;
}

export function StatGroup({ children, className, divided = true, columns }: StatGroupProps) {
  return (
    <div
      className={clsx('stat-group', divided && 'stat-group--divided', columns && `stat-group--${columns}`, className)}
    >
      {children}
    </div>
  );
}

export default Stat;
