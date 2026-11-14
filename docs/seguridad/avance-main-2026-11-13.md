# Avance C sobre main desplegado · 13/11/2026 Lima (14/11 UTC)

Base: `c8d4e5c7c5acedf03ba7f029e3a1b934531b1ee8`. Rama nueva:
`feat/marcelo-seguridad-validacion`. El PR #3 está integrado; se conservan las
correcciones A/B y las excepciones C2 del PR #7. No se aceptan los PR D/E, no se
despliegan cambios ni se modifican secretos, cuentas, datos o reglas de GitHub.

## Qué se pudo avanzar ahora

1. **C1/C3:** comprobar HTTPS y cabeceras públicas; ejecutar el primer ZAP baseline
   real con autorización específica. [Alcance, reporte original y hallazgos](dast-2026-11-13.md).
2. **Correcciones verificables del escaneo:** CSP sin unsafe-inline CSS, hash exclusivo
   del estilo estático del logo de Swagger y COOP/COEP/CORP en Spring/Nginx/Caddy.
   Se evita duplicar cabeceras también en Swagger. No se relajan caché, JS ni CSRF
   para hacer desaparecer avisos. Las correcciones aún no están en el servidor público.
3. **C2:** descargar artifacts actuales y contrastar CI/CodeQL/CD del mismo SHA:
   npm 0 y Dependency-Check aprobado con 23 entradas suprimidas existentes. Triage
   individual de las cinco alertas CodeQL del prototipo, sin descartarlas o excluir fuentes.
4. **C4:** 16 casos nuevos, pasando de 34 a **50** en AccesosPorRolTest:
   tres intentos de autoescalamiento; seis lecturas anónimas; cuatro encuestas por
   actores distintos del dueño; dos logout CSRF inválidos y una escritura con JWT
   revocado. Las políticas denegadas usan payload válido y verifican filas/auditoría.
5. **C5/C6:** actualizar revisión, checklist, bitácora, riesgos y consolidado; retirar
   los bloqueos históricos A4/SCA que ya resolvieron los compañeros. Se conserva
   el borrador del informe y los aportes B, incluidos sus resultados SUS y límites.

## Validaciones reales de esta rama

| Validación | Resultado / alcance |
|---|---|
| `backend/mvnw.cmd -B verify` | **186 pruebas**, 0 fallos/errores/omitidas; empaquetado aprobado. Incluye 50 C4 y nueva regresión del hash frente al asset real de Swagger |
| Frontend `npm ci`, `npm test`, `npm run build` | **83 pruebas** en 13 archivos; build aprobado. No se alteran componentes ni contratos de UI |
| npm audit frontend y herramientas | 0 hallazgos; el artifact remoto examinado incluye desarrollo. El audit local frontend también devuelve 0 |
| Imagen frontend de esta rama | Construcción Docker aprobada; utilizada en pruebas de proxy/navegador, no publicada |
| Proxy Caddy/Nginx reales con upstream adverso ficticio | **12 comprobaciones** HTTP/HTTPS local: HTML, health, SUS, Swagger, CSRF y 401; políticas únicas, hash CSP y saneamiento de IP. CA efímera, sin nube/MySQL/cuentas |
| Python C | **11 pruebas** sin red: autorización/alcance y nuevo resumen ZAP; rechazan fallos técnicos, reportes incompletos y otro origen; no copian evidencia, query ni cabeceras |
| Python B conservado | **16 pruebas**, aprobadas; no se sustituyen sus datos de participantes ni sus herramientas |
| actionlint 1.7.7 | Workflow DAST válido; revisión con ShellCheck/Pyflakes externos desactivados, no se atribuye su ejecución |
| Gitleaks 8.30.1 | Escaneo redactado del árbol versionado/nuevo: **4 coincidencias**, no «0». Todas están en fixtures de pruebas, revisadas como se detalla abajo; sin reglas IGNORE nuevas |

La regresión de navegador local se conserva en `docs/pruebas/csp-local.py` y
`csp-navegador.mjs`, con su resultado en `evidencias/csp-navegador-local.json`.
**34 vistas a 360/1366 px, sin violaciones CSP ni errores JavaScript/5xx**, con
aislamiento de origen y un estilo ajeno al hash bloqueado. Se renderizaron las vistas
de los cuatro roles, Swagger y el formulario SUS, y se comprobaron menús de cuenta y
barras dinámicas. No se respondió ni descargó un cuestionario como participante.
No es una prueba pública, SUS ni cobertura BDD completa de E.

### Revisión de las cuatro coincidencias de secretos

| Archivo / línea del corte | Regla / comprobación |
|---|---|
| `backend/src/test/java/pe/edu/unmsm/msu/DespliegueHttpsTest.java:27` | generic-api-key: clave JWT explícitamente ficticia dentro de SpringBootTest con H2 y propiedades de prueba |
| `backend/src/test/java/pe/edu/unmsm/msu/IdentidadTest.java:49,64` | generic-api-key: contraseña literal del cuerpo de prueba de registro, ejecutado en el fixture H2 |
| `frontend/src/paginas/identidad/identidad.test.jsx:56` | generic-api-key: contraseña del mock/assert de registro, no configuración de ejecución |

No se publican sus valores ni se eliminan las pruebas para silenciar el escáner.
El resultado técnico fue salida 1 por esas cuatro coincidencias; su revisión es
asistida, no una firma humana. **No se inspeccionaron historial completo, ignorados,
GitHub Secrets ni secretos de la VM**: no permite certificar inventario/rotación ni
afirmar que ningún valor de prueba haya sido reutilizado alguna vez fuera de su alcance.

## Qué sigue faltando para terminar C

| Tarea | Cierre pendiente real |
|---|---|
| C1 | Integrar/desplegar eventualmente esta política, revalidar cabeceras y cookie JWT de la nueva release con cuenta autorizada; coordinar inventario/rotación de valores anteriores |
| C2 | Confirmación humana de supuestos/excepciones y tratamiento de las cinco alertas del mock; reanalizar al integrar D/E y antes de caducidad de Spring. La automatización actual ya pasa |
| C3 | Repetir ZAP **público** sobre el SHA corregido después del CD; confirmar resolución de 10055/90004 y revisar lo que permanezca. No se inventa una reprueba ni aceptación de riesgo |
| C4 | Revisión humana de los nuevos asserts y regresión cuando cambien permisos/endpoints; pruebas locales ampliadas ya ejecutadas |
| C5 | Aceptación humana y revisión de integración D (logs/Actuator) cuando llegue a main, sin implementar su paquete |
| C6 | Recibir/integrar secciones y evidencias finales D/E, revisión de A/B/C por sus responsables, registro IA consolidado por Gabriel y aprobación antes de exportar/entregar |

El CI de la base examinada y los resultados locales de esta rama están separados.
Los checks del nuevo PR se consultan en GitHub; no se hereda ni se inventa su resultado.
