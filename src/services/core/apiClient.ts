// services/apiClient.ts
const API_BASE_URL =
  import.meta.env.VITE_API_URL ||
  'http://localhost:8000';

const ACCESS_TOKEN_KEY = 'fm_access_token';
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
  localStorage.removeItem(USER_KEY);
  localStorage.removeItem(LAST_ACTIVITY_KEY);
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
  }

  let message = `Request failed with status ${response.status}`;

  if (isPlainObject(payload) && typeof payload.detail === 'string') {
    message = payload.detail;
  } else if (typeof payload === 'string' && payload.trim()) {
    message = payload;
  }

  throw new ApiError(message, response.status, payload);
};

const request = async <TResponse>(
  method: HttpMethod,
  path: string,
  body?: unknown,
  init?: RequestInit
): Promise<TResponse> => {
  console.log(`[API] ${method} ${API_BASE_URL}${path}`, body !== undefined ? body : '');

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers: {
      ...buildHeaders(body !== undefined),
      ...(init?.headers || {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
    ...init,
  });

  if (!response.ok) {
    console.error(`[API] ${method} ${path} → ${response.status}`, response.statusText);
    return handleErrorResponse(response);
  }

  const data = await parseResponse(response);
  console.log(`[API] ${method} ${path} → ${response.status}`, data);
  return data as TResponse;
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
  user: USER_KEY,
  lastActivityAt: LAST_ACTIVITY_KEY,
};