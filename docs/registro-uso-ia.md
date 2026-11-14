# Registro de uso de IA · fases III y IV

Este archivo registra el aporte C. Gabriel consolida el registro del equipo con los registros anteriores
conservados en documentos y avances. No sustituye una revisión humana ni atribuye a Marcelo acciones aún no realizadas.

## IA-C-01 · Seguridad y revisión de calidad

| Campo | Valor |
|---|---|
| Fecha | 11/11/2026 |
| Herramienta | OpenCode, asistente GPT-6.1 Sol (OpenAI) |
| Prompt / alcance | Implementar únicamente el paquete C de Marcelo conforme a la rúbrica y reparto; consultar decisiones críticas; explicar herramientas, cuentas, pruebas y dependencias del equipo |
| Decisiones consultadas | CodeQL en repo público; retirar secretos por defecto; limitador de una instancia 5/15 min; herramientas oficiales portátiles; migraciones de dependencias por hallazgos de seguridad |
| Resultado generado | Controles de seguridad backend/Nginx, configuración CI/SAST/SCA/DAST, pruebas negativas y regresión, scripts locales, checklist/revisión/guía e informe consolidado con pendientes |
| ¿Se utilizó? | Incorporado a esta copia local; no se hizo commit ni push. Su aceptación requiere revisión de Marcelo/equipo |
| Validación automática | Pruebas JUnit/Vitest, build y npm audit; comprobaciones de scripts. Detalles y resultados reales en `docs/seguridad/resultados-locales.md` |
| Limitaciones de la validación inicial | Sin prueba de despliegue HTTPS ni ZAP; CodeQL sin ejecutar en GitHub; consulta NVD falló sin API key; Docker aún no disponible entonces. Actualizaciones posteriores en IA-C-03 y resultados locales; no se inventaron resultados |
| Modificaciones tras revisar | Actualización de paquetes vulnerables aprobada; reglas 400/415; mensajes/logs sin secretos; sanitización de listas y arreglos; contadores concurrentes/acotados; compatibilidad de credenciales en recorridos |
| Responsable de revisión y entrega | Marcelo; revisión humana de código, asserts y resultados pendiente de registrar por él |

## Revisión humana a completar (Marcelo)

- [ ] Entendí la diferencia entre SAST, SCA y DAST y los límites de cada prueba.
- [ ] Revisé que la matriz de roles y los rechazos coincidan con la especificación.
- [ ] Revisé los cambios compartidos con sus responsables y probé el arranque de mi entorno.
- [ ] Ejecuté y revisé personalmente las pruebas, CI y hallazgos de escáneres.
- [ ] No incluí secretos, tokens ni información real en evidencias.
- [ ] Completé mi sección con fecha, resultados y validación antes de la entrega.

## IA-C-02 · Lanzador privado de Dependency-Check

| Campo | Valor |
|---|---|
| Fecha | 11/11/2026 |
| Herramienta | OpenCode, asistente GPT-6.1 Sol (OpenAI) |
| Prompt / problema | Marcelo pegó instrucciones dentro de la entrada oculta de Read-Host y solicitó automatizar la ejecución de NVD sin manipular comandos de secretos por separado |
| Resultado | `scripts/analizar-dependencias.ps1`, pruebas aisladas con Maven simulado e instrucciones simplificadas |
| Protección | Entrada oculta, rechazo de entradas vacías/código pegado, clave solo en entorno del proceso, restauración de entorno y ubicación; sin clave en argumentos o archivos |
| Validación | Cinco casos simulados aprobados: vacío, espacios, comando pegado, ejecución correcta y fallo de Maven; incluyendo avisos por stderr y comprobación de que no se imprimen claves ficticias |
| Corrección tras probar | Se verificó que stderr no se confunda con un fallo de Maven y que el código de salida nativo no quede oculto por una variable local |
| Límite | No se utilizó una clave real ni se consultó NVD en estas pruebas simuladas. Marcelo ejecutó después el análisis real; véase IA-C-03. Revisión humana pendiente |
| Responsable | Marcelo, con ejecución asistida; revisión humana pendiente |

## IA-C-03 · Correcciones tras el análisis Java real

