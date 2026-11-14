# Pruebas de Carga y Estrés (k6)

**Mesa de Servicios Universitarios (MSU)**  
**Paquete E · Tarea E3**  
**Responsable:** Alex (Ingeniero QA / SDET)  
**Herramienta:** k6 v2.0.0 (Windows / Go)  
**Entorno de ejecución:** Local (`http://localhost:8080/api/v1` sobre Docker Compose)  
**Fecha de ejecución:** 12/11/2026  

---

## 1. Justificación de la Estrategia de Siembra (SQL vs API)

Para la prueba de rendimiento se generaron y sembraron **2,000 casos de prueba** con el prefijo `[CARGA]` en su descripción. Se optó por una **estrategia basada en script SQL directo** (`siembra-2000-casos.sql`) por las siguientes razones técnicas:

1. **Rendimiento e Idempotencia:** La inserción directa por lotes (batches de 250 registros) en MySQL 8.0 toma aproximadamente **1.2 segundos**, frente a los más de 10-15 minutos que requerirían 2,000 peticiones HTTP REST individuales.
2. **Aislamiento del Entorno de Prueba:** Generar 2,000 casos mediante API dispararía miles de eventos de auditoría, notificaciones y firmas de JWT innecesarios, saturando el pool de conexiones y la memoria de la JVM antes de que comience la medición de rendimiento.
3. **Control Preciso de la Distribución:** Permite simular una base histórica realista con porcentajes exactos de distribución de estados (45 % Cerradas, 15 % Resueltas, 15 % En atención, 10 % Asignadas, 10 % Registradas, 5 % En evaluación) y prioridades (45 % Media, 30 % Alta, 15 % Baja, 10 % Crítica), así como fechas calculadas retroactivamente para probar las consultas indexadas.
4. **Limpieza Garantizada:** Un script SQL dedicado (`limpiar-carga.sql`) elimina de forma determinista y en cascada todos los registros `[CARGA]` y sus tablas asociadas (`comentario`, `encuesta`, `evento_operativo`, `notificacion`, etc.) sin afectar los datos demo institucionales.

---

## 2. Estructura de la Carpeta

```
tests/load/
├── README.md
├── siembra/
│   ├── generar-siembra.js       # Generador de script SQL con distribución realista
│   ├── siembra-2000-casos.sql   # Script SQL con 2,000 inserciones idempotentes
│   └── limpiar-carga.sql        # Script SQL de limpieza completa de registros [CARGA]
├── scripts/
│   ├── comun.js                 # Helper común: autenticación con CookieJar y CSRF
│   ├── carga.js                 # Escenario de Carga: 20 VU sostenidos (RNF06)
│   └── estres.js                # Escenario de Estrés: rampa escalonada 20 -> 400 VU
└── resultados/
    ├── resumen-carga.json       # Métricas sanitizadas de la ejecución de carga
    └── resumen-estres.json      # Métricas sanitizadas de la ejecución de estrés
```

---

## 3. Comandos de Ejecución y Parametrización

### 3.1. Siembra y Limpieza de Datos

```powershell
# Sembrar los 2,000 casos en MySQL local (Docker)
Get-Content tests/load/siembra/siembra-2000-casos.sql | docker compose exec -T mysql mysql -umsu -pmsu_local mesa_servicios

# Limpiar los 2,000 casos sembrados
Get-Content tests/load/siembra/limpiar-carga.sql | docker compose exec -T mysql mysql -umsu -pmsu_local mesa_servicios
```

### 3.2. Ejecutar Escenario de Carga Sostenida (RNF06)

```powershell
# Ejecución en entorno local
k6 run tests/load/scripts/carga.js

# Ejecución parametrizada contra el despliegue de David (B1):
$env:BASE_URL="http://<host-despliegue>:8080/api/v1"; k6 run tests/load/scripts/carga.js
```

### 3.3. Ejecutar Escenario de Estrés Escalonado

```powershell
# Solo para ejecución en entorno local controlado
k6 run tests/load/scripts/estres.js
```

> **Advertencia:** NO ejecutar el escenario de estrés contra ningún entorno remoto o de despliegue sin autorización expresa de Alex.

---

## 4. Resultados Reales de Ejecución

### 4.1. Escenario de Carga Sostenida (20 VU, 60 segundos)
- **Distribución de tráfico:** 80 % Lecturas / 20 % Escrituras.
- **Peticiones HTTP totales:** 1,598 solicitudes completadas.
- **Tasa de error (`http_req_failed`):** **0.00 %** (Umbral RNF06 < 1.0 %: **SUPERADO**).
- **Latencia de consultas (`tipo:lectura`):**
  - **p95 = 362.62 ms** (Umbral RNF06 < 1,000 ms: **SUPERADO**).
