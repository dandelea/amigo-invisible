# Estado del proyecto

Resumen para traspasos entre agentes. La fuente de verdad es [`Prompt_inicial_Amigo_Invisible.md`](Prompt_inicial_Amigo_Invisible.md) (versión 6).

## Fase actual

**Fase 1 (algoritmo): cerrada el 18 de octubre de 2026.** Siguiente: **Fase 2, base** (modelo de datos, tokens, permisos, crear sala con `MAX_ROOMS`, unirse y lista en tiempo real con reconexión). Antes de codificar, presentar un plan breve y esperar confirmación.

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