| Campo | Valor |
|---|---|
| Fecha | 11/11/2026 (UTC−05; reportes JSON del 12/11 en UTC) |
| Herramienta | OpenCode, asistente GPT-6.1 Sol (OpenAI) |
| Prompt / alcance | Revisar el fallo de Dependency-Check antes de subir el aporte C a una rama; corregir hallazgos dentro del alcance y consultar cambios críticos |
| Evidencia de entrada | Marcelo ejecutó el lanzador privado y descargó NVD; análisis completado con hallazgos. Se conservaron HTML/JSON iniciales antes de repetir |
| Resultado | Parches Commons Lang, Jackson, Log4j, Connector/J, Tomcat y springdoc/Swagger; Boot 3.5/Java 17 conservados; prueba nueva de los recursos Swagger y documentación actualizada |
| Validación | 155 tests y empaquetado correctos; JDBC 26.10.0 conecta con MySQL 8.0.46 mediante consulta de solo lectura. Nuevo Dependency-Check con la misma base NVD recién descargada: 68 → 23 CVE distintos; 33 → 15 CVE con alguna puntuación ≥ 7; control sigue fallando |
| Límites / decisiones no tomadas | Sin migración mayor ni supresiones nuevas, sin cambiar CVSS/failOnError, sin tocar la tarea A4 de Emanuel, sin reconstruir Docker con este último POM, sin Git/push ni CI remoto |
| Pendiente humano | Revisar aplicabilidad por CVE o aprobar una migración coordinada, corregir A4 con su responsable y revisar los cambios antes del PR. [Evidencias y fuentes](seguridad/analisis-dependencias.md) |

## IA-C-04 · Preparación de rama y revisión previa a publicar

| Campo | Valor |
|---|---|
| Fecha | 12/11/2026 |
| Herramienta | OpenCode, asistente GPT-6.1 Sol (OpenAI) |
| Prompt / alcance (resumen) | Marcelo autoriza preparar/publicar su avance C en una rama propia, contrastar el main actual, evitar secretos/datos personales y respetar el reparto y los documentos del curso |
| Resultado generado | Traslado selectivo al clon `mesa-servicio-marcelo`, rama `feat/marcelo-seguridad`; corrección del enlace del repositorio; trazabilidad C1–C6, preparación de commit/PR y documentación de límites |
| ¿Se utilizó? | Incorporado y publicado en `feat/marcelo-seguridad`, commit de implementación `55732c8`; no se integró a main |
| Validación | Base Git coincidente sin archivos faltantes; 155 pruebas backend y empaquetado; 80 frontend, build y npm audit sin vulnerabilidades; 5 pruebas del lanzador; cabeceras HTTP y demo 401 × 5 → 429; Gitleaks del diff sin hallazgos y comparación privada con los secretos locales |
| Modificaciones tras revisar | Lista explícita de transferencia; exclusión de datos/compilados/reportes; identidad pública no-reply; documentación diferencia pruebas locales, SCA bloqueante, despliegue y evidencias remotas |
| Límites | No se resolvieron mediante supresión los 23 CVE de Spring; no hubo migración mayor, corrección de A4, cambios a main, infraestructura cloud ni resultados ZAP/CodeQL inventados. `nginx -t` no ejecutado por falta de CLI Docker |
| Responsable | Marcelo; revisión humana pendiente. La IA no firma por él ni sustituye su comprensión del aporte |

## IA-C-05 · Revisión de evidencias remotas de C2

