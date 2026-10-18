# Prompt inicial: Amigo Invisible

Documento de contexto y prompt inicial para traspaso entre agentes · versión 6 · 17 de octubre de 2026

## Rol

Eres un ingeniero de software senior que acompaña un proyecto personal de aprendizaje desde la idea hasta un MVP funcional. Trabajas por fases pequeñas, justificas tus decisiones y documentas todo para que otro agente pueda retomar el trabajo sin perder contexto. Este documento es la fuente de verdad: si algo no está aquí, pregunta antes de asumir.

## Proyecto

Aplicación web de “Amigo Invisible” (Secret Santa) para usuarios sin conocimientos técnicos. Muy simple, pensada sobre todo para móvil.

- Objetivo: proyecto personal y de aprendizaje. Gratis, sin monetización.
- Restricciones: presupuesto bajo (todo en capas gratuitas) y tiempo de entrega corto.
- Estado actual: Fase 0 en curso. Hay mockups (`docs/mockups/`) y las decisiones abiertas están cerradas (ver “Decisiones tomadas”). Aún no hay código.

## Glosario

- **Sala**: un evento de amigo invisible con sus participantes.
- **Organizador**: quien crea la sala. No participa en el sorteo.
- **Participante**: persona que se une a una sala con el enlace de invitación.
- **Enlace de invitación**: enlace de la sala, para compartir con el grupo.
- **Enlace de gestión**: enlace privado y secreto del organizador. Quien lo tiene es organizador.
- **Enlace personal**: enlace único y secreto de cada participante, para ver su resultado.
- **Sorteo**: reparto de amigos secretos en un ciclo único aleatorio.
- **Pareja**: dos participantes marcados por el organizador que no pueden tocarse entre sí.

## Fuera de alcance

No desarrollar: cuentas de usuario, email o notificaciones push, pagos o monetización, grupos de exclusión (descartados definitivamente; solo parejas de 2), otros idiomas (solo español), modo oscuro (solo claro), borrado automático de salas, copias de seguridad, aviso de privacidad, y expulsión tras el primer sorteo.

## La sala

- Datos: nombre (obligatorio), día de entrega de los regalos (la fecha en que el grupo se reúne para entregarlos) y presupuesto sugerido en euros (opcionales). Visibles para todos los participantes. El organizador puede editarlos mientras la sala esté abierta, con el botón “Editar” de “Sala creada” y del panel del organizador; tras el sorteo quedan fijos. Valida longitud y caracteres del nombre, la fecha y el importe.
- Participantes: de 3 a 30 (el organizador no cuenta). Al llegar a 30 la sala muestra “sala llena”. El tope se comprueba en el backend dentro de una transacción, para que dos entradas simultáneas no lo superen.
- Estados: **abierta** (admite participantes) y **sorteada** (cerrada a nuevos participantes; los visitantes nuevos ven “sala cerrada”). Repetir el sorteo no reabre la sala.
- Tope global: variable de entorno `MAX_ROOMS` (valor inicial 10) sobre todas las salas existentes, ya que ninguna se elimina. Al alcanzarlo, crear sala devuelve un error claro y el inicio muestra “Ahora mismo no se admiten más salas”. Comprobación y creación en una misma transacción.
- Enlace personal inválido, regenerado o de un expulsado: página genérica de “no encontrado”.

## Organizador

- Sin cuentas. Al pulsar “Crear sala” recibe dos enlaces: invitación (para compartir) y gestión (privado). Quien tenga el de gestión es organizador; el permiso se valida siempre en el backend.
- Se le avisa de que guarde el enlace de gestión y no lo comparta. Si lo pierde, la sala queda sin organizador (aceptado) y no se elimina.
- No participa en el sorteo, no recibe amigo secreto y nunca ve asignaciones.
- Puede: marcar y deshacer parejas, activar o desactivar la regla de pareja, expulsar participantes, ejecutar el sorteo en directo, repetir el sorteo y regenerar el enlace personal de un participante.
- Regenerar enlace y expulsar se hacen desde un menú de acciones (“⋮”) por participante, no con un botón visible en la lista.
- Expulsar: solo antes del primer sorteo. El enlace del expulsado queda invalidado y se eliminan su pareja y su lista de deseos. Puede volver con otro nombre usando la invitación (limitación aceptada).
- Repetir el sorteo: mismos participantes; el resultado anterior se borra y todos son avisados en tiempo real. Antes de repetir se le muestra cuántos ya vieron su resultado.
- Durante el sorteo ve un contador de cuántos participantes ya han visto su resultado y, con el botón “Más”, una lista con el estado de cada uno (visto o pendiente), identificado por su nombre. Nunca ve a quién le ha tocado cada persona. “Visto” lo confirma el cliente al terminar la ruleta o abrir su resultado; se guarda en base de datos y se reinicia al repetir. El organizador recibe únicamente el contador y, por participante, su nombre y el estado visto o pendiente.
- Regenerar el enlace de un participante invalida el anterior. El organizador conoce el nuevo y podría ver esa asignación: riesgo aceptado en el MVP, sin aviso.

