import { buildApiUrl } from '../api';

export interface ApplicationEndpoint {
  id: number;
  application_id: number;
  target_name: string;
  container_name: string;
}

export interface ApplicationDetails {
  id: number;
  name: string;
  description?: string | null;
  github_repo?: string | null;
  grafana_url?: string | null;
  victoria_metrics_url?: string | null;
  health_endpoint?: string | null;
  endpoints: ApplicationEndpoint[];
}

function getAuthHeaders(): HeadersInit {
  const token = localStorage.getItem('access_token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function handleResponse<T>(res: Response): Promise<T> {
  const contentType = res.headers.get('content-type') || '';
  if (!res.ok) {
    let errorDetail = `Request failed (${res.status})`;
    if (contentType.includes('application/json')) {
      try {
        const body = await res.json();
        errorDetail = typeof body.detail === 'string' ? body.detail : JSON.stringify(body.detail);
      } catch {
        // ignore json parse error
      }
    }
    throw new Error(errorDetail);
  }
  if (contentType.includes('application/json')) {
    return (await res.json()) as T;
  }
  throw new Error(`Unexpected non-JSON response from server (${res.status})`);
}

export async function fetchApplicationDetails(appId: string): Promise<ApplicationDetails> {
  const res = await fetch(buildApiUrl(`/api/v1/application/${appId}`), {
    headers: getAuthHeaders(),
  });
  return handleResponse<ApplicationDetails>(res);
}

export async function updateVictoriaMetricsUrl(appId: string, victoriaMetricsUrl: string): Promise<ApplicationDetails> {
  const res = await fetch(buildApiUrl(`/api/v1/application/${appId}/victoria-metrics`), {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify({ victoria_metrics_url: victoriaMetricsUrl }),
  });
  return handleResponse<ApplicationDetails>(res);
}

export async function updateGrafanaUrl(appId: string, grafanaUrl: string): Promise<ApplicationDetails> {
  const res = await fetch(buildApiUrl(`/api/v1/application/${appId}/grafana`), {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify({ grafana_url: grafanaUrl }),
  });
  return handleResponse<ApplicationDetails>(res);
}

export async function updateGithubRepo(appId: string, githubRepo: string): Promise<ApplicationDetails> {
  const res = await fetch(buildApiUrl(`/api/v1/application/${appId}/github-repo`), {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify({ github_repo: githubRepo }),
  });
  return handleResponse<ApplicationDetails>(res);
}

export async function updateHealthEndpoint(appId: string, healthEndpoint: string): Promise<ApplicationDetails> {
  const res = await fetch(buildApiUrl(`/api/v1/application/${appId}/health-endpoint`), {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify({ health_endpoint: healthEndpoint }),
  });
  return handleResponse<ApplicationDetails>(res);
}


export async function fetchApplicationEndpoints(appId: string): Promise<ApplicationEndpoint[]> {
  const res = await fetch(buildApiUrl(`/api/v1/application/${appId}/endpoints`), {
    headers: getAuthHeaders(),
  });
  return handleResponse<ApplicationEndpoint[]>(res);
}

export async function addApplicationEndpoint(
  appId: string,
  targetName: string,
  containerName: string
): Promise<ApplicationEndpoint> {
  const res = await fetch(buildApiUrl(`/api/v1/application/${appId}/endpoints`), {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({
      target_name: targetName,
      container_name: containerName,
    }),
  });
  return handleResponse<ApplicationEndpoint>(res);
}

export async function updateApplicationEndpoint(
  appId: string,
  endpointId: number,
  targetName: string,
  containerName: string
): Promise<ApplicationEndpoint> {
  const res = await fetch(buildApiUrl(`/api/v1/application/${appId}/endpoints/${endpointId}`), {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify({
      target_name: targetName,
      container_name: containerName,
    }),
  });
  return handleResponse<ApplicationEndpoint>(res);
}

export async function deleteApplicationEndpoint(appId: string, endpointId: number): Promise<void> {
  const res = await fetch(buildApiUrl(`/api/v1/application/${appId}/endpoints/${endpointId}`), {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });
  if (!res.ok && res.status !== 204) {
    let errorDetail = 'Failed to delete endpoint';
    try {
      const body = await res.json();
      errorDetail = typeof body.detail === 'string' ? body.detail : JSON.stringify(body.detail);
    } catch {
      // ignore
    }
    throw new Error(errorDetail);
  }
}
