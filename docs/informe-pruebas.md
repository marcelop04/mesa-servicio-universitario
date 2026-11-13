# Informe Integral de Pruebas y Rendimiento

**Proyecto:** Mesa de Servicios Universitarios con Plazos de Atención (MSU)  
**Curso:** Taller de Construcción de Software Web  
**Paquete:** Paquete E – Pruebas y Rendimiento (Fases III y IV)  
**Responsable:** Alex (Ingeniero QA / SDET)  
**Fecha de emisión:** 12/11/2026  
**Versión del documento:** 2.0 (Release Candidate Corregido)

---

## 1. Resumen Ejecutivo

El presente informe consolida las evidencias, métricas y resultados de la campaña integral de aseguramiento de calidad (QA) y pruebas de rendimiento ejecutada sobre el sistema **Mesa de Servicios Universitarios (MSU)** para la culminación de las Fases III y IV del proyecto.

La estrategia de pruebas abarcó la totalidad de la pirámide de automatización:
1. **Pruebas Unitarias e Integración (Backend):** Lógica de negocio, SLAs, cálculo de prioridades y transiciones de estado con JUnit 5 y H2 en modo MySQL.
2. **Pruebas de Componentes (Frontend):** Renderizado, interacción y persistencia de filtros en LocalStorage con Vitest y React Testing Library.
3. **Pruebas de API Automatizadas:** Suite Newman/Postman integrada en el pipeline de GitHub Actions (`ci.yml`), validando la matriz completa de roles institucionales (Solicitante, Supervisor, Técnico, Administrador) y códigos HTTP (200, 201, 204, 400, 401, 403, 404, 409).
4. **Pruebas E2E de Aceptación:** Cobertura del 100% de las Historias de Usuario (HU01 a HU24) con Playwright Test en dos resoluciones (`desktop-1366` y `mobile-360` para RNF05), erradicando condiciones permisivas y validando descargas reales de archivos CSV.
5. **Pruebas de Rendimiento y Capacidad:** Carga sostenida (20 VU, RNF06) y estrés escalonado (hasta 400 VU) con k6, identificando el cuello de botella en el pool de conexiones HikariCP y garantizando la completa sanitización de credenciales.

### Síntesis Global de Resultados

| Categoría de Prueba | Herramienta | Alcance / Muestra | Aserciones / Casos | Tasa de Éxito | Duración | Estado |
| :--- | :--- | :--- | :--- | :---: | :---: | :---: |
| **Pruebas Unitarias e Integración** | JUnit 5 + H2 (modo MySQL) | Lógica de negocio, SLA, entidades | 155 tests | **100.00 %** (155/155) | 18.2 s | **APROBADO** |
| **Pruebas de Componentes UI** | Vitest + React Testing Library | Formularios, filtros, SLA | 24 tests | **100.00 %** (24/24) | 4.8 s | **APROBADO** |
| **Pruebas de API (Newman en CI)** | Newman 6.2 (Postman) | 24 HUs, 4 roles, RBAC, CSRF | 59 requests / 173 asserts | **100.00 %** (173/173) | 6.3 s | **APROBADO** |
| **Aceptación E2E (Desktop 1366px)** | Playwright Test | 24 HUs completas (BDD) | 24 escenarios | **100.00 %** (24/24) | 18.1 s | **APROBADO** |
| **Aceptación E2E (Mobile 360px)** | Playwright Test | RNF05: No desborde horizontal | 24 escenarios | **100.00 %** (24/24) | 17.8 s | **APROBADO** |
| **Carga Sostenida (RNF06)** | k6 v2.0.0 | 20 VU sostenidos, 2,000 registros | 1,603 requests (80% L / 20% E) | **100.00 %** (0.00 % error) | 60.0 s | **APROBADO** |
| **Estrés y Punto de Quiebre** | k6 v2.0.0 | Rampa 20 → 400 VU escalonados | 12,685 requests (~115 req/s) | **100.00 %** (0.00 % error) | 110.0 s | **APROBADO** |

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
- **200 OK / 201 Created / 204 No Content:** Operaciones exitosas de consulta, login, creación de solicitud, comentarios, conformidad, asignación y resolución.
- **400 Bad Request:** Validaciones de entrada (longitud de descripción < 10 caracteres, correo inválido, solución técnica < 20 caracteres, justificación de reapertura corta, horas de SLA inconsistentes).
- **401 Unauthorized:** Intento de acceso a endpoints protegidos sin la cookie `MSU_SESION`.
- **403 Forbidden:** Violación de control de acceso basado en roles (RBAC) (ej. Solicitante intentando acceder a `/supervision/tecnicos` o `/admin/usuarios`), omisión de header CSRF o intento de ver casos de otro solicitante.
- **404 Not Found:** Consulta de solicitudes o catálogos inexistentes.
- **409 Conflict:** Concurrencia optimista (`@Version`) al editar un caso modificado concurrentemente, o intento de desactivar un técnico con solicitudes pendientes asignadas.

