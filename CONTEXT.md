# Estado del proyecto

Resumen para traspasos entre agentes. La fuente de verdad es [`Prompt_inicial_Amigo_Invisible.md`](Prompt_inicial_Amigo_Invisible.md) (versión 6).

## Fase actual

**Fase 3 (gestión): terminada el 18 de octubre de 2026, pendiente de revisión del usuario.** Siguiente: **Fase 4, sorteo**. Además de lo del prompt inicial, incluye lo que pidió el usuario: ESLint y Prettier con Husky y lint-staged, y la carpeta `.vscode/` (ver abajo). Antes de codificar, presentar un plan breve y esperar confirmación.

## Fase 3: plan confirmado

- **3a, backend** (hecha; resumen abajo).
- **3b, frontend** (hecha; resumen abajo):
  - participante: parejas en bloque (línea y corazón), botón de regalo para ver deseos («Sin lista» si no hay), «Mi lista de deseos» con Cambiar y Quitar, editor Enlace / Archivo, «Salir de la sala» con confirmación (`SalirConfirmar`) y pantalla «Has salido de la sala. Puedes volver a entrar con el enlace de invitación mientras siga abierta»;
  - organizador: interruptor de la regla de pareja (`OrganizadorRegla`), «Marcar pareja» (`MarcarPareja`) y «Deshacer pareja», menú ⋮ por persona con «Expulsar» y confirmación «¿Expulsar a Marta? Se borrarán su lista de deseos y su pareja, y su enlace dejará de funcionar», y «Editar» los datos de la sala (también desde «Sala creada»);
  - componentes `IconButton`, `SegmentedControl`, `Switch`, `SelectableOption`, `ResponsiveDialog`, `ConfirmDialog`, `ActionSheetItem`, `PairGroup`, `WishlistCard` y `WishlistEditor`;
  - al expulsar o salir, el servidor cierra el socket del participante (`io server disconnect`): el cliente debe recargar y mostrar «No encontrado».
- **Pasan a la Fase 4** (confirmado por el usuario): «Regenerar enlace personal» en el menú ⋮ y el aviso «No hay solución» junto a «Sortear».
- **Pedido por el usuario para la Fase 4** (18/10/2026): ESLint y Prettier en todo el proyecto, con Husky y lint-staged en el pre-commit. Hoy backend y frontend usan oxlint (venía con las plantillas) y solo el backend tiene Prettier: al planificar, decidir con el usuario si ESLint sustituye a oxlint o convive con él.
- **Pedido por el usuario para la Fase 4** (18/10/2026): carpeta `.vscode/` con configuraciones de depuración recomendadas (`launch.json`) y extensiones recomendadas (`extensions.json`) para este proyecto. El `.gitignore` ya deja pasar `.vscode/extensions.json`; habrá que permitir también `launch.json`.

## Fase 3b: resumen

### Hecho

- **Participante** (`src/pages/participant-page.tsx`):
  - parejas agrupadas en `PairGroup`, con línea, corazón y `aria-label` «Pareja: Ana y Luis»;
  - botón de regalo por persona con lista (`WishlistButton`): diálogo con «Abrir enlace» (`target="_blank" rel="noopener noreferrer"`) o «Descargar archivo» (pide la URL firmada en el momento); «Sin lista» si no tiene;
  - `MyWishlist` con Añadir o Cambiar y Quitar, y el editor Enlace / Archivo (valida https, tipo y 5 MB antes de enviar; tacha el archivo actual al elegir uno nuevo);
  - «Salir de la sala» con `ConfirmDialog` y la ruta `/salida`.
  - Tras el sorteo no se puede editar ni salir, pero las listas se siguen viendo.
- **Organizador** (`src/pages/organizer-page.tsx`):
  - «Editar» (`EditRoomDialog`, solo envía los campos cambiados);
  - interruptor de la regla de pareja con el estado en texto;
  - «Marcar pareja» (`MarkPairDialog`, solo personas sin pareja y como mucho dos) y «Deshacer pareja»;
  - menú ⋮ con «Expulsar» y su confirmación (`ParticipantActions`);
  - «Sin pareja» bajo quien no la tiene.
  - Tras el sorteo, todo bloqueado.