| Campo | Valor |
|---|---|
| Fecha | 12/11/2026 |
| Herramienta | OpenCode, asistente GPT-6.1 Sol (OpenAI) |
| Prompt / alcance (resumen) | Avanzar lo verificable de C sin suponer datos faltantes; revisar CodeQL, CI y el estado de la rama, consultando las decisiones pendientes |
| Resultado generado | `docs/seguridad/resultados-ci.md` y actualización de estado, checklist e informe con evidencia real, identificadores, alcance y hashes |
| ¿Se utilizó? | Incorporado a la rama C para actualizar el PR borrador; no se integra a main |
| Validación realizada | Consulta API y descarga de SARIF: Java y JavaScript con 0 resultados, sin error, sin alertas abiertas en la referencia analizada; logs CI: 155 pruebas backend y 80 frontend; artifacts: npm audit 0 y Dependency-Check 23 CVE, 15 bloqueantes, 0 suprimidos |
| Modificaciones tras revisar | Se sustituyó el estado obsoleto «CodeQL pendiente» por el resultado de esa ejecución, sin confundir SAST sin resultados con SCA aprobado. Se identificó el head/merge de prueba para no atribuir el resultado a futuras versiones |
| Límites | Sin nueva implementación ni migración, sin supresiones, sin escaneo de URL supuesta, sin atribuir revisión humana a Marcelo. Los reportes completos y credenciales no se publican |
| Información pendiente | Decisión de tratamiento de Spring con el equipo; URL HTTPS, versión y autorización de David para C3; secciones verificadas para C6 |
| Responsable | Marcelo; debe revisar el registro y las decisiones antes del cierre |
## Registros del paquete B conservados desde main

**Proyecto:** Mesa de Servicios Universitarios (MSU)  
**Curso:** Taller de Construcción de Software Web  
**Equipo:** Emanuel, David, Marcelo, Gabriel, Alex  
**Ciclo:** 2026-II

