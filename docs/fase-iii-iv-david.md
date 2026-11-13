# Fases III y IV · David · Paquete B: Nube y CI/CD

Entrega inicial: `feat/david-despliegue`, integrada en main por PR #4 (`5e83051`).
Correcciones operacionales: PR #8 integrado en `df8cc39`; CD main verificado el 13/11/2026 UTC.
Fecha de preparación: 12/11/2026. Plataforma: OCI Free Trial para la demostración del curso;
Always Free se conserva como alternativa de infraestructura.

## Entregables y criterio de cierre

| ID | Entregable | Estado verificable | Evidencia |
|---|---|---|---|
| B1 | MySQL, backend y frontend en nube con HTTPS | Desplegado en E5, HTTPS y login verificados en la URL pública | `https://msu-157-137-206-147.sslip.io`, `docs/evidencias/fase-iii-iv-david/https.json` |
| B2 | Desarrollo, prueba, producción y secretos | Implementado y probado; VM verificada con prod, ambas siembras false, guard true, cookie Secure y entorno 0600 | `application-{dev,prueba,prod}.yml`, `crear-entorno.py`, `DespliegueHttpsTest`, `entrega-main.json` |
| B3 | GHCR/CD solo tras CI y main protegida | CD definitivo aprobado desde main tras CI/CodeQL del mismo SHA. PR/reglas verificadas; checks obligatorios de rama y restricciones de environment requieren administrador | `entrega-main.json`, `proteccion.json`, `.github/workflows/{ci,cd}.yml` |
| B4 | Copia/restauración de MySQL y evidencias | Aprobado en CI y en ensayo aislado de la VM; copia de la app descargada al equipo y cuatro SHA-256 verificados; timer diario activo | `recuperacion.json`, `backup.sh`, `restaurar.sh`, `systemd/` |
| B5 | Cinco usuarios, SUS y responsive | Responsive main aprobado: 32 capturas de roles y dos del formulario publicado. CSV/combinación preparados; cinco sesiones reales siguen pendientes | `docs/pruebas/usuarios/`, `/sus/`, `responsive-main/{resultado,sus}.json` |
| B6 | Manual técnico | Redactado con instalación, variables, CD, recuperación y diagnóstico | `docs/manual/Manual_tecnico.md` |
| Todos | Sección del informe, demostración y uso de IA | Sección B integrada en el informe; Gabriel consolida la presentación del equipo | `docs/informe/Informe_Final_Fases_III_IV.md`, `docs/registro-uso-ia.md` |

## Decisiones

- Ante falta de A1, el responsable autorizó una E5 x86 Free Trial de 1 OCPU/8 GB y disco
  de 50 GB. Se mantiene `FREE_TRIAL`; el crédito cubre el uso durante el curso según
  saldo y vigencia. La alternativa A1 2/12 permanece por defecto en Terraform.
- Caddy termina HTTPS y sirve API/SPA bajo el mismo origen. MySQL y backend quedan sin
  puertos del host. Certificados y evidencias persisten en volúmenes.
- CD main usa el SHA aprobado y digests multi-arquitectura. La primera demo de PR
  quedó como evidencia histórica; su job y sus Secrets/variables ya se retiraron.
- Copia coherente con el backend detenido, dump SQL, tar de evidencias y sumas SHA-256.
  Rollback de imágenes separado de restauración SQL si una migración no es retrocompatible.
- Configuración nueva mediante GitHub Secrets, sin escribir secretos en Git ni en Terraform.

## Historial de comprobaciones ejecutadas

