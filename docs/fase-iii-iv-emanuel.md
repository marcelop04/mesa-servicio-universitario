# Fases III y IV · Parte de Emanuel (paquete A: funciones pendientes y API)

Estado al 11/11/2026. Reparto según `Division_Fases_III_y_IV.pdf` (sorteo del equipo).

| ID | Tarea | Terminado cuando | Estado | Evidencia |
|---|---|---|---|---|
| A1 | HU13 Encuesta de satisfacción | Cumple BDD 1 y 2; pantalla en P06 | Hecho | `GET/POST /solicitudes/{id}/encuesta`, `Encuesta.jsx`; `EncuestaTest` (6), `encuesta.test.jsx` (6); capturas 01–03 y 11 |
| A2 | HU22 Versionar y publicar políticas de plazos | Cumple BDD 1 y 2; pestaña en P12 | Hecho | `GET/POST /admin/politicas`, `Politicas.jsx`; `PoliticasTest` (6), pruebas de P12 (5); capturas 04–07 y 10 |
| A3 | HU23 Auditoría administrativa | Registra accesos y cambios sin secretos; consulta en P12 | Hecho | `AuditoriaServicio`, `GET /admin/auditoria`, `Auditoria.jsx`; `AuditoriaTest` (5), pruebas de P12 (4); capturas 08 y 09 |
| A4 | HU02 Limpieza de tokens revocados vencidos | Tarea periódica e idempotente | Hecho | `LimpiezaRevocacionesServicio` (cada hora); `LimpiezaRevocacionesTest` (2) |
| A5 | OpenAPI completo y panorama de APIs | Errores, seguridad y códigos HTTP en todas las rutas; documento de alternativas | Hecho | `OpenApiConfig`, `OpenApiTest`; `docs/api/panorama-apis.md` |
| A6 | Manual de usuario por rol | Cubre los cuatro roles con capturas | Hecho | `docs/manual/Manual_de_usuario.md` |

## Reglas implementadas

- **Encuesta (HU13):**
  - Solo el solicitante propietario y solo con la solicitud **Cerrada**.
  - Calificación entera de 1 a 5 y comentario opcional de hasta 500 caracteres.
  - Una sola encuesta por caso: el segundo envío responde 409 `ENCUESTA_DUPLICADA`, y la restricción única de
    la tabla cubre los envíos simultáneos.
  - No cambia el estado ni la versión de la solicitud.
  - `GET` responde 204 si aún no hay encuesta.
  - El dashboard ya promedia estas calificaciones (HU18).
- **Políticas (HU22):**
  - Publicar crea la versión `n + 1`, vigente desde ese instante, en una transacción. No se editan versiones.
  - **Validación**, con el error en el campo exacto (`ALTA.horas_primera_atencion`):
    - las cuatro prioridades;
    - horas de 1 a 8760;
    - la primera atención no supera la resolución;
    - Crítica ≤ Alta ≤ Media ≤ Baja.
  - **Concurrencia:** si llega `version_base` y otra persona ya publicó, responde 409 `POLITICA_DESACTUALIZADA`.
    Una matriz igual a la vigente responde 409 `POLITICA_SIN_CAMBIOS`.
  - Las solicitudes existentes conservan su matriz (RN04), y el historial muestra cuántas usan cada versión.
- **Auditoría (HU23):**
  - Se registra en la misma transacción que el cambio:
    - inicio de sesión, cierre e intentos rechazados (solo el correo);
    - registro de cuenta y cambios de perfil y contraseña (sin valores);
    - usuarios internos, con anterior y nuevo por campo;
    - catálogos (alta, cambio, desactivación y reactivación);
    - publicación de políticas, con la matriz;
    - exportación CSV, con los filtros y el número de filas;
    - limpieza de sesiones.
  - `AuditoriaServicio` descarta cualquier clave sensible (`password`, `token`, `hash`, `secret`, `archivo`…)
    aunque un llamador la envíe por error (BDD 2).
  - La consulta es solo para administradores y filtra por acción, entidad, actor y fechas en hora de Lima.
    No hay rutas de edición ni borrado.
- **Limpieza de sesiones (HU02):**
  - Cada hora (`msu.tareas.limpieza-sesiones`) borra las revocaciones de tokens vencidos hace más de cinco
    minutos.
  - Las revocaciones vigentes se conservan, así que un token copiado antes de cerrar sesión sigue rechazado.
  - Repetir la limpieza no borra nada más.
