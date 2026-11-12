# C1 · Lista de control OWASP

Revisión del 11/11/2026. Referencia: [OWASP Top 10:2025](https://owasp.org/Top10/2025/), vigente a la fecha.
La rúbrica no fija edición. No es una certificación ni una afirmación de ausencia de vulnerabilidades.

**Estados:** «verificado» = revisión de código/prueba local; «preparado» = configuración sin ejecución externa;
«pendiente» = requiere evidencia o decisiones del equipo. HTTPS simulado en MockMvc no demuestra TLS real.

| Riesgo 2025 | Lista de control / evidencia concreta | Resultado y pendiente |
|---|---|---|
| A01 Control de acceso roto | Spring Security deniega por defecto; rutas de administración y supervisión por rol; `Permisos` comprueba propietario/asignado; CSRF en escrituras; `AccesosPorRolTest` y pruebas previas | Verificado en integración: 401/403, sin datos ajenos ni efectos laterales. Técnico sin asignación pierde incluso la descarga; admin no hereda operación |
| A02 Configuración insegura | CSP, antiframe, nosniff, Referrer/Permissions-Policy; sin stacktraces al cliente; `SeguridadWebTest`; Nginx aplica cabeceras al HTML y a errores | Backend verificado; cabeceras comprobadas en HTML, CSRF y 401 del Nginx HTTP local ya levantado. HSTS/Secure y proxy HTTPS reales pendientes con David; no confiar en cabeceras reenviadas arbitrarias |
| A03 Fallos de cadena de suministro | Lockfile npm, `npm ci`, npm audit, Dependency-Check 13, CodeQL Java/JS | Avisos npm corregidos y auditoría local sin hallazgos; CodeQL en GitHub pendiente. Dependency-Check completado: parches reducen 68 a 23 CVE distintos; sigue NO aprobado por Spring. [Evidencia/decisión](analisis-dependencias.md). David debe condicionar CD a resultados |
| A04 Fallos criptográficos | BCrypt; JWT HS256 y duración limitada; clave JWT externa obligatoria de 32 bytes o más; cookies HttpOnly/SameSite y Secure en despliegue | `CookiesHttpsTest`, `TokenJwt`, `CookieSesion`, `VerificadorSeguridad`. Pendiente verificar HTTPS/certificado del despliegue y canales DB/backup con David |
| A05 Inyección | Repositorios JPA y JDBC parametrizados; ordenamiento por lista permitida; DTO y validaciones de dominio; renderizado de texto React sin HTML arbitrario | Revisión local y suite funcional. No se añadieron concatenaciones de SQL con entradas de usuario. No afirmar inmunidad a SQLi/XSS sin revisión dinámica; CSP no reemplaza validación |
| A06 Diseño inseguro | Mínimo privilegio por rol y recurso; transiciones y versiones optimistas; evidencias privadas con nombre UUID y límites de tamaño/cantidad | Diseño conservado y pruebas negativas adicionales. Residual: firmas PNG/JPEG no equivalen a antivirus ni a decodificación íntegra de imagen; si cambia el alcance de archivos, revisar con Alex |
| A07 Fallos de autenticación | Mensajes genéricos para usuario inexistente/inactivo; límite configurable por cuenta+IP e IP, Retry-After; revocación y versión de autorización | Pruebas unitarias de tiempo/concurrencia/capacidad y endpoint 429. Residual: memoria de una instancia, reinicio limpia contadores, bot distribuido puede repartir IP; escalar exige acuerdo con David, sin prometer defensa distribuida |
| A08 Integridad de software/datos | JWT con firma y comparación constante; migraciones Flyway con validación; artefactos derivados de código probado; auditoría sin rutas de modificación | JWT alterado rechazado y suite pasa. Protección de ramas, revisión de alertas, procedencia y despliegue de imágenes siguen en B3; no se configuró GitHub remotamente |
| A09 Fallos de registro/alertas | Auditoría administrativa existente; correlación validada; eliminación de mensajes SQL potencialmente sensibles; sanitización en mapas/listas/arreglos | `AuditoriaSanitizacionTest` y `AuditoriaTest`. Pendiente Gabriel: logs JSON, métricas, trazas y alertas. No registrar bodies, cookies, Authorization ni passwords; limitar acceso a logs |
| A10 Manejo incorrecto de condiciones excepcionales | Errores uniformes; JSON inválido → 400, tipo no admitido → 415; 401/403/409/429 explícitos; reserva de cupo se libera ante fallos técnicos; memoria acotada sin expulsar bloqueos | Pruebas locales; falla inesperada responde mensaje genérico con correlación y no vuelca mensajes/cadenas de causas. Falta simulacro operacional del paquete D y escaneo publicado |

## Controles específicos del reparto C1

- [x] Cookie de sesión `HttpOnly`, `SameSite=Lax`, `Secure` configurable y prueba de borrado con mismos atributos.
- [x] Cookie CSRF `SameSite=Lax`, `Secure` con la misma opción; continúa legible por JS por diseño de SPA.
- [x] Guard de despliegue: `SEGURIDAD_DESPLIEGUE=true` exige `COOKIE_SECURE=true` y `DATOS_DEMO=false`.
- [x] CSP en Spring y Nginx; sin JavaScript inline/eval. Estilos inline conservados por compatibilidad con React.
- [x] HSTS en respuestas HTTPS de Spring; Nginx solo si recibe HTTPS directamente, sin preload ni includeSubDomains.
- [x] Límite 5 fallos por cuenta+IP / 50 por IP, 15 minutos, configurable y probado sin esperas reales.
- [x] DB y JWT sin secretos por defecto en ejecución; generador `.env` no sobrescribe y Git lo ignora.
- [x] Pantalla y recorridos ya no usan una contraseña demo fija; fixtures de `src/test` siguen siendo ficticios.
- [ ] David: activar y verificar flags, secretos únicos, TLS y HSTS en el borde; revisar cuentas existentes y bootstrap.
- [ ] David: configurar proxy e IP real con confianza restringida; no publicar MySQL ni exponer backend fuera del borde.
- [ ] Marcelo: ejecutar ZAP autorizado, registrar hallazgos/correcciones/reprueba sobre la release desplegada.

## Si el docente usa la edición 2021

Se revisan también esos conceptos: A01 acceso (fila 2025 A01); A02 criptografía (A04); A03 inyección (A05);
A04 diseño (A06); A05 configuración (A02); A06 componentes vulnerables (A03); A07 autenticación (A07);
A08 integridad (A08); A09 logs (A09). **A10:2021 SSRF:** no se encontró una función que descargue URLs
indicadas por usuarios en el backend revisado; el cliente Vite/proxy usa configuración de operadores,
no parámetros HTTP. No introducir descargas/webhooks sin validar destinos, red y autorización.

## Registro de hallazgos

| ID | Hallazgo | Tratamiento / evidencia | Estado |
|---|---|---|---|
| C-01 | Secretos de desarrollo por defecto reutilizables | Variables obligatorias; `.env.example` sin valores; generador CSPRNG; guía de migración sin borrar datos | Código corregido; rotación de valores ya publicados e historial requiere al equipo |
| C-02 | Sin límite de login | `LimiteIntentosLogin`, reserva concurrente, límites y tests 429 | Verificado localmente; proxy/varias réplicas pendiente B |
| C-03 | CSP faltante y flags CSRF no alineados | Configuración Spring/Nginx, cookie Secure en ambas, `CookiesHttpsTest` | Backend verificado; borde desplegado pendiente |
| C-04 | 6 paquetes vulnerables según npm audit inicial (3 moderados, 1 alto, 2 críticos) | Vite 6.4.6, Vitest 5.1.0, React Router 7.18.5; lockfile regenerado, pruebas y build | Auditoría local posterior: 0; no se usó `audit fix --force` |
| C-05 | Sanitización de auditoría no recorría colecciones | Limpieza recursiva de mapas, listas y arreglos de objetos con prueba dedicada | Verificado; no guardar secretos en campos con nombres no sensibles |
| C-06 | Mensajes del motor SQL y cadenas de error podían llegar a logs | Log de tipo/correlación sin mensajes ni causas crudas; errores HTTP explícitos | Código corregido, revisión final de logs pendiente D |
| C-07 | Análisis Java completado con dependencias señaladas | Parches compatibles, 155 pruebas pasan; 45 CVE dejan de aparecer. Conservar CVSS ≥ 7 y `failOnError`; sin supresiones nuevas | Abierto: quedan 23 CVE de Spring, 15 bloqueantes; decisión del equipo y CI pendientes |
| C-08 | Sin URL HTTPS autorizada | Workflow DAST manual, entorno protegido, reportes y procedimiento | Pendiente B1; no inventar hallazgos de ZAP |
