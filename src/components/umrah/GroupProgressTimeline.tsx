import { CheckCircle2, Clock, Plane, Building2, ShieldCheck, Users } from 'lucide-react';
import { formatDate } from '../../lib/constants';

export interface GroupTimelineStage {
  id: string;
  label: string;
  description: string;
  isCompleted: boolean;
  isCurrent: boolean;
  icon: any;
}

interface GroupProgressTimelineProps {
  groupName: string;
  groupCode: string;
  currentStage: 'registration' | 'visa' | 'hotel' | 'flight' | 'completed';
  totalPilgrims: number;
  departureDate?: string;
  returnDate?: string;
}

export function GroupProgressTimeline({
  groupName,
  groupCode,
  currentStage = 'registration',
  totalPilgrims = 0,
  departureDate,
  returnDate,
}: GroupProgressTimelineProps) {
  const stageKeys = ['registration', 'visa', 'hotel', 'flight', 'completed'];
  const currentIndex = stageKeys.indexOf(currentStage);

  const stages: GroupTimelineStage[] = [
    {
      id: 'registration',
      label: 'Pilgrim Registration',
      description: 'Collecting passports & NID',
      isCompleted: currentIndex > 0,
      isCurrent: currentIndex === 0,
      icon: Users,
    },
    {
      id: 'visa',
      label: 'Visa Processing',
      description: 'Saudi MOFA & Nusuk eVisa',
      isCompleted: currentIndex > 1,
      isCurrent: currentIndex === 1,
      icon: ShieldCheck,
    },
    {
      id: 'hotel',
      label: 'Hotel Vouchers',
      description: 'Makkah & Madinah allotment',
      isCompleted: currentIndex > 2,
      isCurrent: currentIndex === 2,
      icon: Building2,
    },
    {
      id: 'flight',
      label: 'Flight & Boarding',
      description: 'Group PNR & Seat confirmation',
      isCompleted: currentIndex > 3,
      isCurrent: currentIndex === 3,
      icon: Plane,
    },
    {
      id: 'completed',
      label: 'Trip Completed',
      description: 'Safe return to Dhaka',
      isCompleted: currentIndex === 4,
      isCurrent: currentIndex === 4,
      icon: CheckCircle2,
    },
  ];

  return (
    <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-6">
      {/* Header Info */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h4 className="text-base font-bold text-slate-900">{groupName}</h4>
            <span className="text-xs font-mono font-bold bg-amber-50 text-amber-800 border border-amber-200 px-2 py-0.5 rounded-md">
              {groupCode}
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            {totalPilgrims} Registered Pilgrims • Departure: {departureDate ? formatDate(departureDate) : 'TBD'}{returnDate ? ` • Return: ${formatDate(returnDate)}` : ''}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Group Status:</span>
          <span className="text-xs font-black uppercase px-3 py-1 bg-slate-900 text-white rounded-full">
            {currentStage}
          </span>
        </div>
      </div>

      {/* Visual Step Progress Bar */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-3 relative">
        {stages.map((stage, idx) => {
          const Icon = stage.icon;

          return (
            <div
              key={stage.id}
              className={`relative flex flex-col p-4 rounded-2xl border transition-all ${
                stage.isCompleted
                  ? 'bg-emerald-50/60 border-emerald-200 text-emerald-950'
                  : stage.isCurrent
                  ? 'bg-amber-50 border-amber-300 text-amber-950 ring-2 ring-amber-400/30'
                  : 'bg-slate-50 border-slate-200/60 text-slate-400'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div
                  className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                    stage.isCompleted
                      ? 'bg-emerald-500 text-white shadow-xs'
                      : stage.isCurrent
                      ? 'bg-amber-500 text-white shadow-xs animate-pulse'
                      : 'bg-slate-200 text-slate-500'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                </div>
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                  Step 0{idx + 1}
                </span>
              </div>

              <h5 className="text-xs font-bold leading-tight mb-1">{stage.label}</h5>
              <p className="text-[11px] opacity-80 leading-snug">{stage.description}</p>

              {stage.isCompleted && (
                <div className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 mt-2">
                  <CheckCircle2 className="w-3 h-3" /> Completed
                </div>
              )}
              {stage.isCurrent && (
                <div className="flex items-center gap-1 text-[10px] font-bold text-amber-700 mt-2">
                  <Clock className="w-3 h-3" /> In Progress
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
