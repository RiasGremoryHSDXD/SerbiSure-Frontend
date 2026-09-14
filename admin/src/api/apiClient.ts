export const API_BASE_URL = (import.meta as any).env?.VITE_API_URL || '';

export async function fetchApi<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint}`;
  
  const token = typeof localStorage !== 'undefined' ? localStorage.getItem('serbisure_admin_token') : null;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((options.headers as Record<string, string>) || {}),
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    const message = errorBody.detail || errorBody.error || errorBody.message || `API Error: ${response.status}`;
    throw new Error(message);
  }

  return response.json();
}
