# Fase II · Parte de David (identidad, sesión y seguridad)

Estado al 17/10/2026. Cada tarea se compara con su criterio de «Terminado cuando» del plan de trabajo.

| ID | Tarea | Terminado cuando | Estado | Evidencia |
|---|---|---|---|---|
| DV01 | Proyecto Spring Boot por capas y módulos | Compila, arranca y se conecta a MySQL | Hecho (base existente, verificada en MySQL 8.0 con Docker) | `backend/`, `docker compose up` |
| DV02 | Manejador global de errores, paginación y OpenAPI | Swagger muestra las rutas y un error tiene el formato acordado | Hecho (base existente) | `comun/`, `/swagger-ui.html` |
| DV03 | HU01 Registrar una cuenta (`POST /auth/registro`) | Cumple BDD 1 y 2 de HU01 | Hecho | `CuentaServicio`, `CuentaControlador`; `IdentidadTest.hu01…` |
| DV04 | HU02 Iniciar y cerrar sesión con JWT en cookie HttpOnly y CSRF | Cumple BDD 1 y 2; la cookie no es legible desde JavaScript | Hecho | `TokenJwt`, `FiltroJwt`, `CookieSesion`, `RevocadorSesion`, `SeguridadConfig`; `IdentidadTest.hu02…`, `AutenticacionTest`; captura 14 |
| DV05 | HU03 Consultar perfil y cambiar contraseña | Cumple BDD 1 y 2 de HU03 | Hecho | `PUT /me`, `PUT /me/password`; `IdentidadTest.hu03…` |
| DV06 | HU24 Reglas comunes de autorización por rol y por propiedad | Un solicitante no ve solicitudes ajenas | Hecho | `SeguridadConfig` (rutas por rol) y `Permisos` (propiedad o asignación); `SolicitudesTest.hu24Bdd1…` |
| DV07 | Pantallas P01 Registro, P02 Inicio de sesión y P03 Perfil | Funcionan contra la API real | Hecho | `frontend/src/paginas/identidad/`, `Login.jsx`; capturas 13 y 14 |
| DV08 | Contexto de sesión y rutas protegidas por rol | Cada rol solo entra a sus pantallas | Hecho | `SesionContext.jsx`, `RutaProtegida.jsx` |
| DV09 | Pruebas del backend de su módulo | Login válido, cuenta desactivada y solicitud ajena pasan | Hecho | `IdentidadTest` (9), `AutenticacionTest` (5) |

## Cómo funciona la sesión

- **Inicio:** credenciales válidas → cookie `MSU_SESION` con un JWT HS256 de 2 horas (HttpOnly, SameSite=Lax,
  Secure con `COOKIE_SECURE=true`). Credenciales inválidas o cuenta desactivada → 401 con mensaje genérico; se
  compara un hash aunque el correo no exista, para no revelar qué cuentas existen.
- **Cada petición:** `FiltroJwt` verifica firma y vigencia, que el `jti` no esté revocado, que la cuenta siga
  activa y que su versión de autorización no haya cambiado. No hay sesión en el servidor.
- **Revocación:** cerrar sesión guarda el `jti` en `revocacion_sesion`; cambiar rol, área, desactivar la cuenta o
  cambiar la contraseña incrementa `version_autorizacion` e invalida todos los tokens anteriores. Al cambiar la
  contraseña, la sesión actual recibe un token nuevo.
- **Registro:** siempre crea un solicitante; un campo `rol` enviado por el cliente se ignora. El correo se
  recorta y se guarda en minúsculas; un duplicado responde 409 `CORREO_DUPLICADO`.
- **Perfil:** el usuario solo cambia su nombre. Rol, área y correo los administra la institución (HU03 BDD 2).
- **Secreto:** `JWT_SECRET` debe tener 32 bytes o más; la aplicación no arranca con uno más corto.

## Cambios en las pruebas de los demás

Las pruebas siguen usando `.session(sesion("correo"))`: `PruebaApi` ahora guarda el JWT en esa sesión de prueba
y `ConfiguracionPruebas` lo envía como la cookie `MSU_SESION`, igual que el navegador.
