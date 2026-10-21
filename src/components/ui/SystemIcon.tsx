import {
  BicepsFlexed,
  Bone,
  Brain,
  CircleDot,
  Droplets,
  Eye,
  Fingerprint,
  FlaskConical,
  Flower2,
  HeartPulse,
  ShieldPlus,
  Soup,
  Wind,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

import type { SystemId } from '@/lib/types';

/**
 * One distinct lucide glyph per body system. Every icon is a lucide component
 * drawn with `currentColor`, so the parent can tint it via `color` or `--sys`.
 */
export const SYSTEM_ICONS: Record<SystemId, LucideIcon> = {
  skeletal: Bone,
  muscular: BicepsFlexed,
  nervous: Brain,
  cardiovascular: HeartPulse,
  respiratory: Wind,
  digestive: Soup,
  endocrine: FlaskConical,
  immune: ShieldPlus,
  urinary: Droplets,
  reproductive: Flower2,
  integumentary: Fingerprint,
  sensory: Eye,
};

export interface SystemIconProps {
  systemId: SystemId;
  size?: number;
  strokeWidth?: number;
  className?: string;
  /** Optional accessible label. When omitted the icon is decorative. */
  title?: string;
}

export function SystemIcon({ systemId, size = 20, strokeWidth = 1.6, className, title }: SystemIconProps) {
  const Icon = SYSTEM_ICONS[systemId] ?? CircleDot;
  if (title) {
    return (
      <Icon
        size={size}
        strokeWidth={strokeWidth}
        className={className}
        role="img"
        aria-label={title}
        focusable="false"
      />
    );
  }
  return <Icon size={size} strokeWidth={strokeWidth} className={className} aria-hidden="true" focusable="false" />;
}

export default SystemIcon;
