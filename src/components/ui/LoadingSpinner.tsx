interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeClasses = { sm: 'w-4 h-4', md: 'w-6 h-6', lg: 'w-10 h-10' };

export function LoadingSpinner({ size = 'md', className = '' }: LoadingSpinnerProps) {
  return (
    <div className={`${sizeClasses[size]} border-2 border-primary-200 border-t-primary-500 rounded-full animate-spin ${className}`} />
  );
}

export function PageLoader() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[300px] gap-3">
      <LoadingSpinner size="lg" />
      <p className="text-sm text-neutral-400">Loading...</p>
    </div>
  );
}
