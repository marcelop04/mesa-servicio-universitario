# Guía de Marcelo · Seguridad y revisión de calidad (paquete C)

Esta guía corresponde a las fases III y IV, no sustituye el despliegue de David ni las pruebas de Alex.
Consulta el [estado real y evidencias](../fase-iii-iv-marcelo.md) antes de presentar algo como terminado.

**Después de incorporar B:** consulta [integracion-main-b.md](integracion-main-b.md).
`prod` ahora rechaza ambas siembras demo; un `.env` antiguo con demo activada no debe desplegarse sin
revisión de David. Para demostraciones controladas existe `prueba`; no se borran cuentas ni volúmenes.
Los defaults de claves en `dev` ya no existen: prepara el entorno privado antes de arrancar.

## 1. Qué significa cada tecnología y qué cuenta necesitas

| Término | Qué hace aquí | ¿Necesitas cuenta? |
|---|---|---|
| OWASP Top 10 | Lista de riesgos para revisar el diseño, código y configuración | No |
| SAST / CodeQL | Busca errores de seguridad en Java y JavaScript sin atacar una aplicación publicada | Tu cuenta de GitHub y permiso sobre el repositorio público; no SonarCloud |
| `npm audit` | Contrasta las versiones de librerías JavaScript con avisos de vulnerabilidades | No |
| OWASP Dependency-Check | Contrasta dependencias Java con vulnerabilidades de NVD | Solicitar una clave API gratuita con un correo propio; no compartirla |
| NVD / CVE / CVSS | Base de vulnerabilidades / identificador de una vulnerabilidad / puntuación de gravedad | La clave de NVD facilita la consulta automatizada |
| DAST / ZAP baseline | Visita el sitio en ejecución y analiza pasivamente sus respuestas | No cuenta de ZAP; sí URL desplegada y autorización del equipo |
| CI / GitHub Actions | Ejecuta pruebas y análisis cuando se sube código o se abre un PR | GitHub; los workflows deben estar habilitados |
| CSP | Restringe desde dónde se cargan scripts, estilos e imágenes en el navegador | No |
| HSTS | Indica al navegador que use HTTPS en futuras visitas | No; requiere HTTPS real |
| Cookie Secure / HttpOnly / SameSite | Impide enviar la cookie por HTTP / leer el JWT desde JS / reduce envíos entre sitios | No |

No debes crear servicios cloud ni pagar una plataforma para tu parte. La plataforma y el HTTPS son B1 (David).
Baseline no equivale a una auditoría completa: no inicia sesión ni verifica todas las pantallas de una SPA.
Las pruebas autenticadas por rol complementan el escaneo, pero no lo reemplazan.

## 2. Herramientas y pruebas que puedes ejecutar ahora, sin nube ni MySQL

Se prepararon herramientas **portátiles**, no instalaciones globales:

- Temurin JDK **17.0.21+9**, descargado desde la API oficial de Eclipse Adoptium y verificado con SHA-256.
- Node **22.23.5**, descargado de `nodejs.org` y verificado con su `SHASUMS256.txt` oficial.
- Ubicación en esta máquina: `%LOCALAPPDATA%\Temp\opencode\msu-herramientas`.
- Maven lo descarga el wrapper del proyecto (`backend\mvnw.cmd`) desde Maven Central.

