# Presentación Final del Proyecto · Mesa de Servicios Universitarios

**Universidad Nacional Mayor de San Marcos**  
**Facultad de Ingeniería de Sistemas e Informática**  
**Curso:** Taller de Construcción de Software Web (Semestre 2026-II)

---

## Diapositiva 1: Carátula

- **Título:** Mesa de Servicios Universitarios con Gestión de Plazos de Atención
- **Subtítulo:** Sistema web integral para la radicación, asignación, resolución y supervisión de trámites académicos y administrativos
- **Integrantes:**
  - Marcelo Ruiz — Coordinación, Paquete C (Seguridad y Revisión de Calidad)
  - Emanuel Silva — Paquete A (Políticas, Encuestas y Auditoría)
  - David Torres — Paquete B (Nube, CI/CD y RNF11)
  - Gabriel Salazar — Paquete D (Observabilidad, Telemetría y RNF08)
  - Alex Huamán — Paquete E (Pruebas)
- **Docente:** Mg. Carlos Alarcón

---

## Diapositiva 2: Contexto y Problemática

- **Situación actual:**
  - Canales dispersos (correo, mesa de partes física, formularios aislados).
  - Tiempos de atención indeterminados y falta de notificaciones oportunas.
  - Ausencia de métricas objetivas de cumplimiento de plazos para supervisores.
- **Solución propuesta:**
  - Mesa de ayuda centralizada y transparente.
  - Motor de políticas de plazos de atención por categoría y prioridad.
  - Observabilidad continua y trazabilidad de extremo a extremo.

---

## Diapositiva 3: Arquitectura Técnica General

- **Backend:** Spring Boot 3.5.16, Java 17, JPA/Hibernate, Spring Security.
- **Frontend:** React 18, TypeScript, Tailwind CSS, Vite.
- **Persistencia:** MySQL 8 con volúmenes persistentes y aislamiento transaccional.
- **Seguridad:** JWT en cookies seguras (`HttpOnly`, `SameSite=Lax`), CSRF tokenizado, RBAC (4 roles).
- **Observabilidad:** Actuator, Prometheus, Jaeger (OTLP HTTP), Grafana.
- **Infraestructura:** Docker Compose, Nginx, Caddy con TLS automatizado, OCI Always Free.

---

## Diapositiva 4: Paquete C · Seguridad y Revisión de Calidad (Marcelo)

- **Principio de menor privilegio (RNF02):**
  - Roles institucionales: `SOLICITANTE`, `TECNICO`, `SUPERVISOR`, `ADMINISTRADOR`.
  - Protección de rutas web y de endpoints API mediante filtros de Spring Security.
- **Gestión de Sesión:**
  - Tokens JWT con clave secreta segura entregada por variables de entorno.
  - Cookies resistentes a exfiltración XSS (`HttpOnly`, `Secure`).
  - Cabecera `X-XSRF-TOKEN` obligatoria en operaciones mutantes.
- **Cabeceras de hardening:** CSP, HSTS, Referrer-Policy, Permissions-Policy.
- **Análisis estático:** CodeQL (SAST), OWASP Dependency-Check (SCA), npm audit.

---

## Diapositiva 5: Paquete A · Políticas, Encuestas y Auditoría (Emanuel)

- **Políticas de SLA:**
  - Configuración paramétrica de plazos máximos en horas hábiles.
  - Alerta preventiva ante proximidad de vencimiento de trámites.
- **Encuestas de Calidad:**
  - Medición de satisfacción del usuario post-atención (escala Likert 1 a 5).
  - Comentarios cualitativos para retroalimentación de las dependencias.
- **Auditoría inmutable:**
  - Registro de cada cambio de estado, reasignación o ajuste de prioridad con usuario y fecha.

---

## Diapositiva 6: Paquete B · Nube, CI/CD y Recuperación (David)

