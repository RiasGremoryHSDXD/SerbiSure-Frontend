import React from 'react';
import { 
  LayoutDashboard, 
  CheckCircle2, 
  Users, 
  Settings, 
  LogOut, 
  Info,
  MapPin,
  ShieldCheck
} from 'lucide-react';
import { useAdmin } from '../../context/AdminContext';

export const Sidebar: React.FC = () => {
  const { currentRole, selectedBarangay, activeNav, setActiveNav, verifications, currentUser, logout } = useAdmin();

  const pendingCount = verifications.filter(v => v.status === 'PENDING / REVIEW').length;

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'verifications', label: 'Verifications', icon: CheckCircle2, badge: pendingCount },
    { id: 'users', label: 'Users', icon: Users },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <aside className="w-64 bg-white border-r border-slate-100/90 flex flex-col justify-between p-5 h-screen sticky top-0 z-40 select-none shrink-0 overflow-y-auto">
      {/* Top Section */}
      <div className="flex flex-col gap-6">
        
        {/* Brand Header */}
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 flex items-center justify-center shrink-0">
              <img 
                src="/serbisure-logo.png" 
                alt="SerbiSure Logo" 
                className="w-9 h-9 object-contain drop-shadow-sm"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
            </div>
            <div>
              <span className="text-2xl font-black text-[#F5A623] tracking-tight block leading-tight">
                Serbisure
              </span>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                {currentRole === 'SUPERADMIN' ? 'City Administration' : `Brgy. ${selectedBarangay}`}
              </span>
            </div>
          </div>

          {/* Barangay Tag (for Barangay Admin mode) */}
          {currentRole === 'ADMIN' && (
            <div className="mt-2.5 inline-flex items-center gap-1.5 px-2.5 py-1 bg-[#FFF7E6] text-[#D97706] rounded-full text-xs font-semibold w-fit border border-[#FDE68A]/60">
              <MapPin className="w-3.5 h-3.5" />
              <span>{selectedBarangay}, CDO</span>
            </div>
          )}
        </div>

        {/* Navigation Menu */}
        <nav className="space-y-1.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeNav === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveNav(item.id)}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-[14px] font-bold transition-all duration-150 cursor-pointer ${
                  isActive
                    ? 'bg-[#FFF3D6] text-[#B45309] shadow-xs'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-4.5 h-4.5 ${isActive ? 'text-[#F5A623]' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </div>
                {item.badge !== undefined && item.badge > 0 && (
                  <span className={`px-2 py-0.5 text-xs rounded-full font-extrabold ${
                    isActive ? 'bg-[#F5A623] text-white' : 'bg-slate-100 text-slate-600'
                  }`}>
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Compact Verification Guide Callout */}
        <div className="p-3 bg-[#FFF8EB] rounded-2xl border border-[#FEEBC8] text-xs text-slate-700">
          <div className="flex items-center gap-1.5 font-bold text-[#C05621] mb-1">
            <Info className="w-3.5 h-3.5 text-[#DD6B20] shrink-0" />
            <span className="text-[11px] uppercase tracking-wider">Verification Guide</span>
          </div>
          <p className="text-[11px] leading-relaxed text-slate-600">
            Ensure documents are valid & match profile face scan before approving.
          </p>
        </div>
      </div>

      {/* Bottom User Profile & Logout Box */}
      <div className="pt-3 border-t border-slate-100 mt-2">
        <div className="flex items-center justify-between p-2 rounded-2xl bg-slate-50 border border-slate-100">
          <div className="flex items-center gap-2.5 min-w-0">
            <img
              src={currentUser?.avatar || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80"}
              alt="Admin Profile"
              className="w-9 h-9 rounded-full object-cover ring-2 ring-[#FFB830]/40 shrink-0"
            />
            <div className="min-w-0 truncate">
              <div className="text-xs font-bold text-slate-800 truncate">
                {currentUser?.name || 'Administrator'}
              </div>
              <div className="text-[10px] text-slate-400 truncate font-mono">
                @{currentUser?.username || 'admin'}
              </div>
            </div>
          </div>

          <button
            onClick={logout}
            title="Logout Portal"
            className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer shrink-0 ml-1"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
};
