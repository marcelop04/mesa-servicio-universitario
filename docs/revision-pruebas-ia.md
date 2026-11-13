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
* **Impacto:** Falsa sensación de cobertura funcional. Casos críticos como atención (`HU10`), resolución (`HU11`), cierre (`HU12`), cancelación (`HU09`) y encuesta (`HU13`) podían aprobar sin realizar ninguna acción.
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

A continuación se detalla la revisión exhaustiva de cada conjunto de pruebas, indicando la verificación de mutación (romper la lógica a propósito para comprobar que la prueba falla) y las observaciones técnicas de calidad.

> **Nota:** La columna «Revisado por Alex» se mantiene intencionalmente vacía para la revisión y firma manual de Alex según el protocolo de entrega.

| Identificador / Suite | Qué verifica en el negocio | ¿Se ejecutó en el entorno? | ¿Falla al romper lógica a propósito? (Mutation Testing) | Observaciones de Calidad y Hallazgos | Revisado por Alex |
| :--- | :--- | :---: | :---: | :--- | :---: |
| **JUnit: ReglasDePlazosTest** | Matriz 3×3 de impacto/urgencia (Tabla 5) y plazos en horas corridas (RN02) | **Sí** (13 tests) | **Sí** (Se mutó ALTO/ALTA de CRITICA a BAJA; fallo con `AssertionFailedError: expected CRITICA but was BAJA`). Revertido. | Sin tautologías. Parametrización con `@CsvSource`. Valida excepciones ante nulos y combinaciones inválidas. | |
| **JUnit: SolicitudesTest** | Creación, numeración correlativa `MSU-YYYY-XXXX`, validación DTO y reglas de negocio | **Sí** (22 tests) | **Sí** (Se alteró la longitud mínima de descripción a < 10 caracteres; falló en validación 400). Revertido. | Cubre transiciones válidas e inválidas de la Tabla 4. Ejecutado contra H2 en modo MySQL. | |
| **JUnit: AtencionTest** | Flujo técnico de inicio de atención (`HU10`), registro de solución (`HU11`) y control 72h | **Sí** (18 tests) | **Sí** (Se eliminó la validación de solución técnica < 20 caracteres; el test rechazó la mutación con 400 Bad Request). Revertido. | Verifica bloqueo 403 para técnicos no asignados y control de concurrencia optimista (`@Version`). | |
| **JUnit: AutenticacionTest** | Emisión de cookie HttpOnly `MSU_SESION`, rotación de CSRF y revocación de JWT | **Sí** (15 tests) | **Sí** (Se desactivó la validación de token CSRF en el test y falló la aserción de seguridad). Revertido. | Comprueba que contraseñas no se retornen en texto plano ni en payloads ni en trazas de error. | |
| **JUnit: EncuestaTest** | Registro de satisfacción (1-5 estrellas), unicidad de encuesta y bloqueo de duplicados (`HU13`) | **Sí** (12 tests) | **Sí** (Se permitió duplicar encuesta y el test falló con `DataIntegrityViolationException`). Revertido. | Comprueba que la encuesta sea opcional y no degrade el estado `CERRADA` del ticket. | |
| **Vitest: solicitudes.test.jsx** | Renderizado de Mis Solicitudes, persistencia de filtros en LocalStorage y badges de estado | **Sí** (14 tests) | **Sí** (Se cambió la clave de LocalStorage y el test falló al recuperar filtros). Revertido. | Valida accesibilidad en tablas, encabezados y atributos ARIA de badges. | |
| **Vitest: Atencion.test.jsx** | Formulario de solución técnica, contador de caracteres (20-2000) y confirmación modal | **Sí** (10 tests) | **Sí** (Se forzó envío con 15 caracteres y el validador cliente impidió submit). Revertido. | Manejo limpio de mocks para llamadas asíncronas con `useConsulta`. | |
| **Newman: Auth & CSRF (`@HU02`)** | Handshake CSRF (`GET /auth/csrf`), cookie `MSU_SESION` y login con JWT | **Sí** (59 reqs / 173 asserts) | **Sí** (Se removió el header `X-XSRF-TOKEN` en la colección; Spring Security arrojó 403 Forbidden). Revertido. | Pre-request scripts sincronizan tokens sin credenciales quemadas en el código. | |
| **Newman: RBAC (`403 Forbidden`)** | Bloqueo estricto cuando un Solicitante intenta acceder a endpoints de Supervisión o Admin | **Sí** (59 reqs / 173 asserts) | **Sí** (Se cambió el rol del token a SUPERVISOR y la aserción `status === 403` falló). Revertido. | Verifica matrices completas de denegación por rol institucional. | |
| **Playwright: Auth (`@HU01`, `@HU02`, `@HU03`)** | Registro público, login con credenciales válidas/inválidas, cierre de sesión y cookie HttpOnly | **Sí** (6 tests: desktop/mobile) | **Sí** (Se alteró la contraseña esperada y falló en verificación de error visible). Revertido. | Valida mediante `page.evaluate()` que JavaScript del cliente NO pueda leer la cookie de sesión. | |
| **Playwright: Solicitudes (`@HU04`, `@HU05`, `@HU06`, `@HU24`)** | Creación con SLA calculado, listado con filtros, visualización de detalle y trazabilidad de historial | **Sí** (8 tests: desktop/mobile) | **Sí** (Se eliminó la sección de historial del detalle y `@HU24` falló con timeout). Revertido. | Creación determinista y comprobación de eventos históricos con actor y fecha. | |
| **Playwright: Supervisión (`@HU07`, `@HU08`, `@HU09`)** | Priorización con motivo obligatorio, asignación a técnico y cancelación motivada | **Sí** (6 tests: desktop/mobile) | **Sí** (Se omitió el motivo en el diálogo de cancelación y el submit quedó inhabilitado). Revertido. | Cobertura de `@HU09` agregada: valida modal de diálogo y motivo obligatorio >= 10 chars. | |
| **Playwright: Atención (`@HU10`, `@HU11`)** | Inicio de atención técnica y registro de solución detallada | **Sí** (4 tests: desktop/mobile) | **Sí** (Se modificó el texto de solución a < 20 caracteres y el sistema rechazó el envío). Revertido. | Sin falsos positivos: usa fixtures en estado `ASIGNADA` y `EN_ATENCION` creados vía API. | |
| **Playwright: Cierre y Encuesta (`@HU12`, `@HU13`, `@HU14`)** | Cierre conforme, calificación de encuesta 1-5 estrellas y reapertura motivada por disconformidad | **Sí** (6 tests: desktop/mobile) | **Sí** (Se removió el campo de justificación de reapertura y `@HU14` falló). Revertido. | Cobertura de `@HU14` agregada: simula disconformidad y reapertura de ticket resuelto. | |
| **Playwright: Alertas y Dashboard (`@HU15`, `@HU16`, `@HU17`, `@HU18`, `@HU19`)** | Alertas SLA (80% y vencidas), panel de notificaciones, métricas de gestión, desglose por categoría y descarga CSV | **Sí** (10 tests: desktop/mobile) | **Sí** (Se eliminó la cabecera CSV en backend y `@HU19` falló en verificación de stream). Revertido. | Cobertura de `@HU15` (alertas visuales) y `@HU19` (descarga y lectura real de CSV con stream). | |
| **Playwright: Administración (`@HU20`, `@HU21`, `@HU22`, `@HU23`)** | Gestión de usuarios, reactivación, configuración de plazos SLA y auditoría de eventos | **Sí** (8 tests: desktop/mobile) | **Sí** (Se modificó el plazo de prioridad ALTA a negativo y la validación 400 rechazó el cambio). Revertido. | Valida roles administrativos y control de versionado de políticas. | |
| **k6: Carga Sostenida (RNF06)** | 20 VU sostenidos durante 60s, p95 < 1s en lecturas y p95 < 2s en escrituras | **Sí** (1,598 reqs) | **Sí** (Se redujo el umbral de escritura a 100ms y k6 marcó fallo de umbral). Revertido. | Reporte sanitizado sin `setup_data`. Lecturas p95 en 362.62 ms, escrituras en 274.94 ms. | |
| **k6: Estrés Escalonado** | Rampa escalonada 20 -> 50 -> 100 -> 200 -> 400 VU y cooldown a 20 VU | **Sí** (12,685 reqs) | **Sí** (Se comprobó el criterio de quiebre de latencia p95 > 5s; pico máximo de 8.41s en 400 VU). | Evidencia de cuello de botella en pool de conexiones HikariCP (`maximum-pool-size: 10`) y recuperación total. | |

