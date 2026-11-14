# Pruebas de API con Postman y Newman (E1)

Suite integral de pruebas de API automatizadas para la **Mesa de Servicios Universitarios (MSU)**, diseñada para ejecutarse localmente y en el pipeline de Integración Continua (GitHub Actions).

## Estructura de la Suite

- `colecciones/MSU-API.postman_collection.json`: Colección completa en formato Postman v2.1 organizada por rol y por historias de usuario (HU01 a HU24).
- `entornos/MSU-Local.postman_environment.json`: Variables de entorno para ejecución local (`http://localhost:8080`).
- `entornos/MSU-CI.postman_environment.json`: Variables de entorno para ejecución en GitHub Actions.
- `generar-coleccion.js`: Script Node.js que genera la colección Postman de manera declarativa y determinista.
- `reportes/`: Directorio donde se almacenan los reportes JUnit XML (`junit-report.xml`) y HTML.

## Cobertura de Pruebas

La colección abarca 59 peticiones y 173 aserciones que cubren:
1. **Flujos felices (200 OK, 201 Created, 204 No Content):**
   - Ciclo de vida completo de solicitud: Registro (HU04) → Evaluación y Cambio de Impacto (HU07) → Asignación de Técnico (HU08) → Inicio de Atención (HU10) → Resolución Técnica (HU11) → Confirmación de Solución (HU12) → Encuesta de Satisfacción (HU13).
   - Administración de usuarios internos (HU20) y catálogos con borrado lógico (HU21).
   - Consulta y publicación de versiones de políticas (HU22) y auditoría administrativa (HU23).
   - Centro de notificaciones: listado, conteo de no leídas y marcado masivo (HU16).
   - Dashboard de indicadores y exportación de reportes CSV (HU17, HU18, HU19).
2. **Validaciones de entrada (400 Bad Request):**
   - DTOs con errores por campo (`DATOS_INVALIDOS`): longitud mínima de descripción, solución muy corta, correo inválido, primera atención mayor que resolución.
3. **No autenticado (401 Unauthorized):**
   - Peticiones sin cookie de sesión o con JWT inválido/revocado (`SIN_SESION`).
4. **Control de acceso y seguridad (403 Forbidden):**
   - RBAC: Solicitante intentando acceder a `/admin/usuarios` o `/indicadores` (`ACCESO_DENEGADO`).
   - CSRF: Peticiones de mutación (POST/PUT/DELETE) con token CSRF inválido o ausente (`CSRF_INVALIDO`).
5. **Recurso no encontrado (404 Not Found):**
   - Solicitudes inexistentes (`NO_ENCONTRADO`).
6. **Conflictos y reglas de negocio (409 Conflict):**
   - Encuesta sobre solicitud no cerrada o encuesta duplicada (`ENCUESTA_DUPLICADA`, `ENCUESTA_NO_DISPONIBLE`).
   - Correo duplicado en registro (`CORREO_DUPLICADO`).

## Mecanismos Técnicos Implementados

- **Cookie JWT HttpOnly (`MSU_SESION`):** Newman almacena y reenvía automáticamente la cookie en el Cookie Jar tras el login por rol.
- **Protección CSRF:** Script de colección que extrae el token de la cookie `XSRF-TOKEN` y lo inyecta dinámicamente en la cabecera `X-XSRF-TOKEN` para peticiones POST, PUT y DELETE. Además detecta la rotación del token CSRF tras el inicio de sesión.
- **Trazabilidad (`X-Correlation-Id`):** Se valida que cada respuesta incluya la cabecera de correlación emitida por `FiltroCorrelacion`.

## Ejecución Local

### Requisito previo
Tener el stack de Docker levantado:
```bash
docker compose up -d
```

### Comando único de ejecución
```bash
cd tests/api
npm test
```

Para generar un reporte HTML interactivo con `newman-reporter-htmlextra`:
```bash
npm run test:html
```
El reporte se generará en `tests/api/reportes/index.html`.
