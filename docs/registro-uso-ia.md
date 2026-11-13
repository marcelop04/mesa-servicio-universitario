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

Este archivo permite agregar entradas de cada integrante sin reemplazar sus bitácoras.
Las verificaciones y resultados de participantes deben provenir de ejecuciones/personas reales.

| Fecha | Responsable | Herramienta | Prompt / propósito | Resultado generado | ¿Se utilizó? | Validación realizada | Modificaciones realizadas / pendientes |
|---|---|---|---|---|---|---|---|
| 12/11/2026 | David | OpenCode (asistente de programación) | Implementar paquete B del reparto desde main: nube/HTTPS, ambientes, GHCR/CD, respaldo, usuarios y manual con servicios gratuitos | Terraform OCI, Compose/Caddy, perfiles, workflows, herramientas RNF11/SUS/responsive y documentación | Sí | JUnit, Python, ShellCheck, actionlint, Terraform, Compose/Caddy; MySQL real y RNF11 aprobados en CI del PR #4 | Se corrigieron rutas ShellCheck en Docker y healthcheck IPv4; A1 quedó bloqueada por capacidad |
| 12/11/2026 | David | OpenCode (asistente de programación) | Usar los créditos Free Trial para publicar la demo universitaria y entregar una URL web | Modo opt-in E5, transporte SSH compartido y entrega demo condicionada a CI | Sí | Promoción ACTIVE/FREE_TRIAL consultada, E5 creada, Terraform/ShellCheck/actionlint validados, Docker/SSH listos | Se separa bootstrap demo de CD main; HTTPS, recuperación en VM y sesiones reales se registran al ejecutarse |
| 12/11/2026 | David | OpenCode (asistente de programación) | Verificar la publicación real y revisar responsive con todos los roles | Smoke de TLS/cookies/sesión y capturas de la URL pública | Sí | 8 pruebas Python aprobadas, smoke HTTPS con login/perfil/logout aprobado, 32 capturas web sin desbordes/5xx | El detector asumía un elemento `root`; se cambió a parsear la raíz real `raiz` y el módulo compilado con dos pruebas de regresión |

No se generaron respuestas SUS ni se simularon participantes como evidencia de validación.
Para el paquete A, Emanuel ya mantiene su registro detallado en `fase-iii-iv-emanuel.md`.

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


## Registros del paquete D · Observabilidad y Telemetría (Gabriel)

### IA-D-01 · Configuración de métricas y tracing con Spring Boot 3.5 y OpenTelemetry

| Campo | Valor |
|---|---|
| Fecha | 12/11/2026 |
| Responsable | Gabriel Salazar (Paquete D) |
| Herramienta | DeepMind Antigravity (Gemini 3.8 Flash) |
| Prompt exacto | Configurar Actuator, Micrometer Prometheus y OpenTelemetry con exporter OTLP en Spring Boot 3.5 con histogramas percentiles |
| Resultado generado | Bloque YAML de management, percentiles HTTP y dependencias de métricas y tracing |
| ¿Se utilizó? | Sí |
| Validación realizada | Verificación de endpoint `/actuator/prometheus`, Java 17, suite `ObservabilidadTest` aprobada |
| Modificaciones manuales | Se fijó la propiedad `opentelemetry.version` (1.43.0) y se eliminaron atributos no estándar de Actuator |

### IA-D-02 · Logs JSON con correlación y enmascaramiento de secretos

| Campo | Valor |
|---|---|
| Fecha | 12/11/2026 |
| Responsable | Gabriel Salazar (Paquete D) |
| Herramienta | DeepMind Antigravity (Gemini 3.8 Flash) |
| Prompt exacto | Diseñar logback-spring.xml con LogstashLogbackEncoder enmascarando contraseñas y tokens en JSON con idCorrelacion y traceId |
| Resultado generado | Encoder JSON en consola con `MaskingJsonGeneratorDecorator` y campos `idCorrelacion`, `traceId`, `spanId` |
| ¿Se utilizó? | Sí |
| Validación realizada | Inspección de salida en consola Docker, limpieza de MDC en bloque `finally` y prueba `errorNoExponeSecretosNiTokens` |
| Modificaciones manuales | Se estandarizaron claves en español y perfil `dev` para texto legible en desarrollo local |

### IA-D-03 · Reglas de alerta Prometheus y dashboard de Grafana

| Campo | Valor |
|---|---|
| Fecha | 12/11/2026 |
| Responsable | Gabriel Salazar (Paquete D) |
| Herramienta | DeepMind Antigravity (Gemini 3.8 Flash) |
| Prompt exacto | Diseñar reglas de alerta en Prometheus (5xx, latencia p95 y vencidos) y dashboard JSON de Grafana con provisioning |
| Resultado generado | Archivo `alertas.yml` con 3 reglas PromQL y `msu-dashboard.json` para aprovisionamiento automático |
| ¿Se utilizó? | Sí |
| Validación realizada | Disparo y resolución de alertas en `http://localhost:9090/alerts` y verificación de paneles en `:3000` |
| Modificaciones manuales | Se ajustó umbral de errores 5xx a `> 0.05 req/s`, se filtró tráfico actuator en p95 y se separó métrica simulada de real |

### IA-D-04 · Hardening de docker-compose y seguridad de endpoints de simulación

| Campo | Valor |
|---|---|
| Fecha | 12/11/2026 |
| Responsable | Gabriel Salazar (Paquete D) |
| Herramienta | DeepMind Antigravity (Gemini 3.8 Flash) |
| Prompt exacto | Hardening de docker-compose y seguridad de endpoints de simulación de incidentes RNF08 |
| Resultado generado | Restricción de puertos a `127.0.0.1`, OTLP interno, `@ConditionalOnProperty` y restricción a rol ADMIN |
| ¿Se utilizó? | Sí |
| Validación realizada | Pruebas de simulación rechazadas sin rol de administrador y verificación de puertos locales con `netstat` |
| Modificaciones manuales | Se eliminaron mutaciones por GET, se añadieron límites estrictos de parámetros y recuperación explícita |