## Participante

- Entra con el enlace de invitación y escribe su nombre. Si el nombre ya existe en la sala (sin distinguir mayúsculas ni tildes), se rechaza y se pide otro.
- Recibe su enlace personal único para volver a ver su resultado. Si lo pierde, el organizador lo regenera.
- Ve en tiempo real la lista de participantes, con las parejas indicadas y los datos de la sala.
- Antes del sorteo puede añadir, cambiar o quitar (dejar vacía) su lista de deseos y salirse de la sala (su nombre queda libre y se eliminan su lista y su pareja).
- Su lista de deseos es visible para todos en todo momento.
- Al sortear ve una ruleta de nombres de unos 15 segundos (cambiado de 3–5 s por el usuario el 18/10/2026) que se detiene en su asignado, solo la primera vez. Después ve únicamente su asignación, sin animación. La ruleta arranca cuando el participante pulsa “Descubrir mi amigo invisible”, y vuelve a mostrarse una vez tras repetir el sorteo. Tiene un botón “Saltar animación” para ir directo al resultado (recuperado del mockup por el usuario el 18/10/2026, junto con la duración de 15 s).
- Nunca ve asignaciones ajenas.

## Reglas del sorteo

- Ciclo único aleatorio (A→B→C→A): todos regalan y reciben exactamente una vez y no hay parejas cerradas A↔B. Implica que nadie se regala a sí mismo; esa regla es implícita y no desactivable.
- Regla opcional “no pareja”, activable por sala: las parejas no pueden ser vecinas en el ciclo (ni A→B ni B→A). Solo parejas de 2, simétricas, editables solo antes del primer sorteo.
- Mínimo 3 participantes.
- Con solo parejas como exclusión, el único caso imposible es 3 participantes con una pareja. 4 participantes con 2 parejas sí tiene solución (A→C→B→D→A). Si no hay solución, avisar con un mensaje claro antes de ejecutar.
- Si alguien sale o es expulsado, su pareja se elimina.
- Aleatoriedad con `crypto.randomInt`, nunca `Math.random`. Barajar y reintentar es suficiente.
- El sorteo es atómico e idempotente: la transición abierta → sorteada se hace en una transacción con bloqueo, para evitar dobles clics y entradas o salidas simultáneas. Repetir el sorteo es otra operación explícita.

## Seguridad y requisitos no funcionales