- **«Sala creada»** tiene «Editar», y los cambios se ven al momento.
- **Socket**: si el servidor lo cierra (`io server disconnect`), se recarga el estado y aparece «No encontrado».
- **Componentes base nuevos**: `ResponsiveDialog`, `ConfirmDialog`, `IconButton` (con tooltip), `SegmentedControl`, `Switch`, `SelectableOption` y `ActionSheetItem`. La lógica del formulario de la sala está en `hooks/use-room-form.ts`, compartida por crear y editar.
- **Tests**: 60 en el frontend y ningún aviso en la consola; backend con 65 unitarios y 108 de integración.

- **Validación de formularios** (pedido por el usuario durante la fase):
  - el presupuesto es un campo numérico (`type="number"`, de 1 a 1000, paso 0,01; Chrome en español acepta la coma);
  - el cliente valida con mensajes concretos (mínimo, máximo, decimales, no numérico, fecha pasada o a más de 2 años) y marca los campos en rojo con su explicación;
  - el servidor devuelve `fields` con el error de cada campo, que el frontend muestra igual que los suyos (crear y editar sala, unirse y enlace de deseos);
  - los campos no permitidos ya no dan mensajes en inglés.
- **Revisión visual** con Chrome sin ventana (playwright-core y el Chrome del sistema, script fuera del repo): 25 capturas en móvil y ordenador de todas las pantallas y diálogos. Se encontró y corrigió el orden en móvil del participante y del organizador: la lista debe ir antes de «Mi lista de deseos», como en los mockups. `TwoColumns` usa ahora `top` / `main` / `bottom`.

### Decisiones

- Un solo Dialog de Radix con estilos responsive en lugar de Drawer (vaul) + Dialog (se quitó vaul). Se pierde cerrar la hoja arrastrándola.
- En «Marcar pareja» se usa «Ya tiene pareja» (neutro) en lugar de «Ya emparejada / Ya emparejado» de los mockups, porque no sabemos el género.
- `lib/navigation.ts` (`goToUrl`) aísla la navegación a la URL de descarga, para poder probarla.
- `src/test/setup.ts` define un `ResizeObserver` mínimo (jsdom no lo tiene y lo usan los tooltips).

### Pendiente

- Fase 4 (sorteo y lo pedido para ella).

## Fase 3a: resumen

### Hecho

- **Esquema** (migración `drizzle/0001_gestion.sql`):
  - `pairs`, ordenada con `a < b`;
  - `pair_members`, una fila por miembro con el participante como clave primaria, para que nadie pueda estar en dos parejas;
  - `wishlists`, un elemento por participante, enlace o archivo, con un `CHECK` de forma.
  - Todo con `ON DELETE CASCADE`.
- **Almacenamiento** (`src/storage/`):
  - `StorageService` sobre el SDK de S3: subir, borrar sin lanzar error y URL firmada de 5 minutos como adjunto con nombre UTF-8. En desarrollo y tests crea el bucket.
  - `file-type.ts` detecta PDF, JPEG, PNG y WebP por sus primeros bytes y limpia el nombre.
  - Las variables `S3_*` sustituyen a las `R2_*`.
- **Endpoints**:
  - `OrganizerController` (`/api/manage/room`, `pair-rule`, `pairs`, `participants/:id`);
  - `DELETE /api/me` (salir);
  - `WishlistsController` (`/api/me/wishlist/link|file`, `DELETE /api/me/wishlist`, `GET /api/wishlists/:id/file`).
  - `lockOpenRoom` (`src/rooms/room-lock.ts`) bloquea la sala y exige que esté abierta en todas las modificaciones.
  - `MembershipService` reúne expulsar y salir: borra en cascada, borra el archivo, cierra los sockets y avisa.
- **Vistas**: `/api/me` con la lista de deseos de cada participante y las parejas; `/api/manage` con las parejas.
- **Límites**: límite de subidas por IP (`RATE_LIMIT_UPLOAD_PER_HOUR`). 413 → `FILE_TOO_LARGE` con mensaje en español; 415 → `UNSUPPORTED_FILE_TYPE`.
- **Desarrollo y tests**: VersityGW v1.9.0 en docker-compose (puerto 59000) y en Testcontainers; `resetDb` vacía también el bucket.
- **Tests**: 64 unitarios y 107 de integración.
  - Los nuevos cubren parejas (repetidas, de otra sala, simultáneas, garantía en la base de datos), regla, edición, expulsar y salir (pareja, lista y archivo borrados, enlace inválido, socket cerrado), todo bloqueado tras el sorteo, enlaces https, tipo real, 5 MB justos frente a 5 MB + 1 byte, reemplazo y borrado de archivos, URL firmada (funciona, alterada da 403, solo misma sala) y límite de subidas.
