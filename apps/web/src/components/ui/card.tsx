import { cn } from '@/lib/utils';

export function Card({
  className,
  children,
  ...rest
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'rounded-2xl bg-white/[0.04] border border-white/10 backdrop-blur-md p-6 shadow-xl',
        className
      )}
      {...rest}
    >
      {children}
    </div>
  );
}
