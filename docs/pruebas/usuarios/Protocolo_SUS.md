# B5 · Pruebas de usuario y responsive de la aplicación desplegada

Responsable: David. Muestra prevista: **5 personas reales**, idealmente 3 solicitantes,
1 persona que pruebe supervisión y 1 que pruebe atención técnica/administración.
Estado: protocolo e instrumentos preparados; sesiones y puntuaciones pendientes.

Aplicación para las sesiones: <https://msu-157-137-206-147.sslip.io>.
Cuestionario: <https://msu-157-137-206-147.sslip.io/sus/> (al integrar la actualización).
La comprobación automatizada de cuatro roles a 360/1366 px ya produjo 32 capturas sin
fallos en `docs/evidencias/fase-iii-iv-david/responsive/`; las sesiones con personas
se registran separadamente en la tabla y el CSV.

## Preparación

1. Confirmar la URL **HTTPS pública** y el commit/digest con el smoke del manual técnico.
2. Usar únicamente datos ficticios y cuentas de demostración. Dar la contraseña por un
   canal privado; no incluirla en capturas ni en el CSV. Acordar la ventana con el equipo.
3. Identificar participantes como P01…P05, sin registrar nombres/correos personales.
4. Hacer al menos dos sesiones a **360 × 780** y dos a **1366 × 900**. La quinta puede
   alternar tamaños. Preferir al menos un teléfono real; DevTools complementa la revisión.
5. Explicar que se evalúa el sistema, permitir detener la sesión y solicitar permiso si
   se capturan imágenes de pantalla. Duración prevista: 15–20 minutos por persona.

## Tareas observadas (sin explicar dónde pulsar)

| Rol | Tarea | Éxito observable |
|---|---|---|
| Solicitante | Entrar, registrar un problema de proyector y localizarlo en sus solicitudes | Encuentra código, prioridad y vencimiento |
| Solicitante | Abrir detalle, comentar y adjuntar una imagen ficticia | Comentario y evidencia visibles tras recargar |
| Supervisor | Encontrar el caso, evaluarlo y asignarlo a un técnico del área | Identifica estado/asignación y confirma la acción |
| Técnico | Iniciar atención y registrar solución comprensible | El caso pasa a Resuelta |
| Solicitante | Confirmar la solución y contestar la encuesta de satisfacción | Caso cerrado y calificación registrada una vez |
| Administrador | Localizar políticas e historial de auditoría | Entiende qué versión está vigente y qué cambio se registró |
| Todos | Consultar su perfil, identificar notificaciones cuando corresponda y salir | Navega sin ayuda y cierra la sesión |

El facilitador puede cambiar de cuenta para completar el ciclo entre tareas. Cada
participante realiza tareas de su rol; no atribuirle pasos ejecutados por el facilitador.
Registrar duración, éxito/sin ayuda/con ayuda/fallo, errores y comentarios textuales.

| Persona | Fecha | Rol | Tamaño | Tareas realizadas / duración | Hallazgos y ayuda | Estado |
|---|---|---|---|---|---|---|
| P01 | Pendiente | Por asignar | 360 | Pendiente | Pendiente | No realizada |
| P02 | Pendiente | Por asignar | 1366 | Pendiente | Pendiente | No realizada |
| P03 | Pendiente | Por asignar | 360 | Pendiente | Pendiente | No realizada |
| P04 | Pendiente | Por asignar | 1366 | Pendiente | Pendiente | No realizada |
| P05 | Pendiente | Por asignar | Por asignar | Pendiente | Pendiente | No realizada |

## Cuestionario SUS

El formulario usa solo seudónimos P01–P05 y descarga un CSV individual. Cada persona
entrega su archivo al facilitador, que comprueba la sesión y reúne los cinco archivos.
Se conserva el ancho previsto y también el viewport realmente observado. Para combinar:

```bash
python docs/pruebas/usuarios/combinar-sus.py SUS-P01.csv SUS-P02.csv SUS-P03.csv SUS-P04.csv SUS-P05.csv --salida respuestas-recogidas.csv
python docs/pruebas/usuarios/calcular-sus.py respuestas-recogidas.csv
```

`ejemplo-SIMULADO.csv` contiene datos sintéticos para demostrar la herramienta, no
participantes ni resultados reales. El cálculo normal los rechaza. Solo se procesa
con `--simulacion`, devuelve cero participantes reales y no marca B5 como cerrado:

