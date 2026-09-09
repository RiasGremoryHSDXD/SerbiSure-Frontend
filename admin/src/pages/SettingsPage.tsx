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
        <h1 className="text-3xl font-black font-display text-[#0D0D11] tracking-tight">
          Settings
        </h1>
        <p className="text-xs text-zinc-400 font-medium mt-1">
          System infrastructure, role jurisdiction, and data privacy compliance audit logs
        </p>
      </div>

      {/* System Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-3xl space-y-2">
          <div className="flex items-center gap-2 text-[#FFB380] font-black font-display text-xs uppercase tracking-wider">
            <Database className="w-4 h-4" />
            <span>Backend Engine</span>
          </div>
          <div className="text-xl font-black font-display text-[#0D0D11]">Django REST API</div>
          <div className="text-xs text-zinc-400 font-medium">PostgreSQL (Neon) + Cloudinary Storage</div>
        </div>

        <div className="bg-white p-6 rounded-3xl space-y-2">
          <div className="flex items-center gap-2 text-[#0D0D11] font-black font-display text-xs uppercase tracking-wider">
            <Shield className="w-4 h-4 text-[#FFB380]" />
            <span>Active Perspective</span>
          </div>
          <div className="text-xl font-black font-display text-[#0D0D11]">{currentRole}</div>
          <div className="text-xs text-zinc-400 font-medium">Jurisdiction: {currentRole === 'SUPERADMIN' ? 'City of CDO' : `Brgy. ${selectedBarangay}`}</div>
        </div>

        <div className="bg-white p-6 rounded-3xl space-y-2">
          <div className="flex items-center gap-2 text-emerald-600 font-black font-display text-xs uppercase tracking-wider">
            <Lock className="w-4 h-4" />
            <span>Biometric Liveness</span>
          </div>
          <div className="text-xl font-black font-display text-[#0D0D11]">MediaPipe Ready</div>
          <div className="text-xs text-zinc-400 font-medium">Dual-layer Anti-Spoofing Enabled</div>
        </div>
      </div>

      {/* RA 10173 Audit Logs Table */}
      <div className="bg-white rounded-3xl p-8 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-lg font-black font-display text-[#0D0D11] tracking-tight">
              Administrative Access & PII Inspection Logs
            </h4>
            <p className="text-xs text-zinc-400 font-medium mt-0.5">
              Complies with National Privacy Commission (NPC) RA 10173 directives.
            </p>
          </div>
          <button 
            onClick={() => alert('Audit logs refreshed.')}
            className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#F0F0EC] hover:bg-[#E5E5E0] text-xs font-black font-display text-zinc-800 cursor-pointer border-0"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh</span>
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="text-[11px] font-black uppercase tracking-wider text-zinc-400 font-display">
                <th className="py-3 px-3">Admin Officer</th>
                <th className="py-3 px-3">Action Performed</th>
                <th className="py-3 px-3">Timestamp</th>
                <th className="py-3 px-3 text-right">IP & Location</th>
              </tr>
            </thead>
            <tbody className="text-xs space-y-1">
              {auditLogs.map((log) => (
                <tr key={log.id} className="hover:bg-[#F6F5F2] transition-colors">
                  <td className="py-3.5 px-3 font-black font-display text-[#0D0D11] rounded-l-2xl">{log.admin}</td>
                  <td className="py-3.5 px-3 font-bold text-[#FFB380]">{log.action}</td>
                  <td className="py-3.5 px-3 text-zinc-500 font-medium">{log.timestamp}</td>
                  <td className="py-3.5 px-3 text-right font-mono text-[11px] text-zinc-400 rounded-r-2xl">{log.ip}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