| Fecha | Responsable | Herramienta | Prompt / propósito | Resultado generado | ¿Se utilizó? | Validación realizada | Modificaciones realizadas / pendientes |
|---|---|---|---|---|---|---|---|
| 12/11/2026 | David | OpenCode (asistente de programación) | Implementar paquete B del reparto desde main: nube/HTTPS, ambientes, GHCR/CD, respaldo, usuarios y manual con servicios gratuitos | Terraform OCI, Compose/Caddy, perfiles, workflows, herramientas RNF11/SUS/responsive y documentación | Sí | JUnit, Python, ShellCheck, actionlint, Terraform, Compose/Caddy; MySQL real y RNF11 aprobados en CI del PR #4 | Se corrigieron rutas ShellCheck en Docker y healthcheck IPv4; A1 quedó bloqueada por capacidad |
| 12/11/2026 | David | OpenCode (asistente de programación) | Usar los créditos Free Trial para publicar la demo universitaria y entregar una URL web | Modo opt-in E5, transporte SSH compartido y entrega demo condicionada a CI | Sí | Promoción ACTIVE/FREE_TRIAL consultada, E5 creada, Terraform/ShellCheck/actionlint validados, Docker/SSH listos | Se separa bootstrap demo de CD main; HTTPS, recuperación en VM y sesiones reales se registran al ejecutarse |
| 12/11/2026 | David | OpenCode (asistente de programación) | Verificar la publicación real y revisar responsive con todos los roles | Smoke de TLS/cookies/sesión y capturas de la URL pública | Sí | 8 pruebas Python aprobadas, smoke HTTPS con login/perfil/logout aprobado, 32 capturas web sin desbordes/5xx | El detector asumía un elemento `root`; se cambió a parsear la raíz real `raiz` y el módulo compilado con dos pruebas de regresión |
| 12/11/2026 | David | OpenCode (asistente de programación) | Completar entrega, respaldo y evidencias del paquete B | Imágenes GHCR por digest, entrega HTTPS y ensayo de recuperación en VM; actualización del manual/informe | Sí | CI/entrega aprobados, MySQL y archivo recuperados en proyecto aislado, cuatro SHA-256 de copia externa coinciden, timer activo | Se documentan los resultados reales y las dependencias de revisión de main y de cinco participantes SUS |
| 12/11/2026 | David | OpenCode (asistente de programación) | Revisar correcciones de prod y evidenciar el flujo definitivo | Validación de entorno antes de transferir, builds nativos portables, gate CI/CodeQL y formulario CSV SUS | Sí | 5 pruebas Java de prod/guard aprobadas, 77 Vitest y 15 Python; reglas efectivas de rama consultadas por API | Se incorpora idéntico el VerificadorSeguridad de Marcelo (PR #3); no se atribuye ni se declara integrado el resto de C. Se rechaza prod con siembra; el ejemplo de cinco registros se marca SIMULADO y no acredita B5 |
| 12/11/2026 (13/11 UTC) | David | OpenCode (asistente de programación) | Continuar la integración y resolver el bloqueo real de CI antes de CD main | Integración de main con PR #3/#7; precisión de fecha de políticas; fuente NIST por feeds 2.0 en CI y propuesta de ocho checks | Sí | Backend/frontend/CodeQL del PR aprobados; API NVD falló con HTTP 503; descarga nueva de todos los feeds y análisis Dependency-Check local aprobado | Se conserva CVSS ≥ 7, failOnError, actualización automática y excepciones existentes. La propuesta de reglas no se aplicó por falta de permisos; falta ejecución definitiva de CI/CD |
| 13/11/2026 UTC | David | OpenCode (asistente de programación) | Completar la entrega tras la integración del PR #8 y registrar resultados comprobados | Evidencia CD main `df8cc39`, actualización de manual/informe/guion, capturas finales y copia externa | Sí | CI/CodeQL/CD aprobados; etiquetas de revisión y prod sin siembra verificados por SSH; sesión HTTPS, 32 capturas de roles y dos de SUS aprobadas; cuatro SHA-256 de nueva copia externa OK | `production` fue creado por el workflow sin reglas adicionales; se registran cinco alertas abiertas de `prototipo/` para revisión de Marcelo. Cinco sesiones SUS reales y ajustes administrativos siguen pendientes; no se respondieron cuestionarios técnicos como si fueran personas |

No se generaron respuestas SUS ni se simularon participantes como evidencia de validación.
Para el paquete A, Emanuel ya mantiene su registro detallado en `fase-iii-iv-emanuel.md`.

## IA-B-08 · Revisión del paquete B y preparación de sesiones reales

| Campo | Valor |
|---|---|
| Fecha | 13/11/2026, America/Lima |
| Responsable | David; revisión humana de la entrega y ejecución de las sesiones pendientes |
| Herramienta | Codex, asistente de programación de OpenAI |
| Prompt / alcance | Revisar repositorio y reparto actualizado, completar B, retirar el guion individual y las respuestas de ejemplo, integrar la sección técnica y preparar el cuestionario para cinco personas |
| Resultado generado | Cuestionario web/escrito, protocolo de sesiones y cálculo sin modo de simulación; actualización del informe, manual, referencias y plantilla de checks |
| ¿Se utilizó? | Incorporado al PR de actualización del paquete B; aceptación del equipo pendiente |
| Validación realizada | Pruebas Python y frontend, compilación, revisión del formulario y consulta real de HTTPS/GitHub; resultados detallados en la bitácora B y los checks del PR |
| Modificaciones | Se registra ancho real y fecha de Lima; se exige confirmación de uso; se rechazan otras procedencias, duplicados y aplicaciones distintas. Capturas históricas conservadas por decisión del responsable |
| Límites | No se atribuyen respuestas a participantes, aprobación humana ni checks de main aplicados. Las cinco sesiones y la configuración administrativa siguen pendientes |

## IA-B-09 · Integración de los cuestionarios recibidos

| Campo | Valor |
|---|---|
| Fecha | 13/11/2026, America/Lima |
| Responsable | David; aportó los cinco CSV y declaró las notas no registradas |
| Herramienta | Codex, asistente de programación de OpenAI |
| Prompt / alcance | Incorporar los cinco CSV de sesiones entregados y comprobar si los ocho checks de main ya están activos |
| Resultado generado | Respuestas consolidadas sin cambiar valores, cálculo SUS y síntesis en protocolo, bitácora e informe; actualización de evidencia de protección |
| ¿Se utilizó? | Incorporado a la rama de resultados para su revisión mediante PR |
| Validación realizada | Cinco identificadores únicos, diez valores por persona entre 1 y 5 y mismo origen HTTPS; puntuaciones 75/95/85/90/90 y media 87/100; consulta de resumen de rama, reglas efectivas y rulesets |
| Modificaciones | La prueba de entrada vacía usa una cabecera en memoria, independiente de los datos recibidos. El cálculo prioriza viewport_real con regresión para P01; respuestas y metadatos fuente se conservan |
| Límites y pendientes | Por indicación del responsable, tareas, duraciones, ayuda y navegador constan como no registrados. Horas sin validar. Sin atribuir revisión humana no realizada. GitHub sigue mostrando checks obligatorios desactivados |

## IA-C-06 · Integración de seguridad sobre main con B

| Campo | Valor |
|---|---|
| Fecha | 12/11/2026 |
| Herramienta | OpenCode, GPT-6.1 Sol (OpenAI) |
| Prompt / alcance | Marcelo pide cambios únicamente del paquete C en su PR sobre main actualizado con B, sin inventar información ni reemplazar tareas de compañeros |
| Resultado generado | Integración C+B; defaults externos; guard prod y siembras; cabeceras/IP en Caddy; pruebas de perfiles/proxy; CI conserva SCA y B; alcance DAST con SHA; actualización del informe C6 |
| ¿Se utilizó? | Incorporado a la rama C; aceptación humana pendiente. No se fusiona a main ni se despliega |
| Validación realizada | Pruebas Java/React/Python, audit npm, Caddy/Nginx y proxy TLS local aislado; Dependency-Check con caché NVD conserva 23 CVE, 15 bloqueantes. Detalles en `docs/seguridad/integracion-main-b.md` |
| Modificaciones tras revisar | Se conservaron healthcheck, ensayos B y registros IA; prod no permite semillas demo; pruebas comprueban causas del guard y cabeceras únicas; se distingue CA local de HTTPS público |
| Límites | Sin migración mayor ni supresiones; sin ZAP no autorizado, sin corrección de A4, sin implementar D/E, sin rotar cuentas/Secrets ni atribuir firmas o validaciones humanas |
| Responsable | Marcelo: revisar código, asserts, pendientes y resultados antes del cierre |

## IA-E-01 · Automatización de pruebas, rendimiento y auditoría (Alex)

| Campo | Valor |
|---|---|
| Fecha | 12/11/2026 – 13/11/2026 |
| Responsable | Alex (Ingeniero QA / SDET); autoría, ejecución y auditoría humana completada |
| Herramienta | Asistente de ingeniería de pruebas / Antigravity |
| Prompt / alcance | Diseñar, auditar e implementar el Paquete E de aseguramiento de calidad (tareas E1 a E5); automatizar pruebas de API en Postman/Newman con CI, pruebas E2E de aceptación en Playwright con BDD, pruebas de rendimiento en k6, auditoría de pruebas generadas y redacción del informe consolidado |
| Resultado generado | Colección Newman (`MSU-API.postman_collection.json`) y runner dinámico con `BASE_URL`; suite E2E Playwright determinista para 24 HUs oficiales (`specs/01` a `06`); scripts k6 de carga (20 VU) y estrés (400 VU) con `handleSummary` sanitizado; suite Newman y de carga sobre despliegue de nube en OCI; matriz de trazabilidad y auditoría de mutación (`docs/revision-pruebas-ia.md`); informe técnico consolidado v2.2 (`docs/informe-pruebas.md`) |
| ¿Se utilizó? | Sí, incorporado en la rama `test/e5-informe-pruebas` (PR #5) y validado en ejecución local, CI remoto y sobre el despliegue en la nube de David |
| Validación realizada | Ejecución efectiva: Newman local (65 reqs / 182 asserts) y nube (13 reqs / 27 asserts, 100% pass); Playwright local (48 tests pasados) y responsivo nube (2 tests pasados); k6 local (0% error, p95 362 ms lecturas y 274 ms escrituras) y nube (414 reqs, p95 114.97 ms); pruebas de mutación manual en lógica de plazos, soluciones y concurrencia; verificación de excepciones de dependencias (PR #7) y validación de las 5 sesiones SUS reales de David (media 87/100) |
| Modificaciones tras revisar | Erradicación total del antipatrón `if (isVisible())` reemplazado por creación de fixtures deterministas (`helpers/datos.js`); intercepción y validación de stream en descarga CSV (`@HU19`); sanitización obligatoria de `setup_data` en k6 para prevenir fugas de JWT/CSRF; ajuste de trazabilidad a las 24 HUs oficiales de Fase I; manejo de sesiones dinámicas ante entornos con `DATOS_DEMO=false` |
| Límites y pendientes | El análisis DAST con OWASP ZAP permanece delimitado y pendiente de autorización previa sobre la IP pública (dependencia de Marcelo); la integración definitiva a `main` requiere la aprobación formal de revisión (peer review) por parte de un compañero de equipo |

