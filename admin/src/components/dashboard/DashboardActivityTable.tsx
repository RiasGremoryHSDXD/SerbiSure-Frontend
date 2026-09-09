import React, { useState } from 'react';
import { Search, Calendar, Filter, CheckCircle2, AlertTriangle, ShieldCheck, ArrowUpRight } from 'lucide-react';
import { useAdmin } from '../../context/AdminContext';

export const DashboardActivityTable: React.FC = () => {
  const { verifications, users, bookings, setActiveNav } = useAdmin();
  const [activeTab, setActiveTab] = useState<'DEPLOYMENTS' | 'VERIFICATIONS' | 'COMPLIANCE'>('DEPLOYMENTS');
  const [searchTerm, setSearchTerm] = useState('');

  return (
    <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-100/90 shadow-[0_4px_25px_rgba(0,0,0,0.02)]">
      {/* Top Tabs & Controls Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-slate-100">
        
        {/* Navigation Tabs with Underline */}
        <div className="flex items-center gap-6 overflow-x-auto text-sm font-bold">
          <button
            onClick={() => setActiveTab('DEPLOYMENTS')}
            className={`pb-2 transition-all relative whitespace-nowrap cursor-pointer ${
              activeTab === 'DEPLOYMENTS'
                ? 'text-[#0284C7] font-black'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <span>Placement & Bookings</span>
            {activeTab === 'DEPLOYMENTS' && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#0284C7] rounded-full" />
            )}
          </button>

          <button
            onClick={() => setActiveTab('VERIFICATIONS')}
            className={`pb-2 transition-all relative whitespace-nowrap cursor-pointer ${
              activeTab === 'VERIFICATIONS'
                ? 'text-[#0284C7] font-black'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <span>Recent Clearances ({verifications.length})</span>
            {activeTab === 'VERIFICATIONS' && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#0284C7] rounded-full" />
            )}
          </button>

          <button
            onClick={() => setActiveTab('COMPLIANCE')}
            className={`pb-2 transition-all relative whitespace-nowrap cursor-pointer ${
              activeTab === 'COMPLIANCE'
                ? 'text-[#0284C7] font-black'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <span>RA 10361 Compliance Capping</span>
            {activeTab === 'COMPLIANCE' && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#0284C7] rounded-full" />
            )}
          </button>
        </div>

        {/* Right Search & Filter Pill Buttons */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search records..."
              className="pl-9 pr-4 py-1.5 bg-slate-50 border border-slate-200/70 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0284C7]/20 focus:border-[#0284C7] transition-all"
            />
          </div>

          <div className="flex items-center gap-1 px-3 py-1.5 bg-slate-50 border border-slate-200/70 rounded-xl text-xs font-semibold text-slate-600">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <span>Aug 2026</span>
          </div>

          <button
            onClick={() => setActiveNav('verifications')}
            className="flex items-center gap-1 px-3 py-1.5 bg-[#FFF8EB] hover:bg-[#FFF2D6] text-[#B45309] rounded-xl text-xs font-bold transition-colors cursor-pointer border border-[#FEEBC8]"
          >
            <span>Full Queue</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Table Content */}
      <div className="overflow-x-auto mt-4">
        {activeTab === 'DEPLOYMENTS' && (
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="text-slate-400 font-bold uppercase tracking-wider text-[11px] border-b border-slate-100">
                <th className="pb-3 px-2">Contract ID</th>
                <th className="pb-3 px-2">Employer (Homeowner)</th>
                <th className="pb-3 px-2">Kasambahay</th>
                <th className="pb-3 px-2">Monthly Wage</th>
                <th className="pb-3 px-2">Contract Type</th>
                <th className="pb-3 px-2 text-right">Compliance Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {bookings.slice(0, 4).map((b) => (
                <tr key={b.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-3.5 px-2 font-mono font-bold text-slate-900">{b.id}</td>
                  <td className="py-3.5 px-2">
                    <div className="flex items-center gap-2">
                      <img src={b.homeownerAvatar} alt="" className="w-6 h-6 rounded-full object-cover" />
                      <span className="font-bold text-slate-900">{b.homeownerName}</span>
                    </div>
                  </td>
                  <td className="py-3.5 px-2">
                    <div className="flex items-center gap-2">
                      <img src={b.workerAvatar} alt="" className="w-6 h-6 rounded-full object-cover" />
                      <span>{b.workerName}</span>
                    </div>
                  </td>
                  <td className="py-3.5 px-2 font-bold font-mono text-slate-900">
                    ₱{b.offeredWage.toLocaleString()} / mo
                  </td>
                  <td className="py-3.5 px-2">
                    <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 text-[11px] font-bold">
                      {b.contractType}
                    </span>
                  </td>
                  <td className="py-3.5 px-2 text-right">
                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold ${
                      b.status === 'COMPLIANT'
                        ? 'bg-emerald-50 text-emerald-700'
                        : 'bg-amber-50 text-amber-700'
                    }`}>
                      {b.status === 'COMPLIANT' ? <CheckCircle2 className="w-3 h-3 text-emerald-600" /> : <AlertTriangle className="w-3 h-3 text-amber-600" />}
                      <span>{b.status}</span>
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {activeTab === 'VERIFICATIONS' && (
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="text-slate-400 font-bold uppercase tracking-wider text-[11px] border-b border-slate-100">
                <th className="pb-3 px-2">Applicant</th>
                <th className="pb-3 px-2">Document</th>
                <th className="pb-3 px-2">Barangay</th>
                <th className="pb-3 px-2">Submitted</th>
                <th className="pb-3 px-2 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {verifications.slice(0, 4).map((v) => (
                <tr key={v.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-3.5 px-2">
                    <div className="flex items-center gap-2">
                      <img src={v.avatar} alt="" className="w-6 h-6 rounded-full object-cover" />
                      <div>
                        <span className="font-bold text-slate-900 block">{v.name}</span>
                        <span className="text-[10px] text-slate-400 uppercase font-semibold">{v.role}</span>
                      </div>
                    </div>
                  </td>
                  <td className="py-3.5 px-2 font-mono text-slate-800">{v.documentType}</td>
                  <td className="py-3.5 px-2">{v.barangay}</td>
                  <td className="py-3.5 px-2 text-slate-500">{v.submittedDate}</td>
                  <td className="py-3.5 px-2 text-right">
                    <span className="px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 font-bold text-[11px]">
                      {v.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {activeTab === 'COMPLIANCE' && (
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="text-slate-400 font-bold uppercase tracking-wider text-[11px] border-b border-slate-100">
                <th className="pb-3 px-2">Rule / Statutory Area</th>
                <th className="pb-3 px-2">Threshold / Requirement</th>
                <th className="pb-3 px-2">Jurisdiction Status</th>
                <th className="pb-3 px-2 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              <tr className="hover:bg-slate-50/70 transition-colors">
                <td className="py-3.5 px-2 font-bold text-slate-900">RTWPB-10 Minimum Wage Guard</td>
                <td className="py-3.5 px-2">₱5,000 / mo baseline (CDO Rate)</td>
                <td className="py-3.5 px-2">
                  <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 font-bold rounded-full">100% Compliant</span>
                </td>
                <td className="py-3.5 px-2 text-right">
                  <span className="text-[#0284C7] font-bold cursor-pointer hover:underline">Inspect</span>
                </td>
              </tr>
              <tr className="hover:bg-slate-50/70 transition-colors">
                <td className="py-3.5 px-2 font-bold text-slate-900">Short-Term Booking Capping</td>
                <td className="py-3.5 px-2">Max 3 on-demand bookings / mo before formal contract</td>
                <td className="py-3.5 px-2">
                  <span className="px-2.5 py-1 bg-amber-50 text-amber-700 font-bold rounded-full">Active Enforced</span>
                </td>
                <td className="py-3.5 px-2 text-right">
                  <span className="text-[#0284C7] font-bold cursor-pointer hover:underline">Inspect</span>
                </td>
              </tr>
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};