### 3.2. Integración en el Pipeline CI (`ci.yml`) y Ejecución Dinámica
Se agregó el job `api-tests` en `.github/workflows/ci.yml` de forma aislada y no invasiva:
- Levanta el stack completo con Docker Compose (`docker compose up -d --build`).
- Espera activa con sondeo sobre el endpoint público `/api/v1/auth/csrf` hasta recibir código HTTP 200.
- Ejecución desacoplada mediante `tests/api/ejecutar-newman.js`, el cual sincroniza automáticamente la variable de entorno `BASE_URL` con la variable de colección `base_url`.
- Publicación del reporte JUnit como artefacto de CI.

**Evidencia de ejecución real:**
```
Total Requests: 59 | Total Assertions: 173 | Failed: 0
Execution Time: 6.3s
Ruta de reporte: tests/api/reportes/junit-api.xml
```

---

## 4. Pruebas E2E de Aceptación (Playwright Test)

Se migró y expandió el recorrido funcional hacia una suite BDD en `tests/e2e/specs/` con pasos explícitos `Dado / Cuando / Entonces` estructurados con `test.step`.

### 4.1. Cobertura Integral de las 24 Historias de Usuario
1. **Épica 1: Identidad y Acceso**
   - `@HU01`: Registro público con asignación de rol Solicitante.
   - `@HU02`: Inicio de sesión exitoso y rechazo de credenciales incorrectas. Verificación de que `document.cookie` no tiene acceso a `MSU_SESION` (HttpOnly).
   - `@HU03`: Consulta de perfil y cambio de contraseña con validación de complejidad.
2. **Épica 2: Solicitudes de Servicio**
   - `@HU04`: Registro de solicitud con cálculo dinámico de impacto/urgencia/SLA y generación de código correlativo `MSU-YYYY-XXXX`.
   - `@HU05`: Consulta de mis solicitudes con persistencia de filtros en LocalStorage.
   - `@HU06`: Hilo inmutable de comentarios de seguimiento.
   - `@HU24`: Trazabilidad operativa e inspección del historial completo de estados y actores.
3. **Épica 3: Supervisión y Atención Técnica**
   - `@HU07`: Repriorización con justificación obligatoria (mínimo 10 caracteres).
   - `@HU08`: Asignación a técnico con balance de carga de trabajo.
   - `@HU09`: **Cancelación motivada de solicitud con diálogo modal de confirmación (`role="dialog"` / `.dialogo`) y motivo obligatorio**.
   - `@HU10`: Inicio formal de atención técnica por parte del especialista asignado.
   - `@HU11`: Registro de solución técnica detallada (validador de 20 a 2,000 caracteres).
4. **Épica 4: Conformidad y Cierre**
   - `@HU12`: Aceptación de la solución y transición a estado `CERRADA`.
   - `@HU13`: Encuesta de satisfacción con calificación por estrellas (1 a 5) y bloqueo de duplicados.
   - `@HU14`: **Reapertura de solicitud ante persistencia de falla con justificación obligatoria**.
5. **Épica 5: Monitoreo, Alertas y Reportes**
   - `@HU15`: **Detección visual de alertas de plazos (solicitudes vencidas y en umbral del 80% SLA)**.
   - `@HU16`: Centro de notificaciones con conteo de no leídas y marcado individual.
   - `@HU17`: Dashboard gerencial con tarjetas de conteo y tiempos medios de atención.
   - `@HU18`: Distribución de solicitudes por categoría de servicio.
   - `@HU19`: **Descarga e inspección real del archivo CSV (`solicitudes-YYYY-MM-DD.csv`), validando cabeceras, delimitador `;` y filas de datos mediante stream**.
6. **Épica 6: Administración del Sistema**
   - `@HU20`: Alta y administración de técnicos de soporte.
   - `@HU21`: Desactivación y reactivación de técnicos asegurando que no tengan casos pendientes.
   - `@HU22`: Configuración y versionado de políticas y matrices de SLA.
   - `@HU23`: Consulta de auditoría administrativa con enmascaramiento de datos sensibles.

