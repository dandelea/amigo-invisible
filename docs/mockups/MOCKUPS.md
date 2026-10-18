# Mockups: Amigo Invisible

Mockups generados con Claude Design. Son la referencia visual de pantallas, estados y textos. Si algo contradice el documento principal (`Prompt inicial Amigo Invisible.md`), avisa antes de cambiarlo.

## Contenido de esta carpeta

- `png/`: una imagen o PDF por pantalla, exportados desde Claude Design (Share › Export). Es la referencia visual de cómo debe quedar cada pantalla.
- `src/`: archivos fuente `.dc.html` (uno por pantalla) y `canvas.json` (posición y tamaño de cada pantalla en el lienzo). Contienen los valores exactos de colores, espaciados, tamaños y textos.
- `MOCKUPS.md`: este índice.

## Cómo leer los archivos `.dc.html`

No son páginas web normales: usan marcado propio de Claude Design (`<x-dc>`) y cargan un `support.js` que no se incluye, así que no se abren directamente en un navegador. Léelos como código para extraer estructura, estilos y textos. Los estilos están en línea y en un bloque `<helmet><style>` por archivo.

## Tamaños

- Móvil: 390 × 844 px, tamaño fijo.
- Tablet: 820 px de ancho; páginas fluidas (contenido con ancho máximo de 760 px).
- Ordenador: 1280 px de ancho; páginas fluidas (contenido con ancho máximo de 1040 px).

## Pantallas

| Pantalla | Móvil | Tablet | Ordenador | Notas |
|---|---|---|---|---|
| Inicio | `Main.dc.html` | `TInicio.dc.html` | `DInicio.dc.html` | Botón "Crear sala" y explicación en 3 pasos. |
| Crear sala | `Crear.dc.html` | `TCrear.dc.html` | `DCrear.dc.html` | Formulario: nombre (obligatorio), día de entrega de los regalos y presupuesto (opcionales). |
| Sala creada | `Creada.dc.html` | `TCreada.dc.html` | `DCreada.dc.html` | Resumen de datos y los dos enlaces: invitación (destacado) y gestión (aviso "No compartas este enlace"). |
| Participante (sala) | `Participante.dc.html` | `TParticipante.dc.html` | `DParticipante.dc.html` | Lista en tiempo real con parejas, botón de regalo para ver deseos de otros y "Mi lista de deseos". |
| Deseos de otro participante | `Deseos.dc.html` | `TDeseos.dc.html` | `DDeseos.dc.html` | Hoja o diálogo con el enlace (o archivo) de la lista de otra persona. |
| Editar mi lista (enlace) | `Editar.dc.html` | `TEditar.dc.html` | `DEditar.dc.html` | Un único elemento por participante; guardar reemplaza el actual. |
| Editar mi lista (archivo) | `EditarArchivo.dc.html` | `TEditarArchivo.dc.html` | `DEditarArchivo.dc.html` | Muestra el archivo actual y el nuevo; PDF o imagen, máx. 5 MB. |
| Organizador (panel) | `Organizador.dc.html` | `TOrganizador.dc.html` | `DOrganizador.dc.html` | Datos de la sala, participantes, parejas, menú de acciones y botón Sortear. Muestra el caso imposible: 3 participantes con 1 pareja. |
| Marcar pareja | `MarcarPareja.dc.html` | `TMarcarPareja.dc.html` | `DMarcarPareja.dc.html` | Selección de dos personas sin pareja. |
| Acciones de participante | `Acciones.dc.html` | `TAcciones.dc.html` | `DAcciones.dc.html` | Regenerar enlace personal y expulsar. |
| Regenerar enlace (confirmar) | `RegenerarConfirmar.dc.html` | `TRegenerarConfirmar.dc.html` | `DRegenerarConfirmar.dc.html` | Confirmación antes de invalidar el enlace. |
| Regenerar enlace (nuevo enlace) | `RegenerarNuevo.dc.html` | `TRegenerarNuevo.dc.html` | `DRegenerarNuevo.dc.html` | El nuevo enlace se muestra una sola vez. |
| Sorteo | `Sorteo.dc.html` | `TSorteo.dc.html` | `DSorteo.dc.html` | Vista del participante y del organizador (contador de vistos, "Más", repetir sorteo). En tablet y ordenador se muestran juntas solo para compararlas; en la app real cada persona ve únicamente la suya. |
| Ruleta (participante) | `Ruleta.dc.html` | `TRuleta.dc.html` | `DRuleta.dc.html` | Ruleta decorativa; el resultado ya lo decidió el servidor. |
| Resultado (participante) | `Resultado.dc.html` | `TResultado.dc.html` | `DResultado.dc.html` | Asignación, lista de deseos del asignado y copia del enlace personal. |
| Modal de vistos | `Modal.dc.html` | `TModal.dc.html` | `DModal.dc.html` | Lista de quién ha visto su resultado y quién está pendiente, sin asignaciones. |
| Estados | `Estados.dc.html` | `TEstados.dc.html` | `DEstados.dc.html` | Despertando el servidor, sala llena, sala cerrada, no encontrado y sin salas disponibles. |
| Unirse a la sala | `Unirse.dc.html` | — | — | Datos de la sala, nombres de quienes ya están dentro y campo “Tu nombre”. |
| Unirse: nombre repetido | `UnirseError.dc.html` | — | — | Error bajo el campo; no distingue mayúsculas ni tildes. |
| Participante: ya se ha sorteado | `Sorteado.dc.html` | — | — | Sala “Sorteada” con el botón “Descubrir mi amigo invisible”, que lanza la ruleta. |
| Participante: sorteo repetido | `Repetido.dc.html` | — | — | Aviso de que el resultado anterior ya no vale; la ruleta vuelve a mostrarse una vez. El enlace personal no cambia. |
| Organizador: regla de pareja | `OrganizadorRegla.dc.html` | — | — | Interruptor “Regla de pareja” con estado en texto. Bloqueado tras el primer sorteo. |
| Repetir sorteo (confirmar) | `RepetirConfirmar.dc.html` | — | — | Muestra cuántos ya vieron su resultado antes de repetir. |
| Salir de la sala (confirmar) | `SalirConfirmar.dc.html` | — | — | Qué se pierde al salir (lista, pareja y enlace personal). |

