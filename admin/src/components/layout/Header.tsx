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
    <header className="h-20 bg-white/80 backdrop-blur-md px-8 flex items-center justify-between sticky top-0 z-30">
      {/* Search Input Bar */}
      <div className="relative w-full max-w-md">
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-zinc-400">
          <Search className="w-4 h-4" />
        </div>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search workers, records, verifications..."
          className="w-full pl-11 pr-4 py-2.5 bg-[#F0F0EC] hover:bg-[#E8E8E3] focus:bg-white rounded-full text-xs font-medium text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-[#0D0D11]/15 transition-all border-0"
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => setSearchQuery('')}
            className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-zinc-400 hover:text-zinc-600 cursor-pointer"
          >
            <span className="w-4 h-4 rounded-full bg-zinc-300 hover:bg-zinc-400 text-white flex items-center justify-center text-[10px] font-bold">✕</span>
          </button>
        )}
      </div>

      {/* Right Controls: Role Badge & Admin Profile */}
      <div className="flex items-center gap-3 relative">
        {/* Interactive Role Switcher Pill */}
        <div className="relative">
          {currentUser?.role === 'SUPERADMIN' ? (
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="flex items-center gap-2 px-5 py-2 bg-[#0D0D11] hover:bg-black text-white rounded-full text-xs font-extrabold tracking-tight transition-all cursor-pointer"
              title="Click to switch perspective / jurisdiction"
            >
              <Shield className="w-3.5 h-3.5 text-[#FFB380]" />
              <span className="font-display font-black tracking-wider uppercase text-[11px]">
                {currentRole === 'SUPERADMIN' ? 'SUPERADMIN' : `BRGY. ${selectedBarangay}`}
              </span>
              <ChevronDown className={`w-3.5 h-3.5 text-zinc-400 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
            </button>
          ) : (
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="flex items-center gap-2 px-4 py-2 bg-[#F0F0EC] hover:bg-[#EAEAE5] text-zinc-800 rounded-full text-xs font-bold tracking-tight transition-all cursor-pointer"
              title={`Authorized LGU Officer of Brgy. ${currentUser?.barangay || selectedBarangay}`}
            >
              <Building2 className="w-3.5 h-3.5 text-[#FFB380]" />
              <span className="font-display font-black tracking-wider uppercase text-[11px]">Brgy. {currentUser?.barangay || selectedBarangay}</span>
              <ChevronDown className={`w-3.5 h-3.5 text-zinc-400 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
            </button>
          )}

          {/* Role Switching Dropdown Modal */}
          {dropdownOpen && (
            <div className="absolute right-0 mt-3 w-72 bg-white rounded-3xl p-3 z-50 animate-in fade-in slide-in-from-top-2 duration-150 ring-1 ring-black/5">
              <div className="px-3 py-2.5 mb-1 bg-[#F6F5F2] rounded-2xl">
                <div className="text-xs font-black font-display text-zinc-900">{currentUser?.name || 'Administrator'}</div>
                <div className="text-[11px] text-zinc-500 font-medium">
                  @{currentUser?.username || 'admin'} • {currentUser?.role === 'SUPERADMIN' ? 'Superadmin' : 'LGU Officer'}
                </div>
                {currentUser?.role === 'ADMIN' && (
                  <div className="mt-2 text-[11px] text-[#FFB380] bg-[#FFB380]/10 px-2.5 py-1 rounded-full font-bold w-fit">
                    Brgy. {currentUser.barangay}
                  </div>
                )}
              </div>

              {/* Only Superadmin can switch perspective */}
              {currentUser?.role === 'SUPERADMIN' && (
                <>
                  <div className="px-3 py-1.5 text-[10px] font-black text-zinc-400 uppercase tracking-wider font-display">
                    Switch Perspective
                  </div>
                  
                  <button
                    onClick={() => toggleRole('SUPERADMIN')}
                    className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-left text-xs font-bold transition-all cursor-pointer ${
                      currentRole === 'SUPERADMIN' ? 'bg-[#0D0D11] text-white' : 'text-zinc-700 hover:bg-[#F6F5F2]'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Shield className={`w-4 h-4 ${currentRole === 'SUPERADMIN' ? 'text-[#FFB380]' : 'text-zinc-400'}`} />
                      <span className="font-extrabold font-display">Superadmin</span>
                    </div>
                    {currentRole === 'SUPERADMIN' && <Check className="w-4 h-4 text-[#FFB380]" />}
                  </button>

                  <div className="my-1.5" />
                  <div className="px-3 py-1.5 text-[10px] font-black text-zinc-400 uppercase tracking-wider font-display">
                    Barangay LGU Portals
                  </div>

                  {barangays.map((b) => (
                    <button
                      key={b.name}
                      onClick={() => toggleRole('ADMIN', b.name)}
                      className={`w-full flex items-center justify-between px-3.5 py-2 rounded-2xl text-left text-xs transition-all cursor-pointer ${
                        currentRole === 'ADMIN' && selectedBarangay === b.name
                          ? 'bg-[#0D0D11] text-white font-extrabold'
                          : 'text-zinc-700 hover:bg-[#F6F5F2] font-medium'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <Building2 className="w-4 h-4 text-zinc-400" />
                        <span className="font-display font-bold">Brgy. {b.name}</span>
                      </div>
                      {currentRole === 'ADMIN' && selectedBarangay === b.name && (
                        <Check className="w-4 h-4 text-[#FFB380]" />
                      )}
                    </button>
                  ))}

                  <div className="my-1.5" />
                </>
              )}

              <button
                onClick={() => {
                  setDropdownOpen(false);
                  logout();
                }}
                className="w-full flex items-center gap-2.5 px-3.5 py-2 rounded-2xl text-left text-xs font-black font-display text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
              >
                <LogOut className="w-4 h-4 text-rose-500" />
                <span>Log Out</span>
              </button>
            </div>
          )}
        </div>

        {/* Admin Avatar */}
        <div className="relative group cursor-pointer" onClick={() => setDropdownOpen(!dropdownOpen)}>
          <img
            src={currentUser?.avatar || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80"}
            alt="Admin Profile"
            className="w-10 h-10 rounded-full object-cover transition-transform active:scale-95"
          />
        </div>
      </div>
    </header>
  );
};
