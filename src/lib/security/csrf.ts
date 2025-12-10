/**
 * CSRF protection utilities
 * For Next.js, we rely on SameSite cookies and referrer checking
 */

/**
 * Generate CSRF token (in production, use a more secure method)
 */
export function generateCsrfToken(): string {
  // In production, use crypto.randomBytes or similar
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

/**
 * Verify CSRF token
 */
export function verifyCsrfToken(token: string, storedToken: string): boolean {
  return token === storedToken && token.length > 0;
}

/**
 * Check if request origin is valid
 */
export function isValidOrigin(origin: string | null, allowedOrigins: string[]): boolean {
  if (!origin) return false;
  try {
    const originUrl = new URL(origin);
    return allowedOrigins.some((allowed) => {
      try {
        const allowedUrl = new URL(allowed);
        return originUrl.origin === allowedUrl.origin;
      } catch {
        return false;
      }
    });
  } catch {
    return false;
  }
}

