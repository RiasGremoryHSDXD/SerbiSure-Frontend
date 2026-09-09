import { fetchApi } from './apiClient';
import { VerificationRequest, UserProfile } from '../types/admin';

export async function fetchVerificationQueue(
  role?: string, 
  status?: string, 
  barangay?: string
): Promise<VerificationRequest[]> {
  const params = new URLSearchParams();
  if (role && role !== 'ALL') params.append('role', role);
  if (status && status !== 'ALL') params.append('status', status);
  if (barangay && barangay !== 'All Barangays') params.append('barangay', barangay);

  const query = params.toString() ? `?${params.toString()}` : '';
  return fetchApi<VerificationRequest[]>(`/api/v1/verifications/admin/queue/${query}`);
}

export async function reviewVerification(
  documentId: string,
  action: 'approve' | 'reject' | 'reset',
  rejectionReason?: string
): Promise<{ message: string; document: VerificationRequest }> {
  return fetchApi<{ message: string; document: VerificationRequest }>(
    `/api/v1/verifications/admin/review/${documentId}/`,
    {
      method: 'POST',
      body: JSON.stringify({
        action,
        rejection_reason: rejectionReason || '',
      }),
    }
  );
}

export async function fetchRegisteredUsers(role?: string, barangay?: string): Promise<UserProfile[]> {
  const params = new URLSearchParams();
  if (role && role !== 'ALL') params.append('role', role);
  if (barangay && barangay !== 'All Barangays') params.append('barangay', barangay);

  const query = params.toString() ? `?${params.toString()}` : '';
  return fetchApi<UserProfile[]>(`/api/v1/accounts/admin/users/${query}`);
}
