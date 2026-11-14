# C2 · Dependency-Check: correcciones, excepciones y revalidación

Historial inicial: **11/11/2026 (UTC−05)**. Revisión asistida; aceptación humana pendiente.
**Estado actual, 13/11 (Lima):** el CI de main `c8d4e5c` aprueba con las 23 excepciones
incorporadas por PR #7. Se descargó y revisó el artifact real; véase el cierre de este
documento. Los apartados iniciales describen el análisis anterior a esas excepciones,
que efectivamente fallaba; no son un bloqueo actual ni un problema de la clave NVD.

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
Los reportes permanecen fuera de Git; el hash y este resumen no sustituyen los artifacts de CI
documentados a continuación.

## Confirmación remota revisada · PR #3

El artifact de CI `13918327597` contiene el reporte del **`2026-11-12T05:35:51.814494400Z`**:
NVD consultado el `2026-11-12T05:35:39Z`, 23 CVE distintos, 15 bloqueantes y 0 suprimidos.
El fallo por vulnerabilidades se reproduce en GitHub; no es un error de clave ni una conclusión basada
solo en caché local. CodeQL Java/JS y npm audit también se revisaron, con 0 resultados/hallazgos
en el alcance indicado en [las evidencias remotas](resultados-ci.md). El control Java continúa NO aprobado.

## Excepciones aprobadas · 12/11/2026

**Decisión:** mantener Spring Boot 3.5.16 y registrar una excepción documentada por cada CVE restante, en
lugar de migrar a Spring Boot 4 antes de la sustentación. La tomó el responsable del PR el 12/11/2026 y
queda sujeta a la confirmación del equipo en la revisión del PR #3.

**Dónde:** [`backend/dependency-check-suppressions.xml`](../../backend/dependency-check-suppressions.xml),
referenciado desde el perfil `seguridad` de `backend/pom.xml`.

**Condiciones de las excepciones:**

- Cubren solo los 23 CVE listados arriba (17 de Framework, 5 de Security y 1 de Data JPA), uno por uno.
- Están atadas a las versiones exactas analizadas (Framework 6.2.19, Security 6.5.11, Data JPA 3.5.13).
  Si se actualiza cualquiera de ellas, la excepción deja de aplicar y el hallazgo vuelve a evaluarse.
- **Caducan el 31/01/2027.** Después de esa fecha el control vuelve a fallar y hay que revisarlas.
- No se cambió `failBuildOnCVSS=7` ni `failOnError=true`. Un CVE nuevo con CVSS de 7 o más sigue
  rompiendo el CI.

**Comprobación en el código (12/11/2026):** se buscaron en `backend/pom.xml` y `backend/src/main` las
dependencias y clases que cada CVE necesita para ser explotable: WebFlux, RSocket, `SseEmitter`,
`text/event-stream`, XSLT, FreeMarker, `UrlHandlerFilter`, `UrlFilenameViewController`,
`SpelExpressionParser`, `AutoPopulatingList`, LDAP, OAuth2/DPoP, WebAuthn, `AesBytesEncryptor`, Password4j
y `nativeQuery`. No se encontraron esas configuraciones en la revisión registrada;
esto no demuestra por sí solo ausencia de aplicabilidad de todo CVE. `ContentDisposition`
sí se usa y requiere el tratamiento específico descrito a continuación. El ordenamiento
del listado se restringe en el servidor; revisar de nuevo si cambian dependencias o consultas.

**Riesgo residual aceptado:** CVE-2026-59314 es la única excepción en la que la clase afectada
(`ContentDisposition`) sí se usa, en la descarga del CSV y de las evidencias. Se acepta por la mitigación
que indica el proveedor (Tomcat rechaza los caracteres maliciosos en cabeceras de respuesta) y porque no se
genera multipart saliente.

**Pendiente histórico resuelto:** el análisis con excepciones se confirmó después en CI;
no se necesita volver a crear las supresiones. La comprobación actual se detalla abajo.

**Trabajo futuro:** planificar la migración a Spring Boot 4 después de la sustentación y retirar entonces
este archivo.

## Confirmación del main actual · 13/11/2026 (Lima; 14/11 UTC)

Las excepciones se incorporaron mediante [PR #7](https://github.com/marcelop04/mesa-servicio-universitario/pull/7).
En `c8d4e5c7c5acedf03ba7f029e3a1b934531b1ee8`, el
[CI 43522856043](https://github.com/marcelop04/mesa-servicio-universitario/actions/runs/43522856043)
aprobó Dependency-Check. El artifact `14083412107` se descargó: 61 dependencias,
0 entradas de vulnerabilidades no suprimidas y 23 entradas suprimidas. Fuente NVD
comprobada `2026-11-13T22:53:21Z`, con transporte por feeds oficiales NIST 2.0.
Hash y fuentes en [resultados CI, apartado 6](resultados-ci.md).

Se conservan íntegros POM, umbrales y XML de excepciones recibidos. **No significa
«Java sin CVE»** ni una nueva aprobación humana de los supuestos. El riesgo de
`ContentDisposition`, la caducidad al 31/01/2027 y la migración posterior siguen vigentes.
El resultado de una futura integración de D/E se debe volver a comprobar: no hereda
este análisis, que no incluye sus nuevas dependencias.
