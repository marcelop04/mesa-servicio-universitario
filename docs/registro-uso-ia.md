# Registro de Uso de Inteligencia Artificial en el Proyecto

**Proyecto:** Mesa de Servicios Universitarios (MSU)  
**Curso:** Taller de Construcción de Software Web  
**Equipo:** Emanuel, David, Marcelo, Gabriel, Alex  
**Ciclo:** 2026-II

---

## 1. Política de Uso de IA del Equipo
- El uso de asistentes de IA generativa está orientado a la aceleración de diseño de pruebas, análisis de casos límite, generación de datos de prueba y refactorización técnica.
- Todo código, script o documento generado con apoyo de IA debe ser **auditado, ejecutado y validado experimentalmente** por el integrante responsable antes de su inclusión definitiva en el repositorio.
- Queda prohibido afirmar que una prueba fue validada si no se ha ejecutado efectivamente y comprobado su sensibilidad a fallos.

---

## 2. Entradas por Integrante

### Emanuel (Paquete A - Funciones Pendientes y API)
- **Fecha:** 11/11/2026
- **Herramienta:** Asistente LLM
- **Actividades:** Apoyo en la especificación OpenAPI v3 y generación de casos borde para políticas de plazos (`HU22`).
- **Validación humana:** Revisión manual de esquemas y ejecución de 155 pruebas JUnit locales.

### Alex (Paquete E - Pruebas y Rendimiento) · *[Borrador Sugerido para Revisión y Firma de Alex]*
- **Fecha:** 12/11/2026
- **Herramienta:** Asistente LLM (Antigravity QA Agent)
- **Actividades:**
  1. Diseño e implementación de la colección de integración en Postman/Newman con 59 peticiones y pre-request scripts para extracción dinámica de cookies HttpOnly (`MSU_SESION`) y sincronización de tokens CSRF (`XSRF-TOKEN`). Runner dinámico `ejecutar-newman.js` con mapeo de `BASE_URL`.
  2. Estructuración BDD (`Dado/Cuando/Entonces`) de la suite de aceptación de Playwright Test con 48 pruebas cubriendo las 24 Historias de Usuario (HU01 a HU24) en viewports de 1366 px y 360 px (RNF05).
  3. Formulación del script de siembra SQL para 2,000 casos con distribución realista de estados y prioridades, script de limpieza idempotente, y escenarios de carga (20 VU) y estrés escalonado (hasta 400 VU) en k6 con aislamiento de `CookieJar`.
  4. Redacción de la matriz de trazabilidad (`docs/matriz-trazabilidad-hu.md`), auditoría de pruebas de IA (`docs/revision-pruebas-ia.md`) e informe consolidado de pruebas (`docs/informe-pruebas.md`).
- **Validación humana y empírica ejecutada:**
  - **Ejecución al 100 % de las suites en el entorno real:** 59 peticiones en Newman (173/173 aserciones exitosas en 6.3 s), 48 pruebas en Playwright (48/48 exitosas en 35.9 s) y 12,685 peticiones en k6 con 0.00 % de errores HTTP.
  - **Auditoría y erradicación de antipatrones:** Detección y eliminación del patrón condicional `if (await isVisible())` en Playwright que generaba falsos positivos (aprobación sin probar la acción de negocio). Creación del helper `tests/e2e/helpers/datos.js` para generación determinista de estados vía API.
  - **Validación de descarga real de archivos:** Modificación de `@HU19` para interceptar la descarga real de `solicitudes-YYYY-MM-DD.csv`, inspeccionar el flujo de bytes (stream), validar cabeceras y delimitador `;`.
  - **Sanitización de evidencias (RNF01):** Incorporación de la función `handleSummary(data)` con eliminación de `setup_data` para impedir la exposición de tokens JWT y cookies de sesión en los archivos JSON de k6.
  - **Pruebas de mutación manuales:** Alteración deliberada y comprobación de fallo en rojo en reglas de SLA (`MatrizPrioridad.java`), validación de descripción mínima y solución técnica, revirtiendo los cambios tras verificar la sensibilidad.
- **Firma / Aprobación:** *(Pendiente de firma física/manual de Alex)*

---

### Marcelo (Paquete C - Seguridad)
- **Fecha:** [TODO: Marcelo]
- **Herramienta:** [TODO: Marcelo]
- **Actividades:** [TODO: Marcelo]

---

### David (Paquete B - Nube, CD y Usabilidad)
- **Fecha:** [TODO: David]
- **Herramienta:** [TODO: David]
- **Actividades:** [TODO: David]

---

### Gabriel (Paquete D - Observabilidad y Actuator)
- **Fecha:** [TODO: Gabriel]
- **Herramienta:** [TODO: Gabriel]
- **Actividades:** [TODO: Gabriel]