```bash
python docs/pruebas/usuarios/calcular-sus.py docs/pruebas/usuarios/ejemplo-SIMULADO.csv --simulacion
```

Después de las tareas y sin sugerir respuestas: **1 totalmente en desacuerdo, 2 en
desacuerdo, 3 neutral, 4 de acuerdo, 5 totalmente de acuerdo**. Contestar los diez ítems.

1. Creo que me gustaría utilizar este sistema con frecuencia.
2. Encontré el sistema innecesariamente complejo.
3. Pensé que el sistema era fácil de usar.
4. Creo que necesitaría ayuda de una persona con conocimientos técnicos para utilizarlo.
5. Encontré que las distintas funciones del sistema estaban bien integradas.
6. Pensé que había demasiadas inconsistencias en el sistema.
7. Imagino que la mayoría de las personas aprenderían a utilizarlo rápidamente.
8. Encontré el sistema muy complicado de utilizar.
9. Me sentí muy seguro/a utilizando el sistema.
10. Necesité aprender muchas cosas antes de poder utilizar el sistema.

Preguntas abiertas: ¿Qué fue lo más difícil? ¿Qué cambiarías primero? ¿Entendiste los
estados y los plazos? ¿Pudiste completar la tarea en la pantalla pequeña?

Guardar respuestas reales en `respuestas-sus.csv`: fecha ISO `AAAA-MM-DD`, rol, ancho
360/1366, URL HTTPS y q1…q10 entre 1 y 5. Hay una cabecera vacía, sin respuestas simuladas.
El resultado SUS se calcula como `2,5 × [Σítems impares(respuesta − 1) + Σítems pares(5 − respuesta)]`.
La escala va de 0 a 100; **no es un porcentaje de éxito**. Informar media y tamaño de
muestra; 68 es solo una referencia habitual, no evidencia de aceptación por sí misma.

```bash
python docs/pruebas/usuarios/calcular-sus.py docs/pruebas/usuarios/respuestas-sus.csv
```

El programa rechaza respuestas incompletas, repetidas o con URL no HTTPS. No genera
una media para una plantilla vacía y señala si todavía no se alcanzan cinco personas.

## Revisión responsive reproducible

Desde `docs/pruebas`, con Node 22+ y contraseña de demo en `MSU_TEST_PASSWORD`:

```bash
npm ci
npx playwright install chromium
BASE=https://TU_HOST MSU_TEST_PASSWORD="$CLAVE_DEMO" npm run responsive
```

En Windows puede usarse Edge ya instalado, con `NAVEGADOR=msedge`. Los correos ficticios
vienen de la demo; si se usan otras cuentas, definir `MSU_EMAIL_SOLICITANTE`,
`MSU_EMAIL_SUPERVISOR`, `MSU_EMAIL_TECNICO` y `MSU_EMAIL_ADMIN`. La clave común se usa
solo para las cuentas ficticias creadas por `--demo`.

El script consulta pantallas de los cuatro roles, obtiene capturas a 360 y 1366 px,
detecta desborde horizontal y errores 5xx y escribe `resultado.json` con URL/fecha/tamaño.
No crea ni modifica solicitudes o políticas. Revisar las capturas visualmente:

- Menús, encabezados, formularios y botones accesibles sin quedar tapados.
- Texto legible; errores y confirmaciones visibles sin depender solo del color.
- Tablas con desplazamiento propio cuando haga falta, sin ensanchar la página.
- Detalle, evidencias, tabs de políticas/auditoría y sesión correctos al recargar.
- Registrar navegador/dispositivo, fallo, prioridad, corrección y repetición de la prueba.

`PERMITIR_HTTP_LOCAL=true` admite una revisión previa en localhost, y el informe la
marca como **local**. Esa ejecución no sustituye la revisión sobre la URL desplegada.
Las capturas y el resultado de nube se guardan en `docs/evidencias/fase-iii-iv-david/`.

## Cierre de B5

Adjuntar URL/commit, cinco sesiones reales, CSV y media SUS, revisión visual a ambos
tamaños, defectos encontrados y decisiones de corrección. Entregar el resumen a Alex
para el informe de pruebas y a Marcelo para el informe final. Por ahora no hay
participantes evaluados ni una puntuación SUS obtenida.
