import { clearOnboardingAuthToken } from '@/lib/auth-session';

export const apiBaseUrl = 'https://financeassistant-lemon.vercel.app';

type ApiOptions = {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: unknown;
  headers?: Record<string, string>;
};

export async function apiRequest<T>(path: string, options: ApiOptions = {}) {
  let response: Response;

  try {
    response = await fetch(`${apiBaseUrl}${path}`, {
      method: options.method ?? 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      body: options.body ? JSON.stringify(options.body) : undefined,
    });
  } catch {
    throw new Error(
      `Unable to reach the API at ${apiBaseUrl}.`,
    );
  }

  const payload = (await response.json().catch(() => null)) as
    | (T & { message?: string })
    | { message?: string }
    | null;

  if (response.status === 401) {
    await clearOnboardingAuthToken();
  }

  if (!response.ok) {
    throw new Error(payload?.message ?? 'Something went wrong.');
  }

  return payload as T;
}
