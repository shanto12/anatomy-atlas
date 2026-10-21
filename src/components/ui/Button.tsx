import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from 'react';
import { Link, type LinkProps } from 'react-router-dom';
import clsx from 'clsx';

export type ButtonVariant = 'primary' | 'oxblood' | 'ghost' | 'quiet' | 'on-dark';
export type ButtonSize = 'sm' | 'md' | 'lg';

interface SharedProps {
  children: ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  iconLeft?: ReactNode;
  iconRight?: ReactNode;
  block?: boolean;
  className?: string;
}

type AsLink = SharedProps & { to: string } & Omit<LinkProps, 'to' | 'className' | 'children'>;
type AsAnchor = SharedProps & { href: string; to?: undefined } & Omit<
    AnchorHTMLAttributes<HTMLAnchorElement>,
    'href' | 'className' | 'children'
  >;
type AsButton = SharedProps & { to?: undefined; href?: undefined } & Omit<
    ButtonHTMLAttributes<HTMLButtonElement>,
    'type' | 'className' | 'children'
  >;

export type ButtonProps = AsLink | AsAnchor | AsButton;

function classesFor(variant: ButtonVariant, size: ButtonSize, block: boolean, className?: string) {
  return clsx('btn', `btn--${variant}`, `btn--${size}`, block && 'btn--block', className);
}

function ButtonContent({ iconLeft, iconRight, children }: Pick<SharedProps, 'children' | 'iconLeft' | 'iconRight'>) {
  return (
    <>
      {iconLeft ? (
        <span className="btn__icon" aria-hidden="true">
          {iconLeft}
        </span>
      ) : null}
      <span className="btn__label">{children}</span>
      {iconRight ? (
        <span className="btn__icon" aria-hidden="true">
          {iconRight}
        </span>
      ) : null}
    </>
  );
}

/**
 * Shared action primitive. Renders a router Link (`to`), a plain anchor (`href`),
 * or a native button (neither prop). All variants share focus, sizing and tactile states.
 */
export default function Button(props: ButtonProps) {
  const { variant = 'primary', size = 'md', iconLeft, iconRight, block = false, className, children } = props;
  const classes = classesFor(variant, size, block, className);
  const content = <ButtonContent iconLeft={iconLeft} iconRight={iconRight}>{children}</ButtonContent>;

  if ('to' in props && typeof props.to === 'string') {
    const link = props as AsLink;
    const {
      to,
      variant: _variant,
      size: _size,
      iconLeft: _iconLeft,
      iconRight: _iconRight,
      block: _block,
      className: _className,
      children: _children,
      ...linkProps
    } = link;
    return (
      <Link to={to} className={classes} {...linkProps}>
        {content}
      </Link>
    );
  }

  if ('href' in props && typeof props.href === 'string') {
    const anchor = props as AsAnchor;
    const {
      href,
      variant: _variant,
      size: _size,
      iconLeft: _iconLeft,
      iconRight: _iconRight,
      block: _block,
      className: _className,
      children: _children,
      ...anchorProps
    } = anchor;
    return (
      <a href={href} className={classes} {...anchorProps}>
        {content}
      </a>
    );
  }

  const button = props as AsButton;
  const {
    variant: _variant,
    size: _size,
    iconLeft: _iconLeft,
    iconRight: _iconRight,
    block: _block,
    className: _className,
    children: _children,
    ...buttonProps
  } = button;
  return (
    <button type="button" className={classes} {...buttonProps}>
      {content}
    </button>
  );
}
