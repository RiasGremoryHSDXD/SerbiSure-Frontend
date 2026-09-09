import React, { useState } from 'react';
import { ChevronDown, FileText } from 'lucide-react';
import { useAdmin } from '../../context/AdminContext';
import { AccountRole } from '../../types/admin';

export const VerificationQueue: React.FC = () => {
  const { verifications, selectedVerificationId, setSelectedVerificationId } = useAdmin();
  const [roleFilter, setRoleFilter] = useState<'ALL' | AccountRole>('ALL');
  const [sortOrder, setSortOrder] = useState<'RECENT' | 'OLDEST'>('RECENT');

  const filteredVerifications = verifications
    .filter(v => {
      if (roleFilter === 'ALL') return true;
      return v.role === roleFilter;
    })
    .sort((a, b) => {
      if (sortOrder === 'RECENT') return b.id.localeCompare(a.id);
      return a.id.localeCompare(b.id);
    });

  return (
    <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-[0_4px_25px_rgba(0,0,0,0.02)] h-full">
      {/* Header with Filters */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-6 gap-4 border-b border-slate-100">
        <h3 className="text-xl font-bold text-slate-800 tracking-tight">
          Active Requests
        </h3>

        <div className="flex items-center gap-3">
          {/* Role Filter Dropdown */}
          <div className="relative">
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value as any)}
              className="appearance-none bg-[#FFF8EB] border border-[#FEEBC8] text-[#C05621] text-xs font-bold py-2 pl-4 pr-9 rounded-full cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#F5A623]/30"
            >
              <option value="ALL">All Roles</option>
              <option value="KASAMBAHAY">Kasambahay</option>
              <option value="HOMEOWNER">Homeowner</option>
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-[#C05621] absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Sort Order Dropdown */}
          <div className="relative">
            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value as any)}
              className="appearance-none bg-[#FFF8EB] border border-[#FEEBC8] text-[#C05621] text-xs font-bold py-2 pl-4 pr-9 rounded-full cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#F5A623]/30"
            >
              <option value="RECENT">Recent First</option>
              <option value="OLDEST">Oldest First</option>
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-[#C05621] absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Requests Table */}
      <div className="overflow-x-auto mt-4">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-100 text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
              <th className="py-4 font-bold">User & Role</th>
              <th className="py-4 font-bold">Document</th>
              <th className="py-4 font-bold">Submitted</th>
              <th className="py-4 font-bold text-right">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50 text-xs">
            {filteredVerifications.map((item) => {
              const isSelected = selectedVerificationId === item.id;
              return (
                <tr
                  key={item.id}
                  onClick={() => setSelectedVerificationId(item.id)}
                  className={`cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-[#FFF9EC] border-l-4 border-l-[#F5A623]'
                      : 'hover:bg-slate-50/70'
                  }`}
                >
                  {/* User & Role */}
                  <td className="py-3.5 px-3">
                    <div className="flex items-center gap-3">
                      <img
                        src={item.avatar}
                        alt={item.name}
                        className="w-9 h-9 rounded-full object-cover shadow-2xs shrink-0"
                      />
                      <div>
                        <div className="font-bold text-slate-900 text-sm">
                          {item.name}
                        </div>
                        <span
                          className={`inline-block text-[10px] font-black uppercase px-2 py-0.5 rounded-full mt-0.5 ${
                            item.role === 'KASAMBAHAY'
                              ? 'bg-purple-100 text-[#7C5CFC]'
                              : 'bg-emerald-100 text-emerald-700'
                          }`}
                        >
                          {item.role}
                        </span>
                      </div>
                    </div>
                  </td>

                  {/* Document Type */}
                  <td className="py-3.5 px-3">
                    <div className="flex items-center gap-2 font-semibold text-slate-700">
                      <FileText className="w-4 h-4 text-slate-400" />
                      <span>{item.documentType}</span>
                    </div>
                  </td>

                  {/* Submitted Date */}
                  <td className="py-3.5 px-3 text-slate-600 font-medium">
                    {item.submittedDate}
                  </td>

                  {/* Status Pill */}
                  <td className="py-3.5 px-3 text-right">
                    <span
                      className={`inline-flex items-center px-3 py-1 rounded-full text-[10px] font-black tracking-wider ${
                        item.status === 'VERIFIED'
                          ? 'bg-emerald-500 text-white'
                          : item.status === 'REJECTED'
                          ? 'bg-red-500 text-white'
                          : 'bg-[#FFF3D6] text-[#D97706]'
                      }`}
                    >
                      {item.status}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
