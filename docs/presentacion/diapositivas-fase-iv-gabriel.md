# Diapositivas de Sustentación · Paquete D: Observabilidad y Telemetría

**Asignatura:** Taller de Construcción de Software Web (Fases III y IV)  
**Universidad:** Universidad Nacional Mayor de San Marcos (UNMSM)  
**Integrante:** Gabriel (Paquete D)  

---

## Diapositiva 1: Título y Objetivos del Paquete D

- **Título:** Observabilidad, Telemetría y Gestión de Incidentes (RNF08).
- **Misión del Paquete D:**
  - Garantizar visibilidad continua del estado del backend universitario.
  - Reducir el tiempo medio de diagnóstico (MTTD) ante fallas en producción.
  - Asegurar la estricta confidencialidad de secretos y tokens (RNF02).
- **Entregables Clave:** D1 (Métricas), D2 (Logs JSON), D3 (OpenTelemetry/Jaeger), D4 (Alertas PromQL), D5 (Simulacro RNF08), D6 (Docker Compose) y D7 (Guion y Registro ético de IA).

---

## Diapositiva 2: Arquitectura de Observabilidad (3 Pilares)

- **Métricas (Prometheus):**
  - Scrape cada 5s de `/actuator/prometheus`.
  - Histogramas de percentiles (p50, p90, p95) para peticiones HTTP.
  - Métricas de negocio: `msu_solicitudes_vencidas` y `msu_solicitudes_creadas_total`.
  - Resiliencia: si la BD falla, reporta `Double.NaN` (fallo de medición explícito).
- **Logs Estructurados (SLF4J + Logstash):**
  - Emisión en JSON puro con `timestamp`, `nivel`, `logger`, `hilo` y `mensaje`.
  - Inyección de `idCorrelacion`, `traceId` y `spanId` en el MDC.
  - Enmascarador automático de palabras clave (`password`, `token`, `cookie`, `jwt`).
- **Trazabilidad Distribuida (OpenTelemetry + Jaeger):**
  - Exportación OTLP HTTP hacia Jaeger sin exponer puertos fuera del clúster.

---

## Diapositiva 3: Reglas de Alerta Demostrables (Prometheus)

| Alerta | Expresión PromQL | Umbral Justificado | Severidad |
|---|---|---|---|
| **TasaErroresHttp5xxAlta** | `sum(rate(http_server_requests_seconds_count{status=~"5.."}[1m])) > 0.05` | Más de 3 errores 5xx por minuto de forma sostenida | `critical` |
| **LatenciaP95HttpAlta** | `histogram_quantile(0.95, sum(rate(http_server_requests_seconds_bucket[1m])) by (le)) > 1.0` | 95 % del tráfico supera los 1000 ms durante 5s | `warning` |
| **SolicitudesVencidasDetectadas** | `(msu_solicitudes_vencidas > 0) or (msu_solicitudes_vencidas_simuladas > 0)` | Casos pendientes con límites vencidos según la política | `warning` |

---

## Diapositiva 4: Ciclo Completo del Simulacro de Incidente (RNF08)

```
[1. Petición Cliente] ---> [2. Error 500 + X-Correlation-Id] ---> [3. Log JSON con traceId]
                                                                          |
[6. Recuperación OK]  <--- [5. Diagnóstico en Jaeger]        <--- [4. Alerta Firing]
```

1. **Inyección controlada:** `POST /api/v1/diagnostico/simular-error-500` con `X-Correlation-Id`.
2. **Correlación inmediata:** Búsqueda en logs JSON por `idCorrelacion`.
3. **Localización de causa raíz:** Inspección de la traza en Jaeger mediante `traceId`.
4. **Activación de alarma:** Alerta en Prometheus y panel en Grafana.
5. **Mitigación:** Ejecución de acción correctiva y restablecimiento.
6. **Recuperación:** Cierre de alerta en Prometheus y estabilización de métricas.

---

## Diapositiva 5: Seguridad y Hardening Aplicado

- **Restricción de Interfaces:** Servicios administrativos vinculados a `127.0.0.1` (no expuestos en redes públicas).
- **Puertos OTLP Aislados:** Puertos 4317 y 4318 confinados a la red interna de Docker.
- **Contraseña Externalizada:** Grafana configurado vía `${GRAFANA_ADMIN_PASSWORD}`.
- **Protección de Simulación:** Controlador condicionado a `msu.simulacion.habilitada=true`, desactivado por defecto, con métodos estrictamente `POST` y validación de rangos.

