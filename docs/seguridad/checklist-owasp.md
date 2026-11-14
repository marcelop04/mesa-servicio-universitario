# C1 · Lista de control OWASP

Revisión inicial del 11/11/2026; corte actualizado **13/11 Lima / 14/11 UTC** sobre
main `c8d4e5c`. Referencia: [OWASP Top 10:2025](https://owasp.org/Top10/2025/).
La rúbrica no fija edición. No es una certificación ni una afirmación de ausencia de vulnerabilidades.

Actualización C sobre `main 5e83051`: [integración y pruebas](integracion-main-b.md).
El perfil `prod` exige cookies seguras y prohíbe ambas siembras demo; el proxy Caddy aplica las
cabeceras también al HTML y sobrescribe la IP proporcionada por el cliente. La prueba TLS local
no sustituye la comprobación del servidor público ni autoriza ejecutar ZAP.

**Actualización:** HTTPS, CSP/HSTS, nosniff, antiframe y cookie CSRF Secure se
comprobaron con GET a `/`, `/api/v1/auth/csrf` y `/api/v1/me` del origen público.
Se ejecutó [ZAP autorizado](dast-2026-11-13.md). Las correcciones posteriores de
CSP/COOP/COEP/CORP están en este PR, **no desplegadas ni revalidadas públicamente**.

**Estados:** «verificado» = revisión de código/prueba local; «preparado» = configuración sin ejecución externa;
«pendiente» = requiere evidencia o decisiones del equipo. HTTPS simulado en MockMvc no demuestra TLS real.

| Riesgo 2025 | Lista de control / evidencia concreta | Resultado y pendiente |
|---|---|---|
| A01 Control de acceso roto | Spring Security deniega por defecto; rutas de administración y supervisión por rol; `Permisos` comprueba propietario/asignado; CSRF en escrituras; `AccesosPorRolTest` y pruebas previas | Verificado en integración: 401/403, sin datos ajenos ni efectos laterales. Técnico sin asignación pierde incluso la descarga; admin no hereda operación |
| A02 Configuración insegura | CSP, antiframe, nosniff, Referrer/Permissions-Policy; errores genéricos y cabeceras en HTML/errores | Verificados HTTPS/HSTS/CSRF Secure públicos; ZAP observó CSP CSS permisiva y falta de aislamiento. Correcciones y pruebas C en este PR; falta CD/reprueba pública. Proxy aislado sigue comprobando que no se confíe en headers del cliente |
| A03 Fallos de cadena de suministro | Lockfile, npm ci/audit, Dependency-Check 13, CodeQL Java/JS | [CI actual](resultados-ci.md): npm 0; Java aprobado con 23 excepciones existentes, no CVE eliminados. [Cinco alertas CodeQL del prototipo revisadas](alertas-codeql-main.md), sin descartarlas. CD ya exige CI/CodeQL del mismo SHA; checks de rama siguen en B3 |
| A04 Fallos criptográficos | BCrypt; JWT HS256 y clave externa; cookies HttpOnly/SameSite/Secure | TLS y cookie CSRF Secure comprobados públicamente. Cookie JWT validada por las pruebas C y evidencias HTTPS de B; no se repitió login público en esta intervención. Revalidar sesión en la release corregida, sin publicar valores |
| A05 Inyección | Repositorios JPA y JDBC parametrizados; ordenamiento por lista permitida; DTO y validaciones de dominio; renderizado de texto React sin HTML arbitrario | Revisión local y suite funcional. No se añadieron concatenaciones de SQL con entradas de usuario. No afirmar inmunidad a SQLi/XSS sin revisión dinámica; CSP no reemplaza validación |
| A06 Diseño inseguro | Mínimo privilegio por rol y recurso; transiciones y versiones optimistas; evidencias privadas con nombre UUID y límites de tamaño/cantidad | Diseño conservado y pruebas negativas adicionales. Residual: firmas PNG/JPEG no equivalen a antivirus ni a decodificación íntegra de imagen; si cambia el alcance de archivos, revisar con Alex |
| A07 Fallos de autenticación | Mensajes genéricos para usuario inexistente/inactivo; límite configurable por cuenta+IP e IP, Retry-After; revocación y versión de autorización | Pruebas unitarias de tiempo/concurrencia/capacidad y endpoint 429. Residual: memoria de una instancia, reinicio limpia contadores, bot distribuido puede repartir IP; escalar exige acuerdo con David, sin prometer defensa distribuida |
| A08 Integridad de software/datos | JWT firmado, Flyway, artefactos por SHA/digest y auditoría sin edición | JWT alterado/revocado rechazado. CI/CodeQL/CD de c8d4e5c aprobados y gate por SHA comprobado en código. No se cambiaron reglas administrativas; main aún requiere el ajuste de checks documentado por B |
| A09 Fallos de registro/alertas | Auditoría administrativa existente; correlación validada; eliminación de mensajes SQL potencialmente sensibles; sanitización en mapas/listas/arreglos | `AuditoriaSanitizacionTest` y `AuditoriaTest`. Pendiente Gabriel: logs JSON, métricas, trazas y alertas. No registrar bodies, cookies, Authorization ni passwords; limitar acceso a logs |
| A10 Manejo incorrecto de condiciones excepcionales | Errores uniformes; JSON inválido → 400, tipo no admitido → 415; 401/403/409/429 explícitos; reserva de cupo se libera ante fallos técnicos; memoria acotada sin expulsar bloqueos | Pruebas locales; falla inesperada responde mensaje genérico con correlación y no vuelca mensajes/cadenas de causas. Falta simulacro operacional del paquete D y escaneo publicado |

## Controles específicos del reparto C1

- [x] Cookie de sesión `HttpOnly`, `SameSite=Lax`, `Secure` configurable y prueba de borrado con mismos atributos.
- [x] Cookie CSRF `SameSite=Lax`, `Secure` con la misma opción; continúa legible por JS por diseño de SPA.
- [x] Guard de despliegue: activo por defecto en `prod`; exige cookies seguras y ambas siembras demo desactivadas.
- [x] CSP en Spring/Nginx/Caddy sin JavaScript inline/eval ni unsafe-inline CSS; solo hash del estilo estático de Swagger. Corrección local, pendiente CD/reprueba pública.
- [x] HSTS en respuestas HTTPS de Spring; Nginx solo si recibe HTTPS directamente, sin preload ni includeSubDomains.
- [x] Límite 5 fallos por cuenta+IP / 50 por IP, 15 minutos, configurable y probado sin esperas reales.
- [x] DB y JWT sin secretos por defecto en ejecución; generador `.env` no sobrescribe y Git lo ignora.
- [x] Pantalla y recorridos ya no usan una contraseña demo fija; fixtures de `src/test` siguen siendo ficticios.
- [x] TLS/HSTS y cookie CSRF Secure comprobados públicamente; prod sin siembras/guard y puertos aislados documentados por B en `entrega-main.json`.
- [x] B integró saneamiento de IP reenviada y aislamiento del backend; prueba C de proxy real valida la configuración sin confiar en headers inventados.
- [ ] Equipo: inventario/rotación de secretos o cuentas anteriores y bootstrap seguro de bases nuevas; no se certifica por desactivar siembras.
- [x] Marcelo: baseline público autorizado y análisis individual, con reporte y SHA conservados.
- [ ] Marcelo + B: desplegar eventualmente la política corregida, revalidar cookie JWT y repetir ZAP sobre esa release; no usar el resultado local como sustituto.

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
| C-03 | CSP/flags CSRF y endurecimiento de cabeceras | Configuración de seguridad y pruebas; CSP/HSTS/CSRF Secure comprobados públicamente | Nueva CSP/hash y COOP/COEP/CORP en este PR por ZAP; falta CD/reprueba pública |
| C-04 | 6 paquetes vulnerables según npm audit inicial (3 moderados, 1 alto, 2 críticos) | Vite 6.4.6, Vitest 5.1.0, React Router 7.18.5; lockfile regenerado, pruebas y build | Auditoría local posterior: 0; no se usó `audit fix --force` |
| C-05 | Sanitización de auditoría no recorría colecciones | Limpieza recursiva de mapas, listas y arreglos de objetos con prueba dedicada | Verificado; no guardar secretos en campos con nombres no sensibles |
| C-06 | Mensajes del motor SQL y cadenas de error podían llegar a logs | Log de tipo/correlación sin mensajes ni causas crudas; errores HTTP explícitos | Código corregido, revisión final de logs pendiente D |
| C-07 | Dependencias Java señaladas | Parches iniciales y 23 excepciones versionadas/caducables del PR #7; no modificadas aquí | CI actual aprobado, 0 no suprimidas/23 suprimidas. No se concluye no aplicabilidad solo por buscar símbolos; revisar ContentDisposition, supuestos y caducidad con el equipo |
| C-08 | DAST antes bloqueado por ambiente | Origen desplegado y autorización específica obtenidos; baseline real con reporte | Desbloqueado el escaneo inicial; C3 sigue parcial por CD/reprueba de las correcciones |
| C-09 | Cinco alertas CodeQL del prototipo | Revisión por alerta, guard de redirección y aislamiento real de los contextos de imagen | Propuestas de clasificación y riesgo del mock pendientes del equipo; no descartadas ni ocultas |
