# Manual técnico · Nube y CI/CD (David, paquete B)

> Nota de integración C (12/11/2026): los perfiles de B se conservan, pero ya no hay claves
> predeterminadas en `dev` y `prod` rechaza las siembras demo. Revisar la configuración privada
> con David antes de desplegar esta versión; no reutilizar un `prod --demo` anterior.

## 1. Arquitectura y costo

```text
Rama de trabajo → PR → CI (JUnit, Vitest, SCA, build, recuperación, configuración)
                         ↓ push a main aprobado + CodeQL del mismo SHA
                      GHCR (amd64 + arm64, digest SHA-256)
                         ↓ SSH con host verificado
Internet → Caddy :443 → React/Nginx
              └──────→ Spring Boot :8080 → MySQL :3306
                              └────────→ volumen de evidencias
```

Plataforma elegida: **Oracle Cloud Infrastructure Free Trial**, una VM Ubuntu 24.04 x86
`VM.Standard.E5.Flex`, **1 OCPU / 8 GB RAM / 50 GB de disco**, para la evaluación del curso.
Se usa la promoción vigente con autorización del responsable; el plan de la cuenta
permanece `FREE_TRIAL`. MySQL se instala como contenedor propio. Solo SSH, HTTP y HTTPS
tienen entrada pública; MySQL y el backend no publican puertos del host.

| Componente | Alternativa gratuita | Condición |
|---|---|---|
| VM E5 del curso | Créditos OCI Free Trial | Promoción activa, crédito suficiente y retiro después de la evaluación |
| Alternativa A1 | OCI Always Free | `usar_creditos_trial=false`, home region y capacidad disponible |
| Disco | Volumen de arranque de 50 GB | Comprobar cupo compartido de almacenamiento gratuito de la cuenta |
| DNS | `msu-IP-CON-GUIONES.sslip.io` | Resuelve a la IP pública; también sirve un subdominio gratuito DuckDNS |
| HTTPS | Caddy + certificados ACME | DNS correcto, entrada TCP 80/443 y salida a Internet |
| CI/CD | GitHub Actions, runners estándar | Repositorio público; CD comprueba esta condición |
| Imágenes | GHCR | Almacenamiento y transferencia de Container Registry actualmente gratuitos |
| Respaldos | Volumen local + copia a equipo del responsable | Mantener una copia fuera de la VM; opcional OCI Object Storage dentro de su cupo gratuito |

