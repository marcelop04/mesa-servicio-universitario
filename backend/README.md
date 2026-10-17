# Backend · API REST (Spring Boot)

Spring Boot 3.5 · Java 17+ · MySQL 8 · Flyway · Spring Security · OpenAPI.

## Ejecutar en local

1. Base de datos MySQL 8 (cualquiera de las dos opciones):
   ```bash
   # Opción A: Docker
   docker run -d --name msu-mysql -p 3306:3306 \
     -e MYSQL_ROOT_PASSWORD=raiz_local -e MYSQL_DATABASE=mesa_servicios \
     -e MYSQL_USER=msu -e MYSQL_PASSWORD=msu_local mysql:8.0
   # Opción B: MySQL instalado: crear la base mesa_servicios y el usuario msu/msu_local
   ```
2. Arrancar la API (crea las tablas con Flyway y carga los datos de prueba):
   ```bash
   ./mvnw spring-boot:run        # Windows: mvnw.cmd spring-boot:run
   ```
3. Swagger: <http://localhost:8080/swagger-ui.html> · contrato: <http://localhost:8080/api/v1/openapi>

Variables de entorno (valores por defecto solo para desarrollo):

| Variable | Uso | Por defecto |
|---|---|---|
| `DB_URL` | URL JDBC | `jdbc:mysql://localhost:3306/mesa_servicios?...` |
| `DB_USER` / `DB_PASSWORD` | Credenciales de MySQL | `msu` / `msu_local` |
| `DATOS_DEMO` | Crea cuentas de prueba y la política v1 | `true` |
| `DEMO_PASSWORD` | Contraseña de las cuentas de prueba | `Demo12345!` |
| `COOKIE_SECURE` | Cookie de sesión solo por HTTPS | `false` |

## Pruebas

```bash
./mvnw test     # H2 en modo MySQL con las migraciones reales
```

## Estructura por módulos y capas

```
pe.edu.unmsm.msu
├── comun/          errores con formato común, paginación (items, pagina, tamaño, total), correlación, OpenAPI
├── seguridad/      configuración de Spring Security, CSRF para SPA, sesión PROVISIONAL (ver abajo)
├── identidad/      entidad y repositorio de Rol y Usuario
├── catalogos/      entidad · repositorio · dto · servicio · controlador   (HU21, GB05)
├── administracion/ dto · servicio · controlador de usuarios internos      (HU20, GB04)
├── solicitudes/    ConsultaSolicitudes: carga pendiente y uso de categorías (lo reemplazan Alex y Marcelo)
└── datos/          DatosIniciales: cuentas por rol y política de plazos v1 (GB07)
```

Migraciones en `src/main/resources/db/migration`:

- `V1__identidad_y_catalogos.sql`: tablas de la sección 9.2 (Gabriel).
- `V2__datos_iniciales_catalogos.sql`: roles, estados, prioridades, áreas, categorías y ubicaciones (GB07).
- **Marcelo (MR01)** agrega las tablas de la sección 9.3 desde `V3__...`.

## Rutas implementadas

| Método y ruta | Permiso | Historia |
|---|---|---|
| `GET /api/v1/catalogos?tipo=` | Autenticado | Opciones activas para formularios |
| `GET /api/v1/admin/catalogos/{tipo}` | Administrador | HU21 |
| `POST /api/v1/admin/catalogos/{tipo}` | Administrador | HU21 |
| `PUT /api/v1/admin/catalogos/{tipo}/{id}` | Administrador | HU21 (actualizar, desactivar, reactivar) |
| `DELETE /api/v1/admin/catalogos/{tipo}/{id}` | Administrador | HU21 · D07 (desactivación lógica) |
| `GET /api/v1/admin/usuarios` | Administrador | HU20 (filtros rol, activo, q; carga por técnico) |
| `POST /api/v1/admin/usuarios` | Administrador | HU20 |
| `PUT /api/v1/admin/usuarios/{id}` | Administrador | HU20 (409 si el técnico tiene casos pendientes) |
| `GET /api/v1/auth/csrf`, `POST /api/v1/auth/login`, `POST /api/v1/auth/logout`, `GET /api/v1/me` | — | Provisional |

Los campos JSON usan `snake_case` (`area_id`, `id_correlacion`), igual que el diccionario de datos y la
API simulada del prototipo, para que React cambie de una a otra sin tocar los contratos (sección 12.4).
Los listados devuelven `items`, `pagina`, `tamaño` y `total`.

`tipo` ∈ `areas`, `categorias`, `ubicaciones`, `estados`, `prioridades`. Estados y prioridades son fijos:
solo cambia su nombre visible; crear, eliminar o desactivar responde 409.

## Sesión provisional (para David, DV04)

La sesión usa hoy la cookie de sesión del servidor (`JSESSIONID`, HttpOnly) para que las pantallas
de administración funcionen de punta a punta. DV04 la reemplaza por JWT en cookie HttpOnly. Se
mantiene igual:

- CSRF: cookie `XSRF-TOKEN` legible + cabecera `X-XSRF-TOKEN` (ya la usa el frontend).
- Reglas de autorización de `SeguridadConfig` y el principal `UsuarioAutenticado`.
- `usuario.version_autorizacion`: se incrementa al cambiar rol/área o desactivar; `FiltroVigenciaSesion`
  rechaza sesiones con una versión anterior (sección 3.1). El JWT puede llevar esa versión como claim.
