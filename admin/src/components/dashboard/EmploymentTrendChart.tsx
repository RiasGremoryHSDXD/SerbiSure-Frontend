import React, { useState } from 'react';
import { ChevronDown, TrendingUp } from 'lucide-react';

interface MonthlyPoint {
  month: string;
  employed: number;
  available: number;
  total: number;
}

const MONTHLY_DATA: MonthlyPoint[] = [
  { month: 'Jan', employed: 110, available: 65, total: 175 },
  { month: 'Feb', employed: 180, available: 120, total: 300 },
  { month: 'Mar', employed: 140, available: 90, total: 230 },
  { month: 'Apr', employed: 220, available: 160, total: 380 },
  { month: 'May', employed: 200, available: 140, total: 340 },
  { month: 'Jun', employed: 310, available: 190, total: 500 },
  { month: 'Jul', employed: 280, available: 210, total: 490 },
  { month: 'Aug', employed: 420, available: 260, total: 680 },
  { month: 'Sep', employed: 360, available: 230, total: 590 },
  { month: 'Oct', employed: 480, available: 290, total: 770 },
  { month: 'Nov', employed: 430, available: 310, total: 740 },
  { month: 'Dec', employed: 560, available: 350, total: 910 },
];

export const EmploymentTrendChart: React.FC = () => {
  const [hoveredIdx, setHoveredIdx] = useState<number>(7); // Default to Aug
  const [timeframe, setTimeframe] = useState<'Monthly' | 'Quarterly'>('Monthly');

  // Chart dimensions
  const width = 640;
  const height = 240;
  const paddingX = 40;
  const paddingY = 30;

  const maxVal = 600;
  const minVal = 50;

  // Calculate coordinates
  const points1 = MONTHLY_DATA.map((d, i) => {
    const x = paddingX + (i / (MONTHLY_DATA.length - 1)) * (width - 2 * paddingX);
    const y = height - paddingY - ((d.employed - minVal) / (maxVal - minVal)) * (height - 2 * paddingY);
    return { x, y, data: d };
  });

  const points2 = MONTHLY_DATA.map((d, i) => {
    const x = paddingX + (i / (MONTHLY_DATA.length - 1)) * (width - 2 * paddingX);
    const y = height - paddingY - ((d.available - minVal) / (maxVal - minVal)) * (height - 2 * paddingY);
    return { x, y, data: d };
  });

  // Generate smooth SVG Catmull-Rom or Bezier curve path
  const createSmoothPath = (pts: { x: number; y: number }[]) => {
    if (pts.length === 0) return '';
    let d = `M ${pts[0].x} ${pts[0].y}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[i === 0 ? 0 : i - 1];
      const p1 = pts[i];
      const p2 = pts[i + 1];
      const p3 = pts[i + 2 < pts.length ? i + 2 : i + 1];

      const cp1x = p1.x + (p2.x - p0.x) / 6;
      const cp1y = p1.y + (p2.y - p0.y) / 6;
      const cp2x = p2.x - (p3.x - p1.x) / 6;
      const cp2y = p2.y - (p3.y - p1.y) / 6;

      d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
    }
    return d;
  };

  const linePath1 = createSmoothPath(points1);
  const linePath2 = createSmoothPath(points2);

  const areaPath1 = `${linePath1} L ${points1[points1.length - 1].x} ${height - paddingY} L ${points1[0].x} ${height - paddingY} Z`;
  const areaPath2 = `${linePath2} L ${points2[points2.length - 1].x} ${height - paddingY} L ${points2[0].x} ${height - paddingY} Z`;

  const hoveredPoint = points1[hoveredIdx];

  return (
    <div className="bg-white rounded-3xl p-6 sm:p-7 flex flex-col justify-between h-full relative">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-black font-display text-[#0D0D11] tracking-tight">
              Employment Trends
            </h3>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[11px] font-extrabold">
              <TrendingUp className="w-3 h-3" />
              +18.4%
            </span>
          </div>
          <p className="text-xs text-zinc-400 mt-0.5 font-medium">
            Active verified placements vs available workforce
          </p>
        </div>

        {/* Legend & Filter */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3 text-xs font-bold text-zinc-600">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#FFB380]" />
              <span>Employed</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#0D0D11]" />
              <span>Available</span>
            </div>
          </div>

          <div className="relative">
            <button
              onClick={() => setTimeframe(timeframe === 'Monthly' ? 'Quarterly' : 'Monthly')}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-[#F0F0EC] hover:bg-[#EAEAE5] rounded-full text-xs font-extrabold font-display text-zinc-800 transition-colors cursor-pointer"
            >
              <span>{timeframe}</span>
              <ChevronDown className="w-3 h-3 text-zinc-400" />
            </button>
          </div>
        </div>
      </div>

      {/* SVG Chart Graphic */}
      <div className="relative w-full overflow-hidden mt-2">
        <svg 
          viewBox={`0 0 ${width} ${height}`} 
          className="w-full h-auto overflow-visible select-none"
        >
          <defs>
            {/* Gradient for Employed Area (Apricot Peach) */}
            <linearGradient id="employedGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#FFB380" stopOpacity="0.28" />
              <stop offset="100%" stopColor="#FFB380" stopOpacity="0.0" />
            </linearGradient>

            {/* Gradient for Available Area (Ink Black) */}
            <linearGradient id="availableGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#0D0D11" stopOpacity="0.08" />
              <stop offset="100%" stopColor="#0D0D11" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Horizontal Grid lines */}
          {[100, 200, 300, 400, 500].map((val) => {
            const y = height - paddingY - ((val - minVal) / (maxVal - minVal)) * (height - 2 * paddingY);
            return (
              <g key={val}>
                <line
                  x1={paddingX}
                  y1={y}
                  x2={width - paddingX}
                  y2={y}
                  stroke="#F0F0EC"
                  strokeDasharray="4 4"
                  strokeWidth="1"
                />
                <text
                  x={paddingX - 10}
                  y={y + 3}
                  textAnchor="end"
                  className="text-[10px] fill-zinc-400 font-semibold"
                >
                  {val}
                </text>
              </g>
            );
          })}

          {/* Area Fills */}
          <path d={areaPath2} fill="url(#availableGradient)" />
          <path d={areaPath1} fill="url(#employedGradient)" />

          {/* Stroke Lines */}
          <path
            d={linePath2}
            fill="none"
            stroke="#0D0D11"
            strokeWidth="2.5"
            strokeLinecap="round"
            className="transition-all duration-300"
          />
          <path
            d={linePath1}
            fill="none"
            stroke="#FFB380"
            strokeWidth="3.5"
            strokeLinecap="round"
            className="transition-all duration-300"
          />

          {/* Vertical Guide line at hovered point */}
          {hoveredPoint && (
            <line
              x1={hoveredPoint.x}
              y1={paddingY}
              x2={hoveredPoint.x}
              y2={height - paddingY}
              stroke="#FFB380"
              strokeWidth="1.5"
              strokeDasharray="3 3"
              opacity="0.6"
            />
          )}

          {/* Data Points Interactive Circles */}
          {points1.map((p, idx) => {
            const isHovered = idx === hoveredIdx;
            return (
              <g 
                key={p.data.month} 
                className="cursor-pointer"
                onMouseEnter={() => setHoveredIdx(idx)}
              >
                {/* Invisible larger target for easy hovering */}
                <rect
                  x={p.x - 18}
                  y={paddingY}
                  width="36"
                  height={height - 2 * paddingY}
                  fill="transparent"
                />

                {/* Point for Available */}
                <circle
                  cx={points2[idx].x}
                  cy={points2[idx].y}
                  r={isHovered ? 5 : 3}
                  fill="#FFFFFF"
                  stroke="#0D0D11"
                  strokeWidth="2"
                  className="transition-all duration-150"
                />

                {/* Point for Employed */}
                <circle
                  cx={p.x}
                  cy={p.y}
                  r={isHovered ? 6 : 4}
                  fill={isHovered ? "#FFB380" : "#FFFFFF"}
                  stroke="#FFB380"
                  strokeWidth={isHovered ? 3 : 2}
                  className="transition-all duration-150"
                />

                {/* X Axis Month Label */}
                <text
                  x={p.x}
                  y={height - 8}
                  textAnchor="middle"
                  className={`text-[11px] font-extrabold font-display transition-all ${
                    isHovered 
                      ? 'fill-[#0D0D11] font-black scale-110' 
                      : 'fill-zinc-400'
                  }`}
                >
                  {p.data.month}
                </text>
              </g>
            );
          })}
        </svg>

        {/* Floating Tooltip */}
        {hoveredPoint && (
          <div
            className="absolute z-20 pointer-events-none transition-all duration-150 bg-[#0D0D11] text-white p-3.5 rounded-3xl text-xs w-40 ring-1 ring-white/10"
            style={{
              left: `calc(${(hoveredPoint.x / width) * 100}% - 80px)`,
              top: `${Math.max(10, (hoveredPoint.y / height) * 100 - 45)}%`,
            }}
          >
            <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-zinc-800">
              <span className="font-black font-display text-[#FFB380] uppercase tracking-wider text-[10px]">
                {hoveredPoint.data.month} Stats
              </span>
              <span className="text-[10px] text-zinc-400 font-bold">2026</span>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-zinc-400 text-[11px] flex items-center gap-1.5 font-medium">
                  <span className="w-2 h-2 rounded-full bg-[#FFB380]" /> Employed
                </span>
                <span className="font-extrabold text-white">{hoveredPoint.data.employed}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-zinc-400 text-[11px] flex items-center gap-1.5 font-medium">
                  <span className="w-2 h-2 rounded-full bg-white" /> Available
                </span>
                <span className="font-extrabold text-white">{hoveredPoint.data.available}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
