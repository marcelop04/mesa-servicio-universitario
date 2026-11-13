# Informe Integral de Pruebas y Rendimiento

**Proyecto:** Mesa de Servicios Universitarios con Plazos de Atención (MSU)  
**Curso:** Taller de Construcción de Software Web  
**Paquete:** Paquete E – Pruebas y Rendimiento (Fases III y IV)  
**Responsable:** Alex (Ingeniero QA / SDET)  
**Fecha de emisión:** 12/11/2026  
**Versión del documento:** 2.1 (Consolidado Final con Trazabilidad Oficial, Evidencias de Nube y Resultados de Equipo)

---

## 1. Resumen Ejecutivo

El presente informe consolida las evidencias, métricas y resultados de la campaña integral de aseguramiento de calidad (QA) y pruebas de rendimiento ejecutada sobre el sistema **Mesa de Servicios Universitarios (MSU)** para la culminación de las Fases III y IV del proyecto.

La estrategia de pruebas abarcó la totalidad de la pirámide de automatización y las directivas de evaluación de la asignatura:
1. **Pruebas Unitarias e Integración (Backend):** Lógica de negocio, SLAs, cálculo y congelamiento de plazos, y transiciones de estado con JUnit 5 y H2 en modo MySQL.
   - *Entorno local de la rama de pruebas (`test/e5-informe-pruebas`):* **95 métodos de prueba** ejecutados exitosamente (`mvn test` en 18.2 s; 103 al incorporar el smoke `DespliegueHttpsTest` de David).
   - *Integración consolidada en CI (`main` / rama `feat/marcelo-seguridad`):* **155 métodos de prueba** (100 % aprobados) que incluyen las suites extendidas de seguridad, validación de políticas y servicios.
2. **Pruebas de Componentes (Frontend):** Renderizado, interacción, accesibilidad y persistencia de filtros en LocalStorage con Vitest y React Testing Library.
   - *Entorno local de la rama de pruebas:* **74 pruebas unitarias** distribuidas en 11 archivos de prueba (`npm --prefix frontend test`, 100 % aprobadas en 4.8 s).
   - *Integración consolidada en CI (`main` / rama `feat/marcelo-seguridad`):* **80 pruebas unitarias** distribuidas en 12 archivos de prueba (100 % aprobadas).
3. **Pruebas de API Automatizadas:** Suite Newman/Postman integrada en el pipeline de GitHub Actions (`ci.yml`), validando la matriz completa de roles institucionales (Solicitante, Supervisor, Técnico, Administrador) y códigos HTTP (200, 201, 204, 400, 401, 403, 404, 409).
   - **65 peticiones HTTP** y **182 aserciones** (100 % de éxito en 6.4 s), incorporando verificaciones explícitas de cálculo de plazos según política (`@HU14`), conflicto de concurrencia optimista (`@HU24` 409 `CONFLICTO_VERSION`) y denegación de acceso a solicitudes ajenas (`@HU24` 403 `ACCESO_DENEGADO`).
4. **Pruebas E2E de Aceptación:** Cobertura del 100 % de las Historias de Usuario oficiales (HU01 a HU24) con Playwright Test en dos resoluciones (`desktop-1366` y `mobile-360` para RNF05). Se erradicaron de raíz los condicionales permisivos (`if (await isVisible())`), garantizando la descarga e inspección real de archivos CSV (`@HU19`) y la preparación determinista de datos vía API (`helpers/datos.js`).
   - **48 pruebas** (24 escenarios BDD en desktop y 24 escenarios en mobile, 100 % aprobadas en 39.0 s).
5. **Pruebas de Rendimiento y Capacidad:** Carga sostenida (20 VU, RNF06) y estrés escalonado (hasta 400 VU) con k6 sobre una siembra de 2,000 registros, garantizando la sanitización absoluta de credenciales (`handleSummary` sin `setup_data`).
   - Carga: p95 de 362.62 ms en lecturas y 274.94 ms en escrituras con 0.00 % de errores.
   - Estrés: 12,685 peticiones procesadas a ~115 req/s sin colapso de procesos (0.00 % errores HTTP), alcanzando el punto de quiebre por saturación y degradación del SLA a 400 VU (p95 3.50 s, pico 8.42 s). Se formula la contención en el pool HikariCP como **hipótesis técnica fundamentada de arquitectura** (sujeta a confirmación con Actuator/Micrometer de Gabriel), observándose una estabilización **progresiva** durante el enfriamiento.
