import React, { useState } from 'react';
import { Users, Briefcase, Hourglass, MapPin, Sparkles, ShieldCheck } from 'lucide-react';
import { useAdmin } from '../context/AdminContext';
import { StatCard } from '../components/dashboard/StatCard';
import { EmploymentTrendChart } from '../components/dashboard/EmploymentTrendChart';
import { EmploymentGauge } from '../components/dashboard/EmploymentGauge';
import { DashboardActivityTable } from '../components/dashboard/DashboardActivityTable';
import { SuperAdminBreakdown } from '../components/dashboard/SuperAdminBreakdown';
import { CITY_METRICS } from '../data/mockData';

export const DashboardPage: React.FC = () => {
  const { currentRole, selectedBarangay, barangays } = useAdmin();
  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'BREAKDOWN'>('OVERVIEW');

  const activeBarangay = barangays.find((b) => b.name === selectedBarangay) || barangays[1];
  const isSuperadmin = currentRole === 'SUPERADMIN';

  const totalWorkers = isSuperadmin ? CITY_METRICS.totalWorkers : activeBarangay.totalWorkers;
  const totalEmployed = isSuperadmin ? CITY_METRICS.totalEmployed : activeBarangay.employed;
  const totalAvailable = isSuperadmin ? CITY_METRICS.totalAvailable : activeBarangay.available;

  const employedPercentage = isSuperadmin ? 59 : activeBarangay.employmentRatio;

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      
      {/* Top Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
          Dashboard
        </h1>
      </div>

      {/* Filter Tabs Bar (Voltara style) */}
      <div className="flex items-center gap-2 pb-1">
        <button
          onClick={() => setActiveTab('OVERVIEW')}
          className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
            activeTab === 'OVERVIEW'
              ? 'bg-[#0F172A] text-white shadow-sm'
              : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200/60'
          }`}
        >
          Analytics & Waves
        </button>

        <button
          onClick={() => setActiveTab('BREAKDOWN')}
          className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
            activeTab === 'BREAKDOWN'
              ? 'bg-[#0F172A] text-white shadow-sm'
              : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200/60'
          }`}
        >
          Barangay Breakdown Table
        </button>
      </div>

      {/* Top 3 Stat Cards (Voltara / SerbiSure style) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <StatCard
          label="TOTAL REGISTERED WORKERS"
          value={totalWorkers}
          icon={Users}
        />
        <StatCard
          label="CURRENTLY EMPLOYED"
          value={totalEmployed}
          icon={Briefcase}
        />
        <StatCard
          label="READY FOR DEPLOYMENT"
          value={totalAvailable}
          icon={Hourglass}
        />
      </div>

      {/* Tab 1: Modern Analytics Waves & Radial Speedometer */}
      {activeTab === 'OVERVIEW' && (
        <div className="space-y-6">
          {/* Middle Row: Dual-Curve Wave Chart (Left) + Semi-Circle Gauge (Right) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
            <div className="lg:col-span-8">
              <EmploymentTrendChart />
            </div>
            <div className="lg:col-span-4">
              <EmploymentGauge 
                percentage={employedPercentage}
                label="Employment Placement Rate"
                sublabel={isSuperadmin ? 'City-wide target: 75%' : `Brgy. ${selectedBarangay} target: 70%`}
              />
            </div>
          </div>

          {/* Bottom Row: Rich Activity & Statutory Compliance Table */}
          <DashboardActivityTable />
        </div>
      )}

      {/* Tab 2: Barangay Breakdown (Superadmin level) */}
      {activeTab === 'BREAKDOWN' && (
        <div className="bg-white rounded-3xl p-6 border border-slate-100/90 shadow-[0_4px_25px_rgba(0,0,0,0.02)]">
          <SuperAdminBreakdown barangays={barangays} />
        </div>
      )}

    </div>
  );
};
