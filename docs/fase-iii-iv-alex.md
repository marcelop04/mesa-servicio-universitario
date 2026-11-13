# Fases III y IV · Parte de Alex (paquete E: pruebas y rendimiento)

**Autor:** Alex (Ingeniero QA / SDET)  
**Fecha:** 12/11/2026  
**Reparto según:** `Division_Fases_III_y_IV.pdf` (sorteo del equipo).

---

## 1. Tabla de Tareas del Paquete E

| ID | Tarea | Terminado cuando | Estado | Evidencia |
|---|---|---|---|---|
| **E1** | Pruebas de API con Postman + Newman en CI | Colección por rol y HU con pre-request para CSRF/JWT; job `api-tests` en GitHub Actions | **Hecho** | `tests/api/colecciones/MSU-API.postman_collection.json`, `tests/api/entornos/`; runner dinámico `tests/api/ejecutar-newman.js` con mapeo de `BASE_URL`; `.env.example`; job `api-tests` en `.github/workflows/ci.yml`; 59 reqs / 173 aserciones (100 % pass en 6.3 s) |
| **E2** | Pruebas E2E de aceptación con Playwright | Suite BDD por HU (`Dado/Cuando/Entonces`), etiquetas `@HU01` a `@HU24`, viewports 1366 px y 360 px, trazabilidad completa, sin falsos positivos | **Hecho** | `tests/e2e/specs/01` al `06`; `playwright.config.js`; helper determinista `tests/e2e/helpers/datos.js`; descarga real e inspección de stream CSV (`@HU19`); `docs/matriz-trazabilidad-hu.md`; 48 tests (24 desktop + 24 mobile, 100 % pass en 35.9 s) |
| **E3** | Carga y estrés con k6 | Siembra idempotente de 2,000 casos; carga 20 VU (RNF06); estrés hasta 400 VU con punto de quiebre alcanzado; sanitización de credenciales | **Hecho** | `tests/load/siembra/siembra-2000-casos.sql`, `limpiar-carga.sql`; `tests/load/scripts/carga.js`, `estres.js`; función `handleSummary` sin `setup_data`; `resumen-carga.json` (0 % error, p95L 362 ms, p95E 274 ms); `resumen-estres.json` (12,685 reqs, pico 8.41 s > 5.0 s a 400 VU por contención en HikariCP) |
| **E4** | Revisar y validar pruebas generadas con IA | Auditoría de JUnit, Vitest, Newman, Playwright y k6; erradicación de antipatrones (`if (isVisible())`); mutation testing manual comprobado y revertido | **Hecho** | `docs/revision-pruebas-ia.md` con auditoría de 24 HUs, verificación de mutación en lógica de plazos/soluciones, mitigación de falsos positivos y columna de firma de Alex vacía |
| **E5** | Informe consolidado de pruebas (entrega final) | Informe técnico con métricas 100% reales, evidencias de reportes, comandos para staging de David y plantillas estructuradas de seguridad/usuario | **Hecho** | `docs/informe-pruebas.md` (versión 2.0 corregida), `docs/fase-iii-iv-alex.md`, borrador sugerido en `docs/registro-uso-ia.md` |

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
   - **Cobertura Total de 24 HUs en BDD:** Se implementaron escenarios dedicados `Dado / Cuando / Entonces` para las 24 HUs, incluyendo:
     - `@HU09`: Cancelación motivada con confirmación en diálogo modal y motivo obligatorio.
     - `@HU14`: Reapertura de caso no resuelto con justificación de disconformidad.
     - `@HU15`: Alertas tempranas al 80% del plazo SLA y tickets vencidos en interfaz y campana.
     - `@HU19`: Descarga de reporte CSV interceptada vía `waitForEvent('download')`, con inspección de stream, nombre de archivo (`solicitudes-YYYY-MM-DD.csv`), delimitador `;` y validación de cabeceras.
     - `@HU24`: Historial inmutable de eventos y transiciones en el detalle de la solicitud.
   - **Validación Móvil (RNF05):** Ejecución paralela en proyecto `mobile-360` (360×780 px) asegurando matemáticamente `scrollWidth <= innerWidth`.
   - **Preservación:** Se conservó intacto el archivo exploratorio `docs/pruebas/recorrido-fase-ii.mjs`.

