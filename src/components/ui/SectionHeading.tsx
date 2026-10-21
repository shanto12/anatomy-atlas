import type { ReactNode } from 'react';
import { ArrowUpRight } from 'lucide-react';
import clsx from 'clsx';

import Button from './Button';

export interface SectionAction {
  to: string;
  label: string;
}

export interface SectionHeadingProps {
  eyebrow?: string;
  title: ReactNode;
  lede?: ReactNode;
  action?: SectionAction | ReactNode;
  align?: 'start' | 'center';
  level?: 2 | 3;
  id?: string;
  className?: string;
  /** Rule that runs across the section head, museum-index style. */
  rule?: boolean;
}

/** Editorial section head: eyebrow, display title, optional lede and rail action. */
export default function SectionHeading({
  eyebrow,
  title,
  lede,
  action,
  align = 'start',
  level = 2,
  id,
  className,
  rule = false,
}: SectionHeadingProps) {
  const HeadingTag = level === 2 ? 'h2' : 'h3';
  const actionNode =
    action && typeof action === 'object' && action !== null && 'to' in action && 'label' in action ? (
      <Button to={(action as SectionAction).to} variant="quiet" size="sm" iconRight={<ArrowUpRight size={15} />}>
        {(action as SectionAction).label}
      </Button>
    ) : (
      action
    );

  return (
    <header className={clsx('section-head', align === 'center' && 'section-head--center', rule && 'section-head--rule', className)}>
      <div className="section-head__main">
        {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
        <HeadingTag id={id} className="section-head__title">
          {title}
        </HeadingTag>
        {lede ? <p className="section-head__lede">{lede}</p> : null}
      </div>
      {actionNode ? <div className="section-head__action">{actionNode}</div> : null}
    </header>
  );
}
