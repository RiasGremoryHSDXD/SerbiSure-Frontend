import React, { useState } from 'react';
import { 
  CheckCircle, 
  MapPin, 
  Star,
  UserCheck,
  RotateCw,
  MessageSquare
} from 'lucide-react';
import { useAdmin } from '../../context/AdminContext';
import { AccountRole, UserProfile } from '../../types/admin';

export const UserDirectory: React.FC = () => {
  const { users, refreshUsers, isLoadingUsers, currentRole, selectedBarangay } = useAdmin();
  const [activeTab, setActiveTab] = useState<AccountRole>('HOMEOWNER');
  const [selectedUserId, setSelectedUserId] = useState<string>('usr-homeowner-1');

  // Strictly scope user directory to assigned barangay if logged in as local LGU officer
  const scopedUsers = (currentRole === 'ADMIN' && selectedBarangay)
    ? users.filter(u => (u.barangay || '').toLowerCase() === selectedBarangay.toLowerCase())
    : users;

  // Filter users by active tab
  const tabUsers = scopedUsers.filter(u => u.role === activeTab);
  
  // Active selected user or fallback to first
  const selectedUser: UserProfile = tabUsers.find(u => u.id === selectedUserId) || tabUsers[0] || scopedUsers[0];

  return (
    <div className="space-y-8">
      {/* Title & Filter Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black font-display text-[#0D0D11] tracking-tight">
            Users
          </h1>
          <p className="text-xs text-zinc-400 font-medium mt-1">
            Registered homeowners and verified kasambahays directory
          </p>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
          {/* Segmented Tab Switcher */}
          <div className="flex items-center bg-[#EAEAE5] p-1 rounded-full">
            <button
              onClick={() => {
                setActiveTab('HOMEOWNER');
                const first = users.find(u => u.role === 'HOMEOWNER');
                if (first) setSelectedUserId(first.id);
              }}
              className={`px-5 py-2 rounded-full text-xs font-black font-display transition-all cursor-pointer ${
                activeTab === 'HOMEOWNER'
                  ? 'bg-white text-zinc-950 shadow-xs'
                  : 'text-zinc-600 hover:text-zinc-900'
              }`}
            >
              Homeowners
            </button>
            <button
              onClick={() => {
                setActiveTab('KASAMBAHAY');
                const first = users.find(u => u.role === 'KASAMBAHAY');
                if (first) setSelectedUserId(first.id);
              }}
              className={`px-5 py-2 rounded-full text-xs font-black font-display transition-all cursor-pointer ${
                activeTab === 'KASAMBAHAY'
                  ? 'bg-white text-zinc-950 shadow-xs'
                  : 'text-zinc-600 hover:text-zinc-900'
              }`}
            >
              Kasambahays
            </button>
          </div>

          {/* Sync Refresh Button */}
          <button
            type="button"
            onClick={() => refreshUsers()}
            title="Sync Users with Backend"
            className="p-2.5 rounded-full bg-white hover:bg-zinc-100 text-zinc-700 transition-colors cursor-pointer border-0"
          >
            <RotateCw className={`w-4 h-4 ${isLoadingUsers ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Directory Grid: 2 Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: User List */}
        <div className="lg:col-span-5 space-y-3">
          {tabUsers.map((user) => {
            const isSelected = selectedUser?.id === user.id;
            return (
              <div
                key={user.id}
                onClick={() => setSelectedUserId(user.id)}
                className={`p-3.5 rounded-3xl cursor-pointer transition-all duration-150 flex items-center justify-between ${
                  isSelected
                    ? 'bg-[#F0F0EC] text-zinc-950 font-bold'
                    : 'bg-white hover:bg-zinc-50 text-zinc-900'
                }`}
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="w-12 h-12 min-w-[48px] min-h-[48px] max-w-[48px] max-h-[48px] rounded-full overflow-hidden shrink-0 bg-zinc-200 flex items-center justify-center">
                    {user.avatar ? (
                      <img
                        src={user.avatar}
                        alt={user.name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = 'none';
                        }}
                      />
                    ) : (
                      <span className="font-black text-sm text-zinc-600 font-display">
                        {user.name.slice(0, 2).toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div className="min-w-0 truncate">
                    <h4 className="text-sm font-black font-display leading-snug truncate text-[#0D0D11]">
                      {user.name}
                    </h4>
                    <span className={`inline-block mt-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                      isSelected ? 'bg-white text-zinc-700 font-bold' : 'bg-[#F0F0EC] text-zinc-600'
                    }`}>
                      {user.role}
                    </span>
                  </div>
                </div>

                {/* Chat Action Icon on active state */}
                {isSelected && (
                  <button
                    type="button"
                    title={`Message ${user.name}`}
                    onClick={(e) => {
                      e.stopPropagation();
                    }}
                    className="w-8 h-8 rounded-full bg-[#FFF4ED] text-[#FFB380] hover:bg-[#FFE5D6] flex items-center justify-center shrink-0 mr-1 transition-transform active:scale-90 cursor-pointer border-0"
                  >
                    <MessageSquare className="w-4 h-4 fill-[#FFB380]/20" />
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {/* Right Column: User Profile Details + Linked Kasambahays */}
        <div className="lg:col-span-7 space-y-6">
          {/* Main User Card */}
          {selectedUser && (
            <div className="bg-white rounded-3xl p-8 space-y-6">
              {/* Header: Avatar, Name with Verified Badge, Address */}
              <div className="flex items-center gap-5">
                <div className="w-16 h-16 min-w-[64px] min-h-[64px] max-w-[64px] max-h-[64px] rounded-full overflow-hidden shrink-0 bg-zinc-200 flex items-center justify-center">
                  {selectedUser.avatar ? (
                    <img
                      src={selectedUser.avatar}
                      alt={selectedUser.name}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = 'none';
                      }}
                    />
                  ) : (
                    <span className="font-black text-lg text-zinc-600 font-display">
                      {selectedUser.name.slice(0, 2).toUpperCase()}
                    </span>
                  )}
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-2xl font-black font-display text-[#0D0D11] tracking-tight">
                      {selectedUser.name}
                    </h3>
                    {selectedUser.verified && (
                      <CheckCircle className="w-5 h-5 fill-emerald-600 text-white shrink-0" />
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-zinc-500 font-medium">
                    <MapPin className="w-3.5 h-3.5 text-[#FFB380] shrink-0" />
                    <span>{selectedUser.address}</span>
                  </div>
                </div>
              </div>

              {/* Clean Information Grid (Zero clunky grey boxes) */}
              <div className="grid grid-cols-2 gap-y-6 gap-x-8 pt-6 border-t border-zinc-100">
                {/* Role */}
                <div>
                  <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block font-display">
                    Role
                  </span>
                  <span className="text-sm font-black text-[#0D0D11] font-display mt-1 block">
                    {selectedUser.role === 'HOMEOWNER' ? 'Homeowner' : 'Kasambahay'}
                  </span>
                </div>

                {/* Email Address */}
                <div>
                  <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block font-display">
                    Email Address
                  </span>
                  <span className="text-sm font-semibold text-zinc-800 font-mono mt-1 block truncate">
                    {selectedUser.email}
                  </span>
                </div>

                {/* Contact Number */}
                <div>
                  <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block font-display">
                    Contact Number
                  </span>
                  <span className="text-sm font-semibold text-zinc-800 mt-1 block">
                    {selectedUser.contactNumber}
                  </span>
                </div>

                {/* Member Since */}
                <div>
                  <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block font-display">
                    Member Since
                  </span>
                  <span className="text-sm font-semibold text-zinc-800 mt-1 block">
                    {selectedUser.joinedDate}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Linked Kasambahays Section */}
          {selectedUser && (
            <div className="space-y-4">
              <h4 className="text-lg font-black font-display text-[#0D0D11] tracking-tight">
                {selectedUser.role === 'HOMEOWNER' ? 'Linked Kasambahays' : 'Skills & Endorsements'}
              </h4>

              {selectedUser.role === 'HOMEOWNER' ? (
                selectedUser.linkedKasambahays && selectedUser.linkedKasambahays.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    {selectedUser.linkedKasambahays.map((worker) => (
                      <div
                        key={worker.id}
                        className="bg-white rounded-3xl p-5 flex items-center justify-between transition-all"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-11 h-11 min-w-[44px] min-h-[44px] max-w-[44px] max-h-[44px] rounded-full overflow-hidden shrink-0 bg-zinc-200 flex items-center justify-center">
                            {worker.avatar ? (
                              <img
                                src={worker.avatar}
                                alt={worker.name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <span className="font-bold text-xs text-zinc-600">
                                {worker.name.slice(0, 2).toUpperCase()}
                              </span>
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="font-black font-display text-[#0D0D11] text-sm truncate">
                                {worker.name}
                              </span>
                              {worker.verified && (
                                <CheckCircle className="w-3.5 h-3.5 fill-emerald-600 text-white shrink-0" />
                              )}
                            </div>
                            <div className="text-xs text-zinc-400 font-medium truncate">
                              {worker.role}
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-col items-end gap-1 shrink-0 ml-2">
                          <div className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 text-[11px] font-black font-display">
                            <Star className="w-3 h-3 fill-emerald-600 text-emerald-600" />
                            <span>{worker.rating.toFixed(1)}</span>
                          </div>
                          <button
                            onClick={() => {
                              setActiveTab('KASAMBAHAY');
                              setSelectedUserId(worker.id || 'usr-kasambahay-1');
                            }}
                            className="text-[11px] font-bold text-zinc-500 hover:text-zinc-950 transition-colors cursor-pointer"
                          >
                            View
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-8 bg-white rounded-3xl text-center text-zinc-400 text-xs font-medium">
                    No active linked Kasambahay contracts for this homeowner.
                  </div>
                )
              ) : (
                /* Kasambahay Skills & Compliance Profile */
                <div className="bg-white rounded-3xl p-6 space-y-4">
                  <div className="flex flex-wrap gap-2">
                    {selectedUser.skills?.map((skill) => (
                      <span
                        key={skill}
                        className="px-3.5 py-1.5 bg-[#F0F0EC] text-zinc-800 text-xs font-bold font-display rounded-full"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                  <div className="flex items-center gap-2 text-xs font-bold text-emerald-800 bg-emerald-50 p-3.5 rounded-2xl">
                    <UserCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>RA 10361 Batas Kasambahay Minimum Wage & Benefit Compliant</span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
