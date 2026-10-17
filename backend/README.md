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
| `JWT_SECRET` | Clave HS256 de los tokens (32 bytes o más) | solo desarrollo |
| `JWT_DURACION` | Vigencia del token | `PT2H` |

Con Docker: `docker compose up --build` desde la raíz del repositorio (ver README principal).

## Pruebas

```bash
./mvnw test     # H2 en modo MySQL con las migraciones reales
```

## Estructura por módulos y capas

```
pe.edu.unmsm.msu
├── comun/          errores con formato común, paginación (items, pagina, tamaño, total), correlación, OpenAPI
├── seguridad/      Spring Security sin estado, JWT en cookie HttpOnly, CSRF para SPA, revocación (DV04)
├── identidad/      Rol, Usuario y revocación de sesión; registro, perfil y contraseña (DV03, DV05)
├── catalogos/      entidad · repositorio · dto · servicio · controlador   (HU21, GB05)
├── administracion/ dto · servicio · controlador de usuarios internos      (HU20, GB04)
├── politicas/      Política y detalle; MatrizPrioridad, PlazosServicio (HU14, MR02)
├── solicitudes/    entidades de la tabla 16, TransicionesServicio (MR03), SupervisionServicio (MR04–MR06),
│                   ListadoSolicitudesServicio, SolicitudesDemo (datos de ejemplo para P07)
├── notificaciones/ Notificacion y Notificador (avisos deduplicados, RN10)
├── auditoria/      entidad Auditoria (RF30)
└── datos/          DatosIniciales: cuentas por rol y política de plazos v1 (GB07)
```

Migraciones en `src/main/resources/db/migration`:

- `V1__identidad_y_catalogos.sql`: tablas de la sección 9.2 (Gabriel).
- `V2__datos_iniciales_catalogos.sql`: roles, estados, prioridades, áreas, categorías y ubicaciones (GB07).
- `V4__secuencia_codigo.sql`: correlativo del código MSU por año (Alex, AX01).
- `V3__solicitudes_y_seguimiento.sql`: tablas de la sección 9.3 y revocación de sesión (Marcelo, MR01).

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
| `POST /api/v1/solicitudes` | Solicitante | HU04 (AX01) |
| `GET/POST /api/v1/solicitudes/{id}/comentarios` | Participantes de la solicitud | HU06 (AX03) |
| `GET/POST /api/v1/solicitudes/{id}/evidencias` | Participantes; JPEG o PNG, 5 MB, máximo 3 | HU06 (AX03) |
| `GET /api/v1/evidencias/{id}/archivo` | Revalida el acceso a la solicitud | HU06 (AX03) |
| `GET /api/v1/solicitudes` | Solicitante (propias), técnico (asignadas), supervisor (todas) | HU05, RF07 |
| `GET /api/v1/solicitudes/{id}` | Propietario, técnico asignado o supervisor | HU05, HU24 |
| `POST /api/v1/solicitudes/{id}/evaluacion` | Supervisor | HU07 (MR04) |
| `POST /api/v1/solicitudes/{id}/asignaciones` | Supervisor | HU08 (MR05) |
| `POST /api/v1/solicitudes/{id}/cancelacion` | Supervisor | HU09 (MR06) |
| `GET /api/v1/supervision/tecnicos?area_id=` | Supervisor | RF10 carga por técnico |
| `POST /api/v1/solicitudes/{id}/inicio` | Técnico asignado | HU10 (EM01) |
| `POST /api/v1/solicitudes/{id}/resoluciones` | Técnico asignado | HU11 (EM02) |
| `POST /api/v1/solicitudes/{id}/conformidad` | Solicitante propietario, dentro de 72 h | HU12 (EM03) |
| `GET /api/v1/solicitudes/{id}/historial` | Mismo acceso que el detalle | HU23 (EM04) |
| `POST /api/v1/auth/registro` | Público | HU01 (DV03) |
| `GET /api/v1/auth/csrf`, `POST /api/v1/auth/login`, `POST /api/v1/auth/logout` | Público | HU02 (DV04) |
| `GET /api/v1/me`, `PUT /api/v1/me`, `PUT /api/v1/me/password` | Autenticado | HU03 (DV05) |

Los campos JSON usan `snake_case` (`area_id`, `id_correlacion`), igual que el diccionario de datos y la
API simulada del prototipo, para que React cambie de una a otra sin tocar los contratos (sección 12.4).
Los listados devuelven `items`, `pagina`, `tamaño` y `total`.

`tipo` ∈ `areas`, `categorias`, `ubicaciones`, `estados`, `prioridades`. Estados y prioridades son fijos:
solo cambia su nombre visible; crear, eliminar o desactivar responde 409.

## Sesión con JWT en cookie HttpOnly (DV04)

- `POST /api/v1/auth/login` responde el perfil y la cookie `MSU_SESION` (HttpOnly, SameSite=Lax, Secure si
  `COOKIE_SECURE=true`) con un JWT HS256 de 2 horas. No hay sesión en el servidor (`STATELESS`).
- El token lleva `sub`, `rol`, `ver` (versión de autorización) y `jti`. `FiltroJwt` lo rechaza si la firma o la
  vigencia no son válidas, si se revocó, si la cuenta está desactivada o si su versión cambió (cambio de rol, área
  o contraseña).
- `POST /api/v1/auth/logout` guarda el `jti` en `revocacion_sesion` hasta que expire y borra la cookie.
- CSRF: cookie `XSRF-TOKEN` legible + cabecera `X-XSRF-TOKEN` en cada escritura (el frontend ya la envía).
- `JWT_SECRET` (32 bytes o más) firma los tokens; el valor por defecto solo sirve para desarrollo.
