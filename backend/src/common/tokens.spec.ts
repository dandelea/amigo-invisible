import {
  generateInviteCode,
  generateToken,
  hashesMatch,
  hashToken,
  INVITE_CODE_PATTERN,
  isWellFormedToken,
} from './tokens.js';

describe('tokens', () => {
  it('genera tokens de 32 bytes en base64url, distintos cada vez', () => {
    const a = generateToken();
    const b = generateToken();
    expect(isWellFormedToken(a)).toBe(true);
    expect(Buffer.from(a, 'base64url')).toHaveLength(32);
    expect(a).not.toBe(b);
  });

  it('guarda solo un SHA-256 que no contiene el token', () => {
    const token = generateToken();
    const hash = hashToken(token);
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
    expect(hash).not.toContain(token);
    expect(hashToken(token)).toBe(hash);
  });

  it('compara hashes en tiempo constante', () => {
    const hash = hashToken(generateToken());
    expect(hashesMatch(hash, hash)).toBe(true);
    expect(hashesMatch(hash, hashToken(generateToken()))).toBe(false);
    expect(hashesMatch(hash, 'abcd')).toBe(false);
  });

  it('rechaza tokens mal formados', () => {
    expect(isWellFormedToken('corto')).toBe(false);
    expect(isWellFormedToken('a'.repeat(42) + '!')).toBe(false);
  });

  it('genera códigos de invitación de 16 caracteres', () => {
    expect(generateInviteCode()).toMatch(INVITE_CODE_PATTERN);
  });
});
