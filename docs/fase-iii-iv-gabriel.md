# Fases III y IV · Parte de Gabriel (paquete D: observabilidad y telemetría)

Estado al 12/11/2026. Reparto oficial según `Division_Fases_III_y_IV.pdf` (sorteo del equipo).

| ID | Tarea | Terminado cuando | Estado | Evidencia |
|---|---|---|---|---|
| D1 | Métricas HTTP y de negocio con Actuator, Micrometer y Prometheus | Endpoints expuestos sin autenticación (`/actuator/health`, `/actuator/prometheus`) y métricas de negocio con manejo de error (NaN) | Hecho | `MetricasMsuServicio.java`, `application.yml`, `SeguridadConfig.java`; `ObservabilidadTest` (6 pruebas) |
| D2 | Logs estructurados en JSON con correlación (RNF08) y sin secretos (RNF02) | Formato JSON en consola con `timestamp`, `nivel`, `logger`, `idCorrelacion`, `traceId`, `spanId` y enmascaramiento de datos sensibles | Hecho | `FiltroCorrelacion.java`, `logback-spring.xml`; captura `04-logs-json-correlacion.png` |
| D3 | Trazas distribuidas con OpenTelemetry y Jaeger | Spans OTLP exportados internamente a Jaeger con sampling 100 % configurable por entorno | Hecho | `pom.xml`, `application.yml`, `docker-compose.observabilidad.yml`; captura `03-jaeger-trazas.png` |
| D4 | Reglas de alerta demostrables en Prometheus con umbrales justificados | Alertas activas para 5xx (> 0.05 req/s), latencia p95 (> 1s) y casos vencidos, con ciclo disparo/recuperación | Hecho | `observabilidad/prometheus/alertas.yml`; capturas `01-prometheus-alertas-firing.png` y `05-recuperacion-errores-5xx.png` |
| D5 | Simulacro de incidente (RNF08) documentado paso a paso | Ciclo cerrado completo: inyección controlada → correlación en logs → traza en Jaeger → causa raíz → mitigación → recuperación | Hecho | Guía de simulacro en este documento y `DiagnosticoObservabilidadControlador.java` |
| D6 | Orquestación segura del stack con Docker Compose | Prometheus, Jaeger y Grafana confinados a `127.0.0.1`, OTLP interno y contraseña externalizada | Hecho | `docker-compose.observabilidad.yml`, `observabilidad/grafana/dashboards/msu-dashboard.json`; captura `02-grafana-dashboard.png` |
| D7 | Presentación final, guion de sustentación y registro integral de IA | Estructura de diapositivas, guion con tiempos y registro completo de IA con los 6 campos de la rúbrica | Hecho | `docs/presentacion/guion-sustentacion-observabilidad.md`, `diapositivas-fase-iv-gabriel.md`, `docs/registro-uso-ia.md` |

---

## 1. Arquitectura de Observabilidad y Seguridad (Hardening)

La observabilidad de la Mesa de Servicios Universitarios se diseñó de forma desacoplada y robusta, cumpliendo los requisitos no funcionales **RNF08 (trazabilidad y diagnóstico)** y **RNF02 (seguridad, aislamiento y no exposición de secretos)**:

```
                      +-------------------+
                      | Navegador / Cliente|
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
     OTLP Interno (4318)   |         | Scrape cada 5s (/actuator/prometheus)
     (Red Docker privada)  v         v
                     +-----+---+ +---+--------+
                     | Jaeger  | | Prometheus | <--- alertas.yml (umbrales justificados)
                     | (16686) | +---+--------+
                     +---------+     |
                          |          | Datasource Proxy
                          +----+-----+
                               v
                         +-----+------+
                         |  Grafana   | (3000)
                         | Dashboard  | (Contraseña externalizada)
                         +------------+
```

### Medidas de Seguridad y Calidad Aplicadas (Atención a la Revisión por Pares):

1. **Aislamiento de Endpoints de Simulación (RNF02):**
   - El controlador `DiagnosticoObservabilidadControlador` está anotado con `@ConditionalOnProperty(name = "msu.simulacion.habilitada", havingValue = "true")`.
   - Por defecto está **desactivado (`false`)** en producción y en el código base, respondiendo 404 a cualquier petición no autorizada.
   - Solo se habilita de forma controlada en el entorno de pruebas/simulación mediante variable de entorno (`SIMULACION_HABILITADA=true`).
   - Las operaciones que mutan estado son estrictamente `POST` (nunca `GET`).
   - Se validan límites estrictos en parámetros: latencia entre 100 y 5000 ms (evitando saturación de hilos) y casos vencidos entre 0 y 100.

