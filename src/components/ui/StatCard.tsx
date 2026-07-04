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
    <div className={`stat-card p-3 ${className}`}>
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-lg ${iconBg} shrink-0`}>
          <Icon size={18} className={iconColor} />
        </div>
        <div className="min-w-0">
          <div className="text-[10px] font-bold text-primary-400/80 uppercase tracking-widest truncate">{title}</div>
          <div className="text-lg font-black text-neutral-800 leading-none my-0.5">{value}</div>
          {subtitle && <div className="text-[9px] text-neutral-400 truncate">{subtitle}</div>}
        </div>
      </div>
    </div>
  );
}
