import { useState } from 'react';
import { Plane, Moon, Landmark, Building2, Map } from 'lucide-react';
import { formatBDT } from '../../lib/constants';

interface ServiceItem {
  id: string;
  label: string;
  value: number;
  percentage: number;
  color: string;
  icon: any;
}

const serviceData: ServiceItem[] = [
  { id: 'air', label: 'Air Tickets', value: 2150000, percentage: 42, color: '#00AEEF', icon: Plane },
  { id: 'umrah', label: 'Umrah Packages', value: 1420000, percentage: 28, color: '#F59E0B', icon: Moon },
  { id: 'hajj', label: 'Hajj Pilgrims', value: 780000, percentage: 15, color: '#005B8E', icon: Landmark },
  { id: 'hotel', label: 'Hotel Bookings', value: 450000, percentage: 9, color: '#0D9488', icon: Building2 },
  { id: 'tours', label: 'Holiday Tours', value: 310000, percentage: 6, color: '#EC4899', icon: Map },
];

export function ServiceDistributionChart() {
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const totalValue = serviceData.reduce((acc, s) => acc + s.value, 0);
  const activeItem = serviceData.find((s) => s.id === hoveredId) || serviceData[0];

  // Calculate SVG donut slice offsets
  const size = 180;
  const strokeWidth = 26;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  let currentOffset = 0;
  const slices = serviceData.map((item) => {
    const strokeDasharray = `${(item.percentage / 100) * circumference} ${circumference}`;
    const strokeDashoffset = -currentOffset;
    currentOffset += (item.percentage / 100) * circumference;
    return { ...item, strokeDasharray, strokeDashoffset };
  });

  return (
    <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-bold text-slate-800 font-heading">Service Breakdown</h3>
            <p className="text-xs text-slate-400 mt-0.5">Revenue distribution across service verticals</p>
          </div>
          <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full">
            Total {formatBDT(totalValue)}
          </span>
        </div>

        {/* Donut graphic & interactive center */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-6 my-2">
          <div className="relative w-44 h-44 shrink-0 flex items-center justify-center">
            <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="transform -rotate-90">
              <circle
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="transparent"
                stroke="#f1f5f9"
                strokeWidth={strokeWidth}
              />
              {slices.map((slice) => (
                <circle
                  key={slice.id}
                  cx={size / 2}
                  cy={size / 2}
                  r={radius}
                  fill="transparent"
                  stroke={slice.color}
                  strokeWidth={hoveredId === slice.id ? strokeWidth + 4 : strokeWidth}
                  strokeDasharray={slice.strokeDasharray}
                  strokeDashoffset={slice.strokeDashoffset}
                  strokeLinecap="round"
                  className="transition-all duration-300 cursor-pointer"
                  onMouseEnter={() => setHoveredId(slice.id)}
                  onMouseLeave={() => setHoveredId(null)}
                />
              ))}
            </svg>

            {/* Inner text */}
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none p-2">
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider truncate max-w-[100px]">
                {activeItem.label}
              </span>
              <span className="text-lg font-black text-slate-900 leading-tight">
                {activeItem.percentage}%
              </span>
              <span className="text-[10px] font-bold text-slate-500">
                {formatBDT(activeItem.value)}
              </span>
            </div>
          </div>

          {/* Legend */}
          <div className="flex-1 w-full space-y-2">
            {serviceData.map((item) => {
              const Icon = item.icon;
              const isSelected = hoveredId === item.id;
              return (
                <div
                  key={item.id}
                  onMouseEnter={() => setHoveredId(item.id)}
                  onMouseLeave={() => setHoveredId(null)}
                  className={`flex items-center justify-between p-2 rounded-xl text-xs transition-all cursor-pointer ${
                    isSelected ? 'bg-slate-100 font-bold shadow-2xs' : 'hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                    <Icon className="w-3.5 h-3.5 text-slate-400" />
                    <span className="text-slate-700">{item.label}</span>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-slate-900">{item.percentage}%</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
