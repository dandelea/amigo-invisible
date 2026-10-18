# Amigo Invisible

Aplicación web de “Amigo Invisible” (Secret Santa) para grupos, pensada para móvil y para personas sin conocimientos técnicos. Sin cuentas: el organizador crea una sala, comparte un enlace y lanza el sorteo en directo. Cada participante ve solo a quién le toca regalar.

Proyecto personal y de aprendizaje, gratuito y sin monetización. Solo en español.

> **Estado:** MVP terminado (Fase 5 cerrada): sorteo completo, accesibilidad revisada con axe, tests unitarios, de integración y e2e, revisión de seguridad ([`docs/seguridad.md`](docs/seguridad.md)) y despliegue documentado paso a paso. Ver [`CONTEXT.md`](CONTEXT.md).

## Requisitos

- Node.js 24 o superior (`.nvmrc`) y npm 11.
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
  seguridad.md    Revisión de seguridad
.husky/         Hook de pre-commit (lint-staged)
.vscode/        Extensiones, depuración, tareas y ajustes recomendados
package.json    Herramientas comunes: Prettier, Husky y lint-staged
CONTEXT.md      Estado del proyecto para traspasos
docker-compose.yml  PostgreSQL (puerto 54329) y S3 local con VersityGW (puerto 59000)
Prompt_inicial_Amigo_Invisible.md   Fuente de verdad del proyecto
e2e/            Tests e2e y de accesibilidad (Playwright)
render.yaml     Blueprint del backend en Render
.nvmrc          Versión de Node (24)
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

| Ruta           | Pantalla                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `/`            | Inicio: explicación en 3 pasos y «Crear sala» (o «Ahora mismo no se admiten más salas»)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| `/crear`       | Formulario de la sala                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| `/creada`      | Enlaces de invitación y de gestión, justo después de crear. Si se recarga, vuelve al inicio: el enlace de gestión solo se muestra una vez                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| `/s/<código>`  | Unirse con un nombre (o «Sala llena» / «Sala cerrada»)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| `/p#<token>`   | Sala del participante, en tiempo real. Antes del sorteo: parejas, listas de deseos de todos (botón de regalo), «Mi lista de deseos» con su editor y «Salir de la sala». Después: «¡Ya se ha hecho el sorteo!» → ruleta de unos 15 s (solo resultados posibles, frenada progresiva y un clic por nombre; se puede saltar; solo la primera vez y sin ella con «reducir movimiento») → resultado con la lista de deseos de su amigo invisible. Tras el sorteo sigue pudiendo cambiar su lista y, con «Ver listas de deseos», consultar las de los demás. Si se repite el sorteo, avisa y vuelve a empezar |
| `/o#<token>`   | Panel del organizador, en tiempo real. Antes del sorteo: editar la sala, regla de pareja, parejas, enlace de invitación, aviso «No hay solución» y «Sortear». Después: contador «Resultados vistos» con «Más» (quién lo ha visto, sin asignaciones) y «Repetir sorteo». El menú ⋮ de cada persona permite regenerar su enlace (siempre) y expulsar (solo antes del sorteo)                                                                                                                                                                                                                             |
| `/salida`      | «Has salido de la sala», tras salir                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| cualquier otra | «No encontrado»                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |

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