### 4.2. Erradicación de Falsos Positivos y Determinismo
Se eliminaron todos los bloques condicionales permisivos (`if (await locator.isVisible())`). Cada prueba utiliza `tests/e2e/helpers/datos.js` para crear y colocar tickets en el estado exacto requerido (`REGISTRADA`, `ASIGNADA`, `EN_ATENCION`, `RESUELTA`) mediante API antes de iniciar las interacciones del navegador.

### 4.3. Validación de Diseño Responsivo (RNF05)
Cada uno de los 24 escenarios fue ejecutado en dos proyectos configurados:
- `desktop-1366`: Viewport de 1366×768 px.
- `mobile-360`: Viewport de 360×780 px.
En cada vista móvil se verificó la aserción de no desborde:
$$\text{scrollWidth} \le \text{innerWidth}$$

**Evidencia de ejecución real:**
```
Running 48 tests using 1 worker
  24 passed in desktop-1366
  24 passed in mobile-360
Total: 48 passed (35.9s)
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
  - **p95 = 362.62 ms** (Umbral RNF06 < 1,000 ms: **SUPERADO**).
  - Promedio: 88.32 ms | Mediana: 50.68 ms | Máximo: 785.29 ms.
- **Latencia de Escrituras:**
  - **p95 = 274.94 ms** (Umbral RNF06 < 2,000 ms: **SUPERADO**).
  - Promedio: 57.40 ms | Mediana: 16.40 ms | Máximo: 741.52 ms.

### 5.3. Escenario de Estrés Escalonado y Punto de Quiebre
- **Perfil de carga:** Rampa escalonada: 20 VU (10s) → 50 VU (15s) → 100 VU (15s) → 200 VU (20s) → 400 VU (25s) → Cooldown 20 VU (15s). Duración total: 110 segundos.
- **Peticiones HTTP totales:** 12,685 solicitudes completadas (~114.8 req/s).
- **Tasa de error (`http_req_failed`):** **0.00 %** (Cero fallos HTTP).
- **Métricas de Latencia (`http_req_duration`):**
  - Mediana: 730.61 ms | Promedio: 1,153.22 ms.
  - p90: 2,913.91 ms (2.91 s).
  - **p95: 3,503.25 ms (3.50 s)**.
  - **Pico máximo: 8,418.30 ms (8.41 s)**.

#### Análisis Técnico del Cuello de Botella (HikariCP)
1. **Configuración por Defecto:** Spring Boot 3.5 configura HikariCP con `maximum-pool-size: 10`, mientras que Tomcat embebido admite hasta 200 hilos concurrentes.
2. **Mecanismo de Saturación:** Al escalar a 200-400 VU, los 10 hilos que obtienen conexión atienden peticiones activas, mientras que los 190+ hilos restantes quedan bloqueados en `HikariPool.getConnection()`. Esto incrementa la latencia acumulada en cola hasta alcanzar el pico de **8.41 s**, cumpliendo el criterio de quiebre (**latencia > 5.0 s**).
3. **Resiliencia y Capacidad de Recuperación:** Durante la fase de enfriamiento (cooldown a 20 VU), la cola de conexiones se vació en menos de 3 segundos, estabilizándose de inmediato en latencias sub-50 ms sin necesidad de reinicio ni presencia de fugas en la JVM o MySQL.

### 5.4. Sanitización de Resultados (RNF01)
Ambos scripts de k6 (`carga.js` y `estres.js`) implementan la función nativa `handleSummary(data)` que elimina el nodo `setup_data` (`delete data.setup_data;`). Esto garantiza que los archivos `resumen-carga.json` y `resumen-estres.json` contengan únicamente métricas cuantitativas sin filtrar credenciales, tokens JWT ni cookies de sesión.

### 5.5. Procedimiento para Ejecución en Staging / Producción (David - B1)
Para evaluar el despliegue gestionado por David, ejecutar:
```bash
# 1. Pruebas de API contra despliegue remoto
cd tests/api
BASE_URL=https://<dominio-david> npm test

# 2. Pruebas E2E contra frontend desplegado
cd tests/e2e
BASE_URL=https://<dominio-david> npm test

