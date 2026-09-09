import React from 'react';
import { LogisticsOverview } from '../components/logistics/LogisticsOverview';

export const LogisticsPage: React.FC = () => {
  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      <div>
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
          Hiring Logistics & Statutory Compliance
        </h1>
        <p className="text-sm font-medium text-slate-500 mt-1">
          Monitor dual-tier hiring pipelines, booking frequency caps, and fair wage thresholds
        </p>
      </div>

      <LogisticsOverview />
    </div>
  );
};