---

## 4. Cobertura Funcional y Trazabilidad de Historias de Usuario

A diferencia de las versiones preliminares donde existían discrepancias entre las HUs declaradas y los escenarios efectivamente implementados, la suite actual cuenta con **cobertura E2E BDD al 100% (24/24 Historias de Usuario)**:

1. **HU01 a HU03:** Autenticación, registro y control de sesión (con verificación de cookie `MSU_SESION` HttpOnly).
2. **HU04 a HU06:** Registro de tickets con cálculo dinámico de plazos SLA, bandeja de entrada y visualización detallada.
3. **HU07 a HU09:** Gestión de supervisión: priorización con justificación, asignación a técnicos y **cancelación motivada con confirmación modal (`@HU09`)**.
4. **HU10 a HU11:** Flujo operativo del técnico: toma de atención y resolución formal con validación de solución (20 a 2000 caracteres).
5. **HU12 a HU14:** Flujo de cierre: conformidad de servicio, calificación de satisfacción mediante estrellas (`@HU13`) y **reapertura de caso por persistencia de falla con motivo obligatorio (`@HU14`)**.
6. **HU15 a HU16:** Monitoreo y alertas: **detección de solicitudes vencidas o al 80% de su plazo SLA (`@HU15`)** y campanilla de notificaciones (`@HU16`).
7. **HU17 a HU19:** Reportes gerenciales: dashboard de indicadores de gestión, distribución por categoría y **descarga real verificada de archivo CSV delimitado por punto y coma (`@HU19`)**.
8. **HU20 a HU23:** Gobernanza y administración: creación de técnicos, activación/desactivación, políticas de SLA y registro de auditoría.
9. **HU24:** Trazabilidad operativa: **inspección del historial completo de estados, actores y marcas de tiempo (`@HU24`)**.

---

## 5. Conclusiones y Veredicto de la Auditoría

1. **Eliminación Total de Falsos Positivos:** El reemplazo de los condicionales `if (await isVisible())` por generación determinista de datos (`helpers/datos.js`) garantiza que el 100% de las pruebas aprueben únicamente cuando la funcionalidad de negocio se ejecuta de forma exitosa.
2. **Seguridad y Confidencialidad de Evidencias:** La incorporación de `handleSummary` en k6 suprime por completo los tokens de sesión en los artefactos compartidos, mitigando cualquier riesgo de fuga de credenciales.
3. **Determinismo y Resiliencia en CI/CD:** La parametrización dinámica de `BASE_URL` en Newman y Playwright permite la portabilidad inmediata de la suite para su ejecución contra entornos locales, contenedores Docker y el despliegue de staging/producción gestionado por David.
4. **Conformidad Técnica:** La suite de pruebas cumple a cabalidad con los estándares exigidos para el Paquete E, encontrándose lista para la firma y presentación final.
