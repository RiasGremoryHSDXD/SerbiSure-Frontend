import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { AdminRole, BarangayStats, VerificationRequest, UserProfile, BookingCompliance, DashboardMetrics } from '../types/admin';
import { BARANGAYS_DATA, MOCK_BOOKINGS_LOGISTICS } from '../data/mockData';
import { fetchVerificationQueue, reviewVerification, fetchRegisteredUsers, fetchDashboardStats } from '../api/adminApi';

export interface AdminUser {
  username: string;
  name: string;
  role: AdminRole;
  barangay?: string;
  avatar: string;
}

interface AdminContextType {
  // Auth state
  isAuthenticated: boolean;
  currentUser: AdminUser | null;
  login: (username: string, password: string, role?: AdminRole, barangay?: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;

  // Role and Navigation
  currentRole: AdminRole;
  setCurrentRole: (role: AdminRole) => void;
  selectedBarangay: string;
  setSelectedBarangay: (barangay: string) => void;
  activeNav: string;
  setActiveNav: (nav: string) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  
  // Data
  barangays: BarangayStats[];
  verifications: VerificationRequest[];
  selectedVerificationId: string;
  setSelectedVerificationId: (id: string) => void;
  users: UserProfile[];
  bookings: BookingCompliance[];

  // Loading States
  isLoadingVerifications: boolean;
  isLoadingUsers: boolean;
  isLoadingDashboardStats: boolean;
  refreshVerifications: () => Promise<void>;
  refreshUsers: () => Promise<void>;
  refreshDashboardStats: () => Promise<void>;
  dashboardMetrics: DashboardMetrics | null;

  // Actions
  addBarangay: (barangay: BarangayStats) => void;
  approveVerification: (id: string) => Promise<void>;
  rejectVerification: (id: string, reason?: string) => Promise<void>;
  resetVerification: (id: string) => Promise<void>;
}

export const AUTHORIZED_ADMINS = [
  {
    email: 'serbisure@ustp.com',
    username: 'superadmin',
    password: 'iloveserbisure123',
    name: 'City Super Admin',
    role: 'SUPERADMIN' as AdminRole,
    barangay: 'All Barangays',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
  },
  {
    email: 'pagatpat@lgu.com',
    username: 'admin_pagatpat',
    password: 'ilovepagatpatlgu',
    name: 'Brgy. Officer (Pagatpat)',
    role: 'ADMIN' as AdminRole,
    barangay: 'Pagatpat',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=200&q=80',
  },
  {
    email: 'canitoan@lgu.com',
    username: 'admin_canitoan',
    password: 'ilovecanitoanlgu',
    name: 'Brgy. Officer (Canitoan)',
    role: 'ADMIN' as AdminRole,
    barangay: 'Canitoan',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80',
  },
];

const AdminContext = createContext<AdminContextType | undefined>(undefined);

export const AdminProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Load initial auth state from localStorage
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    try {
      return localStorage.getItem('serbisure_admin_auth') === 'true';
    } catch {
      return false;
    }
  });

  const [currentUser, setCurrentUser] = useState<AdminUser | null>(() => {
    try {
      const saved = localStorage.getItem('serbisure_admin_user');
      if (saved) return JSON.parse(saved);
    } catch {
      // fallback
    }
    return isAuthenticated
      ? {
          username: 'superadmin',
          name: 'City Super Admin',
          role: 'SUPERADMIN',
          barangay: 'All Barangays',
          avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
        }
      : null;
  });

  const [currentRole, setCurrentRole] = useState<AdminRole>(() => currentUser?.role || 'SUPERADMIN');
  const [selectedBarangay, setSelectedBarangay] = useState<string>(() => currentUser?.barangay && currentUser.barangay !== 'All Barangays' ? currentUser.barangay : 'Pagatpat');
  const [activeNav, setActiveNav] = useState<string>('dashboard');
  const [searchQuery, setSearchQuery] = useState<string>('');
  
  const [barangays, setBarangays] = useState<BarangayStats[]>(() => {
    try {
      const saved = localStorage.getItem('serbisure_admin_barangays');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Remove legacy mock LGUs (Bugo, Nazareth, Carmen, Lumbia)
          const sanitized = parsed.filter(
            (b: BarangayStats) => !['Bugo', 'Nazareth', 'Carmen', 'Lumbia'].includes(b.name)
          );
          if (sanitized.length > 0) {
            localStorage.setItem('serbisure_admin_barangays', JSON.stringify(sanitized));
            return sanitized;
          }
        }
      }
    } catch {
      // fallback
    }
    return BARANGAYS_DATA;
  });

  const addBarangay = (newBarangay: BarangayStats) => {
    setBarangays((prev) => {
      const exists = prev.some((b) => b.name.toLowerCase() === newBarangay.name.toLowerCase());
      const updated = exists
        ? prev.map((b) => (b.name.toLowerCase() === newBarangay.name.toLowerCase() ? newBarangay : b))
        : [...prev, newBarangay];
      try {
        localStorage.setItem('serbisure_admin_barangays', JSON.stringify(updated));
      } catch (e) {
        console.error('Failed to save barangays to localStorage:', e);
      }
      return updated;
    });
  };

  const [verifications, setVerifications] = useState<VerificationRequest[]>([]);
  const [selectedVerificationId, setSelectedVerificationId] = useState<string>('');
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [bookings] = useState<BookingCompliance[]>(MOCK_BOOKINGS_LOGISTICS);

  const [isLoadingVerifications, setIsLoadingVerifications] = useState<boolean>(false);
  const [isLoadingUsers, setIsLoadingUsers] = useState<boolean>(false);

  // Sync role and barangay when currentUser changes
  useEffect(() => {
    if (currentUser) {
      setCurrentRole(currentUser.role);
      if (currentUser.barangay && currentUser.barangay !== 'All Barangays') {
        setSelectedBarangay(currentUser.barangay);
      }
    }
  }, [currentUser]);

  const setRoleSafely = (role: AdminRole) => {
    // Only superadmin can change or switch roles
    if (currentUser?.role !== 'SUPERADMIN') {
      console.warn('Unauthorized: Local LGU officers cannot switch roles.');
      return;
    }
    setCurrentRole(role);
  };

  const setBarangaySafely = (barangay: string) => {
    // Local LGU officers are strictly confined to their designated barangay
    if (currentUser?.role !== 'SUPERADMIN' && currentUser?.barangay && currentUser.barangay !== 'All Barangays') {
      if (barangay.toLowerCase() !== currentUser.barangay.toLowerCase()) {
        console.warn(`Unauthorized: Local officer is restricted to Brgy. ${currentUser.barangay}.`);
        return;
      }
    }
    setSelectedBarangay(barangay);
  };

  // Load live verification requests from Django backend
  const refreshVerifications = useCallback(async () => {
    setIsLoadingVerifications(true);
    try {
      const bgyParam = currentRole === 'SUPERADMIN' 
        ? (selectedBarangay === 'All Barangays' ? undefined : selectedBarangay) 
        : selectedBarangay;
      const liveQueue = await fetchVerificationQueue(undefined, undefined, bgyParam);
      setVerifications(liveQueue || []);
      setSelectedVerificationId((current) => {
        if (!liveQueue || liveQueue.length === 0) return '';
        const exists = liveQueue.some((item) => item.id === current);
        return exists ? current : liveQueue[0].id;
      });
    } catch (err) {
      console.warn('[Admin API] Verification queue fetch notice:', err);
    } finally {
      setIsLoadingVerifications(false);
    }
  }, [currentRole, selectedBarangay]);

  // Load live registered users from Django backend
  const refreshUsers = useCallback(async () => {
    setIsLoadingUsers(true);
    try {
      const bgyParam = currentRole === 'SUPERADMIN' 
        ? (selectedBarangay === 'All Barangays' ? undefined : selectedBarangay) 
        : selectedBarangay;
      const liveUsers = await fetchRegisteredUsers(undefined, bgyParam);
      setUsers(liveUsers || []);
    } catch (err) {
      console.warn('[Admin API] Users fetch notice:', err);
    } finally {
      setIsLoadingUsers(false);
    }
  }, [currentRole, selectedBarangay]);

  // Load real-time dashboard metrics from Django backend
  const [dashboardMetrics, setDashboardMetrics] = useState<DashboardMetrics | null>(null);
  const [isLoadingDashboardStats, setIsLoadingDashboardStats] = useState<boolean>(false);

  const refreshDashboardStats = useCallback(async () => {
    setIsLoadingDashboardStats(true);
    try {
      const bgyParam = currentRole === 'SUPERADMIN' 
        ? (selectedBarangay === 'All Barangays' ? undefined : selectedBarangay) 
        : selectedBarangay;
      const res = await fetchDashboardStats(bgyParam);
      if (res && res.metrics) {
        setDashboardMetrics(res.metrics);
      }
      if (res && res.barangays && res.barangays.length > 0) {
        setBarangays(res.barangays);
      }
    } catch (err) {
      console.warn('[Admin API] Dashboard stats notice:', err);
    } finally {
      setIsLoadingDashboardStats(false);
    }
  }, [currentRole, selectedBarangay]);

  // Fetch live backend data on initial load, role/barangay change, plus real-time polling
  useEffect(() => {
    refreshVerifications();
    refreshUsers();
    refreshDashboardStats();

    // Auto-sync real-time stats every 4s for instant reflection when mobile workers toggle status
    const interval = setInterval(() => {
      refreshDashboardStats();
    }, 4000);

    return () => clearInterval(interval);
  }, [refreshVerifications, refreshUsers, refreshDashboardStats]);

  const login = async (
    username: string,
    password: string,
    _role?: AdminRole,
    _barangay?: string
  ): Promise<{ success: boolean; error?: string }> => {
    await new Promise((resolve) => setTimeout(resolve, 400));

    const cleanInput = username.trim().toLowerCase();
    const cleanPass = password.trim();

    // Authenticate against authorized admin accounts
    const match = AUTHORIZED_ADMINS.find(
      (a) =>
        (a.email.toLowerCase() === cleanInput || a.username.toLowerCase() === cleanInput) &&
        a.password === cleanPass
    );

    if (match) {
      const user: AdminUser = {
        username: match.username,
        name: match.name,
        role: match.role,
        barangay: match.barangay,
        avatar: match.avatar,
      };

      setIsAuthenticated(true);
      setCurrentUser(user);
      setCurrentRole(match.role);
      setSelectedBarangay(match.role === 'SUPERADMIN' ? 'Pagatpat' : match.barangay);
      setActiveNav('dashboard');

      try {
        localStorage.setItem('serbisure_admin_auth', 'true');
        localStorage.setItem('serbisure_admin_user', JSON.stringify(user));
      } catch (e) {
        console.error('Failed to save to localStorage:', e);
      }

      return { success: true };
    } else {
      return {
        success: false,
        error: 'Invalid credentials. Please enter authorized admin email/username and password.',
      };
    }
  };

  const logout = () => {
    setIsAuthenticated(false);
    setCurrentUser(null);
    try {
      localStorage.removeItem('serbisure_admin_auth');
      localStorage.removeItem('serbisure_admin_user');
    } catch (e) {
      console.error('Failed to clear localStorage:', e);
    }
  };

  const approveVerification = async (id: string) => {
    // Optimistic UI update
    setVerifications((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, status: 'VERIFIED', recordStatus: 'Clear Record' } : item
      )
    );

    // Call live backend endpoint
    try {
      await reviewVerification(id, 'approve');
      await refreshVerifications();
    } catch (err) {
      console.warn('[Admin API] Approve sync note:', err);
    }
  };

  const rejectVerification = async (id: string, reason?: string) => {
    // Optimistic UI update
    setVerifications((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, status: 'REJECTED', notes: reason } : item
      )
    );

    // Call live backend endpoint
    try {
      await reviewVerification(id, 'reject', reason);
      await refreshVerifications();
    } catch (err) {
      console.warn('[Admin API] Reject sync note:', err);
    }
  };

  const resetVerification = async (id: string) => {
    // Optimistic UI update
    setVerifications((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, status: 'PENDING / REVIEW', notes: undefined } : item
      )
    );

    // Call live backend endpoint
    try {
      await reviewVerification(id, 'reset');
      await refreshVerifications();
    } catch (err) {
      console.warn('[Admin API] Reset sync note:', err);
    }
  };

  return (
    <AdminContext.Provider
      value={{
        isAuthenticated,
        currentUser,
        login,
        logout,
        currentRole,
        setCurrentRole: setRoleSafely,
        selectedBarangay,
        setSelectedBarangay: setBarangaySafely,
        activeNav,
        setActiveNav,
        searchQuery,
        setSearchQuery,
        barangays,
        verifications,
        selectedVerificationId,
        setSelectedVerificationId,
        users,
        bookings,
        isLoadingVerifications,
        isLoadingUsers,
        isLoadingDashboardStats,
        refreshVerifications,
        refreshUsers,
        refreshDashboardStats,
        dashboardMetrics,
        addBarangay,
        approveVerification,
        rejectVerification,
        resetVerification,
      }}
    >
      {children}
    </AdminContext.Provider>
  );
};

export const useAdmin = (): AdminContextType => {
  const context = useContext(AdminContext);
  if (!context) {
    throw new Error('useAdmin must be used within an AdminProvider');
  }
  return context;
};
