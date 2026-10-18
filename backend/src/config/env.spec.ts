import { validateEnv } from './env.js';

const base = {
  DATABASE_URL: 'postgres://u:p@localhost:5432/db',
  S3_ENDPOINT: 'http://localhost:59000',
  S3_ACCESS_KEY_ID: 'clave',
  S3_SECRET_ACCESS_KEY: 'secreto',
  S3_BUCKET: 'amigo',
};

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

  it('exige la base de datos y el almacenamiento', () => {
    expect(() => validateEnv({})).toThrow(
      /DATABASE_URL, S3_ENDPOINT, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY, S3_BUCKET/,
    );
  });

  it('rechaza valores inválidos sin mostrar su contenido', () => {
    expect(() =>
      validateEnv({
        ...base,
        MAX_ROOMS: '0',
        DATABASE_URL: 'contraseña-secreta',
      }),
    ).toThrow(/^Variables de entorno inválidas: DATABASE_URL, MAX_ROOMS$/);
  });
});
