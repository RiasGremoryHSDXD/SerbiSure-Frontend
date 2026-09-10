import React, { useState } from 'react';
import { Search, Calendar, CheckCircle2, AlertTriangle, ArrowUpRight } from 'lucide-react';
import { useAdmin } from '../../context/AdminContext';

export const DashboardActivityTable: React.FC = () => {
  const { verifications, bookings, setActiveNav, currentRole, selectedBarangay } = useAdmin();
  const [activeTab, setActiveTab] = useState<'DEPLOYMENTS' | 'VERIFICATIONS' | 'COMPLIANCE'>('DEPLOYMENTS');
  const [searchTerm, setSearchTerm] = useState('');

  // Scope to assigned barangay if logged in as local LGU officer
  const scopedVerifications = (currentRole === 'ADMIN' && selectedBarangay)
    ? verifications.filter(v => (v.barangay || '').toLowerCase() === selectedBarangay.toLowerCase())
    : verifications;

  const scopedBookings = (currentRole === 'ADMIN' && selectedBarangay)
    ? bookings.filter(b => (b.barangay || '').toLowerCase() === selectedBarangay.toLowerCase())
    : bookings;

  return (
    <div className="bg-white rounded-3xl p-6 sm:p-7">
      {/* Top Tabs & Controls Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5">
        
        {/* Navigation Tabs with Pills */}
        <div className="flex items-center gap-2 overflow-x-auto text-xs font-extrabold font-display pb-1">
          <button
            onClick={() => setActiveTab('DEPLOYMENTS')}
            className={`px-5 py-2.5 rounded-full transition-all whitespace-nowrap shrink-0 cursor-pointer ${
              activeTab === 'DEPLOYMENTS'
                ? 'bg-[#0D0D11] text-white font-black'
                : 'bg-[#F0F0EC] text-zinc-600 hover:bg-[#EAEAE5] hover:text-zinc-900'
            }`}
          >
            Placement & Bookings
          </button>

          <button
            onClick={() => setActiveTab('VERIFICATIONS')}
            className={`px-5 py-2.5 rounded-full transition-all whitespace-nowrap shrink-0 cursor-pointer ${
              activeTab === 'VERIFICATIONS'
                ? 'bg-[#0D0D11] text-white font-black'
                : 'bg-[#F0F0EC] text-zinc-600 hover:bg-[#EAEAE5] hover:text-zinc-900'
            }`}
          >
            Recent Clearances ({scopedVerifications.length})
          </button>

          <button
            onClick={() => setActiveTab('COMPLIANCE')}
            className={`px-5 py-2.5 rounded-full transition-all whitespace-nowrap shrink-0 cursor-pointer ${
              activeTab === 'COMPLIANCE'
                ? 'bg-[#0D0D11] text-white font-black'
                : 'bg-[#F0F0EC] text-zinc-600 hover:bg-[#EAEAE5] hover:text-zinc-900'
            }`}
          >
            RA 10361 Compliance Capping
          </button>
        </div>

        {/* Right Search & Filter Pill Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search records..."
              className="pl-9 pr-4 py-1.5 bg-[#F0F0EC] hover:bg-[#EAEAE5] focus:bg-white rounded-full text-xs font-medium text-zinc-800 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-[#FFB380]/40 transition-all"
            />
          </div>

          <div className="flex items-center gap-1.5 px-3.5 py-1.5 bg-[#F0F0EC] rounded-full text-xs font-bold text-zinc-700">
            <Calendar className="w-3.5 h-3.5 text-[#FFB380]" />
            <span>Aug 2026</span>
          </div>

          <button
            onClick={() => setActiveNav('verifications')}
            className="flex items-center gap-1 px-4 py-1.5 bg-[#FFB380] hover:bg-[#F5A066] text-white rounded-full text-xs font-black font-display transition-transform active:scale-95 cursor-pointer"
          >
            <span>Full Queue</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Table Content */}
      <div className="overflow-x-auto mt-2">
        {activeTab === 'DEPLOYMENTS' && (
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="text-zinc-400 font-extrabold font-display uppercase tracking-wider text-[11px]">
                <th className="pb-3 px-3">Employer</th>
                <th className="pb-3 px-3">Kasambahay</th>
                <th className="pb-3 px-3">Monthly Wage</th>
                <th className="pb-3 px-3">Contract Type</th>
                <th className="pb-3 px-3 text-right">Compliance</th>
              </tr>
            </thead>
            <tbody className="font-medium text-zinc-700">
              {scopedBookings.slice(0, 4).map((b) => (
                <tr key={b.id} className="hover:bg-[#F6F5F2] rounded-2xl transition-colors">
                  <td className="py-3 px-3 rounded-l-2xl">
                    <div className="flex items-center gap-2.5">
                      <img src={b.homeownerAvatar} alt="" className="w-7 h-7 rounded-full object-cover" />
                      <span className="font-bold text-zinc-900 font-display">{b.homeownerName}</span>
                    </div>
                  </td>
                  <td className="py-3 px-3">
                    <div className="flex items-center gap-2.5">
                      <img src={b.workerAvatar} alt="" className="w-7 h-7 rounded-full object-cover" />
                      <span className="font-semibold text-zinc-800">{b.workerName}</span>
                    </div>
                  </td>
                  <td className="py-3 px-3 font-black font-display text-zinc-900">
                    ₱{b.offeredWage.toLocaleString()} / mo
                  </td>
                  <td className="py-3 px-3">
                    <span className="px-3 py-1 rounded-full bg-zinc-100 text-zinc-800 text-[11px] font-bold">
                      {b.contractType}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-right rounded-r-2xl">
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold ${
                      b.status === 'COMPLIANT'
                        ? 'bg-emerald-50 text-emerald-700'
                        : 'bg-amber-50 text-amber-700'
                    }`}>
                      {b.status === 'COMPLIANT' ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> : <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />}
                      <span>{b.status === 'COMPLIANT' ? 'Compliant' : 'Flagged'}</span>
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
              <tr className="text-zinc-400 font-extrabold font-display uppercase tracking-wider text-[11px]">
                <th className="pb-3 px-3">Applicant</th>
                <th className="pb-3 px-3">Document</th>
                <th className="pb-3 px-3">Barangay</th>
                <th className="pb-3 px-3">Submitted</th>
                <th className="pb-3 px-3 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="font-medium text-zinc-700">
              {scopedVerifications.slice(0, 4).map((v) => (
                <tr key={v.id} className="hover:bg-[#F6F5F2] rounded-2xl transition-colors">
                  <td className="py-3 px-3 rounded-l-2xl">
                    <div className="flex items-center gap-2.5">
                      <img src={v.avatar} alt="" className="w-7 h-7 rounded-full object-cover" />
                      <div>
                        <span className="font-bold font-display text-zinc-900 block">{v.name}</span>
                        <span className="text-[10px] text-zinc-400 uppercase font-semibold">{v.role}</span>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-3 font-semibold text-zinc-800">{v.documentType}</td>
                  <td className="py-3 px-3">{v.barangay}</td>
                  <td className="py-3 px-3 text-zinc-400">{v.submittedDate}</td>
                  <td className="py-3 px-3 text-right rounded-r-2xl">
                    <span className={`px-3 py-1 rounded-full text-[11px] font-bold ${
                      v.status === 'VERIFIED'
                        ? 'bg-emerald-50 text-emerald-700'
                        : v.status === 'REJECTED'
                        ? 'bg-rose-50 text-rose-700'
                        : 'bg-amber-50 text-amber-800'
                    }`}>
                      {v.status === 'PENDING / REVIEW' ? 'In Review' : v.status}
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
              <tr className="text-zinc-400 font-extrabold font-display uppercase tracking-wider text-[11px]">
                <th className="pb-3 px-3">Rule / Statutory Area</th>
                <th className="pb-3 px-3">Threshold / Requirement</th>
                <th className="pb-3 px-3">Jurisdiction Status</th>
                <th className="pb-3 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="font-medium text-zinc-700">
              <tr className="hover:bg-[#F6F5F2] rounded-2xl transition-colors">
                <td className="py-3 px-3 font-bold font-display text-zinc-900">RTWPB-10 Minimum Wage Guard</td>
                <td className="py-3 px-3">₱5,000 / mo baseline (CDO Rate)</td>
                <td className="py-3 px-3">
                  <span className="px-3 py-1 bg-emerald-50 text-emerald-700 font-extrabold rounded-full">100% Compliant</span>
                </td>
                <td className="py-3 px-3 text-right">
                  <span className="text-[#FFB380] font-black font-display cursor-pointer hover:underline">Inspect</span>
                </td>
              </tr>
              <tr className="hover:bg-[#F6F5F2] rounded-2xl transition-colors">
                <td className="py-3 px-3 font-bold font-display text-zinc-900">Short-Term Booking Capping</td>
                <td className="py-3 px-3">Max 3 on-demand bookings / mo before formal contract</td>
                <td className="py-3 px-3">
                  <span className="px-3 py-1 bg-[#FFF4ED] text-[#FFB380] font-extrabold rounded-full">Active Enforced</span>
                </td>
                <td className="py-3 px-3 text-right">
                  <span className="text-[#FFB380] font-black font-display cursor-pointer hover:underline">Inspect</span>
                </td>
              </tr>
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};