2. **Hardening de Contenedores y Red en Docker Compose (D6):**
   - Todas las interfaces administrativas de Prometheus, Jaeger y Grafana están vinculadas exclusivamente a `127.0.0.1` (bucle local), impidiendo accesos no deseados desde redes externas o públicas.
   - Los puertos de recepción OTLP (4317 y 4318) **no se publican al host**, permaneciendo aislados en la red interna de Docker para uso exclusivo del contenedor `backend`.
   - La contraseña de Grafana está externalizada mediante la variable de entorno `GRAFANA_ADMIN_PASSWORD` (obligatoria, sin valor por defecto en el compose).

3. **Separación de Métricas Operativas y Simulación (D1, D4):**
   - `msu_solicitudes_vencidas`: métrica real calculada desde la base de datos.
   - En caso de fallo de acceso a datos, **devuelve `Double.NaN`**, lo que indica formalmente a Prometheus un fallo de medición y evita falsos ceros.
   - `msu_solicitudes_vencidas_simuladas`: métrica independiente y aislada para pruebas de inyección, garantizando que los datos operativos reales nunca se contaminen.

4. **Tratamiento de Secretos y Enmascaramiento en Logs (D2, RNF02):**
   - En `logback-spring.xml` se configuró `MaskingJsonGeneratorDecorator` de Logstash para enmascarar automáticamente campos sensibles (`password`, `contrasena`, `token`, `secreto`, `jwt`, `cookie`).
   - El servicio de métricas no registra trazas de excepciones internas sensibles.
   - Se añadió la prueba automatizada `errorNoExponeSecretosNiTokens()` en `ObservabilidadTest`.

---

## 2. Guía del Simulacro de Incidente (RNF08) · Ciclo Completo de 6 Fases

Para la sustentación universitaria se diseñó un ciclo cerrado y reproducible:
**Inyección → Detección → Correlación → Trazabilidad → Diagnóstico → Mitigación y Recuperación**.

### Fase 1: Inyección Controlada de Fallo
En una terminal secundaria, provocar una excepción interna no controlada (HTTP 500) enviando el identificador de correlación:

```powershell
curl.exe -i -X POST http://localhost:8080/api/v1/diagnostico/simular-error-500 `
     -H "X-Correlation-Id: demo-sustentacion-001"
```

**Respuesta recibida por el cliente:**
```http
HTTP/1.1 500 Internal Server Error
X-Correlation-Id: demo-sustentacion-001
Content-Type: application/json

