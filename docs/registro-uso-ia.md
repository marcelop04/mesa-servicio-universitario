# Registro Consolidado de Uso de Inteligencia Artificial (IA)

**Proyecto:** Mesa de Servicios Universitarios con Gestión de Plazos de Atención  
**Asignatura:** Taller de Construcción de Software Web  
**Universidad:** Universidad Nacional Mayor de San Marcos (UNMSM)  
**Semestre Académico:** 2026-II  

---

## 1. Política de Integridad Académica y Directiva de Uso de IA

El equipo de desarrollo declara que el uso de herramientas de Inteligencia Artificial generativa se realiza bajo los principios de **transparencia, comprensión técnica total, verificación humana rigurosa y responsabilidad ética**. Cada fragmento de código o configuración asistido por IA ha sido validado mediante pruebas automatizadas, revisado en pares y ajustado a los estándares arquitectónicos del proyecto.

---

## 2. Registro Detallado por Caso de Uso (Rúbrica de Evaluación)

### Caso 1: Configuración de Métricas y Tracing con Spring Boot 3.5 y OpenTelemetry (Paquete D)

| Campo de Rúbrica | Detalle |
|---|---|
| **Responsable** | Gabriel Salazar (Paquete D - Observabilidad y Telemetría) |
| **Herramienta** | DeepMind Antigravity (Gemini 3.8 Flash) |
| **Prompt exacto** | *"Configura Spring Boot Actuator, Micrometer Prometheus y OpenTelemetry con exporter OTLP en un proyecto Spring Boot 3.5 con Java 17, asegurando que las métricas HTTP expongan histogramas percentiles para p95 y que las trazas se exporten vía OTLP HTTP a Jaeger sin romper dependencias administradas."* |
| **Resultado generado por la IA** | Bloque de configuración YAML bajo `management` con percentiles de `http.server.requests`, dependencias Maven de `micrometer-registry-prometheus`, `micrometer-tracing-bridge-otel` y `opentelemetry-exporter-otlp`. |
| **Utilización en el proyecto** | Integrado en `backend/pom.xml` y `backend/src/main/resources/application.yml`. |
| **Validación humana realizada** | - Verificación de compatibilidad con Java 17 y Spring Boot 3.5.16.<br>- Confirmación en el navegador de que `/actuator/prometheus` responda con código HTTP 200.<br>- Ejecución de prueba unitaria en `ObservabilidadTest.java` verificando presencia de buckets percentiles. |
| **Modificaciones manuales aplicadas** | - Se añadió explícitamente la propiedad `<opentelemetry.version>1.43.0</opentelemetry.version>` tras detectar que Spring Boot no administraba la versión del exporter OTLP.<br>- Se eliminó la clave no estándar `access: permit_all` en `application.yml` para evitar errores de binding. |

---

### Caso 2: Emisión de Logs JSON con ID de Correlación y Enmascaramiento de Secretos (Paquete D)

| Campo de Rúbrica | Detalle |
|---|---|
| **Responsable** | Gabriel Salazar (Paquete D - Observabilidad y Telemetría) |
| **Herramienta** | DeepMind Antigravity (Gemini 3.8 Flash) |
| **Prompt exacto** | *"Diseña un archivo logback-spring.xml con LogstashLogbackEncoder para emitir logs estructurados en JSON en consola que incluyan timestamp, nivel, logger, mensaje, hilo, idCorrelacion y traceId, asegurando que ninguna contraseña o token JWT aparezca en texto plano."* |
| **Resultado generado por la IA** | Archivo `logback-spring.xml` con `LogstashEncoder` y decorador `MaskingJsonGeneratorDecorator` configurado con rutas de enmascaramiento (`password`, `token`, `secret`, `jwt`). |
| **Utilización en el proyecto** | Archivo `backend/src/main/resources/logback-spring.xml` y enlace en `FiltroCorrelacion.java`. |
| **Validación humana realizada** | - Inspección visual de la salida del contenedor `backend` en Docker, confirmando formato JSON válido por línea.<br>- Comprobación de que `MDC.remove(CLAVE_MDC)` se ejecute siempre en el bloque `finally` para evitar memory leaks.<br>- Prueba automatizada `errorNoExponeSecretosNiTokens()` en `ObservabilidadTest`. |
| **Modificaciones manuales aplicadas** | - Se renombraron las claves de log a español (`nivel`, `logger`, `mensaje`, `hilo`, `excepcion`) para respetar las convenciones del proyecto.<br>- Se configuró perfil `@springProfile name="local"` para permitir texto plano en desarrollo local. |

