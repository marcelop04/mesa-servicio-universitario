# Sección de David · Nube, entrega continua y recuperación

## Diseño implementado

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

## RNF10 · Integración y despliegue continuos

El CI comprueba backend, frontend, imágenes, configuración e infraestructura y ejecuta
un ensayo de recuperación sobre MySQL real en un proyecto efímero. CD solo se activa
después de un CI completo exitoso sobre un push de `main` del mismo repositorio público.
Publica imágenes amd64/arm64 en GHCR y despliega por digest mediante SSH con host verificado.
La salud interna y un smoke HTTPS deben aprobarse antes de registrar la entrega como
verificada. Se ejecutó además el bootstrap académico habilitado para el PR propio de
la rama autorizada: tras cuatro checks exitosos publicó imágenes amd64 en GHCR y las
entregó por digest a la VM. La protección existente de main exige revisión; incorporar
los checks y configurar el environment corresponde al propietario. La ruta CD main
queda habilitada para cuando se integre el PR.

## RNF11 · Copia y recuperación

La estrategia implementada y probada pausa el backend para obtener un punto consistente entre
base de datos y evidencias. Cada copia conserva dump SQL, tar con permisos, referencias
de imagen y sumas SHA-256. Un timer permite copia diaria; cada despliegue existente
genera además una copia previa. Se descargó una instantánea de la aplicación pública
a una carpeta privada del equipo del responsable y se verificaron sus cuatro SHA-256.

El ensayo automatizado altera una fila y un archivo, verifica que una copia corrupta
no se acepte, restaura y compara SQL, hashes, permisos de escritura y salud. Una reversión
de imagen no revierte migraciones: para cambios incompatibles se utiliza la restauración.

## Validación y límites de las evidencias actuales

Se aprobaron localmente las 102 pruebas JUnit existentes, una prueba adicional del perfil
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

El protocolo de usuarios prevé cinco participantes reales, SUS y revisión responsive a
360/1366 px. La revisión responsive sobre HTTPS ya está registrada. Las cinco sesiones
y sus puntuaciones SUS permanecen pendientes de participación real; incorporar esos
resultados antes del cierre. También quedan la revisión/integración del PR y los
ajustes administrativos de GitHub. Ver `docs/fase-iii-iv-david.md` y sus evidencias.
