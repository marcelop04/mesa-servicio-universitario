# Entrega de avance · Marcelo, paquete C

Corte de preparación: **12/11/2026**. No es una declaración de paquete terminado ni autorización de despliegue.
Documentos de referencia aportados por Marcelo: reparto de fases III–IV (11/11/2026) y propuesta del proyecto.
No se recibió una tabla de puntajes; esta trazabilidad no asigna una calificación ni inventa criterios.

## 1. Rama y aislamiento del aporte

- Repositorio: <https://github.com/marcelop04/mesa-servicio-universitario>.
- Rama de avance: `feat/marcelo-seguridad`, en el clon local `mesa-servicio-marcelo`.
- Base contrastada con `origin/main`: `87afec822a8dcfd6d50ac72c7ca6790125a5b233`.
- Se compararon los 413 archivos versionados de la base: ninguno faltaba en la copia de trabajo.
  Se identificaron 22 archivos modificados y 30 nuevos de C y se trasladaron mediante lista explícita.
  Este documento agrega la trazabilidad de publicación; los archivos de A ya presentes en la base no se
  atribuyen a Marcelo. No se borraron archivos ni se cambió la rama `main`.
- Estado remoto: **rama publicada correctamente**, commit de implementación `55732c8`.
  [Rama en GitHub](https://github.com/marcelop04/mesa-servicio-universitario/tree/feat/marcelo-seguridad).
  La documentación de estado se registra por separado; verificar el commit actual, PR y checks en GitHub.
  Un push correcto no demuestra que CI/CodeQL hayan terminado ni que sus hallazgos estén resueltos.

## 2. Correspondencia con el reparto y la propuesta

| Tarea C | Correspondencia con la propuesta | Aporte listo para revisión | Qué impide declarar cierre |
|---|---|---|---|
| C1 · OWASP y configuración | Fase III, seguridad: autorización, validación, secretos, entorno y prevención de hardcode (págs. 7–8) | Checklist; cookies/cabeceras; limitador; guard de despliegue; secretos externos; scripts y pruebas | HTTPS/certificado, flags y proxy reales con David; rotación de credenciales anteriores donde corresponda |
| C2 · SAST y SCA | Fase IV, SAST y pruebas de seguridad (pág. 8) | Workflows CodeQL y npm audit; perfil Dependency-Check y artifacts; actualizaciones verificadas | 23 CVE distintos de Spring, 15 con CVSS ≥ 7; decisión de tratamiento, CI/CodeQL y revisión de alertas remotas |
| C3 · DAST | Fase IV, DAST y pruebas de seguridad (pág. 8) | ZAP baseline manual con autorización, URL controlada y plantilla de hallazgos | B1: URL HTTPS autorizada; ejecutar, corregir y repetir. No existe resultado ZAP todavía |
| C4 · RNF01 | Fase III, autorización/roles y pruebas unitarias/integración (pág. 8) | Pruebas negativas de rol, propiedad/asignación, descargas y efectos laterales; no solo botones ocultos | Revisión humana y repetición al integrar cambios de endpoints/configuración del equipo |
| C5 · Revisión de calidad | Arquitectura, patrones, errores, hardcode y secretos (pág. 9) | Revisión documentada, sanitización de auditoría, errores seguros y riesgos abiertos | Aceptación humana; coordinar el defecto A4 con Emanuel, sin atribuir su implementación a C |
| C6 · Informe consolidado | Documentación, informe final y entrega (págs. 9–11) | Sección C escrita y borrador de integración con referencias y pendientes | Secciones/evidencias A/B/D/E, resultados finales, identificación de release y aprobación del equipo |
| Tareas de todos | Registro de IA y validación de lo generado (pág. 10 y reparto, apartado 6) | `docs/fase-iii-iv-marcelo.md`, registro IA-C y guion de demostración C | Marcelo debe revisar, entender y registrar su validación humana; no se firma por él |

## 3. Comprobaciones locales adicionales

- En el clon de la rama: **155 pruebas backend, 0 fallos/errores/omitidas y empaquetado correcto**;
  frontend **80 pruebas en 12 archivos**, build correcto y **npm audit: 0 vulnerabilidades**.
- Lanzador privado NVD: **5 casos simulados aprobados** en el clon, sin claves reales.
- Aplicación local ya levantada en `http://localhost:8081`: HTML y CSRF devolvieron 200; `/api/v1/me`
  sin sesión devolvió 401; se comprobaron CSP, antiframe, nosniff, Referrer-Policy y Permissions-Policy.
- Demo del limitador: **401 × 5 → 429**, `Retry-After: 900`, con cuenta inexistente de demostración.
  Produce registros de intentos rechazados, no crea ni bloquea la cuenta del administrador.
- Estas peticiones se realizaron sobre el Compose local anterior. No demuestran despliegue del nuevo POM,
  TLS real, cookies Secure sobre HTTPS ni ejecución de ZAP.
- No se ejecutó `nginx -t`: la CLI Docker no estaba disponible para el proceso de preparación.
- La regresión completa y el análisis de dependencias se registran en [resultados locales](resultados-locales.md)
  y [análisis Java](analisis-dependencias.md). Un build de pruebas correcto no convierte SCA en aprobado.

## 4. Condiciones antes de integrar a main

1. Revisar la rama publicada mediante un **PR borrador**, no hacer push directo a `main` ni force-push.
2. Revisar CI y CodeQL reales. Mantener `failOnError=true`, el límite CVSS ≥ 7 y el fallo ante npm alto/crítico.
   No ocultar hallazgos ni aprobar una migración mayor de Spring sin coordinación del equipo.
3. Resolver el tratamiento de los hallazgos bloqueantes y revisar cambios compartidos con sus responsables.
4. David configura la protección de `main` y el CD condicionado a los controles. El PR no sustituye esa protección.
5. C3 y C6 pueden seguir pendientes en una rama de avance, pero deben constar como tales y no presentarse
   como criterios ya satisfechos de una release final.

## 5. Revisión de privacidad y secretos del aporte

- **Gitleaks 8.30.1**, distribución oficial verificada con SHA-256, analizó el diff preparado: sin hallazgos,
  con redacción de secretos y sin reglas de supresión añadidas. El binario y su informe quedan fuera del commit.
  Se repitió sobre el commit de implementación (`origin/main..HEAD`, un commit): también sin hallazgos.
- Se comparó el contenido de los 53 archivos candidatos con los cuatro valores secretos del `.env` local,
  sin mostrarlos: ninguna coincidencia. No se copió `.env` al clon ni se extrajo el secret NVD de GitHub.
- Se revisaron rutas locales de usuario y correos en esos archivos. Se conservan únicamente direcciones
  ficticias `@msu.test` y el placeholder de formulario `nombre@unmsm.edu.pe`, no cuentas personales.
- La identidad del commit utiliza el usuario público GitHub y su dirección `users.noreply.github.com`,
  no el correo privado ni el nombre de usuario de Windows.
- Se excluyen `.env`, claves, reportes automáticos completos, compilados, dependencias, herramientas,
  capturas nuevas y datos de ejecución. Los documentos binarios y capturas históricos ya presentes en
  `main` no se modificaron ni se añadieron como aporte C.

Esta revisión comprende el aporte nuevo, no certifica el historial completo del equipo ni sustituye
la revisión humana. Ningún escáner garantiza ausencia absoluta de información sensible.
