import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from 'react';

type Variant = 'primary' | 'outline' | 'wine' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

interface StyleProps {
  variant?: Variant;
  size?: Size;
  block?: boolean;
  icon?: ReactNode;
  iconRight?: ReactNode;
}

function classes({ variant = 'outline', size = 'md', block }: StyleProps, extra?: string) {
  return [
    'mq-btn',
    variant !== 'outline' && `mq-btn--${variant}`,
    size !== 'md' && `mq-btn--${size}`,
    block && 'mq-btn--block',
    extra,
  ]
    .filter(Boolean)
    .join(' ');
}

type ButtonProps = StyleProps & ButtonHTMLAttributes<HTMLButtonElement> & { loading?: boolean };

/** Botão padrão. Com `loading`, fica desabilitado (evita cliques duplicados) e mostra um indicador. */
export function Button({ variant, size, block, icon, iconRight, loading, className, children, disabled, type, ...rest }: ButtonProps) {
  return (
    <button
      type={type ?? 'button'}
      className={classes({ variant, size, block }, className)}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      {loading ? <span className="mq-spinner" aria-hidden="true" /> : icon}
      {children}
      {!loading && iconRight}
    </button>
  );
}

type LinkProps = StyleProps & AnchorHTMLAttributes<HTMLAnchorElement>;

export function ButtonLink({ variant, size, block, icon, iconRight, className, children, ...rest }: LinkProps) {
  return (
    <a className={classes({ variant, size, block }, className)} {...rest}>
      {icon}
      {children}
      {iconRight}
    </a>
  );
}