# 3. Medición final de carga (coordinada con David)
cd tests/load
BASE_URL=https://<dominio-david> k6 run tests/load/scripts/carga.js
```

---

## 6. Pruebas de Seguridad (SAST y DAST)
> **Responsable del Paquete C:** Marcelo  
> *Estado:* Plantilla estructurada para integración de resultados de seguridad.

### 6.1. Análisis Estático de Código (SAST)
- **TODO [Marcelo]:** Adjuntar reporte de análisis estático con SonarQube / Trivy.
- **Vulnerabilidades Críticas / Altas:** [TODO: Insertar conteo y remediaciones aplicadas].
- **Calidad de Código y Deuda Técnica:** [TODO: Insertar métricas de cobertura y code smells detectados].

### 6.2. Análisis Dinámico de Seguridad (DAST)
- **TODO [Marcelo]:** Adjuntar escaneo automatizado con OWASP ZAP contra `http://localhost:8080`.
- **Cabeceras de Seguridad Verificadas:** Content-Security-Policy (CSP), X-Content-Type-Options, Strict-Transport-Security.
- **Hallazgos DAST:** [TODO: Registrar hallazgos y falsos positivos justificados].

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

| ID Defecto | Componente | Descripción del Problema | Causa Raíz | Solución Aplicada / Mitigación | Estado |
| :---: | :---: | :--- | :--- | :--- | :---: |
| **DEF-01** | API / Seguridad | Peticiones POST en pruebas de API retornaban 403 Forbidden | Spring Security rota el token CSRF tras el login | Captura dinámica de `Set-Cookie: XSRF-TOKEN` y sincronización en header `X-XSRF-TOKEN` | **Cerrado** |
| **DEF-02** | Playwright E2E | Falla por selector ambiguo en Mis Solicitudes (`HU05`) | Enlace `/solicitudes/nueva` coincidía con selector genérico en móvil | Se acotó el selector a `.tabla a[href^="/solicitudes/"]` | **Cerrado** |
| **DEF-03** | Playwright E2E | Bloqueo en evaluación de caso ya priorizado (`HU07`) | En ejecuciones consecutivas el caso ya no estaba en `REGISTRADA` | Se agregó filtro previo por estado `REGISTRADA` | **Cerrado** |
| **DEF-04** | Rendimiento k6 | Consultas por ID arrojaban 404 bajo carga | Generación de IDs fuera del rango real de MySQL | Descubrimiento dinámico de IDs en la fase `setup()` | **Cerrado** |
| **DEF-05** | Backend (Diseño) | Cuello de botella a 400 VU concurrentes (latencia 8.41s) | Pool HikariCP limitado por defecto a 10 conexiones | Configurar `spring.datasource.hikari.maximum-pool-size=30` en despliegue de David | **Recomendación para CD** |
| **DEF-06** | Playwright E2E | Falsos positivos por condicionales `if (await isVisible())` | Antipatrón en pruebas de IA que omitía acciones cuando el botón no aparecía | Erradicación total de condicionales y creación determinista de fixtures vía API (`datos.js`) | **Cerrado** |
| **DEF-07** | Rendimiento k6 | Tokens de sesión expuestos en resúmenes JSON | Exportador nativo de k6 incluía `setup_data` | Implementación de `handleSummary(data)` eliminando `setup_data` de los reportes | **Cerrado** |
| **DEF-08** | Playwright E2E | Prueba de exportación CSV superficial (`HU19`) | Solo se verificaba la presencia del botón sin descargar el archivo | Intercepción de evento `download`, lectura de stream y validación de columnas y delimitador `;` | **Cerrado** |

---

## 9. Conclusiones y Recomendaciones

1. **Aptitud para el Despliegue (Release Candidate):** La aplicación cumple holgadamente con los requerimientos funcionales evaluados y los requisitos no funcionales RNF05 (diseño responsivo 360 px sin desborde) y RNF06 (latencias p95 de 362 ms en lecturas y 274 ms en escrituras).
2. **Resiliencia Operativa:** El backend Spring Boot demostró capacidad de absorción de hasta **115 peticiones por segundo** y 400 usuarios concurrentes sin caídas ni errores de servidor (0.00 % `http_req_failed`).
3. **Recomendaciones para el Despliegue en la Nube (David - B1):**
   - Ampliar el tamaño del pool HikariCP en producción (`maximum-pool-size: 25-30`) y el número de hilos de Tomcat (`max-threads: 200`) para mitigar el encolamiento a más de 200 VU concurrentes.
   - Ejecutar la suite de Newman y Playwright apuntando a `BASE_URL=https://...` antes de habilitar el acceso a los usuarios finales.
