# Guion Consolidado de Sustentación · Demostración Integral del Sistema

**Proyecto:** Mesa de Servicios Universitarios con Gestión de Plazos de Atención  
**Asignatura:** Taller de Construcción de Software Web (UNMSM)  
**Semestre:** 2026-II  
**Duración total estimada:** 18 a 20 minutos  
**Equipo de desarrollo:**
- **Marcelo Ruiz** (Coordinación, Paquete C · Seguridad y Revisión de Calidad)
- **Emanuel Silva** (Paquete A · Políticas, Encuestas de Satisfacción y Auditoría)
- **David Torres** (Paquete B · Nube, CI/CD y RNF11)
- **Gabriel Salazar** (Paquete D · Observabilidad, Telemetría, Logs JSON y Simulacro RNF08)
- **Alex Huamán** (Paquete E · Pruebas)

---

## Estructura General del Tiempo

| Bloque | Tema | Responsable | Minutos |
|---|---|---|---|
| **1** | Presentación, problema institucional y arquitectura general | Marcelo Ruiz | 0:00 – 2:30 |
| **2** | Seguridad, autenticación JWT, RBAC y protección RNF02 (Paquete C) | Marcelo Ruiz | 2:30 – 5:30 |
| **3** | Flujo funcional: políticas, encuestas de satisfacción y auditoría (Paquete A) | Emanuel Silva | 5:30 – 8:30 |
| **4** | Despliegue en la nube, pipeline CI/CD y recuperación RNF11 (Paquete B) | David Torres | 8:30 – 11:30 |
| **5** | Observabilidad, métricas, logs JSON y simulacro RNF08 (Paquete D) | Gabriel Salazar | 11:30 – 15:30 |
| **6** | Pruebas del sistema y validación de calidad (Paquete E) | Alex Huamán | 15:30 – 18:00 |
| **7** | Conclusiones y ronda de preguntas del jurado | Todo el equipo | 18:00 – 20:00 |

---

## Bloque 1: Introducción y Arquitectura (Marcelo · 2.5 min)

> *"Buenos días/tardes, estimado profesor y jurado calificador. Presentamos el proyecto **Mesa de Servicios Universitarios**, una plataforma web concebida para modernizar la gestión, trazabilidad y resolución de trámites académicos y administrativos en la Universidad Nacional Mayor de San Marcos.*
> 
> *Tradicionalmente, las solicitudes universitarias se gestionan de manera fragmentada, sin control riguroso de tiempos de atención y con escasa visibilidad para estudiantes y docentes. Nuestro sistema resuelve esta problemática implementando un motor de políticas de plazo de atención, control de estados en tiempo real y cumplimiento estricto de requisitos no funcionales.*
> 
> *La arquitectura está dividida en:*
> 1. *Backend en **Spring Boot 3.5 con Java 17**, estructurado bajo principios limpios y pragmáticos.*
> 2. *Frontend SPA en **React 18 con TypeScript y Tailwind CSS**, con diseño adaptativo móvil y de escritorio.*
> 3. *Persistencia en **MySQL 8** con aislamiento de datos.*
> 4. *Stack de observabilidad desacoplado con **Prometheus, Jaeger y Grafana**.*
> 5. *Infraestructura reproducible mediante **Docker Compose, Caddy y Terraform**.*
> 
> *A continuación presentaré la arquitectura de seguridad y control de acceso."*

---

## Bloque 2: Seguridad y Control de Acceso · Paquete C (Marcelo · 3 min)

> *"En el componente de seguridad (Paquete C) garantizamos el cumplimiento del principio de menor privilegio y la protección de sesiones:*
> 
> *1. **Autenticación y Sesión:** Implementamos tokens JWT firmados con clave secreta robusta, transmitidos en cookies `HttpOnly`, `Secure` y `SameSite=Lax`, impidiendo el robo de credenciales mediante ataques XSS.*
> *2. **Control de Roles (RBAC):** La plataforma define cuatro roles institucionales: `SOLICITANTE` (estudiantes/docentes), `TECNICO` (resolutores), `SUPERVISOR` (asignación y reasignación) y `ADMINISTRADOR` (configuración del sistema y métricas).*
> *3. **Protección CSRF:** Cada petición mutante requiere el encabezado `X-XSRF-TOKEN`, validado por Spring Security.*
> *4. **Cabeceras de seguridad:** Content Security Policy, HSTS, Referrer-Policy y Permissions-Policy.*
> *5. **Análisis estático de vulnerabilidades:** CodeQL, Dependency-Check (OWASP SCA) y validación con npm audit.*
> 
> *(Demostración en vivo en navegador / DevTools):*
> - *Inicio de sesión exitoso con un usuario solicitante.*
> - *Inspección de las cookies en DevTools mostrando las banderas de seguridad activas.*
> - *Intento de acceso a un endpoint administrativo restringido, recibiendo HTTP 403 Forbidden.*
> 
> *Doy el pase a Emanuel para demostrar las políticas de atención."*

---

## Bloque 3: Políticas de Atención, Encuestas y Auditoría · Paquete A (Emanuel · 3 min)