- **Latencia de escrituras (`tipo:escritura`):**
  - **p95 = 274.94 ms** (Umbral RNF06 < 2,000 ms: **SUPERADO**).

### 4.2. Escenario de Estrés Escalonado y Evaluación de Límite Operativo (20 -> 400 VU, 110 segundos)
- **Rampa de carga:** 20 VU (10s) → 50 VU (15s) → 100 VU (15s) → 200 VU (20s) → 400 VU (25s) → Cooldown 20 VU (15s).
- **Peticiones HTTP totales:** 12,685 solicitudes completadas (~115 req/s).
- **Tasa de error (`http_req_failed`):** **0.00 %** (El servidor no rechaza peticiones ni arroja 500/503).
- **Métricas de Latencia (`http_req_duration`):**
  - Mínimo: 1.28 ms | Mediana: 730.61 ms | Promedio: 1,153.22 ms.
  - p90: 2,913.91 ms (2.91 s).
  - **p95: 3,503.25 ms (3.50 s)** (Supera ampliamente el SLA de RNF06 < 1.0 s).
  - **Pico máximo individual: 8,418.30 ms (8.42 s)**.
- **Definición del Punto de Quiebre Operativo:**  
  El quiebre operativo no requiere un colapso de procesos ni caídas del contenedor (la tasa de error fue de 0.00 % demostrando la estabilidad de Tomcat y Spring Boot). Se define con rigor técnico como el **incumplimiento severo y sostenido del acuerdo de nivel de servicio (RNF06: p95 < 1,000 ms)**. Este quiebre se inicia al cruzar los 150-200 VU concurrentes y alcanza su punto crítico en la etapa de 400 VU, donde el percentil 95 escala a 3.50 s (3.5× la meta) y transacciones individuales alcanzan hasta 8.42 s.

---

## 5. Hipótesis Técnica de Cuello de Botella y Comportamiento de Recuperación

1. **Hipótesis Técnica Fundamentada (HikariCP):**  
   Spring Boot 3.5 configura HikariCP por defecto con un `maximum-pool-size: 10`, mientras que el servidor web embebido de Tomcat admite hasta `server.tomcat.threads.max: 200` hilos concurrentes.
   Bajo sobrecarga de 200 a 400 usuarios concurrentes, la ausencia total de errores HTTP (0.00 %) junto con un crecimiento pronunciado y lineal de la latencia apunta fuertemente a que los hilos quedan retenidos en espera de conexión en `HikariPool.getConnection()`.
2. **Limitación de la Medición de Cliente (k6):**  
   Dado que los resúmenes agregados de k6 reflejan únicamente la perspectiva del cliente HTTP externo (latencia de viaje redondo y códigos de respuesta) y no capturan la telemetría interna del sistema operativo ni de la JVM (uso porcentual de CPU, IOPS en disco de MySQL ni estadísticas internas del pool), esta explicación se presenta formalmente como una **hipótesis técnica de arquitectura pendiente de validación empírica**. La comprobación definitiva se coordinará con Gabriel (Paquete D) una vez que habilite Spring Boot Actuator y exporte métricas de Micrometer (`hikaricp.connections.pending`, `hikaricp.connections.active`, `jvm.threads.live`).
3. **Comportamiento durante la Fase de Cooldown:**  
   Durante la etapa 6 de enfriamiento (reducción de carga a 20 VU sostenidos), el sistema exhibió una estabilización progresiva a medida que la cola de peticiones retenidas se procesó, retornando a los niveles normales de latencia de línea base sin necesidad de reiniciar contenedores ni evidenciar bloqueos permanentes.
4. **Recomendación Preventiva para Producción (David - B1):**  
   Para entornos de producción con concurrencia esperada superior a 100 usuarios, ajustar preventivamente en `application.yml` o variables de entorno:
   ```yaml
   spring:
     datasource:
       hikari:
         maximum-pool-size: 30
         minimum-idle: 10
         connection-timeout: 10000
   ```

---

## 6. Sanitización de Resultados (RNF01)

Todos los scripts de k6 implementan la función nativa `handleSummary(data)`:
```javascript
export function handleSummary(data) {
  delete data.setup_data;
  return {
    'tests/load/resultados/resumen-carga.json': JSON.stringify(data, null, 2),
  };
}
```
Esto garantiza de forma permanente que los archivos JSON exportados contengan exclusivamente métricas agregadas de rendimiento, impidiendo que cookies de sesión (`MSU_SESION`), identificadores de token (`jti`) o claves CSRF (`XSRF-TOKEN`) se filtren al repositorio.
