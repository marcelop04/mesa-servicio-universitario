# B5 · Pruebas de usuario y responsive

Responsable: David. Muestra prevista: **5 personas reales** representativas de los
usuarios del sistema. Pueden ser cinco solicitantes; probar otros roles es complementario.
Estado: cinco sesiones aportadas por el responsable y cuestionarios calculados,
**media 87/100**. Notas de tarea, tiempos, ayuda y navegador: no registrado.
Ver [resultados y limitaciones](Resultados_SUS.md).

- Aplicación: <https://msu-157-137-206-147.sslip.io>.
- Cuestionario web: <https://msu-157-137-206-147.sslip.io/sus/>.
- [Mensaje para enviar y cuestionario escrito](Cuestionario_SUS.md).

SUS evalúa la usabilidad del sistema completo. La encuesta de satisfacción HU13,
con nota de 1 a 5 tras cerrar un caso, no sustituye este cuestionario de diez ítems.

## Preparación de las sesiones

1. Comprobar el origen HTTPS con el smoke del manual técnico. Registrar SHA/digests
   de la entrega activa, fecha y navegador. Reunir las cinco respuestas de una misma
   versión; si se actualiza durante las sesiones, documentarlo y separar los resultados.
2. Asignar P01…P05, sin publicar nombres, correos ni contraseñas. Facilitar una cuenta
   de prueba por sesión mediante un canal privado. Emplear solo datos ficticios en los casos.
3. Acordar la ventana con el equipo para evitar k6, ZAP, despliegues o respaldos durante
   las tareas. Explicar que se evalúa el sistema y permitir detener la actividad.
4. Prever 15–20 minutos por persona. Si se capturan pantallas, pedir permiso y excluir
   cualquier dato personal. Preferir una combinación de teléfonos y computadoras reales.
5. Registrar el ancho real observado. La revisión técnica adicional se ejecuta exactamente
   a 360 × 780 y 1366 × 900; no se cambia el ancho de una persona a 360/1366 por conveniencia.

## Tareas observadas

No explicar dónde pulsar ni sugerir respuestas. Registrar **sin ayuda / con ayuda /
no completada**, duración, errores y comentarios. A cada solicitante le corresponden
las primeras tres filas; los pasos de personal son opcionales según la sesión.

| Rol | Tarea | Éxito observable |
|---|---|---|
| Solicitante | Entrar, registrar un proyector que no enciende y encontrar la solicitud | Localiza código, estado, prioridad y vencimiento |
| Solicitante | Abrir detalle, comentar y adjuntar una imagen ficticia | Comentario y evidencia permanecen al recargar |
| Solicitante | Consultar perfil/notificaciones y salir | Navega y cierra la sesión sin ayuda |
| Supervisor | Evaluar y asignar el caso a un técnico del área | Confirma estado y asignación |
| Técnico | Iniciar atención y registrar la solución | El caso pasa a Resuelta |
| Solicitante | Confirmar una solución preparada por el facilitador y calificar su atención | El caso queda cerrado y admite una sola encuesta HU13 |
| Administrador | Localizar políticas y auditoría | Identifica la versión vigente y el cambio registrado |

El facilitador puede preparar el estado del caso con otra cuenta. Esos pasos no se
atribuyen al participante. No es necesario esperar el ciclo de atención para responder SUS.

| Persona | Fecha Lima | Rol | Dispositivo/navegador y ancho real | Tareas, resultado y duración | Ayuda y hallazgos | SHA/digests | Estado |
|---|---|---|---|---|---|---|---|
| P01 | 13/11/2026 | Solicitante | No registrados; viewport 1536 | No registrados | Comentario favorable; ayuda no registrada | No registrado | Cuestionario registrado |
| P02 | 13/11/2026 | Solicitante | No registrados; viewport 360 | No registrados | Sugiere modo oscuro; ayuda no registrada | No registrado | Cuestionario registrado |
| P03 | 13/11/2026 | Solicitante | No registrados; viewport 1920 | No registrados | Comentario favorable; ayuda no registrada | No registrado | Cuestionario registrado |
| P04 | 13/11/2026 | Solicitante | No registrados; viewport 1366 | No registrados | Destaca seguimiento; ayuda no registrada | No registrado | Cuestionario registrado |
| P05 | 13/11/2026 | Solicitante | No registrados; viewport 414 | No registrados | Destaca comprensión del flujo; ayuda no registrada | No registrado | Cuestionario registrado |

## Recolección y cálculo

