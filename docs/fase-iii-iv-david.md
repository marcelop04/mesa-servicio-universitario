# Fases III y IV · David · Paquete B: Nube y CI/CD

Base: `main` (`87afec8`, funciones de Emanuel integradas). Rama: `feat/david-despliegue`.
Fecha de preparación: 12/11/2026. Plataforma: OCI Free Trial para la demostración del curso;
Always Free se conserva como alternativa de infraestructura.

## Entregables y criterio de cierre

| ID | Entregable | Estado verificable | Evidencia |
|---|---|---|---|
| B1 | MySQL, backend y frontend en nube con HTTPS | E5 1 OCPU/8 GB/50 GB creada y Docker listo; DNS resuelto, entrega HTTPS en verificación | `despliegue/infra/`, `despliegue/compose.yml`, `Caddyfile`, evidencia OCI |
| B2 | Desarrollo, prueba, producción y secretos | Implementado; perfiles, generador y comportamiento de cookies en prod probados localmente | `application-{dev,prueba,prod}.yml`, `.env.example`, `crear-entorno.py`, `DespliegueHttpsTest` |
| B3 | GHCR/CD solo tras CI y main protegida | PR #4, entrega demo desde rama autorizada tras cuatro checks; CD main preparado, integración/revisión y ajustes de environment pendientes del propietario | `.github/workflows/{ci,cd}.yml`, `entregar-ci.sh`, `despliegue/github/proteccion-main.json`, PR #4 |
| B4 | Copia/restauración de MySQL y evidencias | Scripts y timer implementados; ensayo MySQL real en CI del PR; recuperación en VM y copia externa pendientes | `backup.sh`, `restaurar.sh`, `probar-recuperacion.sh`, `systemd/`, checks del PR #4 |
| B5 | Cinco usuarios, SUS y responsive | Protocolo y herramientas listos; revisión local de 32 pantallas aprobada; sesiones y revisión desplegada pendientes | `docs/pruebas/usuarios/`, `responsive-despliegue.mjs`, `docs/evidencias/fase-iii-iv-david/responsive-local/` |
| B6 | Manual técnico | Redactado con instalación, variables, CD, recuperación y diagnóstico | `docs/manual/Manual_tecnico.md` |
| Todos | Sección del informe, demostración y uso de IA | Borradores documentados; incorporar evidencias reales al activar la nube | `docs/informe/Seccion_David_Nube_CD.md`, `docs/presentacion/Guion_David.md`, `docs/registro-uso-ia.md` |

## Decisiones

- Ante falta de A1, el responsable autorizó una E5 x86 Free Trial de 1 OCPU/8 GB y disco
  de 50 GB. Se mantiene `FREE_TRIAL`; el crédito cubre el uso durante el curso según
  saldo y vigencia. La alternativa A1 2/12 permanece por defecto en Terraform.
- Caddy termina HTTPS y sirve API/SPA bajo el mismo origen. MySQL y backend quedan sin
  puertos del host. Certificados y evidencias persisten en volúmenes.
- CD main usa el SHA aprobado y digests inmutables multi-arquitectura. La demo inicial
  es un job separado, habilitado para la rama propia autorizada, después del éxito
  de los cuatro checks; también usa el commit probado y sus digests GHCR.
- Copia coherente con el backend detenido, dump SQL, tar de evidencias y sumas SHA-256.
  Rollback de imágenes separado de restauración SQL si una migración no es retrocompatible.
- Configuración nueva mediante GitHub Secrets, sin escribir secretos en Git ni en Terraform.

## Comprobaciones locales ejecutadas

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
  las reglas existentes y añadir los cuatro checks sin eliminar reglas del equipo.
- El primer CI permitió comprobar los contenedores con MySQL real y detectó dos ajustes:
  expansión de rutas de ShellCheck en Docker y healthcheck Nginx con IPv4 explícito.
  Las correcciones se incluyen en la rama; ver el resultado actualizado en el PR.
- Posteriormente se comprobó `FREE_TRIAL` con promoción ACTIVE de S/1.139/30 días y
  `is_intent_to_pay=false`. Tras autorización explícita se creó una E5 disponible.
- VM: `msu-curso-trial`, 1 OCPU/8 GB/50 GB, IP pública `157.137.206.147`.
  DNS previsto: `https://msu-157-137-206-147.sslip.io` (comprobación de aplicación pendiente).
- Cloud-init terminó correctamente; Docker y Compose funcionan. El acceso SSH usa
  la clave de host pública leída desde la consola mediante API OCI autenticada.
- Se registraron `DEMO_ENV`, `PRODUCTION_ENV`, `SSH_KNOWN_HOSTS` y variables del destino.
  Los archivos privados están fuera de Git. La cuenta conserva su plan Free Trial.

## Dependencias para completar la operación

1. Terminar y verificar la primera entrega de demostración en la E5, cuyo uso fue
   autorizado para el período de prueba del curso.
2. Administrador del repositorio para crear el environment y revisar/ampliar los checks
   de la protección existente de `main`.
3. Ejecutar RNF11 en la VM cuando exista; CI proporciona el ensayo aislado con MySQL real.
4. Revisar e integrar el PR, completar host/Secrets restantes y activar CD con la VM lista.
5. Ejecutar smoke HTTPS, ensayo de recuperación en VM y copia externa; registrar URL,
   digests, hora, duración, resultado de CI/CD y hashes sin incluir datos ni secretos.
6. Realizar las cinco sesiones y adjuntar los resultados reales de SUS/responsive.

## Evidencias de nube por completar

| Evidencia | Estado |
|---|---|
| URL HTTPS y fecha/commit/digests | Pendiente |
| Cuenta/home region/cupo y error real de capacidad OCI | `docs/evidencias/fase-iii-iv-david/oci-capacidad.json` |
| Enlace a CI con ensayo de recuperación por commit | Checks del [PR #4](https://github.com/marcelop04/mesa-servicio-universitario/pull/4/checks) |
| Enlace a CD exitoso y protección de main | Pendiente |
| Informe del smoke HTTPS y login | Pendiente |
| Copia externa, recuperación práctica, duración y hashes | Pendiente |
| Responsive 360/1366 y cuestionarios P01–P05 | Pendiente |

## Integración con los demás paquetes

- Compartir URL y ventana de pruebas con Marcelo (ZAP), Alex (Newman/k6/E2E) y Gabriel
  (observabilidad). Coordinar carga/escaneos para no interferir con sesiones SUS.
- Gabriel puede añadir servicios/puertos internos en su Compose de observabilidad;
  mantener MySQL, Actuator y herramientas administrativas fuera del acceso público.
- Entregar a Alex únicamente resultados reales de usuarios, no los datos sintéticos
  empleados para comprobar la fórmula SUS.
