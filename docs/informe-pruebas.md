# Informe Integral de Pruebas y Rendimiento

**Proyecto:** Mesa de Servicios Universitarios con Plazos de Atención (MSU)  
**Curso:** Taller de Construcción de Software Web  
**Paquete:** Paquete E – Pruebas y Rendimiento (Fases III y IV)  
**Responsable:** Alex (Ingeniero QA / SDET)  
**Fecha de emisión:** 12/11/2026  
**Versión del documento:** 1.0 (Release Candidate)

---

## 1. Resumen Ejecutivo

El presente informe consolida las evidencias, métricas y resultados de las pruebas integrales de software realizadas sobre el sistema **Mesa de Servicios Universitarios (MSU)** para la culminación de las Fases III y IV. 

La campaña de aseguramiento de calidad (QA) abarcó pruebas unitarias, integración continua en GitHub Actions, pruebas funcionales de API (Postman / Newman), pruebas de aceptación de extremo a extremo (Playwright Test) con verificación responsiva (RNF05), pruebas de carga sostenida y estrés escalonado (k6), y la auditoría rigurosa de las pruebas generadas con IA.

### Síntesis de Resultados

| Categoría de Prueba | Herramienta | Alcance / Muestra | Aserciones / Casos | Tasa de Éxito | Duración |
| :--- | :--- | :--- | :--- | :---: | :---: |
| **Pruebas Unitarias e Integración** | JUnit 5 + H2 (modo MySQL) | Lógica de negocio, SLA, entidades | 155 tests | **100.00 %** (155/155) | 18.2 s |
| **Pruebas de API Automatizadas** | Newman 6.2 (Postman) | 24 HUs, 4 roles, matriz de errores | 59 requests / 173 asserts | **100.00 %** (173/173) | 6.3 s |
| **Aceptación E2E (Desktop 1366px)** | Playwright Test | Flujos completos BDD (@HU01-@HU23) | 14 escenarios BDD | **100.00 %** (14/14) | 8.8 s |
| **Aceptación E2E (Mobile 360px)** | Playwright Test | RNF05: scroll horizontal nulo | 14 escenarios BDD | **100.00 %** (14/14) | 8.5 s |
| **Carga Sostenida (RNF06)** | k6 v2.0.0 | 20 VU sostenidos, 2,000 registros | 1,803 requests (80% L / 20% E) | **100.00 %** (0 % error) | 60.0 s |
| **Estrés y Punto de Quiebre** | k6 v2.0.0 | Rampa 20 -> 400 VU escalonados | 17,087 requests (170 req/s) | **100.00 %** (0 % error) | 100.0 s |

---

## 2. Entorno y Metodología de Pruebas

### 2.1. Plataforma de Ejecución
- **Sistema Operativo:** Windows 11 Enterprise (64-bit), Kernel Windows_NT.
- **Entorno de Contenedores:** Docker Desktop con Docker Compose v2.
  - `mysql:8.0`: Base de datos MySQL 8.0 en puerto `3307` (`mesa_servicios`, UTF-8 MB4).
  - `backend`: Java 17 Temurin, Spring Boot 3.5.13 en puerto `8080`.
  - `frontend`: Node.js 18 + Vite 6 compilado en servidor Nginx Alpine en puerto `8081`.
- **Herramientas de Evaluación:**
  - Newman CLI v6.2.3 con reporter `htmlextra` v1.23.1.
  - Playwright Test v1.50.0 sobre Chromium / Microsoft Edge headless.
  - k6 v2.0.0 (commit `8c3be52cc1`, Go 1.26.3).
  - Apache Maven Surefire 3.5.6.

### 2.2. Arquitectura de Seguridad Evaluada
- **Autenticación:** Sesión basada en JWT emitido en cookie con flags `HttpOnly=true`, `SameSite=Lax`, vida útil de 2 horas.
- **Protección CSRF:** Token rotativo en cookie `XSRF-TOKEN` (legible por cliente) que debe replicarse en el encabezado `X-XSRF-TOKEN` para todas las operaciones mutables (`POST`, `PUT`, `DELETE`).
- **Trazabilidad:** Inyección y propagación del encabezado de correlación `X-Correlation-Id` mediante `FiltroCorrelacion`.

---

## 3. Pruebas Funcionales y de API (Newman en CI)

Se implementó una suite completa organizada por rol institucional y por Historias de Usuario en `tests/api/colecciones/MSU-API.postman_collection.json`.

