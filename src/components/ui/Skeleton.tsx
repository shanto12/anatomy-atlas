import type { CSSProperties } from 'react';
import clsx from 'clsx';

export interface SkeletonProps {
  className?: string;
  width?: string | number;
  height?: string | number;
  circle?: boolean;
  style?: CSSProperties;
}

/** Loading placeholder used while a heavy module (e.g. the 3D stage) is fetched. */
export default function Skeleton({ className, width, height, circle = false, style }: SkeletonProps) {
  return (
    <span
      className={clsx('skeleton', circle && 'skeleton--circle', className)}
      style={{ width, height, ...style }}
      aria-hidden="true"
    />
  );
}
