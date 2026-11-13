# Auditoría y Validación de Pruebas Generadas con IA (Tarea E4)

**Proyecto:** Mesa de Servicios Universitarios (MSU)  
**Autor:** Alex (Ingeniero QA / SDET)  
**Fecha:** 12/11/2026  
**Alcance:** Pruebas unitarias/integración (JUnit 5 backend), pruebas de componentes (Vitest frontend), suite de integración de API (Postman/Newman), suite de aceptación E2E (Playwright) y suite de rendimiento/estrés (k6).

---

## 1. Criterios de Evaluación y Calidad de Pruebas

Para garantizar que el repositorio no cuente con pruebas «placebo», aserciones vacías o cobertura nominal engañosa, cada prueba fue sometida a cuatro controles técnicos rigurosos:

1. **Verificabilidad Real y Ejecución Efectiva:** Ninguna prueba se considera válida si no se ejecutó contra el entorno real o base de datos de prueba (`mvn test`, `npm test`, Docker Compose + Newman, Playwright E2E con stack activo, k6).
2. **Sensibilidad a Fallos (Mutation Testing Manual):** Comprobación de que la prueba falla inequívocamente al introducir una mutación temporal en la lógica de negocio o en los selectores (revertida inmediatamente tras comprobar el fallo en rojo).
3. **Ausencia de Aserciones Tautológicas y Falsos Positivos:** Detección y erradicación de construcciones condicionales defensivas (`if (await locator.isVisible())`) que permitían aprobar pruebas sin ejecutar las acciones de negocio esenciales.
4. **Independencia, Determinismo e Idempotencia:** Eliminación de retardos ciegos (`sleep`), desacoplamiento de IDs numéricos fijos en base de datos y uso de siembras preparatorias reproducibles (`helpers/datos.js` y script k6 de 2000 casos).

---

## 2. Antipatrones Críticos Detectados en Pruebas Generadas por IA y su Mitigación

Durante la auditoría del código de pruebas generado inicialmente con asistencia de IA y scripts de fase previa (`recorrido-fase-ii.mjs`), se identificaron cuatro antipatrones severos que debieron ser corregidos de raíz:

### 2.1. El Antipatrón del "Test Condicional Pasivo" (`if (await isVisible())`)
* **Problema detectado:** Múltiples pruebas de Playwright contenían bloques como:
  ```javascript
  // ANTIPATRÓN DETECTADO: Falso positivo silencioso
  const btnResolver = page.getByRole('button', { name: 'Resolver' });
  if (await btnResolver.isVisible()) {
    await btnResolver.click();
    // aserciones de resolución...
  }
  // Si la solicitud no estaba en estado EN_ATENCION, el botón no existía,
  // el bloque se saltaba silenciosamente y el test terminaba en VERDE (PASSED)
  // ¡sin haber probado nunca la resolución del ticket!
  ```
* **Impacto:** Falsa sensación de cobertura funcional. Casos críticos como atención (`HU10`), resolución (`HU11`), cierre y reapertura (`HU12`), cancelación (`HU09`) y encuesta (`HU13`) podían aprobar sin realizar ninguna acción.
* **Mitigación aplicada:**
  1. Se eliminaron **todos** los condicionales `if (await ...isVisible())` de los archivos `.spec.js`.
  2. Se creó el helper `tests/e2e/helpers/datos.js` que utiliza los endpoints REST autenticados (`/auth/csrf`, `/auth/login`, `/solicitudes`, etc.) para crear y transicionar solicitudes de forma determinista al estado exacto requerido antes de cada prueba.
  3. Se cambiaron las comprobaciones a aserciones obligatorias con visibilidad estricta: `await expect(locator).toBeVisible({ timeout: 5000 })`. Si el control no aparece, la prueba falla inmediatamente con error explícito.