3. **Pruebas de Rendimiento con k6 (E3):**
   - **Siembra SQL Idempotente:** Inserción por lotes de 2,000 registros con prefijo `[CARGA]` distribuidos de forma realista en estados, áreas y prioridades. Acompañado de `limpiar-carga.sql` para purga completa.
   - **Sesión Única y Protección contra 429:** Handshake CSRF y login ejecutados una sola vez en `setup()`, aislando `CookieJar` para evitar saturar el endpoint de autenticación o disparar el rate-limiter de Marcelo.
   - **Sanitización de Evidencias (RNF01):** Implementación de `handleSummary(data)` con `delete data.setup_data;` en `carga.js` y `estres.js`, impidiendo que tokens JWT o cookies de sesión se vuelquen a los archivos JSON.
   - **Cumplimiento RNF06 (Carga 20 VU):**
     - Consultas (80 %): **p95 = 362.62 ms** (límite < 1,000 ms).
     - Escrituras (20 %): **p95 = 274.94 ms** (límite < 2,000 ms).
     - Tasa de error: **0.00 %** (límite < 1.0 %).
   - **Punto de Quiebre Técnico Demostrado (Estrés hasta 400 VU):**
     - 12,685 peticiones procesadas a ~115 req/s con **0.00 % de errores HTTP**.
     - Al alcanzar 400 VU, la latencia p95 subió a 3.50 s y se registró un **pico máximo de 8.41 s (> 5.0 s)**, alcanzando el criterio de quiebre.
     - **Causa Raíz:** Contención en la cola del pool HikariCP de Spring Boot (`maximum-pool-size: 10` frente a 200 hilos concurrentes en Tomcat).
     - **Recuperación Inmediata:** En la etapa de cooldown a 20 VU, el sistema normalizó sus tiempos de respuesta a sub-50 ms en menos de 3 segundos sin caídas ni pérdidas de memoria.

---

## 3. Instrucciones y Coordinación con el Equipo

- **Para David (Paquete B - Nube, Despliegue B1 y Usabilidad):**
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
  - En `docs/informe-pruebas.md` (Sección 7) se reservó la plantilla estructurada para la prueba de usabilidad SUS con 5 participantes.
- **Para Marcelo (Paquete C - Seguridad):**
  - k6 y Newman reutilizan sesiones y respetan la rotación de `XSRF-TOKEN`.
  - Los reportes de carga están 100% sanitizados sin tokens de sesión.
  - En `docs/informe-pruebas.md` (Sección 6) se reservó la plantilla estructurada para los hallazgos de SAST (SonarQube/Trivy) y DAST (OWASP ZAP).
- **Para Emanuel y Gabriel (Paquetes A y D):**
  - La suite E2E ya cubre de forma determinista la encuesta (`HU13`), reapertura (`HU14`), alertas (`HU15`), administración de usuarios/técnicos (`HU20`, `HU21`), matriz de políticas (`HU22`), auditoría (`HU23`) y trazabilidad (`HU24`).

---

## 4. Borrador para la Sección de Alex en el Informe Final del Equipo

*(Texto sugerido para compilar en el documento consolidado de la entrega final)*

> ### Paquete E: Aseguramiento de Calidad, Automatización y Rendimiento
> **Responsable:** Alex  
> Durante las Fases III y IV se implementó una estrategia integral de aseguramiento de calidad (QA) y pruebas de rendimiento orientada a garantizar la confiabilidad, seguridad y escalabilidad del sistema MSU.
> 
> En el plano funcional y de API, se diseñó una colección automatizada en Postman/Newman con 59 peticiones y 173 aserciones que cubren la matriz completa de códigos HTTP (200, 201, 204, 400, 401, 403, 404, 409) y roles RBAC (Solicitante, Supervisor, Técnico, Administrador), incorporando scripts pre-request para el manejo seguro de tokens CSRF y cookies de sesión HttpOnly. Este conjunto fue integrado quirúrgicamente en GitHub Actions (`ci.yml`), garantizando que ningún Pull Request sea fusionado si introduce regresiones.
> 
> En las pruebas de aceptación de usuario (E2E), se implementaron 48 ejecuciones automatizadas con Playwright Test cubriendo las 24 Historias de Usuario bajo formato BDD (`Dado / Cuando / Entonces`) en dos resoluciones (`desktop-1366` y `mobile-360`). Se eliminaron falsos positivos mediante la creación determinista de fixtures vía API (`helpers/datos.js`) y se validó el requisito no funcional RNF05 verificando ausencia total de desborde horizontal en pantallas compactas ($\text{scrollWidth} \le \text{innerWidth}$), así como la descarga e inspección real de reportes en formato CSV.
> 
> En cuanto a rendimiento y capacidad, se ejecutaron pruebas en k6 tras una siembra idempotente de 2,000 registros en MySQL con aislamiento por prefijo `[CARGA]`. La prueba de carga sostenida (20 VU, RNF06) demostró latencias p95 de 362.62 ms en lecturas (< 1.0 s) y 274.94 ms en escrituras (< 2.0 s) con 0.00 % de errores HTTP. La prueba de estrés escalonado (hasta 400 VU) procesó 12,685 peticiones a 115 req/s sin caídas del servicio, alcanzando el criterio de quiebre en un pico máximo de 8.41 s a 400 VU. El análisis técnico demostró que la degradación se origina por la contención de hilos en el pool HikariCP (10 conexiones por defecto en Spring Boot) y no por consumo de CPU ni saturación de MySQL, evidenciando una recuperación inmediata (< 3 s) tras el cese del tráfico masivo. Todos los reportes fueron rigurosamente sanitizados mediante `handleSummary` para prevenir fugas de credenciales.

