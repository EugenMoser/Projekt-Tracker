import type { PushPayload, PullResponse } from './types'

export class ApiError extends Error {
  constructor(readonly status: number, message: string) {
    super(`HTTP ${status}: ${message}`)
  }
}

async function request<T>(url: string, options: RequestInit): Promise<T> {
  const res = await fetch(url, options)
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText)
    throw new ApiError(res.status, text)
  }
  return res.json() as Promise<T>
}

export async function apiBootstrap(
  baseUrl: string,
  displayName: string,
): Promise<{ token: string; userId: string }> {
  return request(`${baseUrl}/v1/auth/bootstrap`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ displayName }),
  })
}

export async function apiPush(
  baseUrl: string,
  token: string,
  payload: PushPayload,
): Promise<{ serverTime: string }> {
  return request(`${baseUrl}/v1/sync/push`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  })
}

export async function apiPull(
  baseUrl: string,
  token: string,
  since: string | null,
): Promise<PullResponse> {
  const qs = since ? `?since=${encodeURIComponent(since)}` : ''
  return request(`${baseUrl}/v1/sync/pull${qs}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
}
