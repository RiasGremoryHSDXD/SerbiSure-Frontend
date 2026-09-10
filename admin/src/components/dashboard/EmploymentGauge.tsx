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
    <div className="bg-white rounded-3xl p-6 sm:p-7 flex flex-col justify-between h-full relative">
      {/* Title */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-black font-display text-[#0D0D11] tracking-tight">
          {label}
        </h3>
        <span className="px-3 py-1 rounded-full bg-[#FFB380]/15 text-[#FFB380] text-xs font-extrabold">
          Optimal
        </span>
      </div>

      {/* Percentage Center Display */}
      <div className="text-center my-auto pt-3">
        <div className="text-5xl font-black font-display text-[#0D0D11] tracking-tight flex items-baseline justify-center gap-0.5">
          {percentage}
          <span className="text-2xl font-black text-[#FFB380]">%</span>
        </div>
        <p className="text-xs font-extrabold font-display text-zinc-400 mt-1 uppercase tracking-wider">
          Active Placement Capacity
        </p>

        {/* Semi-Circle Speedometer Gauge */}
        <div className="relative w-full max-w-[240px] mx-auto h-[130px] flex items-center justify-center mt-3">
          <svg viewBox={`0 0 ${size} ${size / 2 + 40}`} className="w-full h-full overflow-visible">
            <defs>
              <linearGradient id="gaugeGradient" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#0D0D11" />
                <stop offset="55%" stopColor="#FFB380" />
                <stop offset="100%" stopColor="#FFBE99" />
              </linearGradient>
            </defs>

            {/* Background Track */}
            <path
              d={`M ${cx - radius} ${cy} A ${radius} ${radius} 0 0 1 ${cx + radius} ${cy}`}
              fill="none"
              stroke="#F0F0EC"
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
              className="transition-all duration-1000 ease-out"
            />

            {/* Needle Line */}
            <line
              x1={cx}
              y1={cy}
              x2={needleX}
              y2={needleY}
              stroke="#0D0D11"
              strokeWidth="3.5"
              strokeLinecap="round"
              className="transition-all duration-1000 ease-out"
            />

            {/* Center Pivot Circle */}
            <circle cx={cx} cy={cy} r="8" fill="#0D0D11" />
            <circle cx={cx} cy={cy} r="4" fill="#FFB380" />
          </svg>
        </div>
      </div>

      {/* Bottom Metrics Pill & Target Info */}
      <div className="pt-3 flex items-center justify-between text-xs bg-[#F6F5F2] rounded-2xl p-3 mt-2">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#FFB380]" />
          <span className="font-bold text-zinc-600">{sublabel}</span>
        </div>
        <span className="font-black font-display text-zinc-900">
          +4.2% MoM
        </span>
      </div>
    </div>
  );
};
