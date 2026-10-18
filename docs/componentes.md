# Componentes reutilizables del frontend

Lista confirmada por el usuario en la Fase 0 (18/10/2026), obtenida analizando las 24 pantallas de móvil de `docs/mockups/`. Las vistas de tablet y ordenador usan las mismas piezas con más ancho. Se implementan a medida que cada fase los necesita. Implementados:

- **Fase 2**: `Button`, `Card`, `Pill`, `Avatar` (inicial y pareja), `FormField`, `Alert`, `PageLayout` (con `TwoColumns`), `StepCard`, `StatusScreen`, `RoomHeader`, `ParticipantRow`, `ParticipantList` y `CopyLinkBox`.
- **Fase 3**: `IconButton`, `SegmentedControl`, `Switch`, `SelectableOption`, `ResponsiveDialog`, `ConfirmDialog`, `ActionSheetItem`, `PairGroup`, `WishlistCard` (`MyWishlist`, `WishlistButton` y `WishlistContent` en `wishlist.tsx` y `my-wishlist.tsx`), `WishlistEditor`, `RoomFields` (formulario de la sala, compartido por crear y editar), `EditRoomDialog`, `MarkPairDialog` y `ParticipantActions`.

Los textos van en `frontend/src/texts/es.ts` y los colores en las variables CSS de `frontend/src/index.css`.

## Base (`src/components/ui/`, apoyados en shadcn/ui)

| Componente         | Base shadcn            | Variantes y props                                                                                                                                                                                                                     |
| ------------------ | ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Button`           | Button                 | `primary`, `secondary`, `destructive` (borde rosado) y deshabilitado; tamaños `md` (44 px) y `lg` (52 px)                                                                                                                             |
| `IconButton`       | Button + Tooltip       | `aria-label` obligatorio y tooltip; iconos de regalo y de acciones (⋮)                                                                                                                                                                |
| `Card`             | Card                   | `default`, `highlighted` (borde de acento 2 px), `muted` (fondo gris) y `accent` (fondo rosado)                                                                                                                                       |
| `Pill`             | Badge                  | `neutral`, `accent`, `warning` (p. ej. «Opcional», «Tú», «Abierta · 5/30»)                                                                                                                                                            |
| `Avatar`           | Avatar                 | inicial, número de paso, de pareja, visto ✓ y pendiente (borde discontinuo)                                                                                                                                                           |
| `FormField`        | Input + Label          | etiqueta, contador, «Opcional», ayuda y error accesible (`aria-invalid` y `role="alert"`)                                                                                                                                             |
| `SegmentedControl` | ToggleGroup (Radix)    | Enlace / Archivo                                                                                                                                                                                                                      |
| `Switch`           | Switch                 | con descripción del estado en texto                                                                                                                                                                                                   |
| `SelectableOption` | casilla nativa         | fila seleccionable con nota («Ya tiene pareja»); se usa en Marcar pareja                                                                                                                                                              |
| `Alert`            | Alert                  | `warning`, `success`, `error`                                                                                                                                                                                                         |
| `ResponsiveDialog` | Dialog (Radix)         | hoja inferior en móvil, cuadro centrado de 460 px desde tablet. Un único Dialog con estilos responsive, en lugar de Drawer (vaul) + Dialog: misma accesibilidad, menos código y funciona en los tests; no se puede cerrar arrastrando |
| `ConfirmDialog`    | sobre ResponsiveDialog | título, texto, aviso opcional y acciones (repetir, salir, regenerar)                                                                                                                                                                  |
| `ActionSheetItem`  | Button                 | título y descripción (Regenerar enlace, Expulsar)                                                                                                                                                                                     |
| `ProgressBar`      | Progress               | contador de vistos y ruleta                                                                                                                                                                                                           |

## Dominio (`src/components/`)

| Componente        | Uso                                                                                                                   |
| ----------------- | --------------------------------------------------------------------------------------------------------------------- |
| `PageLayout`      | Contenedor de página con ancho máximo de 760 px (tablet) o 1040 px (ordenador)                                        |
| `StepCard`        | Los 3 pasos del inicio                                                                                                |
| `StatusScreen`    | Los 5 estados: despertando el servidor (con spinner), sala llena, sala cerrada, no encontrado y sin salas disponibles |
| `RoomHeader`      | Nombre, fecha, presupuesto y estado de la sala                                                                        |
| `ParticipantRow`  | Avatar, nombre, «Tú» y zona de acción a la derecha                                                                    |
| `PairGroup`       | Bloque rosado con la línea y el corazón que unen a la pareja; etiqueta «Pareja: Ana y Luis»                           |
| `ParticipantList` | Lista con las parejas agrupadas                                                                                       |
| `CopyLinkBox`     | Enlace, botón de copiar y «Enlace copiado» en una región `aria-live`                                                  |
| `WishlistCard`    | Lista de deseos propia o ajena                                                                                        |
| `WishlistEditor`  | Edición de la lista: enlace o archivo                                                                                 |
| `RevealCard`      | Pantallas Sorteado y Repetido, con el botón que lanza la ruleta                                                       |
| `Roulette`        | Ruleta decorativa; respeta `prefers-reduced-motion`                                                                   |
| `SeenCounter`     | Contador de resultados vistos del organizador                                                                         |
| `SeenList`        | Listas «Han visto» y «Pendientes», sin asignaciones                                                                   |