---

### Caso 3: Aprovisionamiento Automático de Grafana y Reglas de Alerta Prometheus (Paquete D)

| Campo de Rúbrica | Detalle |
|---|---|
| **Responsable** | Gabriel Salazar (Paquete D - Observabilidad y Telemetría) |
| **Herramienta** | DeepMind Antigravity (Gemini 3.8 Flash) |
| **Prompt exacto** | *"Escribe las reglas de alerta de Prometheus en YAML para tasa alta de errores 5xx, latencia p95 > 1s y solicitudes vencidas detectadas, justificando los umbrales técnicos, y crea el dashboard JSON de Grafana con paneles de throughput, 5xx, p95 y casos vencidos para aprovisionamiento automático."* |
| **Resultado generado por la IA** | Archivo `alertas.yml` con 3 alertas PromQL y archivo `msu-dashboard.json` con 5 paneles declarativos en formato Grafana schema v39. |
| **Utilización en el proyecto** | Archivos en `observabilidad/prometheus/alertas.yml` y `observabilidad/grafana/dashboards/msu-dashboard.json`. |
| **Validación humana realizada** | - Disparo real de alertas en `http://localhost:9090/alerts`, verificando transición a FIRING tras inyectar tráfico.<br>- Apertura de Grafana en `http://localhost:3000`, confirmando que el datasource Prometheus y los paneles carguen sin intervención manual. |
| **Modificaciones manuales aplicadas** | - Se ajustó el umbral de errores 5xx a `> 0.05` para representar al menos 3 fallos sostenidos por minuto y evitar falsos positivos.<br>- Se separó la evaluación de casos reales (`msu_solicitudes_vencidas`) de casos simulados (`msu_solicitudes_vencidas_simuladas`). |

---

### Caso 4: Hardening de Docker Compose y Protección de Endpoints de Simulación (Paquete D)

| Campo de Rúbrica | Detalle |
|---|---|
| **Responsable** | Gabriel Salazar (Paquete D - Observabilidad y Telemetría) |
| **Herramienta** | DeepMind Antigravity (Gemini 3.8 Flash) |
| **Prompt exacto** | *"Revisa la seguridad de docker-compose.observabilidad.yml y del controlador de diagnóstico para restringir puertos administrativos a 127.0.0.1, no exponer puertos OTLP externamente, externalizar contraseñas con variables de entorno y condicionar la simulación a una propiedad booleana desactivada por defecto."* |
| **Resultado generado por la IA** | Docker Compose actualizado con mapeo `127.0.0.1:PUERTO`, variables `GRAFANA_ADMIN_PASSWORD`, eliminación de puertos OTLP expuestos al host y controlador con `@ConditionalOnProperty`. |
| **Utilización en el proyecto** | `docker-compose.observabilidad.yml`, `DiagnosticoObservabilidadControlador.java` y `SeguridadConfig.java`. |
| **Validación humana realizada** | - Ejecución de `docker compose config` validando sintaxis de unión sin conflictos.<br>- Comprobación de que `/api/v1/diagnostico/**` responda 404 cuando `msu.simulacion.habilitada=false`.<br>- Validación de límites de parámetros (máximo 5000 ms en latencia y 100 en casos vencidos). |
| **Modificaciones manuales aplicadas** | - Se unificó la sintaxis de `depends_on` a formato de objeto (`condition: service_started`) para compatibilidad estricta con Docker Compose v2.<br>- Se eliminaron métodos mutantes por GET, dejando únicamente POST con validación de rangos. |

---

## 3. Declaración Jurada de Autoría y Responsabilidad Ética

Certificamos que todo el código, configuraciones, pruebas y documentación entregados han sido analizados, comprendidos y defendidos por el equipo:

- **Gabriel Salazar** (Paquete D - Observabilidad y Telemetría) — Firma: ____________________  
- **Alex Huamán** (Paquete B - Solicitudes) — Firma: ____________________  
- **David Torres** (Paquete C - Seguridad) — Firma: ____________________  
- **Emanuel Silva** (Paquete A - Funciones pendientes) — Firma: ____________________  
- **Marcelo Ruiz** (Infraestructura y Datos) — Firma: ____________________  

*Fecha de consolidación:* 12 de noviembre de 2026
