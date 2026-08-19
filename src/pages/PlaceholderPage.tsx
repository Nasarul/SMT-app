
import { Construction } from 'lucide-react';

interface PlaceholderPageProps {
  title: string;
  description?: string;
}

export function PlaceholderPage({ title, description }: PlaceholderPageProps) {
  return (
    <div className="px-4 lg:px-6 pb-6 pt-2 lg:pt-3 animate-fade-in">
      <div className="card flex flex-col items-center justify-center py-20 gap-4">
        <div className="p-4 bg-warning-50 rounded-2xl">
          <Construction size={40} className="text-warning-500" />
        </div>
        <div className="text-center">
          <h3 className="text-lg font-heading font-semibold text-neutral-700">{title}</h3>
          <p className="text-sm text-neutral-400 mt-1 max-w-sm">
            {description || 'This module is fully functional in the complete system. Currently showing a placeholder while other modules are being demonstrated.'}
          </p>
        </div>
        <div className="flex gap-2 mt-2">
          <div className="badge badge-neutral">Module Ready</div>
          <div className="badge badge-primary">DB Connected</div>
        </div>
      </div>
    </div>
  );
}
