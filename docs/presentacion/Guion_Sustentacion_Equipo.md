# Guion Consolidado de Sustentación · Demostración Integral del Sistema

**Proyecto:** Mesa de Servicios Universitarios con Gestión de Plazos de Atención  
**Asignatura:** Taller de Construcción de Software Web (UNMSM)  
**Semestre:** 2026-II  
**Duración total estimada:** 18 a 20 minutos  
**Equipo de desarrollo:**
- **Marcelo Ruiz** (Coordinación e Infraestructura Base)
- **Emanuel Silva** (Paquete A · Políticas, Encuestas de Satisfacción y Auditoría)
- **Alex Huamán** (Paquete B · Solicitudes, Bandejas Operativas y Gestión de Adjuntos)
- **David Torres** (Paquete C / Nube · Autenticación JWT, Sesión Segura, CI/CD y RNF11)
- **Gabriel Salazar** (Paquete D · Observabilidad, Telemetría, Logs JSON y Simulacro RNF08)

---

## Estructura General del Tiempo

| Bloque | Tema | Responsable | Minutos |
|---|---|---|---|
| **1** | Presentación, problema institucional y arquitectura general | Marcelo Ruiz | 0:00 – 2:30 |
| **2** | Seguridad, autenticación JWT, RBAC y protección RNF02 | David Torres | 2:30 – 5:30 |
| **3** | Flujo funcional central: radicación, bandejas y plazos | Alex Huamán | 5:30 – 9:30 |
| **4** | Políticas de atención, encuestas de satisfacción y auditoría | Emanuel Silva | 9:30 – 12:30 |
| **5** | Observabilidad, métricas, logs JSON y simulacro RNF08 | Gabriel Salazar | 12:30 – 16:30 |
| **6** | Despliegue en la nube, pipeline CI/CD y recuperación RNF11 | David Torres / Marcelo Ruiz | 16:30 – 19:30 |
| **7** | Conclusiones y ronda de preguntas del jurado | Todo el equipo | 19:30 – 20:00 |

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
> *A continuación, David presentará la arquitectura de seguridad y acceso."*

---

## Bloque 2: Seguridad y Control de Acceso (David · 3 min)

> *"Gracias, Marcelo. En el componente de seguridad garantizamos el cumplimiento del principio de menor privilegio y la protección de sesiones:*
> 
> *1. **Autenticación y Sesión:** Implementamos tokens JWT firmados con clave simétrica robusta, transmitidos en cookies `HttpOnly`, `Secure` y `SameSite=Lax`, impidiendo el robo de credenciales mediante ataques XSS.*
> *2. **Control de Roles (RBAC):** La plataforma define cuatro roles institucionales: `SOLICITANTE` (estudiantes/docentes), `TECNICO` (resolutores), `SUPERVISOR` (asignación y reasignación) y `ADMINISTRADOR` (configuración del sistema y métricas).*
> *3. **Protección CSRF:** Cada petición mutante requiere el encabezado `X-XSRF-TOKEN`, validado por Spring Security.*
> 
> *(Demostración en vivo en navegador / DevTools):*
> - *Inicio de sesión exitoso con un usuario solicitante.*
> - *Inspección de las cookies en DevTools mostrando las banderas de seguridad activas.*
> - *Intento de acceso a un endpoint administrativo restringido, recibiendo HTTP 403 Forbidden.*
> 
> *Doy el pase a Alex para demostrar el ciclo de vida de las solicitudes."*

---

## Bloque 3: Flujo Central de Solicitudes (Alex · 4 min)

> *"Gracias, David. Ahora demostraremos el núcleo funcional del sistema:*
> 
> *1. **Radicación de Solicitud:** Desde el rol solicitante, registramos un nuevo trámite (por ejemplo, rectificación de matrícula o solicitud de constancia). El formulario valida tipos de archivo adjunto permitidos (PDF, imágenes hasta 5 MB), tamaño máximo y campos obligatorios.*
> *2. **Cálculo de Plazos:** El sistema calcula automáticamente la fecha límite de atención en función de la política y prioridad asignada.*
> *3. **Bandeja de Supervisor y Asignación:** Ingresamos como supervisor. En la bandeja se observa la solicitud recién creada. El supervisor la evalúa y la asigna al técnico disponible.*
> *4. **Atención por el Técnico:** Entramos con la sesión del técnico asignado. El técnico cambia el estado a 'EN_PROCESO', redacta la respuesta formal, adjunta la resolución y marca la solicitud como 'ATENDIDA'.*
> *5. **Confirmación del Solicitante:** El solicitante recibe la notificación del cambio de estado y visualiza la resolución en su historial.*
> 
> *Paso el turno a Emanuel para revisar las políticas y encuestas."*

