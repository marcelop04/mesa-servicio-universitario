# Fases III y IV · Parte de Alex (paquete E: pruebas y rendimiento)

**Autor:** Alex (Ingeniero QA / SDET)  
**Fecha:** 12/11/2026  
**Reparto según:** `Division_Fases_III_y_IV.pdf` (sorteo del equipo).

---

## 1. Tabla de Tareas del Paquete E

| ID | Tarea | Terminado cuando | Estado | Evidencia |
|---|---|---|---|---|
| **E1** | Pruebas de API con Postman + Newman en CI | Colección por rol y HU con pre-request para CSRF/JWT; job `api-tests` en GitHub Actions | **Hecho** | `tests/api/colecciones/MSU-API.postman_collection.json`, `tests/api/entornos/`; runner dinámico `tests/api/ejecutar-newman.js` con mapeo de `BASE_URL`; `.env.example`; job `api-tests` en `.github/workflows/ci.yml`; 65 reqs / 182 aserciones (100 % pass en 6.4 s) |
| **E2** | Pruebas E2E de aceptación con Playwright | Suite BDD por HU (`Dado/Cuando/Entonces`), etiquetas `@HU01` a `@HU24`, viewports 1366 px y 360 px, trazabilidad completa, sin falsos positivos | **Hecho** | `tests/e2e/specs/01` al `06`; `playwright.config.js`; helper determinista `tests/e2e/helpers/datos.js`; descarga real e inspección de stream CSV (`@HU19`); `docs/matriz-trazabilidad-hu.md`; 48 tests (24 desktop + 24 mobile, 100 % pass en 39.0 s) |
| **E3** | Carga y estrés con k6 | Siembra idempotente de 2,000 casos; carga 20 VU (RNF06); estrés hasta 400 VU con punto de quiebre alcanzado; sanitización de credenciales | **Hecho** | `tests/load/siembra/siembra-2000-casos.sql`, `limpiar-carga.sql`; `tests/load/scripts/carga.js`, `estres.js`; función `handleSummary` sin `setup_data`; `resumen-carga.json` (0 % error, p95L 362 ms, p95E 274 ms); `resumen-estres.json` (12,685 reqs, pico 8.42 s > 5.0 s a 400 VU; hipótesis fundamentada de HikariCP y recuperación progresiva) |
| **E4** | Revisar y validar pruebas generadas con IA | Auditoría de JUnit, Vitest, Newman, Playwright y k6; erradicación de antipatrones (`if (isVisible())`); mutation testing manual comprobado y revertido | **Hecho** | `docs/revision-pruebas-ia.md` con auditoría de 24 HUs oficiales, verificación de mutación en lógica de plazos/soluciones/concurrencia, mitigación de falsos positivos y firma de Alex completada (`Alex (12/11/2026)`) |
| **E5** | Informe consolidado de pruebas (entrega final) | Informe técnico con métricas 100% reales, evidencias de nube en OCI, trazabilidad oficial, resultados SAST/DAST de Marcelo y protocolo SUS de David | **Hecho** | `docs/informe-pruebas.md` (versión 2.1 consolidada), `docs/fase-iii-iv-alex.md`, aprobación formal en `docs/registro-uso-ia.md` |

---

## 2. Decisiones de Diseño y Reglas Implementadas

1. **Pruebas de API con Postman / Newman (E1):**
   - **Autenticación sin credenciales quemadas:** El pre-request script de la colección interactúa dinámicamente con `GET /auth/csrf` para capturar la cookie `XSRF-TOKEN` y setear el header `X-XSRF-TOKEN` durante el login de cada rol.
   - **Manejo de sesión HttpOnly:** Almacena la cookie `MSU_SESION` en variables dinámicas del entorno Postman para las peticiones posteriores.
   - **Runner Dinámico y Desacople de Entornos:** Se creó `tests/api/ejecutar-newman.js`, el cual toma la variable de sistema `BASE_URL` (eliminando `/api/v1` si viniera añadida) y la inyecta mediante `--env-var base_url=...`, permitiendo evaluar indistintamente `localhost:8080`, contenedores Docker o el despliegue de David en la nube.
   - **Integración Continua Estricta:** Job `api-tests` en `.github/workflows/ci.yml` levanta el stack completo con `docker compose up -d --build`, sondea la disponibilidad del backend contra `/api/v1/auth/csrf` con `curl` y ejecuta Newman con reportes `cli` y `junit`, fallando ante cualquier discrepancia.

