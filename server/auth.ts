import { createHash, timingSafeEqual } from 'node:crypto'

export const AUTH_COOKIE = 'cp_token'
export const ADMIN_COOKIE = 'cp_admin'

export function bearerToken(authorization: string | null): string | null {
  if (!authorization) return null
  const match = /^Bearer\s+(.+)$/i.exec(authorization.trim())
  return match ? match[1].trim() : null
}

export function cookieValue(cookieHeaderValue: string | null, name: string): string | null {
  if (!cookieHeaderValue) return null
  for (const part of cookieHeaderValue.split(';')) {
    const [key, ...rest] = part.trim().split('=')
    if (key === name) return decodeURIComponent(rest.join('='))
  }
  return null
}

export interface ExtractedToken {
  token: string | null
  source: 'bearer' | 'cookie' | 'query' | 'none'
  fromQuery: boolean
}

export function extractToken(headers: Headers, url: URL): ExtractedToken {
  const header = bearerToken(headers.get('authorization')) ?? headers.get('x-access-token')
  if (header) return { token: header, source: 'bearer', fromQuery: false }
  const cookie = cookieValue(headers.get('cookie'), AUTH_COOKIE)
  if (cookie) return { token: cookie, source: 'cookie', fromQuery: false }
  const query = url.searchParams.get('token')
  if (query) return { token: query, source: 'query', fromQuery: true }
  return { token: null, source: 'none', fromQuery: false }
}

/** Constant-time string compare (hashed to equal lengths). */
export function safeEqual(a: string, b: string): boolean {
  const ha = createHash('sha256').update(a).digest()
  const hb = createHash('sha256').update(b).digest()
  return timingSafeEqual(ha, hb)
}

export function isAuthorized(headers: Headers, url: URL, expected: string | undefined): boolean {
  if (!expected) return true
  const { token } = extractToken(headers, url)
  return token != null && safeEqual(token, expected)
}

/**
 * Best-effort client identity, used to key the rate limiter. Only meaningful
 * when the app sits behind a proxy that overwrites these headers (our nginx
 * config sets both to $remote_addr).
 *
 * The proxy's own header wins, and a forwarded list is read from the right:
 * a client can send X-Forwarded-For itself, and a proxy that *appends* puts
 * those forged entries on the left. Trusting the left-most entry let a client
 * pick its own rate-limit bucket (and rotate it to bypass the limit), so the
 * right-most entry — the one appended closest to us — is the defensible choice.
 */
export function clientIpFrom(headers: Headers, trustProxy: boolean, fallback: string): string {
  if (trustProxy) {
    const real = headers.get('x-real-ip')?.trim()
    if (real) return real
    const forwarded = headers.get('x-forwarded-for')
    if (forwarded) {
      const hops = forwarded
        .split(',')
        .map((part) => part.trim())
        .filter(Boolean)
      const nearest = hops[hops.length - 1]
      if (nearest) return nearest
    }
  }
  return fallback
}

export function cookieHeader(token: string, secure: boolean): string {  const parts = [
    `${AUTH_COOKIE}=${encodeURIComponent(token)}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    'Max-Age=2592000',
  ]
  if (secure) parts.push('Secure')
  return parts.join('; ')
}

/**
 * Token for the read-only stats page. A query token wins so an operator can
 * rotate ADMIN_TOKEN and log in again while an old cookie is still present;
 * the dedicated admin cookie never mixes with the shared app cookie.
 */
export function adminTokenFrom(headers: Headers, url: URL): string | null {
  const header = headers.get('x-admin-token') ?? bearerToken(headers.get('authorization'))
  if (header) return header
  const query = url.searchParams.get('token')
  if (query) return query
  return cookieValue(headers.get('cookie'), ADMIN_COOKIE)
    ?? cookieValue(headers.get('cookie'), AUTH_COOKIE)
}

export function isAdminAuthorized(headers: Headers, url: URL, expected: string | undefined): boolean {
  if (!expected) return true
  const token = adminTokenFrom(headers, url)
  return token != null && safeEqual(token, expected)
}

export function adminCookieHeader(token: string, secure: boolean): string {
  const parts = [
    `${ADMIN_COOKIE}=${encodeURIComponent(token)}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    'Max-Age=2592000',
  ]
  if (secure) parts.push('Secure')
  return parts.join('; ')
}

/** Prepend the public base path (when mounted under a sub-path) to a location. */
export function withBasePath(basePath: string, pathname: string, search = ''): string {
  const base = (basePath || '').replace(/\/+$/, '')
  const path = pathname.startsWith('/') ? pathname : `/${pathname}`
  return `${base}${path}${search}` || '/'
}