6. **Verificación sobre el Despliegue en la Nube (David - B1):** Comprobación en vivo sobre la instancia en Oracle Cloud Infrastructure (`https://msu-157-137-206-147.sslip.io`), verificando terminación TLS con Caddy, HSTS estricto, CSP, TTFB transfronterizo promedio de 111.0 ms y 32 capturas de pantalla responsivas aprobadas.
7. **Seguridad (SAST/DAST) y Usabilidad (SUS):** Integración de las métricas reales del equipo: 0 alertas en CodeQL, 0 vulnerabilidades en npm audit, 23 CVEs identificados en Dependency-Check (15 de severidad alta abiertos en dependencias de Spring Boot 3.5.13); DAST con OWASP ZAP delimitado formalmente y pendiente de autorización sobre la IP pública; y protocolo SUS de David formalizado, con el archivo `respuestas-sus.csv` listo para las 5 sesiones con usuarios finales.

### Síntesis Global de Resultados

| Categoría de Prueba | Herramienta | Alcance / Muestra | Aserciones / Casos | Tasa de Éxito | Duración | Estado |
| :--- | :--- | :--- | :--- | :---: | :---: | :---: |
| **Pruebas Unitarias/Integración (Local)** | JUnit 5 + H2 (modo MySQL) | Lógica de negocio, SLA, entidades | 95 métodos (103 con nube) | **100.00 %** (95/95) | 18.2 s | **APROBADO** |
| **Pruebas Unitarias/Integración (CI `main`)** | JUnit 5 + H2 (modo MySQL) | Suite consolidada con seguridad/servicios | 155 métodos | **100.00 %** (155/155) | 26.5 s | **APROBADO** |
| **Pruebas de Componentes UI (Local)** | Vitest + React Testing Library | Formularios, filtros, persistencia | 74 tests (11 archivos) | **100.00 %** (74/74) | 4.8 s | **APROBADO** |
| **Pruebas de Componentes UI (CI `main`)** | Vitest + React Testing Library | Suite consolidada frontend | 80 tests (12 archivos) | **100.00 %** (80/80) | 6.1 s | **APROBADO** |
| **Pruebas de API (Newman en CI)** | Newman 6.2 (Postman) | 24 HUs, 4 roles, RBAC, CSRF, SLA, 409 | 65 requests / 182 asserts | **100.00 %** (182/182) | 6.4 s | **APROBADO** |
| **Aceptación E2E (Desktop 1366px)** | Playwright Test | 24 HUs oficiales (BDD) | 24 escenarios | **100.00 %** (24/24) | 19.5 s | **APROBADO** |
| **Aceptación E2E (Mobile 360px)** | Playwright Test | RNF05: $\text{scrollWidth} \le \text{innerWidth}$ | 24 escenarios | **100.00 %** (24/24) | 19.5 s | **APROBADO** |
| **Carga Sostenida (RNF06)** | k6 v2.0.0 | 20 VU sostenidos, 2,000 registros | 1,603 requests (80% L / 20% E) | **100.00 %** (0.00 % error) | 60.0 s | **APROBADO** |
| **Estrés y Punto de Quiebre** | k6 v2.0.0 | Rampa 20 → 400 VU escalonados | 12,685 requests (~115 req/s) | **100.00 %** (0.00 % error) | 110.0 s | **APROBADO** |
| **Smoke y Responsivo en Nube (David)** | Playwright + Caddy + TLS | OCI Bogotá (`sa-bogota-1`) | 32 capturas (360/1366 px) | **100.00 %** (0 errores 5xx) | N/A | **APROBADO** |

---

## 2. Entorno y Metodología de Pruebas

### 2.1. Plataforma de Ejecución Local
- **Sistema Operativo:** Windows 11 Enterprise (64-bit), Kernel Windows_NT.
- **Entorno de Contenedores:** Docker Desktop con Docker Compose v2.
  - `mysql:8.0`: Base de datos MySQL 8.0 en puerto `3307` (`mesa_servicios`, UTF-8 MB4).
  - `backend`: Java 17 Eclipse Temurin, Spring Boot 3.5.13 en puerto `8080`.
  - `frontend`: Node.js 18 + Vite 6 compilado en servidor Nginx Alpine en puerto `8081`.
- **Herramientas de Evaluación:**
  - Newman CLI v6.2.3 con reporter `htmlextra` v1.23.1 y `junit`.
  - Playwright Test v1.50.0 sobre Chromium headless.
  - k6 v2.0.0 (commit `8c3be52cc1`, Go 1.26.3).
  - Apache Maven Surefire 3.5.6.

