import { z } from 'zod';

// Variables de entorno, validadas al arrancar.
const envSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'test', 'production'])
    .default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  // Cadena de conexión de PostgreSQL (Neon en producción).
  DATABASE_URL: z.string().url(),
  // Tope global de salas existentes (ninguna se elimina automáticamente).
  MAX_ROOMS: z.coerce.number().int().positive().default(10),
  // Origen del frontend permitido por CORS (p. ej. https://amigo.pages.dev).
  CORS_ORIGIN: z.string().default('http://localhost:5173'),
  // Saltos de proxy de confianza para obtener la IP real (Render usa 1).
  TRUST_PROXY: z.coerce.number().int().min(0).default(1),
  // Límites de peticiones por IP.
  RATE_LIMIT_PER_MINUTE: z.coerce.number().int().positive().default(300),
  RATE_LIMIT_CREATE_ROOM_PER_HOUR: z.coerce
    .number()
    .int()
    .positive()
    .default(10),
  RATE_LIMIT_JOIN_PER_MINUTE: z.coerce.number().int().positive().default(30),
  RATE_LIMIT_UPLOAD_PER_HOUR: z.coerce.number().int().positive().default(30),
  // Almacenamiento de archivos compatible con S3: Cloudflare R2 en
  // producción (https://<cuenta>.r2.cloudflarestorage.com, región «auto»)
  // y VersityGW en desarrollo y tests.
  S3_ENDPOINT: z.string().url(),
  S3_REGION: z.string().min(1).default('auto'),
  S3_ACCESS_KEY_ID: z.string().min(1),
  S3_SECRET_ACCESS_KEY: z.string().min(1),
  S3_BUCKET: z.string().min(1),
});

export type Env = z.infer<typeof envSchema>;

export function validateEnv(config: Record<string, unknown>): Env {
  const result = envSchema.safeParse(config);
  if (!result.success) {
    // Solo se muestran nombres de variables, nunca sus valores.
    const fields = result.error.issues.map((i) => i.path.join('.')).join(', ');
    throw new Error(`Variables de entorno inválidas: ${fields}`);
  }
  return result.data;
}
