import React from 'react';
import { Shield, Lock, Database, RefreshCw } from 'lucide-react';
import { useAdmin } from '../context/AdminContext';

export const SettingsPage: React.FC = () => {
  const { currentRole, selectedBarangay } = useAdmin();

  const auditLogs = [
    {
      id: 'log-1',
      admin: 'Daven Sumagang (Superadmin)',
      action: 'Verified Police Clearance for Angelli Gonzales',
      target: 'usr-101',
      timestamp: 'Aug 17, 2026 10:30 PM',
      ip: '120.29.74.19 (CDO)',
    },
    {
      id: 'log-2',
      admin: 'Barangay Officer (Pagatpat)',
      action: 'Accessed Kasambahay Masterlist KR Form 1',
      target: 'DILG Report Export',
      timestamp: 'Aug 17, 2026 09:15 PM',
      ip: '112.198.67.82 (CDO)',
    },
    {
      id: 'log-3',
      admin: 'Daven Sumagang (Superadmin)',
      action: 'Triggered RA 10361 Throttling Review on bk-501',
      target: 'bk-501',
      timestamp: 'Aug 17, 2026 08:45 PM',
      ip: '120.29.74.19 (CDO)',
    },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      <div>
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
          Settings
        </h1>
      </div>

      {/* System Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-xs space-y-2">
          <div className="flex items-center gap-2 text-[#F5A623] font-bold text-xs uppercase tracking-wider">
            <Database className="w-4 h-4" />
            <span>Backend Engine</span>
          </div>
          <div className="text-xl font-extrabold text-slate-900">Django REST API</div>
          <div className="text-xs text-slate-500">PostgreSQL (Neon) + Cloudinary Storage</div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-xs space-y-2">
          <div className="flex items-center gap-2 text-purple-600 font-bold text-xs uppercase tracking-wider">
            <Shield className="w-4 h-4" />
            <span>Active Perspective</span>
          </div>
          <div className="text-xl font-extrabold text-slate-900">{currentRole}</div>
          <div className="text-xs text-slate-500">Jurisdiction: {currentRole === 'SUPERADMIN' ? 'City of CDO' : `Brgy. ${selectedBarangay}`}</div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-xs space-y-2">
          <div className="flex items-center gap-2 text-emerald-600 font-bold text-xs uppercase tracking-wider">
            <Lock className="w-4 h-4" />
            <span>Biometric Liveness</span>
          </div>
          <div className="text-xl font-extrabold text-slate-900">MediaPipe Ready</div>
          <div className="text-xs text-slate-500">Dual-layer Anti-Spoofing Enabled</div>
        </div>
      </div>

      {/* RA 10173 Audit Logs Table */}
      <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-[0_4px_25px_rgba(0,0,0,0.02)] space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-lg font-bold text-slate-800 tracking-tight">
              Administrative Access & PII Inspection Logs
            </h4>
            <p className="text-xs text-slate-500">
              Complies with National Privacy Commission (NPC) compliance directives.
            </p>
          </div>
          <button 
            onClick={() => alert('Audit logs refreshed.')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-700 cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh</span>
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
                <th className="py-3 font-bold">Admin Officer</th>
                <th className="py-3 font-bold">Action Performed</th>
                <th className="py-3 font-bold">Timestamp</th>
                <th className="py-3 font-bold text-right">IP & Location</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 text-xs font-medium text-slate-700">
              {auditLogs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50/60">
                  <td className="py-3.5 font-bold text-slate-900">{log.admin}</td>
                  <td className="py-3.5 font-semibold text-[#F5A623]">{log.action}</td>
                  <td className="py-3.5 text-slate-500">{log.timestamp}</td>
                  <td className="py-3.5 text-right font-mono text-[11px] text-slate-400">{log.ip}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
