# C2 · Evidencias revisadas de CI y CodeQL

Revisión técnica asistida del **12/11/2026**. No sustituye la aceptación humana de Marcelo.
**C2 continúa abierto por los hallazgos de dependencias Java.** No se modificó ningún umbral,
no se suprimieron alertas y no se presenta este resultado como un pentest ni como una release aprobada.

## 1. Versión y ejecuciones comprobadas

- [PR #3, borrador](https://github.com/marcelop04/mesa-servicio-universitario/pull/3).
- Rama: `feat/marcelo-seguridad`; head analizado: `30bc5b2e144589dd1f8775b2039d8edd41ef9866`.
- Base: `87afec822a8dcfd6d50ac72c7ca6790125a5b233`.
- GitHub analizó la referencia `refs/pull/3/merge`, commit de integración de prueba
  `868dba181714783483859a1da60e232867bb5d31`. Ese commit no significa que el PR se haya integrado a main.
- [CI: ejecución 43161993750](https://github.com/marcelop04/mesa-servicio-universitario/actions/runs/43161993750).
- [CodeQL: ejecución 43161993806](https://github.com/marcelop04/mesa-servicio-universitario/actions/runs/43161993806).

Los datos siguientes corresponden a esa versión, no a commits futuros. Las ejecuciones posteriores
deben revisarse por separado; no se consideran aprobadas por heredar este documento.

## 2. Resultados remotos, no estimaciones

| Control | Evidencia examinada | Resultado |
|---|---|---|
| Backend | Registro del job `130995121503` | **155 pruebas; 0 fallos, 0 errores, 0 omitidas; BUILD SUCCESS** |
| Frontend | Registro y pasos del job `130995121727` | **80 pruebas en 12 archivos**; job de pruebas/build correcto |
| npm audit | Job `130995121673`; artifact `13917973201`, `npm-audit.json` | **0 vulnerabilidades** en todas las categorías, incluido desarrollo |
| CodeQL Java | Análisis `2149518047`, SARIF descargado y consulta de alertas de la referencia | **0 resultados**, sin error de análisis; 120 reglas según la API |
| CodeQL JavaScript/TypeScript | Análisis `2149514733`, SARIF descargado y consulta de alertas de la referencia | **0 resultados**, sin error de análisis; 103 reglas según la API |
| Dependency-Check | Job `130995122595`; artifact `13918327597`, HTML/JSON | Análisis completado, **NO aprobado**: 23 CVE distintos, 15 con CVSS ≥ 7, 0 suprimidos |
| Imágenes Docker | Estado del job `130996553671` | **Omitido**, porque depende de que pasen los controles anteriores; no es una compilación Docker fallida |

CodeQL usó la versión **2.27.4**, categorías `/language:java-kotlin` y `/language:javascript-typescript`,
con `security-extended` en el workflow. Se comprobó tanto el resultado de la API como `results: []` en
los dos SARIF. La consulta de alertas abiertas para `refs/pull/3/merge` devolvió una lista vacía, sin páginas
adicionales. Por tanto, no se encontraron alertas SAST que corregir en esa ejecución.

**Límite:** cero resultados significa que esas consultas no detectaron hallazgos en esa referencia.
No demuestra ausencia absoluta de vulnerabilidades ni reemplaza C3, la revisión de código o C4.

## 3. Dependency-Check y NVD

El reporte remoto usa Dependency-Check **13.0.0** y contiene 61 entradas analizadas:

- Fecha del reporte: `2026-11-12T05:35:51.814494400Z`.
- NVD comprobado: `2026-11-12T05:35:39Z`; última modificación: `2026-11-12T05:17:45Z`.
- Hallazgos: Framework 6.2.19 (**17 CVE**), Security 6.5.11 (**5**) y Data JPA 3.5.13 (**1**).
- El job falla al aplicar CVSS ≥ 7 a **15 CVE**. El error no es una clave NVD ausente o inválida.
- Los hallazgos coinciden con los [pendientes Java ya documentados](analisis-dependencias.md).
  No se clasifican automáticamente como explotables ni como falsos positivos.

No corresponde regenerar la clave, bajar el umbral, desactivar el job ni marcar C2 como terminado.
La revisión preliminar de aplicabilidad permanece preliminar: antes de cualquier excepción por CVE se
necesitan evidencia específica y aprobación. Una migración mayor o uso de parches de soporte empresarial
también requiere una decisión del equipo; no se presupone autorización ni disponibilidad de licencia.

## 4. Integridad y conservación sin secretos

Se descargaron los artifacts y SARIF a una carpeta local `reports/seguridad/c2-github-2026-11-12/`,
ignorada por Git. No se publican los reportes completos, claves, credenciales, rutas personales ni logs
completos. Este resumen conserva identificadores, resultados y hashes SHA-256 de los archivos:

| Archivo | SHA-256 |
|---|---|
| `codeql-java.sarif` | `F6D1EAC5837ABB9986986A20C646EFE6FED52E80790D4288340A26678966FF18` |
| `codeql-javascript.sarif` | `FB935FF8F5EBB139085DFC22B22A4F1366D94CA0BC83C67F69431BEE7720DB88` |
| `npm-audit.json` | `F38B5B604795EA3C50140B33B5E1A8C18217AA8540A9B509F5DF8F549FA4BBFB` |
| `dependency-check-report.json` | `972AC4E6B5013C744FFDA10B39F03558841214D3A877935952EBFBF06973EFB6` |
| `dependency-check-report.html` | `08E8F36F0264537C9358654E33CDC0C80B04EE0D7BAA01D038F917E8A86065A0` |

## 5. Información necesaria para continuar lo que está bloqueado

1. **Spring / C2:** acordar con los responsables del backend si se autoriza una migración mayor, se dispone
   de parches compatibles de soporte empresarial o se realizará una revisión de aplicabilidad por CVE
   con aprobación humana. No hacen falta claves por chat para tomar esa decisión.
2. **DAST / C3:** David debe proporcionar el origen HTTPS de pruebas, identificar la versión desplegada
   y confirmar autorización y alcance del escaneo. No se escanea una URL supuesta.
3. **Revisión / C4–C5:** Marcelo debe validar los asserts y decisiones del aporte; la IA no marca su
   aprobación humana como realizada. Los defectos de A se coordinan con Emanuel, no se implementan por C.
4. **Informe / C6:** recibir las secciones y evidencias de los responsables antes de cerrar el consolidado.
