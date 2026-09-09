import React from 'react';
import { LucideIcon, TrendingUp } from 'lucide-react';

interface StatCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  trend?: string;
  subtext?: string;
}

export const StatCard: React.FC<StatCardProps> = ({
  label,
  value,
  icon: Icon,
  trend = '+12.4%',
  subtext = 'vs last month',
}) => {
  return (
    <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-100/90 shadow-[0_4px_25px_rgba(0,0,0,0.02)] flex flex-col justify-between transition-all hover:shadow-md group">
      <div className="flex items-center justify-between mb-3">
        <span className="text-[11px] font-extrabold text-slate-400 tracking-wider uppercase">
          {label}
        </span>
        <div className="w-10 h-10 rounded-2xl bg-[#FFF9ED] flex items-center justify-center shrink-0 border border-[#FEEBC8]/60 group-hover:scale-105 transition-transform">
          <Icon className="w-5 h-5 text-[#F5A623]" />
        </div>
      </div>

      <div>
        <div className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight font-mono">
          {typeof value === 'number' ? value.toLocaleString() : value}
        </div>
        <div className="flex items-center gap-2 mt-2 text-xs font-semibold text-slate-400">
          <span className="inline-flex items-center gap-0.5 text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded-full text-[11px]">
            <TrendingUp className="w-3 h-3" />
            {trend}
          </span>
          <span>{subtext}</span>
        </div>
      </div>
    </div>
  );
};

