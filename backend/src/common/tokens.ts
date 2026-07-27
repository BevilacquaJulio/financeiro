import { randomBytes } from 'node:crypto';

/**
 * Equivalente a `secrets.token_urlsafe(nbytes)` do Python:
 * nbytes aleatorios codificados em base64url, sem padding.
 */
export function randomTokenUrlsafe(nbytes = 32): string {
  return randomBytes(nbytes).toString('base64url');
}
