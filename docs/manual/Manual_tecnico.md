# Manual técnico · Nube y CI/CD (David, paquete B)

## 1. Arquitectura y costo

```text
Rama de trabajo → PR → CI (JUnit, Vitest, build, recuperación, configuración)
                         ↓ solo push a main aprobado
                      GHCR (amd64 + arm64, digest SHA-256)
                         ↓ SSH con host verificado
Internet → Caddy :443 → React/Nginx
              └──────→ Spring Boot :8080 → MySQL :3306
                              └────────→ volumen de evidencias
```

Plataforma elegida: **Oracle Cloud Infrastructure Always Free**, una VM Ubuntu 24.04 ARM
`VM.Standard.A1.Flex`, **2 OCPU / 12 GB RAM / 50 GB de disco**. MySQL se instala como
contenedor propio: no se contrata una base de datos de pago. Solo SSH, HTTP y HTTPS
tienen entrada pública; MySQL y el backend no publican puertos del host.

| Componente | Alternativa gratuita | Condición |
|---|---|---|
| VM y disco | OCI Always Free | Home region, cupo disponible de la cuenta; una sola VM de este tamaño |
| DNS | `msu-IP-CON-GUIONES.sslip.io` | Resuelve a la IP pública; también sirve un subdominio gratuito DuckDNS |
| HTTPS | Caddy + certificados ACME | DNS correcto, entrada TCP 80/443 y salida a Internet |
| CI/CD | GitHub Actions, runners estándar | Repositorio público; CD comprueba esta condición |
| Imágenes | GHCR | Almacenamiento y transferencia de Container Registry actualmente gratuitos |
| Respaldos | Volumen local + copia a equipo del responsable | Mantener una copia fuera de la VM; opcional OCI Object Storage dentro de su cupo gratuito |

