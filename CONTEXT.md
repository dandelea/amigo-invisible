# Estado del proyecto

Resumen para traspasos entre agentes. La fuente de verdad es [`Prompt_inicial_Amigo_Invisible.md`](Prompt_inicial_Amigo_Invisible.md) (versión 6).

## Fase actual

**Fase 5 (pulido): terminada el 18 de octubre de 2026, pendiente de revisión del usuario. El MVP del prompt está completo.** Siguiente: **despliegue real acompañado** (el usuario crea las cuentas y pega las claves siguiendo «Despliegue manual» del README; después se comprueba la app desplegada).

## Fase 5: plan confirmado

- **5a, robustez y seguridad**:
  - pantalla «Despertando el servidor» (petición lenta o sin conexión → consultar `/health` hasta que responda, luego continuar; reintentar si tarda demasiado);
  - script local de borrado de salas (`rooms:list` y `rooms:delete`, que borra los archivos de R2 bajo `rooms/<id>/` y luego la sala en cascada, con confirmación escribiendo el nombre y tests);
  - revisión de seguridad completa con informe, `npm audit`, `helmet` en el API y `_headers` en Cloudflare Pages (CSP, `X-Frame-Options`, `Referrer-Policy` y `Permissions-Policy`).
- **5b, accesibilidad, e2e y despliegue**:
  - axe en los tests, revisión con teclado en Chrome, contraste de la paleta y título por pantalla;
  - **test e2e con Playwright** en `e2e/` con el Chrome del sistema (crear sala → unirse → pareja → sortear → resultado), decidido por el usuario el 18/10/2026;
  - despliegue manual documentado paso a paso (Neon, R2, Render y Cloudflare Pages), con `render.yaml`, `.nvmrc` y `engines`.
  - **Despliegue real**: documentar y acompañar al usuario, que crea las cuentas y pega las claves (Claude no crea cuentas ni introduce credenciales), y después comprobar la app desplegada. Decidido por el usuario el 18/10/2026.

## Fase 5b: resumen

### Hecho

- **Tests e2e de navegador** (`e2e/`, Playwright con el Chrome del sistema, sin descargar navegadores; `npm run e2e` en la raíz):
  - `flow.spec.ts`: recorrido completo con cada persona en su navegador (crear, unirse, pareja, sortear, movimiento reducido, ruleta saltada, contador del organizador que sube solo, el organizador nunca ve «tu amigo invisible es», sala cerrada), nombre repetido y enlace inválido.
  - `a11y.spec.ts`: axe (WCAG 2.1 A y AA, contraste incluido) en 13 pantallas y diálogos, y crear una sala solo con el teclado.
  - `playwright.config.ts` reutiliza backend y frontend si ya están arrancados, o los compila y arranca. `global-teardown.ts` borra las salas «E2E ·» con el script de la 5a.
- **Accesibilidad**:
  - axe encontró un problema real y está corregido: el botón «Más» tenía un nombre accesible sin el texto visible (WCAG 2.5.3). Ahora es «Más: ver quién ha visto su resultado».
  - Cada pantalla tiene su título (`usePageTitle`; `StatusScreen` lo pone automáticamente).
- **Despliegue preparado**:
  - `.nvmrc` y `engines` (Node ≥ 24) en la raíz y en los dos paquetes;
  - `render.yaml` (Blueprint gratuito en Frankfurt, `npm ci --include=dev` porque `NODE_ENV=production` omitiría las dependencias de desarrollo, `/health`, sin despliegue automático; los secretos con `sync: false`);
  - guía paso a paso en el README (Neon → R2 → Render → Pages → CORS), con migraciones desde local con la cadena directa de Neon y la app con la _pooled_.
  - Simulado el build de Render en una copia limpia con `NODE_ENV=production`: instala, compila, arranca y responde en `/health`.
- **Tests**: frontend 88; backend 65 unitarios y 132 de integración; e2e 4 (con axe en 13 pantallas).

### Decisiones

