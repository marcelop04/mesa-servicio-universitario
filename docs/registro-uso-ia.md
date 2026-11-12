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

### Alex (Paquete E - Pruebas y Rendimiento) · *[Borrador Sugerido para Revisión]*
- **Fecha:** 12/11/2026
- **Herramienta:** Asistente LLM (Antigravity QA Agent)
- **Actividades:**
  1. Asistencia en la generación de la colección Postman con 59 peticiones y pre-request scripts para extracción dinámica de cookies HttpOnly (`MSU_SESION`) y sincronización de tokens CSRF (`XSRF-TOKEN`).
  2. Estructuración BDD (`Dado/Cuando/Entonces`) de la suite de aceptación de Playwright Test (14 escenarios en viewports de 1366 px y 360 px).
  3. Formulación del script de siembra SQL para 2,000 casos con distribución realista de estados y prioridades, y scripts de carga/estrés en k6 con aislamiento de `CookieJar`.
  4. Redacción de la matriz de trazabilidad (`docs/matriz-trazabilidad-hu.md`) y el informe de pruebas (`docs/informe-pruebas.md`).
- **Validación humana y empírica:**
  - Ejecución real al 100 % de las suites: 59 requests en Newman (173/173 asserts pasados), 28 tests en Playwright (28/28 pasados) y 18,890 peticiones en k6 con 0 % de fallos HTTP.
  - Pruebas de mutación manuales en `MatrizPrioridad.java` para corroborar sensibilidad a fallos.
  - Corrección de antipatrones detectados (eliminación de `sleep` frágiles, desacoplamiento de IDs y control de sesiones sin logins redundantes).
- **Firma / Aprobación:** *(Pendiente de firma de Alex)*

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

