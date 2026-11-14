# Sistema Web para la Gestión Integral de Servicios Universitarios
## Informe consolidado · fases III y IV

**Estado: BORRADOR DE INTEGRACIÓN, no listo para entregar.** Corte C actualizado sobre
main `c8d4e5c7c5acedf03ba7f029e3a1b934531b1ee8`: 13/11/2026 Lima (14/11 UTC).
Actualización del paquete B: 13/11/2026 (Lima), con main `f8d8c9e` y cinco cuestionarios SUS recibidos.
Esta revisión C conserva la sección B recibida y actualiza seguridad, trazabilidad y
el pendiente A4 ya resuelto por PR #7. Las correcciones propuestas en el nuevo PR C
no se presentan como desplegadas. D/E siguen en PR abiertos, no integrados en este corte.

**Actualización del 14/11/2026 (Lima):** los PR #5 (E), #6 (D) y #12 (C) ya están integrados en main
`98bf12c`, con CI, CodeQL y CD aprobados. Las secciones 5.3, 6, 7 y 8 se actualizaron con esa versión.
Siguen abiertos la reprueba de ZAP, las alertas de CodeQL del prototipo y las aprobaciones de cada integrante.

Responsable de consolidación: Marcelo. Equipo: Emanuel, David, Marcelo, Gabriel y Alex.
Los campos pendientes no son resultados: deben completarse con evidencia real y revisión del equipo.

## 1. Problema, objetivo y solución

La atención por correos, formularios y canales independientes puede perder solicitudes, duplicar trabajo
y dificultar el seguimiento de responsables y tiempos. El sistema centraliza registro, priorización,
asignación, atención, seguimiento e indicadores para solicitudes universitarias.

El objetivo es demostrar el ciclo de ingeniería de la rúbrica: especificar, diseñar, construir, integrar,
probar, asegurar, desplegar, monitorear y mejorar; no únicamente mostrar pantallas que funcionan.

Especificación, actores, RN, RF/RNF e historias detalladas se conservan en
[Informe Fase I v1.2](Informe_Fase_I_Mesa_de_Servicios_Universitarios_v1.2.docx).
La construcción y presentación parcial están en
[Informe Fase II v1.0](Informe_Fase_II_Mesa_de_Servicios_Universitarios_v1.0.docx).
Este documento consolida la evolución, sin reemplazar ni alterar esos informes históricos.

## 2. Arquitectura y decisiones

- React 18 con rutas por rol y cliente fetch centralizado; Nginx publica frontend y reenvía `/api` al mismo origen.
- Spring Boot 3.5 / Java 17, monolito modular por dominios y capas controlador–servicio–repositorio.
- MySQL 8, JPA/JDBC parametrizado, migraciones Flyway y control optimista de versión.
- JWT limitado en cookie HttpOnly, CSRF, BCrypt, revocación y comprobaciones de rol/propiedad/asignación.
- Archivos privados en volumen persistente, sin publicación directa ni enlaces que evadan permisos.
- Configuración sensible por variables de entorno; en local, `.env` privado generado sin defaults reutilizables.

La [revisión de arquitectura](../seguridad/revision-arquitectura.md) identifica prácticas presentes,
correcciones y limitaciones. No se afirma una arquitectura de microservicios ni infraestructura aún no creada.

## 3. Alcance de funcionalidades y APIs · Emanuel (A)

La base recibida contiene el avance funcional de fase II, HU15–19 y el paquete A. Evidencia documental:
[avance de Emanuel](../fase-iii-iv-emanuel.md).

- HU13: encuesta de satisfacción por el solicitante propietario, solo tras cierre, nota 1–5 y un único envío.
- HU22: políticas publicadas como versiones nuevas; validación de matriz, control de versión y conservación
  de la política aplicada a solicitudes existentes.
- HU23: auditoría administrativa y consulta restringida; no ofrece edición/borrado.
- HU02: limpieza periódica de revocaciones vencidas, manteniendo tokens vigentes revocados.
- OpenAPI y [panorama GraphQL/gRPC/webhooks/API Gateway](../api/panorama-apis.md).
- [Manual de usuario por rol](../manual/Manual_de_usuario.md).

**Revisión del responsable (Emanuel, 14/11/2026):** esta síntesis coincide con lo integrado en main.

