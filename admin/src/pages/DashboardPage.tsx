import React, { useState } from 'react';
import { Users, Briefcase, Hourglass } from 'lucide-react';
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
    <div className="space-y-7 animate-in fade-in duration-200">
      
      {/* Top Header */}
      <div>
        <h1 className="text-3xl sm:text-4xl font-black font-display text-[#0D0D11] tracking-tight">
          {isSuperadmin ? 'City Dashboard' : `Brgy. ${selectedBarangay} Dashboard`}
        </h1>
        <p className="text-xs text-zinc-400 mt-1 font-medium">
          {isSuperadmin ? 'City-wide administration across all Cagayan de Oro barangays' : `Local LGU operational jurisdiction for Brgy. ${selectedBarangay}`}
        </p>
      </div>

      {/* Filter Tabs Bar (Only Superadmin gets the multi-barangay Breakdown tab) */}
      {isSuperadmin && (
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('OVERVIEW')}
            className={`px-5 py-2.5 rounded-full text-xs font-black font-display transition-all cursor-pointer ${
              activeTab === 'OVERVIEW'
                ? 'bg-[#0D0D11] text-white'
                : 'bg-white text-zinc-600 hover:bg-[#F0F0EC]'
            }`}
          >
            Analytics & Trends
          </button>

          <button
            onClick={() => setActiveTab('BREAKDOWN')}
            className={`px-5 py-2.5 rounded-full text-xs font-black font-display transition-all cursor-pointer ${
              activeTab === 'BREAKDOWN'
                ? 'bg-[#0D0D11] text-white'
                : 'bg-white text-zinc-600 hover:bg-[#F0F0EC]'
            }`}
          >
            Barangay Directory & Stats
          </button>
        </div>
      )}

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
        <div className="bg-white rounded-3xl p-6">
          <SuperAdminBreakdown barangays={barangays} />
        </div>
      )}

    </div>
  );
};
