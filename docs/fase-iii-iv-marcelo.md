# Fases III y IV · Marcelo (paquete C: seguridad y revisión de calidad)

Inicio: 11/11/2026; corte actualizado el **13/11/2026 (Lima; 14/11 UTC)** sobre main
`c8d4e5c7c5acedf03ba7f029e3a1b934531b1ee8`. Alcance aprobado: CodeQL en repositorio público, secretos externos, limitador para
una instancia y actualización puntual de dependencias vulnerables. Base recibida: incluye HU15–19 y paquete A.

**Actualización tras B en main (12/11/2026):** se incorpora `5e83051` en la rama C,
conservando los aportes A/B y los controles de seguridad. No se integran los PR D/E ni se despliega.
Cambios, pruebas y límites en [integración C sobre main+B](seguridad/integracion-main-b.md).

**Actualización actual:** PR #3 integrado; PR #7 incorporó excepciones C2 y arregló A4;
PR #8/#9/#11 añadieron operación y evidencias B. CI/CodeQL/CD del main actual pasan.
Se ejecutó ZAP real con autorización específica y se preparan correcciones C1/C3 en una
rama nueva. No se fusiona ni despliega este avance, ni se incorporan los PR D/E.

**No declarar C completo:** la reprueba pública de las correcciones, decisiones residuales
de seguridad, revisión humana y aportes D/E al informe continúan pendientes.

| ID | Tarea | Estado comprobable | Evidencia |
|---|---|---|---|
| C1 | Checklist OWASP, Secure, CSP/HSTS, límite de login y hardcode | HTTPS/CSP/HSTS/CSRF Secure comprobados públicamente en main. Correcciones por ZAP: CSP sin unsafe-inline, hash limitado de Swagger y COOP/COEP/CORP. Falta desplegar/revalidar la nueva política y una sesión real de esa release | [Checklist](seguridad/checklist-owasp.md); [DAST y correcciones](seguridad/dast-2026-11-13.md) |
| C2 | SAST, npm audit y Dependency-Check en CI | CI main aprobado; artifacts descargados: npm 0, Java 0 no suprimidas/23 suprimidas. Cinco alertas CodeQL del prototipo analizadas, sin descartarlas. Se conservan las excepciones del PR #7 y sus riesgos/caducidad | [Resultados actuales y hashes](seguridad/resultados-ci.md); [triage CodeQL](seguridad/alertas-codeql-main.md) |
| C3 | ZAP baseline y corregir hallazgos | Baseline real sobre c8d4e5c: salida 2, un grupo medio, tres bajos y tres informativos. Correcciones en este PR; **reprueba pública pendiente de integración/CD**, no sustituida por pruebas locales | [Registro C3](seguridad/dast-2026-11-13.md); [reporte original](seguridad/evidencias/zap-c8d4e5c-inicial.json) |
| C4 | Pruebas negativas por rol (RNF01) | 50 casos en AccesosPorRolTest (antes 34): 16 nuevos, JWT/filtros/servicios reales y asserts sin cambios de datos. Fortalecidas denegaciones de publicación de políticas con payload válido | `AccesosPorRolTest`; [avance actual](seguridad/avance-main-2026-11-13.md) |
| C5 | Arquitectura, patrones, errores y secretos | Revisión actualizada con A4 corregido, CD real, hallazgos ZAP y riesgos de prototipo/logs. Sin rediseñar ni sustituir A/B/D/E; aceptación humana pendiente | [Revisión C5](seguridad/revision-arquitectura.md); [triage](seguridad/alertas-codeql-main.md) |
| C6 | Consolidar informe final | Informe actualizado con main actual, estado real C2/C3/C4 y referencias A/B; faltan secciones integradas D/E y aprobación del equipo | [Informe consolidado](informe/Informe_Final_Fases_III_IV.md) |

## Cómo verificar / qué explicar

Seguir [GUIA_MARCELO.md](seguridad/GUIA_MARCELO.md): herramientas, pruebas sin MySQL, arranque local,
demo 429 sin bloquear al administrador, ajuste a 30 segundos, secretos GitHub, CodeQL, NVD y ZAP.
No necesitas SonarCloud ni una cuenta cloud propia para C.

## Cambios que tocan archivos compartidos

El detalle siguiente conserva el historial del primer PR. El nuevo avance se limita
a políticas de seguridad, pruebas C, revisión de evidencias y consolidación documental;
no modifica las excepciones Java, CD, infraestructura ni datos desplegados.

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

El aporte inicial no modificó migraciones, reglas de solicitudes, despliegue cloud, observabilidad, Newman, k6 o backups.
Tras incorporar B se ajustan únicamente su configuración de seguridad de perfiles/proxy, la integración
del CI y las pruebas de esos controles; no se cambia Terraform, CD, backups, métricas, Newman ni k6.
No se reescribieron los DOCX históricos ni se borraron datos. La copia inicial llegó sin Git; el 12/11/2026
se preparó el aporte selectivamente en el clon y rama `feat/marcelo-seguridad`, sobre `origin/main`.
El commit de implementación `55732c8` fue publicado en GitHub; no se modificó `main`.
[Rama remota](https://github.com/marcelop04/mesa-servicio-universitario/tree/feat/marcelo-seguridad)
y [trazabilidad de la entrega](seguridad/entrega-avance-c.md). [PR #3, borrador](https://github.com/marcelop04/mesa-servicio-universitario/pull/3).
Las evidencias del head `30bc5b2` ya se revisaron; consultar en GitHub los checks de commits posteriores.

## Pendientes para cerrar, en orden

1. Marcelo/equipo: revisar este PR, sus asserts, CSP/hash y decisiones de riesgo. Validación
   automática no equivale a aprobación humana. Consultar CI/CodeQL de este nuevo head.
2. Tras su eventual integración, David/CD: desplegar el SHA aprobado y confirmar revisión
   de ambas imágenes. Este avance **no autoriza ni realiza** merge/despliegue por sí mismo.
3. Marcelo: con esa versión identificada y ventana autorizada, repetir cabeceras y ZAP público.
   Confirmar desaparición de 10055/90004; revisar los avisos restantes. Revalidar cookie de sesión
   con una cuenta de pruebas autorizada, sin publicar valores ni bloquear cuentas reales.
4. Equipo: confirmar el tratamiento de las cinco alertas del prototipo y los supuestos/riesgos
   de las excepciones Spring. No reabrir el antiguo fallo SCA como si PR #7 no existiera;
   revisar caducidad 31/01/2027 y repetir análisis al integrar nuevas dependencias.
5. Gabriel/Alex: entregar sus secciones y evidencias revisadas; preservar seguridad al integrar
   observabilidad y llevar los resultados C al informe de pruebas. No se implementa su paquete.
6. Todos: validar secciones y usos de IA; Marcelo consolida, solicita aprobación y solo entonces
   exporta/entrega el informe sin campos pendientes.

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
