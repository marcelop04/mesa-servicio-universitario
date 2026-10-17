# Fase II · Parte de Marcelo (modelo de datos y supervisión)

Estado al 16/10/2026. Cada tarea se compara con su criterio de «Terminado cuando» del plan de trabajo.

| ID | Tarea | Terminado cuando | Estado | Evidencia |
|---|---|---|---|---|
| MR01 | Entidades y migraciones de todas las tablas (9.2 y 9.3) | La base se crea completa desde cero con un solo comando | Hecho | `V3__solicitudes_y_seguimiento.sql`; entidades en `solicitudes`, `politicas`, `notificaciones`, `auditoria`, `identidad`; `docker compose up` |
| MR02 | HU14 Cálculo de plazos y copia de la política aplicada | Cumple BDD 1 y 2 de HU14 | Hecho | `PlazosServicio`, `MatrizAplicada`; `PlazosSolicitudTest`, `ReglasDePlazosTest` |
| MR03 | Servicio de transiciones con control de versión (409) | Cumple BDD 2 de HU24 | Hecho | `TransicionesServicio`, `Transicion`; `SupervisionTest.hu24Bdd2…` |
| MR04 | HU07 Evaluar y priorizar con motivo y recálculo | Cumple BDD 1 y 2 de HU07 | Hecho | `POST /solicitudes/{id}/evaluacion`; `SupervisionTest.hu07…` |
| MR05 | HU08 Asignar y reasignar técnico, con carga | Cumple BDD 1 y 2 de HU08 | Hecho | `POST /solicitudes/{id}/asignaciones`, `GET /supervision/tecnicos`; `SupervisionTest.hu08…` |
| MR06 | HU09 Cancelar con motivo y referencia a duplicado | Cumple BDD 1 y 2 de HU09 | Hecho | `POST /solicitudes/{id}/cancelacion`; `SupervisionTest.hu09…` |
| MR07 | Pantalla P07 Bandeja y evaluación del supervisor | El supervisor evalúa y asigna desde la interfaz | Hecho | `frontend/src/paginas/supervision/Supervision.jsx`; `supervision.test.jsx` |
| MR08 | Pruebas de matriz, recálculo y conflicto de versión | Pasan en el pipeline | Pasan en local; el pipeline es AX08 (Alex) | `./mvnw test` (48) y `npm test` (35) |

## Modelo de datos (MR01)

`V3` agrega las tablas de la tabla 16 y la revocación de sesión de la tabla 15: `solicitud` (con sus
campos de control), `comentario`, `evidencia`, `evento_operativo`, `asignacion_historica`,
`notificacion`, `encuesta`, `auditoria` y `revocacion_sesion`. Decisiones:

- Descripciones, motivos y comentarios usan `VARCHAR` con el límite de la tabla 16 en lugar de `TEXT`,
  para que `ddl-auto: validate` funcione igual en MySQL y en H2.
- `matriz_aplicada`, `anterior`/`nuevo` del evento y `metadatos` de auditoría son `JSON`.
- `solicitud.version` es el control optimista (`@Version`); `version_fechas` cambia solo si cambian los límites.
- `solicitud.duplicada_de_id` guarda la referencia al caso original de una cancelación por duplicado.
- Se eliminó la tabla mínima de pruebas `V900`; las pruebas crean solicitudes reales con `SolicitudesDePrueba`.

## Para los demás integrantes

- **Alex (AX01, AX02):** para registrar use `new Solicitud(...)` + `PlazosServicio.aplicarPoliticaVigente(s)`
  y registre el evento `REGISTRAR`. `GET /solicitudes` y `GET /solicitudes/{id}` ya filtran por rol
  (`ListadoSolicitudesServicio`); P05 puede usarlos tal cual. Falta la generación del código MSU.
- **Atención técnica (HU10 a HU12):** use `TransicionesServicio`: `cargar(id, version)` → `aplicar(s, Transicion.INICIAR_ATENCION, …)`
  → `guardar(s)`. `aplicar` fija la primera atención, la resolución o el cierre y registra el evento.
- **David (DV04, DV06):** `revocacion_sesion` ya existe para el JWT. Las reglas de acceso a solicitudes
  están en `Permisos` y pueden centralizarse.
- **Docker:** `docker compose up --build` levanta MySQL 8.0, backend y frontend (AX07 puede ajustarlo).
