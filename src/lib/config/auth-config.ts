/**
 * Centralized authentication configuration.
 * Consolidating admin emails and role identification logic to prevent out-of-sync authorization.
 */

export const ADMIN_EMAILS = [
  // "thyagonevesa.sa@gmail.com",
];

/**
 * Checks if an email is in the administrator whitelist.
 */
export function isAdminEmail(email: string | undefined): boolean {
  if (!email) return false;
  return ADMIN_EMAILS.some(adminEmail => adminEmail.toLowerCase() === email.toLowerCase());
}
