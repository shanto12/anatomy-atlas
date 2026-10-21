import type { ReactNode } from 'react';
import clsx from 'clsx';

export interface EmptyStateProps {
  eyebrow?: string;
  title: ReactNode;
  description?: ReactNode;
  icon?: ReactNode;
  action?: ReactNode;
  className?: string;
  /** Compact version for sidebars and small panels. */
  size?: 'md' | 'sm';
}

/** Graceful placeholder for missing content, invalid ids, or empty collections. */
export default function EmptyState({
  eyebrow,
  title,
  description,
  icon,
  action,
  className,
  size = 'md',
}: EmptyStateProps) {
  return (
    <div className={clsx('empty', `empty--${size}`, className)}>
      {icon ? (
        <span className="empty__icon" aria-hidden="true">
          {icon}
        </span>
      ) : null}
      {eyebrow ? <p className="eyebrow eyebrow--plain empty__eyebrow">{eyebrow}</p> : null}
      <h3 className="empty__title">{title}</h3>
      {description ? <p className="empty__description">{description}</p> : null}
      {action ? <div className="empty__action">{action}</div> : null}
    </div>
  );
}
