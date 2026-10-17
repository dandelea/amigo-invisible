# Amigo Invisible

Aplicación web de “Amigo Invisible” (Secret Santa) para grupos, pensada para móvil y para personas sin conocimientos técnicos. Sin cuentas: el organizador crea una sala, comparte un enlace y lanza el sorteo en directo. Cada participante ve solo a quién le toca regalar.

Proyecto personal y de aprendizaje, gratuito y sin monetización. Solo en español.

> **Estado:** Fase 1 cerrada (algoritmo del sorteo). Todavía no hay funcionalidad visible para el usuario: ver [`CONTEXT.md`](CONTEXT.md).

## Requisitos

- Node.js 24 o superior y npm 11.
- Para las fases con base de datos y archivos: una base de datos PostgreSQL (Neon) y un bucket de Cloudflare R2.

## Estructura del repositorio

```
backend/        API NestJS + Socket.IO + Drizzle (PostgreSQL)
frontend/       SPA React + Vite + Tailwind + shadcn/ui
docs/
  mockups/      Mockups de diseño (ver docs/mockups/MOCKUPS.md)
  openapi.json  Esquema OpenAPI exportado desde el backend
  componentes.md  Componentes reutilizables del frontend
CONTEXT.md      Estado del proyecto para traspasos
Prompt_inicial_Amigo_Invisible.md   Fuente de verdad del proyecto
```

## Instalación

```bash
cd backend && npm install && cp .env.example .env
cd ../frontend && npm install && cp .env.example .env
```

## Variables de entorno

Nunca subas archivos `.env` al repositorio; solo los `.env.example`.

### Backend (`backend/.env`)

| Variable | Obligatoria | Por defecto | Descripción |
|---|---|---|---|
| `NODE_ENV` | No | `development` | `development`, `test` o `production`. |
| `PORT` | No | `3000` | Puerto HTTP (Render lo define solo). |
| `MAX_ROOMS` | No | `10` | Tope global de salas existentes. Al alcanzarlo no se pueden crear más. |
| `CORS_ORIGIN` | No | `http://localhost:5173` | Origen del frontend permitido. |
| `TRUST_PROXY` | No | `1` | Saltos de proxy de confianza para obtener la IP real (rate limiting). |
| `DATABASE_URL` | Desde la Fase 2 | — | Cadena de conexión de Neon, con `sslmode=require`. |
| `R2_ACCOUNT_ID` | Desde la Fase 3 | — | Cuenta de Cloudflare. |
| `R2_ACCESS_KEY_ID` | Desde la Fase 3 | — | Clave de acceso de R2. |
| `R2_SECRET_ACCESS_KEY` | Desde la Fase 3 | — | Secreto de R2. |
| `R2_BUCKET` | Desde la Fase 3 | — | Nombre del bucket. |

Si una variable es inválida, el backend no arranca y muestra solo su nombre, nunca su valor.

### Frontend (`frontend/.env`)

| Variable | Descripción |
|---|---|
| `VITE_API_URL` | URL pública del backend, sin barra final. |

## Arrancar en local

```bash
# Backend: http://localhost:3000 · Swagger en http://localhost:3000/api/docs
cd backend && npm run start:dev

# Frontend: http://localhost:5173
cd frontend && npm run dev
```

## Tests

```bash
cd backend
npm test            # unitarios
npm run test:e2e    # integración / e2e
npm run lint

cd frontend
npm test
npm run lint
```

## Documentación de la API

- Swagger UI en `/api/docs` (JSON en `/api/docs-json`).
- Exportar el esquema al repo después de cualquier cambio en endpoints o DTOs: `cd backend && npm run openapi` (escribe `docs/openapi.json`).
- Autenticación: cada enlace secreto lleva un token en el fragmento de la URL (`#`), que nunca llega a los logs del servidor. El cliente lo envía en `Authorization: Bearer <token>`. El servidor solo guarda su hash SHA-256.
- Errores: todas las respuestas de error tienen la forma `{ statusCode, error, message }`, donde `error` es un código estable (`NOT_FOUND`, `ROOM_FULL`…).