### 2.2. Arquitectura de Seguridad Evaluada
- **Autenticación:** Sesión basada en JWT emitido en cookie `MSU_SESION` con flags `HttpOnly=true`, `SameSite=Lax`, vida útil de 2 horas.
- **Protección CSRF:** Token rotativo en cookie `XSRF-TOKEN` (legible por cliente) que debe replicarse en el encabezado `X-XSRF-TOKEN` para todas las operaciones mutables (`POST`, `PUT`, `DELETE`).
- **Trazabilidad:** Inyección y propagación del encabezado de correlación `X-Correlation-Id` mediante `FiltroCorrelacion`.

---

## 3. Pruebas Funcionales y de API (Newman en CI)

Se implementó una suite integral organizada por rol institucional y por Historias de Usuario en `tests/api/colecciones/MSU-API.postman_collection.json`.

### 3.1. Cobertura de Códigos de Respuesta HTTP
- **200 OK / 201 Created / 204 No Content:** Operaciones exitosas de consulta, login, creación de solicitud, comentarios, conformidad, asignación, inicio de atención y resolución.
- **400 Bad Request:** Validaciones de entrada (longitud de descripción < 10 caracteres, correo inválido, solución técnica < 20 caracteres, justificación de reapertura corta, horas de SLA inconsistentes).
- **401 Unauthorized:** Intento de acceso a endpoints protegidos sin la cookie `MSU_SESION`.
- **403 Forbidden:** Violación de control de acceso basado en roles (RBAC) (ej. Solicitante intentando acceder a `/admin/usuarios` o `/indicadores`), omisión de header CSRF o intento de ver casos de otro solicitante (`08.04` `@HU24` con código `ACCESO_DENEGADO`).
- **404 Not Found:** Consulta de solicitudes o catálogos inexistentes.
- **409 Conflict:** Control de concurrencia optimista (`03.05` `@HU24` enviando versión desactualizada con código `CONFLICTO_VERSION`) o intento de desactivar un técnico con solicitudes pendientes asignadas (`07.03` `@HU20` con código `TECNICO_CON_CARGA`).

### 3.2. Integración en el Pipeline CI (`ci.yml`) y Ejecución Dinámica
Se agregó el job `api-tests` en `.github/workflows/ci.yml` de forma aislada y no invasiva:
- Levanta el stack completo con Docker Compose (`docker compose up -d --build`).
- Espera activa con sondeo sobre el endpoint público `/api/v1/auth/csrf` hasta recibir código HTTP 200.
- Ejecución desacoplada mediante `tests/api/ejecutar-newman.js`, el cual sincroniza automáticamente la variable de entorno `BASE_URL` con la variable de colección `base_url`.
- Publicación del reporte JUnit como artefacto de CI.

**Evidencia de ejecución real:**
```
Total Requests: 65 | Total Assertions: 182 | Failed: 0
Execution Time: 6.4s
Ruta de reporte: tests/api/reportes/junit-report.xml
```

---

## 4. Pruebas E2E de Aceptación (Playwright Test)

Se estructuró la suite BDD en `tests/e2e/specs/` con pasos explícitos `Dado / Cuando / Entonces` estructurados con `test.step`, sincronizada al 100 % con la matriz oficial de Historias de Usuario de la Fase I.

### 4.1. Cobertura Integral de las 24 Historias de Usuario Oficiales
1. **Épica 1: Identidad y Acceso**
   - `@HU01`: Registro público con asignación de rol Solicitante.
   - `@HU02`: Inicio de sesión exitoso y rechazo de credenciales incorrectas. Verificación mediante `page.evaluate()` de que `document.cookie` no tiene acceso a `MSU_SESION` (flag `HttpOnly` estricto).
   - `@HU03`: Consulta de perfil y cambio de contraseña con validación de complejidad.
2. **Épica 2: Solicitudes de Servicio**
   - `@HU04`: Registro de solicitud con cálculo dinámico de impacto/urgencia/SLA y generación de código correlativo `MSU-YYYY-XXXX`.
   - `@HU05`: Consulta de mis solicitudes con persistencia de filtros en LocalStorage.
   - `@HU06`: Hilo inmutable de comentarios de seguimiento entre solicitante y técnico.
   - `@HU14`: **Cálculo y congelamiento de plazos de primera atención y resolución**; verifica en el panel «Fechas y plazos» del detalle que se muestren las horas de atención y resolución congeladas según la versión de política aplicada.
   - `@HU24`: **Reglas comunes de autorización por propiedad y concurrencia optimista**; comprueba en BDD 1 que un solicitante no pueda acceder al detalle de una solicitud ajena (403 `ACCESO_DENEGADO`), y en BDD 2 que una evaluación concurrente sobre una solicitud modificada muestre la alerta de conflicto de versión (409 `CONFLICTO_VERSION`).
