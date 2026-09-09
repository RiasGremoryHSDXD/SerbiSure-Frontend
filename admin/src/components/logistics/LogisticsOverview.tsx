import React from 'react';
import { AlertTriangle, CheckCircle2, FileCheck, Scale } from 'lucide-react';
import { useAdmin } from '../../context/AdminContext';

export const LogisticsOverview: React.FC = () => {
  const { bookings } = useAdmin();

  return (
    <div className="space-y-8">
      {/* Compliance Overview Banner */}
      <div className="bg-linear-to-r from-[#FFF9ED] via-white to-[#F6F8FD] p-8 rounded-3xl border border-[#FEEBC8] shadow-[0_4px_25px_rgba(0,0,0,0.02)] flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#FFF0D4] text-[#C05621] rounded-full text-xs font-black uppercase tracking-wider">
            <Scale className="w-4 h-4" />
            <span>Republic Act No. 10361 Compliance Engine</span>
          </div>
          <h3 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Logistics & Labor Misclassification Safeguards
          </h3>
          <p className="text-xs text-slate-600 max-w-2xl leading-relaxed">
            SerbiSure automatically enforces a hard limit of <strong>3 short-term bookings per month</strong> between any employer-worker pair to prevent statutory benefit evasion.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <div className="p-4 bg-white rounded-2xl border border-slate-200 text-center shadow-xs">
            <div className="text-2xl font-black text-[#D97706]">1</div>
            <div className="text-[10px] font-bold text-slate-500 uppercase">Throttled Pair</div>
          </div>
          <div className="p-4 bg-white rounded-2xl border border-slate-200 text-center shadow-xs">
            <div className="text-2xl font-black text-emerald-600">100%</div>
            <div className="text-[10px] font-bold text-slate-500 uppercase">Wage Compliance</div>
          </div>
        </div>
      </div>

      {/* Bookings & Compliance Table */}
      <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-[0_4px_25px_rgba(0,0,0,0.02)] space-y-6">
        <h4 className="text-lg font-bold text-slate-800 tracking-tight">
          Active Hiring Pipelines & Compliance Tracking
        </h4>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
                <th className="py-4 font-bold">Employer & Worker</th>
                <th className="py-4 font-bold">Category</th>
                <th className="py-4 font-bold">Monthly Frequency</th>
                <th className="py-4 font-bold">Wage & RTWPB-10</th>
                <th className="py-4 font-bold">Statutory Benefits</th>
                <th className="py-4 font-bold text-right">Logistics Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 text-xs">
              {bookings.map((b) => (
                <tr key={b.id} className="hover:bg-[#FFFDF8] transition-colors">
                  {/* Employer & Worker */}
                  <td className="py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex -space-x-2 overflow-hidden">
                        <img
                          src={b.homeownerAvatar}
                          alt={b.homeownerName}
                          className="inline-block h-8 w-8 rounded-full ring-2 ring-white object-cover"
                          title={`Homeowner: ${b.homeownerName}`}
                        />
                        <img
                          src={b.workerAvatar}
                          alt={b.workerName}
                          className="inline-block h-8 w-8 rounded-full ring-2 ring-white object-cover"
                          title={`Kasambahay: ${b.workerName}`}
                        />
                      </div>
                      <div>
                        <div className="font-bold text-slate-900">
                          {b.homeownerName} <span className="text-slate-400 font-normal">→</span> {b.workerName}
                        </div>
                        <div className="text-[10px] text-slate-500">
                          Started: {b.startDate}
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* Category */}
                  <td className="py-4 font-semibold text-slate-700">
                    <div>{b.serviceCategory}</div>
                    <span className="text-[10px] font-bold text-[#F5A623]">
                      {b.contractType}
                    </span>
                  </td>

                  {/* Monthly Frequency */}
                  <td className="py-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-slate-800">
                          {b.monthlyBookingsCount} / 3
                        </span>
                        {b.isCapped ? (
                          <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 text-[10px] font-bold">
                            Capped
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                            Within Limit
                          </span>
                        )}
                      </div>
                      <div className="w-24 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                        <div
                          className={`h-full ${
                            b.monthlyBookingsCount >= 3 ? 'bg-amber-500' : 'bg-emerald-500'
                          }`}
                          style={{ width: `${(b.monthlyBookingsCount / 3) * 100}%` }}
                        />
                      </div>
                    </div>
                  </td>

                  {/* Wage & Baseline */}
                  <td className="py-4">
                    <div>
                      <span className="font-bold text-slate-900">
                        ₱{b.offeredWage.toLocaleString()}
                      </span>
                      <span className="text-slate-400 text-[10px]">
                        {' '}/ {b.contractType.includes('Long-Term') ? 'mo' : 'day'}
                      </span>
                    </div>
                    <div className="text-[10px] text-emerald-600 font-semibold flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      <span>Above RTWPB-10 baseline (₱{b.minimumWageBaseline})</span>
                    </div>
                  </td>

                  {/* Statutory Benefits */}
                  <td className="py-4">
                    <div className="flex items-center gap-1.5">
                      {['SSS', 'PhilHealth', 'Pag-IBIG', '13th Mo'].map((item) => (
                        <span
                          key={item}
                          className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded text-[10px] font-bold"
                        >
                          {item}
                        </span>
                      ))}
                    </div>
                  </td>

                  {/* Status */}
                  <td className="py-4 text-right">
                    {b.status === 'FLAGGED_THROTTLED' ? (
                      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-black bg-amber-100 text-amber-900">
                        <AlertTriangle className="w-3 h-3 text-amber-600" />
                        <span>MANDATORY CONTRACT LOCK</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800">
                        <FileCheck className="w-3 h-3 text-emerald-600" />
                        <span>COMPLIANT</span>
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