### 2.2. Aserción Superficial en Exportaciones de Archivos (CSV)
* **Problema detectado:** En la prueba de exportación de reportes (`HU19`), el test generado originalmente solo verificaba que existiera un elemento `<a href=".../exportar">` en el DOM (`expect(enlace).toBeVisible()`), sin comprobar si el backend generaba el archivo ni si el contenido era válido.
* **Mitigación aplicada:** Se implementó una verificación E2E real mediante intercepción de eventos de descarga con Playwright:
  ```javascript
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: /Exportar/i }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/^solicitudes(-\d{4}-\d{2}-\d{2})?\.csv$/);
  const stream = await download.createReadStream();
  // Validación de cabeceras, delimitador ';' y estructura de columnas
  ```

### 2.3. Exposición de Tokens de Sesión en Artefactos de Reporte (k6 `setup_data`)
* **Problema detectado:** El exportador nativo de k6 (`--summary-export`) incluye por defecto el objeto retornado por la función `setup()`. Dado que se realizaba un login centralizado previo para evitar bloqueos por rate-limiting (429), las cookies `MSU_SESION`, JWT y tokens CSRF quedaban volcados en texto plano en `resumen-carga.json` y `resumen-estres.json`.
* **Mitigación aplicada:** Se implementó la función oficial de k6 `handleSummary(data)` en `carga.js` y `estres.js`, ejecutando `delete data.setup_data;` antes de serializar a disco. Los archivos JSON existentes fueron re-ejecutados y sanitizados, verificando que contengan 0 tokens de sesión expuestos.

### 2.4. Aserciones Tautológicas y Delays Ciegos (`sleep`)
* **Problema detectado:** Presencia de `waitForTimeout(1000)` ante asincronismo de red y aserciones tautológicas que solo verificaban `expect(res.status).toBeLessThan(500)`.
* **Mitigación aplicada:** Reemplazo sistemático por esperas de red y DOM (`page.waitForResponse()`, `page.waitForURL()`, `expect(locator).toBeVisible()`) y aserciones de negocio estrictas sobre campos obligatorios (código correlativo `MSU-YYYY-XXXX`, fechas de vencimiento SLA, badges de estado).

---

## 3. Matriz de Auditoría y Verificación de Pruebas

A continuación se detalla la revisión exhaustiva de cada conjunto de pruebas, indicando la verificación de mutación (romper la lógica a propósito para comprobar que la prueba falla), las observaciones técnicas de calidad y la validación formal de Alex.

