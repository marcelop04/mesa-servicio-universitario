# Diseño de la API REST y panorama de alternativas

Fase III · Paquete A (Emanuel). Este documento resume el diseño de la API REST de la Mesa de Servicios
Universitarios. Además, compara REST con GraphQL, gRPC, webhooks y un API Gateway para justificar qué se usa
y qué queda fuera.

## 1. La API REST del sistema

### 1.1 Documentación viva

| Recurso | Dirección |
|---|---|
| Swagger UI (probar la API desde el navegador) | `http://localhost:8080/swagger-ui.html` |
| Contrato OpenAPI 3.1 en JSON | `http://localhost:8080/api/v1/openapi` |

El contrato se genera desde el código con springdoc, así que no puede quedar desactualizado. Los controladores
declaran el resumen, la descripción y las respuestas propias de cada ruta. `OpenApiConfig` agrega de forma
uniforme:

- **Esquema común de error `ErrorApi`:** `codigo`, `mensaje`, `errores[]` por campo e `id_correlacion`.
  Cada código HTTP de error trae un ejemplo.
- **Seguridad:** la cookie HttpOnly `MSU_SESION` con el JWT, más la cabecera `X-XSRF-TOKEN` en POST, PUT y DELETE.
- **Respuestas de error según el tipo de ruta:**
  - 400 si la ruta recibe datos;
  - 401 y 403 si exige sesión;
  - 404 si tiene identificador;
  - 409 en escrituras protegidas;
  - 500 en todas.

La prueba `OpenApiTest` comprueba que el contrato publicado mantenga estas reglas.

### 1.2 Diseño de recursos y rutas

- Todas las rutas parten de `/api/v1`. La versión va en la URL para poder publicar una `v2` sin romper el frontend.
- **Sustantivos en plural:** `/solicitudes`, `/notificaciones`, `/admin/usuarios`, `/admin/politicas`.
- Las acciones de negocio que cambian el estado son subrecursos con POST, porque crean un evento en el historial:
  `/solicitudes/{id}/evaluacion`, `/asignaciones`, `/inicio`, `/resoluciones`, `/conformidad` y `/encuesta`.
- Los filtros, el orden y la paginación van como parámetros de consulta. Ejemplo:
  `GET /solicitudes?estado=PENDIENTES&orden=vencimiento&pagina=1&tamano=20`.
- **Campos JSON en `snake_case`**, como el diccionario de datos. Las fechas van en ISO 8601 UTC y la interfaz
  las muestra en hora de Lima.

### 1.3 Códigos HTTP usados

| Código | Cuándo |
|---|---|
| 200 OK | Lecturas y acciones que devuelven el recurso actualizado |
| 201 Created | Altas: solicitud, comentario, evidencia, encuesta, usuario, catálogo, política |
| 204 No Content | Sin cuerpo: cierre de sesión, encuesta aún no respondida, aviso eliminado |
| 400 Bad Request | `DATOS_INVALIDOS` o `FORMATO_INVALIDO`, con la lista de campos |
| 401 Unauthorized | `SIN_SESION` o `CREDENCIALES_INVALIDAS` |
| 403 Forbidden | `ACCESO_DENEGADO` (rol o recurso ajeno) o `CSRF_INVALIDO` |
| 404 Not Found | `NO_ENCONTRADO` |
| 409 Conflict | `CONFLICTO_VERSION` (HU24) o una regla de negocio (`ENCUESTA_DUPLICADA`, `POLITICA_DESACTUALIZADA`, `VENTANA_VENCIDA`…) |
| 413 / 415 | Imagen mayor de 5 MB o de un tipo no admitido |
| 500 | `ERROR_INTERNO`, sin trazas; el `id_correlacion` permite ubicarlo en los logs |

### 1.4 Rutas agregadas en la fase III (paquete A)

| Método y ruta | Historia | Acceso |
|---|---|---|
| `GET /solicitudes/{id}/encuesta` | HU13 | Mismo acceso que el detalle; 204 si no hay encuesta |
| `POST /solicitudes/{id}/encuesta` | HU13 | Solicitante propietario; solo en solicitudes Cerradas |
| `GET /admin/politicas` | HU22 | Administrador |
| `POST /admin/politicas` | HU22 | Administrador; envía `version_base` para detectar publicaciones simultáneas |
| `GET /admin/auditoria` | HU23 | Administrador; filtros `accion`, `entidad`, `actor`, `desde`, `hasta` |
| `GET /admin/auditoria/opciones` | HU23 | Administrador |

### 1.5 Pruebas de la API

- **Integración (JUnit + MockMvc):** cada ruta se prueba con la cadena de seguridad real (JWT y CSRF) sobre H2
  en modo MySQL y las migraciones de Flyway. Se cubren casos positivos y negativos por rol. Las clases del
  paquete A son `EncuestaTest`, `PoliticasTest`, `AuditoriaTest`, `LimpiezaRevocacionesTest` y `OpenApiTest`.