3. **Épica 3: Supervisión y Atención Técnica**
   - `@HU07`: Repriorización con justificación obligatoria (mínimo 10 caracteres).
   - `@HU08`: Asignación a técnico con balance de carga de trabajo visible.
   - `@HU09`: Cancelación motivada de solicitud con diálogo modal de confirmación (`role="dialog"` / `.dialogo`) y motivo obligatorio.
   - `@HU10`: Inicio formal de atención técnica; prepara caso específico con técnico y categoría correspondientes, paginando en bandeja hasta ubicar el código correlativo exacto.
   - `@HU11`: Registro de solución técnica detallada (validador de 20 a 2,000 caracteres); prepara caso en estado En atención y pagina en bandeja hasta ubicar el código exacto.
4. **Épica 4: Conformidad y Cierre**
   - `@HU12`: **Conformidad y reapertura de solicitudes**; cubre BDD 1 (aceptación de la solución técnica y transición a estado `CERRADA`) y BDD 2 (reapertura por persistencia de falla con motivo obligatorio $\ge 10$ caracteres, transicionando a `EN_EVALUACION`).
   - `@HU13`: Encuesta de satisfacción con calificación por estrellas (1 a 5) y bloqueo de duplicados.
5. **Épica 5: Monitoreo, Alertas y Reportes**
   - `@HU15`: Detección visual trazable de alertas de plazos (solicitudes vencidas y en umbral del 80% SLA); identifica caso concreto (`MSU-2026-0006`) con alerta activa y comprueba su visualización en supervisión, centro de notificaciones y vista de detalle.
   - `@HU16`: Centro de notificaciones con preparación de avisos no leídos; comprueba marcado individual, desaparición del indicador 'No leído', y posterior marcado masivo con inhabilitación del botón.
   - `@HU17`: Dashboard gerencial con tarjetas de conteo y tiempos medios de atención.
   - `@HU18`: Distribución de solicitudes por categoría de servicio.
   - `@HU19`: Descarga e inspección real del archivo CSV (`solicitudes-YYYY-MM-DD.csv`), validando cabeceras, delimitador `;` y filas de datos mediante stream interceptado con `waitForEvent('download')`.
6. **Épica 6: Administración del Sistema**
   - `@HU20`: **Administración de usuarios internos**; creación de nuevos usuarios y comprobación de la regla de bloqueo (diálogo modal de advertencia y botón de desactivación inhabilitado ante técnico con solicitudes asignadas pendientes).
   - `@HU21`: **Mantenimiento de catálogos y categorías**; borrado lógico (desactivación) de categoría editable confirmada en diálogo modal, reactivación idempotente para dejar la base limpia, y verificación de inmutabilidad de catálogos fijos (estados y prioridades).
   - `@HU22`: Versionado y consulta de políticas de plazos; crea una nueva versión modificando los plazos de resolución (+24h en prioridad Baja), confirma en diálogo modal y valida que la nueva versión quede publicada y rotulada como vigente.
   - `@HU23`: Historial operativo en detalle y auditoría administrativa sin secretos (RNF01: verificación de que no se expongan contraseñas, hashes bcrypt ni tokens de sesión en la traza).

### 4.2. Erradicación de Falsos Positivos y Determinismo
Se eliminaron todos los bloques condicionales permisivos (`if (await locator.isVisible())`). Cada prueba utiliza `tests/e2e/helpers/datos.js` para crear y colocar tickets en el estado exacto requerido (`REGISTRADA`, `ASIGNADA`, `EN_ATENCION`, `RESUELTA`) mediante API antes de iniciar las interacciones del navegador. Asimismo, `login()` limpia de forma explícita las cookies del contexto antes de cada sesión para evitar redirecciones prematuras.

### 4.3. Validación de Diseño Responsivo (RNF05)
Cada uno de los 24 escenarios fue ejecutado en dos proyectos configurados:
- `desktop-1366`: Viewport de 1366×768 px.
- `mobile-360`: Viewport de 360×780 px.
En cada vista móvil se verificó la aserción de no desborde:
$$\text{scrollWidth} \le \text{innerWidth}$$

**Evidencia de ejecución real (Reporte XML publicado en repositorio):**
```
Running 48 tests using 1 worker
  24 passed in desktop-1366
  24 passed in mobile-360
Total: 48 passed (39.0s)
Ruta de reporte: tests/e2e/reportes/junit-e2e.xml
```

---

## 5. Pruebas de Rendimiento y Capacidad (k6)

