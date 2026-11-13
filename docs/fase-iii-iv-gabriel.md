# Fases III y IV · Parte de Gabriel (paquete D: observabilidad y telemetría)

Estado al 12/11/2026. Reparto según `Division_Fases_III_y_IV.pdf` (sorteo del equipo).

| ID | Tarea | Terminado cuando | Estado | Evidencia |
|---|---|---|---|---|
| D1 | Métricas HTTP y de negocio con Actuator, Micrometer y Prometheus | Endpoints expuestos sin autenticación (`/actuator/health`, `/actuator/prometheus`) y métricas de negocio registradas | Hecho | `MetricasMsuServicio.java`, `application.yml`, `SeguridadConfig.java`; `ObservabilidadTest` (4 pruebas) |
| D2 | Logs estructurados en JSON con ID de correlación (RNF08) y sin secretos | Emisión en consola en formato JSON con timestamp, nivel, mensaje, `idCorrelacion`, `traceId` y `spanId` | Hecho | `FiltroCorrelacion.java`, `logback-spring.xml`; captura `04-logs-json-correlacion.png` |
| D3 | Trazas distribuidas con OpenTelemetry y Jaeger | Spans OTLP exportados a Jaeger con sampling 100 % configurable por entorno | Hecho | `pom.xml`, `application.yml`, `docker-compose.observabilidad.yml`; captura `03-jaeger-trazas.png` |
| D4 | Reglas de alerta demostrables en Prometheus | Alertas activas para 5xx, latencia p95 > 1s y casos vencidos detectados | Hecho | `observabilidad/prometheus/alertas.yml`; captura `01-prometheus-alertas-firing.png` |
| D5 | Simulacro de incidente (RNF08) documentado paso a paso | Guía reproducible de inyección de falla, rastreo por correlación y causa raíz | Hecho | Guía de simulacro en este documento y `DiagnosticoObservabilidadControlador.java` |
| D6 | Orquestación del stack de observabilidad con Docker Compose | Archivo complementario para levantar Prometheus, Jaeger y Grafana junto al sistema | Hecho | `docker-compose.observabilidad.yml` |
| D7 | Provisioning automático de Grafana y dashboard de supervisión | Dashboard pre-cargado con throughput, tasa de 5xx, latencia p95 y solicitudes vencidas | Hecho | `observabilidad/grafana/dashboards/msu-dashboard.json`; captura `02-grafana-dashboard.png` |

---

## 1. Arquitectura de Observabilidad Implementada

La observabilidad de la Mesa de Servicios Universitarios se diseñó de forma pragmática y desacoplada, cumpliendo los requisitos no funcionales **RNF08 (trazabilidad y diagnóstico)** y **RNF02 (seguridad y no exposición de secretos)**:

```
                      +-------------------+
                      | Navegador / Postman|
                      +---------+---------+
                                |  (X-Correlation-Id)
                                v
                      +---------+---------+
                      |   Backend (Spring) |
                      | - FiltroCorrelacion|
                      | - MetricasMsu     |
                      | - Micrometer OTel |
                      +----+---------+----+
                           |         |
          OTLP HTTP (4318) |         | Scrape cada 5s (/actuator/prometheus)
                           v         v
                     +-----+---+ +---+--------+
                     | Jaeger  | | Prometheus | <--- alertas.yml
                     | (16686) | +---+--------+
                     +---------+     |
                                     | Datasource Proxy
                                     v
                               +-----+------+
                               |  Grafana   | (3000)
                               | Dashboard  |
                               +------------+
```

### Componentes y Configuración Clave:

1. **Spring Boot Actuator & Micrometer Prometheus (D1):**
   - Endpoints expuestos: `/actuator/health`, `/actuator/info` y `/actuator/prometheus`.
   - `SeguridadConfig`: acceso permitido a estos endpoints y exención CSRF en `/actuator/**` para scraping continuo sin rechazos 401/403.
   - Histogramas de percentiles habilitados para peticiones HTTP (`percentiles-histogram.http.server.requests: true`), permitiendo calcular p50, p90 y p95.
   - Métricas de negocio:
     - `msu_solicitudes_vencidas` (Gauge): consulta en tiempo real solicitudes pendientes vencidas.
     - `msu_solicitudes_creadas_total` (Counter): se incrementa en cada nueva solicitud registrada.

