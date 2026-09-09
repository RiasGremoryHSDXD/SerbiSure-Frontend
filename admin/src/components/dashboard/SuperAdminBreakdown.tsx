import React, { useState } from 'react';
import { Search } from 'lucide-react';
import { BarangayStats } from '../../types/admin';

interface SuperAdminBreakdownProps {
  barangays: BarangayStats[];
}

export const SuperAdminBreakdown: React.FC<SuperAdminBreakdownProps> = ({ barangays }) => {
  const [filterQuery, setFilterQuery] = useState('');

  const filteredBarangays = barangays.filter(b =>
    b.name.toLowerCase().includes(filterQuery.toLowerCase())
  );

  return (
    <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-[0_4px_25px_rgba(0,0,0,0.02)]">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-6 gap-4 border-b border-slate-100">
        <h3 className="text-xl font-bold text-slate-800 tracking-tight">
          Barangay-Level Breakdown
        </h3>
        
        {/* Search Barangay */}
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={filterQuery}
            onChange={(e) => setFilterQuery(e.target.value)}
            placeholder="Search Barangay..."
            className="w-full pl-10 pr-4 py-2 bg-[#F8F9FC] border border-slate-200/80 rounded-full text-xs text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#F5A623]/30 focus:border-[#F5A623]"
          />
        </div>
      </div>

      {/* Breakdown Table */}
      <div className="overflow-x-auto mt-4">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-100 text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
              <th className="py-4 font-bold">Barangay Name</th>
              <th className="py-4 font-bold">Total Workers</th>
              <th className="py-4 font-bold">Employment Ratio</th>
              <th className="py-4 font-bold text-right">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50 text-sm">
            {filteredBarangays.map((b) => (
              <tr key={b.name} className="hover:bg-[#FFFDF8] transition-colors group">
                <td className="py-4.5 font-bold text-[#F5A623] cursor-pointer">
                  {b.name}
                </td>
                <td className="py-4.5 font-semibold text-slate-700">
                  {b.totalWorkers}
                </td>
                <td className="py-4.5">
                  <div className="flex items-center gap-3 max-w-xs">
                    {/* Dual-color Progress Bar */}
                    <div className="w-36 h-2.5 rounded-full overflow-hidden flex bg-slate-100">
                      <div
                        className="bg-[#7C5CFC] h-full transition-all duration-500"
                        style={{ width: `${b.employmentRatio}%` }}
                        title={`Employed: ${b.employmentRatio}%`}
                      />
                      <div
                        className="bg-[#FFB830] h-full transition-all duration-500"
                        style={{ width: `${100 - b.employmentRatio}%` }}
                        title={`Available: ${100 - b.employmentRatio}%`}
                      />
                    </div>
                    <span className="text-xs font-bold text-slate-700 w-9">
                      {b.employmentRatio}%
                    </span>
                  </div>
                </td>
                <td className="py-4.5 text-right">
                  <span className="inline-flex items-center px-3.5 py-1 rounded-full text-[11px] font-extrabold tracking-wider bg-[#10B981] text-white shadow-xs">
                    {b.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
