import { ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import clsx from 'clsx';

export interface Crumb {
  label: string;
  to?: string;
}

export interface BreadcrumbsProps {
  items: Crumb[];
  className?: string;
}

/** Hairline trail used at the top of every deep page. */
export default function Breadcrumbs({ items, className }: BreadcrumbsProps) {
  if (!items.length) return null;
  return (
    <nav className={clsx('breadcrumbs', className)} aria-label="Breadcrumb">
      <ol className="breadcrumbs__list">
        {items.map((crumb, index) => {
          const isLast = index === items.length - 1;
          return (
            <li key={`${crumb.label}-${index}`} className="breadcrumbs__item">
              {crumb.to && !isLast ? (
                <Link className="breadcrumbs__link" to={crumb.to}>
                  {crumb.label}
                </Link>
              ) : (
                <span className="breadcrumbs__current" aria-current={isLast ? 'page' : undefined}>
                  {crumb.label}
                </span>
              )}
              {!isLast ? <ChevronRight className="breadcrumbs__sep" size={13} aria-hidden="true" /> : null}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
