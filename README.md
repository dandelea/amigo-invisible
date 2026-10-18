# Amigo Invisible

Aplicación web de “Amigo Invisible” (Secret Santa) para grupos, pensada para móvil y para personas sin conocimientos técnicos. Sin cuentas: el organizador crea una sala, comparte un enlace y lanza el sorteo en directo. Cada participante ve solo a quién le toca regalar.

Proyecto personal y de aprendizaje, gratuito y sin monetización. Solo en español.

> **Estado:** Fase 4b cerrada: el backend ya hace el sorteo (con repetición, vistos y regeneración de enlaces). El frontend del sorteo es la Fase 4c. Ver [`CONTEXT.md`](CONTEXT.md).

## Requisitos

- Node.js 24 o superior y npm 11.
- Docker, para el PostgreSQL y el almacenamiento S3 de desarrollo (`docker-compose.yml`) y para los tests de integración (Testcontainers).
- En producción: una base de datos PostgreSQL en Neon y un bucket de Cloudflare R2.

## Estructura del repositorio

```
backend/        API NestJS + Socket.IO + Drizzle (PostgreSQL)
  drizzle/      Migraciones SQL generadas por drizzle-kit
frontend/       SPA React + Vite + Tailwind + shadcn/ui
docs/
  mockups/      Mockups de diseño (ver docs/mockups/MOCKUPS.md)
  openapi.json  Esquema OpenAPI exportado desde el backend
  componentes.md  Componentes reutilizables del frontend
.husky/         Hook de pre-commit (lint-staged)
.vscode/        Extensiones, depuración, tareas y ajustes recomendados
package.json    Herramientas comunes: Prettier, Husky y lint-staged
CONTEXT.md      Estado del proyecto para traspasos
docker-compose.yml  PostgreSQL (puerto 54329) y S3 local con VersityGW (puerto 59000)
Prompt_inicial_Amigo_Invisible.md   Fuente de verdad del proyecto
```

## Instalación

```bash
npm install                           # raíz: Prettier, Husky y lint-staged (activa el pre-commit)
docker compose up -d                  # PostgreSQL (54329) y S3 local (59000)
cd backend && npm install && cp .env.example .env
npm run db:migrate                    # aplica las migraciones
cd ../frontend && npm install && cp .env.example .env
```

