# C5 · Revisión de arquitectura, código y secretos

Fecha: 11/11/2026. Alcance: copia local recibida, con el paquete A ya integrado; sin historial Git.
Revisión asistida por IA; pendiente revisión y aceptación humana de Marcelo y del equipo.

## Actualización sobre main con B · 12/11/2026

Se conserva el monolito por capas y se incorpora el borde Caddy ya integrado en `5e83051`.
Hallazgos concretos tratados en C: defaults sensibles en `application-dev.yml` y `.env.example`,
falta de CSP en el borde, conflicto entre perfiles/guard, pérdida potencial de cabeceras/healthcheck al
combinar Nginx y CI que debía conservar SCA junto al ensayo RNF11. El guard también rechaza la
siembra de solicitudes aunque se desactive la de usuarios. Se prueban perfiles reales y errores HTTP
detrás del proxy. [Alcance y evidencia](integracion-main-b.md).

No se modifica el incidente A4, no se aceptan los PR D/E, no se cambia el pipeline CD ni se migran
dependencias mayores. El servidor público debe recibir una release revisada antes de dar C1/C3 por cerrados.
La configuración `forward-headers-strategy: framework` depende del aislamiento del backend y de que
Caddy sanee las cabeceras reenviadas. No se inventa un CIDR de confianza; David debe validar su red real.
La existencia de CSP/HTTPS no certifica autorización de rol ni ausencia de secretos en logs futuros.

## 1. Arquitectura y patrones encontrados

La aplicación es un **monolito modular**, no microservicios: frontend React → API REST Spring Boot → MySQL,
con Nginx de mismo origen, migraciones Flyway y archivos privados fuera del directorio web.

| Patrón/práctica | Dónde se observa | Valor y revisión |
|---|---|---|
| Capas y módulos por dominio | `controlador`, `servicio`, `repositorio`, `dto`, `entidad` | Mantener reglas en servicios; no trasladar autorización a React. No se rediseñó la arquitectura |
| Inyección por constructor | Servicios, autenticación, reloj y repositorios | Dependencias explícitas y testeables; los controles nuevos siguen esta práctica |
| Repositorio / consultas parametrizadas | Spring Data JPA y `ConsultaSolicitudesJdbc` | No concatenar filtros aportados por usuarios; las opciones de orden se eligen de una lista permitida |
| DTO como contrato | Entradas y salidas por endpoint | Evita serializar entidades con hashes/rutas; se añadieron límites a los campos del login |
| Transiciones centralizadas | `TransicionesServicio`, `Transicion`, `@Version` | Reglas y eventos de cambio en un lugar; conflicto 409, no sobrescribir cambios ajenos |
| Fachada de permisos | `Permisos`, `ListadoSolicitudesServicio`, `AportesServicio` | Roles + propiedad/asignación y descarga revalidada. Admin no es «superusuario» operativo |
| Adapter/proveedor de autenticación | `ProveedorAutenticacion`, `FiltroJwt`, `CookieSesion` | Comparación BCrypt incluso para correo inexistente, revocación y estado actual del usuario en cada petición |
| Cliente HTTP y contexto | `cliente.js`, `SesionContext`, `RutaProtegida` | Cookies/CSRF centralizados; no guardar JWT en localStorage. Las rutas protegidas no sustituyen controles del servidor |
| Reloj inyectado | `Clock`, servicios de plazos y limitador | Pruebas de expiración deterministas, sin esperar 15 minutos |
| Manejo centralizado de errores | `ManejadorGlobalErrores`, `RespuestasSeguridad` | Mismo formato de error y correlación. 429 mantiene ese contrato y agrega Retry-After |

No se añadió un patrón GoF artificial para llenar el informe: se describen prácticas realmente presentes.
No se agregaron Redis, microservicios, nuevos roles, migraciones ni funciones asignadas a otros integrantes.

## 2. Cambios puntuales de calidad y seguridad

1. **Secretos:** quitados defaults de contraseñas DB/root/JWT en ejecución; demo requiere contraseña explícita.
   Generador criptográfico local y no destructivo. `.env` permanece ignorado, `.env.example` se comparte vacío.
2. **Navegador:** políticas CSP, nosniff, frame denial, referentes y permisos en API/Nginx. HSTS condicionado
   a HTTPS real. Cookie CSRF alineada con Secure/SameSite de la sesión.
3. **Autenticación:** máximo por cuenta+IP e IP con memoria acotada, validación de configuración y cupos concurrentes.
   Solo proxies explícitos pueden aportar `X-Real-IP`, que Nginx sobrescribe. No se añadió desbloqueo público.
4. **Errores y logs:** 400/415 para entradas inválidas en vez de 500 genérico; integridad y error inesperado
   no vuelcan mensajes SQL/cadenas de excepciones potencialmente sensibles. Se conserva tipo y correlación.
5. **Auditoría:** limpiador recorre listas/arreglos además de mapas. Se preservó la API y la transacción existentes.
   El filtro es por nombres de claves: **no** convierte campos de texto libres en lugares seguros para secretos.
6. **Dependencias:** arreglos guiados por npm audit y aprobados por Marcelo. React sigue en 18; Router pasa a
   7.18.5, Vitest a 5.1.0 y Vite a 6.4.6. Actualizado lockfile; Node 22.12+ de rama compatible.
