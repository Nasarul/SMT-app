mport { type HTMLAttributes } from 'react';

interface SkeletonProps extends HTMLAttributes<HTMLDivElement> {
  className?: string;
  variant?: 'text' | 'rectangular' | 'circular' | 'card' | 'table-row';
  count?: number;
}

export function Skeleton({ className = '', variant = 'rectangular', count = 1, ...props }: SkeletonProps) {
  const baseClasses = 'animate-pulse bg-slate-200/80 rounded-xl relative overflow-hidden before:absolute before:inset-0 before:-translate-x-full before:animate-[shimmer_2s_infinite] before:bg-gradient-to-r before:from-transparent before:via-white/40 before:to-transparent';

  const getVariantClass = () => {
    switch (variant) {
      case 'text':
        return 'h-4 w-full rounded-md';
      case 'circular':
        return 'rounded-full';
      case 'card':
        return 'h-44 w-full rounded-2xl';
      case 'table-row':
        return 'h-14 w-full rounded-xl';
      case 'rectangular':
      default:
        return 'w-full h-full';
    }
  };

  if (count > 1) {
    return (
      <div className="space-y-3 w-full">
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className={`${baseClasses} ${getVariantClass()} ${className}`} {...props} />
        ))}
      </div>
    );
  }

  return <div className={`${baseClasses} ${getVariantClass()} ${className}`} {...props} />;
}

export function TableSkeleton({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div className="w-full bg-white rounded-2xl p-4 border border-slate-100 shadow-sm space-y-3">
      <div className="flex gap-4 border-b border-slate-100 pb-3">
        {Array.from({ length: cols }).map((_, i) => (
          <Skeleton key={i} className="h-5 flex-1" />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex gap-4 py-2">
          {Array.from({ length: cols }).map((_, c) => (
            <Skeleton key={c} className="h-8 flex-1" />
          ))}
        </div>
      ))}
    </div>
  );
}

export function StatCardSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-3">
          <div className="flex justify-between items-center">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-10 w-10 rounded-xl" />
          </div>
          <Skeleton className="h-7 w-32" />
          <Skeleton className="h-3 w-20" />
        </div>
      ))}
    </div>
  );
}
