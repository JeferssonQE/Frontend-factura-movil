// services/apiClient.ts
const API_BASE_URL =
  import.meta.env.VITE_API_URL ||
  'http://localhost:8000';

const ACCESS_TOKEN_KEY = 'fm_access_token';
const REFRESH_TOKEN_KEY = 'fm_refresh_token';
const LAST_ACTIVITY_KEY = 'fm_last_activity_at';
const USER_KEY = 'fm_user';

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export class ApiError extends Error {
  status: number;
  data: unknown;

  constructor(message: string, status: number, data?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const buildHeaders = (includeJson = true): HeadersInit => {
  const headers: Record<string, string> = {};

  if (includeJson) {
    headers['Content-Type'] = 'application/json';
  }

  const token = localStorage.getItem(ACCESS_TOKEN_KEY);
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  return headers;
};

const clearStoredSession = () => {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  localStorage.removeItem(LAST_ACTIVITY_KEY);
};

const getRefreshToken = (): string | null =>
  localStorage.getItem(REFRESH_TOKEN_KEY);

const saveTokens = (accessToken: string, refreshToken: string) => {
  localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
  localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
};

let isRefreshing = false;
let refreshQueue: Array<(token: string) => void> = [];

const processRefreshQueue = (newToken: string) => {
  refreshQueue.forEach((resolve) => resolve(newToken));
  refreshQueue = [];
};

const tryRefreshToken = async (): Promise<string | null> => {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return null;

  if (isRefreshing) {
    return new Promise((resolve) => {
      refreshQueue.push(resolve);
    });
  }

  isRefreshing = true;

  try {
    const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });

    if (!response.ok) {
      clearStoredSession();
      return null;
    }

    const data = await response.json();
    saveTokens(data.access_token, data.refresh_token);
    processRefreshQueue(data.access_token);
    return data.access_token;
  } catch {
    clearStoredSession();
    return null;
  } finally {
    isRefreshing = false;
  }
};

const parseResponse = async (response: Response) => {
  const contentType = response.headers.get('content-type') || '';

  if (contentType.includes('application/json')) {
    return response.json();
  }

  if (contentType.includes('text/')) {
    return response.text();
  }

  if (contentType.includes('application/pdf')) {
    return response.blob();
  }

  return response.arrayBuffer();
};

const handleErrorResponse = async (response: Response): Promise<never> => {
  const payload = await parseResponse(response).catch(() => null);

  if (response.status === 401) {
    clearStoredSession();
    window.location.href = '/login';
  }

  let message = `Request failed with status ${response.status}`;

  if (isPlainObject(payload) && typeof payload.detail === 'string') {
    message = payload.detail;
  } else if (typeof payload === 'string' && payload.trim()) {
    message = payload;
  }

  throw new ApiError(message, response.status, payload);
};

const requestWithRefresh = async <TResponse>(
  method: HttpMethod,
  path: string,
  body?: unknown,
  init?: RequestInit
): Promise<TResponse> => {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers: {
      ...buildHeaders(body !== undefined),
      ...(init?.headers || {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
    ...init,
  });

  if (response.status !== 401) {
    if (!response.ok) {
      console.error(`[API] ${method} ${path} → ${response.status}`, response.statusText);
      return handleErrorResponse(response);
    }
    const data = await parseResponse(response);
    console.log(`[API] ${method} ${path} → ${response.status}`, data);
    return data as TResponse;
  }

  const newToken = await tryRefreshToken();
  if (!newToken) {
    return handleErrorResponse(response);
  }

  const retryResponse = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers: {
      ...buildHeaders(body !== undefined),
      Authorization: `Bearer ${newToken}`,
      ...(init?.headers || {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
    ...init,
  });

  if (!retryResponse.ok) {
    console.error(`[API] ${method} ${path} → ${retryResponse.status}`, retryResponse.statusText);
    return handleErrorResponse(retryResponse);
  }

  const data = await parseResponse(retryResponse);
  console.log(`[API] ${method} ${path} → ${retryResponse.status}`, data);
  return data as TResponse;
};

const request = async <TResponse>(
  method: HttpMethod,
  path: string,
  body?: unknown,
  init?: RequestInit
): Promise<TResponse> => {
  const t0 = performance.now();
  console.log(`[API] ${method} ${API_BASE_URL}${path}`, body !== undefined ? body : '');
  const result = await requestWithRefresh<TResponse>(method, path, body, init);
  console.log(`[API] ${method} ${path} ⏱ ${(performance.now() - t0).toFixed(0)}ms`);
  return result;
};

export const apiClient = {
  getBaseUrl() {
    return API_BASE_URL;
  },

  clearSession() {
    clearStoredSession();
  },

  get<TResponse>(path: string, init?: RequestInit) {
    return request<TResponse>('GET', path, undefined, init);
  },

  post<TResponse>(path: string, body?: unknown, init?: RequestInit) {
    return request<TResponse>('POST', path, body, init);
  },

  put<TResponse>(path: string, body?: unknown, init?: RequestInit) {
    return request<TResponse>('PUT', path, body, init);
  },

  patch<TResponse>(path: string, body?: unknown, init?: RequestInit) {
    return request<TResponse>('PATCH', path, body, init);
  },

  delete<TResponse>(path: string, init?: RequestInit) {
    return request<TResponse>('DELETE', path, undefined, init);
  },
};

export const storageKeys = {
  accessToken: ACCESS_TOKEN_KEY,
  refreshToken: REFRESH_TOKEN_KEY,
  user: USER_KEY,
  lastActivityAt: LAST_ACTIVITY_KEY,
};

export { saveTokens };