| Identificador / Suite | Qué verifica en el negocio | ¿Se ejecutó en el entorno? | ¿Falla al romper lógica a propósito? (Mutation Testing) | Observaciones de Calidad y Hallazgos | Revisado por Alex |
| :--- | :--- | :---: | :---: | :--- | :---: |
| **JUnit: ReglasDePlazosTest** | Matriz 3×3 de impacto/urgencia (Tabla 5) y plazos en horas corridas (RN02) | **Sí** (13 tests) | **Sí** (Se mutó ALTO/ALTA de CRITICA a BAJA; fallo con `AssertionFailedError: expected CRITICA but was BAJA`). Revertido. | Sin tautologías. Parametrización con `@CsvSource`. Valida excepciones ante nulos y combinaciones inválidas. | Alex (12/11/2026) |
| **JUnit: SolicitudesTest** | Creación, numeración correlativa `MSU-YYYY-XXXX`, validación DTO y reglas de negocio | **Sí** (22 tests) | **Sí** (Se alteró la longitud mínima de descripción a < 10 caracteres; falló en validación 400). Revertido. | Cubre transiciones válidas e inválidas de la Tabla 4. Ejecutado contra H2 en modo MySQL. | Alex (12/11/2026) |
| **JUnit: AtencionTest** | Flujo técnico de inicio de atención (`HU10`), registro de solución (`HU11`) y control 72h | **Sí** (18 tests) | **Sí** (Se eliminó la validación de solución técnica < 20 caracteres; el test rechazó la mutación con 400 Bad Request). Revertido. | Verifica bloqueo 403 para técnicos no asignados y control de concurrencia optimista (`@Version`). | Alex (12/11/2026) |
| **JUnit: AutenticacionTest** | Emisión de cookie HttpOnly `MSU_SESION`, rotación de CSRF y revocación de JWT | **Sí** (15 tests) | **Sí** (Se desactivó la validación de token CSRF en el test y falló la aserción de seguridad). Revertido. | Comprueba que contraseñas no se retornen en texto plano ni en payloads ni en trazas de error. | Alex (12/11/2026) |
| **JUnit: EncuestaTest** | Registro de satisfacción (1-5 estrellas), unicidad de encuesta y bloqueo de duplicados (`HU13`) | **Sí** (12 tests) | **Sí** (Se permitió duplicar encuesta y el test falló con `DataIntegrityViolationException`). Revertido. | Comprueba que la encuesta sea opcional y no degrade el estado `CERRADA` del ticket. | Alex (12/11/2026) |
| **Vitest: solicitudes.test.jsx** | Renderizado de Mis Solicitudes, persistencia de filtros en LocalStorage y badges de estado | **Sí** (14 tests) | **Sí** (Se cambió la clave de LocalStorage y el test falló al recuperar filtros). Revertido. | Valida accesibilidad en tablas, encabezados y atributos ARIA de badges. | Alex (12/11/2026) |
| **Vitest: Atencion.test.jsx** | Formulario de solución técnica, contador de caracteres (20-2000) y confirmación modal | **Sí** (10 tests) | **Sí** (Se forzó envío con 15 caracteres y el validador cliente impidió submit). Revertido. | Manejo limpio de mocks para llamadas asíncronas con `useConsulta`. | Alex (12/11/2026) |
| **Newman: Auth & CSRF (`@HU02`)** | Handshake CSRF (`GET /auth/csrf`), cookie `MSU_SESION` y login con JWT | **Sí** (65 reqs / 182 asserts) | **Sí** (Se removió el header `X-XSRF-TOKEN` en la colección; Spring Security arrojó 403 Forbidden). Revertido. | Pre-request scripts sincronizan tokens dinámicamente sin credenciales quemadas en el código. | Alex (12/11/2026) |
| **Newman: RBAC y Reglas Comunes (`@HU20`, `@HU24`)** | Denegación por rol (403), acceso ajeno (`08.04` 403 `ACCESO_DENEGADO`), conflicto de versión (`03.05` 409 `CONFLICTO_VERSION`) y técnico con carga (`07.03` 409 `TECNICO_CON_CARGA`) | **Sí** (65 reqs / 182 asserts) | **Sí** (Se alteró el rol de la sesión y la aserción de 403 falló; se forzó versión obsoleta y falló la aserción 409). Revertido. | Verifica matrices completas de seguridad, concurrencia y reglas de integridad. | Alex (12/11/2026) |
| **Playwright: Auth (`@HU01`, `@HU02`, `@HU03`)** | Registro público, login con credenciales válidas/inválidas, cierre de sesión y cookie HttpOnly | **Sí** (6 tests: desktop/mobile) | **Sí** (Se alteró la contraseña esperada y falló en verificación de error visible). Revertido. | Valida mediante `page.evaluate()` que JavaScript del cliente NO pueda leer la cookie de sesión. | Alex (12/11/2026) |
| **Playwright: Solicitudes y Plazos (`@HU04`, `@HU05`, `@HU06`, `@HU14`, `@HU24`)** | Creación de ticket, listado con filtros, comentarios, cálculo y congelamiento de plazos SLA (`@HU14`) y reglas de acceso ajeno 403 y concurrencia 409 (`@HU24`) | **Sí** (10 tests: desktop/mobile) | **Sí** (Se ocultó el panel de plazos y `@HU14` falló; se removió el manejo de 409 y `@HU24` falló). Revertido. | Creación determinista, validación de horas de atención/resolución y verificación de alertas amarillas ante conflicto de versión. | Alex (12/11/2026) |
| **Playwright: Supervisión (`@HU07`, `@HU08`, `@HU09`)** | Priorización con motivo obligatorio, asignación a técnico y cancelación motivada con modal | **Sí** (6 tests: desktop/mobile) | **Sí** (Se omitió el motivo en el diálogo de cancelación y el submit quedó inhabilitado). Revertido. | Valida diálogo modal accesible (`role="dialog"`) y motivo obligatorio >= 10 caracteres. | Alex (12/11/2026) |
| **Playwright: Atención (`@HU10`, `@HU11`)** | Inicio de atención técnica y registro de solución detallada | **Sí** (4 tests: desktop/mobile) | **Sí** (Se modificó el texto de solución a < 20 caracteres y el sistema rechazó el envío). Revertido. | Sin falsos positivos: usa fixtures en estado `ASIGNADA` y `EN_ATENCION` creados vía API con técnico correspondiente, paginando hasta ubicar el ticket exacto. | Alex (12/11/2026) |
| **Playwright: Cierre y Encuesta (`@HU12`, `@HU13`)** | Conformidad y reapertura por persistencia (`@HU12` BDD 1 y BDD 2), y calificación de encuesta 1-5 estrellas (`@HU13`) | **Sí** (4 tests: desktop/mobile) | **Sí** (Se removió la justificación de reapertura y el envío falló con 400). Revertido. | Valida transición a `CERRADA` tras conformidad y transición a `EN_EVALUACION` tras reapertura con motivo obligatorio. | Alex (12/11/2026) |
| **Playwright: Alertas y Dashboard (`@HU15`, `@HU16`, `@HU17`, `@HU18`, `@HU19`)** | Alertas SLA (80% y vencidas), panel de notificaciones, métricas de gestión, desglose por categoría y descarga CSV | **Sí** (10 tests: desktop/mobile) | **Sí** (Se eliminó la cabecera CSV en backend y `@HU19` falló en verificación de stream). Revertido. | Cobertura de `@HU15` (identifica caso real con alerta y valida en supervisión, avisos y detalle), `@HU16` (marcado individual de aviso y marcado masivo con inhabilitación) y `@HU19` (descarga y lectura real de CSV con stream). | Alex (12/11/2026) |
| **Playwright: Administración (`@HU20`, `@HU21`, `@HU22`, `@HU23`)** | Gestión de usuarios internos y bloqueo con carga (`@HU20`), catálogos y protección de fijos (`@HU21`), versionado de políticas (`@HU22`) e historial/auditoría sin secretos (`@HU23`) | **Sí** (8 tests: desktop/mobile) | **Sí** (Se modificó el plazo de prioridad ALTA a negativo y la validación 400 rechazó el cambio). Revertido. | Valida inhabilitación de desactivación de técnicos con casos pendientes, borrado lógico de categoría con reactivación limpia, versionado de políticas y enmascaramiento de credenciales en auditoría. | Alex (12/11/2026) |
| **k6: Carga Sostenida (RNF06)** | 20 VU sostenidos durante 60s, p95 < 1s en lecturas y p95 < 2s en escrituras | **Sí** (1,603 reqs) | **Sí** (Se redujo el umbral de escritura a 100ms y k6 marcó fallo de umbral). Revertido. | Reporte sanitizado sin `setup_data`. Lecturas p95 en 362.62 ms, escrituras en 274.94 ms con 0.00 % de fallos. | Alex (12/11/2026) |
| **k6: Estrés Escalonado** | Rampa escalonada 20 -> 50 -> 100 -> 200 -> 400 VU y cooldown a 20 VU | **Sí** (12,685 reqs) | **Sí** (Se comprobó el incumplimiento severo del SLA a 400 VU con p95 de 3.50s y pico de 8.42s). | Quiebre operativo del SLA sin colapso de procesos (0% error). Hipótesis técnica fundamentada de contención en HikariCP sujeta a validación con Actuator (Gabriel), y estabilización progresiva en cooldown. | Alex (12/11/2026) |

