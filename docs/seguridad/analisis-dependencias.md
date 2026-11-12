# C2 · Dependency-Check: correcciones y decisión pendiente

Fecha local: **11/11/2026 (UTC−05)**. Revisión asistida; aceptación humana pendiente.
**El análisis Java se completó, pero el control de seguridad sigue NO aprobado.**
No es un problema de la clave NVD. No se bajó el umbral CVSS, no se desactivaron analizadores
adicionales y no se añadieron reglas de supresión.

## Evidencia antes y después

| Medida | Inicial | Después de los parches |
|---|---:|---:|
| Entradas analizadas por la herramienta | 61 | 61 |
| Entradas con alertas | 10 | 3 |
| CVE distintos (sin duplicar los dos bundles de Swagger) | 68 | 23 |
| CVE distintos con alguna puntuación CVSS ≥ 7 | 33 | 15 |
| Vulnerabilidades suprimidas en el JSON | 0 | 0 |
| Resultado del control | Fallo por hallazgos | Fallo por hallazgos de Spring |

Desaparecieron **45 CVE distintos** del reporte al actualizar, no mediante excepciones.
Esto no demuestra ausencia absoluta de vulnerabilidades ni que todos los avisos restantes sean explotables.

- Informe inicial: `2026-11-12T03:48:47.359140Z`.
- Informe posterior: `2026-11-12T04:01:42.606693400Z`.
- Ambos usan NVD comprobado el `2026-11-11T22:48:07-05`, última modificación `2026-11-12T03:17:11Z`.
- Marcelo completó la descarga autenticada inicial: **424 566 registros**.
- La comparación se ejecutó con `mvnw.cmd -B -Pseguridad -DautoUpdate=false dependency-check:check`:
  reutiliza esa base recién descargada; **no es una nueva consulta NVD ni una configuración permanente**.
  CI conserva la actualización normal y el lanzador sigue solicitando la clave privadamente.
- Se conservaron HTML/JSON antes de repetir el análisis, en las carpetas locales ignoradas por Git:
  `reports/seguridad/dependency-check-inicial-2026-11-12T034847Z/` y
  `reports/seguridad/dependency-check-ajustes-2026-11-12T040143Z/`.
- SHA-256 del JSON inicial: `67249BA755595E158CB70EE51E32BAB9A414ED50097E13C34DFD4B9E646D578D`.
- SHA-256 del JSON posterior: `742D9282630AD4E19B4471F427C9E3EEC863A5B96F81B8E4C7B0A8013B66FB4A`.

## Cambios verificados

Se conserva **Spring Boot 3.5.16 y Java 17**. Versiones administradas en `backend/pom.xml`:

| Dependencia | Antes | Después |
|---|---|---|
| Commons Lang | 3.17.0 | 3.22.0 |
| Jackson BOM | 2.21.4 | 2.21.5 (misma rama) |
| Log4j BOM | 2.24.3 | 2.26.1 |
| MySQL Connector/J | 9.7.0 | 26.10.0 |
| Tomcat | 10.1.55 | 10.1.61 |
| springdoc | 2.8.17 | 2.10.0 |
| Swagger UI | 5.32.2 | 5.34.1 |
| DOMPurify incluido en Swagger | 3.3.2 | 3.4.17 |