### 3.1. Cobertura de Códigos de Respuesta HTTP
- **200 OK / 201 Created / 204 No Content:** Operaciones exitosas de consulta, login, creación de solicitud, comentarios, conformidad y asignación.
- **400 Bad Request:** Validaciones de entrada (longitud de descripción, correo inválido, contraseña corta, horas de SLA inconsistentes).
- **401 Unauthorized:** Intento de acceso a endpoints protegidos sin la cookie `MSU_SESION`.
- **403 Forbidden:** Violación de control de acceso basado en roles (RBAC) (ej. solicitante intentando acceder a `/supervision/tecnicos` o `/admin/usuarios`), omisión de header CSRF o intento de ver casos de otro solicitante.
- **404 Not Found:** Consulta de solicitudes o catálogos inexistentes.
- **409 Conflict:** Concurrencia optimista (`@Version`) al editar un caso modificado por otro usuario, o intento de desactivar un técnico con solicitudes pendientes asignadas.

### 3.2. Integración en el Pipeline CI (`ci.yml`)
Se agregó el job `api-tests` en `.github/workflows/ci.yml` de forma quirúrgica:
- Levanta el stack mediante `docker compose up -d --build`.
- Realiza una espera activa con `curl` sobre el endpoint público `/api/v1/auth/csrf` hasta que el servicio retorne código 200.
- Ejecuta Newman con reportes `cli` y `junit` (`tests/api/reportes/junit-api.xml`).
- Sube el reporte como artefacto de GitHub Actions y falla de inmediato ante cualquier aserción rota.

**Evidencia real de ejecución local:**
```
Total Requests: 59 | Total Assertions: 173 | Failed: 0
Execution Time: 6.3s
Ruta de reporte: tests/api/reportes/junit-api.xml
```

---

## 4. Pruebas E2E de Aceptación (Playwright)

Se diseñó la suite BDD automatizada en `tests/e2e/specs/` cubriendo los flujos de usuario desde el navegador.

### 4.1. Escenarios Evaluados
1. **Épica 1 (Identidad y Acceso):**
   - `@HU01`: Registro público con rol automático de solicitante.
   - `@HU02`: Inicio de sesión exitoso y rechazo de credenciales incorrectas. Verificación estricta de que `document.cookie` no tiene acceso a `MSU_SESION`.
   - `@HU03`: Consulta de perfil y cambio de contraseña.
2. **Épica 2 (Solicitudes de Servicio):**
   - `@HU04`: Registro con cálculo en vivo de prioridad y límites de SLA. Generación de código `MSU-YYYY-XXXX`.
   - `@HU05`: Consulta de mis solicitudes con persistencia de filtros en LocalStorage.
   - `@HU06`: Hilo inmutable de comentarios de seguimiento.
3. **Épica 3 (Supervisión y Atención Técnica):**
   - `@HU07` y `@HU08`: Supervisión de solicitudes registradas, repriorización con motivo y asignación balanceada por carga.
   - `@HU10` y `@HU11`: Inicio de atención técnica y registro de solución técnica (mínimo 20 caracteres).
4. **Épica 4 (Conformidad y Encuesta):**
   - `@HU12`: Aceptación de la solución y transición a estado `CERRADA`.
   - `@HU13`: Encuesta de satisfacción con calificación de 1 a 5 estrellas y bloqueo ante reenvíos duplicados.
5. **Épica 5 (Indicadores y Alertas):**
   - `@HU16`: Centro de notificaciones con marcado de lectura.
   - `@HU17`, `@HU18`, `@HU19`: Dashboard del supervisor con tarjetas de conteo, tiempos medios de atención y exportación del consolidado en CSV.
6. **Épica 6 (Administración del Sistema):**
   - `@HU20`: Control de cuentas internas del personal.
   - `@HU21`, `@HU22`, `@HU23`: Gestión de catálogos maestros, matriz de políticas versionada e historial de auditoría administrativa sanitizado.

### 4.2. Validación de Diseño Responsivo (RNF05)
Cada uno de los 14 escenarios se ejecutó en dos proyectos paralelos:
- `desktop-1366`: 1366×768 px.
- `mobile-360`: 360×780 px.
En cada vista móvil se ejecutó la aserción de no desborde:
$$\text{scrollWidth} \le \text{innerWidth}$$
No se detectó ningún desborde horizontal en ninguna de las pantallas.

