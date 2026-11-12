# Fases III y IV · Marcelo (paquete C: seguridad y revisión de calidad)

Fecha: 11/11/2026. Alcance aprobado: CodeQL en repositorio público, secretos externos, limitador para
una instancia y actualización puntual de dependencias vulnerables. Base recibida: incluye HU15–19 y paquete A.

**No declarar el paquete entero terminado:** se implementaron controles y pruebas locales. Faltan
ejecuciones externas, revisión humana, configuración del despliegue y aportes finales del equipo.

| ID | Tarea | Estado comprobable | Evidencia |
|---|---|---|---|
| C1 | Checklist OWASP, Secure, CSP/HSTS, límite de login y hardcode | Código y pruebas backend implementados; verificar Nginx/HTTPS/IP real y rotaciones con David | [Checklist](seguridad/checklist-owasp.md); `SeguridadConfig`, `LimiteIntentosLogin`, `IpCliente`, `VerificadorSeguridad`, `.env.example`, generador y pruebas |
| C2 | SAST, npm audit y Dependency-Check en CI | NVD y análisis local completados. Parches Java reducen de 68 a 23 CVE distintos; control sigue fallando por Spring (15 CVE ≥ 7). Rama publicada; falta revisar ejecuciones CI/CodeQL y resolver los hallazgos | `.github/workflows/ci.yml`, `codeql.yml`, perfil Maven `seguridad`, `scripts/analizar-dependencias.ps1`; [evidencia y pendientes Java](seguridad/analisis-dependencias.md) |
| C3 | ZAP baseline y corregir hallazgos | Workflow/procedimiento listos, escaneo NO ejecutado; depende de B1 y URL autorizada | `.github/workflows/dast.yml`; [guía, apartado 7](seguridad/GUIA_MARCELO.md#7-c3-ejecutar-zap-cuando-david-entregue-el-despliegue) |
| C4 | Pruebas negativas por rol (RNF01) | Implementadas y ejecutadas con cadena real de seguridad | `AccesosPorRolTest` (34 casos), pruebas web/HTTPS/limitador y rutas React; [resultados](seguridad/resultados-locales.md) |
| C5 | Arquitectura, patrones, errores y secretos | Revisión asistida realizada, correcciones puntuales aplicadas; aceptación humana pendiente | [Revisión](seguridad/revision-arquitectura.md), sanitización de auditoría y pruebas de errores |
| C6 | Consolidar informe final | Borrador consolidado creado con tu sección y referencias existentes; falta entrega/revisión de secciones B/D/E y cierre de seguridad | [Informe consolidado](informe/Informe_Final_Fases_III_IV.md) |

## Cómo verificar / qué explicar

Seguir [GUIA_MARCELO.md](seguridad/GUIA_MARCELO.md): herramientas, pruebas sin MySQL, arranque local,
demo 429 sin bloquear al administrador, ajuste a 30 segundos, secretos GitHub, CodeQL, NVD y ZAP.
No necesitas SonarCloud ni una cuenta cloud propia para C.

## Cambios que tocan archivos compartidos

- Autenticación/configuración de David: limitador, tamaño de entrada, flags de cookies y secretos sin defaults.
  No se cambió el contrato de sesión JWT/CSRF ni se añadieron roles.
- CI de Alex: jobs SCA, artifacts y construcción condicionada. CD y protección de ramas siguen siendo B3.
- React: Router 7.18.5, Vite 6.4.6 y Vitest 5.1.0 por avisos reales de seguridad, con autorización de Marcelo.
  React sigue en 18; Node debe ser 22.12+ en la rama compatible utilizada por el equipo.
- Maven: parches de Commons Lang, Jackson, Log4j, Connector/J, Tomcat y springdoc/Swagger, conservando
  Boot 3.5.16/Java 17. 155 pruebas pasan; el control SCA sigue NO aprobado por los pendientes de Spring.
- Pantalla de login: no muestra contraseña fija; mantiene las cuentas locales de referencia solo en desarrollo.
- Auditoría de Emanuel: sanitización recursiva de colecciones, conservando sus registros y transacciones.
- Recorridos existentes: leen `DEMO_PASSWORD` del entorno; ya no asumen una contraseña fija.
- Documentación de arranque/manual: actualizada por el cambio de secretos y el nuevo bloqueo.

No se modificaron migraciones, reglas de solicitudes, despliegue cloud, observabilidad, Newman, k6 o backups.
No se reescribieron los DOCX históricos ni se borraron datos. La copia inicial llegó sin Git; el 12/11/2026
se preparó el aporte selectivamente en el clon y rama `feat/marcelo-seguridad`, sobre `origin/main`.
El commit de implementación `55732c8` fue publicado en GitHub; no se modificó `main`.
[Rama remota](https://github.com/marcelop04/mesa-servicio-universitario/tree/feat/marcelo-seguridad)
y [trazabilidad de la entrega](seguridad/entrega-avance-c.md). Consultar en GitHub el estado actual del PR y los checks.

## Pendientes para cerrar, en orden

1. Marcelo/equipo: revisar el código generado en la rama publicada y su PR; no integrar antes de resolver los controles bloqueantes.
2. Marcelo/equipo: decidir el tratamiento de los hallazgos Spring (migración mayor coordinada o revisión de
   aplicabilidad con evidencia por CVE). Marcelo ya informó que guardó `NVD_API_KEY`; ejecutar CI/CodeQL
   y conservar URLs/artifacts. Un análisis completado con hallazgos bloqueantes tampoco cuenta como aprobado.
3. David: entorno HTTPS de pruebas, configuración de secretos/cookies/HSTS/proxy y autorización de escaneo.
   Acordar bootstrap de administrador/política sin demo y condicionamiento de CD a los controles.
4. Marcelo: ZAP baseline real, análisis de hallazgos, corrección/reprueba y evidencia de release/fecha/alcance.
5. Gabriel: validar logs sin secretos; Alex: incorporar resultados al informe de pruebas.
6. Todos: enviar secciones verificadas; Marcelo consolida y solicita aprobación del informe antes de exportar/entregar.

## Guion breve de tu demostración

1. Mostrar checklist OWASP y explicar que ocultar botones no es autorización.
2. Ejecutar las pruebas negativas por rol: ajeno/técnico sin asignación/admin operativo → 403, sin cambios de datos.
3. Mostrar demo local del limitador: 401 × 5 → 429 + Retry-After, usando la cuenta ficticia de demostración.
4. Mostrar cabeceras y flags de cookies sin sus valores; explicar HTTP local frente a HTTPS desplegado.
5. Mostrar CI/CodeQL y artifacts **solo cuando ya existan ejecuciones reales**.
6. Mostrar ZAP y su reprueba **solo tras desplegar**; si falta, reconocer la dependencia B1.
7. Presentar tu sección del informe, riesgos residuales y revisión de uso de IA.

## Uso de IA

Registro en [docs/registro-uso-ia.md](registro-uso-ia.md). Se distingue ejecución automática de aprobación
humana; Marcelo debe revisar, entender y completar su validación antes de firmar la entrega.