7. **Automatización:** análisis sin privilegios de escritura innecesarios, artifacts, umbrales y fallos explícitos.
   No se ocultaron vulnerabilidades ni se desactivaron controles para «pasar» el CI.

## 3. Límites y recomendaciones para el equipo

| Tema | Decisión / siguiente paso | Responsable |
|---|---|---|
| Estado del limitador | En memoria, para una instancia. Reinicio lo limpia; IPs distribuidas pueden eludir el límite por cuenta+IP. Para réplicas usar almacenamiento o política perimetral compartida, previo acuerdo | David + Marcelo |
| Proxy | Sin lista de confianza se usa dirección del socket: detrás de Nginx varios usuarios pueden compartir límite por IP. Acordar CIDR y normalización de IP real; no aceptar headers arbitrarios ni confiar toda Internet | David |
| HTTPS / HSTS | El TLS puede terminar antes de Nginx; HSTS corresponde entonces al borde. No configurar preload o subdominios sin revisar alcance | David |
| Topología de frontend/API | Mantener mismo origen. Dominios separados requieren revisar CORS/SameSite/CSRF/CSP; no se aprobó esa arquitectura en esta intervención | David + Marcelo |
| Bootstrap sin demo | `DatosIniciales` crea hoy usuarios ficticios y política inicial. Con demo desactivada una base nueva necesita una provisión segura de administrador y política; no inventar credenciales permanentes | David + Emanuel |
| Cuentas/secretos anteriores | Desactivar siembra no borra cuentas demo, y quitar defaults no rota valores en servidores/historial. Inventariar, rotar y revocar sesiones donde corresponda, sin borrar datos | David + equipo |
| JWT propio | Mantener firma HS256 y verificación estricta. Para evolucionar emisores/audiencias/algoritmos, revisar una biblioteca mantenida y migración; no se sustituyó el mecanismo de sesión del equipo | David + Marcelo |
| Evidencias | Se comprueba firma y tamaño; no es antivirus ni validación completa de imagen. No se amplió a SVG/HTML/PDF/URLs remotas; revisar decodificación/antivirus si cambia alcance | Alex + Marcelo |
| Logs | No registrar cuerpos, cookies, JWT, passwords, SQL crudo ni capturas de secretos. Mantener correlación y controlar retención/acceso; diagnóstico ampliado debe sanitizar excepciones | Gabriel |
| Actuator futuro | Al integrar D, no publicar indiscriminadamente `/actuator/**`; definir exposición/autorización/red de métricas con David y repetir pruebas negativas | Gabriel + David + Marcelo |
| Imágenes base | Los tags de Docker y Nginx 1.27 preexistentes requieren revisar soporte/actualización y procedencia con B. npm audit y Dependency-Check no escanean el sistema operativo de las imágenes | David + Marcelo |
| Cadena CI/CD | El análisis CodeQL y su listado de alertas no bloquean automáticamente publicar imágenes. Configurar protección/checks y dependencia explícita del CD; no publicar con Dependency-Check incompleto | David |
| Dependencias Spring | Tras los parches compatibles quedan 23 CVE distintos, 15 con CVSS ≥ 7. Parches de las ramas 6.x/3.5 citados por el proveedor son de soporte empresarial; decidir migración o revisión por CVE antes de cualquier excepción. [Evidencia](analisis-dependencias.md) | Marcelo + equipo |
| Limpieza programada A4 | `LimpiezaRevocacionesServicio.programado()` autoinvoca `limpiar()`, eludiendo el proxy `@Transactional`; el arranque local mostró `TransactionRequiredException`. Los tests llaman `limpiar()` dentro de la transacción de `PruebaApi` y no cubren ese camino. Corregir y probar sin transacción previa, con autorización; no se modificó ni se desactivó la tarea | Emanuel + Marcelo |
| Cobertura dinámica | Baseline es pasivo/no autenticado; una SPA puede exponer poco al spider. Mantener pruebas negativas autenticadas y complementar según resultados; no llamarlo pentest completo | Marcelo + Alex |
| Pruebas generadas por IA | Validaciones automáticas ejecutadas no equivalen a revisión humana. Revisar asserts, mutaciones y cobertura de nuevos endpoints al integrar A/D/E | Marcelo + Alex |

## 4. Secretos: reglas de operación

- Nunca usar variables `VITE_*` para secretos: quedan incorporadas al JavaScript público.
- Separar claves de pruebas, local y nube. La clave de `src/test` es ficticia, no un valor de recuperación.
- No subir `.env` ni hacer capturas de `docker compose config`, cookies, credenciales, API keys o logs sensibles.
- GitHub Secrets guarda `NVD_API_KEY` y los secretos de CD; variables públicas guardan solo configuración no sensible.
- El generador no rota MySQL existente. La rotación necesita respaldo y cambio coordinado, no borrado de volúmenes.
- Configuración de seguridad despliegue obligatoria a coordinar: `COOKIE_SECURE=true`,
  `SEGURIDAD_DESPLIEGUE=true`, `DATOS_DEMO=false`, sin siembra de solicitudes demo.
- Consultar el [checklist](checklist-owasp.md) y [evidencias](resultados-locales.md) para distinguir revisión,
  pruebas, configuración y tareas externas pendientes.
