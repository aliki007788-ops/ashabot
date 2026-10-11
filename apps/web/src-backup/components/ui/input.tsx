'use client';

import { cn } from '@/lib/utils';
import { forwardRef } from 'react';

interface Props extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, Props>(
  ({ className, label, error, id, ...rest }, ref) => (
    <div className="w-full">
      {label && (
        <label htmlFor={id} className="block mb-2 text-sm font-semibold text-white/90">
          {label}
        </label>
      )}
      <input
        ref={ref}
        id={id}
        className={cn(
          'w-full px-4 py-3 rounded-xl bg-white/5 border border-white/15 text-white placeholder:text-white/30',
          'focus:outline-none focus:border-[#6a8dff] focus:ring-2 focus:ring-[#6a8dff]/30 transition',
          error && 'border-red-500/60',
          className
        )}
        {...rest}
      />
      {error && <p className="mt-1.5 text-xs text-red-400">{error}</p>}
    </div>
  )
);
Input.displayName = 'Input';
