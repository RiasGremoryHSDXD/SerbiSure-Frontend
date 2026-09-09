import React from 'react';

interface EmploymentGaugeProps {
  percentage: number; // e.g. 84
  label?: string;
  sublabel?: string;
}

export const EmploymentGauge: React.FC<EmploymentGaugeProps> = ({
  percentage = 84,
  label = 'Current Employment Rate',
  sublabel = 'Barangay Placement Target: 80%',
}) => {
  // SVG Gauge calculations
  const size = 260;
  const strokeWidth = 26;
  const radius = (size - strokeWidth) / 2;
  const cx = size / 2;
  const cy = size / 2 + 30; // Shift down for semi-circle
  
  // Semi circle circumference = PI * radius
  const arcLength = Math.PI * radius;
  const progressLength = (percentage / 100) * arcLength;

  // Needle angle: 0% is -180 deg (left), 100% is 0 deg (right)
  const angleDeg = -180 + (percentage / 100) * 180;
  const angleRad = (angleDeg * Math.PI) / 180;
  const needleLength = radius - 15;
  const needleX = cx + needleLength * Math.cos(angleRad);
  const needleY = cy + needleLength * Math.sin(angleRad);

  return (
    <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-100/90 shadow-[0_4px_25px_rgba(0,0,0,0.02)] flex flex-col justify-between h-full relative">
      {/* Title */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-slate-900 tracking-tight">
          {label}
        </h3>
        <span className="px-2.5 py-1 rounded-full bg-blue-50 text-blue-600 text-xs font-bold">
          High Performance
        </span>
      </div>

      {/* Percentage Center Display */}
      <div className="text-center my-auto pt-2">
        <div className="text-5xl font-black text-slate-900 tracking-tight flex items-baseline justify-center gap-0.5">
          {percentage}
          <span className="text-2xl font-extrabold text-[#0284C7]">%</span>
        </div>
        <p className="text-xs font-semibold text-slate-400 mt-1 uppercase tracking-wider">
          Active Placement Capacity
        </p>

        {/* Semi-Circle Speedometer Gauge */}
        <div className="relative w-full max-w-[240px] mx-auto h-[130px] flex items-center justify-center mt-3">
          <svg viewBox={`0 0 ${size} ${size / 2 + 40}`} className="w-full h-full overflow-visible">
            <defs>
              <linearGradient id="gaugeGradient" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#0284C7" />
                <stop offset="60%" stopColor="#38BDF8" />
                <stop offset="100%" stopColor="#F5A623" />
              </linearGradient>

              <filter id="gaugeShadow" x="-10%" y="-10%" width="120%" height="120%">
                <feDropShadow dx="0" dy="4" stdDeviation="4" floodColor="#0284C7" floodOpacity="0.25" />
              </filter>
            </defs>

            {/* Background Track (Grey semi-circle) */}
            <path
              d={`M ${cx - radius} ${cy} A ${radius} ${radius} 0 0 1 ${cx + radius} ${cy}`}
              fill="none"
              stroke="#F1F5F9"
              strokeWidth={strokeWidth}
              strokeLinecap="round"
            />

            {/* Active Filled Arc */}
            <path
              d={`M ${cx - radius} ${cy} A ${radius} ${radius} 0 0 1 ${cx + radius} ${cy}`}
              fill="none"
              stroke="url(#gaugeGradient)"
              strokeWidth={strokeWidth}
              strokeDasharray={`${progressLength} ${arcLength}`}
              strokeLinecap="round"
              filter="url(#gaugeShadow)"
              className="transition-all duration-1000 ease-out"
            />

            {/* Needle Line */}
            <line
              x1={cx}
              y1={cy}
              x2={needleX}
              y2={needleY}
              stroke="#0F172A"
              strokeWidth="3.5"
              strokeLinecap="round"
              className="transition-all duration-1000 ease-out"
            />

            {/* Center Pivot Circle */}
            <circle cx={cx} cy={cy} r="8" fill="#0F172A" />
            <circle cx={cx} cy={cy} r="4" fill="#38BDF8" />
          </svg>
        </div>
      </div>

      {/* Bottom Metrics Pill & Target Info */}
      <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="font-semibold text-slate-600">{sublabel}</span>
        </div>
        <span className="font-bold text-slate-900 font-mono">
          +4.2% MoM
        </span>
      </div>
    </div>
  );
};
