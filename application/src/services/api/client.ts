import Constants from 'expo-constants';
import * as SecureStore from 'expo-secure-store';

import { resolveApiUrl } from './resolveApiUrl';

const configuredApiUrl = process.env.EXPO_PUBLIC_API_URL?.trim();
const expoHost =
  Constants.expoConfig?.hostUri ??
  (Constants as unknown as { manifest2?: { extra?: { expoGo?: { debuggerHost?: string } } } })
    .manifest2?.extra?.expoGo?.debuggerHost;

const API_URL = resolveApiUrl(configuredApiUrl, expoHost);
if (__DEV__) {
  console.log(`[Anden] API ${API_URL}`);
}
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
  timeoutMs = 20000,
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
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(`${API_URL}${path}`, {
      ...init,
      headers,
      signal: controller.signal,
    });
    const text = await response.text();
    const body = text ? JSON.parse(text) : {};
    if (!response.ok) {
      const error = body?.error ?? body?.detail ?? {};
      throw new ApiError(
        response.status,
        typeof error === 'object' && error?.code ? error.code : 'http_error',
        typeof error === 'string'
          ? error
          : typeof error === 'object' && error?.message
            ? error.message
            : `Error HTTP ${response.status}`,
      );
    }
    return body as T;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    if (error instanceof Error && error.name === 'AbortError') {
      throw new ApiError(0, 'timeout', 'La API tardó demasiado en responder');
    }
    throw new ApiError(
      0,
      'network_error',
      'No se pudo conectar con la API. Revisa tu conexión a internet e intenta de nuevo.',
    );
  } finally {
    clearTimeout(timeout);
  }
}

export async function requestText(
  path: string,
  init: RequestInit = {},
): Promise<{ text: string; headers: Headers }> {
  if (!token) throw new ApiError(401, 'unauthorized', 'Sesión no iniciada');
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 45000);
  try {
    const response = await fetch(`${API_URL}${path}`, {
      ...init,
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${token}`,
        ...(init.headers as Record<string, string> | undefined),
      },
      signal: controller.signal,
    });
    const text = await response.text();
    if (!response.ok) {
      let body: { detail?: { code?: string; message?: string }; error?: { code?: string; message?: string } } = {};
      try {
        body = text ? JSON.parse(text) : {};
      } catch {
        // Keep the raw status when the error body is not JSON.
      }
      throw new ApiError(
        response.status,
        body.detail?.code ?? body.error?.code ?? 'http_error',
        body.detail?.message ?? body.error?.message ?? `Error HTTP ${response.status}`,
      );
    }
    return { text, headers: response.headers };
  } catch (error) {
    if (error instanceof ApiError) throw error;
    if (error instanceof Error && error.name === 'AbortError') {
      throw new ApiError(0, 'timeout', 'La API tardó demasiado en responder');
    }
    throw new ApiError(
      0,
      'network_error',
      'No se pudo conectar con la API. Revisa tu conexión a internet e intenta de nuevo.',
    );
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
      } catch (error) {
        // Offline: keep the saved session and let the cached profile/bundle
        // drive the UI. Only a real 401 clears the token.
        if (error instanceof ApiError && error.status === 0) return;
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
      body: JSON.stringify({}),
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
