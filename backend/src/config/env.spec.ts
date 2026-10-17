import { validateEnv } from './env.js';

describe('validateEnv', () => {
  it('aplica los valores por defecto', () => {
    const env = validateEnv({});
    expect(env.MAX_ROOMS).toBe(10);
    expect(env.PORT).toBe(3000);
  });

  it('lee MAX_ROOMS desde texto', () => {
    expect(validateEnv({ MAX_ROOMS: '25' }).MAX_ROOMS).toBe(25);
  });

  it('rechaza valores inválidos sin mostrar su contenido', () => {
    expect(() =>
      validateEnv({ MAX_ROOMS: '0', DATABASE_URL: 'contraseña-secreta' }),
    ).toThrow(/^Variables de entorno inválidas: MAX_ROOMS, DATABASE_URL$/);
  });
});