---

## 5. Guion y Notas para la Demostración en Vivo de Alex (3 a 5 Minutos)

### Minuto 0:00 - 1:00: Introducción y Pruebas en el Pipeline CI (E1)
- **Mensaje clave:** *"Buenas tardes profesor y compañeros. Mi responsabilidad en las Fases III y IV fue el Paquete E: Pruebas y Rendimiento. Mi objetivo principal fue garantizar que el sistema cumpla con todos los requisitos funcionales sin falsos positivos y soporte la concurrencia universitaria exigida."*
- **Acción en pantalla:** Mostrar GitHub Actions en el navegador y ejecutar localmente:
  ```bash
  cd tests/api
  npm test
  ```
- **Puntos a resaltar:**
  - Mostrar la ejecución de 59 peticiones y 173 aserciones en menos de 7 segundos con 0 fallos.
  - Explicar brevemente cómo el pre-request script realiza el handshake CSRF con `GET /auth/csrf` y extrae la cookie de sesión HttpOnly `MSU_SESION`.
  - Mostrar en `ci.yml` que el job `api-tests` levanta Docker Compose, espera activamente al backend y protege la rama principal.

### Minuto 1:00 - 2:30: Pruebas E2E en Playwright y Erradicación de Falsos Positivos (E2 y E4)
- **Mensaje clave:** *"Para las pruebas de aceptación E2E, implementamos una suite BDD con Playwright que cubre las 24 Historias de Usuario al 100%, evaluando tanto escritorio como dispositivos móviles."*
- **Acción en pantalla:** Ejecutar la suite de Playwright:
  ```bash
  cd tests/e2e
  npx playwright test
  ```
- **Puntos a resaltar:**
  - Mostrar cómo se ejecutan 48 tests en paralelo (24 en 1366 px y 24 en 360 px) pasando en ~36 segundos.
  - Explicar la auditoría de calidad (E4): *"Detectamos que las pruebas generadas por IA inicialmente utilizaban condicionales `if (await boton.isVisible())` que aprobaban la prueba aun cuando el botón no aparecía. Erradicamos ese antipatrón creando el helper `datos.js` que prepara el ticket en la base de datos vía API en el estado exacto antes de interactuar en el navegador."*
  - Mostrar la prueba `@HU19`: *"No solo comprobamos que exista el botón de exportación; Playwright intercepta la descarga real del CSV, lee el flujo de bytes, valida el delimitador punto y coma y verifica las cabeceras."*
  - Resaltar el cumplimiento del RNF05 en móvil (360 px) mediante la fórmula matemática de no desborde.

### Minuto 2:30 - 4:00: Rendimiento y Punto de Quiebre en k6 (E3)
- **Mensaje clave:** *"Para validar la capacidad del sistema, sembramos 2,000 solicitudes en MySQL y ejecutamos pruebas de carga y estrés con k6."*
- **Acción en pantalla:** Mostrar el script y los resultados en `tests/load/README.md` o ejecutar un fragmento de carga:
  ```bash
  cd tests/load
  k6 run tests/load/scripts/carga.js
  ```
- **Puntos a resaltar:**
  - **Carga sostenida (20 VU):** p95 en lecturas de 362 ms (meta < 1 s) y en escrituras de 274 ms (meta < 2 s) con 0 % de error, cumpliendo el RNF06.
  - **Estrés (hasta 400 VU):** *"Subimos la carga escalonadamente hasta 400 usuarios concurrentes procesando más de 12,000 peticiones a 115 req/s. Demostramos el punto de quiebre técnico: a 400 VU el p95 sube a 3.5 s y el pico máximo llega a 8.41 s. Identificamos que el cuello de botella es el pool HikariCP configurado por defecto en 10 conexiones en Spring Boot, donde los hilos de Tomcat quedan esperando en cola. Al cesar la carga, el sistema se recupera de inmediato a latencias sub-50 ms sin fugas de memoria."*
  - **Seguridad en reportes:** Resaltar que mediante `handleSummary` se eliminó cualquier token o cookie de sesión de los archivos de resultados.

### Minuto 4:00 - 4:30: Conclusión y Entrega a Despliegue
- **Mensaje clave:** *"En conclusión, el software cuenta con un arnés de pruebas automatizado, sensible a fallos y parametrizado con `BASE_URL` listo para certificar el despliegue en la nube de David. Doy el pase a mi compañero para la siguiente sección."*
