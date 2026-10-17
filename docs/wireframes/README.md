# Wireframes (D01)

Wireframes de baja fidelidad de la sección 11.2 del informe. Están en blanco y negro (cajas grises, texto de etiqueta, sin color). La vista de escritorio mide 1366 px y la de móvil, 360 px. Cada lámina trae a la derecha las **notas de diseño**: los círculos numerados de la pantalla remiten a esas notas, que aplican la tabla 22 (decisiones de diseño) y el contenido de la tabla 21. Los datos son ficticios y coinciden con los del prototipo (`prototipo/db.seed.json`).

Cada pantalla se entrega en dos archivos: `.svg` (vectorial y editable) y `.png` (para insertar en Word; escritorio a 1,5x y móvil a 2,2x, con fondo blanco).

| Archivo | Pantalla | Decisión de la tabla 22 que refleja |
|---|---|---|
| `P02-inicio-sesion-wireframe` | P02 Inicio de sesión (público) | Las credenciales quedan fuera de la navegación operativa: no hay menú lateral. Hay un único mensaje de error genérico y un enlace al registro. |
| `P04-nueva-solicitud-wireframe` | P04 Nueva solicitud (solicitante) | Primero se agrupan categoría y ubicación; luego vienen la descripción y la afectación (impacto y urgencia). Los errores aparecen junto al campo y los datos válidos se conservan. Se añaden un resumen de errores y la prioridad inicial calculada (tabla 23 y 11.4). |
| `P05-mis-solicitudes-wireframe` | P05 Mis solicitudes (solicitante) | Código y estado van primero. Hay filtros por estado y categoría, el botón Nueva solicitud, paginación y un mensaje de lista vacía. También se muestran los estados de error con reintento y de carga (11.4). |
| `P06-detalle-solicitante-wireframe` | P06 Detalle y conformidad (solicitante) | Reúne responsable, plazos y actividad. Confirmar o reabrir aparece solo en Resuelta y dentro de la ventana de 72 h. La encuesta aparece tras el cierre. |
| `P07-bandeja-evaluacion-wireframe` | P07 Bandeja y evaluación (supervisor) | La prioridad está separada del responsable: son dos tarjetas con acciones propias. La tabla de carga por técnico apoya la asignación. Cancelar es una acción secundaria que pide motivo. |
| `P08-bandeja-atencion-tecnico-wireframe` | P08 Bandeja y atención (técnico) | Tiene acciones explícitas para iniciar, agregar un avance y registrar la solución, con campos obligatorios según la transición (solución de 20 a 2000 caracteres). |
| `P10-dashboard-wireframe` | P10 Dashboard (supervisor) | Las tarjetas y los gráficos comparten los filtros de periodo y área. Incluye exportación CSV y la distribución por técnico, con Sin asignar. |
| `P11-usuarios-wireframe` | P11 Usuarios (administrador) | El mantenimiento de cuentas está separado del trabajo operativo. Para desactivar a un técnico hay que reasignar antes sus casos pendientes; el diálogo bloquea la confirmación hasta completarlo. |
| `P04-nueva-solicitud-movil-wireframe` | P04 en móvil (360 px) | Sigue la sección 11.4: una columna y menú compacto. Mantiene el orden y las decisiones de P04, y los botones ocupan todo el ancho. |
| `P06-detalle-solicitante-movil-wireframe` | P06 en móvil (360 px) | Sigue la sección 11.4: una columna y menú compacto. Muestra conformidad, responsable, plazos y actividad apilados. |

Notas:

- El estado y la prioridad siempre se escriben con texto («Estado: Resuelta», «Prioridad: Media»), porque en blanco y negro no hay color que los refuerce.
- En P08, las tarjetas «Agregar avance» y «Registrar solución» aparecen con borde discontinuo y el rótulo «(visible en En atención)». Así se documentan en la misma lámina, aunque en el sistema real solo se muestran las acciones permitidas para el estado.
- En P11 la tabla del diálogo usa como ejemplo tres casos pendientes de un técnico.