---

## Bloque 4: Políticas de Atención, Encuestas y Auditoría (Emanuel · 3 min)

> *"Gracias, Alex. Mi paquete extiende la plataforma con tres capacidades complementarias clave:*
> 
> *1. **Políticas de Atención Dinámicas:** Los administradores pueden configurar los plazos máximos (horas hábiles) por categoría de servicio y prioridad, permitiendo ajustar los tiempos según la carga estacional de la universidad.*
> *2. **Encuesta de Satisfacción:** Una vez que la solicitud pasa a estado final ('ATENDIDA'), el solicitante tiene acceso a una encuesta tipo Likert (1 a 5 estrellas) con comentarios cualitativos. Estas métricas alimentan los reportes de calidad del servicio.*
> *3. **Trazabilidad de Auditoría:** Cada transición de estado, reasignación o cambio de prioridad genera un registro inmutable de auditoría con usuario, timestamp y motivo del cambio.*
> 
> *Ahora Gabriel demostrará cómo se supervisa el comportamiento del sistema bajo el paquete de observabilidad."*

---

## Bloque 5: Observabilidad, Telemetría y Simulacro RNF08 (Gabriel · 4 min)

> *"Gracias, Emanuel. En el Paquete D hemos implementado la observabilidad integral de la plataforma, cubriendo los requisitos no funcionales **RNF08 (diagnóstico rápido de incidentes)** y **RNF02 (seguridad y no exposición de secretos)**.*
> 
> *Arquitectura de observabilidad implementada:*
> - *Métricas HTTP y de negocio mediante Spring Boot Actuator, Micrometer y Prometheus.*
> - *Trazas distribuidas con OpenTelemetry exportadas hacia Jaeger.*
> - *Logs estructurados en formato JSON con correlación (`idCorrelacion`) y enmascaramiento de secretos.*
> - *Tablero unificado en Grafana aprovisionado automáticamente.*
> 
> *(Demostración del simulacro de incidente en vivo):*
> 1. *Provocamos una petición con fallo interno simulado enviando `X-Correlation-Id: incidente-demo-001`.*
> 2. *Observamos en terminal cómo el log JSON captura el error con su `idCorrelacion` y `traceId`, enmascarando cualquier token o secreto.*
> 3. *En Jaeger buscamos por `traceId` y mostramos la traza en cascada con el punto exacto de la falla.*
> 4. *En Prometheus (`:9090/alerts`) visualizamos las reglas de alerta configuradas: tasa de errores 5xx, latencia p95 y detección de solicitudes vencidas.*
> 5. *En Grafana (`:3000`) mostramos el panel institucional con histogramas percentiles, tasa de fallos y solicitudes con plazos vencidos.*
> 6. *Ejecutamos la recuperación del sistema y confirmamos la normalización de las alertas.*
> 
> *Finalmente, David y Marcelo explicarán la infraestructura de despliegue y respaldo."*

---

## Bloque 6: Despliegue en la Nube, CI/CD y RNF11 (David / Marcelo · 3 min)

> *"Gracias, Gabriel. Para finalizar, presentamos la entrega continua y la resiliencia operativa:*
> 
> *1. **Pipeline de Integración Continua (CI):** Cada pull request a `main` ejecuta automáticamente compilación, análisis estático, suite completa de pruebas unitarias y de integración tanto en backend como frontend, garantizando cero regresiones antes del merge.*
> *2. **Despliegue Continuo (CD) en OCI:** Configuramos el despliegue hacia una máquina virtual Ubuntu en Oracle Cloud Infrastructure Always Free utilizando Docker Compose, imágenes versionadas en GitHub Container Registry (GHCR) y Caddy como reverse proxy con TLS automático.*
> *3. **Ensayo de Recuperación RNF11:** Demostramos el procedimiento automatizado de respaldo consistente (dump SQL + evidencias binarias) y restauración comprobada con sumas de verificación SHA-256 ante escenarios de pérdida de datos.*
> 
> *Con esto demostramos que el sistema cumple con todos los requisitos funcionales y no funcionales solicitados en la rúbrica del curso. Quedamos a disposición del jurado para sus preguntas."*

