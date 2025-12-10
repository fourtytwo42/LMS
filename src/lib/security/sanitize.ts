/**
 * Security utilities for sanitizing user input and preventing XSS attacks
 */

/**
 * Sanitize HTML content to prevent XSS attacks
 * In production, use a library like DOMPurify
 */
export function sanitizeHtml(html: string): string {
  // Basic HTML sanitization - remove script tags and event handlers
  // In production, use DOMPurify or similar library
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/on\w+="[^"]*"/gi, "")
    .replace(/on\w+='[^']*'/gi, "")
    .replace(/javascript:/gi, "");
}

/**
 * Escape HTML special characters
 */
export function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  };
  return text.replace(/[&<>"']/g, (m) => map[m]);
}

/**
 * Validate and sanitize user input
 */
export function sanitizeInput(input: string, maxLength: number = 1000): string {
  if (!input || typeof input !== "string") {
    return "";
  }
  // Trim and limit length
  let sanitized = input.trim().slice(0, maxLength);
  // Remove null bytes
  sanitized = sanitized.replace(/\0/g, "");
  return sanitized;
}

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate URL format
 */
export function isValidUrl(url: string): boolean {
  try {
    const urlObj = new URL(url);
    return urlObj.protocol === "http:" || urlObj.protocol === "https:";
  } catch {
    return false;
  }
}

