/**
 * Auth Mapping Utilities
 * Maps human-friendly user IDs (e.g. "moonpie8472") to virtual email addresses for Supabase Auth,
 * and formats displayed usernames.
 */

// Normalizes user inputs (removes starting '@' and trims whitespace)
export function normalizeUserId(rawId: string): string {
  const trimmed = rawId.trim().toLowerCase();
  return trimmed.startsWith('@') ? trimmed.slice(1) : trimmed;
}

// Converts a unique User ID to a virtual email address
export function userIdToEmail(userId: string): string {
  const normalized = normalizeUserId(userId);
  if (!normalized) return '';
  return `${normalized}@splitly.com`;
}

// Formats a User ID for display (e.g. "moonpie8472" -> "@moonpie8472")
export function formatUserId(userId: string): string {
  const normalized = normalizeUserId(userId);
  if (!normalized) return '';
  return `@${normalized}`;
}
