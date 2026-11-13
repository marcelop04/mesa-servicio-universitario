# Registro Consolidado de Uso de Inteligencia Artificial (IA)

**Proyecto:** Mesa de Servicios Universitarios con Gestión de Plazos de Atención  
**Curso:** Ingeniería de Software / Taller de Proyectos  
**Universidad:** Universidad Nacional Mayor de San Marcos (UNMSM)  
**Semestre Académico:** 2026-II  

---

## 1. Política de Uso Responsable de IA en el Proyecto

En cumplimiento de las directivas de integridad académica, el equipo declara que las herramientas de Inteligencia Artificial generativa se utilizan exclusivamente como **asistentes de productividad, documentación y soporte técnico**, manteniendo en todo momento:

1. **Comprensión Total del Código:** Cada integrante es capaz de explicar, modificar y sustentar cualquier línea de código o configuración atribuida a su paquete de trabajo.
2. **Validación y Pruebas Humanas:** Ningún fragmento generado por IA se incorpora al repositorio sin pruebas unitarias, verificación de compatibilidad y revisión de vulnerabilidades (especialmente no exponer secretos, contraseñas ni tokens según RNF02).
3. **Atribución Transparente:** Se documenta a continuación el uso específico que cada integrante hizo de herramientas de IA durante las Fases I, II, III y IV.

---

## 2. Registro por Integrante

### Integrante 1: Alex (Paquete B: Bandejas y Gestión de Solicitudes)

| Campo | Detalle |
|---|---|
| Rol y Paquete | Frontend / Backend de Solicitudes (HU04, HU05, HU06) |
| Herramienta(s) | GitHub Copilot, ChatGPT |
| Tareas con soporte de IA | - Autocompletado de controladores Spring Boot y validación de tipos MIME de adjuntos.<br>- Generación de mocks de prueba en JavaScript/React. |
| Validación manual | - Verificación de límites de archivo (5 MB) y prueba de subida de evidencias reales.<br>- Pruebas JUnit de concurrencia al numerar solicitudes correlativas. |

---

### Integrante 2: David (Paquete C: Identidad, Seguridad y Sesión)

| Campo | Detalle |
|---|---|
| Rol y Paquete | Autenticación JWT, CSRF y Manejo de Errores (DV01–DV04, DV07) |
| Herramienta(s) | Claude, ChatGPT |
| Tareas con soporte de IA | - Redacción de la configuración de Spring Security 6 (Stateless con Cookie HttpOnly).<br>- Plantilla base para el manejador global de excepciones `ApiError`. |
| Validación manual | - Inspección exhaustiva de que el token JWT no se exponga en `localStorage`.<br>- Pruebas de ataque CSRF simulado y verificación del ciclo de revocación de sesiones. |

---

### Integrante 3: Emanuel (Paquete A: Funciones Pendientes y API)

| Campo | Detalle |
|---|---|
| Rol y Paquete | Encuestas de satisfacción, Versionado de políticas y Auditoría (HU13, HU22, HU23, OpenAPI) |
| Herramienta(s) | ChatGPT, DeepMind Antigravity |
| Tareas con soporte de IA | - Estructuración del esquema OpenAPI 3 para códigos de error y respuestas genéricas.<br>- Cálculo de diferencias (diff) en la auditoría administrativa para campos sensibles. |
| Validación manual | - Verificación de no duplicidad de encuestas en estados no cerrados.<br>- Ejecución de la suite completa de pruebas de integración con H2 (`EncuestaTest`, `PoliticasTest`). |

---

### Integrante 4: Gabriel (Paquete D: Observabilidad y Telemetría)

| Campo | Detalle |
|---|---|
| Rol y Paquete | Métricas Actuator/Prometheus, Logs JSON con correlación, Tracing Jaeger y Dashboards Grafana |
| Herramienta(s) | DeepMind Antigravity |
| Tareas con soporte de IA | - Configuración del encoder `logstash-logback-encoder` para emisión estructurada.<br>- Creación del JSON declarativo del dashboard de Grafana con 4 paneles clave.<br>- Redacción de la sintaxis PromQL para las reglas de alerta y cálculo de percentil 95. |
| Validación manual | - Pruebas de scraping en vivo a `/actuator/prometheus` sin requerir credenciales.<br>- Verificación de limpieza del MDC en `FiltroCorrelacion` para prevenir memory leaks.<br>- Ejecución del simulacro de incidente (RNF08) comprobando el `X-Correlation-Id` en logs y Jaeger. |

---

### Integrante 5: Marcelo (Datos, Catálogos e Infraestructura Base)

| Campo | Detalle |
|---|---|
| Rol y Paquete | Migraciones Flyway (V1–V4), Docker Compose base y semillas de base de datos |
| Herramienta(s) | ChatGPT, GitHub Copilot |
| Tareas con soporte de IA | - Script SQL con inserción de datos iniciales universitarios (facultades, categorías).<br>- Afinado de parámetros MySQL 8 en Docker Compose (charset utf8mb4 y healthcheck). |
| Validación manual | - Ejecución de `docker compose down -v` y levantamiento en frío sin fallas de Flyway.<br>- Revisión de índices y claves foráneas en el motor InnoDB. |

---

## 3. Declaración de Honestidad Académica del Equipo

Los miembros del equipo suscrito certificamos que los entregables presentados representan nuestro trabajo intelectual colegiado, habiendo utilizado la Inteligencia Artificial de manera complementaria, ética y crítica:

- **Alex Huamán** — Firma: ____________________  
- **David Torres** — Firma: ____________________  
- **Emanuel Silva** — Firma: ____________________  
- **Gabriel Salazar** — Firma: ____________________  
- **Marcelo Ruiz** — Firma: ____________________  

*Fecha de consolidación:* 12 de noviembre de 2026

