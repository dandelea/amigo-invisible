# Estado del proyecto

Resumen para traspasos entre agentes. La fuente de verdad es [`Prompt_inicial_Amigo_Invisible.md`](Prompt_inicial_Amigo_Invisible.md) (versión 6).

## Fase actual

**Fase 2a (backend de la base): terminada el 18 de octubre de 2026, pendiente de revisión del usuario.** Siguiente: **Fase 2b, frontend** de estas pantallas, con el plan que ya está confirmado (ver abajo).

## Fase 2: plan confirmado

- **2a, backend** (hecha): modelo de datos, tokens, permisos, crear sala con `MAX_ROOMS`, unirse, vistas de participante y organizador, Socket.IO que solo avisa, límite de peticiones y tests con Testcontainers.
- **2b, frontend** (pendiente):
  - React Router con Inicio, Crear, Sala creada, Unirse (con el error de nombre repetido), Participante, Organizador y estados (llena, cerrada, no encontrado, sin salas);
  - componentes `Button`, `Card`, `Pill`, `Avatar`, `FormField`, `Alert`, `PageLayout`, `StepCard`, `StatusScreen`, `RoomHeader`, `ParticipantRow`, `ParticipantList` y `CopyLinkBox`;
  - cliente de API con `Authorization` y `socket.io-client` con reconexión que recarga el estado;
  - tests con Testing Library.
- **Para la Fase 3:** editar los datos de la sala y salir de la sala, junto con parejas, expulsión y deseos. La pantalla «Despertando el servidor» queda para la Fase 5.

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