- **Prueba real** con docker compose: pareja, subida con «ñ» en el nombre, descarga firmada idéntica y expulsión (el archivo desaparece). Ningún token en el log.

### Decisiones

- **MinIO no está disponible** (sin imágenes públicas en Docker Hub ni en quay.io): el usuario eligió **VersityGW**, probado antes con URLs firmadas y rechazo de firmas y credenciales incorrectas.
- **`pair_members`**: el test de concurrencia de parejas pasaba incluso sin el bloqueo, porque cada transacción es demasiado corta para solaparse. En vez de depender del bloqueo, la garantía está en la base de datos; se comprobó quitando el bloqueo y la comprobación previa.
- Bug de multer corregido: leía los nombres de archivo como latin1 (`defParamCharset: 'utf8'`).
- La lista de deseos solo se puede cambiar antes del sorteo y se puede consultar siempre. Solo pueden descargar los participantes de la misma sala (el organizador no ve las listas en los mockups).
- Expulsar y salir usan el mismo código (`MembershipService.remove`).

### Pendiente

- Fase 3b (frontend de la gestión).

## Fase 2b: resumen

### Hecho

- **Rutas** (React Router 8, `src/App.tsx`): `/`, `/crear`, `/creada`, `/s/:code`, `/p#token`, `/o#token` y «No encontrado» para el resto.
- **Datos**:
  - `src/api/` (cliente `fetch` con `Authorization`; los errores llegan como `ApiError` con el código del backend, o `NETWORK`);
  - `src/realtime/socket.ts` (Socket.IO: recarga al conectar, al reconectar y con cada `room:changed`; si el servidor rechaza el token, muestra «No encontrado»);
  - `src/hooks/use-live-room.ts` (aplica solo la respuesta más reciente y no borra la sala por un fallo pasajero).
- **Componentes** de la Fase 2 (lista en `docs/componentes.md`), con los colores de los mockups. En ordenador, dos columnas como en `DParticipante` y `DOrganizador`.
- **Validación en el cliente** con las mismas reglas que el backend (`src/lib/names.ts`). El presupuesto admite coma decimal.
- **Tests**: 36 en el frontend (formato, enlaces, componentes y todas las pantallas, con la API y el socket simulados).
- **Prueba real**: PostgreSQL de docker compose, backend compilado y `vite preview`. Se comprobó el fallback de SPA, el CORS y un socket de organizador por WebSocket que recibe el aviso cuando alguien entra; un token falso se rechaza.

### Decisiones

Hay tres añadidos respecto a los mockups, que se comunicaron al usuario:
- un botón «Ir a mi sala» en «Sala creada», porque si no, no hay forma de llegar al panel;
- una tarjeta con el enlace de invitación en el panel del organizador, para poder volver a compartirlo;
- la tarjeta «Guarda tu enlace personal» en la sala del participante, solo justo después de unirse.

Otras decisiones:
- «Sala creada» recibe los enlaces en el estado de la navegación; si se recarga, vuelve al inicio.
- El token del enlace se lee del fragmento y no se guarda en el navegador: el propio enlace es la forma de volver.
- El ejemplo de los mockups «sábado 20 de diciembre de 2026» es incorrecto: es domingo. La app formatea la fecha real.

### Pendiente

- Fase 3. Al expulsar o salir habrá que desconectar los sockets del participante (`participant:<id>`).

## Fase 2a: resumen

### Hecho

