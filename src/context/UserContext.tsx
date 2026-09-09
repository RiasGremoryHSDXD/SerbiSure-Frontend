import React, { createContext, useContext, useState, useEffect } from 'react';

type UserData = {
  id?: string;
  token?: string | null;
  firstName: string;
  middleName: string;
  lastName: string;
  email?: string;
  contactNumber?: string;
  showContactNumber?: boolean;
  userTags?: string[];
  profileLink?: string | null;
  accountType?: string;
  userAbout?: string;
  resumeUrl?: string | null;
  resumeUploadedAt?: string | null;
  verificationStatus?: string;
  street?: string;
  city?: string;
  province?: string;
  zipcode?: string;
  country?: string;
};

type UserContextType = {
  user: UserData;
  setUser: React.Dispatch<React.SetStateAction<UserData>>;
  updateUser: (data: Partial<UserData>) => void;
  getFirstNameOnly: () => string;
  getFullName: () => string;
};

const defaultUser: UserData = {
  id: '',
  token: null,
  firstName: 'Daven Austhine',
  middleName: 'Santos',
  lastName: 'Sumagang',
  email: '',
  contactNumber: '',
  showContactNumber: false,
  userTags: [],
  street: '',
  city: 'City of Cagayan De Oro',
  province: 'Misamis Oriental',
  zipcode: '9000',
  country: 'Philippines',
};

const UserContext = createContext<UserContextType | undefined>(undefined);

function parseJWT(token: string) {
  try {
    const base64Url = token.split('.')[1];

    if (!base64Url) {
      return null;
    }

    let base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    while (base64.length % 4) { base64 += '='; }

    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';

    let str = base64.replace(/=+$/, '');
    let output = '';

    for (
      let bc = 0, bs = 0, buffer, i = 0;
      (buffer = str.charAt(i++));
      ~buffer && ((bs = bc % 4 ? bs * 64 + buffer : buffer), bc++ % 4) ? (output += String.fromCharCode(255 & (bs >> ((-2 * bc) & 6)))) : 0
    ) {
      buffer = chars.indexOf(buffer);
    }

    return JSON.parse(output)
  }
  catch (error) {
    return null
  }
}

export const UserProvider: React.FC<{ children: React.ReactNode, token?: string | null }> = ({ children, token }) => {
  const [user, setUser] = useState<UserData>(defaultUser);

  useEffect(() => {
    if (token) {
      const decoded = parseJWT(token)

      if (decoded) {
        setUser({
          id: decoded.user_id || decoded.id || decoded.sub || '',
          token: token,
          firstName: decoded.first_name || '',
          middleName: decoded.middle_name || '',
          lastName: decoded.last_name || '',
          email: decoded.email || '',
          contactNumber: decoded.contact_number || '',
          showContactNumber: decoded.show_contact_number ?? false,
          userTags: Array.isArray(decoded.user_tags) ? decoded.user_tags : [],
          profileLink: decoded.profile_link || null,
          accountType: decoded.account_type || '',
          street: decoded.street || '',
          city: decoded.city || '',
          province: decoded.province || '',
          zipcode: decoded.zipcode || '',
          country: decoded.country || 'Philippines',
        });
      }
      else {
        setUser({ id: '', token: null, firstName: '', middleName: '', lastName: '', email: '', contactNumber: '', showContactNumber: false, userTags: [], profileLink: null, accountType: '', street: '', city: '', province: '', zipcode: '', country: '' });
      }
    }
    else {
      setUser({ id: '', token: null, firstName: '', middleName: '', lastName: '', email: '', contactNumber: '', showContactNumber: false, userTags: [], accountType: '', street: '', city: '', province: '', zipcode: '', country: '' });
    }
  }, [token])

  const updateUser = (data: Partial<UserData>) => {
    setUser((prev) => ({ ...prev, ...data }));
  };

  /**
   * Returns only the first word of the user's first name.
   * Example: "Daven Austhine" -> "Daven"
   */
  const getFirstNameOnly = (): string => {
    const raw = user.firstName || 'Daven';
    const firstWord = raw.trim().split(' ')[0];
    return firstWord || 'Daven';
  };

  /**
   * Returns the full name constructed from first, middle, and last name.
   * Example: "Daven Austhine Santos Sumagang" or "Daven Austhine Sumagang"
   */
  const getFullName = (): string => {
    const parts = [user.firstName, user.middleName, user.lastName].map((s) => s?.trim()).filter(Boolean);
    return parts.length > 0 ? parts.join(' ') : 'Daven Austhine Sumagang';
  };

  return (
    <UserContext.Provider value={{ user, setUser, updateUser, getFirstNameOnly, getFullName }}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
};