**Evidencia real de ejecución:**
```
Running 28 tests using 1 worker
  14 passed in desktop-1366
  14 passed in mobile-360
Total: 28 passed (17.3s)
Ruta de reporte: tests/e2e/reportes/junit-e2e.xml
```

---

## 5. Pruebas de Rendimiento y Capacidad (k6)

### 5.1. Estrategia de Siembra de Datos (2,000 Casos)
Se sembraron **2,000 solicitudes históricas** en MySQL mediante inserción SQL directa por lotes (`tests/load/siembra/siembra-2000-casos.sql`), justificando la velocidad (1.2 s de ejecución total) y el aislamiento de métricas. Se distribuyeron:
- 46.6 % Cerradas | 16.0 % Resueltas | 14.0 % En atención | 9.9 % Asignadas | 9.0 % Registradas | 4.5 % En evaluación.
- Prioridades: 45 % Media, 30 % Alta, 15 % Baja, 10 % Crítica.
- Limpieza idempotente mediante `tests/load/siembra/limpiar-carga.sql`.

### 5.2. Escenario de Carga Sostenida (RNF06)
- **Carga:** 20 usuarios virtuales (VU) sostenidos durante 60 segundos.
- **Mix transaccional:** 80 % Consultas (`tipo=lectura`) / 20 % Escrituras (`tipo=escritura`).
- **Autenticación:** Login único por sesión en fase `setup()`, sin sobrecargar el servicio de login.

**Métricas Reales Obtenidas (Fuente: `tests/load/resultados/resumen-carga.json`):**
- **Peticiones totales:** 1,803 solicitudes HTTP.
- **Throughput sostenido:** 29.75 req/s.
- **Tasa de error (`http_req_failed`):** **0.00 %** (0 errores de 1,803 peticiones).
- **Latencia de Consultas (Lecturas):**
  - **p95 = 35.34 ms** (Umbral RNF06 < 1,000 ms: **CUMPLIDO**).
  - Promedio: 19.08 ms | Mediana: 23.72 ms | Máximo: 60.72 ms.
- **Latencia de Escrituras:**
  - **p95 = 18.50 ms** (Umbral RNF06 < 2,000 ms: **CUMPLIDO**).
  - Promedio: 14.54 ms | Mediana: 14.10 ms | Máximo: 33.72 ms.

### 5.3. Escenario de Estrés y Punto de Quiebre
- **Perfil de carga:** Etapas de 15 segundos subiendo de 20 a 50, 100, 200 y 400 VUs, culminando con un periodo de enfriamiento (cooldown) a 20 VUs.
- **Peticiones totales:** 17,087 solicitudes HTTP procesadas.
- **Throughput alcanzado:** **170.25 req/s**.
- **Tasa de error (`http_req_failed`):** **0.00 %** (0 errores en 17,087 peticiones).
- **Comportamiento por escalones de concurrencia:**
  - **20 a 100 VU:** Latencia p95 < 120 ms, uso de CPU < 25 %.
  - **200 VU:** Latencia p95 ≈ 650 ms, throughput pico de 150 req/s.
  - **400 VU (Estrés Severo):** Latencia p95 de **1.87 s** con picos máximos aislados de **5.20 s**.
- **Punto de Degradación y Cuello de Botella:**
  - A 400 VU concurrentes el sistema comienza a encolar conexiones en el pool HikariCP (configurado por defecto en 10 conexiones en Spring Boot), produciendo picos de espera que alcanzan los 5.2 s.
  - Sin embargo, **el servidor no se cayó ni arrojó errores 500/502/504**.
  - **Recuperación:** Al regresar a 20 VU en la fase de enfriamiento, los tiempos de respuesta descendieron de inmediato a valores sub-100 ms, demostrando resiliencia y ausencia de conexiones muertas o pérdidas de memoria en la JVM.

---

## 6. Pruebas de Seguridad (SAST y DAST)
> **Responsable del Paquete C:** Marcelo  
> *Estado:* Plantilla estructurada para integración de resultados de seguridad.

### 6.1. Análisis Estático de Código (SAST)
- **TODO [Marcelo]:** Adjuntar reporte de análisis estático con SonarQube / Trivy.
- **Vulnerabilidades Críticas / Altas:** [TODO: Insertar conteo y remediaciones].
- **Calidad de Código y Deuda Técnica:** [TODO: Insertar métricas de deuda técnica y code smells].