- axe se pasa en un navegador real y no en jsdom, porque jsdom no puede calcular el contraste.
- Pages se configura sin despliegues automáticos, para respetar el despliegue manual del prompt.
- Repositorio público en GitHub con licencia MIT (decidido por el usuario el 18/10/2026). Revisado antes de publicarlo: sin secretos ni `.env` en el historial, y los commits usan el correo «noreply» de GitHub.

### Pendiente

- Despliegue real con el usuario.

## Fase 5a: resumen

### Hecho

- **«Despertando el servidor»**:
  - `src/api/server-status.ts` marca el aviso si una petición tarda más de 2,5 s; sin conexión, o con un 502/503/504 del hosting sin JSON, consulta `/health` cada 3 s (máximo 90 s) y reintenta una vez;
  - `WakingOverlay` es una capa encima de la página, sin perder lo escrito.
  - Probado en Chrome con el backend parado: aparece y desaparece solo 3,3 s después de arrancarlo.
- **Script de borrado**:
  - `npm run rooms -- list | delete <id> [--yes]` (`src/scripts/rooms.ts`, lógica en `src/admin/room-admin.ts`);
  - borra primero los archivos (`StorageService.deletePrefix('rooms/<id>/')`) y después la sala en cascada, con confirmación escribiendo el nombre;
  - 4 tests de integración y prueba real contra la base de datos de desarrollo.
- **Seguridad** (informe en `docs/seguridad.md`):
  - `helmet` en el API (sin CSP: solo JSON y Swagger);
  - `frontend/security-headers.ts` genera `dist/_headers` para Cloudflare Pages al compilar: CSP con `connect-src` al backend (HTTP y WebSocket, desde `VITE_API_URL`), `X-Frame-Options`, `Referrer-Policy: no-referrer` y `Permissions-Policy`;
  - el CLI de shadcn pasa a devDependencies; `npm audit --omit=dev` da 0 en todo.
- **Cambios pedidos por el usuario durante la fase** (prompt y `MOCKUPS.md` actualizados):
  - **ruleta con clic por nombre** (Web Audio, `lib/click-sound.ts`), alineado con la flecha: medido en Chrome, desfase menor de 1 px en la parte lenta;
  - **frenada progresiva** (`lib/roulette-motion.ts`): la velocidad cae como (1-t)^4 hasta una velocidad final de una fila cada 0,9 s, así que el último nombre no se arrastra; como mucho un clic cada 45 ms al principio;
  - **solo resultados posibles** en la ruleta: sin uno mismo ni su pareja si la regla está activa;
  - **lista de deseos editable también tras el sorteo**: el backend usa `lockRoom` en lugar de `lockOpenRoom` para las listas; salir, expulsar, parejas y datos siguen bloqueados;
  - botón **«Ver listas de deseos»** tras el sorteo, con un listado (`AllWishlistsButton`) que abre enlaces o descarga archivos.
  - En «Ya se ha sorteado» el botón sustituye a la lista de participantes, y la nota de la ruleta pasa al final.
- **Tests**: backend 65 unitarios y 132 de integración; frontend 86.

### Decisiones

- Sin confirmación al volver a intentar tras despertar: solo se reintenta si la petición no llegó a la app, así que no duplica nada.
- El `_headers` se genera al compilar (la CSP necesita la URL del backend, que depende del entorno).
- Se ha comprobado la sincronización del sonido midiendo la posición de la cinta en cada clic, porque desde aquí no se puede escuchar.

### Pendiente

- Fase 5b.

## Fase 4: plan confirmado

- **4a, herramientas** (hecha; resumen abajo): ESLint, Prettier, Husky, lint-staged y `.vscode/`, todo pedido por el usuario.
- **4b, backend del sorteo** (hecha; resumen abajo):
  - tabla `assignments` (`ON DELETE CASCADE`) y contador de ronda en la sala;
  - `POST /api/manage/draw`, idempotente, en una transacción con la sala bloqueada, usando `checkDrawFeasibility` (409 `NO_SOLUTION` o `TOO_FEW_PARTICIPANTS`);
  - `POST /api/manage/redraw`: mismos participantes, reinicia los vistos y avisa;
  - `POST /api/manage/participants/:id/token`: regenera el enlace personal, invalida el anterior y cierra sus sockets;
  - la vista del organizador lleva viabilidad, contador y lista de vistos con solo nombre y estado;
  - `GET /api/me/assignment` y `POST /api/me/assignment/seen`;
  - tests de secreto y de concurrencia.
