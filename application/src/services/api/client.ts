import * as SecureStore from 'expo-secure-store';

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8000';
const TOKEN_KEY = 'automatic_token';

let token: string | null = null;

export class ApiError extends Error {
  status: number;
  code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export async function request<T>(
  path: string,
  init: RequestInit = {},
  auth = true,
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(init.headers as Record<string, string> | undefined),
  };
  if (auth) {
    if (!token) throw new ApiError(401, 'unauthorized', 'Sesión no iniciada');
    headers.Authorization = `Bearer ${token}`;
  }
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000);
  try {
    const response = await fetch(`${API_URL}${path}`, {
      ...init,
      headers,
      signal: controller.signal,
    });
    const text = await response.text();
    const body = text ? JSON.parse(text) : {};
    if (!response.ok) {
      const error = body?.error ?? {};
      throw new ApiError(
        response.status,
        error.code ?? 'http_error',
        error.message ?? `Error HTTP ${response.status}`,
      );
    }
    return body as T;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    if (error instanceof Error && error.name === 'AbortError') {
      throw new ApiError(0, 'timeout', 'La API tardó demasiado en responder');
    }
    throw new ApiError(0, 'network_error', 'No se pudo conectar con la API');
  } finally {
    clearTimeout(timeout);
  }
}

export async function ensureSession(): Promise<void> {
  if (token) return;
  try {
    const saved = await SecureStore.getItemAsync(TOKEN_KEY);
    if (saved) {
      token = saved;
      try {
        await request('/api/v1/auth/me');
        return;
      } catch {
        token = null;
      }
    }
  } catch {
    token = null;
  }
  const session = await request<{ access_token: string }>(
    '/api/v1/auth/anonymous',
    {
      method: 'POST',
      body: JSON.stringify({ display_name: 'Agricultor', consent_version: 'v1' }),
    },
    false,
  );
  token = session.access_token;
  try {
    await SecureStore.setItemAsync(TOKEN_KEY, token);
  } catch {
    // SecureStore may be unavailable in web; the in-memory session still works.
  }
}

export function apiBaseUrl(): string {
  return API_URL;
}
