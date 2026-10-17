import { validateEnv } from './env.js';

const base = { DATABASE_URL: 'postgres://u:p@localhost:5432/db' };

describe('validateEnv', () => {
  it('aplica los valores por defecto', () => {
    const env = validateEnv(base);
    expect(env.MAX_ROOMS).toBe(10);
    expect(env.PORT).toBe(3000);
    expect(env.RATE_LIMIT_JOIN_PER_MINUTE).toBe(30);
  });

  it('lee MAX_ROOMS desde texto', () => {
    expect(validateEnv({ ...base, MAX_ROOMS: '25' }).MAX_ROOMS).toBe(25);
  });

  it('exige DATABASE_URL', () => {
    expect(() => validateEnv({})).toThrow(/DATABASE_URL/);
  });

  it('rechaza valores inválidos sin mostrar su contenido', () => {
    expect(() =>
      validateEnv({ MAX_ROOMS: '0', DATABASE_URL: 'contraseña-secreta' }),
    ).toThrow(/^Variables de entorno inválidas: DATABASE_URL, MAX_ROOMS$/);
  });
});