2. **Suite E2E de Aceptación con Playwright (E2):**
   - **Erradicación de Falsos Positivos:** Se eliminó de raíz el antipatrón `if (await locator.isVisible())`. Todos los flujos usan esperas estrictas (`await expect(locator).toBeVisible()`).
   - **Preparación Determinista de Estado (`helpers/datos.js`):** En lugar de depender de registros preexistentes o estados fortuitos, cada prueba crea mediante llamadas REST autenticadas los casos en el estado exacto requerido (`REGISTRADA`, `ASIGNADA`, `EN_ATENCION`, `RESUELTA`, `CERRADA`).
   - **Cobertura Total de 24 HUs Oficiales en BDD:** Se implementaron escenarios dedicados `Dado / Cuando / Entonces` para las 24 HUs, incluyendo:
     - `@HU09`: Cancelación motivada con confirmación en diálogo modal y motivo obligatorio.
     - `@HU12`: Conformidad del servicio (BDD 1) y reapertura de solicitud ante persistencia de falla con justificación obligatoria (BDD 2).
     - `@HU14`: Cálculo y congelamiento de plazos de atención y resolución según política vigente (`PlazosServicio`, `MatrizAplicada`).
     - `@HU15`: Alertas tempranas al 80% del plazo SLA y tickets vencidos en interfaz y campana.
     - `@HU19`: Descarga de reporte CSV interceptada vía `waitForEvent('download')`, con inspección de stream, nombre de archivo (`solicitudes-YYYY-MM-DD.csv`), delimitador `;` y validación de cabeceras.
     - `@HU20`: Alta de usuarios y bloqueo de desactivación ante técnico con solicitudes asignadas pendientes (409 `TECNICO_CON_CARGA`).
     - `@HU21`: Borrado lógico de categoría con reactivación limpia e inmutabilidad de estados y prioridades.
     - `@HU23`: Historial operativo y auditoría administrativa sin secretos ni contraseñas (RNF01).
     - `@HU24`: Reglas comunes de autorización por propiedad (403 `ACCESO_DENEGADO`) y concurrencia optimista (409 `CONFLICTO_VERSION`).
   - **Validación Móvil (RNF05):** Ejecución paralela en proyecto `mobile-360` (360×780 px) asegurando matemáticamente $\text{scrollWidth} \le \text{innerWidth}$.