La [documentación oficial de OCI](https://docs.oracle.com/en-us/iaas/Content/FreeTier/freetier_topic-Always_Free_Resources.htm),
consultada el 12/11/2026, indica **1.500 horas OCPU y 9.000 GB-hora al mes** para A1
(equivalente a 2 OCPU y 12 GB), 200 GB combinados de volúmenes y 20 GB de Object Storage.
Los cupos son compartidos con los demás recursos de la cuenta. Terraform conserva A1
2/12/50 por defecto; `usar_creditos_trial=true` selecciona E5 1/8/50 expresamente.
El 12/11/2026 A1 no tenía capacidad y se eligió E5 para la demostración temporal.
La promoción consultada era de S/1.139 por 30 días desde el 12/11/2026, con estado
ACTIVE y sin intención de pasar a pago. El importe de la promoción no es una lectura
de saldo restante en tiempo real. La tarifa pública de CPU/RAM E5 es aproximadamente
US$0,046/hora (US$33,12 por 720 horas), cubierta por el crédito mientras alcance.
Antes de aplicar, comprobar crédito, vigencia y costo de todos los recursos.
Referencia: [condiciones Free Trial](https://www.oracle.com/cloud/free/faq/).

Referencias de gratuidad: [GitHub Actions](https://docs.github.com/en/billing/concepts/product-billing/github-actions)
y [GHCR](https://docs.github.com/en/billing/managing-billing-for-your-products/managing-billing-for-github-packages/about-billing-for-github-packages).
Una VM Always Free puede ser recuperada por OCI si permanece inactiva y puede no haber
capacidad A1 en una región. Conservar las copias fuera de la VM y comprobar disponibilidad
antes de la sustentación; no cambiar automáticamente a una shape de pago.

## 2. Requisitos y ambientes

Desarrollo: Java 17+, Maven 3.9 (o `backend/mvnw.cmd` en Windows), Node 22+, MySQL 8 y
Docker con Compose 2.24+ para los contenedores. Administración de la nube: Terraform 1.9+,
OpenSSH, cuenta OCI con API key configurada en `~/.oci/config`, y permisos de administración
del repositorio para Secrets y protección de ramas. La VM instala Docker y Python 3.

| Ambiente | Perfil Spring | Persistencia y uso |
|---|---|---|
| Desarrollo | `dev` (predeterminado) | Compose raíz, MySQL local y credenciales externas generadas en `.env` |
| Pruebas unitarias/integración Java | `test` | H2 en memoria, migraciones reales; configuración en `src/test/resources` |
| Prueba del stack / usuarios | `prueba` | MySQL y volúmenes aislados; mismo HTTPS que producción cuando se publica |
| Producción académica | `prod` | Stack `despliegue/compose.yml`, GHCR, TLS y volúmenes persistentes |

`prueba` y `prod` tienen claves diferentes y nombres Compose `msu-prueba`/`msu-prod`.
CI usa un proyecto efímero adicional `msu-recuperacion-PID`, sin publicar puertos.
Si se prueba el stack completo en la misma VM, hacerlo en una ventana acordada: dos
Caddy no pueden ocupar simultáneamente los mismos puertos 80/443. El costo previsto
corresponde a **una** VM de nube; desarrollo y las pruebas automatizadas corren localmente/en CI.

Para desarrollar con una base nueva, generar `.env` privado con
`powershell -ExecutionPolicy Bypass -File scripts/preparar-entorno.ps1` y ejecutar:

```bash
docker compose up --build
```

App: `http://localhost:8081`, API: `http://localhost:8080/swagger-ui.html`.
Sin Docker: seguir el README raíz. Si la base ya existe, conservar sus claves y configurar
el entorno sin borrar volúmenes. `dev` requiere DB_PASSWORD/JWT_SECRET y contraseña demo explícitas.
Los perfiles de nube exigen las credenciales por entorno y fuerzan
la cookie de sesión `Secure`.

## 3. Crear la VM del curso

1. Crear la cuenta OCI, identificar su **home region** y un compartimento.
2. Crear una API key desde el perfil OCI y configurar `~/.oci/config` en el equipo privado.
   Terraform usa ese archivo; la clave privada no entra al repositorio ni al estado como variable.
3. Crear una clave SSH dedicada para CD. La privada debe estar sin passphrase para la
   automatización y se guarda como Secret; la pública se coloca en `ssh_public_key`.
4. Copiar `despliegue/infra/terraform.tfvars.example` como `terraform.tfvars` y completar
   región, compartimento y clave **pública**. El archivo está ignorado por Git.
   Para la E5 de esta entrega, poner `usar_creditos_trial=true` tras verificar la promoción.
5. Ejecutar desde la raíz (los siguientes comandos de archivos usan Bash/Git Bash):

```bash
terraform -chdir=despliegue/infra init
terraform -chdir=despliegue/infra fmt -check
terraform -chdir=despliegue/infra validate
terraform -chdir=despliegue/infra plan -out=msu.tfplan
terraform -chdir=despliegue/infra apply msu.tfplan
terraform -chdir=despliegue/infra output
```

El plan crea VCN, gateway, ruta, subnet, reglas 22/80/443 y una VM A1 o E5 según el modo. No crea
balanceadores ni bases gestionadas. `ssh_cidr=0.0.0.0/0` permite los runners públicos
de GitHub con IP variable: Ubuntu usa autenticación por clave. Puede restringirse si
se dispone de una salida SSH de IP fija. No abrir 3306, 8080 ni el administrador de Caddy.
Si OCI devuelve falta de capacidad, esperar o elegir otro dominio de disponibilidad
de la misma home region mediante `availability_domain_index`.

La salida `hostname_gratuito` proporciona un nombre DNS sin comprar dominio. Comprobar
que resuelve a `ip_publica` con `nslookup`. Conectar y esperar el aprovisionamiento:

```bash
ssh -i /ruta/privada/msu_cd ubuntu@IP_PUBLICA
sudo cloud-init status --wait
docker compose version
```

Reconectar si el grupo `docker` aún no está activo. El cloud-init ejecuta
`despliegue/scripts/preparar-vm.sh`: instala Docker, prepara `/opt/msu` y habilita
80/443 en el firewall de Ubuntu. Las reglas OCI también deben permitir esos puertos.

## 4. Variables y Secrets

Generar el entorno **en una carpeta privada existente**, con Python 3.10+:

```bash
python despliegue/scripts/crear-entorno.py \
  --host msu-IP-CON-GUIONES.sslip.io --email TU_CORREO \
  --perfil prod --salida /ruta/privada/produccion.env
```

**Prod exige `DATOS_DEMO=false`, `DATOS_DEMO_SOLICITUDES=false`, cookies seguras y
`SEGURIDAD_DESPLIEGUE=true`.** El generador rechaza `--perfil prod --demo`; el transporte
valida la configuración antes de copiarla al servidor y el backend también rechaza
las opciones incompatibles. No se reutiliza el antiguo archivo de demostración como prod.

La siembra solo se habilita expresamente para un entorno aislado de prueba:

```bash
python despliegue/scripts/crear-entorno.py \
  --host prueba.example.org --email TU_CORREO --perfil prueba --demo \
  --salida /ruta/privada/prueba.env
```

La migración de la VM existente conservó sus claves de DB/JWT y sus datos, cambiando
solo las opciones de siembra/despliegue. Desactivar la siembra no borra usuarios o
solicitudes previamente almacenados. La contraseña de las cuentas de evaluación
existentes se comunica por el archivo local privado de acceso; no se regenera al arrancar.

### Primera administración en una instalación prod vacía

Con prod sin demo, las migraciones crean roles/catálogos, no cuentas. Registrar desde
la web la cuenta institucional elegida por el responsable. Un operador con acceso
SSH/DB la promueve una sola vez en la consola MySQL del contenedor:

```sql
UPDATE usuario
SET rol_id = (SELECT id FROM rol WHERE codigo = 'ADMINISTRADOR'),
    version_autorizacion = version_autorizacion + 1
WHERE correo = 'correo-elegido@institucion.edu';
```

Usar el correo efectivamente registrado y comprobar que se actualizó una sola fila.
Cerrar e iniciar sesión de nuevo. Desde P12 publicar la política inicial (por ejemplo,
Crítica 4/24 h, Alta 8/48 h, Media 24/120 h, Baja 48/240 h). Después administrar usuarios
desde P11. El hash lo genera el registro normal; no insertar contraseñas en texto plano.
Este procedimiento de provisión corresponde a B; el paquete C aporta el guard.
Cambiar `DEMO_PASSWORD` no rota contraseñas ya almacenadas: cualquier rotación se
coordina mediante el perfil/administración y conserva los datos.

| Variable | Significado |
|---|---|
| `COMPOSE_PROJECT_NAME` | `msu-prod` o `msu-prueba`; determina los volúmenes independientes |
| `SPRING_PROFILES_ACTIVE` | `prod` o `prueba`; nunca `dev` en el stack de nube |
| `SEGURIDAD_DESPLIEGUE` | `true` en prod; `false` en prueba con siembra autorizada |
| `APP_HOST` | Nombre DNS, sin `https://`, ruta ni puerto |
| `ACME_EMAIL` | Correo de contacto para los certificados |
| `DB_USER`, `DB_PASSWORD` | Usuario y clave de la base `mesa_servicios` |
| `MYSQL_ROOT_PASSWORD` | Clave administrativa de MySQL, distinta a la de la aplicación |
| `JWT_SECRET` | Clave aleatoria de firma; el generador entrega 96 caracteres hexadecimales |
| `DEMO_PASSWORD` | Contraseña inicial de las cuentas ficticias, cuando se habilitan |
| `DATOS_DEMO`, `DATOS_DEMO_SOLICITUDES` | Activación explícita de cuentas y solicitudes de demostración |
| `TAREAS_HABILITADAS` | Cierre, alertas y limpieza de sesiones; true en prod |
| `BACKEND_IMAGE`, `FRONTEND_IMAGE` | Digests escritos por CD en `imagenes.env`; no son secretos |

La URL interna de MySQL, el directorio `/app/archivos` y la cookie segura los fija el
Compose de nube. MySQL conserva sus credenciales en el volumen inicial: para rotarlas
en una base existente hacer `ALTER USER` antes de actualizar el Secret; cambiar el
`.env` por sí solo no cambia el usuario MySQL. Rotar JWT invalida las sesiones existentes.

El workflow usa el environment **`production`**. En esta entrega se creó automáticamente
al ejecutar CD y utiliza los siguientes Secrets del repositorio y variables:

| Tipo | Nombre | Valor |
|---|---|---|
| Secret del repositorio | `PRODUCTION_ENV` | Contenido completo del archivo generado |
| Secret del repositorio | `SSH_PRIVATE_KEY` | Clave privada dedicada al usuario `ubuntu` |
| Secret del repositorio | `SSH_KNOWN_HOSTS` | Entrada OpenSSH verificada para la IP/nombre de conexión |
| Variable del repositorio | `DEPLOY_HOST` | IP pública o nombre usado en SSH, sin protocolo |
| Variable del repositorio | `DEPLOY_USER` | `ubuntu` |
| Variable del repositorio | `PRODUCTION_URL` | `https://` + `APP_HOST` |
| Variable del repositorio | `CD_ENABLED` | `true` después de completar la configuración |

Obtener las entradas con `ssh-keyscan -H IP_PUBLICA` y comparar la huella con
`ssh-keygen -lf /etc/ssh/ssh_host_ed25519_key.pub` visto en la consola OCI/una sesión
ya verificada. No desactivar `StrictHostKeyChecking`. La clave usada en CD debe poder
abrirse sin interacción. Los Secrets de esta entrega se gestionan con `gh secret set`.
La API de `production` muestra `protection_rules=[]` y `deployment_branch_policy=null`;
el administrador configura sus revisores y restricciones adicionales.

## 5. PR, protección de main y CD

Requiere que el propietario/administrador del repositorio ejecute, una vez autenticado:

```bash
gh auth login
gh api --method PUT repos/marcelop04/mesa-servicio-universitario/environments/production
gh api --method POST repos/marcelop04/mesa-servicio-universitario/rulesets \
  --input despliegue/github/checks-main-ruleset.json
```

El JSON propone un ruleset adicional de ocho checks, sin sustituir los rulesets existentes.
La configuración **observada** por
la API de reglas efectivas de main bloquea borrado/force-push y exige PR con una
aprobación, con bypass configurado para el usuario actual. No declara checks de estado
obligatorios. Ver `docs/evidencias/fase-iii-iv-david/proteccion.json`; no se atribuyen
a la rama checks que la API no muestra. El propietario puede añadir los ocho checks de CI/CodeQL.
El equipo trabaja en ramas (`feat/david-despliegue` para este paquete) y hace squash
merge desde un PR. Primero ejecutar los nuevos checks en el PR para que GitHub los registre.

Si `main` ya está protegida, el administrador debe conservar sus reglas y checks
existentes e incorporar los del paquete B; el JSON es una referencia de configuración
mínima, no una razón para borrar protecciones del equipo. El intento de crear el ruleset
adicional con la cuenta de David devolvió 404, sin cambiar las reglas. Esa cuenta tiene
WRITE y pudo gestionar Secrets/variables del repositorio, pero crear el environment
devolvió 403. Los Secrets también pueden guardarse a nivel de repositorio y ser usados
por el job `production`; esa fue la configuración usada en la entrega definitiva.
El workflow pudo crear el environment automáticamente, pero sus preferencias de
protección las configura el administrador.

El flujo `.github/workflows/cd.yml` funciona cuando forme parte de `main`:

1. `CI` debe terminar con éxito **completo** para un push a `main` del mismo repositorio público.
   Incluye MySQL real y pérdida/restauración de datos/archivos, además de las suites existentes.
   Antes de publicar, se verifica el último resultado CI del mismo SHA/push y se espera
   también CodeQL si su workflow ya está integrado. Un fallo de seguridad impide entregar.
2. CD verifica que el SHA aprobado sigue siendo la punta de `main` y publica dos imágenes
   multi-arquitectura (`linux/amd64`, `linux/arm64`) en GHCR, con etiqueta `sha-COMMIT`.
3. Despliega por **digest**, no por `latest`. Un evento de PR no puede activar este CD.
4. Por SSH con host fijado, entrega los archivos en `/opt/msu/entregas/COMMIT`, sincroniza
   el Secret con permisos 600 e inicia sesión en GHCR con el token temporal de Actions.
5. Toma una copia consistente si ya existe MySQL, actualiza contenedores, espera salud
   y ejecuta el smoke HTTPS con validación de certificado, cookies, API y OpenAPI.
6. Actualiza `/opt/msu/actual`, instala el timer de respaldo y registra los digests y fecha
   en `/opt/msu/shared/ultimo-despliegue.txt`. Cierra la sesión de GHCR al terminar.

### Fuente de vulnerabilidades Java

CI descarga los feeds JSON 2.0 oficiales de NIST mediante `nvdDatafeedUrl`, compatible
con Dependency-Check 13. La carga inicial incluye todos los años desde 2002 y el feed
`modified`; la caché completa se mantiene separada de la caché API. Se conserva la
actualización automática (vigencia predeterminada de cuatro horas), el umbral CVSS ≥ 7,
`failOnError=true` y las excepciones versionadas/caducables del paquete C.
Un fallo de descarga o análisis sigue bloqueando CI/CD.

La API NVD devolvió HTTP 503 en los runs `43355639076` y `43358822956`; el cambio de
transporte se verificó con una descarga nueva de los feeds y un análisis local exitoso.
Referencia: [fuentes oficiales NVD](https://nvd.nist.gov/vuln/data-feeds).
El lanzador local `scripts/analizar-dependencias.ps1` conserva la vía API con
`NVD_API_KEY`; el Secret no se necesita para el transporte por feed de CI.

El run CodeQL de main también terminó con éxito, pero la consulta de alertas registra
cinco abiertas en `prototipo/` (dos XSS, dos redirecciones y una falta de rate limiting).
Esos archivos están fuera de los contextos de las imágenes backend/frontend. El gate
actual exige la finalización exitosa del workflow; no evalúa por sí mismo el listado
de alertas. Su revisión corresponde al responsable de seguridad y queda documentada
en `entrega-main.json`.

`CD_ENABLED=false` permite publicar sin intentar SSH. GHCR puede crear los paquetes como
privados inicialmente; el token temporal permite descargarlos. Para descarga anónima,
el propietario puede poner ambos paquetes como públicos en Packages. La etiqueta de
origen de las imágenes las vincula al repositorio para gestionar sus accesos desde GitHub.

### Historial de la entrega académica inicial desde PR

La primera comprobación cloud se ejecutó desde el PR #4 autorizado, con cuatro checks
previos y digests de GHCR (ver `entrega.json`). Después de integrarse el PR, se retiró
ese job de bootstrap y se eliminaron `DEMO_ENV` y sus variables de activación. La ruta
definitiva es `CI main → gate del mismo SHA → GHCR → environment production → SSH`.
Los builds de Maven/Node se hacen en `$BUILDPLATFORM`: JAR y assets son portables y así
se evita el bloqueo observado al compilar el frontend ARM bajo QEMU. Los runtimes finales
siguen siendo multi-arquitectura. `CD_ENABLED` se habilita después de revisar prod.

En el primer despliegue, Caddy obtiene el certificado automáticamente y redirige HTTP a
HTTPS. Sus certificados persisten en volúmenes. Si DNS/80/443 o la autoridad ACME fallan,
CD queda fallido; no se declara terminado por tener solo un contenedor en ejecución.

## 6. Operación, copia y restauración (RNF11)

Rutas de la VM:

```text
/opt/msu/shared/produccion.env       secretos, 600
/opt/msu/shared/imagenes.env         digests desplegados
/opt/msu/shared/operacion.lock       exclusión mutua entre CD/copia/restauración
/opt/msu/entregas/COMMIT/            archivos versionados de cada entrega
/opt/msu/actual                     enlace a la última entrega verificada
/opt/msu/backups/msu-FECHA-ALEATORIO/ copias completas, directorio privado
```

La copia detiene el backend (incluidas tareas programadas) y permite finalizar las
peticiones en curso antes del `mysqldump`. Después empaqueta las evidencias con sus
permisos, conserva los digests y calcula SHA-256; finalmente reanuda el backend,
también si el dump falla. Hay una breve indisponibilidad de la API en esa ventana.
Una copia parcial no se publica como completa. Conserva siete días por defecto.

```bash
bash /opt/msu/actual/despliegue/scripts/backup.sh
systemctl list-timers msu-backup.timer
journalctl -u msu-backup.service --since today
```

El timer corre diariamente a las 08:00 UTC (03:00 de Lima), con hasta 5 minutos de
variación. CD toma además una copia antes de cada actualización. Copiar regularmente
el **directorio completo** a un equipo distinto: una copia en la misma VM no protege
contra pérdida de la VM. Desde el equipo privado, usando el nombre emitido por el script:

```bash
scp -i /ruta/privada/msu_cd -r ubuntu@IP_PUBLICA:/opt/msu/backups/msu-FECHA-ALEATORIO /ruta/privada/backups/
```

Puede usarse un bucket privado OCI dentro de los 20 GB Always Free para la copia externa;
su alta/transporte y retención dependen de la cuenta y no están activos por defecto.
Las copias pueden contener datos personales: no publicarlas en Git ni en artifacts públicos.
El `.env` no forma parte de la copia; se recupera desde GitHub Secrets por separado.

Restauración en la VM preparada, sustituyendo la base y evidencias actuales:

```bash
bash /opt/msu/actual/despliegue/scripts/restaurar.sh \
  /opt/msu/backups/msu-FECHA-ALEATORIO --confirmar-sustitucion
python3 /opt/msu/actual/despliegue/scripts/verificar-https.py --url https://TU_HOST
```

El script verifica las sumas y los archivos antes de detener el backend; elimina y
recrea `mesa_servicios`, importa SQL, sustituye el contenido del volumen de evidencias,
recupera los digests de la copia y comprueba salud. Si falla a mitad, deja el backend
detenido para evitar escrituras sobre una recuperación incompleta. Conserva las
referencias anteriores en `imagenes.env.antes-restaurar`.

Para una VM nueva: recuperar `produccion.env` desde el Secret, entregar una copia del
directorio `despliegue`, copiar el `imagenes.env` del respaldo a `/opt/msu/shared`,
autenticarse en GHCR si las imágenes son privadas y ejecutar la restauración. El
primer `up` de MySQL crea el usuario; luego se importa la base. Iniciar Caddy con
`desplegar.sh` y los digests recuperados para verificar también TLS.

**Prueba práctica automatizada:**

```bash
docker compose -f docker-compose.yml -f despliegue/compose.ci.yml build
bash despliegue/scripts/probar-recuperacion.sh
```

El ensayo crea su propio proyecto y volúmenes, escribe una fila SQL y un archivo como
usuario del backend, copia, corrompe datos y archivos, comprueba el rechazo de una copia
truncada, restaura y verifica: valor SQL original, eliminación de tablas/archivos posteriores,
hash idéntico del archivo, capacidad de escribir tras restaurar y salud del stack.
Solo elimina los volúmenes efímeros de ese ensayo. CI lo ejecuta en `Imágenes Docker`;
conservar su resultado y repetir en la VM para registrar duración real y copia externa.

Si CD falla, intenta volver a las imágenes anteriores. Las migraciones deben ser
retrocompatibles: revertir una imagen no revierte SQL; para un cambio incompatible
usar la copia previa con este procedimiento y comprobar la versión de Flyway.

## 7. Verificación HTTPS y usuarios

```bash
python despliegue/scripts/verificar-https.py --url https://TU_HOST
```

Comprueba CA/nombre de certificado, HSTS, ruta SPA, CSRF `Secure`, 401 JSON y OpenAPI.
Con `MSU_TEST_EMAIL` y `MSU_TEST_PASSWORD` en el entorno también verifica inicio de
sesión, cookie HttpOnly/Secure/SameSite=Lax, perfil y cierre de sesión. No imprime tokens
ni contraseñas. No usar opciones que deshabiliten la verificación TLS.

El [protocolo de usuarios](../pruebas/usuarios/Protocolo_SUS.md) describe las cinco
sesiones y la revisión responsive. Sus resultados reales son requisito para cerrar B5.

## 8. Diagnóstico

| Síntoma | Comprobación |
|---|---|
| Terraform sin capacidad A1 | Home region/AD/cupo; no sustituir por una shape pagada |
| SSH bloqueado | IP, clave, usuario ubuntu, regla 22 y `SSH_KNOWN_HOSTS` verificado |
| Certificado no emitido | DNS hacia la VM, reglas OCI y firewall 80/443; logs de Caddy; límites ACME del dominio compartido |
| GHCR 401/403 | Token con packages:read y acceso de Actions al paquete vinculado al repositorio |
| Dependency-Check falla al actualizar NVD | Consultar disponibilidad de los feeds oficiales y logs; conservar CVSS ≥ 7 y failOnError; no aprobar un análisis incompleto |
| MySQL «Access denied» después de cambiar el Secret | Las claves del volumen no cambian con `.env`; coordinar `ALTER USER` |
| API 502 | Salud de MySQL/backend y memoria; `docker compose ... logs backend` usando ambos env files |
| Cookie sin Secure | Perfil prod/prueba, proxy directo Caddy→backend y X-Forwarded-Proto |
| Falla al subir imagen de 5 MB | Caddy y Nginx permiten petición multipart de 6 MB |
| Puerto ocupado al probar otro ambiente | Usar ventana de prueba o host separado; no compartir volúmenes |
| Disco de VM lleno | `docker system df`, tamaños de copias y logs; conservar una copia externa antes de limpiar |

## 9. Evidencias y estado

Consultar [la bitácora de David](../fase-iii-iv-david.md) para distinguir implementación,
comprobaciones locales, ejecución real de CI/CD y resultados con usuarios. Una validación
Terraform no crea la VM; un cuestionario preparado no equivale a cinco sesiones completadas.

En el intento del 12/11/2026 la API confirmó Bogotá como home region, cero VM/volúmenes
y 200 GB Always Free disponibles. Terraform creó la red, pero la VM fue rechazada con
`Out of host capacity`. También se consultaron configuraciones menores en los tres
fault domains y todas devolvieron falta de capacidad. Se conserva el estado Terraform
local para reintentar el mismo plan; `CD_ENABLED=false` hasta disponer del servidor,
sus Secrets completos y HTTPS verificado.

Después se autorizó el uso de la prueba y se creó la E5 en Bogotá. Dirección verificada:
`https://msu-157-137-206-147.sslip.io`. La URL, TLS, cookies, login/perfil/logout y entrega
automática ya se verificaron; ver `https.json` y `entrega.json` en las evidencias.
El ensayo de pérdida/restauración de la VM y la copia externa están en `recuperacion.json`.
La huella SSH se obtuvo del historial de
consola por la API OCI autenticada y se fijó en `SSH_KNOWN_HOSTS`.

La entrega definitiva desde main se completó el **13/11/2026 UTC** con el commit
`df8cc39e32f1580b097295b8b003810435aee5ac`:

- [CI 43365136107](https://github.com/marcelop04/mesa-servicio-universitario/actions/runs/43365136107),
  [CodeQL 43365136281](https://github.com/marcelop04/mesa-servicio-universitario/actions/runs/43365136281)
  y [CD 43365661850](https://github.com/marcelop04/mesa-servicio-universitario/actions/runs/43365661850)
  aprobados para ese SHA.
- Publicación amd64/arm64 en 3m35s y entrega por digest en 56s; etiquetas de revisión
  coincidentes en la VM. Prod tiene guard activo, ambas siembras desactivadas y cookie Secure.
- Revisión externa: sesión HTTPS aprobada, 32 capturas de roles y dos de `/sus/` a
  360/1366 px sin fallos. `responsive-main/` y `https.json` conservan los resultados.
- Copia `msu-20261113T043450Z-14914` descargada al equipo privado y sus cuatro sumas
  verificadas. Timer diario activo; `CD_ENABLED=true`.

La evidencia completa está en `docs/evidencias/fase-iii-iv-david/entrega-main.json`.

Acceso de usuarios: abrir la URL y usar Registro o las cuentas ficticias por rol del
README. En la nube sus contraseñas son aleatorias; `DEMO_PASSWORD` se conserva en el
archivo privado del responsable y en GitHub Secrets. El responsable dispone además
de un archivo local privado de acceso, separado del `.env`, para comunicar solo las
credenciales de demostración al equipo. Las contraseñas no se incluyen en el manual.

## 10. Cierre del curso y conservación de evidencias

La VM E5 es temporal y consume créditos. Acordar la última fecha de revisión del
docente; el vencimiento estimado de esta promoción es alrededor del 12/12/2026.
Al finalizar: descargar SQL/evidencias, conservar informes/capturas/repositorio y
retirar la VM y sus discos. Apagar una VM no elimina sus volúmenes.
Con las copias verificadas y el estado Terraform local correcto:

```bash
terraform -chdir=despliegue/infra plan -destroy -out=retirar-curso.tfplan
terraform -chdir=despliegue/infra apply retirar-curso.tfplan
```

Revisar que el plan solo afecte a los recursos de este proyecto y confirmar después
en OCI que la VM y su disco desaparecieron. Desactivar las variables de entrega en
GitHub al retirar el servidor. Mantener la cuenta en Free Trial/Free Tier conserva
el modelo sin facturación automática al concluir la promoción.