- **OpenAPI:** `OpenApiConfig` agrega a todas las operaciones:
  - el esquema `ErrorApi` con ejemplos;
  - la seguridad (cookie `MSU_SESION` y cabecera `X-XSRF-TOKEN` en escrituras);
  - las respuestas 400, 401, 403, 404, 409 y 500 según el método y la ruta.

  Las respuestas que declara cada controlador no se reemplazan.

## Cambios en archivos de otros integrantes

Se agregó una línea de auditoría al final de cada cambio, sin tocar sus reglas:

- `UsuarioAdminServicio` (Gabriel): crear y actualizar.
- `CatalogoServicio` (Gabriel): crear, actualizar y desactivar. `actualizar` y `desactivar` ahora comparten
  `aplicarCambio` para registrar acciones distintas.
- `CuentaServicio`, `AuthControlador` y `RevocadorSesion` (David): registro, perfil, contraseña, inicio y
  cierre de sesión.
- `IndicadoresControlador`: exportación CSV.
- `Configuracion.jsx` (Gabriel): las pestañas «Políticas de plazos» y «Auditoría administrativa» ya no son
  marcadores pendientes.

Todas las pruebas previas siguen pasando sin cambios en su lógica.

## Cómo verificar

```bash
cd backend && ./mvnw test      # JUnit: incluye EncuestaTest, PoliticasTest, AuditoriaTest, LimpiezaRevocacionesTest, OpenApiTest
cd frontend && npm test        # Vitest: encuesta.test.jsx y politicas-auditoria.test.jsx
```

Recorrido en el navegador con capturas. Requiere `docker compose up --build` y Microsoft Edge (con Chrome, usar
`NAVEGADOR=chrome`). Publica una versión nueva de la política en la base local de demostración. Desde la
revisión de seguridad (paquete C), el script ya no trae una contraseña por defecto: hay que pasar la de las
cuentas de demostración en `DEMO_PASSWORD`.

```bash
cd docs/pruebas
npm install --no-save playwright-core
DEMO_PASSWORD='<contraseña de demostración local>' node recorrido-fase-iii-emanuel.mjs ../evidencias/fase-iii-emanuel
```

El script falla en estos casos:

- un paso no muestra el resultado esperado;
- se ofrece una segunda encuesta;
- la auditoría muestra un secreto;
- hay desplazamiento horizontal a 360 px.

## Correcciones posteriores a la entrega del paquete (12 al 14/11/2026)

- **Defecto A4 (hallado por la revisión de Marcelo):** `programado()` llamaba a `limpiar()` desde la misma
  clase, así que `@Transactional` no se aplicaba y la tarea fallaba con `TransactionRequiredException`. Las
  pruebas no lo detectaban porque corrían dentro de una transacción. Corregido en el PR #7: `limpiar()` abre su
  transacción con `TransactionTemplate`, y `laTareaProgramadaFuncionaSinTransaccionPrevia` cubre ese camino.
- **Cambios de C sobre archivos de este paquete, revisados y aceptados:** sanitización de secretos dentro de
  listas en `AuditoriaServicio`, aviso del límite de intentos en el manual de usuario y `DEMO_PASSWORD` en el
  script del recorrido.
- **Estado en main (`98bf12c`):** 193 pruebas de backend y 83 de frontend, 0 fallas.

## Registro de uso de IA

| Campo | Valor |
|---|---|
| Herramienta | Claude Code (asistente de programación) |
| Prompt | «Haz todo lo que me toca (paquete A): HU13, HU22, HU23, HU02, OpenAPI completo y manual de usuario» |
| Resultado generado | Código backend y frontend, pruebas JUnit y Vitest, script de recorrido, manual y documento de APIs |
| ¿Se utilizó? | Sí, revisado |
| Validación realizada | Suite completa de backend y frontend, compilación, y recorrido en navegador sobre Docker con revisión visual de las capturas |
| Modificaciones | 3 correcciones tras revisar las capturas: limpiar el error de la encuesta al elegir, ordenar la matriz por urgencia en la auditoría y reacomodar los filtros |
| Responsable | Emanuel |