- **4c, frontend del sorteo** (hecha; resumen abajo):
  - aviso «No hay solución» y «Sortear»;
  - vista del sorteo con contador, barra y «Más» (modal de vistos);
  - «Repetir sorteo» con confirmación; «Regenerar enlace personal» en el menú ⋮ (confirmar y nuevo enlace);
  - participante: «¡Ya se ha hecho el sorteo!» → ruleta → resultado, y el aviso de sorteo repetido;
  - componentes `Roulette`, `RevealCard`, `SeenCounter`, `SeenList` y `ProgressBar`.
- **Decisiones** (usuario, 18/10/2026):
  - la asignación se obtiene por HTTP con el token del participante y el socket solo avisa; el prompt inicial está actualizado;
  - ESLint sustituye a oxlint;
  - Prettier con un estilo común: comillas simples, comas finales y punto y coma.

## Fase 4c: resumen

### Hecho

- **Organizador** (`src/pages/organizer-page.tsx`):
  - antes del sorteo, aviso «No hay solución» o «faltan participantes» (con la viabilidad que da el backend) y «Sortear», desactivado si no se puede;
  - después, `SeenCounter` («Resultados vistos X de N», barra de progreso y «Más» → `SeenList` con «Han visto» y «Pendientes», cada uno con su estado en texto) y «Repetir sorteo» con `ConfirmDialog` y el aviso de cuántos lo han visto;
  - menú ⋮ (`ParticipantActions`): «Regenerar enlace personal» (confirmación y nuevo enlace, que se muestra una sola vez) siempre, y «Expulsar» solo antes del sorteo.
  - Tras el sorteo se ocultan la regla, el enlace de invitación y «Sin pareja».
- **Participante** (`DrawnParticipantView`, montado de nuevo en cada ronda con `key`):
  - `RevealCard` («¡Ya se ha hecho el sorteo!»; tras repetir, `RepeatedNotice` y «Tienes un nuevo amigo invisible»);
  - `Roulette` de unos 15 s con «Saltar animación»;
  - `DrawResult`: asignado, su lista de deseos y «Guarda tu enlace personal».
  - Con «reducir movimiento» no hay ruleta (`lib/motion.ts`). La asignación no se pide hasta pulsar «Descubrir».
  - Al ver el resultado se llama a `markAssignmentSeen(token, ronda)`.
- **Ruleta**: cinta de nombres con frenada suave y franja central. El elegido queda exactamente en la franja (comprobado en Chrome) y no se repite pegado a sí mismo. Es decorativa: el resultado ya lo ha decidido el servidor.
- **Tests**: 71 en el frontend (11 nuevos del sorteo), incluida la ruleta con temporizadores simulados (sigue girando a los 10 s y termina hacia los 15 s), «Saltar animación», el movimiento reducido y el sorteo repetido a mitad de la vista.
- **Revisión visual** con Chrome sin ventana (`draw-tour.cjs`, fuera del repo): 14 capturas, sin errores de página.
  - La ruleta dura unos 15,4 s, contando la pausa final.
  - El contador del organizador sube solo cuando alguien ve su resultado.
  - El aviso de sorteo repetido llega al participante al momento.
  - Con movimiento reducido no hay ruleta.

### Decisiones

- **Ruleta de unos 15 s con «Saltar animación»** (usuario, 18/10/2026): sustituye a los 3–5 s del prompt y recupera el botón del mockup. El prompt inicial y `MOCKUPS.md` están actualizados.
- Sin confirmación antes del primer «Sortear», como en el mockup. Sí la hay antes de repetir.
- La lista de participantes solo se ve en la pantalla para descubrir el resultado de la primera ronda. El resultado muestra solo lo del mockup.

