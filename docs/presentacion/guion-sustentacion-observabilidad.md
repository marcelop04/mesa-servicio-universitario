# Guion de Sustentación · Demostración del Paquete D (Observabilidad y Telemetría)

**Proyecto:** Mesa de Servicios Universitarios con Gestión de Plazos de Atención  
**Estudiante:** Gabriel (Responsable del Paquete D - Observabilidad y Telemetría)  
**Duración estimada:** 5 a 7 minutos  

---

## 1. Introducción y Arquitectura (1 minuto)

> *"Buenas tardes, profesor y miembros del jurado. En esta fase he implementado la observabilidad integral de la Mesa de Servicios Universitarios, cumpliendo los requisitos no funcionales **RNF08 (trazabilidad y diagnóstico rápido de incidentes)** y **RNF02 (seguridad y no exposición de secretos)**.*
> 
> *La arquitectura implementada conecta tres pilares de observabilidad sin sobreingeniería:*
> 1. *Métricas con Spring Boot Actuator, Micrometer y Prometheus.*
> 2. *Logs estructurados en formato JSON con identificador de correlación `idCorrelacion` y enmascaramiento de secretos.*
> 3. *Trazabilidad distribuida con OpenTelemetry y Jaeger.*
> 4. *Supervisión centralizada en Grafana con aprovisionamiento automático mediante Docker Compose."*

---

## 2. Demostración en Vivo: Ciclo Completo del Incidente (RNF08) (4 minutos)

### Paso A: Petición con Error 500 y Correlación
1. **Acción:** Abrir terminal y ejecutar:
   ```powershell
   curl.exe -i -X POST http://localhost:8080/api/v1/diagnostico/simular-error-500 -H "X-Correlation-Id: incidente-demo-univ-001"
   ```
2. **Explicación:**
   > *"Simulamos un fallo interno en el servidor enviando el encabezado `X-Correlation-Id`. La API responde con HTTP 500, pero fíjense en la respuesta: devuelve el mismo `id_correlacion` al cliente y un mensaje genérico, protegiendo los datos confidenciales conforme al RNF02."*

### Paso B: Diagnóstico en Logs JSON Estructurados
1. **Acción:** Mostrar en terminal los logs del backend:
   ```powershell
   docker compose logs backend --tail=10
   ```
2. **Explicación:**
   > *"En los logs vemos la salida estructurada en JSON. Cada registro contiene timestamp, nivel ERROR, logger, hilo y lo más importante: `idCorrelacion: "incidente-demo-univ-001"` y el `traceId` generado por OpenTelemetry. Con este traceId podemos ir directamente a la herramienta de trazabilidad sin buscar a ciegas."*

### Paso C: Rastreo de Traza en Jaeger
1. **Acción:** Abrir Jaeger en `http://localhost:16686`, buscar el servicio `msu-backend` y abrir la traza correspondiente al `traceId`.
2. **Explicación:**
   > *"En Jaeger visualizamos la traza distribuida. Podemos observar la cascada de ejecución del controlador, los filtros de seguridad y el punto exacto donde ocurrió la excepción, con el código de error HTTP 500 asociado."*

### Paso D: Alertas en Prometheus y Dashboard en Grafana
1. **Acción:** Mostrar Prometheus en `http://localhost:9090/alerts` y Grafana en `http://localhost:3000`.
2. **Explicación:**
   > *"En Prometheus, la regla `TasaErroresHttp5xxAlta` detectó la degradación y pasó a estado FIRING. Simultáneamente, en Grafana observamos el panel pre-cargado que aprovisionamos automáticamente: el pico de errores 5xx, el percentil 95 de latencia y los casos vencidos detectados en tiempo real."*

### Paso E: Mitigación y Recuperación
1. **Acción:** Ejecutar el endpoint de recuperación:
   ```powershell
   curl.exe -i -X POST http://localhost:8080/api/v1/diagnostico/simular-recuperacion
   ```
2. **Explicación:**
   > *"Una vez mitigado el incidente, la simulación se restablece. En el siguiente ciclo de evaluación, Prometheus resuelve la alerta y Grafana vuelve a los umbrales normales en verde, completando el ciclo de vida del incidente."*

---

## 3. Conclusiones y Preguntas Frecuentes (1 minuto)

- **¿Por qué se aisló la métrica de simulación?**
  Para no falsear los datos operativos de la base de datos universitaria.
- **¿Cómo se previenen fugas de seguridad?**
  Los puertos administrativos escuchan solo en `127.0.0.1`, los receptores OTLP están en la red interna de Docker, la contraseña de Grafana está externalizada y los logs aplican enmascaramiento automático de credenciales.