2. **Logs Estructurados en JSON (D2):**
   - Implementado con `logstash-logback-encoder` a través de `logback-spring.xml`.
   - `FiltroCorrelacion`: extrae o autogenera `X-Correlation-Id`, inyectándolo en el `MDC` bajo la clave `idCorrelacion` y garantizando su limpieza en el bloque `finally`.
   - Los campos emitidos por cada línea de log incluyen: `timestamp`, `nivel`, `logger`, `mensaje`, `idCorrelacion`, `traceId`, `spanId` y `hilo`.
   - Política de secretos: nunca se imprimen contraseñas, hashes, claves JWT ni tokens CSRF.

3. **Trazabilidad Distribuida (D3):**
   - Dependencias: `micrometer-tracing-bridge-otel` y `opentelemetry-exporter-otlp`.
   - Propagación automática de contexto de traza (`traceId` y `spanId`) hacia el `MDC` y exportación OTLP HTTP hacia `http://jaeger:4318/v1/traces`.

4. **Reglas de Alerta en Prometheus (D4):**
   - Ubicación: `observabilidad/prometheus/alertas.yml`.
   - Alerta 1: `TasaErroresHttp5xxAlta` cuando `rate(http_server_requests_seconds_count{status=~"5.."}[1m]) > 0`.
   - Alerta 2: `LatenciaP95HttpAlta` cuando `histogram_quantile(0.95, ...) > 1.0` segundo.
   - Alerta 3: `SolicitudesVencidasDetectadas` cuando `msu_solicitudes_vencidas > 0`.

5. **Provisioning Automático de Grafana (D6 y D7):**
   - Cero configuración manual al arrancar el contenedor: `datasource.yml` conecta a Prometheus y `msu-dashboard.json` crea el panel universitario de inmediato en el puerto 3000 con credenciales `admin / admin`.

---

## 2. Guía del Simulacro de Incidente (RNF08)

Para la sustentación universitaria y verificación del Paquete D, se implementó `DiagnosticoObservabilidadControlador` (`/api/v1/diagnostico`), el cual permite reproducir fielmente un incidente sin alterar los datos productivos ni la lógica de negocio.

### Paso 1: Provocar el Incidente (Inyección de Error 500 y Latencia)

En una terminal, simular una petición cliente enviando un encabezado de correlación explícito:

```bash
# Simular un error interno 500:
curl -i -X GET http://localhost:8080/api/v1/diagnostico/simular-error-500 \
     -H "X-Correlation-Id: incidente-demo-univ-001"
```

**Respuesta HTTP:**
```http
HTTP/1.1 500 Internal Server Error
X-Correlation-Id: incidente-demo-univ-001
Content-Type: application/json
```

Para generar volumen y activar la regla de alerta de tasa de errores en Prometheus:
```bash
# Ejecutar varias peticiones rápidas
for i in {1..10}; do curl -s -X GET http://localhost:8080/api/v1/diagnostico/simular-error-500 -H "X-Correlation-Id: lote-error-$i"; done
```

Para provocar latencia alta (> 1.5s):
```bash
curl -i -X GET "http://localhost:8080/api/v1/diagnostico/simular-latencia?milisegundos=2000" \
     -H "X-Correlation-Id: incidente-latencia-002"
```

### Paso 2: Rastrear en los Logs JSON mediante `idCorrelacion`

Consultar los logs del backend en Docker o consola:
```bash
docker compose logs backend --tail=50
```

Se observa la salida en formato JSON estructurado (ver captura `docs/evidencias/fase-iii-iv-gabriel/04-logs-json-correlacion.png`):
```json
{
  "timestamp": "2026-11-12T23:13:55.235Z",
  "nivel": "ERROR",
  "logger": "pe.edu.unmsm.msu.comun.observabilidad.DiagnosticoObservabilidadControlador",
  "hilo": "http-nio-8080-exec-4",
  "mensaje": "Diagnóstico MSU: Simulando excepción interna no controlada (error 500) para prueba de incidente RNF08.",
  "idCorrelacion": "demo-sustentacion-001",
  "correlacionId": "demo-sustentacion-001",
  "traceId": "8eb4f0970adf5fdac909ee6e22f7cf28",
  "spanId": "a8ca1f66279102cf"
}
```

**Diagnóstico rápido:** Con el `idCorrelacion` reportado por el usuario o cliente, el equipo técnico localiza exactamente el hilo, timestamp y el `traceId` correspondiente.

### Paso 3: Ubicar la Traza en Jaeger