La [documentación oficial de OCI](https://docs.oracle.com/en-us/iaas/Content/FreeTier/freetier_topic-Always_Free_Resources.htm),
consultada el 12/11/2026, indica **1.500 horas OCPU y 9.000 GB-hora al mes** para A1
(equivalente a 2 OCPU y 12 GB), 200 GB combinados de volúmenes y 20 GB de Object Storage.
Los cupos son compartidos con los demás recursos de la cuenta. La configuración fija
2/12/50; antes de aplicarla confirmar el cupo libre y el costo de **0** en la consola.
El alta puede pedir tarjeta para validar identidad; este proyecto no requiere activar
Pay As You Go ni recursos que dependan del crédito temporal de prueba.

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
| Desarrollo | `dev` (predeterminado) | Compose raíz, MySQL local, claves de demostración explícitas en `application-dev.yml` |
| Pruebas unitarias/integración Java | `test` | H2 en memoria, migraciones reales; configuración en `src/test/resources` |
| Prueba del stack / usuarios | `prueba` | MySQL y volúmenes aislados; mismo HTTPS que producción cuando se publica |
| Producción académica | `prod` | Stack `despliegue/compose.yml`, GHCR, TLS y volúmenes persistentes |

`prueba` y `prod` tienen claves diferentes y nombres Compose `msu-prueba`/`msu-prod`.
CI usa un proyecto efímero adicional `msu-recuperacion-PID`, sin publicar puertos.
Si se prueba el stack completo en la misma VM, hacerlo en una ventana acordada: dos
Caddy no pueden ocupar simultáneamente los mismos puertos 80/443. El costo previsto
corresponde a **una** VM de nube; desarrollo y las pruebas automatizadas corren localmente/en CI.

Para desarrollar, copiar `.env.example` como `.env` en la raíz y ejecutar:

```bash
docker compose up --build
```

App: `http://localhost:8081`, API: `http://localhost:8080/swagger-ui.html`.
Sin Docker: seguir el README raíz. El perfil `dev` conserva las cuentas de demostración
ya documentadas. Los perfiles de nube exigen las credenciales por entorno y fuerzan
la cookie de sesión `Secure`.

## 3. Crear la VM gratuita

1. Crear la cuenta OCI, identificar su **home region** y un compartimento.
2. Crear una API key desde el perfil OCI y configurar `~/.oci/config` en el equipo privado.
   Terraform usa ese archivo; la clave privada no entra al repositorio ni al estado como variable.
3. Crear una clave SSH dedicada para CD. La privada debe estar sin passphrase para la
   automatización y se guarda como Secret; la pública se coloca en `ssh_public_key`.
4. Copiar `despliegue/infra/terraform.tfvars.example` como `terraform.tfvars` y completar
   región, compartimento y clave **pública**. El archivo está ignorado por Git.
5. Ejecutar desde la raíz (los siguientes comandos de archivos usan Bash/Git Bash):

```bash
terraform -chdir=despliegue/infra init
terraform -chdir=despliegue/infra fmt -check
terraform -chdir=despliegue/infra validate
terraform -chdir=despliegue/infra plan -out=msu.tfplan
terraform -chdir=despliegue/infra apply msu.tfplan
terraform -chdir=despliegue/infra output
```

El plan crea VCN, gateway, ruta, subnet, reglas 22/80/443 y una VM A1. No crea
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
  --perfil prod --demo --salida /ruta/privada/produccion.env
```

`--demo` es útil para la entrega académica: crea las seis cuentas ficticias y sus
solicitudes. La contraseña inicial es **aleatoria**, queda en `DEMO_PASSWORD` y debe
comunicarse por un canal privado al equipo. Sin `--demo` no se crean esas cuentas.
En una base vacía, inicializar primero las cuentas y la política con la demo para
disponer de administrador; después cambiar las contraseñas desde el perfil y poner
`DATOS_DEMO=false`, `DATOS_DEMO_SOLICITUDES=false`. Cambiar solo `DEMO_PASSWORD` no
actualiza las cuentas que ya existen.

| Variable | Significado |
|---|---|
| `COMPOSE_PROJECT_NAME` | `msu-prod` o `msu-prueba`; determina los volúmenes independientes |
| `SPRING_PROFILES_ACTIVE` | `prod` o `prueba`; nunca `dev` en el stack de nube |
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

En GitHub crear el environment **`production`** y configurar:

| Tipo | Nombre | Valor |
|---|---|---|
| Secret de environment | `PRODUCTION_ENV` | Contenido completo del archivo generado |
| Secret de environment | `SSH_PRIVATE_KEY` | Clave privada dedicada al usuario `ubuntu` |
| Secret de environment | `SSH_KNOWN_HOSTS` | Entrada OpenSSH verificada para la IP/nombre de conexión |
| Variable del repositorio | `DEPLOY_HOST` | IP pública o nombre usado en SSH, sin protocolo |
| Variable del repositorio | `DEPLOY_USER` | `ubuntu` |
| Variable del repositorio | `PRODUCTION_URL` | `https://` + `APP_HOST` |
| Variable del repositorio | `CD_ENABLED` | `true` después de completar la configuración |

Obtener las entradas con `ssh-keyscan -H IP_PUBLICA` y comparar la huella con
`ssh-keygen -lf /etc/ssh/ssh_host_ed25519_key.pub` visto en la consola OCI/una sesión
ya verificada. No desactivar `StrictHostKeyChecking`. La clave usada en CD debe poder
abrirse sin interacción. Los Secrets se crean desde Settings → Environments o con `gh secret set`.

## 5. PR, protección de main y CD

Requiere que el propietario/administrador del repositorio ejecute, una vez autenticado:

```bash
gh auth login
gh api --method PUT repos/marcelop04/mesa-servicio-universitario/environments/production
gh api --method PUT repos/marcelop04/mesa-servicio-universitario/branches/main/protection \
  --input despliegue/github/proteccion-main.json
```

La protección exige PR, una aprobación, CI actualizado, historial lineal y los cuatro
checks cuyos nombres están en el JSON. También impide force-push y borrar `main`.
El equipo trabaja en ramas (`feat/david-despliegue` para este paquete) y hace squash
merge desde un PR. Primero ejecutar los nuevos checks en el PR para que GitHub los registre.

El flujo `.github/workflows/cd.yml` funciona cuando forme parte de `main`:

1. `CI` debe terminar con éxito **completo** para un push a `main` del mismo repositorio público.
   Incluye MySQL real y pérdida/restauración de datos/archivos, además de las suites existentes.
2. CD verifica que el SHA aprobado sigue siendo la punta de `main` y publica dos imágenes
   multi-arquitectura (`linux/amd64`, `linux/arm64`) en GHCR, con etiqueta `sha-COMMIT`.
3. Despliega por **digest**, no por `latest`. Un evento de PR no puede activar este CD.
4. Por SSH con host fijado, entrega los archivos en `/opt/msu/entregas/COMMIT`, sincroniza
   el Secret con permisos 600 e inicia sesión en GHCR con el token temporal de Actions.
5. Toma una copia consistente si ya existe MySQL, actualiza contenedores, espera salud
   y ejecuta el smoke HTTPS con validación de certificado, cookies, API y OpenAPI.
6. Actualiza `/opt/msu/actual`, instala el timer de respaldo y registra los digests y fecha
   en `/opt/msu/shared/ultimo-despliegue.txt`. Cierra la sesión de GHCR al terminar.

`CD_ENABLED=false` permite publicar sin intentar SSH. GHCR puede crear los paquetes como
privados inicialmente; el token temporal permite descargarlos. Para descarga anónima,
el propietario puede poner ambos paquetes como públicos en Packages. La etiqueta de
origen de las imágenes las vincula al repositorio para gestionar sus accesos desde GitHub.

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