El PostgreSQL de desarrollo usa el puerto 54329 para no chocar con un PostgreSQL instalado en el sistema. El almacenamiento S3 local es [VersityGW](https://github.com/versity/versitygw) en el puerto 59000. En desarrollo, el backend crea el bucket si no existe.

## Variables de entorno

Nunca subas archivos `.env` al repositorio; solo los `.env.example`.

### Backend (`backend/.env`)

| Variable                          | Obligatoria | Por defecto             | Descripción                                                                                                |
| --------------------------------- | ----------- | ----------------------- | ---------------------------------------------------------------------------------------------------------- |
| `NODE_ENV`                        | No          | `development`           | `development`, `test` o `production`.                                                                      |
| `PORT`                            | No          | `3000`                  | Puerto HTTP (Render lo define solo).                                                                       |
| `DATABASE_URL`                    | **Sí**      | —                       | Cadena de conexión de PostgreSQL. En local, la del `.env.example`; en Neon, con `sslmode=require`.         |
| `MAX_ROOMS`                       | No          | `10`                    | Tope global de salas existentes. Al alcanzarlo no se pueden crear más.                                     |
| `CORS_ORIGIN`                     | No          | `http://localhost:5173` | Origen del frontend permitido.                                                                             |
| `TRUST_PROXY`                     | No          | `1`                     | Saltos de proxy de confianza para obtener la IP real (rate limiting).                                      |
| `RATE_LIMIT_PER_MINUTE`           | No          | `300`                   | Peticiones por minuto y por IP en toda la API. Generoso porque un grupo puede compartir wifi.              |
| `RATE_LIMIT_CREATE_ROOM_PER_HOUR` | No          | `10`                    | Salas que se pueden crear por hora y por IP.                                                               |
| `RATE_LIMIT_JOIN_PER_MINUTE`      | No          | `30`                    | Entradas en salas por minuto y por IP.                                                                     |
| `RATE_LIMIT_UPLOAD_PER_HOUR`      | No          | `30`                    | Subidas de archivos por hora y por IP.                                                                     |
| `S3_ENDPOINT`                     | **Sí**      | —                       | Almacenamiento S3. En R2: `https://<cuenta>.r2.cloudflarestorage.com`; en local: `http://localhost:59000`. |
| `S3_REGION`                       | No          | `auto`                  | `auto` en R2; `us-east-1` en local.                                                                        |
| `S3_ACCESS_KEY_ID`                | **Sí**      | —                       | Clave de acceso (en R2, la de un token de API limitado al bucket).                                         |
| `S3_SECRET_ACCESS_KEY`            | **Sí**      | —                       | Secreto de esa clave.                                                                                      |
| `S3_BUCKET`                       | **Sí**      | —                       | Nombre del bucket.                                                                                         |

Si una variable es inválida, el backend no arranca y muestra solo su nombre, nunca su valor. En local, el backend carga `backend/.env` con `process.loadEnvFile`; en producción las variables las define el hosting.

### Frontend (`frontend/.env`)

| Variable       | Descripción                               |
| -------------- | ----------------------------------------- |
| `VITE_API_URL` | URL pública del backend, sin barra final. |

## Arrancar en local

```bash
docker compose up -d                       # PostgreSQL y S3 local (si no están ya arrancados)

# Backend: http://localhost:3000 · Swagger en http://localhost:3000/api/docs
cd backend && npm run start:dev

# Frontend: http://localhost:5173
cd frontend && npm run dev
```

### Pantallas del frontend

| Ruta           | Pantalla                                                                                                                                                                |
| -------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/`            | Inicio: explicación en 3 pasos y «Crear sala» (o «Ahora mismo no se admiten más salas»)                                                                                 |
| `/crear`       | Formulario de la sala                                                                                                                                                   |
| `/creada`      | Enlaces de invitación y de gestión, justo después de crear. Si se recarga, vuelve al inicio: el enlace de gestión solo se muestra una vez                               |
| `/s/<código>`  | Unirse con un nombre (o «Sala llena» / «Sala cerrada»)                                                                                                                  |
| `/p#<token>`   | Sala del participante, en tiempo real: parejas, listas de deseos de todos (botón de regalo), «Mi lista de deseos» con su editor (enlace o archivo) y «Salir de la sala» |
| `/o#<token>`   | Panel del organizador, en tiempo real: editar la sala, regla de pareja, marcar y deshacer parejas, enlace de invitación y menú ⋮ por persona para expulsar              |
| `/salida`      | «Has salido de la sala», tras salir                                                                                                                                     |
| cualquier otra | «No encontrado»                                                                                                                                                         |

El frontend está en `frontend/src`:

- `api/`: cliente HTTP y tipos;
- `realtime/`: Socket.IO;
- `hooks/use-live-room.ts`: carga la sala y la recarga con cada aviso;
- `components/`: los componentes de `docs/componentes.md`;
- `pages/`: las pantallas;
- `texts/es.ts`: todos los textos.

## Tests

```bash
npm test            # desde la raíz: unitarios del backend y tests del frontend

cd backend
npm test            # unitarios
npm run test:e2e    # integración (necesita Docker: PostgreSQL 17 y VersityGW con Testcontainers)

cd frontend
npm test            # componentes y pantallas (Testing Library), con la API y el socket simulados
```

## Calidad de código

- **ESLint 9** en cada paquete (`eslint.config.*`): reglas recomendadas de JavaScript y de TypeScript con tipos. En el frontend, además, reglas de hooks de React, Fast Refresh y accesibilidad (`jsx-a11y`). Se usa ESLint 9 y no la 10 porque `jsx-a11y` todavía no admite la 10.
- **Prettier** con un estilo común para todo el repo (`.prettierrc.json`: comillas simples, comas finales y punto y coma). `.prettierignore` excluye lo generado (`dist`, migraciones, `docs/openapi.json`) y los mockups.
- **Pre-commit** con Husky y lint-staged: al hacer commit se pasan `eslint --fix` y Prettier solo sobre los archivos preparados. Si queda algún error de ESLint, el commit se cancela. Cada paquete tiene su `.lintstagedrc.json`; el de la raíz cubre los archivos sueltos (README, docs…).

```bash
npm run lint             # raíz: ESLint en backend y frontend
npm run format           # raíz: Prettier en todo el repo
npm run format:check     # raíz: comprobar el formato sin cambiar nada
cd backend && npm run lint:fix   # (o frontend) arreglar lo que ESLint sepa arreglar
```

## VS Code

Al abrir el proyecto, VS Code propone las extensiones recomendadas (`.vscode/extensions.json`): ESLint, Prettier, Tailwind CSS IntelliSense, Vitest, Container Tools y Error Lens. Con `.vscode/settings.json` se formatea al guardar y se aplican los arreglos de ESLint.

Configuraciones de depuración (`.vscode/launch.json`, en «Ejecutar y depurar»):

| Configuración                                             | Qué hace                                                                                        |
| --------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| Backend: depurar (watch)                                  | Arranca `npm run start:dev` y asocia el depurador a la app (con mapas de fuente).               |
| Backend: asociar al proceso (puerto 9229)                 | Se asocia a un backend lanzado con `npm run start:debug`.                                       |
| Backend: test unitario del archivo abierto                | Vitest con depurador sobre el archivo `.spec.ts` abierto.                                       |
| Backend: test de integración del archivo abierto (Docker) | Igual, para un `.e2e-spec.ts`.                                                                  |
| Frontend: depurar en Chrome                               | Arranca Vite (tarea `frontend: dev`) y abre Chrome con el depurador en `http://localhost:5173`. |
| Frontend: test del archivo abierto                        | Vitest con depurador sobre el test abierto.                                                     |
| Depurar todo                                              | Backend y frontend a la vez.                                                                    |

Antes de depurar el backend hacen falta los servicios (tarea `servicios: docker compose up`) y `backend/.env`. Para depurar el frontend, el puerto 5173 tiene que estar libre.

## Documentación de la API

- Swagger UI en `/api/docs` (JSON en `/api/docs-json`).
- Exportar el esquema al repo después de cualquier cambio en endpoints o DTOs: `cd backend && npm run openapi` (escribe `docs/openapi.json`).
- Autenticación: cada enlace secreto lleva un token en el fragmento de la URL (`#`), que nunca llega a los logs del servidor. El cliente lo envía en `Authorization: Bearer <token>`. El servidor solo guarda su hash SHA-256.
- Errores: todas las respuestas de error tienen la forma `{ statusCode, error, message }`, donde `error` es un código estable (`NOT_FOUND`, `ROOM_FULL`…). Con `VALIDATION_ERROR` llevan además `fields`, con el primer error de cada campo en español (`{ "budget": "El presupuesto máximo es 1000 €" }`). El frontend lo muestra en rojo junto al campo, igual que su propia validación previa.

### Endpoints actuales

| Método | Ruta                                  | Token    | Descripción                                                                                                                                       |
| ------ | ------------------------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| GET    | `/health`                             | —        | Comprueba que el servidor está despierto.                                                                                                         |
| GET    | `/api/rooms/availability`             | —        | `{ canCreateRoom }`: false al alcanzar `MAX_ROOMS`.                                                                                               |
| POST   | `/api/rooms`                          | —        | Crea una sala. Devuelve `inviteCode` y `manageToken` (solo esta vez). 503 `MAX_ROOMS_REACHED`.                                                    |
| GET    | `/api/invitations/:code`              | —        | Resumen público para unirse: datos, nombres y `cannotJoinReason`.                                                                                 |
| POST   | `/api/invitations/:code/participants` | —        | Se une con un nombre. Devuelve `participantToken` (solo esta vez). 409 `ROOM_FULL`, `ROOM_CLOSED` o `NAME_TAKEN`.                                 |
| GET    | `/api/me`                             | Personal | Estado de la sala para el participante.                                                                                                           |
| GET    | `/api/manage`                         | Gestión  | Estado de la sala para el organizador, con las parejas.                                                                                           |
| PATCH  | `/api/manage/room`                    | Gestión  | Edita nombre, fecha o presupuesto (solo los campos enviados; `null` borra la fecha o el presupuesto).                                             |
| PUT    | `/api/manage/pair-rule`               | Gestión  | `{ enabled }`: activa o desactiva la regla de pareja.                                                                                             |
| POST   | `/api/manage/pairs`                   | Gestión  | `{ participantIds: [a, b] }`: marca una pareja. 409 `ALREADY_PAIRED`.                                                                             |
| DELETE | `/api/manage/pairs/:pairId`           | Gestión  | Deshace una pareja.                                                                                                                               |
| DELETE | `/api/manage/participants/:id`        | Gestión  | Expulsa: borra su pareja, su lista y su archivo, y cierra sus sockets.                                                                            |
| DELETE | `/api/me`                             | Personal | Sale de la sala, con el mismo efecto que expulsar.                                                                                                |
| PUT    | `/api/me/wishlist/link`               | Personal | `{ url }` https: reemplaza la lista.                                                                                                              |
| PUT    | `/api/me/wishlist/file`               | Personal | `multipart/form-data` con `file`: PDF, JPEG, PNG o WebP de hasta 5 MB según su contenido real. 413 `FILE_TOO_LARGE`, 415 `UNSUPPORTED_FILE_TYPE`. |
| DELETE | `/api/me/wishlist`                    | Personal | Quita la lista (y borra el archivo).                                                                                                              |
| GET    | `/api/wishlists/:participantId/file`  | Personal | `{ url, expiresInSeconds }`: URL firmada de 5 minutos para descargar el archivo de alguien de la misma sala.                                      |
| POST   | `/api/manage/draw`                    | Gestión  | Hace el sorteo y cierra la sala. Idempotente (un doble clic no sortea dos veces). 409 `NO_SOLUTION` o `TOO_FEW_PARTICIPANTS`.                     |
| POST   | `/api/manage/redraw`                  | Gestión  | Repite el sorteo con los mismos participantes y reinicia los vistos. 409 `NOT_DRAWN`.                                                             |
| POST   | `/api/manage/participants/:id/token`  | Gestión  | Regenera el enlace personal (antes o después del sorteo). El anterior deja de valer y se cierran sus sockets; el nuevo se devuelve solo esta vez. |
| GET    | `/api/me/assignment`                  | Personal | La asignación propia: la persona a la que regala, con su lista de deseos. 409 `NOT_DRAWN`.                                                        |
| POST   | `/api/me/assignment/seen`             | Personal | `{ round }`: marca el resultado como visto (solo cuenta si es la ronda actual).                                                                   |

Todas las modificaciones exigen que la sala esté abierta (409 `ROOM_CLOSED` después del sorteo). `/api/manage` incluye `draw`: ronda, viabilidad (para avisar «No hay solución» antes de sortear), contador de vistos y la lista de vistos con **solo nombre y estado**. `/api/me` incluye `draw` (ronda y si ya lo ha visto) y la lista de deseos de cada participante (el enlace, o el nombre, tipo y tamaño del archivo) y las parejas; la clave del archivo en el almacenamiento nunca sale del backend.

Un token ausente, mal formado o inválido devuelve siempre el mismo 404 `NOT_FOUND`, para no revelar si un enlace existió.

### Enlaces del frontend

| Enlace     | Forma                   | Quién                       |
| ---------- | ----------------------- | --------------------------- |
| Invitación | `/s/<inviteCode>`       | Para compartir con el grupo |
| Gestión    | `/o#<manageToken>`      | Solo el organizador         |
| Personal   | `/p#<participantToken>` | Solo ese participante       |

Los tokens van en el fragmento (`#`): el navegador no los envía al servidor al cargar la página.

## Eventos de WebSocket

Socket.IO en el namespace `/rooms`. El cliente se conecta con `auth: { role: 'organizer' | 'participant', token }`. El token va en el handshake, nunca en la URL. Si el token no es válido, la conexión se rechaza con `connect_error` (`NOT_FOUND`) y el cliente no reintenta solo.

**Los eventos solo avisan y no llevan datos.** Al recibir un aviso, o al conectar y reconectar, el cliente vuelve a pedir el estado por HTTP (`/api/me` o `/api/manage`), que ya filtra lo que puede ver cada rol. Así ningún evento puede filtrar datos ajenos y la reconexión siempre recarga el estado actual.

| Evento         | Emisor   | Receptor                               | Payload | Cuándo                                                                                                                                                                                                                                                                |
| -------------- | -------- | -------------------------------------- | ------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `room:changed` | Servidor | Organizador y participantes de la sala | Ninguno | Alguien entra, sale o es expulsado; se marca o deshace una pareja; cambia la regla de pareja o los datos de la sala; alguien cambia su lista de deseos. También al sortear, al repetir el sorteo y cuando alguien ve su resultado (para el contador del organizador). |

Cada socket entra en la room `room:<id>` de su sala; los de participantes, también en `participant:<id>`. Al expulsar a alguien, cuando sale o al regenerar su enlace, el servidor cierra sus sockets (motivo `io server disconnect`, sin reconexión automática): el cliente recarga y recibe «No encontrado». La asignación del sorteo nunca viaja por el socket: el participante la pide por HTTP con su token (`GET /api/me/assignment`), así que nadie puede recibir una ajena.

## Arquitectura

- **Frontend** (Cloudflare Pages): SPA estática. Las rutas de invitación, personal y gestión son rutas del cliente; Pages sirve `index.html` para cualquier ruta sin archivo, porque no hay `404.html`.
- **Backend** (Render Free): NestJS en una sola instancia. API REST bajo `/api`, `/health` fuera del prefijo y un gateway de Socket.IO con una room por sala (adaptador en memoria). Todo el estado vive en la base de datos; los sockets solo notifican.
- **Base de datos** (Neon): PostgreSQL con Drizzle ORM y migraciones de `drizzle-kit`. Todo cuelga de la sala con `ON DELETE CASCADE`.
- **Archivos** (Cloudflare R2; VersityGW en desarrollo y tests): las subidas pasan por el backend, que valida el tipo real por sus primeros bytes y el tamaño. Las claves van bajo `rooms/<sala>/<participante>/`. Las descargas usan URLs firmadas de 5 minutos (como adjunto, con el nombre limpio) y no pasan por el backend, que así no gasta su tráfico de salida.

## Algoritmo del sorteo

Implementado en `backend/src/draw/draw.ts`, como función pura sin base de datos ni sockets.

- **Resultado:** un único ciclo aleatorio (A→B→C→…→A). Todos regalan y reciben exactamente una vez, nadie se regala a sí mismo y no hay parejas cerradas A↔B.
- **Regla de pareja (opcional por sala):** los dos miembros de una pareja no pueden ser vecinos en el ciclo, ni A→B ni B→A.
- **Viabilidad sin buscar:** cada persona tiene como mucho una pareja, así que puede ir junto a otras n−2 como mínimo. Para n ≥ 4 eso es al menos la mitad del grupo y el teorema de Dirac garantiza un ciclo válido. El único caso imposible es 3 participantes con una pareja y la regla activa. `checkDrawFeasibility` lo detecta antes de ejecutar, para avisar al organizador.
- **Aleatoriedad:** Fisher–Yates con `crypto.randomInt` (nunca `Math.random`), descartando los ciclos que incumplen la regla. Barajar de forma uniforme y descartar da un ciclo uniforme entre los válidos. Cada intento acierta con probabilidad 1/3 o más (el peor caso es n = 4 con 2 parejas); el límite de 10 000 intentos solo evita un bucle infinito.
- **Errores** (`DrawError.code`): `TOO_FEW_PARTICIPANTS` (menos de 3), `TOO_MANY_PARTICIPANTS` (más de 30), `INVALID_INPUT` (participantes repetidos o parejas mal formadas) y `NO_SOLUTION`.

## Decisiones técnicas

| Decisión                                   | Motivo                                                                                                                                                                                                                                                                                                                                                                                       |
| ------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ESLint en lugar de oxlint                  | Las plantillas traían oxlint; se sustituyó por ESLint para tener una sola herramienta con los plugins de React y accesibilidad.                                                                                                                                                                                                                                                              |
| Sorteo idempotente y con la sala bloqueada | `POST /api/manage/draw` bloquea la sala: un doble clic, un sorteo mientras alguien entra o varias repeticiones a la vez se procesan de una en una. Si la sala ya está sorteada, devuelve la ronda actual sin volver a sortear.                                                                                                                                                               |
| «Visto» por ronda                          | El cliente indica qué ronda ha visto; si el organizador acaba de repetir el sorteo, el resultado nuevo no se marca como visto por error.                                                                                                                                                                                                                                                     |
| Asignación por HTTP                        | El prompt pedía emitirla por el socket del participante; se decidió con el usuario pedirla por HTTP con su token. Es igual de secreta, funciona al recargar y mantiene la regla de que los sockets solo avisan.                                                                                                                                                                              |
| Bloqueos en la base de datos               | Unirse bloquea la fila de la sala (`SELECT … FOR UPDATE`), así que las entradas simultáneas se procesan de una en una y nunca superan 30 ni entran en una sala cerrada. Crear sala usa un bloqueo consultivo (`pg_advisory_xact_lock`) para que las creaciones simultáneas no superen `MAX_ROOMS`. La restricción única `(room_id, name_key)` respalda la comprobación de nombres repetidos. |
| Sockets que solo avisan                    | Todo el estado viaja por HTTP con permisos; el socket solo dice «algo ha cambiado». Es más simple y no puede filtrar datos.                                                                                                                                                                                                                                                                  |
| Configuración propia (`EnvModule`)         | Valida `process.env` al crear la app y no al importar el módulo, así cada test puede arrancar con su propia configuración. Sustituye a `@nestjs/config`.                                                                                                                                                                                                                                     |
| Testcontainers                             | Los tests de integración usan un PostgreSQL 17 real, necesario para probar bloqueos y concurrencia.                                                                                                                                                                                                                                                                                          |
| Nombres sin tildes ni mayúsculas           | `name_key` quita tildes y mayúsculas para detectar repetidos, pero conserva la ñ: «Peña» y «Pena» son distintos.                                                                                                                                                                                                                                                                             |
| Drizzle como ORM                           | Tipado fuerte, API cercana a SQL y bloqueo de filas nativo (`.for('update')`) para el sorteo, `MAX_ROOMS` y el tope de 30. Ligero para arrancar en frío.                                                                                                                                                                                                                                     |
| Render Free                                | WebSockets admitidos y sin tarjeta. Se duerme a los 15 min; el frontend muestra “Despertando el servidor”.                                                                                                                                                                                                                                                                                   |
| Neon                                       | Se suspende a los 5 min y despierta en milisegundos, sin pausar el proyecto (Supabase pausa todo tras una semana).                                                                                                                                                                                                                                                                           |
| Cloudflare Pages                           | Estático gratuito con fallback de SPA automático.                                                                                                                                                                                                                                                                                                                                            |
| Cloudflare R2                              | 10 GB gratis y salida de datos gratuita; el peor caso es 1,5 GB. Pide tarjeta para verificar, sin cobro dentro de la capa gratuita.                                                                                                                                                                                                                                                          |
| VersityGW en local                         | MinIO dejó de publicar imágenes de Docker en 2025. VersityGW es compatible con S3, verifica las firmas como R2 y es ligero, así que se prueba el mismo código que irá a producción.                                                                                                                                                                                                          |
| `pair_members`                             | Una fila por miembro de pareja, con el participante como clave primaria: la base de datos impide que alguien esté en dos parejas aunque lleguen peticiones simultáneas. El bloqueo de la sala es la primera barrera.                                                                                                                                                                         |
| Subir antes de guardar                     | El archivo se sube al almacenamiento antes de la transacción; si luego no se puede guardar (sala cerrada, participante borrado), se borra. Al reemplazar, quitar, salir o expulsar, el archivo anterior se borra tras confirmar la transacción.                                                                                                                                              |
| Nombres de archivo en UTF-8                | Multer lee por defecto los nombres como latin1; se configura `defParamCharset: 'utf8'` para que «ñ» y las tildes lleguen bien.                                                                                                                                                                                                                                                               |
| Figtree autoalojada                        | Se sirve desde el propio frontend con `@fontsource`, sin depender de Google Fonts.                                                                                                                                                                                                                                                                                                           |
| Exportación de OpenAPI compilada           | `npm run openapi` usa `tsc` (vía `nest build`) porque los metadatos de los decoradores son necesarios para Swagger y la inyección de dependencias.                                                                                                                                                                                                                                           |

Las condiciones de las capas gratuitas se comprobaron el 17 de octubre de 2026; revísalas antes de desplegar.

## Despliegue manual

Se completa en la Fase 5. Esquema previsto:

1. **Base de datos:** crear el proyecto en Neon y aplicar las migraciones desde local con `DATABASE_URL` apuntando a Neon: `cd backend && npm run db:migrate`.
2. **Backend:** servicio web en Render con raíz `backend/`, build `npm ci && npm run build`, arranque `npm run start:prod` y las variables de entorno de la tabla.
3. **Frontend:** proyecto en Cloudflare Pages con raíz `frontend/`, build `npm ci && npm run build`, salida `dist` y `VITE_API_URL`.
4. **R2:** crear el bucket y un token de API con permiso de lectura y escritura solo sobre ese bucket. Poner en Render `S3_ENDPOINT=https://<cuenta>.r2.cloudflarestorage.com`, `S3_REGION=auto`, la clave, el secreto y `S3_BUCKET`. No hace falta configurar CORS: el navegador descarga los archivos navegando a la URL firmada. Configurar una alerta de facturación.

## Borrado de salas

La aplicación nunca borra salas. El único borrado es manual, por el administrador, con un script local sin endpoint público (llega en la Fase 5). El script elimina la sala y, en cascada, participantes, parejas, listas, tokens y sorteos, además de sus archivos en R2 (todo lo que hay bajo `rooms/<id de la sala>/`).

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
