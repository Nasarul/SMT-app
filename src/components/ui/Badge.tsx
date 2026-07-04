import React from 'react';

type BadgeVariant = 'primary' | 'success' | 'warning' | 'error' | 'neutral' | 'gold';

interface BadgeProps {
  variant?: BadgeVariant;
  children: React.ReactNode;
  className?: string;
}

const variantClasses: Record<BadgeVariant, string> = {
  primary: 'bg-primary-100 text-primary-700',
  success: 'bg-success-100 text-success-700',
  warning: 'bg-warning-100 text-warning-800',
  error: 'bg-error-100 text-error-700',
  neutral: 'bg-neutral-100 text-neutral-600',
  gold: 'bg-gold-100 text-gold-800',
};

export function Badge({ variant = 'neutral', children, className = '' }: BadgeProps) {
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${variantClasses[variant]} ${className}`}>
      {children}
    </span>
  );
}
