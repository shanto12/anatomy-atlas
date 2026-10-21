import type { CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';
import clsx from 'clsx';

import { systemsById } from '@/data';
import type { Organ } from '@/lib/types';
import SystemIcon from './SystemIcon';

export interface OrganCardProps {
  organ: Organ;
  /** Position within the system (1-based). */
  index?: number;
  showSystem?: boolean;
  className?: string;
}

/** A structure entry tile used in system pages and related-organ rails. */
export default function OrganCard({ organ, index, showSystem = false, className }: OrganCardProps) {
  const system = systemsById[organ.systemId];
  const style = { '--sys': system?.color ?? 'var(--gold)' } as CSSProperties;
  const label = index ? String(index).padStart(2, '0') : undefined;

  return (
    <Link to={`/organs/${organ.id}`} className={clsx('organ-card', className)} style={style}>
      <span className="organ-card__head">
        {label ? (
          <span className="organ-card__index" aria-hidden="true">
            {label}
          </span>
        ) : null}
        {showSystem && system ? (
          <span className="organ-card__system">
            <SystemIcon systemId={system.id} size={13} />
            {system.shortName}
          </span>
        ) : (
          <span className="organ-card__latin">{organ.latin ?? '\u00a0'}</span>
        )}
      </span>
      <h3 className="organ-card__title">{organ.name}</h3>
      <p className="organ-card__tagline">{organ.tagline}</p>
      {organ.heroStat ? (
        <span className="organ-card__stat">
          <strong className="num">{organ.heroStat.value}</strong> {organ.heroStat.label}
        </span>
      ) : null}
      <span className="organ-card__arrow" aria-hidden="true">
        <ArrowUpRight size={16} />
      </span>
    </Link>
  );
}
