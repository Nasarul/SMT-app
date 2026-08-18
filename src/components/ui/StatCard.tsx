import React from 'react';
import { Video as LucideIcon, TrendingUp, TrendingDown } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  iconColor?: string;
  iconBg?: string;
  trend?: { value: number; label: string };
  className?: string;
}

export function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  iconColor = 'text-primary-500',
  iconBg = 'bg-primary-50',
  trend,
  className = '',
}: StatCardProps) {
  return (
    <div className={`stat-card p-4 bg-white border border-neutral-100/50 shadow-sm rounded-xl hover:shadow-md transition-shadow ${className}`}>
      <div className="flex items-center gap-3">
        <div className={`p-2.5 rounded-xl ${iconBg} shrink-0`}>
          <Icon size={20} className={iconColor} />
        </div>
        <div className="min-w-0">
          <div className="text-xs font-bold text-neutral-500 uppercase tracking-wider truncate mb-1">{title}</div>
          <div className="text-xl font-black text-neutral-800 leading-none">{value}</div>
          {subtitle && <div className="text-xs text-neutral-400 truncate mt-1">{subtitle}</div>}
        </div>
      </div>
    </div>
  );
}