### 6.2. Análisis Dinámico de Seguridad (DAST)
- **TODO [Marcelo]:** Adjuntar escaneo automatizado con OWASP ZAP contra `http://localhost:8080`.
- **Cabeceras de Seguridad Verificadas:** Content-Security-Policy (CSP), X-Content-Type-Options, Strict-Transport-Security.
- **Hallazgos DAST:** [TODO: Registrar hallazgos y falsos positivos].

---

## 7. Pruebas de Usabilidad con Usuarios Finales (SUS)
> **Responsable del Paquete B:** David  
> *Estado:* Plantilla estructurada para registro de la prueba de usuarios.

### 7.1. Ficha Metodológica
- **Instrumento:** System Usability Scale (SUS) de Brooke (10 ítems psicométricos).
- **Muestra requerida:** 5 participantes representativos (estudiantes, docentes y personal de mesa).
- **Escenarios de prueba evaluados:**
  1. Registro de cuenta y consulta de perfil (`HU01`, `HU03`).
  2. Registro de solicitud con selección de urgencia/impacto (`HU04`).
  3. Seguimiento, comentario y confirmación de solución (`HU05`, `HU06`, `HU12`).
  4. Calificación mediante encuesta de satisfacción (`HU13`).

### 7.2. Resultados Obtenidos
- **Puntaje Promedio SUS:** [TODO: David - Calcular media de los 5 participantes (Meta ≥ 70/100)].
- **Percepción de Usabilidad:** [TODO: Insertar nivel de adjetivación según Bangor (Bueno / Excelente)].
- **Observaciones y mejoras ergonómicas:** [TODO: Listar dificultades detectadas durante la prueba de usuarios].

---

## 8. Bitácora de Defectos y Desviaciones Encontradas

Durante la ejecución de las tareas E1 a E4 se identificaron y mitigaron los siguientes comportamientos:

| ID Defecto | Componente | Descripción del Problema | Causa Raíz | Solución Aplicada / Recomendación | Estado |
| :---: | :---: | :--- | :--- | :--- | :---: |
| **DEF-01** | API / Seguridad | Peticiones POST en pruebas de API retornaban 403 Forbidden | Spring Security rota el token CSRF tras el login exitoso | Se implementó captura dinámica de `Set-Cookie: XSRF-TOKEN` y sincronización en header `X-XSRF-TOKEN` | **Cerrado** |
| **DEF-02** | Playwright E2E | Falla por selector ambiguo en Mis Solicitudes (`HU05`) | El enlace `/solicitudes/nueva` coincidía con `a[href^="/solicitudes/"]` en móvil | Se acotó el selector a `.tabla a[href^="/solicitudes/"]` para apuntar a filas de datos | **Cerrado** |
| **DEF-03** | Playwright E2E | Botón de evaluación bloqueado en caso ya priorizado (`HU07`) | En ejecuciones secuenciales el primer caso ya no estaba en estado `REGISTRADA` | Se agregó filtro previo por estado `REGISTRADA` garantizando caso pendiente limpio | **Cerrado** |
| **DEF-04** | Rendimiento k6 | Consultas por ID arrojaban 404 bajo carga | Se generaban IDs aleatorios fuera del rango real de MySQL | Se implementó descubrimiento dinámico de IDs existentes en la fase `setup()` | **Cerrado** |
| **DEF-05** | Backend (Diseño) | Cuello de botella a 400 VU concurrentes (latencia 5.2s) | Pool HikariCP por defecto limitado a 10 conexiones | Configurar `spring.datasource.hikari.maximum-pool-size=30` en el despliegue B1 de David | **Recomendación para CD** |

---

## 9. Conclusiones y Recomendaciones

1. **Aptitud para el Despliegue (Release Candidate):** La aplicación cumple holgadamente con los requerimientos funcionales evaluados y los requisitos no funcionales RNF05 (diseño responsivo 360 px sin desborde) y RNF06 (latencias p95 de 35 ms en lecturas y 18 ms en escrituras).
2. **Resiliencia Operativa:** El backend Spring Boot demostró capacidad de absorción de hasta **170 peticiones por segundo** y 400 usuarios concurrentes sin caídas ni errores de servidor.
3. **Recomendaciones para el Despliegue en la Nube (David - B1):**
   - Ampliar el tamaño del pool HikariCP en producción (`maximum-pool-size: 25-30`) y el número de hilos de Tomcat (`max-threads: 200`) para soportar picos superiores a 400 VU sin encolamiento.
   - Ejecutar la suite de Newman y Playwright apuntando a `BASE_URL=https://...` antes de abrir el servicio a los usuarios finales.