npm run e2e         # desde la raíz: e2e y accesibilidad en el Chrome del sistema (Playwright)
```

Los tests e2e (`e2e/`) necesitan `docker compose up -d` y `backend/.env`. Si backend y frontend no están arrancados, Playwright los compila y los arranca. Cubren:

- el recorrido completo, cada persona en su navegador: crear la sala, unirse, pareja, sortear, ruleta, resultado y contador del organizador;
- nombre repetido y enlace inválido;
- crear una sala solo con el teclado;
- **axe** (WCAG 2.1 A y AA, contraste incluido) en 13 pantallas y diálogos.

Al terminar borran sus salas de prueba (cuyo nombre empieza por «E2E ·»).

## Seguridad

El resumen de cómo se cumplen los requisitos de seguridad (secreto, tokens, logs, validación, XSS, cabeceras, dependencias…) está en [`docs/seguridad.md`](docs/seguridad.md). En resumen: `helmet` en el API; CSP y otras cabeceras en el frontend (`dist/_headers`, que se genera al compilar con la URL del backend de `VITE_API_URL`); y 0 vulnerabilidades en las dependencias de producción.

## Servidor dormido

El backend gratuito de Render se duerme y tarda hasta un minuto en despertar. Si una petición tarda más de 2,5 s, el frontend muestra «Despertando el servidor» encima de la página (sin perder lo que se estaba escribiendo). Si no hay conexión, o el hosting responde 502/503/504 mientras arranca, espera a que `/health` conteste y reintenta. Si pasados 90 s no responde, muestra el error con «Reintentar». Los sockets se reconectan solos y recargan el estado.

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

Las modificaciones de la sala (datos, regla, parejas, salir y expulsar) exigen que esté abierta (409 `ROOM_CLOSED` después del sorteo). La lista de deseos propia se puede crear, cambiar y quitar también después del sorteo. `/api/manage` incluye `draw`: ronda, viabilidad (para avisar «No hay solución» antes de sortear), contador de vistos y la lista de vistos con **solo nombre y estado**. `/api/me` incluye `draw` (ronda y si ya lo ha visto) y la lista de deseos de cada participante (el enlace, o el nombre, tipo y tamaño del archivo) y las parejas; la clave del archivo en el almacenamiento nunca sale del backend.

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
| Ruleta de 15 s que se puede saltar         | El prompt pedía 3–5 s; el usuario prefirió unos 15 s para dar emoción al sorteo en directo, y se recuperó el botón «Saltar animación» del mockup. La ruleta es decorativa: el resultado lo decide el servidor antes de que empiece.                                                                                                                                                          |
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

Todo en capas gratuitas. Orden recomendado: **Neon → R2 → Render → Cloudflare Pages → ajustar CORS**, porque cada paso necesita un dato del anterior. Las claves se pegan solo en los paneles de cada servicio, nunca en el repositorio.

### Servicios en uso

Dónde está cada pieza del despliegue actual (octubre de 2026), para saber a qué panel ir. Todo en planes gratuitos. Las URLs concretas y las claves solo están en los paneles de cada servicio.

| Pieza           | Servicio                                                        | Qué hay allí                                                                                                          |
| --------------- | --------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| Código          | [GitHub](https://github.com)                                    | Repositorio público; Render y Cloudflare Pages leen de él.                                                            |
| Base de datos   | [Neon](https://console.neon.tech)                               | Proyecto PostgreSQL en Frankfurt. Cadena directa para migraciones y _pooled_ para la app.                             |
| Archivos        | [Cloudflare R2](https://dash.cloudflare.com)                    | Bucket de las listas de deseos y token de API limitado a ese bucket.                                                  |
| Backend         | [Render](https://dashboard.render.com)                          | Servicio web creado con `render.yaml` (Blueprint), Free y en Frankfurt. Variables de entorno y logs.                  |
| Frontend        | [Cloudflare Pages](https://dash.cloudflare.com)                 | Proyecto de **Pages** (no un Worker, que no admite dominio propio con DNS externo), con raíz `frontend`.              |
| Dominio         | Cloudflare Pages («Custom domains») + DNS en Netlify            | Subdominio propio para el frontend; certificado HTTPS emitido por Cloudflare.                                         |
| DNS del dominio | [Netlify](https://app.netlify.com) («Domains» → «DNS settings») | Registro `CNAME` del subdominio hacia `<proyecto>.pages.dev`. Netlify no aloja nada de la app (no admite WebSockets). |

Relaciones que hay que mantener al cambiar algo:

- `CORS_ORIGIN` en Render = URL pública del frontend (el subdominio).
- `VITE_API_URL` en Pages = URL del servicio de Render; al cambiarla hay que volver a desplegar el frontend, porque también genera la CSP.
- `DATABASE_URL` en Render = cadena _pooled_ de Neon; las migraciones van con la directa (paso 1.3).
- `S3_*` en Render = endpoint, bucket y token de R2.

### 1. Base de datos (Neon)

1. Crear una cuenta y un proyecto en [neon.com](https://neon.com), en una región de Europa (p. ej. Frankfurt).
2. En «Connect», copiar dos cadenas de conexión:
   - la **directa** (sin `-pooler` en el host), para las migraciones;
   - la **pooled** (con `-pooler`), para la app.
     Las dos deben llevar `?sslmode=require`.
3. Aplicar las migraciones desde tu equipo con la cadena directa, sin guardarla en ningún archivo:

   ```bash
   cd backend
   DATABASE_URL='<cadena directa de Neon>' npm run db:migrate
   ```

### 2. Archivos (Cloudflare R2)

1. En el panel de Cloudflare, R2 → activar R2 (pide una tarjeta para verificar, sin cobro dentro de la capa gratuita) y crear un bucket (p. ej. `amigo-invisible`).
2. R2 → «Manage API tokens» → crear un token con permiso **Object Read & Write** solo sobre ese bucket. Guardar el _Access Key ID_ y el _Secret Access Key_ (el secreto se muestra una sola vez).
3. El endpoint es `https://<id de cuenta>.r2.cloudflarestorage.com` (aparece en la página del bucket).
4. Recomendado: crear una alerta de facturación en Cloudflare. No hace falta configurar CORS en el bucket: los archivos se descargan navegando a la URL firmada.

### 3. Backend (Render)