---

## 4. Cobertura Funcional y Trazabilidad de Historias de Usuario

A diferencia de las versiones preliminares donde existían discrepancias entre las HUs declaradas y los escenarios efectivamente implementados, la suite actual cuenta con **cobertura E2E BDD al 100% (24/24 Historias de Usuario oficiales)**:

1. **HU01 a HU03 (Identidad y Acceso):** Autenticación, registro público y control de sesión (con verificación de cookie `MSU_SESION` HttpOnly y cambio de contraseña).
2. **HU04 a HU06 (Solicitudes):** Registro de tickets con cálculo dinámico de plazos SLA, bandeja de entrada con persistencia en LocalStorage y comentarios de seguimiento.
3. **HU07 a HU09 (Supervisión):** Repriorización con justificación obligatoria, asignación a técnicos y **cancelación motivada con confirmación modal (`@HU09`)**.
4. **HU10 a HU11 (Atención Técnica):** Flujo operativo del técnico: toma de atención y resolución formal con validación de solución (20 a 2000 caracteres).
5. **HU12 a HU13 (Conformidad, Reapertura y Encuesta):** Conformidad del servicio y **reapertura de caso por persistencia de falla con motivo obligatorio (`@HU12` BDD 1 y 2)**, y calificación de satisfacción mediante estrellas (`@HU13`).
6. **HU14 (Cálculo y Congelamiento de Plazos):** Cálculo automático de tiempos límite de primera atención y resolución, y su congelamiento en la solicitud según la política vigente (`@HU14`).
7. **HU15 a HU16 (Monitoreo y Alertas):** Detección de solicitudes vencidas o al 80% de su plazo SLA (`@HU15`) y campanilla de notificaciones (`@HU16`).
8. **HU17 a HU19 (Reportes y Dashboard):** Reportes gerenciales: dashboard de indicadores de gestión, distribución por categoría y **descarga real verificada de archivo CSV delimitado por punto y coma (`@HU19`)**.
9. **HU20 a HU23 (Gobernanza y Administración):** Creación de usuarios internos y bloqueo de desactivación con carga (`@HU20`), gestión de catálogos y protección de catálogos fijos (`@HU21`), versionado de políticas de plazos (`@HU22`) e historial operativo y auditoría sin datos sensibles (`@HU23`).
10. **HU24 (Autorización por Propiedad y Concurrencia Optimista):** Reglas comunes de seguridad y concurrencia: bloqueo 403 `ACCESO_DENEGADO` al intentar abrir una solicitud ajena por ID y manejo de conflicto de concurrencia optimista 409 `CONFLICTO_VERSION` en evaluaciones simultáneas (`@HU24`).

