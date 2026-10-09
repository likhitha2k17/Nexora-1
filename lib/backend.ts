import type { AppListing, AppState } from './types';

export interface WorkspaceResponse { state: AppState; revision: number }
export interface ScanResponse extends WorkspaceResponse { finding: AppListing; score: number; priority: string }
export interface BackendHealth {
  database: string;
  scrappa: string;
  monitoring: string;
  ai: string;
  integrations: Record<string, "configured" | "missing">;
}
export type IntegrationService = "x-profile" | "x-user-search" | "x-post-search" | "facebook-profile" | "youtube" | "tavily" | "gemini";
export interface IntegrationResult { service: IntegrationService; provider: string; summary: string; data: unknown; checkedAt: string }

async function request<T>(path: string, method = 'GET', body?: unknown): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`/api/${path}`, {
      method, headers: { 'Content-Type': 'application/json' },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      signal: AbortSignal.timeout(75000),
    });
  } catch { throw new Error('Cannot reach the backend. Keep npm run dev running and try again.'); }
  let data;
  try { data = await response.json(); } catch { throw new Error('Backend unavailable. Restart the project with npm run dev.'); }
  if (!response.ok) throw new Error(data.error || 'The backend request failed.');
  return data as T;
}

export const loadWorkspace = () => request<WorkspaceResponse>('state');
export const saveWorkspace = (state: AppState, revision: number) => request<{ revision: number }>('state', 'PUT', { state, revision });
export const checkGooglePlay = (brandId: string, packageId: string) => request<ScanResponse>('scan/google-play', 'POST', { brandId, packageId });
export const backendHealth = () => request<BackendHealth>('health');
export const queryIntegration = (service: IntegrationService, input: string) => request<IntegrationResult>('integrations/query', 'POST', { service, input });
export const explainIntegration = (service: Exclude<IntegrationService, 'gemini'>, input: string, evidence: unknown) => request<IntegrationResult>('integrations/explain', 'POST', { service, input, evidence });
