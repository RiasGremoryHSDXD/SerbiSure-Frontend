import React, { useState } from 'react';
import { Search, ChevronDown, Check, Building2, Shield, LogOut } from 'lucide-react';
import { useAdmin } from '../../context/AdminContext';
import { AdminRole } from '../../types/admin';

export const Header: React.FC = () => {
  const { currentRole, setCurrentRole, selectedBarangay, setSelectedBarangay, barangays, searchQuery, setSearchQuery, currentUser, logout } = useAdmin();
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const toggleRole = (role: AdminRole, brgy?: string) => {
    setCurrentRole(role);
    if (brgy) {
      setSelectedBarangay(brgy);
    }
    setDropdownOpen(false);
  };

  return (
    <header className="h-20 bg-white border-b border-slate-100 px-8 flex items-center justify-between sticky top-0 z-30">
      {/* Search Input Bar */}
      <div className="relative w-full max-w-lg">
        <Search className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search users, status, documents ..."
          className="w-full pl-12 pr-4 py-2.5 bg-[#F8F9FC] border border-slate-200/70 rounded-full text-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#F5A623]/30 focus:border-[#F5A623] transition-all"
        />
      </div>

      {/* Right Controls: Role Badge & Admin Profile */}
      <div className="flex items-center gap-4 relative">
        {/* Interactive Role Switcher Pill */}
        <div className="relative">
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-2 px-5 py-2 bg-[#FFB830] hover:bg-[#FFA800] text-white rounded-full text-xs font-black tracking-wider uppercase shadow-xs transition-all cursor-pointer"
            title="Click to switch role / jurisdiction"
          >
            <span>{currentRole}</span>
            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
          </button>

          {/* Role Switching Dropdown Modal */}
          {dropdownOpen && (
            <div className="absolute right-0 mt-3 w-72 bg-white rounded-2xl shadow-xl border border-slate-100 p-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
              <div className="px-3 py-2 border-b border-slate-100 mb-1">
                <div className="text-xs font-bold text-slate-900">{currentUser?.name || 'Administrator'}</div>
                <div className="text-[11px] text-slate-500 font-mono">@{currentUser?.username || 'admin'} • {currentRole}</div>
              </div>

              <div className="px-3 py-1.5 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Switch Perspective
              </div>
              
              <button
                onClick={() => toggleRole('SUPERADMIN')}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-left text-xs font-bold transition-colors cursor-pointer ${
                  currentRole === 'SUPERADMIN' ? 'bg-[#FFF7E6] text-[#D97706]' : 'text-slate-700 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Shield className="w-4 h-4 text-[#F5A623]" />
                  <div>
                    <div className="font-bold">Superadmin</div>
                    <div className="text-[10px] font-normal text-slate-500">Cagayan de Oro City (All Barangays)</div>
                  </div>
                </div>
                {currentRole === 'SUPERADMIN' && <Check className="w-4 h-4 text-[#D97706]" />}
              </button>

              <div className="my-1 border-t border-slate-100" />
              <div className="px-3 py-1.5 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Barangay LGU Portals
              </div>

              {barangays.map((b) => (
                <button
                  key={b.name}
                  onClick={() => toggleRole('ADMIN', b.name)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-left text-xs transition-colors cursor-pointer ${
                    currentRole === 'ADMIN' && selectedBarangay === b.name
                      ? 'bg-[#FFF7E6] text-[#D97706] font-bold'
                      : 'text-slate-700 hover:bg-slate-50 font-medium'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Building2 className="w-4 h-4 text-slate-400" />
                    <span>Brgy. {b.name}, CDO</span>
                  </div>
                  {currentRole === 'ADMIN' && selectedBarangay === b.name && (
                    <Check className="w-4 h-4 text-[#D97706]" />
                  )}
                </button>
              ))}

              <div className="my-1 border-t border-slate-100" />
              <button
                onClick={() => {
                  setDropdownOpen(false);
                  logout();
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left text-xs font-bold text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
              >
                <LogOut className="w-4 h-4 text-rose-500" />
                <span>Logout Portal</span>
              </button>
            </div>
          )}
        </div>

        {/* Admin Avatar */}
        <div className="relative group cursor-pointer" onClick={() => setDropdownOpen(!dropdownOpen)}>
          <img
            src={currentUser?.avatar || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80"}
            alt="Admin Profile"
            className="w-10 h-10 rounded-full object-cover ring-2 ring-[#FFB830]/40 shadow-xs"
          />
        </div>
      </div>
    </header>
  );
};