- **Manual:** desde Swagger UI se inicia sesión con `POST /auth/login` y se prueba cualquier ruta. El navegador
  ya envía la cookie de sesión.

## 2. Panorama de alternativas

### 2.1 GraphQL

**Qué es:** un único punto de entrada (`POST /graphql`) donde el cliente pide exactamente los campos que
necesita, en un esquema tipado.

**Ventajas para este sistema:**
- El detalle P06 combina la solicitud, los comentarios, las evidencias, el historial y la encuesta. Con GraphQL
  se pediría en una sola consulta.
- El dashboard podría elegir solo los indicadores visibles.

**Por qué no se adoptó:**
- La autorización de este sistema es por recurso y por estado (tabla 3, HU24). En GraphQL tendría que
  repetirse en cada *resolver* y en cada campo anidado, con más riesgo de exponer datos ajenos.
- Las consultas anidadas abren ataques de costo, como las consultas muy profundas. Habría que limitar
  profundidad y complejidad.
- El caché HTTP y los códigos de estado se pierden: casi todo responde 200 con un arreglo `errors`.
- El curso pide demostrar GET, POST, PUT y DELETE con códigos HTTP.

**Cuándo convendría:** si se agregara una aplicación móvil con pantallas muy distintas a las de la web.

### 2.2 gRPC

**Qué es:** RPC binario sobre HTTP/2 con contratos en Protocol Buffers. Es muy eficiente y tiene *streaming*
bidireccional.

**Por qué no se adoptó:**
- El navegador no habla gRPC de forma nativa: se necesita gRPC-Web y un proxy (por ejemplo Envoy).
- El JSON legible ayuda a depurar y a enseñar. En el volumen esperado (20 usuarios concurrentes, RNF06), la
  ventaja de rendimiento no se notaría.

**Cuándo convendría:** para comunicar servicios internos si el backend se dividiera en microservicios. Por
ejemplo, un servicio de notificaciones o de indicadores que recibe muchos eventos.

### 2.3 Webhooks

**Qué es:** el sistema hace un `POST` a una URL externa registrada cuando ocurre un evento, en lugar de que el
otro sistema consulte a cada rato.

**Cómo encajaría:** los eventos ya existen. Las transiciones generan `evento_operativo` y notificaciones con
`clave_evento` única, por ejemplo `RESOLVER`, `CIERRE` o `VENCIMIENTO`. Un módulo de webhooks podría:

1. Registrar suscripciones por evento (URL y secreto) en una tabla nueva, administradas desde P12.
2. Encolar el envío después del *commit* (patrón *outbox*), para no avisar de cambios que luego se revierten.
3. Firmar cada envío con HMAC-SHA256 (cabecera `X-MSU-Firma`), reintentar con espera exponencial y usar la
   `clave_evento` como identificador de idempotencia.

**Por qué no se implementó ahora:** ningún sistema externo de la universidad consume eventos hoy, y exponer
URLs de salida trae riesgos de SSRF que habría que mitigar con listas de destinos permitidos. Queda como
extensión natural para integrarse, por ejemplo, con un sistema de mensajería institucional.

### 2.4 API Gateway

**Qué es:** un punto de entrada delante de los servicios que concentra el enrutamiento, TLS, límites de
peticiones, autenticación, CORS, logs y métricas.

**Situación actual:** Nginx, en el contenedor del frontend, ya cumple parte del rol: sirve la SPA y reenvía
`/api` al backend. Así el navegador ve un solo origen y no se necesita CORS.

**Qué aportaría un gateway (Spring Cloud Gateway, Kong o el de la nube elegida):**
- Límite de peticiones en `/auth/login` contra fuerza bruta. Complementa la auditoría de `SESION_RECHAZADA`.
- Terminación TLS y cabeceras de seguridad (HSTS, CSP) en un solo lugar.
- Métricas y trazas por ruta antes de llegar al backend (fase IV, observabilidad).
- Enrutamiento por versión (`/api/v1` y una futura `/api/v2`) o hacia varios servicios.

**Decisión:** con un solo servicio backend, un gateway dedicado agrega una pieza más que operar sin una
ganancia proporcional. Se recomienda configurar en Nginx o en la nube el límite de peticiones y las cabeceras
de seguridad (paquete C). El gateway queda como siguiente paso si el sistema se divide en servicios.

## 3. Resumen de la decisión

| Estilo | Uso en el proyecto | Motivo |
|---|---|---|
| REST + OpenAPI | **Adoptado** | Autorización por recurso, códigos HTTP, caché y herramientas estándar; lo pide el curso |
| GraphQL | No | Más riesgo de autorización y de costo de consultas; sin beneficio claro con una sola interfaz web |
| gRPC | No | No es nativo del navegador; útil solo entre servicios internos |
| Webhooks | Diseñado, no implementado | No hay consumidores externos todavía; diseño con *outbox*, HMAC y reintentos |
| API Gateway | Parcial con Nginx | Proxy de un solo origen; límites y cabeceras en Nginx o la nube |
