import type { ReactNode } from 'react';
import clsx from 'clsx';

import Breadcrumbs, { type Crumb } from './Breadcrumbs';

export interface PageHeaderProps {
  eyebrow?: string;
  title: ReactNode;
  lede?: ReactNode;
  breadcrumbs?: Crumb[];
  actions?: ReactNode;
  meta?: ReactNode;
  align?: 'start' | 'center';
  id?: string;
  className?: string;
}

/** Standard editorial masthead for the top of a page: breadcrumbs, h1, lede, actions. */
export default function PageHeader({
  eyebrow,
  title,
  lede,
  breadcrumbs,
  actions,
  meta,
  align = 'start',
  id,
  className,
}: PageHeaderProps) {
  return (
    <header className={clsx('page-header', align === 'center' && 'page-header--center', className)}>
      {breadcrumbs?.length ? <Breadcrumbs items={breadcrumbs} className="page-header__crumbs" /> : null}
      {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
      <h1 id={id} className="page-header__title">
        {title}
      </h1>
      {lede ? <p className="page-header__lede lede">{lede}</p> : null}
      {meta ? <div className="page-header__meta">{meta}</div> : null}
      {actions ? <div className="page-header__actions cluster">{actions}</div> : null}
    </header>
  );
}
