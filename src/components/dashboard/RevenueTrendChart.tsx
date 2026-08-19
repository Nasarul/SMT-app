import { useState } from 'react';
import { ArrowUpRight } from 'lucide-react';
import { formatBDT } from '../../lib/constants';

interface MonthlyData {
  month: string;
  revenue: number;
  profit: number;
  tickets: number;
}

const mockMonthlyData: MonthlyData[] = [
  { month: 'Jan', revenue: 1450000, profit: 185000, tickets: 48 },
  { month: 'Feb', revenue: 1820000, profit: 240000, tickets: 62 },
  { month: 'Mar', revenue: 2150000, profit: 310000, tickets: 75 },
  { month: 'Apr', revenue: 2980000, profit: 420000, tickets: 94 },
  { month: 'May', revenue: 3450000, profit: 510000, tickets: 110 },
  { month: 'Jun', revenue: 4100000, profit: 620000, tickets: 135 },
  { month: 'Jul', revenue: 3800000, profit: 540000, tickets: 122 },
  { month: 'Aug', revenue: 4650000, profit: 680000, tickets: 148 },
];

export function RevenueTrendChart() {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const [selectedMetric, setSelectedMetric] = useState<'revenue' | 'profit'>('revenue');

  const maxVal = Math.max(...mockMonthlyData.map((d) => (selectedMetric === 'revenue' ? d.revenue : d.profit))) * 1.15;
  const chartHeight = 180;
  const chartWidth = 500;
  const paddingX = 30;
  const paddingY = 20;

  // Calculate points
  const points = mockMonthlyData.map((d, i) => {
    const val = selectedMetric === 'revenue' ? d.revenue : d.profit;
    const x = paddingX + (i / (mockMonthlyData.length - 1)) * (chartWidth - paddingX * 2);
    const y = chartHeight - paddingY - (val / maxVal) * (chartHeight - paddingY * 2);
    return { x, y, data: d };
  });

  // Create smooth SVG curve path
  const pathD = points.reduce((acc, curr, idx, arr) => {
    if (idx === 0) return `M ${curr.x} ${curr.y}`;
    const prev = arr[idx - 1];
    const cpX1 = prev.x + (curr.x - prev.x) / 2;
    const cpX2 = prev.x + (curr.x - prev.x) / 2;
    return `${acc} C ${cpX1} ${prev.y}, ${cpX2} ${curr.y}, ${curr.x} ${curr.y}`;
  }, '');

  const areaD = `${pathD} L ${points[points.length - 1].x} ${chartHeight - paddingY} L ${points[0].x} ${chartHeight - paddingY} Z`;

  return (
    <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm hover:shadow-md transition-all">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-slate-800 font-heading">Sales & Revenue Growth</h3>
            <span className="flex items-center gap-0.5 text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
              <ArrowUpRight className="w-3 h-3" /> +18.4%
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">Monthly gross turnover and net agency profit</p>
        </div>

        <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs font-semibold">
          <button
            onClick={() => setSelectedMetric('revenue')}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              selectedMetric === 'revenue' ? 'bg-white text-slate-800 shadow-xs' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Gross Revenue
          </button>
          <button
            onClick={() => setSelectedMetric('profit')}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              selectedMetric === 'profit' ? 'bg-white text-primary-600 shadow-xs' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Net Profit
          </button>
        </div>
      </div>

      {/* SVG Chart Area */}
      <div className="relative w-full aspect-[500/220] select-none">
        <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="w-full h-full overflow-visible">
          <defs>
            <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={selectedMetric === 'revenue' ? '#00AEEF' : '#10B981'} stopOpacity="0.35" />
              <stop offset="100%" stopColor={selectedMetric === 'revenue' ? '#00AEEF' : '#10B981'} stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((ratio, idx) => {
            const y = paddingY + ratio * (chartHeight - paddingY * 2);
            return (
              <line
                key={idx}
                x1={paddingX}
                y1={y}
                x2={chartWidth - paddingX}
                y2={y}
                stroke="#f1f5f9"
                strokeDasharray="4 4"
                strokeWidth="1"
              />
            );
          })}

          {/* Area fill */}
          <path d={areaD} fill="url(#chartGradient)" />

          {/* Line path */}
          <path
            d={pathD}
            fill="none"
            stroke={selectedMetric === 'revenue' ? '#00AEEF' : '#10B981'}
            strokeWidth="3.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Data Points and Hover triggers */}
          {points.map((pt, idx) => {
            const isHovered = hoveredIdx === idx;
            return (
              <g key={idx} className="cursor-pointer" onMouseEnter={() => setHoveredIdx(idx)} onMouseLeave={() => setHoveredIdx(null)}>
                <circle
                  cx={pt.x}
                  cy={pt.y}
                  r={isHovered ? 6 : 4}
                  fill="#ffffff"
                  stroke={selectedMetric === 'revenue' ? '#00AEEF' : '#10B981'}
                  strokeWidth={isHovered ? 3 : 2}
                  className="transition-all duration-200"
                />
                {/* X axis labels */}
                <text
                  x={pt.x}
                  y={chartHeight - 2}
                  textAnchor="middle"
                  className={`text-[10px] font-semibold ${isHovered ? 'fill-slate-900 font-bold' : 'fill-slate-400'}`}
                >
                  {pt.data.month}
                </text>
              </g>
            );
          })}
        </svg>

        {/* Floating Tooltip */}
        {hoveredIdx !== null && (
          <div
            className="absolute z-20 bg-slate-900 text-white px-3 py-2 rounded-xl text-xs shadow-xl pointer-events-none -translate-x-1/2 -translate-y-full mb-3"
            style={{
              left: `${(points[hoveredIdx].x / chartWidth) * 100}%`,
              top: `${(points[hoveredIdx].y / chartHeight) * 100}%`,
            }}
          >
            <div className="font-bold text-sky-400">{mockMonthlyData[hoveredIdx].month} Performance</div>
            <div className="text-[11px] text-slate-300 mt-0.5">
              {selectedMetric === 'revenue' ? 'Revenue: ' : 'Profit: '}
              <span className="font-black text-white">
                {formatBDT(selectedMetric === 'revenue' ? mockMonthlyData[hoveredIdx].revenue : mockMonthlyData[hoveredIdx].profit)}
              </span>
            </div>
            <div className="text-[10px] text-slate-400">Tickets Issued: {mockMonthlyData[hoveredIdx].tickets}</div>
          </div>
        )}
      </div>
    </div>
  );
}
