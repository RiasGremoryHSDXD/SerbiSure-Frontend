import React, { useState } from 'react';
import { 
  SlidersHorizontal, 
  MessageSquare, 
  CheckCircle, 
  MapPin, 
  Home, 
  Mail, 
  Phone, 
  Calendar, 
  Star,
  UserCheck
} from 'lucide-react';
import { useAdmin } from '../../context/AdminContext';
import { AccountRole, UserProfile } from '../../types/admin';

export const UserDirectory: React.FC = () => {
  const { users } = useAdmin();
  const [activeTab, setActiveTab] = useState<AccountRole>('HOMEOWNER');
  const [selectedUserId, setSelectedUserId] = useState<string>('usr-homeowner-1'); // Default to Juan dela Cruz

  // Filter users by active tab
  const tabUsers = users.filter(u => u.role === activeTab);
  
  // Active selected user or fallback to first
  const selectedUser: UserProfile = tabUsers.find(u => u.id === selectedUserId) || tabUsers[0] || users[0];

  return (
    <div className="space-y-6">
      {/* Title & Filter Bar matching Mockup */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
          Users
        </h1>

        <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-end">
          {/* Tab Pills Toggle */}
          <div className="flex items-center bg-[#F1F3F7] p-1.5 rounded-2xl border border-slate-200/70">
            <button
              onClick={() => {
                setActiveTab('HOMEOWNER');
                const first = users.find(u => u.role === 'HOMEOWNER');
                if (first) setSelectedUserId(first.id);
              }}
              className={`px-6 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'HOMEOWNER'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
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
              className={`px-6 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'KASAMBAHAY'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Kasambahays
            </button>
          </div>

          {/* Filters Button */}
          <button 
            onClick={() => alert('Filter options: Filter by Barangay, Verification Status, or Rating.')}
            className="flex items-center gap-2 px-5 py-2.5 bg-[#F1F3F7] hover:bg-slate-200 text-slate-700 rounded-2xl text-xs font-bold transition-colors cursor-pointer border border-slate-200/70"
          >
            <SlidersHorizontal className="w-4 h-4 text-slate-600" />
            <span>Filters</span>
          </button>
        </div>
      </div>

      {/* Main Grid: Left Users List + Right Profile & Linked Workers */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: User Cards List */}
        <div className="lg:col-span-5 space-y-3">
          {tabUsers.map((user) => {
            const isSelected = selectedUser?.id === user.id;
            return (
              <div
                key={user.id}
                onClick={() => setSelectedUserId(user.id)}
                className={`p-4 rounded-3xl cursor-pointer transition-all duration-200 flex items-center justify-between border ${
                  isSelected
                    ? 'bg-[#FFF3D6] border-[#FDE68A] shadow-xs'
                    : 'bg-white hover:bg-slate-50/80 border-slate-100'
                }`}
              >
                <div className="flex items-center gap-4">
                  <img
                    src={user.avatar}
                    alt={user.name}
                    className="w-14 h-14 rounded-full object-cover shadow-2xs shrink-0"
                  />
                  <div>
                    <h4 className="text-base font-extrabold text-slate-900 leading-tight">
                      {user.name}
                    </h4>
                    <span className="inline-block mt-1.5 px-3 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-[#22C55E] text-white shadow-2xs">
                      {user.role}
                    </span>
                  </div>
                </div>

                {/* Selected Chat Icon Badge matching Mockup */}
                {isSelected && (
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-[#F5A623]">
                    <MessageSquare className="w-5 h-5 fill-[#F5A623]/20 text-[#F5A623]" />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Right Column: User Profile Details + Linked Kasambahays */}
        <div className="lg:col-span-7 space-y-8">
          {/* Main User Card matching Mockup */}
          {selectedUser && (
            <div className="bg-[#FAF9F6] rounded-3xl p-8 border border-slate-200/60 shadow-[0_4px_25px_rgba(0,0,0,0.02)] space-y-6">
              {/* Header: Avatar, Name with Verified Badge, Address */}
              <div className="flex items-center gap-5">
                <img
                  src={selectedUser.avatar}
                  alt={selectedUser.name}
                  className="w-20 h-20 rounded-full object-cover shadow-sm border-2 border-white"
                />
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-2xl font-extrabold text-slate-900 tracking-tight">
                      {selectedUser.name}
                    </h3>
                    {selectedUser.verified && (
                      <CheckCircle className="w-5 h-5 fill-[#22C55E] text-white" />
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-slate-500 font-semibold">
                    <MapPin className="w-3.5 h-3.5 text-[#F5A623]" />
                    <span>{selectedUser.address}</span>
                  </div>
                </div>
              </div>

              {/* 4 Metadata Details Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-5 gap-x-8 pt-4 border-t border-slate-200/60">
                {/* Role */}
                <div className="space-y-1">
                  <div className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
                    ROLE
                  </div>
                  <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                    <Home className="w-4 h-4 text-[#F5A623]" />
                    <span>{selectedUser.role === 'HOMEOWNER' ? 'Homeowner' : 'Kasambahay'}</span>
                  </div>
                </div>

                {/* Email Address */}
                <div className="space-y-1">
                  <div className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
                    EMAIL ADDRESS
                  </div>
                  <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                    <Mail className="w-4 h-4 text-[#F5A623]" />
                    <span className="font-mono text-xs">{selectedUser.email}</span>
                  </div>
                </div>

                {/* Contact Number */}
                <div className="space-y-1">
                  <div className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
                    CONTACT NUMBER
                  </div>
                  <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                    <Phone className="w-4 h-4 text-[#F5A623]" />
                    <span className="font-mono text-xs">{selectedUser.contactNumber}</span>
                  </div>
                </div>

                {/* Member Since */}
                <div className="space-y-1">
                  <div className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
                    MEMBER SINCE
                  </div>
                  <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                    <Calendar className="w-4 h-4 text-[#F5A623]" />
                    <span>{selectedUser.joinedDate}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Linked Kasambahays Section matching Mockup */}
          {selectedUser && (
            <div className="space-y-4">
              <h4 className="text-xl font-extrabold text-slate-900 tracking-tight">
                {selectedUser.role === 'HOMEOWNER' ? 'Linked Kasambahays' : 'Skills & Endorsements'}
              </h4>

              {selectedUser.role === 'HOMEOWNER' ? (
                selectedUser.linkedKasambahays && selectedUser.linkedKasambahays.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {selectedUser.linkedKasambahays.map((worker) => (
                      <div
                        key={worker.id}
                        className="bg-white rounded-3xl p-5 border border-slate-100 shadow-[0_4px_25px_rgba(0,0,0,0.02)] flex items-center justify-between hover:shadow-md transition-shadow"
                      >
                        <div className="flex items-center gap-3.5">
                          <img
                            src={worker.avatar}
                            alt={worker.name}
                            className="w-12 h-12 rounded-full object-cover shadow-2xs"
                          />
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-slate-900 text-sm">
                                {worker.name}
                              </span>
                              {worker.verified && (
                                <CheckCircle className="w-3.5 h-3.5 fill-[#22C55E] text-white" />
                              )}
                            </div>
                            <div className="text-xs text-slate-500 mt-0.5">
                              {worker.role}
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-col items-end gap-1.5">
                          {/* Rating Badge */}
                          <div className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#DCFCE7] text-[#15803D] text-xs font-black">
                            <Star className="w-3 h-3 fill-[#15803D]" />
                            <span>{worker.rating.toFixed(1)}</span>
                          </div>
                          {/* View Profile Link */}
                          <button
                            onClick={() => {
                              setActiveTab('KASAMBAHAY');
                              setSelectedUserId('usr-kasambahay-1');
                            }}
                            className="text-[11px] font-bold text-[#F5A623] hover:underline cursor-pointer"
                          >
                            View Profile
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-8 bg-white rounded-3xl border border-slate-100 text-center text-slate-400 text-xs">
                    No active linked Kasambahay contracts for this homeowner.
                  </div>
                )
              ) : (
                /* Kasambahay Skills & Compliance Profile */
                <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-xs space-y-4">
                  <div className="flex flex-wrap gap-2">
                    {selectedUser.skills?.map((skill) => (
                      <span
                        key={skill}
                        className="px-3 py-1 bg-[#FFF4DC] text-[#B45309] text-xs font-bold rounded-xl"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                  <div className="flex items-center gap-2 text-xs font-bold text-emerald-700 bg-emerald-50 p-3 rounded-2xl">
                    <UserCheck className="w-4 h-4 text-emerald-600" />
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