- **Esquema** (`src/db/schema.ts`, migración `drizzle/0000_init.sql`): tablas `rooms` y `participants`, con `ON DELETE CASCADE` y la restricción única `(room_id, name_key)`.
- **Tokens** (`src/common/tokens.ts`): 32 bytes en base64url; en la base de datos solo el SHA-256 en hexadecimal; búsqueda por hash más `timingSafeEqual`. El código de invitación son 16 caracteres aleatorios.
- **Permisos**: `AuthService` más `OrganizerGuard` y `ParticipantGuard` (`src/auth/`). Siempre 404 genérico.
- **Endpoints** en `src/rooms/rooms.controller.ts`: disponibilidad, crear sala, invitación, unirse, `/api/me` y `/api/manage`. Tabla en el README.
- **Tiempo real** (`src/realtime/`): namespace `/rooms`; se autentica en un middleware con `auth: { role, token }` y solo emite `room:changed`, sin datos.
- **Validación**: `class-validator` con mensajes en español y código `VALIDATION_ERROR`. Nombres normalizados en `src/common/names.ts`.
- **Límite de peticiones** (`src/common/rate-limit.ts`): uno general, otro para crear sala y otro para unirse, configurables por variable de entorno. No se aplica a los sockets.
- **Configuración**: `EnvModule` propio en lugar de `@nestjs/config`. `main.ts` y `drizzle.config.ts` cargan `.env` con `process.loadEnvFile`.
- **Desarrollo**: `docker-compose.yml` con PostgreSQL en el puerto 54329.
- **Tests**: 50 unitarios y 61 de integración.
  - Los de integración, con un PostgreSQL 17 real: concurrencia (31 entradas a la vez, la sala a 29, el mismo nombre 10 veces, entradas mientras la sala se cierra, 10 creaciones con `MAX_ROOMS=3`), permisos, ausencia de secretos en las respuestas, cascada al borrar, sockets y límites por IP.
  - Prueba de mutación: sin `FOR UPDATE`, la sala pasa de 30; sin el bloqueo consultivo, se supera `MAX_ROOMS`. En los dos casos fallan los tests.
- **Prueba manual** con el PostgreSQL de docker compose: migraciones, crear sala, unirse, nombre repetido y vista del organizador. El log no contenía tokens.
- Swagger, `docs/openapi.json` y README actualizados.

### Decisiones

- `MAX_ROOMS_REACHED` responde 503; `ROOM_FULL`, `ROOM_CLOSED` y `NAME_TAKEN` responden 409.
- La invitación de una sala llena o cerrada no devuelve nombres (`participantNames: []`).
- El presupuesto se recibe y se devuelve en euros y se guarda en céntimos.
- La fecha de entrega va de hoy (hora de España) a 2 años vista.
- Al participante se le muestran los ids de los demás (los necesitará para las parejas), nunca hashes ni datos internos.
- El PostgreSQL de desarrollo usa el puerto 54329 porque en la máquina del usuario ya hay un PostgreSQL en el 5432.

### Pendiente

- Fase 2b (frontend).
- Al expulsar o salir (Fase 3) habrá que desconectar los sockets del participante (`participant:<id>`).

## Fase 1: resumen

### Hecho

- `backend/src/draw/draw.ts`, una función pura con tres partes:
  - `checkDrawFeasibility(input)`: dice si se puede sortear y, si no, el código del motivo;
  - `drawCycle(input, randomInt?)`: devuelve el ciclo, donde `cycle[i]` regala a `cycle[i + 1]` y el último al primero;
  - `cycleToAssignments(cycle)`: convierte el ciclo en un mapa regalador → receptor.
- 16 tests en `draw.spec.ts`:
  - un ciclo único válido;
  - nadie se toca a sí mismo ni a su pareja, para todos los tamaños de 3 a 30 y cualquier número de parejas;
  - 3 participantes con 1 pareja se detecta como imposible;
  - 4 participantes con 2 parejas se resuelve;
  - con la regla desactivada, las parejas no bloquean el sorteo;
  - el reparto es uniforme (prueba estadística con más de 5 desviaciones típicas de margen);
  - nunca se usa `Math.random`;
  - la entrada no se modifica;
  - se rechazan las entradas inválidas.
- Prueba de mutación hecha a mano: ignorar la regla de pareja hace fallar 3 tests, y un barajado sesgado hace fallar el test de uniformidad.
- README con la sección «Algoritmo del sorteo». Swagger sin cambios: aún no hay endpoints nuevos.
- Tests en verde: backend 23 unitarios y 3 e2e; frontend 1.

### Decisiones

