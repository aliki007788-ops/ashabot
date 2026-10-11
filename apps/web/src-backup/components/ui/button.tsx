'use client';

import { cn } from '@/lib/utils';
import { forwardRef } from 'react';

type Variant = 'primary' | 'ghost' | 'outline' | 'danger';
type Size = 'sm' | 'md' | 'lg';

interface Props extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
}

const variantClasses: Record<Variant, string> = {
  primary: 'bg-gradient-to-br from-[#6a8dff] to-[#b46eff] text-white hover:brightness-110',
  ghost: 'bg-white/5 text-white hover:bg-white/10 border border-white/10',
  outline: 'border border-white/20 text-white hover:border-[#6a8dff]',
  danger: 'bg-red-500/90 text-white hover:bg-red-500',
};

const sizeClasses: Record<Size, string> = {
  sm: 'px-3 py-1.5 text-xs rounded-lg',
  md: 'px-5 py-2.5 text-sm rounded-xl',
  lg: 'px-6 py-3 text-base rounded-xl',
};

export const Button = forwardRef<HTMLButtonElement, Props>(
  ({ className, variant = 'primary', size = 'md', loading, children, disabled, ...rest }, ref) => (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(
        'inline-flex items-center justify-center gap-2 font-bold transition disabled:opacity-50 disabled:cursor-not-allowed',
        variantClasses[variant],
        sizeClasses[size],
        className
      )}
      {...rest}
    >
      {loading && (
        <span className="animate-spin inline-block w-4 h-4 border-2 border-white/40 border-t-white rounded-full" />
      )}
      {children}
    </button>
  )
);
Button.displayName = 'Button';