> *"Gracias, Marcelo. Mi paquete extiende la plataforma con tres capacidades complementarias clave:*
> 
> *1. **Políticas de Atención Dinámicas:** Los administradores pueden configurar los plazos máximos (horas hábiles) por categoría de servicio y prioridad, permitiendo ajustar los tiempos según la carga estacional de la universidad.*
> *2. **Encuesta de Satisfacción:** Una vez que la solicitud pasa a estado final ('ATENDIDA'), el solicitante tiene acceso a una encuesta tipo Likert (1 a 5 estrellas) con comentarios cualitativos. Estas métricas alimentan los reportes de calidad del servicio.*
> *3. **Trazabilidad de Auditoría:** Cada transición de estado, reasignación o cambio de prioridad genera un registro inmutable de auditoría con usuario, timestamp y motivo del cambio.*
> 
> *Ahora David presentará el despliegue en la nube y la entrega continua."*

---

## Bloque 4: Nube, CI/CD y Recuperación · Paquete B (David · 3 min)

> *"Gracias, Emanuel. El Paquete B cubre la infraestructura de despliegue y resiliencia operativa:*
> 
> *1. **Despliegue en OCI:** Arquitectura reproducible sobre Oracle Cloud Infrastructure con VM Ubuntu ARM, MySQL 8, Spring Boot, React/Nginx y Caddy mediante Docker Compose, con TLS automático.*
> *2. **Pipeline de Integración Continua (CI):** Cada pull request a `main` ejecuta automáticamente compilación, análisis estático, suite completa de pruebas unitarias y de integración tanto en backend como frontend, garantizando cero regresiones antes del merge.*
> *3. **Despliegue Continuo (CD):** Imágenes amd64/arm64 publicadas en GHCR, desplegadas por digest mediante SSH con host verificado. Smoke test HTTPS externo valida cada entrega.*
> *4. **Ensayo de Recuperación RNF11:** Procedimiento automatizado de respaldo consistente (dump SQL + evidencias binarias) y restauración comprobada con sumas de verificación SHA-256 ante escenarios de pérdida de datos.*
> 
> *Paso el turno a Gabriel para la observabilidad del sistema."*

---

## Bloque 5: Observabilidad, Telemetría y Simulacro RNF08 · Paquete D (Gabriel · 4 min)

> *"Gracias, David. En el Paquete D hemos implementado la observabilidad integral de la plataforma, cubriendo los requisitos no funcionales **RNF08 (diagnóstico rápido de incidentes)** y **RNF02 (seguridad y no exposición de secretos)**.*
> 
> *Arquitectura de observabilidad implementada:*
> - *Métricas HTTP y de negocio mediante Spring Boot Actuator, Micrometer y Prometheus.*
> - *Trazas distribuidas con OpenTelemetry exportadas hacia Jaeger.*
> - *Logs estructurados en formato JSON con correlación (`idCorrelacion`) y enmascaramiento de secretos.*
> - *Tablero unificado en Grafana aprovisionado automáticamente.*
> 
> *(Demostración del simulacro de incidente — evidencias capturadas en `docs/evidencias/fase-iii-iv-gabriel/`):*
> 1. *Mostramos el log JSON (`04-logs-json-correlacion.png`) con `idCorrelacion`, `traceId` y enmascaramiento de secretos tras inyectar el fallo simulado.*
> 2. *En Jaeger (`03-jaeger-trazas.png`) buscamos por `traceId` y mostramos la traza en cascada con el punto exacto de la falla.*
> 3. *En Prometheus (`01-prometheus-alertas-firing.png`) visualizamos las tres alertas en estado FIRING: tasa de errores 5xx, latencia p95 y casos vencidos.*
> 4. *En Grafana (`02-grafana-dashboard.png`) mostramos el panel institucional con histogramas percentiles, tasa de fallos y solicitudes vencidas.*
> 5. *Ejecutamos la mitigación y mostramos la normalización de alertas (`05-recuperacion-errores-5xx.png`).*
> 
> *Finalmente, Alex presentará las pruebas del sistema."*

---

## Bloque 6: Pruebas del Sistema · Paquete E (Alex · 2.5 min)

> *"Gracias, Gabriel. En el Paquete E me encargo de la validación y aseguramiento de calidad del sistema:*
> 
> *1. **Pruebas unitarias y de integración:** Suite JUnit del backend y pruebas del frontend con Vitest.*
> *2. **Pruebas de aceptación:** Recorridos completos del flujo de solicitudes con los 4 roles.*
> *3. **Pruebas de usuario y SUS:** Protocolo de usabilidad con participantes reales y cuestionario System Usability Scale.*
> *4. **Pruebas responsive:** Verificación a 360 px (móvil) y 1366 px (escritorio) de todas las vistas.*
> 
> *Con esto demostramos que el sistema cumple con los requisitos funcionales y no funcionales de la rúbrica. Quedamos a disposición del jurado para sus preguntas."*

---

## Bloque 7: Conclusiones y Preguntas (Todo el equipo · 2 min)

> *"En resumen, nuestra Mesa de Servicios Universitarios cubre de extremo a extremo la gestión de trámites con plazos de atención, incluyendo seguridad, despliegue en la nube, observabilidad en tiempo real y pruebas de calidad. Agradecemos su atención y estamos disponibles para responder cualquier consulta."*