{"codigo":"ERROR_INTERNO","mensaje":"Ocurrió un error inesperado. Intente nuevamente.","errores":[],"id_correlacion":"demo-sustentacion-001"}
```
*Nótese que el cliente recibe el `id_correlacion` pero ningún detalle confidencial del servidor.*

Para simular una degradación sostenida y activar la regla de alerta de tasa de errores (> 0.05 req/s):
```powershell
1..5 | ForEach-Object { curl.exe -s -X POST http://localhost:8080/api/v1/diagnostico/simular-error-500 -H "X-Correlation-Id: lote-error-$_" }
```

### Fase 2: Rastrear en los Logs JSON mediante `idCorrelacion`
Consultar los logs del backend en Docker o consola (ver evidencia `docs/evidencias/fase-iii-iv-gabriel/04-logs-json-correlacion.png`):

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

### Fase 3: Localización y Trazabilidad en Jaeger
1. Abrir Jaeger en [http://localhost:16686](http://localhost:16686) (ver evidencia `docs/evidencias/fase-iii-iv-gabriel/03-jaeger-trazas.png`).
2. Pegar el `traceId` copiado del log (`8eb4f0970adf5fdac909ee6e22f7cf28`) en el buscador superior.
3. Se despliega la cascada de spans donde se identifica el método exacto y el código `http.status_code=500`.

### Fase 4: Detección y Alerta en Prometheus y Grafana
1. En Prometheus ([http://localhost:9090/alerts](http://localhost:9090/alerts)):
   - `TasaErroresHttp5xxAlta` pasa a estado **FIRING** (rojo) (ver evidencia `docs/evidencias/fase-iii-iv-gabriel/01-prometheus-alertas-firing.png`).
2. En Grafana ([http://localhost:3000](http://localhost:3000)):
   - El panel "2. Errores HTTP 5xx" refleja el pico de fallas en rojo (ver evidencia `docs/evidencias/fase-iii-iv-gabriel/02-grafana-dashboard.png`).

### Fase 5: Diagnóstico de Causa Raíz
El equipo de ingeniería determina que la falla corresponde a una excepción no controlada en el controlador de peticiones provocada por degradación transitoria de un servicio dependiente.

### Fase 6: Mitigación, Corrección y Recuperación
1. Se aplica la corrección y se restablece el estado del sistema mediante la acción de recuperación:
   ```powershell
   curl.exe -i -X POST http://localhost:8080/api/v1/diagnostico/simular-recuperacion
   ```
2. **Validación de vuelta a la normalidad:**
   - La métrica de simulación se restablece a 0.
   - En el siguiente intervalo de evaluación (15s), la alerta en Prometheus se resuelve automáticamente y vuelve a estado verde (**INACTIVE**).
   - En Grafana, la tasa de errores cae a 0 req/s y los paneles de supervisión retornan a verde.

---

## 3. Instrucciones de Verificación Automatizada

### Pruebas Unitarias del Backend (JUnit 5 + H2)

```powershell
cd backend
.\mvnw.cmd test -Dtest=ObservabilidadTest
```
*Ejecuta 6 pruebas de integración que validan Actuator, Prometheus scraping, correlación, enmascaramiento de secretos y validación de límites en simulación.*

### Levantamiento del Stack Completo

```powershell
docker compose -f docker-compose.yml -f docker-compose.observabilidad.yml up --build
```

### Demostración para Sustentación

La demostración del Paquete D se realiza en entorno local, mostrando las **evidencias capturadas** almacenadas en `docs/evidencias/fase-iii-iv-gabriel/`. El stack de observabilidad está diseñado como una extensión desacoplada que se levanta localmente con:

```powershell
docker compose -f docker-compose.yml -f docker-compose.observabilidad.yml up --build
```

Las 5 capturas de pantalla documentan el ciclo completo del simulacro:

| Archivo | Muestra |
|---|---|
| `01-prometheus-alertas-firing.png` | Alertas `TasaErroresHttp5xxAlta` y `LatenciaP95HttpAlta` en estado FIRING |
| `02-grafana-dashboard.png` | Tablero institucional con histogramas percentiles y tasa de fallos |
| `03-jaeger-trazas.png` | Traza distribuida en Jaeger con `traceId` correlacionado al incidente |
| `04-logs-json-correlacion.png` | Log JSON con `idCorrelacion`, `traceId` y enmascaramiento de secretos |
| `05-recuperacion-errores-5xx.png` | Alertas retornando a estado OK tras la mitigación |

---

## 4. Reparto y Entregables del Paquete D7

El entregable **D7** oficial del reparto de Fases III y IV comprende la preparación integral para la sustentación, la sección correspondiente para el informe final y la consolidación ética del uso de herramientas de IA:

1. **Guion Consolidado de Sustentación del Equipo:** Documentado con cronograma, tiempos y pautas de sustentación de los 5 integrantes en [docs/presentacion/Guion_Sustentacion_Equipo.md](presentacion/Guion_Sustentacion_Equipo.md) (y guion específico de observabilidad en [docs/presentacion/guion-sustentacion-observabilidad.md](presentacion/guion-sustentacion-observabilidad.md)).
2. **Presentación Final del Equipo:** Disponible en formatos listos para exponer:
   - Presentación PowerPoint oficial: [docs/presentacion/Presentacion_Final_Equipo.pptx](presentacion/Presentacion_Final_Equipo.pptx).
   - Presentador web interactivo en pantalla completa: [docs/presentacion/Presentacion_Final_Equipo.html](presentacion/Presentacion_Final_Equipo.html).
   - Estructura y contenidos en Markdown: [docs/presentacion/Presentacion_Final_Equipo.md](presentacion/Presentacion_Final_Equipo.md) (y diapositivas específicas de telemetría en [docs/presentacion/diapositivas-fase-iv-gabriel.md](presentacion/diapositivas-fase-iv-gabriel.md)).
3. **Sección del Informe Final:** Documento técnico de cierre de observabilidad en [docs/informe/Seccion_Gabriel_Observabilidad.md](informe/Seccion_Gabriel_Observabilidad.md).
4. **Registro Consolidado de IA del Equipo:** Completado rigurosamente preservando las entradas del equipo y detallando los casos de observabilidad en [docs/registro-uso-ia.md](registro-uso-ia.md).
