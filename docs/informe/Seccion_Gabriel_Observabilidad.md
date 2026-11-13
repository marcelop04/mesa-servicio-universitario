# Sección de Gabriel · Observabilidad, telemetría y diagnóstico de incidentes

## Diseño implementado

Se implementó una arquitectura de observabilidad integral y ligera para la Mesa de Servicios
Universitarios basada en tres pilares: métricas con Spring Boot Actuator y Micrometer Prometheus,
logs estructurados en formato JSON con Logstash Logback Encoder y correlación distribuida, y
trazabilidad distribuida con Micrometer Tracing Bridge OpenTelemetry y exportador OTLP hacia
Jaeger. Todo el stack de telemetría (Prometheus, Jaeger y Grafana) se define en un archivo
`docker-compose.observabilidad.yml` complementario con aprovisionamiento automatizado del
panel de control de Grafana (`msu-dashboard.json`) y las fuentes de datos.

Las métricas expuestas en `/actuator/prometheus` cubren tanto la telemetría HTTP estándar
(histogramas percentiles p50, p95 y p99 en `http.server.requests`) como métricas de negocio
específicas del dominio: `msu_solicitudes_vencidas` para el seguimiento del tiempo máximo de
atención reglamentario. Para evitar sobrecargar la base de datos con miles de entidades en memoria
durante el scraping periódico de Prometheus, se diseñó una consulta JPQL directa de agregación
`COUNT` a nivel de base de datos. Asimismo, para entornos de demostración y pruebas, se desacopló
la métrica operativa real de la métrica simulada `msu_solicitudes_vencidas_simuladas`, devolviendo
`NaN` ante fallos de conexión para no informar falsos ceros operativos.

## RNF08 · Trazabilidad distribuida y diagnóstico rápido de incidentes

El cumplimiento del RNF08 se garantiza mediante la propagación de contexto en dos capas:
1. **Identificador de correlación (`idCorrelacion`):** El filtro `FiltroCorrelacion` intercepta
   cada petición HTTP, lee o genera un identificador único mediante el encabezado `X-Correlation-Id`,
   lo inyecta en el Mapped Diagnostic Context (MDC) de SLF4J y lo devuelve al cliente en las
   cabeceras de respuesta. Al finalizar la petición, el MDC se limpia obligatoriamente en un bloque
   `finally`.
2. **Identificador de traza (`traceId` y `spanId`):** OpenTelemetry asigna una traza a la ejecución
   y la exporta vía OTLP HTTP al colector de Jaeger (`http://jaeger:4318/v1/traces`), con probabilidad
   de muestreo configurable mediante `MANAGEMENT_TRACING_SAMPLING_PROBABILITY` (por defecto 1.0 en
   demostración y pruebas).

La correlación unificada permite que ante cualquier fallo HTTP 500, el equipo de soporte pueda
tomar el `X-Correlation-Id` retornado al usuario, ubicar la línea exacta en los logs JSON, extraer
el `traceId` y visualizar en la interfaz de Jaeger la cascada completa de llamadas internas, hilos
involucrados y la causa raíz exacta. El ciclo de simulacro documentado comprende la inyección de
excepciones o latencia artificial, la detección mediante alertas Prometheus, el diagnóstico en
logs y trazas, y la recuperación explícita del estado del sistema.

## RNF02 · Seguridad y no exposición de secretos en observabilidad

La telemetría no debe comprometer la confidencialidad de datos institucionales ni credenciales.
Se aplicaron los siguientes mecanismos de hardening:
- **Enmascaramiento de datos sensibles en logs JSON:** En el archivo `logback-spring.xml` se configuró
  el decorador `MaskingJsonGeneratorDecorator`, el cual intercepta y enmascara automáticamente valores
  asociados a claves críticas (`password`, `clave`, `token`, `secret`, `jwt`, `cookie`, `authorization`),
  sustituyendo su contenido por `***`. Los controladores y servicios capturan excepciones sin volcar
  credenciales en texto plano.
- **Seguridad en endpoints de simulación:** Los endpoints de diagnóstico bajo `/api/v1/diagnostico/**`
  están condicionados por la propiedad `msu.simulacion.habilitada` (`@ConditionalOnProperty`),
  desactivados por defecto en entornos productivos. Cuando se habilitan para demostraciones o pruebas,
  la configuración de seguridad (`SeguridadConfig`) exige estrictamente autenticación con rol
  `ADMINISTRADOR`, eliminando accesos públicos o mutaciones no autorizadas.
- **Aislamiento de red y credenciales:** En `docker-compose.observabilidad.yml`, los puertos de
  administración de Prometheus (9090), Jaeger (16686) y Grafana (3000) se publican exclusivamente
  ligados a la interfaz de bucle local (`127.0.0.1`), impidiendo exposición a redes externas. Los
  puertos de ingesta OTLP (4317 y 4318) permanecen confinados en la red interna de Docker. La
  contraseña administrativa de Grafana se externaliza mediante la variable `GRAFANA_ADMIN_PASSWORD`.

## Validación y límites de las evidencias actuales

La implementación se validó exhaustivamente mediante:
1. **Pruebas automatizadas de integración:** Seis pruebas JUnit en `ObservabilidadTest` que comprueban
   la salud del Actuator, la presencia de métricas y buckets percentiles en Prometheus, la propagación
   del encabezado de correlación, la no exposición de secretos ante errores controlados, el rechazo
   de peticiones a endpoints de diagnóstico sin rol de administrador y la validación estricta de límites
   en simulación de latencia y casos vencidos.
2. **Reglas de alerta de Prometheus (`alertas.yml`):**
   - `TasaErroresHttp5xxAlta`: Umbral ajustado a `rate(...) > 0.05 req/s` durante 1 minuto para evitar
     falsos positivos por fallos aislados, disparando en estado `FIRING` ante ráfagas de error.
   - `LatenciaP95HttpAlta`: Evalúa el percentil 95 en ventana de 5 minutos (`histogram_quantile(0.95, ...) > 1.0`),
     excluyendo el scraping interno de Actuator (`uri!~"/actuator.*"`) para evitar diluir la medición real.
   - `SolicitudesVencidasDetectadas`: Dispara ante solicitudes vencidas reales o simuladas (`> 0`) tras 5 segundos.
3. **Evidencias recolectadas:** Se registraron capturas del estado de las alertas en Prometheus, el
   panel unificado en Grafana, la visualización de trazas en Jaeger, la salida estructurada de logs
   JSON con correlación y la recuperación del sistema en `docs/evidencias/fase-iii-iv-gabriel/`.

*Límites actuales:* En el entorno de prueba local y en contenedor, las tres alertas han sido probadas
y verificadas en sus ciclos de disparo y recuperación. En el despliegue de nube en OCI Always Free,
la disponibilidad de recursos queda sujeta a la capacidad del proveedor de infraestructura; el stack
de observabilidad se mantiene listo para desplegarse mediante su compose dedicado tanto localmente
como sobre la VM compartida una vez aprovisionada.