Tras probar la aplicación, cada persona responde los diez ítems del cuestionario,
confirma que realizó las tareas y descarga `SUS-P01.csv` (o su identificador).
El formulario no envía respuestas a un servidor; cada participante entrega su CSV.
Usar el mismo dispositivo/navegador de las tareas para registrar el ancho observado.

Combinar los archivos en una carpeta privada existente, sin sobrescribir originales:

```bash
python docs/pruebas/usuarios/combinar-sus.py SUS-P01.csv SUS-P02.csv SUS-P03.csv SUS-P04.csv SUS-P05.csv --salida respuestas-recogidas.csv
python docs/pruebas/usuarios/calcular-sus.py respuestas-recogidas.csv
```

El formato tiene `participante`, fecha ISO de Lima, rol, `ancho` real en píxeles,
URL HTTPS, `q1`…`q10` entre 1 y 5, observaciones, `origen=RESPUESTA_USUARIO`,
`viewport_real` y `fecha_utc`. Si se usa la versión escrita, el facilitador transcribe
las respuestas y los datos de su ficha de sesión sin completar campos por suposición.

`respuestas-sus.csv` contiene las cinco respuestas recibidas, conservadas sin cambios de valores.
El cálculo rechaza CSV vacíos, duplicados, respuestas incompletas, otros orígenes de
datos y la combinación de distintas aplicaciones HTTPS. No tiene modo de simulación.
Las pruebas unitarias de la fórmula son verificaciones técnicas y no se registran
como participantes ni como resultados de usabilidad.

SUS = `2,5 × [Σítems impares(respuesta − 1) + Σítems pares(5 − respuesta)]`.
Informar puntuaciones por seudónimo, media y tamaño de muestra. La escala es 0–100;
no es un porcentaje de éxito. El reparto no fija una nota mínima de aprobación.
Un CSV con cinco filas no prueba por sí solo que participaron cinco personas.

## Revisión responsive reproducible

Desde `docs/pruebas`, con Node 22+ y credenciales de evaluación en variables privadas:

```bash
npm ci
npx playwright install chromium
BASE=https://TU_HOST MSU_TEST_PASSWORD="$CLAVE_DEMO" npm run responsive
```

En PowerShell, con Edge instalado:

```powershell
$env:BASE = 'https://msu-157-137-206-147.sslip.io'
$env:NAVEGADOR = 'msedge'
# Cargar MSU_TEST_PASSWORD por un canal privado, sin pegarla en el historial.
npm.cmd run responsive
```

Las cuentas por rol son las de evaluación existentes. Para otras cuentas, configurar
`MSU_EMAIL_SOLICITANTE`, `MSU_EMAIL_SUPERVISOR`, `MSU_EMAIL_TECNICO` y `MSU_EMAIL_ADMIN`.
No habilitar siembra demo en prod: desactivarla no elimina las cuentas previamente creadas.

El script revisa las pantallas de los cuatro roles y `/sus/` a 360/1366 px, comprueba
los diez grupos de preguntas y 50 opciones sin responderlos, captura las vistas y
detecta desbordes/5xx. El informe distingue localhost de la aplicación desplegada.
Revisar visualmente menús, botones, errores, tablas, detalle y pestañas administrativas.
Registrar fallos, corrección y repetición. Las capturas automatizadas no sustituyen
las sesiones con personas.

Las tandas `responsive-local/`, `responsive/` y `responsive-main/` se conservan como
historial en `docs/evidencias/fase-iii-iv-david/`. La última entrega documentada tiene
32 capturas de roles y dos adicionales de SUS, sin desbordes/5xx. Una nueva entrega
debe generar su propia evidencia; no sobrescribir las anteriores para cambiarles la versión.

## Integración cuando lleguen las respuestas

1. Revisar los cinco CSV y completar la tabla de sesiones con tareas, hallazgos y versión.
2. Incorporar únicamente respuestas anónimas verificadas a `respuestas-sus.csv` y calcular SUS.
3. Actualizar B5 en `docs/fase-iii-iv-david.md` y las secciones 4 y 7 del informe final.
4. Entregar a Alex los resultados para `docs/informe-pruebas.md` cuando se integre el PR #5,
   y a Marcelo la síntesis para el informe consolidado.
5. Corregir los problemas encontrados y documentar su reprueba; Gabriel integra la
   síntesis en la presentación del equipo.

B5 tiene sus cinco sesiones aportadas, respuestas, cálculo y revisión responsive registrados.
Las notas de tarea, tiempos, ayuda y navegador constan como no registrados. El resumen
prioriza el viewport observado, conserva las horas sin validar y documenta estas
limitaciones en los resultados y en las secciones del paquete B del informe.
