# Revisión de seguridad

Revisión de la Fase 5a (18 de octubre de 2026) frente a los requisitos de seguridad del prompt inicial. Cada punto indica cómo se cumple y con qué se comprueba.

## Resumen

- **Secreto del sorteo**: se cumple. Nadie recibe asignaciones ajenas, tampoco el organizador; lo comprueban tests de integración que recorren todas las respuestas.
- **Dependencias de producción**: 0 vulnerabilidades (`npm audit --omit=dev` en backend y frontend).
- **Corregido en esta revisión**:
  - cabeceras de seguridad en el API (`helmet`) y en el frontend (`_headers` con CSP);
  - el CLI de shadcn estaba como dependencia de producción del frontend y arrastraba 7 avisos de `npm audit`; pasa a desarrollo.
- **Riesgos aceptados**: los de «Limitaciones conocidas» del README, más los avisos de herramientas de desarrollo que no se despliegan (ver abajo).

## Requisitos del prompt

| Requisito                                  | Cómo se cumple                                                                                                                                                                                                                                            | Comprobación                                                                                                            |
| ------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| Secreto real                               | La asignación solo sale por `GET /api/me/assignment` con el token del propio participante. No hay rutas con id de otro participante. Los avisos del socket no llevan datos. El organizador recibe solo contador y, por persona, nombre y visto/pendiente. | `draw.e2e-spec.ts` («secreto», «vistos», avisos sin datos); prueba de mutación (si se filtra un dato, fallan los tests) |
| Tokens de 32 bytes con solo su hash        | `randomBytes(32)` en base64url; en la base de datos solo SHA-256; búsqueda por hash y `timingSafeEqual`. Se muestran una sola vez (al crear, al unirse y al regenerar).                                                                                   | `tokens.spec.ts`, `rooms.e2e-spec.ts` (el hash coincide y el token no aparece en la fila)                               |
| Token en el fragmento (#) y por cabecera   | Enlaces `/o#…` y `/p#…`; el cliente envía `Authorization: Bearer`. Los sockets lo mandan en el handshake (`auth`), no en la URL. `Referrer-Policy: no-referrer`.                                                                                          | Revisión de código; no hay `?token=` en ningún sitio                                                                    |
| Sin tokens ni datos personales en los logs | El filtro de errores solo registra método, ruta y tipo de error. El almacenamiento solo el tipo de error.                                                                                                                                                 | Pruebas reales (fases 2–4): ningún token en los logs                                                                    |
| Rate limiting por IP                       | General, crear sala, unirse y subidas, configurables. `trust proxy` para la IP real detrás de Render. Los sockets no cuentan.                                                                                                                             | `rate-limit.e2e-spec.ts`, `wishlists.e2e-spec.ts`                                                                       |
| Validación de entradas                     | `class-validator` con lista blanca (campos desconocidos rechazados), nombres con patrón y longitud, fechas, importes, enlaces solo https y sin credenciales, archivos por su tipo real y hasta 5 MB. Errores por campo en español.                        | `rooms.e2e-spec.ts`, `management.e2e-spec.ts`, `wishlists.e2e-spec.ts`, `file-type.spec.ts`                             |
| XSS                                        | React escapa todo; no hay `dangerouslySetInnerHTML`, `innerHTML` ni `eval`. Los enlaces de deseos se abren con `rel="noopener noreferrer"`. Los archivos se descargan como adjunto. CSP sin `unsafe-inline` en los scripts.                               | Búsqueda en el código; tests de enlaces                                                                                 |
| Estado en la base de datos                 | Todo el estado vive en PostgreSQL; los sockets solo avisan.                                                                                                                                                                                               | Arquitectura                                                                                                            |
| Concurrencia                               | Bloqueo de la fila de la sala en unirse, parejas, sorteo, listas, salir y expulsar; bloqueo consultivo para `MAX_ROOMS`; restricciones únicas de respaldo (nombres, `pair_members`, asignaciones).                                                        | `concurrency.e2e-spec.ts`, `draw.e2e-spec.ts`, pruebas de mutación                                                      |
| Borrado solo manual                        | Sin endpoint público: `npm run rooms`, con confirmación escribiendo el nombre. Borra los archivos de R2 y la sala en cascada.                                                                                                                             | `admin.e2e-spec.ts`                                                                                                     |

## Cabeceras

- **API** (`helmet`): `X-Content-Type-Options: nosniff`, `Strict-Transport-Security`, `X-Frame-Options: SAMEORIGIN` y sin `X-Powered-By`, entre otras. La CSP del API está desactivada: solo devuelve JSON, y con CSP Swagger UI no funcionaría. CORS solo admite el origen del frontend.
- **Frontend** (`dist/_headers`, que se genera al compilar con la URL del backend):
  - CSP: `default-src 'self'`; scripts solo propios; conexiones solo al propio sitio y al backend (HTTP y WebSocket); `frame-ancestors 'none'`; `object-src 'none'`. Los estilos admiten `'unsafe-inline'` porque los componentes usan atributos `style`.
  - Además: `X-Frame-Options: DENY`, `Referrer-Policy: no-referrer` y `Permissions-Policy` sin cámara, micrófono, ubicación ni pagos.

## Dependencias

`npm audit` del 18/10/2026:

- **Producción**: 0 vulnerabilidades en backend, frontend y raíz.
- **Solo desarrollo** (no se despliegan): avisos en `esbuild` (dentro de `drizzle-kit`), `tmp` y `undici` (dentro de Testcontainers) y `braces` (dentro del CLI de shadcn). `npm audit fix` no los resuelve sin cambios incompatibles. Afectan a herramientas que solo se ejecutan en local y con datos de prueba.

## Otros puntos revisados

- **Swagger en producción**: queda público en `/api/docs`, como pide el prompt. No contiene secretos ni ejemplos con tokens reales.
- **`TRUST_PROXY=1`**: correcto detrás del proxy de Render. Sin proxy (en local), un cliente podría falsear `X-Forwarded-For` y saltarse el límite de peticiones; no afecta a producción.
- **Reintentos al despertar el servidor**: el frontend solo reintenta si la petición no llegó a la app (sin conexión, o 502/503/504 del hosting sin el formato de error JSON), así que no duplica operaciones.
- **URLs firmadas**: duran 5 minutos, solo se dan a participantes de la misma sala y no se pueden alterar (probado: firma cambiada → 403).

## Riesgos aceptados

Los de «Limitaciones conocidas» del README, entre ellos:

- el organizador conoce el enlace que regenera;
- sin copias de seguridad;
- quien tenga la invitación ve los nombres de la sala antes de entrar.
