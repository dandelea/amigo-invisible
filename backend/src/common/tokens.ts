import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';

// Tokens secretos de los enlaces de gestión y personales: 32 bytes
// aleatorios en base64url (43 caracteres). En la base de datos solo se
// guarda su SHA-256.

const TOKEN_BYTES = 32;
const TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;

export function generateToken(): string {
  return randomBytes(TOKEN_BYTES).toString('base64url');
}

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export function isWellFormedToken(token: string): boolean {
  return TOKEN_PATTERN.test(token);
}

// Comparación en tiempo constante de dos hashes en hexadecimal.
export function hashesMatch(a: string, b: string): boolean {
  const bufA = Buffer.from(a, 'hex');
  const bufB = Buffer.from(b, 'hex');
  return bufA.length === bufB.length && timingSafeEqual(bufA, bufB);
}

// Código del enlace de invitación: 12 bytes aleatorios (16 caracteres).
// No es secreto como un token, pero no se puede adivinar.
export function generateInviteCode(): string {
  return randomBytes(12).toString('base64url');
}

export const INVITE_CODE_PATTERN = /^[A-Za-z0-9_-]{16}$/;