- **Despliegue en OCI Always Free:**
  - VM Ubuntu ARM con Docker Compose, Caddy (HTTPS automático) y MySQL 8.
  - Perfiles Spring (`dev`, `prueba`, `prod`) con secretos en GitHub Secrets.
- **Pipeline de Integración Continua (CI):**
  - Validación de backend (Maven / JUnit) y frontend (React / Vite / Vitest).
  - Análisis estático con ShellCheck, actionlint y validación de Compose/Terraform.
- **Despliegue Continuo (CD):**
  - Imágenes multicapa publicadas en GHCR desplegadas por digest.
  - Smoke HTTPS externo valida cada entrega registrada.
- **Respaldo y Recuperación (RNF11):**
  - Script automatizado de backup consistente (dump SQL + archivos binarios).
  - Ensayo de restauración verificado con SHA-256 ante corrupción de datos.

---

## Diapositiva 7: Paquete D · Observabilidad y Telemetría (Gabriel)

- **Los Tres Pilares de Observabilidad:**
  1. **Métricas:** Prometheus recolecta histogramas percentiles HTTP y solicitudes vencidas (`msu_solicitudes_vencidas`).
  2. **Logs JSON Estructurados:** Emisión en consola con `idCorrelacion`, `traceId`, `spanId` y enmascaramiento estricto de secretos (RNF02).
  3. **Trazabilidad Distribuida:** OpenTelemetry y Jaeger mapean la cascada completa de ejecución y tiempos internos.
- **Tablero Grafana unificado:**
  - Aprovisionamiento automatizado de paneles y datasources (`docker-compose.observabilidad.yml`).
  - Visualización en tiempo real de tasa de fallos, latencia percentil 95 y casos fuera de plazo.

---

## Diapositiva 8: Paquete D · Simulacro de Incidente RNF08 (Gabriel)

- **Objetivo RNF08:** Diagnóstico rápido y trazabilidad ante incidentes en menos de 5 minutos.
- **Flujo del Simulacro:**
  1. **Inyección controlada:** Petición con error HTTP 500 propagando `X-Correlation-Id`.
  2. **Diagnóstico en logs:** Identificación del evento en log JSON vía `idCorrelacion` y extracción de `traceId`.
  3. **Rastreo en Jaeger:** Ubicación de la traza distribuida y componente causante de la excepción.
  4. **Detección por alertas:** Activación de regla `TasaErroresHttp5xxAlta` en Prometheus (`FIRING`).
  5. **Hardening de seguridad:** Endpoints de diagnóstico deshabilitados por defecto y protegidos por rol `ADMINISTRADOR`.
  6. **Recuperación:** Restablecimiento del servicio y normalización de alertas a estado `INACTIVE`.

---

## Diapositiva 9: Paquete E · Pruebas del Sistema (Alex)

- **Pruebas automatizadas:**
  - Suite JUnit del backend y pruebas del frontend con Vitest.
  - Recorridos completos del flujo de solicitudes por rol.
- **Pruebas de usuario:**
  - Protocolo System Usability Scale (SUS) con participantes reales.
  - Evaluación de usabilidad y detección de defectos.
- **Pruebas responsive:**
  - Verificación a 360 px (móvil) y 1366 px (escritorio) de todas las vistas.

---

## Diapositiva 10: Conclusiones

- Se entregó una plataforma completa, funcional y alineada a los estándares de la UNMSM.
- Se cumplieron al 100 % los requisitos no funcionales prioritarios:
  - **RNF02:** Seguridad robusta, autenticación JWT, RBAC y no exposición de secretos.
  - **RNF08:** Observabilidad integral, correlación distribuida y diagnóstico de incidentes.
  - **RNF10:** Integración y entrega continua con compuertas de calidad automáticas.
  - **RNF11:** Respaldo y recuperación consistente y comprobada.
- Código limpio, desacoplado y documentado, listo para su puesta en marcha y evaluación final.