- **Secreto real**: ninguna respuesta HTTP ni evento de socket expone asignaciones ajenas, ni al organizador. La asignación solo la obtiene el propio participante, por HTTP con su token (`GET /api/me/assignment`); el socket solo avisa de que hay sorteo, sin datos (decidido con el usuario el 18/10/2026, en lugar de emitirla por el socket). Al organizador solo llegan el contador de vistos y, por participante, nombre y estado visto o pendiente; nunca asignaciones.
- **Tokens**: 32 bytes aleatorios. En base de datos solo se guarda el hash (SHA-256), con comparación segura. Se muestran una sola vez (al crear o regenerar). Colocarlos en el fragmento de la URL (#) para que no queden en logs del servidor y enviarlos por cabecera Authorization. No registrar tokens ni datos personales en logs.
- **Rate limiting** por IP en toda la API. Configurar trust proxy (el hosting usa proxy). Límite generoso: un grupo comparte IP en la misma wifi. Las reconexiones de WebSocket no cuentan como peticiones normales.
- **Validación de entradas**: nombres (longitud y caracteres), fechas e importes; enlaces de deseos solo https y abiertos con `rel="noopener noreferrer"`; archivos por tipo real. Escapar todo lo que se muestre (XSS).
- **Estado en base de datos**, nunca en memoria. Los sockets solo notifican.
- **Datos indefinidos**: la aplicación nunca elimina salas, ni siquiera huérfanas o nunca sorteadas. El único borrado es manual, por el administrador, con un script local (sin endpoint público) que elimina la sala y, en cascada, participantes, parejas, listas, tokens y sorteos, además de sus archivos del almacenamiento externo. Esquema con `ON DELETE CASCADE`. Documentar el procedimiento.
- **Observabilidad mínima**: endpoint `/health`, errores uniformes y logs sin tokens.

## Stack y decisiones técnicas

- Backend: NestJS + TypeScript. Tiempo real con gateway de WebSockets (Socket.IO), una room por sala. Instancia única, adaptador en memoria.
- Base de datos: PostgreSQL en **Neon** (capa gratuita: 1 GB por proyecto, se suspende tras 5 min sin actividad y despierta en milisegundos, sin pausar el proyecto entero). Descartado Supabase porque pausa el proyecto completo tras una semana sin actividad.
- ORM: **Drizzle**, con migraciones de `drizzle-kit`. Motivo: tipado fuerte, API cercana a SQL y bloqueo de filas nativo (`.for('update')`) para las transacciones críticas (sorteo, `MAX_ROOMS`, tope de 30). Además es ligero y arranca rápido en un plan que se duerme. Descartados Prisma (no tiene `SELECT ... FOR UPDATE` y su motor pesa más en el arranque) y TypeORM (tipado más débil y migraciones menos fiables).
- Frontend: React + Vite (SPA) con Tailwind + shadcn/ui. Las rutas de invitación, personal y gestión son rutas del cliente; el hosting debe redirigir todo a `index.html`.
- Hosting del backend: **Render Free**. Admite WebSockets (desde febrero de 2026, los mensajes por socket también evitan que se duerma). Se duerme tras 15 min sin tráfico y tarda ~1 min en despertar; incluye 750 h al mes y no pide tarjeta. Pantalla “Despertando el servidor” y reconexión automática de sockets con recarga del estado actual. Render puede suspender servicios gratuitos con mucho tráfico de salida, así que el backend no sirve los archivos (ver “Archivos de la lista de deseos”).
- Hosting del frontend: **Cloudflare Pages**. Sin `404.html` en la raíz, sirve `index.html` para cualquier ruta que no sea un recurso estático, que es lo que necesita la SPA.
- Archivos: **Cloudflare R2** (capa gratuita: 10 GB al mes, 1 M de operaciones de clase A, 10 M de clase B y salida de datos gratis; API compatible con S3). Para activarlo pide tarjeta o PayPal como verificación; no cobra dentro de la capa gratuita y conviene poner una alerta de facturación. No usar disco local (efímero). Descartados Supabase Storage (1 GB, no llega al peor caso) y Backblaze B2 (válido y sin tarjeta, pero sería otra cuenta más).
- Las condiciones de las capas gratuitas se verificaron el 17 de octubre de 2026. Vuelve a comprobarlas antes de desplegar.
- Repo único con carpetas `backend/`, `frontend/` y `docs/mockups/` (mockups de diseño).
- Despliegue manual en el MVP. Pasos, variables de entorno y migraciones en el README.

## Archivos de la lista de deseos

- Cada participante tiene un único elemento: un enlace https o un archivo descargable. Al subir uno nuevo, reemplaza al anterior (y el archivo anterior se borra del almacenamiento).
- Archivos: solo PDF e imágenes (JPEG, PNG, WebP), máximo 5 MB, validando el tipo real del contenido y no solo la extensión. Descarga protegida por sala.
- El participante puede quitar su elemento (lista vacía); si era un archivo, se borra del almacenamiento.
- Subida: pasa por el backend, que valida el tipo real del contenido y el tamaño antes de guardarlo en R2.
- Descarga: el backend valida el token de la sala y devuelve una URL firmada de corta duración que apunta directamente a R2. El archivo nunca pasa por el backend, para no consumir su tráfico de salida.
- Peor caso: 30 × 5 MB × 10 salas = 1,5 GB. Cabe en los 10 GB gratuitos de R2.

## Diseño

- Móvil primero. Estilo minimalista y limpio. Solo español. Solo modo claro, usando variables CSS de shadcn y textos centralizados para no cerrar la puerta a cambios.
- Inicio: botón “Crear sala” y explicación breve en 3 pasos (crear sala, compartir enlace, sortear).
- Compartir: botón de copiar enlace con confirmación visible. Diferenciar con claridad invitación (destacado) y gestión (aviso “No compartas este enlace”).
- Parejas: las dos personas se muestran seguidas en un bloque de fondo rosado, con una línea que une sus avatares y un corazón en el centro, y la etiqueta accesible “Pareja: Ana y Luis” (como en los mockups). Así se ve con quién está cada uno sin depender del hover.
- Ruleta: puramente decorativa; el resultado ya lo decidió el servidor. Con `prefers-reduced-motion`, mostrar el resultado directamente.
- Vista del organizador durante el sorteo: el contador de resultados vistos y un botón “Más” que abre un modal (hoja inferior en móvil) con dos grupos, “Han visto” y “Pendientes”. Cada nombre lleva su estado en texto además del icono, para no depender del color. El modal aclara que no se ven las asignaciones.
- **Mockups**: el usuario aportará mockups generados con Claude Design para móvil, tablet y ordenador. Son la referencia visual de las pantallas, los estados y los textos; se entregan en la carpeta `docs/mockups/` del repo: `png/` (una imagen o PDF por pantalla, exportados desde Claude Design), `src/` (archivos fuente `.dc.html` con los valores exactos de colores, espaciados y textos; no son páginas web que se abran directamente, se leen como código) y `MOCKUPS.md` (índice de pantallas, tamaños, flujos y decisiones de diseño). Empieza leyendo `MOCKUPS.md`. Si algo de los mockups contradice este documento, avisa antes de cambiarlo.
- **Componentes reutilizables**: el desarrollo del frontend empieza analizando los mockups para detectar los componentes comunes a las vistas (botones, paneles o tarjetas, formularios y campos, etiquetas, avatares, listas, avisos, diálogos y hojas inferiores, iconos e imágenes). Después se crean los componentes correspondientes con props que permitan reutilizarlos (variantes, tamaños, estados y contenido), apoyándose en shadcn/ui cuando encaje. La lista de componentes propuesta se incluye en el plan y se confirma antes de implementarla.

## Documentación

- API documentada con OpenAPI y Swagger UI en `/api/docs` (`@nestjs/swagger`), con DTOs decorados o el plugin CLI para generar el esquema desde el código. Documenta el esquema de autenticación por token y las respuestas de error. Exporta también `openapi.json` al repo. Sin ejemplos con tokens reales.
- Los eventos de WebSocket no entran en OpenAPI: documentarlos en el README (nombre, emisor, receptor, payload y qué recibe cada rol).
- README mantenido. Mínimo: descripción, requisitos, instalación, variables de entorno (sin valores reales, incluida `MAX_ROOMS`), cómo arrancar backend y frontend, cómo ejecutar los tests, despliegue manual con migraciones, procedimiento de borrado de salas, arquitectura resumida, eventos de WebSocket, decisiones técnicas y limitaciones conocidas.
- Estado del proyecto para traspasos en `CONTEXT.md`.
- Swagger y README se actualizan en el mismo cambio que modifique el comportamiento: ningún endpoint, DTO, evento, variable de entorno o paso de despliegue se da por terminado sin su documentación.

## Testing

Unitarios, integración y e2e, priorizando (1) el algoritmo del sorteo y (2) el secreto. Casos clave:

- El resultado es un ciclo único válido.
- Nadie se toca a sí mismo ni a su pareja con la regla activa.
- 3 participantes con una pareja se detecta como imposible.
- 4 participantes con 2 parejas se resuelve.
- Ninguna fuga de asignaciones por HTTP ni por socket, tampoco al organizador.
- La lista de vistos del organizador solo contiene nombre y estado visto o pendiente, sin ningún dato de asignación.
- Tokens regenerados o de expulsados dejan de funcionar.
- Doble clic en sortear, entradas simultáneas con la sala casi llena y creación simultánea de salas con `MAX_ROOMS` no rompen las reglas.

## Decisiones tomadas

Cerradas con el usuario el 17 de octubre de 2026, en la Fase 0. El detalle está en las secciones correspondientes.

1. ORM: Drizzle.
2. Hosting y almacenamiento: Render Free (backend), Neon (base de datos), Cloudflare Pages (frontend) y Cloudflare R2 (archivos). Descargas con URL firmada de corta duración, sin pasar por el backend.
3. Parejas en móvil: juntas en un bloque, como en los mockups.
4. El organizador puede editar los datos de la sala mientras esté abierta: sí.
5. Un único elemento de deseos por participante, enlace o archivo: sí.
6. Elementos de los mockups que no estaban en el documento:
   - Incluidos: “Quitar mi lista”, menú de acciones por participante en el panel del organizador y botón “Editar” de los datos de la sala.
   - “Saltar animación” se descartó al principio y se recuperó el 18/10/2026, al alargar la ruleta a 15 s.

## Puntos abiertos

Ninguno. Los huecos de los mockups se resolvieron con 7 pantallas nuevas de móvil (de la 18 a la 24 en `MOCKUPS.md`), confirmadas con el usuario el 17 de octubre de 2026:

1. Unirse a la sala (`Unirse`, `UnirseError`): muestra los nombres de quienes ya están dentro, para ayudar a evitar nombres repetidos. Cualquiera con el enlace de invitación los ve antes de entrar (aceptado).
2. Tras el sorteo (`Sorteado`): la ruleta no arranca sola; el participante pulsa “Descubrir mi amigo invisible”.
3. Tras repetir el sorteo (`Repetido`): aviso en tiempo real y la ruleta vuelve a mostrarse una vez, porque el estado “visto” se reinicia. El enlace personal no cambia.
4. Regla de pareja (`OrganizadorRegla`): interruptor con estado en texto, bloqueado tras el primer sorteo.
5. Confirmaciones de “Repetir sorteo” (`RepetirConfirmar`) y de “Salir de la sala” (`SalirConfirmar`).

La carpeta `docs/mockups/png/` está vacía: la referencia visual son los archivos de `src/`.

## Limitaciones conocidas

Aceptadas en el MVP. Documentarlas en el README.

- Sin copias de seguridad: un borrado manual erróneo o la pérdida de la base de datos es irreversible.
- Sin aviso de privacidad ni política de datos: proyecto personal de uso cercano.
- El organizador conoce el enlace personal que regenera y podría ver esa asignación.
- Un expulsado puede volver con otro nombre usando la invitación.
- Si el organizador pierde el enlace de gestión, la sala queda sin organizador.
- Con `MAX_ROOMS` alcanzado no se admiten salas nuevas hasta borrar alguna a mano o subir el límite.
- Arranques lentos por el plan gratuito que se duerme.

## Fases de trabajo

Cada fase se cierra con tests en verde, Swagger y README al día y un resumen en `CONTEXT.md`.

1. **Fase 0, plan**: investigación, decisiones abiertas cerradas, estructura del repo, análisis de los mockups y lista de componentes reutilizables, README inicial, Swagger y `CONTEXT.md`.
2. **Fase 1, algoritmo**: sorteo en ciclo único con la regla de pareja y todos sus tests.
3. **Fase 2, base**: modelo de datos, tokens, permisos, crear sala (con `MAX_ROOMS`), unirse y lista en tiempo real con reconexión.
4. **Fase 3, gestión**: parejas, expulsión y listas de deseos (enlace y archivo).
5. **Fase 4, sorteo**: sorteo en directo, ruleta, contador y lista de vistos, repetir sorteo y regenerar enlaces, con los tests de secreto. Además (pedido por el usuario el 18/10/2026): ESLint y Prettier en todo el proyecto, con Husky y lint-staged en el pre-commit; y una carpeta `.vscode/` con configuraciones de depuración y extensiones recomendadas para el proyecto.
6. **Fase 5, pulido**: pantalla de arranque del servidor, accesibilidad, revisión de seguridad, script de borrado y despliegue manual documentado.

## Forma de trabajo

- Antes de codificar, entrega un plan breve y espera confirmación.
- Si hay una decisión abierta, pregunta una cosa cada vez.
- Al cerrar cada fase, deja un resumen: hecho, decisiones, pendiente.
- Si algo contradice este documento, avísame antes de cambiarlo.
