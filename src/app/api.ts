const explicitApiBase = (
  (import.meta as ImportMeta & { env?: { VITE_API_BASE_URL?: string } }).env?.VITE_API_BASE_URL ?? ''
).trim();
const explicitRcaApiBase = (
  (import.meta as ImportMeta & { env?: { VITE_RCA_API_BASE_URL?: string } }).env?.VITE_RCA_API_BASE_URL ?? ''
).trim();

// If VITE_API_BASE_URL is not set, use relative URLs so Vite proxy can forward to backend.
export const API_BASE_URL = explicitApiBase ? explicitApiBase.replace(/\/+$/, '') : '';
export const RCA_API_BASE_URL = explicitRcaApiBase ? explicitRcaApiBase.replace(/\/+$/, '') : '';

export function buildApiUrl(path: string): string {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return API_BASE_URL ? `${API_BASE_URL}${normalizedPath}` : normalizedPath;
}

export function buildRcaApiUrl(path: string): string {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return RCA_API_BASE_URL ? `${RCA_API_BASE_URL}${normalizedPath}` : normalizedPath;
}
