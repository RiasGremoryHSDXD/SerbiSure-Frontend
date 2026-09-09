import React from 'react';
import { 
  LayoutDashboard, 
  CheckCircle2, 
  Users, 
  Settings, 
  LogOut
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
    <aside className="w-68 bg-white flex flex-col justify-between p-6 h-screen sticky top-0 z-40 select-none shrink-0 overflow-y-auto">
      {/* Top Section */}
      <div className="flex flex-col gap-6">
        
        {/* Brand Header */}
        <div>
          <div className="flex items-center gap-3">
            <img 
              src="/serbisure_new_clean.png" 
              alt="SerbiSure Logo" 
              className="w-10 h-10 object-contain shrink-0"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).src = '/serbisure-logo.png';
              }}
            />
            <div>
              <span className="text-2xl font-black font-display text-[#0D0D11] tracking-tight block leading-tight">
                Serbi<span className="text-[#FFB380]">Sure</span><span className="text-[#FFB380]">.</span>
              </span>
              <span className="text-[10px] font-extrabold text-zinc-400 uppercase tracking-wider block font-display">
                {currentRole === 'SUPERADMIN' ? 'City Administration' : `Brgy. ${selectedBarangay}`}
              </span>
            </div>
          </div>
        </div>

        {/* Navigation Menu */}
        <nav className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeNav === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveNav(item.id)}
                className={`w-full flex items-center justify-between px-4 py-2.5 rounded-full text-[13px] font-bold font-display tracking-tight transition-all duration-150 cursor-pointer ${
                  isActive
                    ? 'bg-[#0D0D11] text-white'
                    : 'text-zinc-600 hover:bg-[#F6F5F2] hover:text-zinc-900'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-[#FFB380]' : 'text-zinc-400'}`} />
                  <span>{item.label}</span>
                </div>
                {item.badge !== undefined && item.badge > 0 && (
                  <span className={`px-2 py-0.5 text-[11px] rounded-full font-black ${
                    isActive ? 'bg-[#FFB380] text-white' : 'bg-zinc-100 text-zinc-700'
                  }`}>
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Bottom User Profile & Logout Box */}
      <div className="pt-3 mt-2">
        <div className="flex items-center justify-between p-2.5 rounded-3xl bg-[#F6F5F2]">
          <div className="flex items-center gap-2.5 min-w-0">
            <img
              src={currentUser?.avatar || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80"}
              alt="Admin Profile"
              className="w-9 h-9 rounded-full object-cover shrink-0"
            />
            <div className="min-w-0 truncate">
              <div className="text-xs font-black font-display text-zinc-900 truncate">
                {currentUser?.name || 'Administrator'}
              </div>
              <div className="text-[10px] text-zinc-400 truncate font-medium">
                @{currentUser?.username || 'admin'}
              </div>
            </div>
          </div>

          <button
            onClick={logout}
            title="Log Out"
            className="p-2 text-zinc-400 hover:text-rose-600 hover:bg-white rounded-full transition-colors cursor-pointer shrink-0 ml-1"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
};