1. Abrir la interfaz web de Jaeger en [http://localhost:16686](http://localhost:16686) (ver evidencia `docs/evidencias/fase-iii-iv-gabriel/03-jaeger-trazas.png`).
2. En el menú de búsqueda (Search):
   - Service: `msu-backend`
   - Operation: `all` o `GET /api/v1/diagnostico/simular-latencia` o `GET /api/v1/diagnostico/simular-error-500`
   - O bien, pegar directamente el `traceId` copiado del log (`8eb4f0970adf5fdac909ee6e22f7cf28`) en el buscador superior derecho.
3. Se visualiza la cascada del span:
   - Duración total (ej. `2.02 s` para la latencia visible en el scatter plot superior).
   - En caso de error, el span aparece marcado con el código HTTP (`http.status_code=500`).

### Paso 4: Comprobar el Disparo de Alertas en Prometheus

1. Ingresar a [http://localhost:9090/alerts](http://localhost:9090/alerts) (ver evidencia `docs/evidencias/fase-iii-iv-gabriel/01-prometheus-alertas-firing.png`).
2. Se observan las reglas configuradas en `observabilidad/prometheus/alertas.yml`:
   - `TasaErroresHttp5xxAlta`: pasa a estado **Firing** tras registrar los errores 500.
   - `SolicitudesVencidasDetectadas`: pasa a estado **Firing** con el valor de casos vencidos detectados.

### Paso 5: Supervisión en el Dashboard de Grafana

1. Ingresar a [http://localhost:3000](http://localhost:3000) (usuario: `admin`, contraseña: `admin`).
2. Abrir el menú **Dashboards** > **Mesa de Servicios Universitarios** > **Mesa de Servicios Universitarios - Observabilidad** (ver evidencia `docs/evidencias/fase-iii-iv-gabriel/02-grafana-dashboard.png`).
3. Se aprecian los paneles actualizándose en tiempo real cada 5 segundos:
   - Panel 1: Throughput general con desglose por endpoint.
   - Panel 2: Tasa de errores 5xx.
   - Panel 3: Latencia p95.
   - Panel 4: Casos Vencidos marcando el número detectado en color rojo.
   - Panel 5: Total de Solicitudes Creadas acumuladas.

---

## 3. Instrucciones de Ejecución y Pruebas

### Ejecución de Pruebas Unitarias del Backend (JUnit 5 + H2)

```powershell
# En Windows con PowerShell dentro de backend/:
cd backend
.\mvnw.cmd test -Dtest=ObservabilidadTest
```

Para correr todas las pruebas del proyecto (asegurando no regresiones):
```powershell
.\mvnw.cmd test
```

### Levantamiento del Sistema Completo con Observabilidad

Desde la raíz del repositorio:
```powershell
docker compose -f docker-compose.yml -f docker-compose.observabilidad.yml up --build
```

### URLs de los Servicios

| Servicio | URL | Credenciales |
|---|---|---|
| Aplicación Web (Frontend) | http://localhost:8081 | Ver cuentas demo |
| API REST MSU (Swagger UI) | http://localhost:8080/swagger-ui.html | - |
| Prometheus UI | http://localhost:9090 | - |
| Jaeger UI (Trazas) | http://localhost:16686 | - |
| Grafana (Dashboards) | http://localhost:3000 | `admin` / `admin` |
| Scraping Actuator Prometheus | http://localhost:8080/actuator/prometheus | Público |

---

## 4. Registro de Uso de IA (Gabriel)

| Campo | Valor |
|---|---|
| Integrante | Gabriel (Paquete D - Observabilidad y Telemetría) |
| Herramienta(s) de IA | Asistente de Desarrollo AI (DeepMind Antigravity) |
| Propósito del uso | Estructuración del dashboard Grafana JSON, configuración de `logstash-logback-encoder` para Spring Boot 3.5, y redacción de reglas de alerta Prometheus |
| Validación humana realizada | - Inspección manual de `pom.xml` para compatibilidad de versiones con Spring Boot 3.5.16 y Java 17.<br>- Verificación de que `FiltroCorrelacion` limpie siempre el MDC en el bloque `finally` para evitar fugas de memoria.<br>- Validación de que ningún token JWT ni secreto aparezca en los logs JSON.<br>- Creación de pruebas unitarias en `ObservabilidadTest` para verificar el estado `UP` de Actuator y el formato de las métricas. |
| Declaración ética | El código generado fue revisado línea por línea, comprendido y probado según los lineamientos académicos de la UNMSM. |