### Pendiente

- Fase 5.
- En desarrollo, `backend/.env` (local, ignorado por git) tiene `MAX_ROOMS=100` porque las pruebas llenaron las 10 salas de la base de datos de desarrollo.

## Fase 4b: resumen

### Hecho

- **Esquema** (migración `drizzle/0002_sorteo.sql`):
  - `assignments`, con clave primaria en quien regala, `UNIQUE` en quien recibe, `CHECK` de que nadie se regala a sí mismo y `ON DELETE CASCADE`;
  - `rooms.draw_round`, el número de sorteos hechos.
- **`DrawService`** (`src/draw/draw.service.ts`), siempre con la sala bloqueada:
  - `draw`, idempotente: si ya está sorteada devuelve la ronda sin volver a sortear;
  - `redraw`: borra el resultado anterior, vuelve a sortear, sube la ronda y reinicia los vistos;
  - `regenerateToken`: cambia el hash, cierra los sockets y devuelve el nuevo token una sola vez;
  - `assignmentOf`: la asignación propia, con la lista de deseos de la persona;
  - `markSeen(round)`: solo cuenta la primera vez y si la ronda es la actual.
  - Usa `checkDrawFeasibility` y `drawCycle` de la Fase 1.
- **Endpoints**:
  - `POST /api/manage/draw`, `/redraw` y `/participants/:id/token`, en `OrganizerController`;
  - `GET /api/me/assignment` y `POST /api/me/assignment/seen`, en `AssignmentController`. No hay ninguna ruta con id de participante.
- **Vistas**:
  - `/api/manage` añade `draw` (ronda, viabilidad, contador y lista de vistos con solo nombre y estado);
  - `/api/me` añade `draw` (ronda y si lo ha visto).
- **Errores nuevos**: `NO_SOLUTION` y `TOO_FEW_PARTICIPANTS` (409, mismo código que `checkDrawFeasibility`) y `NOT_DRAWN` (409).
- **Tests**: 18 de integración nuevos, 126 en total, más 65 unitarios.
  - Cubren: ciclo único y sala cerrada; regla de pareja; «No hay solución» antes de sortear; mínimo de 3; diez sorteos simultáneos que sortean una sola vez; sorteo mientras entran (todos los presentes tienen asignación); contador y lista de vistos con solo `name` y `seen`; «visto» de una ronda antigua que no cuenta; repetir (también varias veces a la vez); regenerar (el enlace viejo da 404, el nuevo ve lo mismo y el socket se cierra); otra sala da 404; secreto (ni el organizador ni nadie recibe asignaciones ajenas, y cada uno recibe solo la suya); avisos del socket sin datos; cascada al borrar la sala.
  - Prueba de mutación: si el organizador recibe un dato de asignación, fallan 2 tests; si el sorteo deja de ser idempotente, falla 1.
- **Prueba real** contra la base de datos de desarrollo migrada: sortear (dos veces, idempotente), asignación, visto, contador del organizador y repetir. Ningún token en el log.
- README (endpoints, eventos y decisiones) y `docs/openapi.json` actualizados (21 rutas).

### Decisiones

- Sortear dos veces no es un error: devuelve 200 con la ronda actual, para que un doble clic no rompa nada.
- «Visto» lleva la ronda, para evitar la carrera con «Repetir sorteo».
- Regenerar el enlace se permite antes y después del sorteo, como dice el prompt. El organizador conoce el nuevo enlace (riesgo aceptado).

### Pendiente

- Fase 4c (frontend del sorteo).

## Fase 4a: resumen

### Hecho