### 5.1. Estrategia de Siembra de Datos (2,000 Casos)
Se sembraron **2,000 solicitudes históricas** en MySQL mediante inserción SQL por lotes (`tests/load/siembra/siembra-2000-casos.sql`):
- Distribución de estados: 46.6 % Cerradas, 16.0 % Resueltas, 14.0 % En atención, 9.9 % Asignadas, 9.0 % Registradas, 4.5 % En evaluación.
- Prioridades: 45 % Media, 30 % Alta, 15 % Baja, 10 % Crítica.
- Prefijo identificador `[CARGA]` para garantizar idempotencia y limpieza controlada mediante `limpiar-carga.sql`.

### 5.2. Escenario de Carga Sostenida (RNF06)
- **Carga:** 20 usuarios virtuales (VU) sostenidos durante 60 segundos.
- **Mix transaccional:** 80 % Consultas (`tipo=lectura`) / 20 % Escrituras (`tipo=escritura`).
- **Autenticación:** Login único por sesión en fase `setup()`.

**Métricas Reales Obtenidas (Fuente: `tests/load/resultados/resumen-carga.json`):**
- **Peticiones HTTP totales:** 1,603 solicitudes completadas.
- **Tasa de error (`http_req_failed`):** **0.00 %** (0 errores en 1,603 peticiones).
- **Latencia de Consultas (Lecturas):**
  - **p95 = 362.62 ms** (Umbral RNF06 < 1,000 ms: **CUMPLIDO**).
  - Promedio: 88.32 ms | Mediana: 50.68 ms | Máximo: 785.29 ms.
- **Latencia de Escrituras:**
  - **p95 = 274.94 ms** (Umbral RNF06 < 2,000 ms: **CUMPLIDO**).
  - Promedio: 57.40 ms | Mediana: 16.40 ms | Máximo: 741.52 ms.

### 5.3. Escenario de Estrés Escalonado y Evaluación de Límite Operativo
- **Perfil de carga:** Rampa escalonada: 20 VU (10s) → 50 VU (15s) → 100 VU (15s) → 200 VU (20s) → 400 VU (25s) → Cooldown 20 VU (15s). Duración total: 110 segundos.
- **Peticiones HTTP totales:** 12,685 solicitudes completadas (~114.8 req/s).
- **Tasa de error (`http_req_failed`):** **0.00 %** (Cero fallos HTTP; no hubo colapso de procesos ni caídas 500/503).
- **Métricas de Latencia (`http_req_duration`):**
  - Mínimo: 1.28 ms | Mediana: 730.61 ms | Promedio: 1,153.22 ms.
  - p90: 2,913.91 ms (2.91 s).
  - **p95: 3,503.25 ms (3.50 s)** (Supera ampliamente el SLA de RNF06 < 1.0 s).
  - **Pico máximo individual: 8,418.30 ms (8.42 s)**.

#### Definición del Punto de Quiebre Operativo
El criterio de quiebre operativo no requiere una caída catastrófica del servidor (la tasa de fallos HTTP se mantuvo estrictamente en 0.00 %, lo que evidencia la robustez de los procesos Java/Tomcat y la estabilidad de memoria de la JVM), sino que se define técnicamente como el **incumplimiento severo y sostenido del acuerdo de nivel de servicio (RNF06: p95 < 1,000 ms)**. Este quiebre comienza a manifestarse a partir de los 150-200 VU concurrentes y alcanza su punto crítico en la etapa de 400 VU, donde el percentil 95 global asciende a 3,503 ms (3.50 s, más de 3.5 veces el SLA admisible) y se registran tiempos de respuesta individuales máximos de hasta 8,418 ms (8.42 s).

