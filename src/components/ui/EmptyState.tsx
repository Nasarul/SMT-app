import React from 'react';
import { Video as LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-4">
      <div className="p-4 bg-neutral-100 rounded-2xl">
        <Icon size={36} className="text-neutral-400" />
      </div>
      <div className="text-center">
        <h3 className="text-base font-semibold text-neutral-600">{title}</h3>
        {description && <p className="text-sm text-neutral-400 mt-1 max-w-sm">{description}</p>}
      </div>
      {action}
    </div>
  );
}