Connector/J cambió su numeración a calendario: **no se actualizó el servidor ni el volumen MySQL**.
El [código oficial 26.10.0](https://github.com/mysql/mysql-connector-j/tree/26.10.0) mantiene JDBC 4.2/Java 8+.
Se comprobó la conexión del nuevo JAR con **MySQL 8.0.46**, usando `SELECT VERSION(), 1`, sesión de solo
lectura y rollback, sin operaciones de escritura. Esto no sustituye una regresión integral con MySQL.

El POM publicado de springdoc 2.10.0 usa el mismo padre Boot 3.5.16. Se fija además el WebJar 5.34.1:
el 5.34.0 que trae springdoc aún incluye DOMPurify 3.4.16. La propiedad filtrada por Maven en
`application.yml` mantiene la ruta de recursos alineada. `SwaggerSeguridadTest` verifica que el HTML
y ambos bundles se sirven con HTTP 200 y que contienen realmente DOMPurify 3.4.17.

Verificación posterior: **155 pruebas, 0 fallos, 0 errores, 0 omitidas y BUILD SUCCESS**, con empaquetado
(`mvnw.cmd -B verify`). El contrato OpenAPI existente también pasa. No se reconstruyeron las imágenes
Docker con este último POM; los contenedores anteriores no prueban estas actualizaciones.

## Lo que sigue abierto

El reporte conserva **17 CVE en Framework 6.2.19, 5 en Security 6.5.11 y 1 en Data JPA 3.5.13**.
La consulta a Maven Central no encontró parches públicos posteriores en esas ramas compatibles.
Los avisos oficiales indican Framework **6.2.20**, Security **6.5.12** y Data JPA **3.5.14** como
**Enterprise Support Only**; los parches OSS publicados corresponden a las nuevas ramas mayores.

Observaciones de aplicabilidad **preliminares, no excepciones aprobadas**:

| Avisos | Condición relevante / observación en esta copia |
|---|---|
| Framework CVE-2026-47884 | Requiere `XsltView` y renderizado implícito con patrón amplio. No se encontró esa configuración; API con controladores REST |
| Framework CVE-2026-47890 y CVE-2026-59313 | SSE y/o fragmentos de vistas; no se encontraron endpoints SSE |
| Framework CVE-2026-47885, CVE-2026-47889, CVE-2026-47891, CVE-2026-47892 y CVE-2026-47893 | Funciones concretas de WebFlux; la aplicación usa MVC/Tomcat, no el starter WebFlux |
| Framework CVE-2026-47886 y CVE-2026-59283 | Evaluación de expresiones SpEL; no se encontró evaluación de expresiones suministradas por usuarios |
| Framework CVE-2026-47888 | Servidor RSocket; no se encontró su uso |
| Framework CVE-2026-59282 | Binding de rutas del usuario sobre listas que se autopueblan; no se encontró ese tipo de lista ni binding personalizado |
| Framework CVE-2026-47883 y CVE-2026-47887 | `UrlHandlerFilter` o `UrlFileNameViewController` configurados de forma concreta; no se encontraron |
| Framework CVE-2026-59280 | FreeMarker y nombre de vista no confiable; no se encontró esa integración |
| Framework CVE-2026-59281 | Sí se leen errores de validación, pero se devuelven como JSON; no se encontró renderizado HTML de `Errors` con escape habilitado. Revisión humana del flujo completa pendiente |
| Framework CVE-2026-59314 | Sí se usa `ContentDisposition`; el proveedor indica que Tomcat rechaza los caracteres maliciosos del caso de respuesta. No se encontró generación de multipart saliente; no confundir esta observación con aplicar el parche |
| Security CVE-2026-59270, CVE-2026-41707 y CVE-2026-47841 | Requieren LDAP embebido, DPoP o WebAuthn con sesión distribuida, respectivamente; no se encontraron en la configuración JWT/BCrypt actual |
| Security CVE-2026-47842 y CVE-2026-59276 | Requieren `AesBytesEncryptor` o componentes de comparación específicos (Digest, Password4j, servicio OAuth2, etc.); no se encontró su uso. BCrypt no equivale a Password4j |
| Data JPA CVE-2026-47834 | Requiere orden no confiable en consultas nativas con `Sort`/`Pageable`. No se encontraron métodos nativos anotados; `ListadoSolicitudesServicio` aplica una lista permitida de órdenes |

Fuentes del proveedor: [Framework/XSLT](https://spring.io/security/cve-2026-47884),
[binding de listas](https://spring.io/security/cve-2026-59282),
[Content-Disposition](https://spring.io/security/cve-2026-59314),
[LDAP](https://spring.io/security/cve-2026-59270),
[comparaciones](https://spring.io/security/cve-2026-59276) y
[Data JPA](https://spring.io/security/cve-2026-47834). Cada CVE restante conserva su descripción y referencias
en el JSON/HTML. No basta buscar un nombre para certificar que un hallazgo no aplica.

**Decisión que requiere Marcelo/equipo:** aprobar una migración mayor coordinada y probarla, o realizar
una evaluación de aplicabilidad por CVE con evidencia y revisión humana antes de considerar excepciones
puntuales. No forzar Framework/Security 7 dentro de Boot 3.5 ni usar supresiones genéricas.
Mientras se decide, puede publicarse una **rama/PR borrador con estos pendientes explícitos**; no presentarlo
como C2 cerrado, no integrar/desplegar una release aprobada y conservar el fallo del control CVSS ≥ 7.

## Revalidación en el clon de publicación · 12/11/2026

La rama `feat/marcelo-seguridad` se volvió a analizar tras `mvnw.cmd -B verify` (155 pruebas y empaquetado
correctos). Dependency-Check generó HTML/JSON el **`2026-11-12T05:26:06.335516400Z`**, reutilizando la
misma base NVD con `-DautoUpdate=false`, sin clave ni consulta nueva. El resultado sigue siendo
**23 CVE distintos, 15 bloqueantes y 0 suprimidos; BUILD FAILURE por hallazgos**, no por autenticación.
SHA-256 del JSON: `50E10435A326FB155E80F1028158420338042A5AA7C23D6DD4DD62003B68EA4F`.
Los reportes permanecen fuera de Git; el hash y este resumen no sustituyen los artifacts de CI pendientes.
