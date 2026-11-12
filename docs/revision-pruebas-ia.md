# Auditoría y Validación de Pruebas Generadas con IA

**Proyecto:** Mesa de Servicios Universitarios (MSU)  
**Autor:** Alex (Ingeniero QA / SDET)  
**Fecha:** 12/11/2026  
**Alcance de la auditoría:** Pruebas unitarias/integración (JUnit 5 backend), pruebas de componentes (Vitest frontend), suite de API (Postman/Newman), suite de aceptación (Playwright E2E) y pruebas de rendimiento (k6).

---

## 1. Criterios de Evaluación y Calidad de Pruebas

Para garantizar que el software no cuente con pruebas «placebo» o cobertura engañosa, cada prueba fue sometida a cuatro filtros de control riguroso:
1. **Verificabilidad Real:** Confirmación de ejecución efectiva en el entorno real (Spring Boot + MySQL + React/Nginx).
2. **Sensibilidad a Fallos (Mutation Testing Manual):** Comprobación de que la prueba falla inequívocamente al introducir una mutación temporal en la lógica de negocio (luego revertida).
3. **Ausencia de Aserciones Tautológicas:** Verificación de que las pruebas no afirmen obviedades que siempre pasan (ej. `expect(true).toBe(true)`, `assertNotNull(response)` sin validar payload, etc.).
4. **Independencia y Determinismo:** Eliminación de `sleep` frágiles fijos y desacoplamiento de IDs numéricos fijos en base de datos.

---

## 2. Tabla de Revisión y Verificación de Pruebas

| Suite / Prueba | Qué verifica | ¿Se ejecutó? | ¿Falla al romper lógica a propósito? | Observaciones y Hallazgos de Calidad | Revisado por Alex |
| :--- | :--- | :---: | :---: | :--- | :---: |
| **JUnit: ReglasDePlazosTest** | Matriz 3×3 de impacto/urgencia (Tabla 5) y plazos en horas corridas (RN02) | **Sí** (13 tests) | **Sí** (Se mutó ALTO/ALTA de CRITICA a BAJA; fallo con `AssertionFailedError: expected CRITICA but was BAJA`). Revertido. | Excelente parametrización con `@CsvSource`. No contiene aserciones tautológicas. Valida excepciones ante nulos y entradas inválidas. | |
| **JUnit: SolicitudesTest** | Creación, numeración correlativa `MSU-YYYY-XXXX`, validación DTO y reglas de negocio | **Sí** (22 tests) | **Sí** (Se alteró la regla de longitud mínima de descripción < 10 chars y falló en validación 400). Revertido. | Prueba unitaria e integración con H2 en modo MySQL. Maneja estados inmutables y transiciones de la tabla 4. | |
| **JUnit: AtencionTest** | Flujo técnico de inicio de atención (`HU10`), registro de solución (`HU11`) y control 72h | **Sí** (18 tests) | **Sí** (Se rompió la validación de solución < 20 chars; el test rechazó la mutación). Revertido. | Cubre bloqueo por rol (403 para usuarios no asignados) y versionado optimista (`@Version`). | |
| **JUnit: AutenticacionTest** | Emisión de cookie HttpOnly `MSU_SESION`, rotación de CSRF y revocación de JWT | **Sí** (15 tests) | **Sí** (Se desactivó la rotación de CSRF en el test y falló la aserción de seguridad). Revertido. | Valida que contraseñas no se retornen en texto plano ni en payloads ni en trazas de error. | |
| **JUnit: EncuestaTest** | Registro de calificación (1-5 estrellas), unicidad de encuesta y bloqueo de duplicados | **Sí** (12 tests) | **Sí** (Se permitió duplicar encuesta y el test falló con `DataIntegrityViolationException`). Revertido. | Verifica que la encuesta sea opcional y no afecte el estado `CERRADA` del caso. | |
| **Vitest: solicitudes.test.jsx** | Renderizado de Mis Solicitudes, persistencia de filtros en LocalStorage y etiquetas SLA | **Sí** (14 tests) | **Sí** (Se alteró la clave de LocalStorage y el componente falló al recuperar filtros). Revertido. | Verificación de accesibilidad básica en tablas y captions para lectores de pantalla. | |
| **Vitest: Atencion.test.jsx** | Formulario de solución técnica, contador de caracteres (20-2000) y confirmación | **Sí** (10 tests) | **Sí** (Se forzó envío con 15 caracteres y el validador cliente impidió submit). Revertido. | Buen manejo de mocks para llamadas asíncronas con `useConsulta`. | |
| **Newman: Auth & CSRF (`@HU02`)** | Flujo de handshake CSRF (`GET /auth/csrf`), cookie `MSU_SESION` y login con JWT | **Sí** (59 reqs / 173 asserts) | **Sí** (Se removió el header `X-XSRF-TOKEN` en la colección; Spring Security arrojó 403 Forbidden). Revertido. | Scripts pre-request y post-response dinámicos sincronizan tokens sin credenciales quemadas. | |
| **Newman: RBAC (`403 Forbidden`)** | Bloqueo estricto cuando un Solicitante intenta acceder a endpoints de Supervisión o Admin | **Sí** (59 reqs / 173 asserts) | **Sí** (Se cambió el rol del token a SUPERVISOR y la aserción `status === 403` falló). Revertido. | Evita cobertura nominal: evalúa matrices de denegación por cada rol institucional. | |
| **Playwright: Auth (`@HU01`, `@HU02`)** | Registro público, redirección a login, credenciales inválidas y cookie HttpOnly | **Sí** (6 tests: desktop/mobile) | **Sí** (Se alteró la clave esperada en el formulario y falló en verificación de error visible). Revertido. | Valida mediante `page.evaluate()` que JavaScript del cliente NO pueda leer la cookie `MSU_SESION`. | |
| **Playwright: Supervisión (`@HU07`, `@HU08`)** | Priorización con motivo obligatorio, asignación de técnico y balance de carga | **Sí** (4 tests: desktop/mobile) | **Sí** (Se omitió el motivo de cambio de prioridad y el botón quedó bloqueado con fallo de timeout). Revertido. | Filtra por estado `REGISTRADA` antes de evaluar, evitando acoplamiento entre corridas secuenciales. | |
| **Playwright: RNF05 (No desborde 360px)** | Verificación de desborde horizontal (`scrollWidth <= innerWidth`) en móvil | **Sí** (14 pantallas móviles) | **Sí** (Se inyectó un div con width 500px y el helper `expectSinDesbordeHorizontal` falló inmediatamente). Revertido. | Garantiza cumplimiento estricto de accesibilidad en pantallas compactas sin depender de emuladores imprecisos. | |
| **k6: Carga Sostenida (RNF06)** | 20 VU sostenidos durante 60s, p95 < 1s en lecturas y p95 < 2s en escrituras | **Sí** (1,803 reqs) | **Sí** (Se redujo intencionalmente el timeout a 5ms y k6 marcó fallo de umbral). Revertido. | Utiliza `CookieJar` aislado para evitar fuga de tokens entre usuarios virtuales. Cero logins en el bucle principal. | |
| **k6: Estrés Escalonado** | Rampa escalonada 20 -> 50 -> 100 -> 200 -> 400 VU y cooldown a 20 VU | **Sí** (17,087 reqs) | **Sí** (Se evaluó criterio de quiebre > 5% de error y latencia p95 > 5s). | Identificó punto de degradación en 400 VU (pico de 5.2s) con 0% fallos HTTP y recuperación inmediata. | |