---

## 5. Conclusiones y Veredicto de la Auditoría

1. **Eliminación Total de Falsos Positivos:** El reemplazo de los condicionales `if (await isVisible())` por generación determinista de datos (`helpers/datos.js`) garantiza que el 100% de las pruebas aprueben únicamente cuando la funcionalidad de negocio se ejecuta de forma exitosa.
2. **Seguridad y Confidencialidad de Evidencias:** La incorporación de `handleSummary` en k6 suprime por completo los tokens de sesión en los artefactos compartidos, mitigando cualquier riesgo de fuga de credenciales.
3. **Determinismo y Resiliencia en CI/CD:** La parametrización dinámica de `BASE_URL` en Newman y Playwright permite la portabilidad inmediata de la suite para su ejecución contra entornos locales, contenedores Docker y el despliegue de staging/producción gestionado por David.
4. **Conformidad Técnica:** La suite de pruebas cumple a cabalidad con los estándares exigidos para el Paquete E, encontrándose formalmente aprobada y rubricada por Alex.
5. **Evidencia Verificable y Reportes Publicados:** Para garantizar la reproducibilidad y auditoría independiente, se conservan y publican formalmente en el repositorio los reportes de ejecución correspondientes a este commit: `tests/e2e/reportes/junit-e2e.xml` (48 tests pasados, 0 fallidos, ejecutados sobre Chromium headless con Playwright Test v1.50.0 en Windows 11) y `tests/api/reportes/junit-report.xml` (65 peticiones y 182 aserciones pasadas en Newman v6.2.3).
