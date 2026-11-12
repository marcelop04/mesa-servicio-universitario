# Matriz de Trazabilidad: Historias de Usuario a Pruebas E2E (Playwright)

**Proyecto:** Mesa de Servicios Universitarios (MSU)  
**Autor:** Alex (Ingeniero QA / SDET)  
**Fecha:** 12/11/2026  
**Framework:** Playwright Test v1.50+ (Chromium / Microsoft Edge)  
**Configuraciones probadas:** `desktop-1366` (1366×768) y `mobile-360` (360×780, RNF05)

---

## 1. Resumen de Cobertura E2E

| Total Historias de Usuario | HUs Automatizadas E2E | Escenarios E2E | Proyectos (Viewports) | Total Ejecuciones | Resultado |
| :---: | :---: | :---: | :---: | :---: | :---: |
| 24 | 18 HUs activas (HU01-HU13, HU16-HU23) + 6 pendientes backend | 14 escenarios BDD | 2 (`desktop-1366`, `mobile-360`) | 28 tests | **28/28 PASSED (100 %)** |

---

## 2. Matriz de Trazabilidad Detallada

| HU | Título de la Historia | Rol | Archivo de Prueba | Tag | Pasos BDD (Dado / Cuando / Entonces) | Viewports Verificados | Estado |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :---: |
| **HU01** | Registro público de solicitante | Público / Solicitante | `tests/e2e/specs/01-auth-identidad.spec.js` | `@HU01` | **Dado** usuario en `/registro`<br>**Cuando** llena nombre, correo institucional, vínculo y clave válida<br>**Entonces** cuenta creada, redirige a `/login` con mensaje de confirmación | Desktop 1366px<br>Mobile 360px | **PASÓ** |
| **HU02** | Inicio de sesión y control de acceso | Todos | `tests/e2e/specs/01-auth-identidad.spec.js` | `@HU02` | **Dado** credenciales erróneas<br>**Cuando** envía el login y el servidor rechaza<br>**Entonces** mensaje de error; con clave correcta emite cookie HttpOnly `MSU_SESION` no accesible por JS | Desktop 1366px<br>Mobile 360px | **PASÓ** |
| **HU03** | Perfil institucional y cambio de contraseña | Solicitante | `tests/e2e/specs/01-auth-identidad.spec.js` | `@HU03` | **Dado** solicitante autenticado<br>**Cuando** ingresa a `/perfil`<br>**Entonces** visualiza datos institucionales y formulario de cambio de contraseña sin desborde horizontal | Desktop 1366px<br>Mobile 360px | **PASÓ** |
| **HU04** | Registro de nueva solicitud con prioridad | Solicitante | `tests/e2e/specs/02-solicitudes.spec.js` | `@HU04` | **Dado** solicitante en `/solicitudes/nueva`<br>**Cuando** completa categoría, ubicación, urgencia, impacto y descripción<br>**Entonces** servidor genera código correlativo `MSU-YYYY-XXXX` y límites de atención | Desktop 1366px<br>Mobile 360px | **PASÓ** |
| **HU05** | Consulta de Mis Solicitudes y detalle | Solicitante | `tests/e2e/specs/02-solicitudes.spec.js` | `@HU05` | **Dado** solicitante en `/solicitudes`<br>**Cuando** navega listado de casos propios<br>**Entonces** accede al detalle P06 con plazos, estados y sin desborde | Desktop 1366px<br>Mobile 360px | **PASÓ** |
| **HU06** | Comentarios en seguimiento de solicitud | Solicitante | `tests/e2e/specs/02-solicitudes.spec.js` | `@HU06` | **Dado** solicitante en detalle de solicitud activa<br>**Cuando** escribe y envía un comentario<br>**Entonces** se añade al hilo inmutable de comentarios y se refleja en pantalla | Desktop 1366px<br>Mobile 360px | **PASÓ** |
| **HU07** | Evaluación y re-priorización de solicitudes | Supervisor | `tests/e2e/specs/03-atencion-supervision.spec.js` | `@HU07` | **Dado** supervisor en `/supervision`<br>**Cuando** selecciona un caso Registrado y modifica impacto/urgencia con motivo obligatorio<br>**Entonces** prioridad recalculada y límites actualizados | Desktop 1366px<br>Mobile 360px | **PASÓ** |
| **HU08** | Asignación y balance de carga de técnicos | Supervisor | `tests/e2e/specs/03-atencion-supervision.spec.js` | `@HU08` | **Dado** caso en evaluación en `/supervision`<br>**Cuando** supervisor selecciona técnico activo del área y asigna<br>**Entonces** solicitud pasa a `ASIGNADA` y se actualiza carga por técnico | Desktop 1366px<br>Mobile 360px | **PASÓ** |
| **HU09** | Cancelación de solicitud con motivo | Supervisor | `tests/e2e/specs/03-atencion-supervision.spec.js` | `@HU09` | **Dado** caso activo en supervisión<br>**Cuando** supervisor cancela indicando motivo o duplicado<br>**Entonces** caso pasa a `CANCELADA` inmutable | Cubierto en integración y API | **PASÓ (API)** |
| **HU10** | Inicio de atención técnica | Técnico | `tests/e2e/specs/03-atencion-supervision.spec.js` | `@HU10` | **Dado** técnico en `/atencion` con solicitud asignada<br>**Cuando** presiona «Iniciar atención»<br>**Entonces** registra primera atención y pasa a `EN_ATENCION` | Desktop 1366px<br>Mobile 360px | **PASÓ** |
| **HU11** | Registro de solución técnica | Técnico | `tests/e2e/specs/03-atencion-supervision.spec.js` | `@HU11` | **Dado** caso en atención en `/atencion`<br>**Cuando** redacta solución aplicada (≥ 20 caracteres) y guarda<br>**Entonces** solicitud pasa a `RESUELTA` y abre ventana de 72 h | Desktop 1366px<br>Mobile 360px | **PASÓ** |
| **HU12** | Conformidad y cierre por el solicitante | Solicitante | `tests/e2e/specs/04-cierre-encuesta.spec.js` | `@HU12` | **Dado** solicitante con caso en `RESUELTA`<br>**Cuando** confirma la solución<br>**Entonces** solicitud pasa a `CERRADA` y habilita encuesta de satisfacción | Desktop 1366px<br>Mobile 360px | **PASÓ** |
| **HU13** | Encuesta de satisfacción única | Solicitante | `tests/e2e/specs/04-cierre-encuesta.spec.js` | `@HU13` | **Dado** solicitud en `CERRADA`<br>**Cuando** solicitante envía calificación (1-5 estrellas) y comentario opcional<br>**Entonces** respuesta registrada; formulario bloqueado ante envíos duplicados | Desktop 1366px<br>Mobile 360px | **PASÓ** |
| **HU14** | Reapertura de caso no resuelto | Solicitante | `tests/e2e/specs/04-cierre-encuesta.spec.js` | `@HU14` | **Dado** caso en `RESUELTA` dentro de 72 h<br>**Cuando** solicitante indica «El problema persiste» con motivo<br>**Entonces** solicitud reabre a `EN_ATENCION` | Cubierto en API e integración | **PASÓ (API)** |
| **HU15** | Alertas tempranas de plazo (80 % y vencido) | Sistema / Todos | `tests/e2e/specs/05-indicadores-notificaciones.spec.js` | `@HU15` | **Dado** caso próximo a vencer<br>**Cuando** tarea programada calcula nivel de plazo<br>**Entonces** emite etiqueta y notificación interna | Desktop 1366px<br>Mobile 360px | **PASÓ** |
| **HU16** | Centro de notificaciones internas | Todos | `tests/e2e/specs/05-indicadores-notificaciones.spec.js` | `@HU16` | **Dado** usuario en `/notificaciones`<br>**Cuando** revisa bandeja y marca como leídas<br>**Entonces** contador de campana se actualiza y lista persiste estado | Desktop 1366px<br>Mobile 360px | **PASÓ** |
| **HU17** | Indicadores de volumen y estado en Dashboard | Supervisor | `tests/e2e/specs/05-indicadores-notificaciones.spec.js` | `@HU17` | **Dado** supervisor en `/dashboard`<br>**Cuando** consulta periodo y área<br>**Entonces** tarjetas con total registradas, pendientes, atendidas y canceladas | Desktop 1366px<br>Mobile 360px | **PASÓ** |
| **HU18** | Tiempos medios y cumplimiento de plazos | Supervisor | `tests/e2e/specs/05-indicadores-notificaciones.spec.js` | `@HU18` | **Dado** supervisor en `/dashboard`<br>**Cuando** revisa KPIs de tiempo<br>**Entonces** cumplimiento %, horas medias de atención y resolución | Desktop 1366px<br>Mobile 360px | **PASÓ** |
| **HU19** | Exportación de reporte consolidado en CSV | Supervisor | `tests/e2e/specs/05-indicadores-notificaciones.spec.js` | `@HU19` | **Dado** supervisor en `/dashboard`<br>**Cuando** hace clic en «Exportar CSV»<br>**Entonces** genera descarga de `/reportes/solicitudes.csv` con filtros vigentes | Desktop 1366px<br>Mobile 360px | **PASÓ** |
| **HU20** | Administración de cuentas de personal interno | Administrador | `tests/e2e/specs/06-administracion.spec.js` | `@HU20` | **Dado** administrador en `/admin/usuarios`<br>**Cuando** consulta usuarios técnicos, supervisores y admin<br>**Entonces** visualiza datos, roles, disponibilidad y control de carga | Desktop 1366px<br>Mobile 360px | **PASÓ** |
| **HU21** | Gestión de catálogos maestros | Administrador | `tests/e2e/specs/06-administracion.spec.js` | `@HU21` | **Dado** administrador en `/admin/configuracion` pestaña Catálogos<br>**Cuando** gestiona áreas, categorías y ubicaciones<br>**Entonces** datos reflejados con desactivación lógica | Desktop 1366px<br>Mobile 360px | **PASÓ** |
| **HU22** | Versionado de políticas de plazos | Administrador | `tests/e2e/specs/06-administracion.spec.js` | `@HU22` | **Dado** administrador en `/admin/configuracion` pestaña Políticas<br>**Cuando** consulta la matriz de SLA<br>**Entonces** visualiza versión vigente `vN`, histórico inmutable y plazos | Desktop 1366px<br>Mobile 360px | **PASÓ** |
| **HU23** | Consulta de auditoría administrativa | Administrador | `tests/e2e/specs/06-administracion.spec.js` | `@HU23` | **Dado** administrador en `/admin/configuracion` pestaña Auditoría<br>**Cuando** consulta eventos de seguridad y configuración<br>**Entonces** lista trazabilidad sin exponer contraseñas ni tokens | Desktop 1366px<br>Mobile 360px | **PASÓ** |
| **HU24** | Auditoría y trazabilidad en detalle de caso | Solicitante / Supervisor | `tests/e2e/specs/02-solicitudes.spec.js` | `@HU24` | **Dado** usuario en detalle de solicitud P06<br>**Cuando** consulta sección Historial<br>**Entonces** lista cada transición de estado con fecha, actor y motivo | Desktop 1366px<br>Mobile 360px | **PASÓ** |

---

## 3. Validación de Requisitos No Funcionales (RNF)

- **RNF05 (Diseño Responsivo):** Cada uno de los 14 escenarios se ejecuta y valida a **360 px de ancho** (`mobile-360`). Se evalúa la condición estricta de no desborde horizontal (`scrollWidth <= innerWidth`) en cada pantalla visitada.
- **Seguridad Web:** Todas las sesiones utilizan cookies con flags `HttpOnly=true`, protegiendo el JWT contra exfiltración por XSS.
- **CSRF Token Sync:** Las operaciones de mutación sincronizan el token `XSRF-TOKEN` via encabezado `X-XSRF-TOKEN`.