- La viabilidad se decide con una regla cerrada (teorema de Dirac), sin búsqueda. El único caso imposible es n = 3 con una pareja y la regla activa.
- El algoritmo valida su propia entrada (`INVALID_INPUT`), aunque el backend ya la habrá validado antes, como defensa en profundidad.
- El generador aleatorio se puede inyectar solo para los tests; por defecto es `crypto.randomInt`.

### Pendiente

- Traducir los `DrawError.code` a respuestas HTTP y a textos de `es.ts` cuando exista el endpoint de sortear (Fase 4).

## Fase 0: resumen

### Hecho

- Decisiones abiertas cerradas con el usuario y registradas en el prompt inicial (sección “Decisiones tomadas”).
- Verificadas las capas gratuitas (17/10/2026): Render Free, Neon, Cloudflare Pages y Cloudflare R2.
- Mockups extraídos en `docs/mockups/`. Se diseñaron y confirmaron 7 pantallas de móvil que faltaban (de la 18 a la 24 en `MOCKUPS.md`): unirse, nombre repetido, ya sorteado, sorteo repetido, regla de pareja, y las confirmaciones de repetir sorteo y de salir de la sala.
- Repo con `backend/`, `frontend/` y `docs/`, y git inicializado (rama `main`).
- **Backend** (NestJS 12, ESM, Vitest):
  - variables de entorno validadas con zod (`src/config/env.ts`);
  - `GET /health`;
  - formato de error uniforme (`src/common/http-exception.filter.ts`), que no registra cabeceras, cuerpo ni query;
  - `trust proxy`, CORS y prefijo `/api`;
  - Swagger en `/api/docs` con el esquema de autenticación `token`;
  - `npm run openapi` exporta `docs/openapi.json`;
  - Drizzle instalado y configurado, con el esquema vacío.
- **Frontend** (React 19, Vite 8, Tailwind 4, shadcn/ui con el preset `radix-nova`):
  - colores de los mockups como variables CSS de shadcn, más tokens propios para pareja, aviso y éxito;
  - Figtree autoalojada y solo modo claro;
  - textos centralizados en `src/texts/es.ts`;
  - Vitest con Testing Library.
- README inicial completo.
- Tests en verde: backend 7 unitarios y 3 e2e; frontend 1.

### Decisiones

- ORM Drizzle; Render, Neon, Cloudflare Pages y R2; descargas con URL firmada.
- Parejas mostradas juntas en un bloque; el organizador edita los datos de la sala mientras está abierta; un único elemento de deseos por participante.
- Se incluyen «Quitar mi lista», el menú de acciones por participante y «Editar sala». Se descarta «Saltar animación».
- La ruleta arranca con «Descubrir mi amigo invisible» y vuelve a mostrarse una vez tras repetir el sorteo.
- `npm run openapi` se ejecuta compilado: `tsx`/esbuild no emite los metadatos de los decoradores.
- El paquete `cn` lo instala shadcn y es intencionado: sustituye a `clsx` + `tailwind-merge`.

### Componentes reutilizables (lista confirmada; se implementan en la Fase 2 y siguientes)

- **Base** (`components/ui/`): `Button`, `IconButton`, `Card`, `Pill`, `Avatar`, `FormField`, `SegmentedControl`, `Switch`, `SelectableOption`, `Alert`, `ResponsiveDialog`, `ConfirmDialog`, `ActionSheetItem`, `ProgressBar`.
- **Dominio** (`components/`): `PageLayout`, `StepCard`, `StatusScreen`, `RoomHeader`, `ParticipantRow`, `PairGroup`, `ParticipantList`, `CopyLinkBox`, `WishlistCard`, `WishlistEditor`, `RevealCard`, `Roulette`, `SeenCounter`, `SeenList`.

El detalle de variantes y de qué componente de shadcn usa cada uno está en [`docs/componentes.md`](docs/componentes.md). `Button` (de shadcn) ya existe, pero todavía con sus estilos por defecto.

### Pendiente

- **Fase 1:** algoritmo del sorteo en ciclo único con la regla de pareja y todos sus tests.
- El `button.tsx` de shadcn tiene un aviso de lint (`only-export-components`) que se deja tal cual, porque es código generado.
- Rate limiting, base de datos, sockets y R2 llegan en sus fases (2 a 5).