### Endpoints actuales

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/health` | Comprueba que el servidor está despierto. |

## Eventos de WebSocket

Todavía no hay ninguno; llegan en la Fase 2. Se documentarán aquí con su nombre, emisor, receptor, payload y qué recibe cada rol (organizador o participante). La asignación del sorteo solo se emite al socket del propio participante.

## Arquitectura

- **Frontend** (Cloudflare Pages): SPA estática. Las rutas de invitación, personal y gestión son rutas del cliente; Pages sirve `index.html` para cualquier ruta sin archivo, porque no hay `404.html`.
- **Backend** (Render Free): NestJS en una sola instancia. API REST bajo `/api`, `/health` fuera del prefijo y un gateway de Socket.IO con una room por sala (adaptador en memoria). Todo el estado vive en la base de datos; los sockets solo notifican.
- **Base de datos** (Neon): PostgreSQL con Drizzle ORM y migraciones de `drizzle-kit`. Todo cuelga de la sala con `ON DELETE CASCADE`.
- **Archivos** (Cloudflare R2): las subidas pasan por el backend, que valida el tipo real y el tamaño. Las descargas usan URLs firmadas de corta duración y no pasan por el backend.

## Algoritmo del sorteo

Implementado en `backend/src/draw/draw.ts`, como función pura sin base de datos ni sockets.

- **Resultado:** un único ciclo aleatorio (A→B→C→…→A). Todos regalan y reciben exactamente una vez, nadie se regala a sí mismo y no hay parejas cerradas A↔B.
- **Regla de pareja (opcional por sala):** los dos miembros de una pareja no pueden ser vecinos en el ciclo, ni A→B ni B→A.
- **Viabilidad sin buscar:** cada persona tiene como mucho una pareja, así que puede ir junto a otras n−2 como mínimo. Para n ≥ 4 eso es al menos la mitad del grupo y el teorema de Dirac garantiza un ciclo válido. El único caso imposible es 3 participantes con una pareja y la regla activa. `checkDrawFeasibility` lo detecta antes de ejecutar, para avisar al organizador.
- **Aleatoriedad:** Fisher–Yates con `crypto.randomInt` (nunca `Math.random`), descartando los ciclos que incumplen la regla. Barajar de forma uniforme y descartar da un ciclo uniforme entre los válidos. Cada intento acierta con probabilidad 1/3 o más (el peor caso es n = 4 con 2 parejas); el límite de 10 000 intentos solo evita un bucle infinito.
- **Errores** (`DrawError.code`): `TOO_FEW_PARTICIPANTS` (menos de 3), `TOO_MANY_PARTICIPANTS` (más de 30), `INVALID_INPUT` (participantes repetidos o parejas mal formadas) y `NO_SOLUTION`.

## Decisiones técnicas

| Decisión | Motivo |
|---|---|
| Drizzle como ORM | Tipado fuerte, API cercana a SQL y bloqueo de filas nativo (`.for('update')`) para el sorteo, `MAX_ROOMS` y el tope de 30. Ligero para arrancar en frío. |
| Render Free | WebSockets admitidos y sin tarjeta. Se duerme a los 15 min; el frontend muestra “Despertando el servidor”. |
| Neon | Se suspende a los 5 min y despierta en milisegundos, sin pausar el proyecto (Supabase pausa todo tras una semana). |
| Cloudflare Pages | Estático gratuito con fallback de SPA automático. |
| Cloudflare R2 | 10 GB gratis y salida de datos gratuita; el peor caso es 1,5 GB. Pide tarjeta para verificar, sin cobro dentro de la capa gratuita. |
| Figtree autoalojada | Se sirve desde el propio frontend con `@fontsource`, sin depender de Google Fonts. |
| Exportación de OpenAPI compilada | `npm run openapi` usa `tsc` (vía `nest build`) porque los metadatos de los decoradores son necesarios para Swagger y la inyección de dependencias. |

Las condiciones de las capas gratuitas se comprobaron el 17 de octubre de 2026; revísalas antes de desplegar.

## Despliegue manual

Se completa en la Fase 5. Esquema previsto:

1. **Base de datos:** crear el proyecto en Neon y aplicar las migraciones desde local con `DATABASE_URL` apuntando a Neon: `cd backend && npm run db:migrate`.
2. **Backend:** servicio web en Render con raíz `backend/`, build `npm ci && npm run build`, arranque `npm run start:prod` y las variables de entorno de la tabla.
3. **Frontend:** proyecto en Cloudflare Pages con raíz `frontend/`, build `npm ci && npm run build`, salida `dist` y `VITE_API_URL`.
4. **R2:** crear el bucket y unas credenciales limitadas a ese bucket. Configurar una alerta de facturación.

## Borrado de salas

La aplicación nunca borra salas. El único borrado es manual, por el administrador, con un script local sin endpoint público (llega en la Fase 5). El script elimina la sala y, en cascada, participantes, parejas, listas, tokens y sorteos, además de sus archivos en R2.

## Limitaciones conocidas

Aceptadas en el MVP:

- Sin copias de seguridad: un borrado manual erróneo o la pérdida de la base de datos es irreversible.
- Sin aviso de privacidad ni política de datos: proyecto personal de uso cercano.
- El organizador conoce el enlace personal que regenera y podría ver esa asignación.
- Un expulsado puede volver con otro nombre usando la invitación.
- Si el organizador pierde el enlace de gestión, la sala queda sin organizador.
- Con `MAX_ROOMS` alcanzado no se admiten salas nuevas hasta borrar alguna a mano o subir el límite.
- Arranques lentos (~1 min) porque el plan gratuito del backend se duerme.
- Cualquiera con el enlace de invitación ve los nombres de quienes ya están en la sala antes de entrar.