1. En [render.com](https://render.com), «New» → «Blueprint» → conectar este repositorio. Render lee `render.yaml`:
   - servicio web gratuito en Frankfurt, con raíz `backend/`;
   - build `npm ci --include=dev && npm run build` y arranque `npm run start:prod`;
   - comprobación en `/health` y Node 24;
   - sin despliegue automático.
2. Rellenar las variables que el blueprint deja vacías:

   | Variable                                    | Valor                                                    |
   | ------------------------------------------- | -------------------------------------------------------- |
   | `DATABASE_URL`                              | La cadena **pooled** de Neon                             |
   | `CORS_ORIGIN`                               | De momento `https://example.com`; se cambia en el paso 5 |
   | `S3_ENDPOINT`                               | `https://<id de cuenta>.r2.cloudflarestorage.com`        |
   | `S3_ACCESS_KEY_ID` / `S3_SECRET_ACCESS_KEY` | Las del token de R2                                      |
   | `S3_BUCKET`                                 | El nombre del bucket                                     |

3. Lanzar el despliegue («Manual Deploy»). Al terminar, `https://<servicio>.onrender.com/health` debe responder `{"status":"ok"}` y Swagger estar en `/api/docs`.

### 4. Frontend (Cloudflare Pages)

1. Cloudflare → «Workers & Pages» → «Create» → «Pages» → conectar este repositorio.
2. Configuración de build:

   | Opción               | Valor                                                                                  |
   | -------------------- | -------------------------------------------------------------------------------------- |
   | Directorio raíz      | `frontend`                                                                             |
   | Comando de build     | `npm run build` (Pages ya instala las dependencias con `npm ci` en el directorio raíz) |
   | Directorio de salida | `dist`                                                                                 |
   | Variables de entorno | `VITE_API_URL=https://<servicio>.onrender.com` (sin barra final) y `NODE_VERSION=24`   |

3. Desactivar los despliegues automáticos (ver «Actualizaciones posteriores») y desplegar. Pages aplica `dist/_headers` (CSP con la URL del backend) y, al no haber `404.html`, sirve `index.html` en cualquier ruta, así que los enlaces `/s/…`, `/p#…` y `/o#…` funcionan.
4. Opcional, dominio propio con el DNS en otro proveedor (p. ej. Netlify): en Pages → «Custom domains» → «Set up a custom domain», escribir el subdominio (p. ej. `amigo.example.com`). Pages indica el CNAME que hay que crear; en el DNS del proveedor, añadir un registro `CNAME` con el nombre del subdominio y el valor `<proyecto>.pages.dev`. Pages emite el certificado HTTPS cuando detecta el registro (de minutos a unas horas). Con DNS externo solo se pueden usar subdominios, no el dominio raíz.

### 5. Ajustar CORS y comprobar

1. En Render, cambiar `CORS_ORIGIN` a la URL del frontend (`https://<proyecto>.pages.dev`, o el dominio propio si se configuró) y volver a desplegar. Solo admite un origen: con dominio propio, la URL `pages.dev` deja de poder usar el API.
2. Comprobar desde el móvil:
   - crear una sala, unirse desde otro navegador, sortear y ver el resultado;
   - subir un archivo a la lista de deseos y descargarlo.
3. La primera visita tras 15 minutos sin uso mostrará «Despertando el servidor» durante ~1 minuto: es lo normal en el plan gratuito.

### Actualizaciones posteriores

- **Backend**: si hay migraciones nuevas, aplicarlas primero (paso 1.3) y después «Manual Deploy» en Render.
- **Frontend**: para mantener el despliegue manual del MVP, desactivar en Pages los despliegues automáticos («Settings» → «Builds» → «Automatic deployments») y lanzarlos a mano desde su panel («Retry deployment» o «Create deployment»).

## Borrado de salas

La aplicación nunca borra salas. El único borrado es manual, por el administrador, con un script local sin endpoint público:

```bash
cd backend
npm run rooms -- list                        # id, fecha, estado, participantes y nombre de cada sala
npm run rooms -- delete <id de la sala>      # pide escribir el nombre de la sala para confirmar
npm run rooms -- delete <id de la sala> --yes  # sin preguntar
```

El script usa `backend/.env`. Para producción, apunta `DATABASE_URL` y las `S3_*` a Neon y R2 en el entorno de la orden, sin guardarlas en archivos: paso a paso en [docs/borrar-salas-produccion.md](docs/borrar-salas-produccion.md). Primero borra los archivos de la sala en el almacenamiento (todo lo que hay bajo `rooms/<id>/`) y después la sala, que arrastra en cascada participantes, parejas, listas, tokens y asignaciones. Si falla el borrado de archivos, la sala queda intacta y se puede repetir. **No se puede deshacer y no hay copias de seguridad.**

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

## Licencia

[MIT](LICENSE).
