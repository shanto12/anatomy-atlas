import type { CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';
import clsx from 'clsx';

import type { AnatomySystem } from '@/lib/types';
import SystemIcon from './SystemIcon';

export interface SystemCardProps {
  system: AnatomySystem;
  /** Position in the canonical teaching order (1-based). */
  index?: number;
  className?: string;
}

/** A single system in the index — numbered, icon-marked, washed with its accent colour. */
export default function SystemCard({ system, index, className }: SystemCardProps) {
  const style = { '--sys': system.color } as CSSProperties;
  const label = index ? String(index).padStart(2, '0') : system.shortName;

  return (
    <Link to={`/systems/${system.id}`} className={clsx('system-card', className)} style={style}>
      <span className="system-card__top">
        <span className="system-card__index" aria-hidden="true">
          {label}
        </span>
        <span className="system-card__icon">
          <SystemIcon systemId={system.id} size={27} />
        </span>
      </span>
      <h3 className="system-card__title">{system.name}</h3>
      <p className="system-card__tagline">{system.tagline}</p>
      <span className="system-card__foot">
        <span className="system-card__count">{system.organs.length} structures</span>
        <span className="system-card__cta">
          Explore <ArrowUpRight size={15} aria-hidden="true" />
        </span>
      </span>
    </Link>
  );
}