3. **Pruebas de Rendimiento con k6 (E3):**
   - **Siembra SQL Idempotente:** Inserción por lotes de 2,000 registros con prefijo `[CARGA]` distribuidos de forma realista en estados, áreas y prioridades. Acompañado de `limpiar-carga.sql` para purga completa.
   - **Sesión Única y Protección contra 429:** Handshake CSRF y login ejecutados una sola vez en `setup()`, aislando `CookieJar` para evitar saturar el endpoint de autenticación o disparar el rate-limiter de Marcelo.
   - **Sanitización de Evidencias (RNF01):** Implementación de `handleSummary(data)` con `delete data.setup_data;` en `carga.js` y `estres.js`, impidiendo que tokens JWT o cookies de sesión se vuelquen a los archivos JSON.
   - **Cumplimiento RNF06 (Carga 20 VU):**
     - Consultas (80 %): **p95 = 362.62 ms** (límite < 1,000 ms).
     - Escrituras (20 %): **p95 = 274.94 ms** (límite < 2,000 ms).
     - Tasa de error: **0.00 %** (límite < 1.0 %).
   - **Límite Operativo y Punto de Quiebre del SLA (Estrés hasta 400 VU):**
     - 12,685 peticiones procesadas a ~115 req/s con **0.00 % de errores HTTP** (sin caídas ni fallos 500).
     - El quiebre operativo se manifiesta como el incumplimiento severo y sostenido del SLA (RNF06: p95 < 1.0 s) a partir de 150-200 VU, alcanzando en 400 VU un p95 de 3.50 s y un pico máximo de 8.42 s.
     - **Hipótesis Técnica Fundamentada de Arquitectura:** Contención en la cola de conexiones del pool HikariCP (`maximum-pool-size: 10` por defecto en Spring Boot frente a hilos de Tomcat y 400 clientes concurrentes), sujeta a validación empírica con Actuator (Gabriel, PR #6).
     - **Recuperación:** En la etapa de enfriamiento (cooldown a 20 VU), el sistema se estabilizó de forma **progresiva** a medida que la cola de peticiones encoladas en el pool se evacuó gradualmente, retornando a la latencia de línea base sin requerir reinicio de contenedores.

---

## 3. Instrucciones y Coordinación con el Equipo

- **Para David (Paquete B - Nube, Despliegue B1 y Usabilidad):**
  - Se verificó en vivo la disponibilidad de `https://msu-157-137-206-147.sslip.io` con Caddy, HSTS, CSP y TTFB promedio de 111.0 ms.
  - Para ejecutar la suite de aceptación o API contra el entorno desplegado en la nube:
    ```bash
    # Newman API
    cd tests/api
    BASE_URL=https://<tu-despliegue> npm test

    # Playwright E2E
    cd tests/e2e
    BASE_URL=https://<tu-despliegue> npm test
    ```
  - **Recomendación para producción:** Configurar en `application.yml` del backend:
    ```yaml
    spring:
      datasource:
        hikari:
          maximum-pool-size: 30
          minimum-idle: 10
    ```
  - En `docs/informe-pruebas.md` (Sección 7) se formalizó el protocolo SUS de David, documentando que las 5 sesiones con usuarios reales permanecen planificadas y pendientes de ejecución.
- **Para Marcelo (Paquete C - Seguridad):**
  - k6 y Newman reutilizan sesiones y respetan la rotación de `XSRF-TOKEN`.
  - Los reportes de carga están 100% sanitizados sin tokens de sesión.
  - En `docs/informe-pruebas.md` (Sección 6) se incorporaron los resultados de su rama: CodeQL (0 alertas), npm audit (0 vulnerabilidades), Dependency-Check (23 CVEs, 15 de severidad alta abiertos en dependencias Spring Boot 3.5.13), y se documentó que el escaneo dinámico DAST con OWASP ZAP se encuentra delimitado y pendiente de autorización sobre la IP pública.
- **Para Emanuel y Gabriel (Paquetes A y D):**
  - La suite E2E ya cubre de forma determinista la encuesta (`HU13`), cálculo de plazos (`HU14`), alertas tempranas (`HU15`), administración de usuarios/técnicos (`HU20`), catálogos (`HU21`), matriz de políticas (`HU22`), auditoría administrativa (`HU23`) y reglas comunes de propiedad y concurrencia optimista (`HU24`).

---

## 4. Borrador para la Sección de Alex en el Informe Final del Equipo

*(Texto sugerido para compilar en el documento consolidado de la entrega final)*

> ### Paquete E: Aseguramiento de Calidad, Automatización y Rendimiento
> **Responsable:** Alex  
> Durante las Fases III y IV se implementó una estrategia integral de aseguramiento de calidad (QA) y pruebas de rendimiento orientada a garantizar la confiabilidad, seguridad y escalabilidad del sistema MSU.
> 
> En el plano funcional y de API, se diseñó una colección automatizada en Postman/Newman con 65 peticiones y 182 aserciones que cubren la matriz completa de códigos HTTP (200, 201, 204, 400, 401, 403, 404, 409) y roles RBAC (Solicitante, Supervisor, Técnico, Administrador), incorporando scripts pre-request para el manejo seguro de tokens CSRF y cookies de sesión HttpOnly. Este conjunto fue integrado quirúrgicamente en GitHub Actions (`ci.yml`), garantizando que ningún Pull Request sea fusionado si introduce regresiones.
> 
> En las pruebas de aceptación de usuario (E2E), se implementaron 48 ejecuciones automatizadas con Playwright Test cubriendo las 24 Historias de Usuario oficiales bajo formato BDD (`Dado / Cuando / Entonces`) en dos resoluciones (`desktop-1366` y `mobile-360`). Se eliminaron falsos positivos mediante la creación determinista de fixtures vía API (`helpers/datos.js`) y se validó el requisito no funcional RNF05 verificando ausencia total de desborde horizontal en pantallas compactas ($\text{scrollWidth} \le \text{innerWidth}$), así como la descarga e inspección real de reportes en formato CSV.
> 
> En cuanto a rendimiento y capacidad, se ejecutaron pruebas en k6 tras una siembra idempotente de 2,000 registros en MySQL con aislamiento por prefijo `[CARGA]`. La prueba de carga sostenida (20 VU, RNF06) demostró latencias p95 de 362.62 ms en lecturas (< 1.0 s) y 274.94 ms en escrituras (< 2.0 s) con 0.00 % de errores HTTP. La prueba de estrés escalonado (hasta 400 VU) procesó 12,685 peticiones a 115 req/s sin caídas del servicio, alcanzando el criterio de quiebre en un pico máximo de 8.42 s a 400 VU. El análisis técnico formula como hipótesis fundamentada de arquitectura la contención en el pool HikariCP (10 conexiones por defecto en Spring Boot) a ser validada empíricamente con métricas de Actuator/Micrometer de Gabriel, registrándose una estabilización progresiva durante la fase de enfriamiento. Todos los reportes fueron rigurosamente sanitizados mediante `handleSummary` para prevenir fugas de credenciales.