Los temporales pueden borrarse. Para instalaciones permanentes, usa únicamente
[Adoptium](https://adoptium.net/temurin/releases/?version=17) y [Node.js](https://nodejs.org/).
Se requiere **Node 22.12+ compatible con Vitest 5**; se recomienda la rama 22 usada por el CI y Docker.

En PowerShell, situado en la **raíz** del proyecto:

```powershell
# Si Windows bloquea los .ps1: solo para esta ventana, no cambia la política global.
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
. .\scripts\activar-herramientas.ps1

Push-Location backend
.\mvnw.cmd test
Pop-Location

Push-Location frontend
npm.cmd ci
npm.cmd test
npm.cmd run build
npm.cmd audit --audit-level=high
Pop-Location
```

Esperado: `BUILD SUCCESS`, pruebas aprobadas, compilación de Vite y auditoría sin hallazgos con el lockfile
actual. El backend usa H2 en memoria **solo para pruebas**, con las migraciones reales: no toca tu MySQL.
No hace falta `.env` para `mvnw.cmd test`; la clave y las cuentas ficticias están aisladas en `src/test`.

Para mostrar solo tus pruebas backend:

```powershell
Push-Location backend
.\mvnw.cmd '-Dtest=AccesosPorRolTest,SeguridadWebTest,CookiesHttpsTest,LimiteIntentosLoginTest,AuditoriaSanitizacionTest' test
Pop-Location
```

Los reportes están en `backend/target/surefire-reports`. Las pruebas de rol usan cookies JWT reales,
CSRF y los servicios: no se limitan a ocultar botones. Incluyen permisos administrativos, supervisor,
casos ajenos, técnico sin asignación, descargas y avisos privados, comprobando que no se modifican datos.

## 3. Ver la aplicación completa en el navegador

Necesitas [Docker Desktop para Windows](https://docs.docker.com/desktop/setup/install/windows-install/),
con motor Linux/WSL2 funcionando. Marcelo lo instaló y completó el arranque local posteriormente.
En otro equipo, instalarlo puede requerir privilegios, virtualización/WSL y reinicio; no es necesario
para las pruebas del apartado 2.

### Si nunca levantaste una base de este proyecto

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
.\scripts\preparar-entorno.ps1
docker compose up --build
```

El generador crea `.env` con contraseñas aleatorias y una clave JWT nueva. No sobrescribe archivos.
Abre `.env` **solo en tu editor privado** para ver `DEMO_PASSWORD`, que es la contraseña de las cuentas
ficticias **creadas por primera vez**. Nunca muestres ese archivo en la exposición ni lo subas a GitHub.

Abre <http://localhost:8081>. Correos: `solicitante@msu.test`, `supervisor@msu.test`,
`tecnico.soporte@msu.test` y `admin@msu.test`. Swagger: <http://localhost:8080/swagger-ui.html>.
No hay una pantalla nueva llamada «seguridad»: tu trabajo se observa en las respuestas, accesos y análisis.

### Si ya tenías una base o volúmenes de Docker

**No generes contraseñas nuevas a ciegas ni borres los volúmenes.** Copia `.env.example` a `.env` si no existe
y configura las credenciales **actuales** de MySQL. Genera una clave JWT privada de 32 bytes o más.
Cambiar `DB_PASSWORD` en `.env` no cambia la contraseña guardada en MySQL. Cambiar `DEMO_PASSWORD` tampoco
cambia cuentas existentes. Para rotarlas, coordina con David y usa el cambio de contraseña de las cuentas.
Cambiar `JWT_SECRET` invalida las sesiones anteriores. `DATOS_DEMO=false` evita nuevas cuentas ficticias;
no borra las ya creadas. Nunca uses `docker compose down -v` para «arreglar» un problema: elimina datos.

### Desarrollo sin Docker completo

Con MySQL ya disponible, exporta `.env` al proceso (Spring no lo lee por sí solo):

```powershell
. .\scripts\activar-herramientas.ps1
. .\scripts\cargar-entorno.ps1
# Si MySQL es el servicio de Compose en 3307, ajustar DB_URL a ese puerto.
Push-Location backend
.\mvnw.cmd spring-boot:run
```

En otra ventana: activa herramientas, entra en `frontend` y ejecuta `npm.cmd run dev`.
Vite en 5173 es un servidor de desarrollo: **las cabeceras del HTML de producción se prueban en Nginx**,
no en Vite. Usa el apartado 2 si aún no tienes MySQL.

## 4. Demostración del bloqueo sin perder la exposición

Con la aplicación local levantada, desde otra ventana en la raíz:

```powershell
. .\scripts\activar-herramientas.ps1
node scripts/demostrar-limite-login.mjs
```

Esperado: cinco `401`, luego `429`, código `DEMASIADOS_INTENTOS` y `Retry-After` cercano a 900 segundos.
Usa `demostracion-limite@msu.test`, una cuenta inexistente: no bloquea el acceso de `admin@msu.test`.
No crees una cuenta real con ese correo. El script solo admite HTTP en localhost y no imprime secretos.

Con los valores habituales:

- Cuenta normalizada + IP: **5 fallos** dentro de 15 minutos. El quinto fallo inicia un bloqueo de
  **15 minutos desde ese fallo**; el siguiente intento responde 429 aunque la contraseña sea correcta.
- IP: **50 fallos**, aunque se cambie de correo. Un acceso válido reinicia los fallos de esa cuenta+IP,
  no los de la IP. Los intentos simultáneos reservan cupo antes de comprobar la contraseña.
- Un reintento durante el bloqueo no prolonga los 15 minutos. El tiempo restante se devuelve en segundos.
- Los contadores están en la memoria de **una sola instancia** y tienen capacidad limitada.
  Reiniciar el backend los limpia; no es una defensa distribuida contra bots.

### Quitar la espera en local

**Opción rápida:** `docker compose restart backend`. No borra MySQL ni evidencias. Después inicia sesión
de nuevo si fuera necesario. Esto también permite repetir la demo de la cuenta ficticia.

**Opción de exposición:** cambia en `.env` `LOGIN_VENTANA=PT30S` y aplica:

```powershell
docker compose up -d --no-deps --force-recreate backend
```

Ahora el bloqueo dura 30 segundos. Al terminar, restaura `LOGIN_VENTANA=PT15M` y recrea el backend otra vez.
`restart` limpia contadores, pero **no aplica cambios del `.env`**; para eso se recrea el contenedor.
Para cambiar el número: `LOGIN_MAX_FALLOS`; el límite por IP es `LOGIN_MAX_FALLOS_IP` y no debe ser menor.
No cambies Java para hacer la demo, no desactives la protección en la nube y no agregues un endpoint de desbloqueo.

## 5. Comprobar cabeceras y cookies

```powershell
node scripts/comprobar-cabeceras.mjs http://localhost:8081
```

Revisa HTML, endpoint CSRF y respuesta 401. Debe confirmar CSP, antiframe, `nosniff`, política de referentes
y permisos. HSTS y Secure no se exigen en HTTP local; **sí se exigen en el despliegue HTTPS**.

En el navegador, F12 → Network → petición de login → Response Headers: `MSU_SESION` debe ser `HttpOnly`,
`SameSite=Lax` y, en la nube, `Secure`. En Application → Cookies, `XSRF-TOKEN` debe ser legible por la SPA
y también Secure en la nube. No copies ni publiques sus valores.

La CSP permite estilos inline porque React ya los utiliza; no permite JavaScript inline ni `eval`.
No habilites `includeSubDomains` o `preload` de HSTS sin revisar todo el dominio con David.

## 6. GitHub: activar C2 y conservar evidencias

La copia inicial llegó **sin `.git`**. Se preparó el aporte en el clon `mesa-servicio-marcelo`, rama
`feat/marcelo-seguridad`, sin copiar `.env`, dependencias, compilados ni herramientas portátiles.
Consulta el [registro de preparación y criterios de integración](entrega-avance-c.md).
La publicación remota requiere autenticación y debe verificarse: no asumir que un commit local ya está
en GitHub. No hacer push directo a `main` ni reemplazar avances posteriores de los compañeros.

1. En GitHub verifica que **Actions** esté habilitado. Los archivos `.github/workflows` deben subirse también.
2. Para CodeQL se preparó configuración avanzada en `codeql.yml`; no actives además el «default setup»
   para los mismos lenguajes. Si ya estaba activado, un administrador debe desactivarlo antes de usar este workflow.
3. Si todavía no tienes clave, solicita una gratuita en <https://nvd.nist.gov/developers/request-an-api-key>, con tu correo y el
   uso académico solicitado por el formulario. Confirma el correo según las instrucciones de NVD.
4. GitHub → **Settings → Secrets and variables → Actions → New repository secret**:
   nombre exacto `NVD_API_KEY`, valor: la clave privada. No la envíes por chat, commits o capturas.
5. Abre el PR o ejecuta **Actions → CI → Run workflow** una vez que el workflow esté en la rama principal.
6. Revisa **CI**: Backend, Frontend, npm audit, OWASP Dependency-Check e Imágenes Docker.
   Descarga los artifacts `npm-audit`, `dependency-check` y reportes de pruebas si hubo fallas.
7. Revisa **CodeQL** y **Security → Code scanning**: Java y JavaScript. Un job verde significa que analizó,
   **no** que no haya alertas. Revisa y corrige cada alerta; registra cualquier falso positivo con justificación.

El CI bloquea la construcción de imágenes si falla una prueba, hay avisos npm altos/críticos, hay un CVSS
de al menos 7 en Dependency-Check o el análisis no puede completarse. Sin clave de NVD falla explícitamente.
Los PR de forks no reciben secrets: requieren revisión y ejecución en una rama interna de confianza;
no uses `pull_request_target` para ejecutar código no confiable con secretos.

David debe configurar protección de `main`, exigir los checks y revisar los resultados de CodeQL antes de
publicar. **CodeQL es un workflow separado y no bloquea automáticamente el job Docker del CI ni el CD.**
Su integración con el CD y, si está disponible, las reglas de code scanning, pertenecen a B3.
No suprimas vulnerabilidades ni uses `continue-on-error` para obtener un verde artificial.

Dependency-Check local: usa el lanzador para evitar pegar comandos en la pregunta de la clave.
Desde la raiz del proyecto, ejecuta el comando **sin modificarlo ni sustituir ninguna parte por tu clave**:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\scripts\analizar-dependencias.ps1
```

Cuando aparezca **CLAVE NVD (...)**, pega **solo tu clave original** y presiona Enter. Los asteriscos
significan que estas introduciendo el secreto, no que PowerShell este listo para recibir otro comando.
El script activa las herramientas, comprueba errores comunes de entrada, ejecuta Maven y restaura el
entorno al terminar, sin escribir la clave en archivos ni mostrar su valor. Solo solicita la clave una vez.
El Bypass corresponde unicamente al proceso hijo: no cambia permanentemente la politica de Windows.

El secret de GitHub no se descarga automaticamente al equipo, ni es posible verlo de nuevo desde Settings.
Usa la clave que recibiste de NVD, nunca tu password de GitHub ni el texto de un comando.
Si escribiste la clave real como parte visible de un comando, puede quedar en el historial: por precaucion,
solicita su reemplazo en NVD y actualiza el secret `NVD_API_KEY`. No publiques tu historial ni la clave.

Primera descarga de NVD: puede tardar varios minutos. Informes: `backend/target/dependency-check-report.html`
y `backend/target/dependency-check-report.json`. **Estado actual:** Marcelo ya completó esa descarga;
el análisis terminó pero el control falla por hallazgos Spring, no por la clave. No repetir el registro NVD
para solucionar vulnerabilidades. Véanse [parches, comparación y decisión pendiente](analisis-dependencias.md).

## 7. C3: ejecutar ZAP cuando David entregue el despliegue

Pide a David **un origen HTTPS de pruebas**, con datos ficticios, que pertenezca al equipo y acepte la
prueba. Acordad fecha, alcance, restricciones del proveedor y una versión identificable. No probar terceros
ni asumir que está permitido escanear producción. Baseline no envía ataques activos, pero el spider sí hace peticiones.

1. David configura `COOKIE_SECURE=true`, `SEGURIDAD_DESPLIEGUE=true`, `DATOS_DEMO=false`, secretos privados
   y HTTPS real. El guardado de configuración rechaza arrancar si el modo despliegue usa cookies inseguras o demo.
2. El frontend y `/api` deben estar bajo **el mismo origen**, como en el proyecto actual. Si David propone
   dominios separados, primero acordar CORS, CSRF, CSP y cookies: no se agregó `Access-Control-Allow-Origin: *`.
3. Si HTTPS termina en un proxy cloud, ese proxy debe añadir HSTS en las respuestas HTTPS. El Nginx local
   recibe HTTP y no inventa HSTS confiando en cabeceras del cliente. No habilitar confianza indiscriminada
   en `X-Forwarded-*`. Para IP real, configurar `LOGIN_PROXIES_CONFIABLES` con los CIDR concretos y exigir
   que el proxy sobrescriba `X-Real-IP`; sin eso el límite por IP puede compartir el contador del proxy.
4. GitHub → **Settings → Environments → New environment**: `seguridad-dast`. Si es posible, exigir aprobación.
   Dentro, añadir variable **no secreta** `DAST_TARGET_URL` = origen HTTPS, sin rutas, usuario, query ni tokens.
5. Ejecuta `node scripts/comprobar-cabeceras.mjs https://<origen-autorizado>`.
6. **Actions → DAST (ZAP baseline autorizado) → Run workflow**, sobre la rama aprobada y confirmando autorización.
   No se dispara por PR ni acepta una URL arbitraria como input.
   El workflow exige además el SHA completo que David confirmó desplegado. No usar el SHA de herramientas
   o de la rama C si el servidor aún ejecuta otra versión. `alcance-dast.json` registra esa declaración,
   fecha, URL del run y referencia de herramientas; no comprueba por sí mismo la versión del servidor.
7. Descarga artifacts `zap-baseline` y `alcance-dast`. Revisa `report_html.html` y los formatos JSON/Markdown disponibles.
   El workflow falla ante alertas: no se agregaron reglas para ocultarlas. Si no genera artifact, revisa los logs;
   un fallo al ejecutar o descargar el escáner tampoco es un análisis aprobado.
8. Usa la [plantilla de hallazgos](plantilla-dast.md) para registrar regla, ruta, riesgo, evidencia sin secretos,
   decisión, responsable y repetición del análisis.
   Corrige código en C; si es TLS/proxy/configuración del proveedor, coordina con David. Repite hasta cerrar
   o justificar formalmente el riesgo: una advertencia no desaparece del informe por aceptarla.

No se ejecutó ZAP contra ningún dominio en esta intervención. No puede declararse C3 terminado hasta
adjuntar el escaneo real y su revisión. Tampoco se afirma cobertura autenticada/E2E de toda la SPA.

## 8. Qué debes pedir a cada compañero

| Compañero | Qué necesitas y qué NO se implementó en su lugar |
|---|---|
| Emanuel (A) | Su código ya está en esta copia. Pedir revisión de los ajustes de auditoría, manual y scripts que ahora leen `DEMO_PASSWORD`; repetir C4 si añade endpoints |
| David (B) | URL HTTPS de pruebas autorizada, modo despliegue y cookies, HSTS en el proxy, IP real confiable, secretos y permisos GitHub, main protegida y CD condicionado a seguridad. Definir bootstrap de administrador/política sin demo; actualmente los crea el inicializador demo |
| Gabriel (D) | Logs JSON y alertas sin cuerpos, cookies ni passwords; mantener correlación. Revisar con él que la sanitización no se pierda al añadir observabilidad |
| Alex (E) | Compartir reportes de seguridad para su informe de pruebas; adaptar sus E2E a `DEMO_PASSWORD` y Node 22.12+. Aportar resultados Newman, Playwright, k6 y revisión de pruebas IA |
| Todos | Su sección final, evidencia fechada, limitaciones y registro de IA; sin eso C6 es un borrador, no un informe final listo para entregar |

El [informe consolidado](../informe/Informe_Final_Fases_III_IV.md) contiene tu sección de seguridad y enlaces
a los documentos existentes, con pendientes explícitos. No se reescribieron los informes DOCX de las fases I y II.