Las pantallas 18 a 24 se añadieron el 17 de octubre de 2026 en la Fase 0, con el mismo estilo que las demás y solo en móvil. En tablet y ordenador siguen las mismas reglas que el resto: páginas fluidas y diálogos centrados de 460 px.

## Flujos

- Crear: Inicio → Crear sala → Sala creada.
- Unirse: Unirse a la sala (→ Unirse: nombre repetido) → Participante.
- Participante: Participante → Deseos de otro participante; Participante → Editar mi lista (enlace o archivo); Participante → Salir de la sala (confirmar).
- Organizador: Organizador → Marcar pareja; Organizador → Acciones de participante → Regenerar enlace (confirmar) → Regenerar enlace (nuevo enlace).
- Sorteo: Sorteo (organizador) → Modal de vistos; Sorteo (organizador) → Repetir sorteo (confirmar); Participante: ya se ha sorteado → Ruleta (participante) → Resultado (participante); Participante: sorteo repetido → Ruleta → Resultado.

## Decisiones de diseño

- Estilo minimalista y claro, solo modo claro, solo español, móvil primero.
- Colores: fondo `#FAFAFA`, tarjetas `#FFFFFF`, texto `#18181B`, texto secundario `#52525B`, borde `#E4E4E7`, acento `#BE123C`. Pareja: fondo `#FFF1F2`, borde `#FDA4AF`, texto `#9F1239`. Aviso: fondo `#FEF3C7`, borde `#B45309`, texto `#78350F`. Éxito: texto `#166534`, fondo `#DCFCE7`.
- Tipografía: Figtree (400, 600 y 700), con fuente del sistema como alternativa.
- Radios: 10 px en botones y campos, 12 px en tarjetas, 20 px en las hojas inferiores.
- Objetivos táctiles de al menos 44 px. Estados indicados siempre con texto además de color o icono.
- Parejas: bloque con fondo rosado, línea que une los dos avatares y corazón en el centro, con etiqueta accesible ("Pareja: Ana y Luis").
- Ver deseos de otros: botón de icono de regalo con etiqueta accesible y tooltip.
- En móvil, los diálogos son hojas inferiores; en tablet y ordenador, cuadros centrados de 460 px.

## Convenciones de los mockups

- Son estáticos: la ruleta, los tooltips y las confirmaciones se muestran congelados en un estado.
- Los enlaces son marcadores como `[enlace de invitación]`; no hay tokens reales.
- Los datos de ejemplo (sala "Cena de Navidad de la oficina", 20 dic 2026, 15 €) no son definitivos.

## Elementos de los mockups que no estaban en el documento (resuelto)

Confirmado con el usuario el 17 de octubre de 2026:

- Incluidos en el MVP: botón "Quitar" para eliminar la lista de deseos propia; menú de acciones por participante en el panel del organizador (sustituye al botón "Expulsar" visible); botón "Editar" para los datos de la sala, en la sala creada y en el panel del organizador.
- Botón "Saltar animación" en la ruleta: se descartó al principio y se recuperó el 18/10/2026, cuando la ruleta pasó a durar unos 15 s.

## Cambios posteriores a los mockups (Fase 5)

Pedidos por el usuario el 18/10/2026:

- **Ruleta**: unos 15 s con «Saltar animación»; frenada progresiva; un clic por nombre alineado con la flecha; solo resultados posibles (ni uno mismo ni su pareja con la regla activa).
- **Tras el sorteo**: «Mi lista de deseos» se puede crear, cambiar y quitar, y el botón «Ver listas de deseos» abre un listado con las listas de los demás. En «Ya se ha sorteado» (`Sorteado`), ese botón sustituye a la lista de participantes.
