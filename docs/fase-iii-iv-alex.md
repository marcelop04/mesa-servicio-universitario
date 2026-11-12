# Fases III y IV · Parte de Alex (paquete E: pruebas y rendimiento)

**Autor:** Alex (Ingeniero QA / SDET)  
**Fecha:** 12/11/2026  
**Reparto según:** `Division_Fases_III_y_IV.pdf` (sorteo del equipo).

---

## 1. Tabla de Tareas del Paquete E

| ID | Tarea | Terminado cuando | Estado | Evidencia |
|---|---|---|---|---|
| **E1** | Pruebas de API con Postman + Newman en CI | Colección por rol y HU con pre-request para CSRF/JWT; job `api-tests` en GitHub Actions | **Hecho** | `tests/api/colecciones/MSU-API.postman_collection.json`, `tests/api/entornos/`; job `api-tests` en `.github/workflows/ci.yml`; 59 reqs / 173 aserciones (100 % pass en 6.3 s) |
| **E2** | Pruebas E2E de aceptación con Playwright | Suite BDD por HU (`Dado/Cuando/Entonces`), etiquetas `@HUxx`, viewports 1366 px y 360 px, trazabilidad completa | **Hecho** | `tests/e2e/specs/01` al `06`; `playwright.config.js`; `docs/matriz-trazabilidad-hu.md`; 28 tests (14 desktop + 14 mobile, 100 % pass en 17.3 s) |
| **E3** | Carga y estrés con k6 | Siembra idempotente de 2,000 casos; carga 20 VU (RNF06) y estrés escalonado hasta 400 VU con punto de quiebre | **Hecho** | `tests/load/siembra/siembra-2000-casos.sql`, `limpiar-carga.sql`; `tests/load/scripts/carga.js`, `estres.js`; `tests/load/resultados/*.json` (0 % fallos) |
| **E4** | Revisar y validar pruebas generadas con IA | Auditoría de JUnit, Vitest, Newman, Playwright y k6; mutation testing manual comprobado y revertido | **Hecho** | `docs/revision-pruebas-ia.md` con tabla de validación, mutaciones en `MatrizPrioridad` y columna de firma para Alex |
| **E5** | Informe consolidado de pruebas (entrega final) | Informe técnico con métricas reales, evidencias de reportes y plantillas estructuradas de seguridad/usuario | **Hecho** | `docs/informe-pruebas.md`, `docs/fase-iii-iv-alex.md`, `docs/registro-uso-ia.md` |

---

## 2. Decisiones de Diseño y Reglas Implementadas

1. **Pruebas de API con Postman / Newman (E1):**
   - **Autenticación sin credenciales fijas:** El pre-request script de la colección interactúa con `GET /auth/csrf` para capturar la cookie `XSRF-TOKEN` y emitir el encabezado `X-XSRF-TOKEN` en el login.
   - **Manejo de sesión HttpOnly:** Extrae la cookie `MSU_SESION` y la almacena en el environment temporal para las siguientes llamadas por rol.
   - **Integración continua estricta:** Job `api-tests` en `.github/workflows/ci.yml` levanta el stack completo con Docker Compose, espera activamente con curl a que el backend responda en `/api/v1/auth/csrf` y ejecuta Newman con reporter `cli` y `junit`. Falla si una sola aserción no se cumple.
2. **Suite E2E de Aceptación con Playwright (E2):**
   - **BDD por Historia de Usuario:** Pasos `Dado / Cuando / Entonces` dentro de cada `test.step`.
   - **Trazabilidad y Video:** Grabación de video y trazas únicamente ante fallos (`video: 'retain-on-failure'`), minimizando espacio en disco.
   - **Validación Móvil (RNF05):** Ejecución paralela en proyecto `mobile-360` (360×780 px) evaluando la condición `scrollWidth <= innerWidth` en cada pantalla.
   - **Preservación del legado:** El archivo original de exploración manual de la fase II (`docs/pruebas/recorrido-fase-ii.mjs`) se mantuvo intacto.
3. **Pruebas de Rendimiento con k6 (E3):**
   - **Siembra SQL Idempotente:** Inserción en bloque de 2,000 registros con prefijo `[CARGA]` distribuidos de forma realista en estados, áreas y prioridades. Se acompaña del script `limpiar-carga.sql` para purga completa.
   - **Sesión Única:** Se realiza el handshake CSRF y login una sola vez en la fase `setup()`, aislando los `CookieJar` para evitar que múltiples VUs colisionen o disparen el límite de intentos de login (rate limiter de Marcelo).
   - **Cumplimiento RNF06:**
     - Consultas (80 %): **p95 = 35.34 ms** (límite < 1,000 ms).
     - Escrituras (20 %): **p95 = 18.50 ms** (límite < 2,000 ms).
     - Tasa de error bajo 20 VU: **0.00 %** (límite < 1 %).
   - **Límite de Estrés:** Soportó hasta **400 usuarios concurrentes** (~170 req/s y 17,087 peticiones) con **0 % de fallos HTTP**, detectando que a 400 VU los picos de latencia alcanzan 5.2 s debido a la cola del pool HikariCP (10 conexiones). Recuperación inmediata al reducir carga.

---

## 3. Instrucciones y Dependencias con Otros Integrantes

- **Para David (Paquete B - Nube y Despliegue B1):**
  - La suite de Playwright y Newman aceptan la variable `BASE_URL`. Para ejecutar contra el entorno de producción desplegado por David:
    ```bash
    BASE_URL=https://msu.tudominio.com npm test
    ```
- **Para Marcelo (Paquete C - Seguridad):**
  - El rate limiter de login no será disparado por k6 porque la autenticación se ejecuta una sola vez en `setup()`.
  - El pre-request script de Newman y k6 manejan la rotación estricta de `XSRF-TOKEN` y rechazan cualquier cookie no HttpOnly.
- **Para Emanuel y Gabriel (Paquetes A y D):**
  - Los scripts de prueba E2E y API cubren las funciones de encuestas (`HU13`), versionado de políticas (`HU22`) y auditoría (`HU23`).