- **API y ejemplos:** `OpenApiTest` valida en cada ejecución del CI el esquema `ErrorApi`, la seguridad
  (cookie de sesión y CSRF) y los códigos HTTP de las rutas. Pasa sobre `98bf12c`.
- **Evidencia de la versión integrada:** capturas en `docs/evidencias/fase-iii-emanuel/` y pruebas
  `EncuestaTest`, `PoliticasTest`, `AuditoriaTest`, `LimpiezaRevocacionesTest` y `OpenApiTest`, dentro de las
  193 pruebas de backend y 83 de frontend que pasan en main.
- **Cambios de C sobre archivos de A, revisados y aceptados:** sanitización de secretos también dentro de
  listas en `AuditoriaServicio`; aviso del límite de intentos de inicio de sesión en el manual de usuario;
  y lectura de la contraseña de demostración desde `DEMO_PASSWORD` en `recorrido-fase-iii-emanuel.mjs`.
- **Defecto A4:** la tarea programada de limpieza eludía la transacción. Lo detectó la revisión de C y se
  corrigió en el PR #7 con `TransactionTemplate` y una regresión sin transacción previa.

## 4. Nube, ambientes y CI/CD · Paquete B

La sección técnica se integra aquí para evitar documentos de aporte duplicados.
Estado y evidencias: [bitácora B](../fase-iii-iv-david.md),
[manual técnico](../manual/Manual_tecnico.md) y
[entrega desde main](../evidencias/fase-iii-iv-david/entrega-main.json).

### 4.1 Arquitectura y ambientes

Se desplegó una arquitectura reproducible en Oracle Cloud Infrastructure Free Trial:
una VM Ubuntu x86 E5 de 1 OCPU, 8 GB RAM y disco de 50 GB ejecuta MySQL 8, Spring Boot,
React/Nginx y Caddy mediante Docker Compose. El responsable autorizó consumir créditos
temporales para la evaluación tras no encontrar capacidad A1 Always Free. Caddy
gestiona certificados HTTPS y mantiene la SPA y API bajo el mismo origen, conservando
la sesión JWT/CSRF. Solo el proxy publica los puertos web.

Los ambientes se expresan mediante perfiles Spring (`dev`, `prueba`, `prod`; `test`
para JUnit) y variables externas. Los secretos de producción se generan aleatoriamente
y se entregan con GitHub Secrets; Terraform no los incorpora. Los volúmenes separan
MySQL, evidencias y certificados del ciclo de vida de los contenedores.

URL verificada: <https://msu-157-137-206-147.sslip.io>.

### 4.2 RNF10 · Integración y despliegue continuos

