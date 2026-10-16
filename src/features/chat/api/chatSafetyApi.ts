import { requestJson } from '../../../shared/api/httpClient';
export interface SafetyStatus { restricted_until: string | null; support_available: boolean }
export const fetchSafetyStatus = (token: string) => requestJson<SafetyStatus>('/api/v1/chat/safety/status/', { token });
