// services/apiClient.ts
import { reportError } from './monitoring';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const ACCESS_TOKEN_KEY = 'fm_access_token';
const REFRESH_TOKEN_KEY = 'fm_refresh_token';
const LAST_ACTIVITY_KEY = 'fm_last_activity_at';
const USER_KEY = 'fm_user';

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

const toUserMessage = (status: number, technical: string): string => {
  if (status >= 400 && status < 500) {
    return technical || 'Revisa los datos e intenta de nuevo.';
  }
  return 'Algo salió mal de nuestro lado. Intenta de nuevo en un momento.';
};

export class ApiError extends Error {
  status: number;
  data: unknown;
  userMessage: string;

  constructor(message: string, status: number, data?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
    this.userMessage = toUserMessage(status, message);
  }
}

export const getUserMessage = (
  error: unknown,
  fallback = 'Ocurrió un error. Intenta de nuevo.',
): string => (error instanceof ApiError ? error.userMessage : fallback);

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

// La Clave SOL y las contrasenas viajan en el body de /auth/* y /sender. Aunque este log
// solo corre en desarrollo, son credenciales de clientes reales: no van a la consola.
const REDACTED_FIELDS = ['password', 'sunat_pass', 'sunat_user', 'data'];

const redactBody = (body: unknown): unknown => {
  if (!isPlainObject(body)) return body;

  return Object.fromEntries(
    Object.entries(body).map(([key, value]) =>
      REDACTED_FIELDS.includes(key) ? [key, '***'] : [key, value],
    ),
  );
};

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

const getRefreshToken = (): string | null => localStorage.getItem(REFRESH_TOKEN_KEY);

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
    // Fallo de red al refrescar (sin internet): el refresh token sigue
    // siendo valido, asi que no cerramos sesion. Devolvemos null y la
    // request original se resuelve cuando vuelva la conexion.
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

const AUTH_PATHS_WITHOUT_REDIRECT = ['/auth/login', '/auth/refresh'];

const extractErrorMessage = (payload: unknown, status: number): string => {
  if (isPlainObject(payload)) {
    const { detail } = payload;
    if (typeof detail === 'string' && detail.trim()) return detail;
    if (Array.isArray(detail)) {
      const messages = detail
        .map((item) =>
          isPlainObject(item) && typeof item.msg === 'string'
            ? item.msg.replace(/^Value error,\s*/i, '')
            : null,
        )
        .filter((msg): msg is string => Boolean(msg));
      if (messages.length) return messages.join(' · ');
    }
  }
  if (typeof payload === 'string' && payload.trim()) return payload;
  return `Request failed with status ${status}`;
};

const handleErrorResponse = async (response: Response, path: string): Promise<never> => {
  const payload = await parseResponse(response).catch(() => null);
  const message = extractErrorMessage(payload, response.status);
  const apiError = new ApiError(message, response.status, payload);

  const isSessionExpiry = response.status === 401 && !AUTH_PATHS_WITHOUT_REDIRECT.includes(path);

  if (isSessionExpiry) {
    clearStoredSession();
    window.location.href = '/login';
  }

  if (response.status >= 500) {
    console.error(`[API] ${response.status} ${path}`, message, payload);
    reportError(apiError, { path, status: response.status });
  }

  throw apiError;
};

const requestWithRefresh = async <TResponse>(
  method: HttpMethod,
  path: string,
  body?: unknown,
  init?: RequestInit,
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
      if (import.meta.env.DEV)
        console.error(`[API] ${method} ${path} → ${response.status}`, response.statusText);
      return handleErrorResponse(response, path);
    }
    const data = await parseResponse(response);
    if (import.meta.env.DEV) console.log(`[API] ${method} ${path} → ${response.status}`, data);
    return data as TResponse;
  }

  const newToken = await tryRefreshToken();
  if (!newToken) {
    return handleErrorResponse(response, path);
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
    if (import.meta.env.DEV)
      console.error(`[API] ${method} ${path} → ${retryResponse.status}`, retryResponse.statusText);
    return handleErrorResponse(retryResponse, path);
  }

  const data = await parseResponse(retryResponse);
  if (import.meta.env.DEV) console.log(`[API] ${method} ${path} → ${retryResponse.status}`, data);
  return data as TResponse;
};

const request = async <TResponse>(
  method: HttpMethod,
  path: string,
  body?: unknown,
  init?: RequestInit,
): Promise<TResponse> => {
  try {
    if (!import.meta.env.DEV) {
      return await requestWithRefresh<TResponse>(method, path, body, init);
    }

    const t0 = performance.now();
    console.log(
      `[API] ${method} ${API_BASE_URL}${path}`,
      body !== undefined ? redactBody(body) : '',
    );
    const result = await requestWithRefresh<TResponse>(method, path, body, init);
    console.log(`[API] ${method} ${path} ⏱ ${(performance.now() - t0).toFixed(0)}ms`);
    return result;
  } catch (error) {
    // Un fallo sin respuesta HTTP (red caida, CORS, body rechazado por el proxy) nunca pasa
    // por handleErrorResponse: sin esto, Sentry no ve el error y el usuario se queda solo
    // con el toast. Es justo el caso que deja "error al procesar" sin rastro en Sentry.
    if (!(error instanceof ApiError)) {
      reportError(error, { path, method, kind: 'network' });
    }
    throw error;
  }
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
