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
    <div className="bg-white rounded-3xl p-6 sm:p-7 flex flex-col justify-between transition-transform hover:-translate-y-0.5">
      <div className="flex items-center justify-between mb-4">
        <span className="text-xs font-black font-display text-zinc-400 tracking-wider uppercase">
          {label}
        </span>
        <div className="w-11 h-11 rounded-2xl bg-[#FFF4ED] flex items-center justify-center shrink-0">
          <Icon className="w-5 h-5 text-[#FFB380]" />
        </div>
      </div>

      <div>
        <div className="text-3xl sm:text-4xl font-black font-display text-[#0D0D11] tracking-tight">
          {typeof value === 'number' ? value.toLocaleString() : value}
        </div>
        <div className="flex items-center gap-2 mt-2.5 text-xs font-bold text-zinc-400">
          <span className="inline-flex items-center gap-1 text-emerald-700 font-extrabold bg-emerald-50 px-2.5 py-0.5 rounded-full text-[11px]">
            <TrendingUp className="w-3 h-3" />
            {trend}
          </span>
          <span className="font-medium text-[11px] text-zinc-400">{subtext}</span>
        </div>
      </div>
    </div>
  );
};

