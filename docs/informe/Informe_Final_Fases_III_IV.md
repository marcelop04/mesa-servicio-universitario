# Sistema Web para la Gestión Integral de Servicios Universitarios
## Informe consolidado · fases III y IV

**Estado: BORRADOR DE INTEGRACIÓN, no listo para entregar.** Corte C actualizado sobre main+B `5e83051`: 12/11/2026.
Actualización del paquete B: 13/11/2026 (Lima), sobre main `df8cc39` y evidencias del PR #9.
Esta revisión actualiza la sección B y sus filas de trazabilidad. Los demás aportes
conservan su corte anterior para que los revisen sus responsables.

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

**Pendiente A:** revisar esta síntesis, confirmar la revisión final de API/ejemplos y adjuntar evidencia de la
versión integrada. Los cambios C en auditoría, documentación y credenciales de recorridos requieren su revisión.
La tarea programada A4 conserva un defecto de transacción documentado en la revisión C5; sus pruebas
actuales no cubren ese camino de ejecución. Su corrección corresponde coordinarla con Emanuel.

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

El protocolo de usuarios prevé cinco participantes reales, SUS y revisión responsive a
360/1366 px. La revisión responsive final sobre HTTPS registra 32 capturas de cuatro
roles y dos del formulario `/sus/`, sin desbordes/5xx. El formulario publicado permite
descarga CSV y su combinación para calcular resultados; su verificación técnica no
respondió cuestionarios. Las cinco sesiones y sus puntuaciones siguen pendientes de
participación real. También quedan los ajustes administrativos de GitHub y la revisión
de alertas del prototipo. Ver `docs/fase-iii-iv-david.md` y `entrega-main.json`.

### 4.5 Estado de cierre revisado el 13/11/2026 (Lima)

| Tarea B | Estado |
|---|---|
| B1 · MySQL/backend/frontend con HTTPS | Desplegados; smoke público repetido el 13/11, aprobado |
| B2 · Ambientes y secretos | Perfiles y validaciones implementados; prod sin siembras verificado en la entrega registrada |
| B3 · GHCR/CD y protección main | Entrega main aprobada; falta que el propietario active los ocho checks obligatorios |
| B4 · Respaldo y recuperación | CI y ensayo aislado en VM aprobados, copia externa comprobada y timer activo |
| B5 · Usuarios/SUS y responsive | Responsive técnico verificado; cuestionario preparado, cinco sesiones reales y análisis pendientes |
| B6 · Manual técnico | Instalación, variables, CD, provisión y recuperación documentados |

El [cuestionario](../pruebas/usuarios/Cuestionario_SUS.md) incluye una invitación y
versión escrita. El formulario web descarga un CSV por persona, registra ancho real
y fecha de Lima, y no envía respuestas al servidor. El archivo de respuestas permanece
vacío hasta recoger sesiones reales. Se retiraron el ejemplo de respuestas y el modo
de simulación. El simulacro RNF08 y el ensayo RNF11 siguen siendo pruebas exigidas.

La API de GitHub confirmó permisos WRITE sin ADMIN. El ruleset aditivo está preparado
en `despliegue/github/checks-main-ruleset.json`; configurarlo corresponde al propietario.
No se declara B3 completamente cerrado mientras falten los checks de main.
La revisión de las alertas CodeQL y el DAST corresponde a C; la integración de
observabilidad y las pruebas completas de rendimiento corresponden a D/E.

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

**Resultados reales/limitaciones:** npm audit posterior a las correcciones no reportó vulnerabilidades.
Marcelo completó la descarga NVD y Dependency-Check generó informes. Se aplicaron parches compatibles sin
migrar Boot 3.5/Java 17: los CVE distintos bajaron de 68 a 23; quedan 15 con CVSS ≥ 7 en Spring y el
control continúa fallando. La regresión y el empaquetado pasan con 155 pruebas. No existe análisis Java
aprobado todavía ni excepciones autorizadas; [evidencia y decisión pendiente](../seguridad/analisis-dependencias.md).
Se revisó la ejecución real de CodeQL del PR #3, head `30bc5b2` y referencia `refs/pull/3/merge`:
Java y JavaScript/TypeScript finalizaron sin errores, con **0 resultados en ambos SARIF** y sin alertas
abiertas para esa referencia. CI confirmó 155 pruebas backend, 80 frontend y npm audit 0; Dependency-Check
reprodujo los 23 CVE, 15 bloqueantes, con NVD consultado correctamente. [Evidencias, URLs y hashes](../seguridad/resultados-ci.md).
El resultado SAST no certifica ausencia absoluta de vulnerabilidades. David debe integrar los controles
con protección de ramas y CD; C2 no se cierra hasta resolver el tratamiento de los hallazgos Java.