| Comprobación | Resultado |
|---|---|
| Suite JUnit existente después de separar perfiles | 102 pruebas, 0 fallos/errores |
| Nuevo `DespliegueHttpsTest` con perfil prod y HTTP real detrás de cabeceras de proxy | 1 prueba aprobada: CSRF Secure, login, cookie HttpOnly/Secure/SameSite y perfil |
| Generador de entorno y cálculo SUS | 6 pruebas Python aprobadas |
| Sintaxis de los scripts Bash y JavaScript | Aprobada |
| ShellCheck 0.11.0 de los scripts | Aprobado |
| actionlint 1.7.7 de CI/CD | Aprobado |
| Terraform 1.9.8, init y validate con proveedor OCI 7.32.0 | Configuración válida; no se crearon recursos |
| Terraform fmt -check | Aprobado |
| Compose nube y Compose local+CI (config) | Válidos; sin arrancar contenedores |
| Caddy 2.10.2, validate | Configuración válida; sin solicitar certificados |
| Compilación Vite del frontend | Aprobada |
| Playwright con Edge, localhost, API real y H2 efímero | 32 capturas a 360/1366 px, cuatro roles, sin desbordes ni 5xx; ver `responsive-local/resultado.json` |
| Smoke sobre HTTPS público con cuenta real de demostración | Aprobado: TLS, HSTS, SPA, CSRF Secure, 401 JSON, OpenAPI, login/perfil/logout |
| Playwright sobre la URL pública | 32 capturas de cuatro roles a 360/1366, 0 desbordes y 0 errores 5xx; `responsive/resultado.json` |
| Regresión del detector de SPA de la entrega | 2 pruebas adicionales aprobadas; reconoce `id=raiz` y módulo compilado, rechaza páginas que no contienen la app |
| CI completo y publicación/entrega GHCR | Aprobados en [run 43322815086](https://github.com/marcelop04/mesa-servicio-universitario/actions/runs/43322815086) |
| Ensayo RNF11 en la VM | Aprobado: pérdida, copia corrupta, SQL/archivo/hash/permisos restaurados y servicios saludables |
| Copia externa de la app pública | SQL, evidencias, imágenes y metadatos transferidos por SCP; las cuatro sumas SHA-256 coinciden |
| Respaldo diario | `msu-backup.timer` activo; siguiente ejecución observada 13/11/2026 08:01:42 UTC |
| CI/CodeQL main de `df8cc39` | Aprobados: runs `43365136107` y `43365136281`, incluidos SCA y RNF11 con MySQL real |
| CD definitivo main | [Run 43365661850](https://github.com/marcelop04/mesa-servicio-universitario/actions/runs/43365661850) aprobado; publicación multi-arquitectura en 3m35s, entrega en 56s |
| Verificación después de CD | HTTPS/login/perfil/logout aprobados; 32 capturas de roles y dos de SUS a 360/1366, sin fallos; `responsive-main/` |
| Copia posterior a CD | `msu-20261113T043450Z-14914` descargada fuera de la VM; cuatro SHA-256 OK y sesión HTTPS comprobada al reanudar |

La prueba de proxy usa H2 y cabeceras de un terminador TLS simulado; **no demuestra un
certificado público** ni sustituye MySQL real. El ensayo RNF11 ejecuta Docker/MySQL en
GitHub Actions; el resultado de cada commit se consulta en los checks del PR.

## Accesos, publicación y aprovisionamiento real

- PR: <https://github.com/marcelop04/mesa-servicio-universitario/pull/4>.
- Se registró y verificó la clave API OCI; la región principal es `sa-bogota-1` (Bogotá).
- Se comprobó por API que no había VM ni volúmenes y que quedaban 200 GB de almacenamiento Always Free.
- Se intentó crear la configuración 2 OCPU/12 GB/50 GB con Terraform. La red se creó,
  pero `LaunchInstance` devolvió HTTP 500, `Out of host capacity`.
- También se consultaron 1 OCPU/6 GB y 1 OCPU/4 GB en los tres fault domains: todos sin
  capacidad. La comprobación posterior confirmó cero VM y cero volúmenes creados.
- El estado Terraform y los parámetros reales quedan localmente, ignorados por Git,
  para reintentar sin recrear la red. La evidencia pública omite identificadores de cuenta y claves.
- `davidAC322` tiene permiso WRITE, sin ADMIN. Se pudo registrar `SSH_PRIVATE_KEY` como
  Secret del repositorio y configurar `DEPLOY_USER=ubuntu`, `CD_ENABLED=false`.
- GitHub informa `main` protegida; su resumen no muestra checks obligatorios. Crear el
  environment `production` devolvió 403 por requerir administrador. Marcelo debe revisar
  las reglas existentes y añadir los ocho checks de CI/CodeQL sin eliminar reglas del equipo.
- El primer CI permitió comprobar los contenedores con MySQL real y detectó dos ajustes:
  expansión de rutas de ShellCheck en Docker y healthcheck Nginx con IPv4 explícito.
  Las correcciones se incluyen en la rama; ver el resultado actualizado en el PR.
- Posteriormente se comprobó `FREE_TRIAL` con promoción ACTIVE de S/1.139/30 días y
  `is_intent_to_pay=false`. Tras autorización explícita se creó una E5 disponible.
- VM: `msu-curso-trial`, 1 OCPU/8 GB/50 GB, IP pública `157.137.206.147`.
  URL verificada: `https://msu-157-137-206-147.sslip.io`.
- Cloud-init terminó correctamente; Docker y Compose funcionan. El acceso SSH usa
  la clave de host pública leída desde la consola mediante API OCI autenticada.
- Se registraron `DEMO_ENV`, `PRODUCTION_ENV`, `SSH_KNOWN_HOSTS` y variables del destino.
  Los archivos privados están fuera de Git. La cuenta conserva su plan Free Trial.
- La primera entrega publicó las imágenes en GHCR y arrancó los cuatro servicios.
  El smoke identificó un supuesto incorrecto de su propio detector HTML (`root` en
  vez de `raiz`). Se corrigió con parseo HTML y dos pruebas de regresión. El smoke
  externo con inicio/cierre de sesión ya está aprobado; ver checks para la nueva entrega.
- La entrega corregida terminó con éxito: [CI y demo](https://github.com/marcelop04/mesa-servicio-universitario/actions/runs/43322815086).
  Publicó y desplegó por digest el commit de merge probado `5b0a6aab9048669066ceabea2b032e56f2cae670`.
  Los digests y estados están en `docs/evidencias/fase-iii-iv-david/entrega.json`.
- Se ejecutó RNF11 en un proyecto efímero de la misma VM y se confirmó recuperación
  SQL/archivo/hash/permisos. Después se copió la aplicación pública y se descargó la
  instantánea al equipo del responsable; las cuatro sumas coinciden.
- El timer diario está activo. `CD_ENABLED` se pausó en `false` mientras se revisaba
  prod y se completaba CI del PR #8; se reactivó en `true` para el CD definitivo.
  Los ajustes administrativos de GitHub los realiza el propietario.
- El PR #4 se integró. El primer CD main duró 60 minutos y se canceló compilando
  assets ARM bajo QEMU; se corrigieron los stages de build para usar arquitectura nativa.
- Main integró el paquete C por PR #3 y la corrección A4/excepciones CVE por PR #7;
  ambas se incorporaron a `fix/despliegue-prod`. El guard de Marcelo se conserva idéntico.
  Prod rechaza cookies inseguras,
  cuentas demo y solicitudes demo; sus tests HTTPS crean un fixture H2 sin activar siembra.
- El archivo privado de producción se revisó preservando DB/JWT y datos existentes:
  `DATOS_DEMO=false`, `DATOS_DEMO_SOLICITUDES=false`, `SEGURIDAD_DESPLIEGUE=true`.
  El generador y el transporte rechazan configuraciones antiguas antes de entregarlas.
- Se obtuvieron las reglas efectivas mediante `/rules/branches/main` y los rulesets:
  borrado/force-push bloqueados, PR con 1 aprobación y bypass configurado. La respuesta
  no contiene checks obligatorios; `proteccion.json` registra la configuración real.
- No hay cinco participantes reales acreditados. El CSV de respuestas permanece vacío
  y el cálculo solo acepta registros de sesiones con origen `RESPUESTA_USUARIO`.
- La integración detectó una intermitencia al publicar políticas: MySQL/H2 redondeaba
  nanosegundos y podía dejar la fecha en el futuro. Se normalizó a milisegundos, acorde
  con `DATETIME(3)`, y se comprobó con reloj fijo y las pruebas de políticas.
- Los CI `43355639076` y `43358822956` fallaron por HTTP 503 de la API NVD. Una carga
  nueva desde los feeds oficiales NIST 2.0 y el análisis local terminaron correctamente.
  CI usa ese transporte con caché separada; CVSS ≥ 7, `failOnError`, actualización y
  excepciones de C se conservan. El resultado remoto se verifica en el PR.
- La propuesta adicional `despliegue/github/checks-main-ruleset.json` recoge los ocho
  checks de CI/CodeQL. Su creación por API devolvió 404 con WRITE, sin modificar las reglas.

## Entrega definitiva desde main · 13/11/2026 UTC

- PR #8 integrado en `df8cc39e32f1580b097295b8b003810435aee5ac`. CI y CodeQL de ese
  mismo SHA/push aprobaron; el gate del CD también quedó aprobado.
- [CD 43365661850](https://github.com/marcelop04/mesa-servicio-universitario/actions/runs/43365661850)
  publicó backend/frontend amd64/arm64, entregó por digest y verificó HTTPS. La VM
  ejecuta ambos con etiqueta de revisión igual al SHA; MySQL/backend/frontend saludables.
- Se verificó remotamente `prod`, ambas siembras `false`, guard `true`, cookie Secure,
  entorno privado `0600` y solo los puertos web publicados. Los datos académicos existentes
  se conservaron. Digests, estados y fuentes: `docs/evidencias/fase-iii-iv-david/entrega-main.json`.
- El workflow creó `production`, con deployment `7757186740` exitoso. La API muestra
  `protection_rules=[]` y `deployment_branch_policy=null`; recibe Secrets del repositorio.
  Las restricciones adicionales de GitHub siguen siendo tarea del administrador.
- Se repitieron smoke con sesión y revisión responsive sobre la nueva versión: 32
  capturas de cuatro roles, cero desbordes/5xx. El formulario `/sus/` responde HTTP 200,
  muestra 10 ítems/50 radios y tiene dos capturas adicionales sin desbordes; no se respondió
  ningún cuestionario en esta prueba técnica.
- Se creó una copia posterior a la entrega y se descargó fuera de la VM. Las cuatro
  sumas coinciden; la app volvió a aprobar login/perfil/logout después de reanudar.
  Timer activo, siguiente ejecución observada `2026-11-13T08:01:16Z`.
- La consulta de Code Scanning de main devuelve cinco alertas abiertas, todas en
  `prototipo/`: dos XSS, dos redirecciones y una falta de limitación de peticiones
  (tres high y dos medium). Esos archivos pertenecen al prototipo histórico y están
  fuera de los contextos Docker `backend/` y `frontend/`. Se registra su revisión
  pendiente con Marcelo; CodeQL exitoso no se presenta como ausencia de alertas.

## Dependencias para completar la operación

1. El propietario puede fortalecer reglas/environment; se distingue esa mejora de las
   protecciones que ya se han verificado, sin certificar checks inexistentes.
2. Realizar las cinco sesiones y adjuntar las respuestas reales SUS. Responsive web ya verificado.
3. Revisar con Marcelo las cinco alertas CodeQL del prototipo histórico.
4. Acordar el cierre después de la revisión docente, conservar copias externas y
   retirar la VM/discos antes de finalizar el período de prueba si ya no se necesitan.

## Evidencias de nube registradas y pendientes

| Evidencia | Estado |
|---|---|
| URL HTTPS y validación de sesión | `https://msu-157-137-206-147.sslip.io`, `https.json` |
| Cuenta/home region/cupo y error real de capacidad OCI | `docs/evidencias/fase-iii-iv-david/oci-capacidad.json` |
| Enlace a CI con ensayo de recuperación por commit | Checks del [PR #4](https://github.com/marcelop04/mesa-servicio-universitario/pull/4/checks) |
| Entrega demo CI/GHCR exitosa | [Run 43322815086](https://github.com/marcelop04/mesa-servicio-universitario/actions/runs/43322815086), `entrega.json` |
| Ruta CD main | [Run 43365661850](https://github.com/marcelop04/mesa-servicio-universitario/actions/runs/43365661850), `entrega-main.json`; aprobada |
| Reglas y environment | Configuración real registrada; ocho checks y restricciones adicionales requieren administrador |
| Informe del smoke HTTPS y login | `docs/evidencias/fase-iii-iv-david/https.json` |
| Copia externa y recuperación práctica con hashes | `docs/evidencias/fase-iii-iv-david/recuperacion.json` |
| Responsive 360/1366 main | `docs/evidencias/fase-iii-iv-david/responsive-main/` (32 capturas de roles y dos de SUS, 0 fallos) |
| Cuestionarios P01–P05 | Pendientes de personas reales |

## Integración con los demás paquetes

- Compartir URL y ventana de pruebas con Marcelo (ZAP), Alex (Newman/k6/E2E) y Gabriel
  (observabilidad). Coordinar carga/escaneos para no interferir con sesiones SUS.
- Gabriel puede añadir servicios/puertos internos en su Compose de observabilidad;
  mantener MySQL, Actuator y herramientas administrativas fuera del acceso público.
- Entregar a Alex únicamente resultados reales de usuarios, acompañados de sus fichas
  de sesión. Las pruebas técnicas de la fórmula no son evidencia de usabilidad.

## Revisión del paquete B · 13/11/2026 (Lima)

- Se retiró el guion individual de presentación y se integró la sección técnica en
  el informe final. Se conservan la bitácora, el responsable del registro IA y las
  tres tandas de capturas como historial, según el reparto y la revisión solicitada.
- Se eliminó el archivo de respuestas de ejemplo y el modo de simulación SUS.
  Se conserva la verificación técnica de la fórmula y el ensayo real de respaldo RNF11.
- Se preparó `docs/pruebas/usuarios/Cuestionario_SUS.md`, listo para compartir;
  el formulario registra fecha de Lima y ancho real automáticamente, valida la
  confirmación de uso y mantiene la descarga individual sin enviar respuestas al servidor.
- El script responsive incluye ahora la verificación reproducible de `/sus/`.
- Se retiraron la pantalla provisional sin rutas activas, su función auxiliar y
  los metadatos de asignación del menú que ya no se consumían, con aprobación del responsable.
- La API de GitHub confirmó permisos WRITE sin ADMIN: main exige un PR y una aprobación,
  pero no checks obligatorios; `production` tampoco tiene restricciones adicionales.
  El JSON aditivo de ocho checks queda listo para el propietario. No se declararon aplicados.
- Se comprobó nuevamente el origen público: TLS, SPA, CSRF Secure, 401 JSON y OpenAPI
  aprobados. Este smoke no inició sesión ni reemplaza las pruebas con participantes.
- D y E siguen en los PR #6 y #5, basados en versiones anteriores de main. Su integración
  debe conservar el gate CI/CodeQL, el guard prod y las herramientas/evidencias B actuales.

Pendientes B: cinco sesiones reales con su análisis y activación administrativa de
los checks de main. La verificación de una futura release integrada debe repetirse
después de que sus CI y CD terminen.

Validación de esta revisión: 15 pruebas de herramientas y 4 de autorización DAST
aprobadas; 83 pruebas frontend y compilación aprobadas. El formulario se verificó
con navegador a 360/1366 px: diez preguntas, 50 opciones, validación de campos y
descarga CSV correctas, sin desborde ni errores JavaScript. Los registros técnicos
se generaron en una carpeta temporal con origen de prueba local y no se incorporan
al CSV de participantes ni se cuentan como sesiones SUS.
