# Sección de David · Nube, entrega continua y recuperación

## Diseño implementado

Se preparó una arquitectura de despliegue reproducible en Oracle Cloud Infrastructure
Always Free: una VM Ubuntu ARM ejecuta MySQL 8, Spring Boot, React/Nginx y Caddy mediante
Docker Compose. El dimensionamiento propuesto (2 OCPU, 12 GB RAM, disco de 50 GB) queda
dentro del cupo publicado de Always Free cuando está disponible en la cuenta. Caddy
gestiona certificados HTTPS y mantiene la SPA y API bajo el mismo origen, conservando
la sesión JWT/CSRF. Solo el proxy publica los puertos web.

Los ambientes se expresan mediante perfiles Spring (`dev`, `prueba`, `prod`; `test`
para JUnit) y variables externas. Los secretos de producción se generan aleatoriamente
y se entregan con GitHub Secrets; Terraform no los incorpora. Los volúmenes separan
MySQL, evidencias y certificados del ciclo de vida de los contenedores.

## RNF10 · Integración y despliegue continuos

El CI comprueba backend, frontend, imágenes, configuración e infraestructura y ejecuta
un ensayo de recuperación sobre MySQL real en un proyecto efímero. CD solo se activa
después de un CI completo exitoso sobre un push de `main` del mismo repositorio público.
Publica imágenes amd64/arm64 en GHCR y despliega por digest mediante SSH con host verificado.
La salud interna y un smoke HTTPS externo deben aprobarse antes de registrar la entrega
como verificada. La protección de `main` preparada exige PR, aprobación y checks vigentes.

## RNF11 · Copia y recuperación

La estrategia implementada pausa el backend para obtener un punto consistente entre
base de datos y evidencias. Cada copia conserva dump SQL, tar con permisos, referencias
de imagen y sumas SHA-256. Un timer permite copia diaria; cada despliegue existente
genera además una copia previa. Se requiere conservar una copia fuera de la VM.

El ensayo automatizado altera una fila y un archivo, verifica que una copia corrupta
no se acepte, restaura y compara SQL, hashes, permisos de escritura y salud. Una reversión
de imagen no revierte migraciones: para cambios incompatibles se utiliza la restauración.

## Validación y límites de las evidencias actuales

Se aprobaron localmente las 102 pruebas JUnit existentes, una prueba adicional del perfil
de producción detrás de proxy, seis pruebas de herramientas, validación de Compose/Caddy,
Terraform y análisis estático de scripts/workflows. Se compiló el frontend y se recorrieron
32 vistas locales de los cuatro roles a 360/1366 px sin desbordes ni errores 5xx.
Posteriormente se conectaron OCI y GitHub, se publicó el PR #4 y se inició el ensayo
RNF11 con MySQL real en CI. Terraform preparó la red en Bogotá, pero la creación de la
VM devolvió `Out of host capacity`, también confirmado por consultas de configuraciones
menores en los tres fault domains. La URL y el primer CD quedan bloqueados por capacidad
del proveedor. La cuenta de David tiene WRITE; los ajustes de environment/protección
requieren al administrador del repositorio. Las evidencias sanitizadas están en la bitácora.

El protocolo de usuarios prevé cinco participantes reales, SUS y revisión responsive a
360/1366 px. Los instrumentos y la automatización están preparados; las sesiones y
sus resultados permanecen pendientes. Completar esta sección con URL, enlaces CI/CD,
recuperación medida, resultados de responsive/SUS y defectos corregidos antes de la entrega.