### 5.3 DAST

Preparado workflow ZAP baseline manual con autorización, origen HTTPS configurado en un environment y
reportes; sin escaneos automáticos de URLs aportadas por PR ni ataques activos.

**Pendiente:** validar release con C en el ambiente HTTPS ya existente, autorización explícita, ejecución,
revisión de hallazgos, corrección y reprueba. Se exige SHA desplegado y se conserva el artifact de alcance.
No se presenta un
escaneo local de pruebas como resultado DAST de la aplicación publicada. Baseline no prueba toda la SPA
autenticada ni sustituye los casos RNF01.

### 5.4 Revisión y riesgos residuales

Se conservaron capas, DTO, inyección, repositorios, transiciones y reloj testeable. Se revisaron errores,
gestión de secretos y prácticas reales del código; no se añadieron patrones nominales sin uso.

Persisten límites explícitos: contadores de una instancia, confianza/configuración de proxies, provisión
segura de administrador/política sin demo, controles cloud, validación limitada de imágenes y ejecución de
escáneres externos. Detalle y responsables en la [revisión C5](../seguridad/revision-arquitectura.md).

## 6. Observabilidad · Gabriel (D)

**Pendiente de aporte y validación del responsable:** Actuator/Micrometer/Prometheus, logs JSON sin secretos
con correlación, OpenTelemetry y Jaeger/Tempo, Grafana, alertas demostrables, Compose de observabilidad
y simulacro de incidente RNF08. El filtro de correlación existente no acredita por sí solo estas tareas.

Adjuntar dashboards, consultas reproducibles, condiciones/umbrales de alerta y secuencia de diagnóstico
con petición, identificación y resolución, evitando incluir datos sensibles.

## 7. Pruebas funcionales, seguridad, carga y usuario · Alex (E) y David (B)

Resultados locales de seguridad y regresión disponibles en
[resultados-locales.md](../seguridad/resultados-locales.md). No equivalen a resultados de carga o nube.

**Pendiente E:** colección Newman en CI; E2E BDD por historia; k6 con 2000 casos/20 VU; p95 y criterios
RNF06, estrés hasta el límite con recursos medidos; revisión humana de pruebas asistidas por IA y
consolidación del informe de pruebas, incluyendo seguridad aportada por C y usuario aportado por B.

No rellenar percentiles, puntuaciones SUS, tasas de error o «cero vulnerabilidades» sin evidencia de la
versión y alcance correspondientes. Registrar ambiente, herramientas, fecha, tamaño de muestra y limitaciones.

## 8. Resultados y trazabilidad de la entrega

| Requisito / producto | Fuente actual | Cierre pendiente |
|---|---|---|
| HU y RN/RF detallados | Informes I/II y avances por integrante | Validación del equipo sobre release final |
| RNF01/RNF02 y calidad C | Checklist, código y pruebas C | Borde HTTPS, escáneres externos, aceptación humana |
| RNF06 rendimiento | Por aportar Alex | Mediciones k6 y análisis de estrés |
| RNF08 operación/observabilidad | Por aportar Gabriel | Simulacro y evidencias |
| RNF10 CI/CD | CI/CodeQL y CD main aprobados; sección 4 | Activación administrativa de checks obligatorios |
| RNF11 restauración | Ensayo CI/VM y copia externa con hashes; sección 4 | Repetir si cambia el procedimiento o la release |
| Manual de usuario | Documento de Emanuel enlazado arriba | Revisión de la release |
| Manual técnico, repositorio y URL final | Manual actualizado y URL HTTPS operativa | Verificar la futura release con D/E integrados |
| Informe de pruebas | Aportes de seguridad disponibles | Consolidación de Alex |
| Presentación/demo y registro IA | Aportes C disponibles | Consolidación de Gabriel y aportes de todos |

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
