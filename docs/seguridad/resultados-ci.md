# C2 · Evidencias revisadas de CI y CodeQL

Última revisión: **13/11/2026 (Lima; 14/11 UTC)**. No sustituye la aceptación humana de Marcelo.
**Estado actual:** los controles de main pasan con las excepciones de Spring incorporadas por PR #7.
CodeQL mantiene cinco alertas del prototipo, [analizadas aquí](alertas-codeql-main.md).
Los apartados 1–5 conservan el corte histórico del PR #3, no el estado actual.

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

## 6. Revalidación actual de main después de PR #7/#8/#9/#11

Commit: `c8d4e5c7c5acedf03ba7f029e3a1b934531b1ee8`.

| Control | Ejecución / artifact | Resultado comprobado |
|---|---|---|
| CI de push main | [43522856043](https://github.com/marcelop04/mesa-servicio-universitario/actions/runs/43522856043) | Backend, frontend, npm audit, Dependency-Check, configuración e imágenes: success |
| CodeQL Java/JS | [43522856218](https://github.com/marcelop04/mesa-servicio-universitario/actions/runs/43522856218) | Ambos success; **cinco alertas abiertas** en la consulta de main, no cero |
| Dependency-Check 13.0.0 | Artifact `14083412107`, HTML/JSON descargados | 61 entradas; **0 vulnerabilidades no suprimidas y 23 entradas suprimidas**. NVD comprobado `2026-11-13T22:53:21Z`, modificación `2026-11-13T16:00:06-05`. Conserva CVSS ≥ 7/failOnError y usa feeds NIST 2.0 |
| npm audit | Artifact `14082929311`, los dos JSON descargados | 0 en todas las gravedades para frontend y `docs/pruebas`, incluidas herramientas de desarrollo |
| CD del mismo SHA | [43523245472](https://github.com/marcelop04/mesa-servicio-universitario/actions/runs/43523245472) | Publicación y entrega HTTPS success; deployment `7778459482` exitoso a las `2026-11-13T22:57:44Z` |

SHA-256 de los JSON originales descargados:

| Archivo del artifact | SHA-256 |
|---|---|
| `dependency-check-report.json` | `4a4f16cb9a98bf9f63cad73600420b5c0646910066a57cb1c7ab5eef0e4f190f` |
| `frontend/npm-audit.json` | `f38b5b604795ea3c50140b33b5e1a8c18217aa8540a9b509f5df8f549fa4bbfb` |
| `docs/pruebas/npm-audit.json` | `6d31e957dc14f2847573c528dd4fdfd3b80883e8f4d401404880b25afa9bf1b6` |

Los originales quedan en `reports/seguridad/c-main/` (ignorado). Las supresiones no
son parches ni eliminan los 23 CVE; sus condiciones/caducidad siguen en
[`analisis-dependencias.md`](analisis-dependencias.md). Este PR no las amplía,
no baja umbrales y no certifica explotabilidad a partir del color del CI.
La revisión final de riesgos/clasificaciones sigue requiriendo al equipo.
