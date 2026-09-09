export type AdminRole = 'SUPERADMIN' | 'ADMIN';

export type AccountRole = 'KASAMBAHAY' | 'HOMEOWNER';

export type DocumentType = 'NBI CLEARANCE' | 'Police Clearance' | 'National ID';

export type VerificationStatus = 'PENDING / REVIEW' | 'VERIFIED' | 'REJECTED';

export interface BarangayStats {
  name: string;
  totalWorkers: number;
  employed: number;
  available: number;
  employmentRatio: number; // percentage, e.g. 82
  status: 'ACTIVE' | 'INACTIVE';
}

export interface VerificationRequest {
  id: string;
  name: string;
  role: AccountRole;
  avatar: string;
  documentType: DocumentType;
  documentNumber: string;
  submittedDate: string;
  issuedDate: string;
  validityDate: string;
  status: VerificationStatus;
  recordStatus: 'Clear Record' | 'Under Review' | 'Flagged';
  documentImage: string;
  barangay: string;
  contactNumber: string;
  email: string;
  notes?: string;
  faceLivenessMatchScore?: number; // e.g. 98.4%
}

export interface LinkedWorker {
  id: string;
  name: string;
  avatar: string;
  role: string;
  rating: number;
  verified: boolean;
}

export interface UserProfile {
  id: string;
  name: string;
  role: AccountRole;
  avatar: string;
  email: string;
  contactNumber: string;
  address: string;
  barangay: string;
  city: string;
  verified: boolean;
  skills?: string[];
  hourlyRate?: number;
  status: 'ACTIVE' | 'PENDING' | 'SUSPENDED';
  joinedDate: string;
  completedJobs: number;
  linkedKasambahays?: LinkedWorker[];
  sentimentScore: {
    positive: number;
    neutral: number;
    negative: number;
  };
  ra10361Compliant: boolean;
}

export interface BookingCompliance {
  id: string;
  homeownerName: string;
  homeownerAvatar: string;
  workerName: string;
  workerAvatar: string;
  serviceCategory: string;
  monthlyBookingsCount: number; // Max 3 per month
  isCapped: boolean; // true if >= 3 bookings
  offeredWage: number;
  minimumWageBaseline: number; // RTWPB-10 baseline e.g. 438/day or 5000/mo
  isBelowMinimumWage: boolean;
  contractType: 'Short-Term On-Demand' | 'Formal Kasambahay (Long-Term)';
  statutoryBenefits: {
    sss: boolean;
    philHealth: boolean;
    pagIbig: boolean;
    thirteenthMonth: boolean;
  };
  startDate: string;
  status: 'ACTIVE' | 'FLAGGED_THROTTLED' | 'COMPLIANT' | 'DISPUTED';
}
