import { API_BASE_URL, fetchWithTimeout } from '../config/api';

export interface DocumentDiscrepancy {
  field: string;
  profile_value?: string;
  document_value?: string;
  similarity?: number;
  severity?: 'low' | 'medium' | 'high' | 'critical';
  message?: string;
}

export interface DocumentStatusItem {
  document_id: string;
  document_type: 'nbi_clearance' | 'police_clearance' | 'national_id_front' | 'national_id_back';
  verification_status: 'Unverified' | 'Pending' | 'Verified' | 'Rejected';
  document_image_url: string | null;
  date_issued: string | null;
  valid_until: string | null;
  ocr_match_score: number | null;
  ocr_discrepancies: DocumentDiscrepancy[];
  rejection_reason: string | null;
  created_at: string;
}

export interface VerificationStatusResponse {
  account_type: string;
  overall_status: 'Unverified' | 'Pending' | 'Verified' | 'Rejected';
  required_documents: string[];
  documents: DocumentStatusItem[];
}

export async function fetchVerificationStatus(token: string): Promise<VerificationStatusResponse> {
  const response = await fetchWithTimeout(`${API_BASE_URL}/api/v1/verifications/status/`, {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch verification status (${response.status})`);
  }

  return response.json();
}

export async function deleteRejectedDocument(token: string, documentId: string): Promise<void> {
  const response = await fetchWithTimeout(`${API_BASE_URL}/api/v1/verifications/documents/${documentId}/`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to delete rejected document');
  }
}