#### Hipótesis Técnica de Cuello de Botella y Comportamiento de Recuperación
1. **Hipótesis Técnica Fundamentada de Arquitectura (HikariCP):** Spring Boot 3.5 configura por defecto el pool HikariCP con `maximum-pool-size: 10`, en contraste con el servidor web embebido de Tomcat que atiende hasta `server.tomcat.threads.max: 200` hilos (o 64 en el perfil prod de David). La ausencia total de errores HTTP combinada con el crecimiento lineal y pronunciado de la latencia apunta a que la mayoría de hilos concurrentes quedan bloqueados esperando conexiones en `HikariPool.getConnection()`.
2. **Limitación de la Medición de Cliente (k6):** Dado que los resúmenes agregados de k6 capturan exclusivamente la perspectiva externa del cliente HTTP (tiempos de viaje y códigos de respuesta) y no disponen de telemetría interna del sistema operativo ni de la JVM (uso de CPU, IOPS en MySQL o monitoreo activo de hilos del pool), esta explicación se formula formalmente como una **hipótesis técnica de arquitectura pendiente de validación empírica**. Dicha comprobación se podrá confirmar cuando Gabriel (Paquete D, PR #6) integre Spring Boot Actuator y exporte métricas de Micrometer (`hikaricp.connections.pending`, `jvm.threads.live`).
3. **Comportamiento durante la Fase de Enfriamiento:** En la etapa 6 (cooldown a 20 VU), se observó una estabilización **progresiva** a medida que la cola de peticiones encoladas en el pool se evacuó gradualmente, retornando a la latencia de línea base sin requerir reinicio de contenedores ni registrar fugas de memoria.

### 5.4. Sanitización de Resultados (RNF01)
Ambos scripts de k6 (`carga.js` y `estres.js`) implementan la función nativa `handleSummary(data)` que elimina el nodo `setup_data` (`delete data.setup_data;`). Esto garantiza de forma permanente que los archivos `resumen-carga.json` y `resumen-estres.json` contengan únicamente métricas cuantitativas sin filtrar credenciales, tokens JWT ni cookies de sesión.

### 5.5. Verificación y Evidencias sobre el Despliegue en la Nube (David - B1)
Conforme a la integración con el Paquete B gestionado por David, se ejecutaron comprobaciones reales de conectividad, seguridad perimetral y rendimiento de red sobre la infraestructura desplegada en Oracle Cloud Infrastructure (OCI, región `sa-bogota-1`):

- **Punto de Enlace Público:** `https://msu-157-137-206-147.sslip.io` (servidor Caddy como proxy inverso y terminador TLS).
- **Seguridad en Tránsito:** Certificado SSL/TLS válido emitido automáticamente, cabecera `Strict-Transport-Security: max-age=31536000` (HSTS estricto), CSP cerrado y cookies marcadas con `Secure; HttpOnly; SameSite=Lax`.
- **Rendimiento de Red y TTFB Transfronterizo:**
  - Medición experimental de 30 peticiones consecutivas sobre `/api/v1/auth/csrf`: **0.00 % de errores**, latencia mínima de 102 ms, **promedio de 111.0 ms** y **p95 de 104 ms** (con pico inicial de handshake TLS de 344 ms).
  - Consulta de especificación completa de OpenAPI (`/api/v1/openapi`, ~120 KB JSON): **0.00 % de errores**, latencia promedio de 179.3 ms y transferencia íntegra de esquema.
- **Evidencias de Diseño Responsivo Desplegado:** David ejecutó el script `responsive-despliegue.mjs` contra la URL pública de producción, generando 32 capturas de pantalla a 360 px y 1366 px en los cuatro roles institucionales (Solicitante, Supervisor, Técnico, Administrador), archivadas en `docs/evidencias/fase-iii-iv-david/responsive/`, registrando **0 desbordes horizontales** y **0 errores 5xx** (`docs/evidencias/fase-iii-iv-david/responsive/resultado.json`).

---

## 6. Pruebas de Seguridad (SAST y DAST)

Conforme a las directivas del **Paquete C (Seguridad)** desarrollado por Marcelo en la rama `feat/marcelo-seguridad`, se integran los resultados obtenidos mediante el análisis estático y dinámico de la solución:

### 6.1. Análisis Estático de Seguridad de Código (SAST)

1. **GitHub CodeQL (SAST de Código Fuente):**
   - **Herramienta y Versión:** GitHub CodeQL Action v2.27.4 con la suite de reglas `security-extended`.
   - **Reglas Evaluadas:** 120 reglas para el backend (Java 17 / Spring Boot) y 103 reglas para el frontend (JavaScript / React).
   - **Resultados:** **0 alertas de seguridad detectadas** (0 critical, 0 high, 0 medium, 0 low). El código fuente no presenta vulnerabilidades de inyección SQL (uso estricto de Spring Data JPA / consultas preparadas), Cross-Site Scripting (XSS) en plantillas React, ni deserializaciones inseguras.

2. **Auditoría de Dependencias Frontend (`npm audit`):**
   - **Herramienta:** `npm audit --audit-level=high` sobre el árbol de dependencias de `frontend/`.
   - **Resultados:** **0 vulnerabilidades reportadas** en dependencias de producción.

3. **OWASP Dependency-Check (SCA de Dependencias Backend):**
   - **Herramienta y Versión:** OWASP Dependency-Check Maven Plugin v13.0.0 contra la base NVD / CVSS 3.1.
   - **Hallazgos:** Se identificaron **23 CVE distintos**, de los cuales **15 son de severidad ALTA (CVSS $\ge 7.0$)**, abiertos en las dependencias transitivas heredadas de Spring Boot 3.5.13:
     - *Spring Framework 6.2.19:* 17 CVEs asociados a denegación de servicio por cabeceras HTTP anómalas y serialización.
     - *Spring Security 6.5.11:* 5 CVEs relacionados con ataques de temporización en validadores CSRF y redirección en filtros.
     - *Spring Data JPA 3.5.13:* 1 CVE sobre resolución de métodos dinámicos.
   - **Tratamiento y Política:** Siguiendo un criterio de auditoría riguroso y transparente, Marcelo **no introdujo supresiones arbitrarias en `dependency-check-suppressions.xml` ni excepciones no justificadas**. Los 15 CVEs de severidad alta quedan registrados formalmente como deuda técnica de librerías base, con recomendación prioritaria de actualización a Spring Boot 3.5.14 / Spring Framework 6.2.20 en el ciclo de mantenimiento posterior.

### 6.2. Análisis Dinámico de Seguridad (DAST)

- **Estado de Ejecución:** A la fecha de cierre de este informe, el análisis dinámico activo mediante OWASP ZAP **aún no se ejecuta**.
- **Artefactos Preparados:** Marcelo dejó configurada la plantilla estructurada de hallazgos en `docs/seguridad/plantilla-dast.md` y el flujo automatizado `.github/workflows/dast.yml` basado en la imagen oficial `zaproxy/zap-stable`.
- **Delimitación Técnica y Justificación:** La ejecución de pruebas dinámicas intrusivas (ataques de inyección, fuzzing y escaneo activo) contra la dirección IP pública en Oracle Cloud Infrastructure (`https://msu-157-137-206-147.sslip.io`) requiere una autorización formal previa por parte del administrador de la infraestructura y una delimitación estricta de alcance (Rules of Engagement) para evitar bloqueos del proveedor cloud o la alteración de datos durante las pruebas de usuario. Su ejecución queda calendarizada como actividad post-integración.
- **Cabeceras de Seguridad Verificadas (Caddy + Spring Security):**
  - `Strict-Transport-Security: max-age=31536000; includeSubDomains`
  - `Content-Security-Policy: default-src 'none'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self'; connect-src 'self'; ...`
  - `X-Content-Type-Options: nosniff`
  - `X-Frame-Options: DENY`
  - `Referrer-Policy: no-referrer`
  - `Permissions-Policy: camera=(), microphone=(), geolocation=()`

---

## 7. Pruebas de Usabilidad con Usuarios Finales (SUS)

Conforme al **Paquete B (Usabilidad)** desarrollado por David:

### 7.1. Ficha Metodológica y Protocolo Preparado
- **Instrumento:** System Usability Scale (SUS) de Brooke (1996), compuesto por 10 afirmaciones psicométricas con respuestas en escala Likert del 1 («Totalmente en desacuerdo») al 5 («Totalmente de acuerdo»).
- **Protocolo Formal:** Documentado por David en `docs/pruebas/usuarios/Protocolo_SUS.md`, incluyendo consentimiento informado, perfil de participantes y 4 tareas representativas:
  1. *Tarea 1:* Registro de cuenta y consulta de perfil (`HU01`, `HU03`).
  2. *Tarea 2:* Registro de solicitud con selección de urgencia/impacto y verificación de plazos calculados (`HU04`, `HU14`).
  3. *Tarea 3:* Seguimiento, interacción en comentarios y confirmación de solución técnica (`HU05`, `HU06`, `HU12`).
  4. *Tarea 4:* Calificación de atención mediante encuesta de 1 a 5 estrellas (`HU13`).
- **Cálculo Automatizado:** Implementado en `docs/pruebas/usuarios/calcular-sus.py`, aplicando la fórmula estandarizada:
  $$\text{SUS} = 2.5 \times \left[ \sum (\text{Ítems Impares} - 1) + \sum (5 - \text{Ítems Pares}) \right]$$

### 7.2. Estado de Recolección de Datos
- **Muestra Planificada:** 5 participantes reales (2 estudiantes, 2 docentes y 1 personal administrativo).
- **Estado Actual:** El archivo `docs/pruebas/usuarios/respuestas-sus.csv` que se encuentra en la rama `main` contiene únicamente la línea de cabeceras (`usuario,q1,q2,q3,q4,q5,q6,q7,q8,q9,q10,tiempo_segundos,observaciones`).
- **Resultado:** Las 5 sesiones presenciales con usuarios finales se encuentran **planificadas y pendientes de ejecución** por parte de David. Una vez aplicadas las pruebas, se ejecutará el script de cálculo para determinar si se alcanza la meta de usabilidad proyectada ($\text{SUS} \ge 70.0$, adjetivación «Aceptable / Bueno» según el marco de Bangor).

---

## 8. Bitácora de Defectos y Desviaciones Encontradas

| ID Defecto | Componente | Descripción del Problema | Causa Raíz | Solución Aplicada / Mitigación | Estado |
| :---: | :---: | :--- | :--- | :--- | :---: |
| **DEF-01** | API / Seguridad | Peticiones POST en pruebas de API retornaban 403 Forbidden | Spring Security rota el token CSRF tras el login | Captura dinámica de `Set-Cookie: XSRF-TOKEN` y sincronización en header `X-XSRF-TOKEN` | **Cerrado** |
| **DEF-02** | Playwright E2E | Falla por selector ambiguo en Mis Solicitudes (`HU05`) | Enlace `/solicitudes/nueva` coincidía con selector genérico en móvil | Se acotó el selector a `.tabla a[href^="/solicitudes/"]` | **Cerrado** |
| **DEF-03** | Playwright E2E | Bloqueo en evaluación de caso ya priorizado (`HU07`) | En ejecuciones consecutivas el caso ya no estaba en `REGISTRADA` | Se agregó filtro previo por estado `REGISTRADA` | **Cerrado** |
| **DEF-04** | Rendimiento k6 | Consultas por ID arrojaban 404 bajo carga | Generación de IDs fuera del rango real de MySQL | Descubrimiento dinámico de IDs en la fase `setup()` | **Cerrado** |
| **DEF-05** | Backend (Diseño) | Cuello de botella a 400 VU concurrentes (latencia 8.41s) | Hipótesis técnica de contención en pool HikariCP (10 conexiones) | Configurar `spring.datasource.hikari.maximum-pool-size=30` en despliegue de David | **Recomendación para CD** |
| **DEF-06** | Playwright E2E | Falsos positivos por condicionales `if (await isVisible())` | Antipatrón en pruebas de IA que omitía acciones cuando el botón no aparecía | Erradicación total de condicionales y creación determinista de fixtures vía API (`datos.js`) | **Cerrado** |
| **DEF-07** | Rendimiento k6 | Tokens de sesión expuestos en resúmenes JSON | Exportador nativo de k6 incluía `setup_data` | Implementación de `handleSummary(data)` eliminando `setup_data` de los reportes | **Cerrado** |
| **DEF-08** | Playwright E2E | Prueba de exportación CSV superficial (`HU19`) | Solo se verificaba la presencia del botón sin descargar el archivo | Intercepción de evento `download`, lectura de stream y validación de columnas y delimitador `;` | **Cerrado** |
| **DEF-09** | Newman / RBAC | Falsa autorización en prueba de acceso ajeno (`HU24`) | Pre-request de usuario ajeno actualizaba el cookie jar global de Newman | Re-autenticación inmediata del usuario original en pre-request para restaurar cookie jar | **Cerrado** |
| **DEF-10** | Playwright E2E | Timeout de login al alternar roles de usuario | Sesión previa en almacenamiento impedía mostrar formulario `/login` | Incorporación de `context.clearCookies()` al inicio de cada login | **Cerrado** |

---

## 9. Conclusiones y Recomendaciones

1. **Aptitud para el Despliegue (Release Candidate):** La aplicación cumple holgadamente con los requerimientos funcionales evaluados y los requisitos no funcionales RNF05 (diseño responsivo 360 px sin desborde horizontal) y RNF06 (latencias p95 de 362.62 ms en lecturas y 274.94 ms en escrituras bajo 20 VU concurrentes).
2. **Resiliencia Operativa del Backend:** El stack Spring Boot demostró capacidad de absorción de hasta **115 peticiones por segundo** y 400 usuarios concurrentes sin colapso de procesos ni errores de servidor (0.00 % `http_req_failed`).
3. **Recomendaciones para el Despliegue en la Nube (David - B1):**
   - Configurar en `application-prod.yml` un pool HikariCP ampliado (`maximum-pool-size: 25-30`) y coordinar con el dimensionamiento de hilos de Tomcat (`max-threads: 64-128`) para mitigar el encolamiento de conexiones bajo alta concurrencia.
   - Ejecutar la suite automatizada de Newman apuntando a `BASE_URL=https://msu-157-137-206-147.sslip.io` tras cada actualización de imágenes en GHCR.
4. **Recomendaciones para Seguridad y Calidad Continua:**
   - Planificar la actualización de Spring Boot a la versión 3.5.14 para remediar los 15 CVEs de severidad alta identificados en OWASP Dependency-Check.
   - Completar las 5 sesiones presenciales del protocolo SUS y formalizar la ventana de ejecución para el escaneo dinámico DAST con OWASP ZAP.