---

## 3. Patrones Antipatrón Detectados y Mitigados

### 3.1. Eliminación de `sleep` Arbitrarios en Playwright
- **Problema detectado:** En pruebas iniciales basadas en el script prototipo se observaban llamadas a `waitForTimeout(400)` o retardos fijos que causaban fragilidad ante variaciones de CPU.
- **Acción tomada:** Se reemplazaron todos los tiempos de espera fijos por **esperas explícitas basadas en estado del DOM** (`expect(locator).toBeVisible({ timeout: ... })`, `waitForURL()`, `waitForResponse()`).

### 3.2. Aislamiento de Identificadores y Eliminación de Acoplamiento de Datos
- **Problema detectado:** Pruebas que hardcodeaban IDs fijos (ej. `/solicitudes/1`, `/solicitudes/2`) fallaban ante regeneraciones de base de datos o si el registro cambiaba de estado en la prueba anterior.
- **Acción tomada:** Tanto en Playwright como en k6 se implementó **descubrimiento dinámico**: los IDs de caso se obtienen en el paso previo mediante filtros (`GET /solicitudes?estado=REGISTRADA`) o se captura el código generado en vivo (`MSU-YYYY-XXXX`).

### 3.3. Detección de Aserciones Tautológicas
- **Problema analizado:** Tests que validan únicamente códigos HTTP 200 sin corroborar el cuerpo de la respuesta o campos calculados.
- **Acción tomada:** En Newman y Playwright se incorporaron verificaciones semánticas profundas (ej. formato correlativo del código, presencia de `X-Correlation-Id`, coincidencia de roles y cálculo de límites de SLA).

---

## 4. Conclusiones de la Auditoría de Pruebas

1. **Robustez y Sensibilidad:** Todas las pruebas auditadas reaccionan negativamente ante regresiones deliberadas de código y validación.
2. **Determinismo:** La suite completa puede ejecutarse de manera repetida e idempotente sin dejar basura en la base de datos gracias a los scripts de limpieza y aislamiento por prefijo `[CARGA]`.
3. **Firma y Aprobación:** La tabla anterior incluye la evidencia técnica recabada; la columna «Revisado por Alex» queda reservada para la firma y conformidad manual del estudiante responsable del Paquete E.
