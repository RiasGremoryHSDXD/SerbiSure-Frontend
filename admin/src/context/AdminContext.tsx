import React, { createContext, useContext, useState, useEffect } from 'react';
import { AdminRole, BarangayStats, VerificationRequest, UserProfile, BookingCompliance } from '../types/admin';
import { BARANGAYS_DATA, INITIAL_VERIFICATIONS, MOCK_USERS, MOCK_BOOKINGS_LOGISTICS } from '../data/mockData';

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

  // Actions
  approveVerification: (id: string) => void;
  rejectVerification: (id: string, reason?: string) => void;
}

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
          username: 'admin',
          name: 'City Administrator',
          role: 'SUPERADMIN',
          barangay: 'Pagatpat',
          avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
        }
      : null;
  });

  const [currentRole, setCurrentRole] = useState<AdminRole>(() => currentUser?.role || 'SUPERADMIN');
  const [selectedBarangay, setSelectedBarangay] = useState<string>(() => currentUser?.barangay || 'Pagatpat');
  const [activeNav, setActiveNav] = useState<string>('dashboard');
  const [searchQuery, setSearchQuery] = useState<string>('');
  
  const [barangays] = useState<BarangayStats[]>(BARANGAYS_DATA);
  const [verifications, setVerifications] = useState<VerificationRequest[]>(INITIAL_VERIFICATIONS);
  const [selectedVerificationId, setSelectedVerificationId] = useState<string>('req-004'); // default to Angelli Gonzales
  const [users] = useState<UserProfile[]>(MOCK_USERS);
  const [bookings] = useState<BookingCompliance[]>(MOCK_BOOKINGS_LOGISTICS);

  // Sync role and barangay when currentUser changes
  useEffect(() => {
    if (currentUser) {
      setCurrentRole(currentUser.role);
      if (currentUser.barangay) {
        setSelectedBarangay(currentUser.barangay);
      }
    }
  }, [currentUser]);

  const login = async (
    username: string,
    password: string,
    role: AdminRole = 'SUPERADMIN',
    barangay: string = 'Pagatpat'
  ): Promise<{ success: boolean; error?: string }> => {
    // Artificial small delay for realistic authentication feel
    await new Promise((resolve) => setTimeout(resolve, 600));

    const cleanUser = username.trim().toLowerCase();
    const cleanPass = password.trim();

    if (cleanUser === 'admin' && cleanPass === 'admin') {
      const user: AdminUser = {
        username: 'admin',
        name: role === 'SUPERADMIN' ? 'City Super Admin' : `Brgy. Officer (${barangay})`,
        role: role,
        barangay: barangay,
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
      };

      setIsAuthenticated(true);
      setCurrentUser(user);
      setCurrentRole(role);
      setSelectedBarangay(barangay);
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
        error: 'Invalid credentials. Please enter admin as username and password for mock authentication.',
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

  const approveVerification = (id: string) => {
    setVerifications((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, status: 'VERIFIED' } : item
      )
    );
  };

  const rejectVerification = (id: string, reason?: string) => {
    setVerifications((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, status: 'REJECTED', notes: reason } : item
      )
    );
  };

  return (
    <AdminContext.Provider
      value={{
        isAuthenticated,
        currentUser,
        login,
        logout,
        currentRole,
        setCurrentRole,
        selectedBarangay,
        setSelectedBarangay,
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
        approveVerification,
        rejectVerification,
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
