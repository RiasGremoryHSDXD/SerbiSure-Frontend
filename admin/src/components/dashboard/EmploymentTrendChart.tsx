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
  const hoveredPoint2 = points2[hoveredIdx];

  return (
    <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-100/90 shadow-[0_4px_25px_rgba(0,0,0,0.02)] flex flex-col justify-between h-full relative">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-bold text-slate-900 tracking-tight">
              Employment & Deployment Trends
            </h3>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 text-[11px] font-bold">
              <TrendingUp className="w-3 h-3" />
              +18.4%
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Tracking active placements vs available kasambahay workforce
          </p>
        </div>

        {/* Legend & Filter */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3 text-xs font-semibold text-slate-600">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#0284C7]" />
              <span>Employed</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#F5A623]" />
              <span>Available</span>
            </div>
          </div>

          <div className="relative">
            <button
              onClick={() => setTimeframe(timeframe === 'Monthly' ? 'Quarterly' : 'Monthly')}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200/80 rounded-xl text-xs font-bold text-slate-700 transition-colors cursor-pointer"
            >
              <span>{timeframe}</span>
              <ChevronDown className="w-3 h-3 text-slate-400" />
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
            {/* Gradient for Employed Area */}
            <linearGradient id="employedGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#0284C7" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#0284C7" stopOpacity="0.0" />
            </linearGradient>

            {/* Gradient for Available Area */}
            <linearGradient id="availableGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#F5A623" stopOpacity="0.2" />
              <stop offset="100%" stopColor="#F5A623" stopOpacity="0.0" />
            </linearGradient>

            {/* Drop shadow for line */}
            <filter id="glowEmployed" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="4" stdDeviation="4" floodColor="#0284C7" floodOpacity="0.2" />
            </filter>
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
                  stroke="#F1F5F9"
                  strokeDasharray="4 4"
                  strokeWidth="1"
                />
                <text
                  x={paddingX - 10}
                  y={y + 3}
                  textAnchor="end"
                  className="text-[10px] fill-slate-300 font-medium font-mono"
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
            stroke="#F5A623"
            strokeWidth="2.5"
            strokeLinecap="round"
            className="transition-all duration-300"
          />
          <path
            d={linePath1}
            fill="none"
            stroke="#0284C7"
            strokeWidth="3"
            strokeLinecap="round"
            filter="url(#glowEmployed)"
            className="transition-all duration-300"
          />

          {/* Vertical Guide line at hovered point */}
          {hoveredPoint && (
            <line
              x1={hoveredPoint.x}
              y1={paddingY}
              x2={hoveredPoint.x}
              y2={height - paddingY}
              stroke="#0284C7"
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
                  stroke="#F5A623"
                  strokeWidth="2"
                  className="transition-all duration-150"
                />

                {/* Point for Employed */}
                <circle
                  cx={p.x}
                  cy={p.y}
                  r={isHovered ? 6 : 4}
                  fill={isHovered ? "#0284C7" : "#FFFFFF"}
                  stroke="#0284C7"
                  strokeWidth={isHovered ? 3 : 2}
                  className="transition-all duration-150"
                />

                {/* X Axis Month Label */}
                <text
                  x={p.x}
                  y={height - 8}
                  textAnchor="middle"
                  className={`text-[11px] font-semibold transition-all ${
                    isHovered 
                      ? 'fill-slate-900 font-bold' 
                      : 'fill-slate-400'
                  }`}
                >
                  {p.data.month}
                </text>
              </g>
            );
          })}
        </svg>

        {/* Floating Tooltip matching Voltara mockup */}
        {hoveredPoint && (
          <div
            className="absolute z-20 pointer-events-none transition-all duration-150 bg-[#0F172A] text-white p-3 rounded-2xl shadow-xl border border-slate-700/50 text-xs w-36"
            style={{
              left: `calc(${(hoveredPoint.x / width) * 100}% - 72px)`,
              top: `${Math.max(10, (hoveredPoint.y / height) * 100 - 45)}%`,
            }}
          >
            <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-slate-800">
              <span className="font-bold text-amber-400 uppercase tracking-wider text-[10px]">
                {hoveredPoint.data.month} Overview
              </span>
              <span className="text-[10px] text-slate-400 font-mono">2026</span>
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-slate-400 text-[11px] flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#0284C7]" /> Employed
                </span>
                <span className="font-bold font-mono text-white">{hoveredPoint.data.employed}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400 text-[11px] flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#F5A623]" /> Available
                </span>
                <span className="font-bold font-mono text-white">{hoveredPoint.data.available}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
