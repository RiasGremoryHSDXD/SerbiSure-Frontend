import React from 'react';
import { LogisticsOverview } from '../components/logistics/LogisticsOverview';

export const LogisticsPage: React.FC = () => {
  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      <div>
        <h1 className="text-3xl font-black font-display text-[#0D0D11] tracking-tight">
          Hiring Logistics & Compliance
        </h1>
        <p className="text-xs text-zinc-400 font-medium mt-1">
          Monitor dual-tier hiring pipelines, booking frequency caps, and wage thresholds
        </p>
      </div>

      <LogisticsOverview />
    </div>
  );
};
