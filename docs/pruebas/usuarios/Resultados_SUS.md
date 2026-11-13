# Resultados de usabilidad SUS

Fecha declarada de las sesiones: **13/11/2026, Lima**.
Aplicación: <https://msu-157-137-206-147.sslip.io>.
Muestra recibida: **5 cuestionarios, todos del rol Solicitante**.
Estado: sesiones aportadas por el responsable, respuestas y cálculo incorporados.
Tareas observadas, duración, ayuda, dispositivo y navegador: **no registrado**.

## Resultado cuantitativo

**Media SUS: 87/100.** Mediana: 90. Mínimo: 75. Máximo: 95.
La escala SUS va de 0 a 100 y no representa un porcentaje de éxito en las tareas.

| Participante | SUS | Viewport observado (px) |
|---|---:|---:|
| P01 | 75 | 1536 |
| P02 | 95 | 360 |
| P03 | 85 | 1920 |
| P04 | 90 | 1366 |
| P05 | 90 | 414 |

Cada persona respondió los diez ítems con valores entre 1 y 5. Los identificadores
son únicos y los cinco archivos registran el mismo origen HTTPS. Se conservaron
las respuestas, observaciones y metadatos recibidos sin corregirlos por suposición.

La fórmula aplicada a cada registro es:
`2,5 × [Σítems impares(respuesta − 1) + Σítems pares(5 − respuesta)]`.
La suma de puntuaciones es 435; `435 / 5 = 87`.

## Observaciones recogidas

- P01 describe navegación fluida, integración de funciones y confianza al usar las opciones.
- P02 describe facilidad de registro y propone un modo oscuro como mejora opcional.
- P03 destaca las etiquetas y la claridad del menú.
- P04 destaca el seguimiento de solicitudes y recomienda conservar la simplicidad.
- P05 destaca el acceso al formulario y la comprensión del flujo.

Las observaciones recibidas no describen un fallo funcional concreto. El modo oscuro
se registra como sugerencia, sin añadirlo al alcance ni afirmar que se implementó.
No se deducen tiempos de tarea, tasas de éxito o ausencia de ayuda a partir de comentarios generales.

## Metadatos y alcance

- P01 contiene `ancho=1366` y `viewport_real=1536`. Con autorización del responsable,
  el resumen y el cálculo usan el viewport observado. El CSV conserva ambos valores
  originales. La herramienta prioriza `viewport_real` y usa `ancho` cuando no existe ese campo.
- Las horas individuales no se validaron. Se informa la fecha declarada, 13/11/2026,
  y se conservan las marcas originales. No se usan para calcular duración ni para
  atribuir un orden confirmado a las sesiones.
- Los CSV no incluyen navegador, dispositivo, duración, tareas observadas, ayuda ni SHA.
  El responsable indicó que no se registraron y así constan en las fichas.
- El último despliegue comprobado corresponde a `f8d8c9e585fcbd278475a20784d0e7b1621c194f`,
  [CD 43468451433](https://github.com/marcelop04/mesa-servicio-universitario/actions/runs/43468451433).
  Ese dato de infraestructura no acredita por sí solo la versión usada por cada persona.
- Las cinco respuestas representan a solicitantes. La revisión técnica previa de
  cuatro roles a 360/1366 px se conserva por separado en las evidencias B; los anchos
  de estos CSV no sustituyen esa revisión ni acreditan pruebas de usuario de otros roles.

La puntuación resume las respuestas recibidas. B5 incorpora las cinco sesiones
aportadas, su análisis SUS y la revisión responsive existente, con las limitaciones
de observación registradas. No se calcula una tasa de éxito o un tiempo medio de tarea.

## Datos y reproducción

- [Respuestas consolidadas](respuestas-sus.csv).
- [Resultado del cálculo](resultados-sus.json).
- [Protocolo y fichas de sesión](Protocolo_SUS.md).

```bash
python docs/pruebas/usuarios/calcular-sus.py docs/pruebas/usuarios/respuestas-sus.csv
```

La consolidación mantiene una fila por archivo original. Estas sumas permiten
comparar los archivos entregados sin publicar rutas privadas del equipo:

| Archivo original | SHA-256 |
|---|---|
| SUS-P01.csv | `30f4f10ce4b345bd86d808c71a2770c33880e8590820d9191f3484d506978a1e` |
| SUS-P02.csv | `1933c087c28a2ab62fe85e1102a8480818942649bcbded2867175037ed978ecf` |
| SUS-P03.csv | `c102a03524b618b0bd235ce18f9ced099f0c68428156de48a5da09d638a4667d` |
| SUS-P04.csv | `7c610aa7f7eb3f9fbace7eb844dc25c43fa4b852bb6393b4bf605918e0e4c3e4` |
| SUS-P05.csv | `0e13c53198c47958281a73502a43272cc372b2893a7c08465e5feab78ff6543b` |