El CI comprueba backend, frontend, imágenes, configuración e infraestructura y ejecuta
un ensayo de recuperación sobre MySQL real en un proyecto efímero. CD solo se activa
después de un CI completo exitoso sobre un push de `main` del mismo repositorio público.
Publica imágenes amd64/arm64 en GHCR y despliega por digest mediante SSH con host verificado.
La salud interna y un smoke HTTPS deben aprobarse antes de registrar la entrega como
verificada. La primera entrega se comprobó mediante un bootstrap de PR, retirado
posteriormente. La entrega definitiva se ejecutó desde `main`, commit `df8cc39`, tras
integrar el PR #8: [CI 43365136107](https://github.com/marcelop04/mesa-servicio-universitario/actions/runs/43365136107),
[CodeQL 43365136281](https://github.com/marcelop04/mesa-servicio-universitario/actions/runs/43365136281)
y [CD 43365661850](https://github.com/marcelop04/mesa-servicio-universitario/actions/runs/43365661850)
aprobados. La publicación multi-arquitectura tardó 3m35s y la entrega 56s. Se comprobó
la revisión de las imágenes en la VM, salud y HTTPS. Los builds de JAR/assets usan
arquitectura nativa para evitar el bloqueo ARM/QEMU del primer intento.

El perfil prod se verificó con ambas siembras desactivadas, guard activo, cookie Secure
y entorno privado 0600. Main bloquea borrado/force-push y exige PR/una aprobación con
bypass configurado; no declara checks obligatorios. El environment `production`,
creado por el workflow, tiene deployment exitoso y no tiene revisores/restricciones
de rama adicionales. Esas mejoras administrativas corresponden al propietario.

### 4.3 RNF11 · Copia y recuperación

La estrategia implementada y probada pausa el backend para obtener un punto consistente entre
base de datos y evidencias. Cada copia conserva dump SQL, tar con permisos, referencias
de imagen y sumas SHA-256. Un timer permite copia diaria; cada despliegue existente
genera además una copia previa. Se descargó una instantánea de la aplicación pública
a una carpeta privada del equipo del responsable y se verificaron sus cuatro SHA-256.
Después del CD main se repitió la copia externa con los digests actuales
(`msu-20261113T043450Z-14914`): cuatro archivos OK y sesión HTTPS aprobada al reanudar.

El ensayo automatizado altera una fila y un archivo, verifica que una copia corrupta
no se acepte, restaura y compara SQL, hashes, permisos de escritura y salud. Una reversión
de imagen no revierte migraciones: para cambios incompatibles se utiliza la restauración.

### 4.4 Validación y límites

En la preparación inicial se aprobaron localmente las 102 pruebas JUnit existentes, una prueba adicional del perfil
de producción detrás de proxy, ocho pruebas de herramientas, validación de Compose/Caddy,
Terraform y análisis estático de scripts/workflows. Se compiló el frontend y se recorrieron
32 vistas locales de los cuatro roles a 360/1366 px sin desbordes ni errores 5xx.
Después del intento A1 sin capacidad se creó la E5 de prueba y se completó la entrega
CI/GHCR del [run 43322815086](https://github.com/marcelop04/mesa-servicio-universitario/actions/runs/43322815086).
El smoke HTTPS con login, perfil y logout está aprobado, así como 32 capturas de la
URL pública a ambos tamaños. RNF11 también se aprobó en un proyecto aislado de la VM,
verificando SQL, archivos, hashes, permisos y rechazo de copia corrupta. El timer de
respaldo diario está activo. Se documentó y corrigió un defecto del verificador HTML,
que asumía `root` en vez del identificador real `raiz`, mediante pruebas de regresión.

La versión final de main volvió a aprobar las suites y el ensayo MySQL de CI. Para
Dependency-Check se cambió el transporte a los feeds oficiales NIST 2.0 después de dos
fallos HTTP 503 de la API. Una carga nueva y los análisis local/remotos aprobaron,
conservando actualización automática, CVSS ≥ 7, failOnError y las excepciones existentes
del paquete C. La consulta Code Scanning de main registra cinco alertas del prototipo
histórico (tres high, dos medium), fuera de los contextos Docker backend/frontend;
quedan para revisión de seguridad. Un workflow CodeQL exitoso no equivale a cero alertas.

La revisión responsive sobre HTTPS registra 32 capturas de cuatro roles y dos del
formulario `/sus/`, sin desbordes/5xx. Esa verificación técnica no respondió cuestionarios.
Posteriormente se recibieron cinco CSV del rol Solicitante: puntuaciones 75, 95, 85,
90 y 90, con **media SUS 87/100**. Las respuestas se conservan sin alteraciones y el
cálculo es reproducible. El resumen prioriza el viewport observado. Las horas quedan
sin validar y las notas de tarea, tiempos, ayuda y navegador constan como no registrados. Ver
[resultados y limitaciones](../pruebas/usuarios/Resultados_SUS.md).
Los ajustes administrativos de GitHub y la revisión de alertas del prototipo siguen pendientes.

### 4.5 Estado de cierre revisado el 13/11/2026 (Lima)

| Tarea B | Estado |
|---|---|
| B1 · MySQL/backend/frontend con HTTPS | Desplegados; smoke público repetido el 13/11, aprobado |
| B2 · Ambientes y secretos | Perfiles y validaciones implementados; prod sin siembras verificado en la entrega registrada |
| B3 · GHCR/CD y protección main | Entrega main aprobada; falta que el propietario active los ocho checks obligatorios |
| B4 · Respaldo y recuperación | CI y ensayo aislado en VM aprobados, copia externa comprobada y timer activo |
| B5 · Usuarios/SUS y responsive | Cinco sesiones aportadas, media 87/100 y responsive técnico verificado; límites de observación registrados |
| B6 · Manual técnico | Instalación, variables, CD, provisión y recuperación documentados |

El [cuestionario](../pruebas/usuarios/Cuestionario_SUS.md) incluye una invitación y
versión escrita. El formulario web descarga un CSV por persona, registra ancho real
y fecha de Lima, y no envía respuestas al servidor. El archivo de respuestas reúne
los cinco CSV aportados por el responsable. Se retiraron el ejemplo de respuestas y el modo
de simulación. El simulacro RNF08 y el ensayo RNF11 siguen siendo pruebas exigidas.

La API de GitHub confirmó permisos WRITE sin ADMIN. El ruleset aditivo está preparado
en `despliegue/github/checks-main-ruleset.json`; configurarlo corresponde al propietario.
No se declara B3 completamente cerrado mientras falten los checks de main.
La revisión de las alertas CodeQL y el DAST corresponde a C; la integración de
observabilidad y las pruebas completas de rendimiento corresponden a D/E.

La nueva consulta de protección mantiene `enforcement_level=off`, `contexts=[]` y
ninguna regla efectiva `required_status_checks`. La ejecución exitosa de los ocho
checks no equivale a que GitHub los exija para integrar. La evidencia actual se
conserva en `docs/evidencias/fase-iii-iv-david/proteccion.json`.

## 5. Seguridad y revisión de calidad · Marcelo (C)

### 5.1 Criterios y controles

Se revisan RNF01 (identidad, rol y recurso por operación/descarga), RNF02 (hash/JWT/CSRF/secretos)
y la seguridad/calidad de fases III y IV mediante [checklist OWASP Top 10:2025](../seguridad/checklist-owasp.md).

Se implementaron:

1. CSP y cabeceras antiframe, tipo de contenido, referentes y permisos; HSTS condicionado a HTTPS.
2. Cookies JWT/CSRF alineadas con Secure/SameSite y guard de configuración de despliegue.
3. Limitador de login por cuenta+IP y por IP, con reservas concurrentes y almacenamiento acotado;
   429 y Retry-After. Parámetros de demo documentados sin endpoint de evasión.
4. Secretos de ejecución sin valores por defecto; generador local no destructivo y documentación de rotación.
5. Pruebas negativas de rutas, casos ajenos, técnico sin asignación, descarga, avisos privados y efectos laterales.
6. Sanitización de auditoría también en colecciones y manejo de errores sin exponer mensajes SQL/cadenas de causas.
7. Actualizaciones específicas por vulnerabilidades npm: Vite 6.4.6, Vitest 5.1.0 y Router 7.18.5;
   React 18 conservado. No se aplicó actualización forzada e indiscriminada.

### 5.2 SAST y análisis de dependencias

CodeQL se configura para Java y JavaScript con consultas `security-extended` en GitHub. npm audit y
OWASP Dependency-Check se incorporan al CI, con artifacts y fallo ante gravedad alta/crítica (npm) o
CVSS ≥ 7 (Java), sin ocultar fallas técnicas.

**Resultados actuales comprobados:** el [CI de main 43522856043](https://github.com/marcelop04/mesa-servicio-universitario/actions/runs/43522856043)
aprueba. Se descargaron los artifacts: npm audit 0 tanto en frontend como en herramientas;
Dependency-Check 13.0.0 analizó 61 entradas y registra **0 vulnerabilidades no suprimidas y
23 entradas suprimidas** por las excepciones del PR #7. NVD comprobado el
`2026-11-13T22:53:21Z`, mediante feeds oficiales NIST 2.0. Se conservan CVSS ≥ 7 y failOnError.
Las excepciones están atadas a versiones y caducan el 31/01/2027; **no son parches ni
permiten afirmar ausencia de CVE**. [Análisis y riesgo residual](../seguridad/analisis-dependencias.md).

CodeQL Java y JavaScript aprobaron en [43522856218](https://github.com/marcelop04/mesa-servicio-universitario/actions/runs/43522856218),
pero la consulta de main devuelve cinco alertas de `prototipo/`: tres high y dos medium.
Se revisó cada una: cuatro tienen un guard de redirección que fundamenta una propuesta de
falso positivo, pendiente de confirmar; la quinta es la falta real de límite en el reset
del mock. Esas fuentes no forman parte de las imágenes del despliegue. No se descartaron
alertas ni se excluyó el prototipo de SAST. [Triage](../seguridad/alertas-codeql-main.md).

**Actualización del 14/11/2026:** las cinco alertas se corrigieron en el código del prototipo (PR #13):
lista fija de páginas para la redirección tras ingresar y límite de frecuencia en el restablecimiento
de datos. Falta confirmar que CodeQL las cierre en main después de integrar ese PR.

El [CD 43523245472](https://github.com/marcelop04/mesa-servicio-universitario/actions/runs/43523245472)
publicó y entregó el mismo `c8d4e5c` después de CI/CodeQL exitosos. El gate por éxito de
análisis no equivale a bloqueo por hallazgos ni a checks de rama obligatorios.
[Fuentes, artifacts y hashes](../seguridad/resultados-ci.md). Las validaciones antiguas
del PR #3 se conservan como historial, no como resultados del main actual.

### 5.3 DAST

Preparado workflow ZAP baseline manual con autorización, origen HTTPS configurado en un environment y
reportes; sin escaneos automáticos de URLs aportadas por PR ni ataques activos.

**Ejecutado:** baseline ZAP 2.17.0 real contra el origen público, con autorización
específica y versión `c8d4e5c` contrastada con el CD/deployment antes y después. No se
inició sesión ni se enviaron formularios o ataques activos. Salida 2 por avisos: un
grupo medio (CSP CSS unsafe-inline), tres bajos (COOP/COEP/CORP) y tres informativos
(caché/SPA), agrupados en cinco reglas. El spider alcanzó solo cinco endpoints GET.
[Reporte original, hash, análisis y alcance](../seguridad/dast-2026-11-13.md).

El nuevo PR C retira unsafe-inline, permite por hash únicamente el estilo estático del
logo de Swagger y añade las tres cabeceras de aislamiento. Se conservan protecciones
de caché y se corrige duplicación de cabeceras en Swagger. Las pruebas backend/proxy
y de navegador local validan estas correcciones sin atribuirles cobertura de nube.

**C3 permanece parcial.** El PR #12 ya está integrado y el CD de `98bf12c` terminó correctamente.
Una petición GET pública del 14/11/2026 a la raíz del sitio devuelve la CSP sin `unsafe-inline` (con el
hash de Swagger) y las cabeceras `Cross-Origin-Opener-Policy`, `Cross-Origin-Embedder-Policy` y
`Cross-Origin-Resource-Policy`. **Falta repetir ZAP sobre esa versión** y revisar hallazgos y riesgos con
el equipo: ver cabeceras no equivale a una reprueba. El baseline tampoco prueba toda la SPA autenticada
ni sustituye los casos RNF01.

### 5.4 Revisión y riesgos residuales

Se conservaron capas, DTO, inyección, repositorios, transiciones y reloj testeable. Se revisaron errores,
gestión de secretos y prácticas reales del código; no se añadieron patrones nominales sin uso.

Persisten límites explícitos: contadores de una instancia, confianza/configuración de proxies, provisión
segura de administrador/política sin demo, controles cloud, validación limitada de imágenes y ejecución de
escáneres externos. Detalle y responsables en la [revisión C5](../seguridad/revision-arquitectura.md).

Se amplió `AccesosPorRolTest` de 34 a **50 casos**: escalamiento de privilegios propio,
encuestas por actores no propietarios, lecturas anónimas, logout CSRF inválido y
reutilización de JWT revocado en una escritura. Se verifican también filas, versión y
auditoría sin cambios; no solo HTTP. La publicación de políticas denegada usa ahora
un cuerpo válido. Estas pruebas son de integración H2 con JWT/filtros reales, no
sesiones de usuarios ni pruebas remotas. [Validación del nuevo avance](../seguridad/avance-main-2026-11-13.md).

## 6. Observabilidad · Gabriel (D)

Integrado en main con el PR #6. Detalle del responsable en
[su avance](../fase-iii-iv-gabriel.md) y en [su sección](Seccion_Gabriel_Observabilidad.md).

| Tarea | Entregable integrado |
|---|---|
| D1 · Métricas | Actuator y Micrometer con Prometheus (`/actuator/prometheus`); métrica de negocio `msu_solicitudes_vencidas` |
| D2 · Logs | JSON con `idCorrelacion`, `traceId` y `spanId`; enmascaramiento de claves sensibles en `logback-spring.xml` |
| D3 · Trazas | OpenTelemetry con exportación OTLP a Jaeger; muestreo configurable |
| D4 · Alertas | Tres reglas en `observabilidad/prometheus/alertas.yml`: errores 5xx (> 0,05 req/s), latencia p95 (> 1 s) y solicitudes vencidas |
| D5 · Simulacro RNF08 | Inyección controlada, alerta, log con correlación, traza, causa raíz y recuperación; endpoints de diagnóstico apagados por defecto y solo para administrador |
| D6 · Compose | `docker-compose.observabilidad.yml` con Prometheus, Jaeger y Grafana ligados a `127.0.0.1` |
| D7 · Presentación | Diapositivas, guion de sustentación y registro de IA del equipo en `docs/presentacion/` |

Evidencias: cinco capturas en `docs/evidencias/fase-iii-iv-gabriel/` (alertas disparadas, tablero de
Grafana, trazas en Jaeger, logs con correlación y recuperación) y `ObservabilidadTest` (6 pruebas) dentro
del CI.

**Alcance:** el stack de observabilidad se demostró en entorno local. No está levantado en el servidor
público, y el proxy del despliegue no publica `/actuator` (una petición externa recibe la página de la
aplicación, no las métricas). Llevarlo al servidor queda como trabajo futuro.

**Pendiente D:** aprobación explícita de Gabriel de esta síntesis y confirmación de que las trazas siguen
llegando a Jaeger con Kotlin 2.4.21, versión a la que se actualizó para resolver CVE-2026-53914.

## 7. Pruebas funcionales, seguridad, carga y usuario · Alex (E) y David (B)

Resultados locales de seguridad y regresión disponibles en
[resultados-locales.md](../seguridad/resultados-locales.md). No equivalen a resultados de carga o nube.

Integrado en main con el PR #5. Informe completo del responsable:
[informe de pruebas](../informe-pruebas.md), con su [matriz de trazabilidad](../matriz-trazabilidad-hu.md)
y la [revisión de pruebas generadas con IA](../revision-pruebas-ia.md).

| Prueba | Alcance | Resultado reportado por E |
|---|---|---|
| API (Newman en CI) | 65 peticiones y 182 aserciones; cuatro roles, 401/403/409 y CSRF | 100 % aprobado; job «Pruebas de API (Newman)» en verde en main |
| Aceptación E2E (Playwright, local) | 24 historias en formato BDD, a 1366 px y 360 px (48 pruebas) | 48 de 48; sin desplazamiento horizontal a 360 px (RNF05) |
| Carga local (k6, RNF06) | 20 usuarios virtuales, 2000 casos sembrados | p95 de 362 ms en consultas y 275 ms en escrituras; 0 % de error |
| Estrés local (k6) | Rampa de 20 a 400 usuarios virtuales | 12 685 peticiones sin errores HTTP; el p95 supera 1 s desde 150–200 usuarios y llega a 3,5 s; pico de 8,4 s |
| Verificación en la nube | Newman 13 peticiones; Playwright 2 pruebas (HU01); k6 con 10 usuarios virtuales por 30 s | Todo aprobado; p95 de 115 ms en 414 peticiones |

**Límites declarados:**

- El cumplimiento de RNF06 (20 usuarios virtuales y 2000 casos) está medido en local. En la nube se ejecutó
  una versión reducida para no afectar el servidor compartido.
- La causa del límite bajo estrés (pool HikariCP de 10 conexiones) es una hipótesis: k6 mide desde el cliente
  y no se contrastó con las métricas de Actuator.
- Las cifras de pruebas unitarias del informe de E corresponden a su corte. En main `98bf12c` pasan
  193 pruebas de backend y 83 de frontend.

**Pendiente E:** actualizar la sección de DAST de su informe con el baseline de ZAP ya ejecutado
(sección 5.3) y aprobar explícitamente esta síntesis.

### 7.1 Resultados de usuario aportados por B

Se incorporaron cinco cuestionarios de solicitantes, con diez ítems completos por
persona. Media SUS **87/100**, mediana 90 y rango 75–95. La escala no representa un
porcentaje de tareas completadas. Los comentarios recibidos destacan navegación,
etiquetas, registro y seguimiento; P02 propone modo oscuro como mejora opcional.

El responsable indicó que no registró tiempos, navegador, tareas observadas ni ayuda.
El resumen usa el viewport observado y conserva las horas sin validarlas. El resultado es
la descripción de estas respuestas y no acredita por sí solo usabilidad de otros
roles o una tasa de éxito. [Datos, método y alcance](../pruebas/usuarios/Resultados_SUS.md).

## 8. Resultados y trazabilidad de la entrega

| Requisito / producto | Fuente actual | Cierre pendiente |
|---|---|---|
| HU y RN/RF detallados | Informes I/II y avances por integrante | Validación del equipo sobre release final |
| RNF01/RNF02 y calidad C | HTTPS/CSRF Secure públicos, pruebas C4 ampliadas y baseline real | CD/reprueba pública de las correcciones, sesión de la nueva release y aceptación humana |
| RNF06 rendimiento | Por aportar Alex | Mediciones k6 y análisis de estrés |
| RNF08 operación/observabilidad | Por aportar Gabriel | Simulacro y evidencias |
| RNF10 CI/CD | CI/CodeQL y CD main aprobados; sección 4 | Activación administrativa de checks obligatorios |
| RNF11 restauración | Ensayo CI/VM y copia externa con hashes; sección 4 | Repetir si cambia el procedimiento o la release |
| Usuario/SUS (B5) | Cinco CSV, media 87/100 y límites registrados; secciones 4 y 7.1 | Incorporar esta síntesis al informe de pruebas del equipo |
| Manual de usuario | Documento de Emanuel enlazado arriba | Revisión de la release |
| Manual técnico, repositorio y URL final | Manual actualizado y URL HTTPS operativa; main `98bf12c` desplegado con D/E integrados | Revisión final del manual sobre esa release |
| Informe de pruebas | [Informe de E](../informe-pruebas.md) integrado; sección 7 | Actualizar su apartado de DAST con el baseline ejecutado |
| C2 · SAST/SCA | CI aprobado; 23 excepciones Spring y cinco alertas del prototipo analizadas | Decisiones humanas residuales, caducidad de excepciones y reanálisis tras integrar D/E |
| C3 · DAST | ZAP público c8d4e5c con reporte/hash; correcciones integradas (PR #12) y desplegadas con `98bf12c` | Repetir el escaneo público sobre esa versión y registrar la revisión |
| Observabilidad RNF08 | Stack, alertas y simulacro integrados (PR #6); sección 6 | Demostración en vivo en entorno local |
| Presentación/demo y registro IA | Presentación, guion y registro del equipo en `docs/presentacion/` (PR #6) | Revisión de cada integrante de su parte y validaciones humanas pendientes en el registro |

## 9. Uso responsable de IA y lecciones de seguridad

Registro nuevo de C: [uso de IA](../registro-uso-ia.md). Los registros anteriores permanecen en informes
y avances originales. Gabriel consolida el registro del equipo, sin afirmar validaciones humanas no realizadas.

Lecciones comprobadas: una aplicación funcional puede conservar dependencias vulnerables; un job que no
pudo consultar su base no es un análisis aprobado; HTTP local no verifica TLS; proteger rutas de React
no sustituye autorización del servidor; quitar un secreto del código no lo rota en un servidor o en Git.

**Pendiente de cada integrante:** resultados, dificultades y lecciones propias, revisión de sus pruebas
generadas por IA y aprobación explícita de su sección.

## 10. Lista para cerrar y entregar

- [ ] A/B/C/D/E revisaron sus secciones y aportaron `docs/fase-iii-iv-<nombre>.md`.
- [ ] Identificados commit/release, URL de pruebas y URL de demostración final.
- [ ] CI y CodeQL ejecutados, alertas revisadas y Dependency-Check con NVD actualizado.
- [ ] DAST autorizado, hallazgos/correcciones y reprueba adjuntos.
- [ ] Resultados Newman/E2E/k6/estrés/usuario y restauración adjuntos.
- [ ] Observabilidad y simulacro demostrados; manuales revisados.
- [ ] Registro de IA consolidado y validación humana registrada.
- [ ] Informe revisado sin secretos ni pendientes, exportado al formato acordado y subido al aula.

Hasta completar esta lista, no cambiar la portada de «borrador» a «informe final aprobado».
