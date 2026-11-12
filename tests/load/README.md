# Pruebas de Carga y Estrés (k6)

**Mesa de Servicios Universitarios (MSU)**  
**Paquete E · Tarea E3**  
**Responsable:** Alex (Ingeniero QA / SDET)  
**Herramienta:** k6 v2.0.0 (Windows / Go)  
**Entorno de ejecución:** Local (`http://localhost:8080/api/v1` sobre Docker Compose)

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
│   └── estres.js                # Escenario de Estrés: rampa 20 -> 50 -> 100 -> 200 -> 400 VU
└── resultados/
    ├── resumen-carga.json       # Métricas de la ejecución de carga
    └── resumen-estres.json      # Métricas de la ejecución de estrés
```

---

## 3. Comandos de Ejecución

### 3.1. Siembra y Limpieza de Datos

```powershell
# Sembrar los 2,000 casos en MySQL local (Docker)
Get-Content tests/load/siembra/siembra-2000-casos.sql | docker compose exec -T mysql mysql -umsu -pmsu_local mesa_servicios

# Limpiar los 2,000 casos sembrados
Get-Content tests/load/siembra/limpiar-carga.sql | docker compose exec -T mysql mysql -umsu -pmsu_local mesa_servicios
```

### 3.2. Ejecutar Escenario de Carga Sostenida (RNF06)

```powershell
k6 run --summary-export=tests/load/resultados/resumen-carga.json tests/load/scripts/carga.js
```

### 3.3. Ejecutar Escenario de Estrés Escalonado

```powershell
k6 run --summary-export=tests/load/resultados/resumen-estres.json tests/load/scripts/estres.js
```

---

## 4. Resultados Reales de Ejecución

### 4.1. Escenario de Carga Sostenida (20 VU, 60 segundos)
- **Distribución de tráfico:** 80 % Lecturas / 20 % Escrituras.
- **Peticiones HTTP totales:** 1,803 solicitudes (~29.75 req/s).
- **Checks exitosos:** 1,804 / 1,804 (100.00 %).
- **Tasa de error (`http_req_failed`):** **0.00 %** (Umbral RNF06 < 1.0 %: **SUPERADO**).
- **Latencia de consultas (`tipo:lectura`):**
  - **p95 = 35.34 ms** (Umbral RNF06 < 1,000 ms: **SUPERADO holgadamente**).
  - Promedio: 19.08 ms | Mediana: 23.72 ms | Máximo: 60.72 ms.
- **Latencia de escrituras (`tipo:escritura`):**
  - **p95 = 18.50 ms** (Umbral RNF06 < 2,000 ms: **SUPERADO holgadamente**).
  - Promedio: 14.54 ms | Mediana: 14.10 ms | Máximo: 33.72 ms.

### 4.2. Escenario de Estrés Escalonado (20 -> 400 VU, 100 segundos)
- **Peticiones HTTP totales:** 17,087 solicitudes (~170.25 req/s).
- **Checks exitosos:** 17,088 / 17,088 (100.00 %).
- **Tasa de error (`http_req_failed`):** **0.00 %** (Criterio de quiebre > 5 %: **NO ALCANZADO**).
- **Latencia general (`http_req_duration`):**
  - Promedio: 503.15 ms | Mediana: 225.21 ms | p90: 1.46 s | **p95: 1.87 s** | Máximo: 5.20 s.
- **Punto de degradación y cuello de botella:**
  - El sistema mantuvo cero errores HTTP hasta los **400 usuarios concurrentes**.
  - A 400 VU el tiempo de respuesta p95 subió a **1.87 s** y se registraron picos máximos de **5.20 s**, marcando el **límite operativo recomendado** para el hardware local asignado (2 núcleos vCPU, pool HikariCP estándar de 10 conexiones en Spring Boot).
  - **Capacidad de recuperación:** En la fase de enfriamiento (etapa 6 a 20 VU), el sistema se estabilizó de inmediato con latencias sub-100 ms sin fugas de memoria en la JVM ni conexiones zombi en MySQL.