- **Prettier común**: `.prettierrc.json` y `.prettierignore` en la raíz (excluye lo generado y los mockups). Se reformateó el frontend, que no usaba punto y coma, en un commit aparte solo de formato. Los paquetes usan `--ignore-path ../.prettierignore` en sus scripts.
- **ESLint 9.39** en cada paquete (`backend/eslint.config.mjs`, `frontend/eslint.config.js`):
  - recomendadas de JS y typescript-eslint con tipos;
  - en el frontend, además, react-hooks, react-refresh y jsx-a11y (comprobado con un archivo de prueba que las reglas se disparan).
  - oxlint desinstalado.
  - Corregido lo que encontró:
    - `shouldSkip` no necesitaba ser `async`;
    - sobraba un `as MulterOptions`;
    - `import.meta.env` tipado en `src/vite-env.d.ts`;
    - `void`/`await` en los `navigate()`, que devuelven promesa en React Router 8.
- **Husky y lint-staged**:
  - `package.json` en la raíz (`prepare: husky`);
  - `.husky/pre-commit` ejecuta `npx lint-staged`;
  - un `.lintstagedrc.json` por paquete, porque lint-staged usa el más cercano y ejecuta desde esa carpeta, y uno en la raíz para los archivos sueltos.
  - Probado sin hacer commit: un error de ESLint bloquea; un archivo mal formateado se arregla y se vuelve a preparar.
- **`.vscode/`**:
  - `extensions.json`: ESLint, Prettier, Tailwind, Vitest, Container Tools y Error Lens;
  - `settings.json`: formatear al guardar, arreglos de ESLint y Tailwind 4 con `cn`/`cva`;
  - `tasks.json`: Vite en segundo plano y docker compose;
  - `launch.json`: backend en modo watch, asociar al 9229, tests unitarios y de integración del archivo abierto, frontend en Chrome, test del frontend y depurar todo.
  - `.gitignore` deja pasar `launch.json`, `settings.json` y `tasks.json`.
- **Scripts de la raíz**: `npm run lint`, `npm test`, `npm run format` y `npm run format:check`.
- Todo en verde: lint, formato, 65 + 108 tests del backend, 60 del frontend y el build.

### Decisiones

- **ESLint 9 y no 10**: `eslint-plugin-jsx-a11y` (sin actualizar desde 2024) solo admite hasta la 9. El resto de plugins admiten la 9 y la 10, así que cuando jsx-a11y admita la 10 bastará con cambiar la versión.
- **Configuración de depuración no probada en VS Code**: no se puede ejecutar VS Code desde aquí. Sí se comprobó que existen las rutas que usa y que los tests se lanzan con esa misma invocación.

### Pendiente

- Fase 4b.

## Fase 3: plan confirmado

- **3a, backend** (hecha; resumen abajo).
- **3b, frontend** (hecha; resumen abajo):
  - participante: parejas en bloque (línea y corazón), botón de regalo para ver deseos («Sin lista» si no hay), «Mi lista de deseos» con Cambiar y Quitar, editor Enlace / Archivo, «Salir de la sala» con confirmación (`SalirConfirmar`) y pantalla «Has salido de la sala. Puedes volver a entrar con el enlace de invitación mientras siga abierta»;
  - organizador: interruptor de la regla de pareja (`OrganizadorRegla`), «Marcar pareja» (`MarcarPareja`) y «Deshacer pareja», menú ⋮ por persona con «Expulsar» y confirmación «¿Expulsar a Marta? Se borrarán su lista de deseos y su pareja, y su enlace dejará de funcionar», y «Editar» los datos de la sala (también desde «Sala creada»);
  - componentes `IconButton`, `SegmentedControl`, `Switch`, `SelectableOption`, `ResponsiveDialog`, `ConfirmDialog`, `ActionSheetItem`, `PairGroup`, `WishlistCard` y `WishlistEditor`;
  - al expulsar o salir, el servidor cierra el socket del participante (`io server disconnect`): el cliente debe recargar y mostrar «No encontrado».
- **Pasan a la Fase 4** (confirmado por el usuario): «Regenerar enlace personal» en el menú ⋮ y el aviso «No hay solución» junto a «Sortear».

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
- Se incluyen «Quitar mi lista», el menú de acciones por participante y «Editar sala». «Saltar animación» se descartó en la Fase 0 y se recuperó en la Fase 4c (ruleta de 15 s).
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
