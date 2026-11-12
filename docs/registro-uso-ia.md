# Registro de uso de IA · fases III y IV

Este archivo registra el aporte C. Gabriel consolida el registro del equipo con los registros anteriores
conservados en documentos y avances. No sustituye una revisión humana ni atribuye a Marcelo acciones aún no realizadas.

## IA-C-01 · Seguridad y revisión de calidad

| Campo | Valor |
|---|---|
| Fecha | 11/11/2026 |
| Herramienta | OpenCode, asistente GPT-6.1 Sol (OpenAI) |
| Prompt / alcance | Implementar únicamente el paquete C de Marcelo conforme a la rúbrica y reparto; consultar decisiones críticas; explicar herramientas, cuentas, pruebas y dependencias del equipo |
| Decisiones consultadas | CodeQL en repo público; retirar secretos por defecto; limitador de una instancia 5/15 min; herramientas oficiales portátiles; migraciones de dependencias por hallazgos de seguridad |
| Resultado generado | Controles de seguridad backend/Nginx, configuración CI/SAST/SCA/DAST, pruebas negativas y regresión, scripts locales, checklist/revisión/guía e informe consolidado con pendientes |
| ¿Se utilizó? | Incorporado a esta copia local; no se hizo commit ni push. Su aceptación requiere revisión de Marcelo/equipo |
| Validación automática | Pruebas JUnit/Vitest, build y npm audit; comprobaciones de scripts. Detalles y resultados reales en `docs/seguridad/resultados-locales.md` |
| Limitaciones de la validación inicial | Sin prueba de despliegue HTTPS ni ZAP; CodeQL sin ejecutar en GitHub; consulta NVD falló sin API key; Docker aún no disponible entonces. Actualizaciones posteriores en IA-C-03 y resultados locales; no se inventaron resultados |
| Modificaciones tras revisar | Actualización de paquetes vulnerables aprobada; reglas 400/415; mensajes/logs sin secretos; sanitización de listas y arreglos; contadores concurrentes/acotados; compatibilidad de credenciales en recorridos |
| Responsable de revisión y entrega | Marcelo; revisión humana de código, asserts y resultados pendiente de registrar por él |

## Revisión humana a completar (Marcelo)

- [ ] Entendí la diferencia entre SAST, SCA y DAST y los límites de cada prueba.
- [ ] Revisé que la matriz de roles y los rechazos coincidan con la especificación.
- [ ] Revisé los cambios compartidos con sus responsables y probé el arranque de mi entorno.
- [ ] Ejecuté y revisé personalmente las pruebas, CI y hallazgos de escáneres.
- [ ] No incluí secretos, tokens ni información real en evidencias.
- [ ] Completé mi sección con fecha, resultados y validación antes de la entrega.

## IA-C-02 · Lanzador privado de Dependency-Check

| Campo | Valor |
|---|---|
| Fecha | 11/11/2026 |
| Herramienta | OpenCode, asistente GPT-6.1 Sol (OpenAI) |
| Prompt / problema | Marcelo pegó instrucciones dentro de la entrada oculta de Read-Host y solicitó automatizar la ejecución de NVD sin manipular comandos de secretos por separado |
| Resultado | `scripts/analizar-dependencias.ps1`, pruebas aisladas con Maven simulado e instrucciones simplificadas |
| Protección | Entrada oculta, rechazo de entradas vacías/código pegado, clave solo en entorno del proceso, restauración de entorno y ubicación; sin clave en argumentos o archivos |
| Validación | Cinco casos simulados aprobados: vacío, espacios, comando pegado, ejecución correcta y fallo de Maven; incluyendo avisos por stderr y comprobación de que no se imprimen claves ficticias |
| Corrección tras probar | Se verificó que stderr no se confunda con un fallo de Maven y que el código de salida nativo no quede oculto por una variable local |
| Límite | No se utilizó una clave real ni se consultó NVD en estas pruebas simuladas. Marcelo ejecutó después el análisis real; véase IA-C-03. Revisión humana pendiente |
| Responsable | Marcelo, con ejecución asistida; revisión humana pendiente |

## IA-C-03 · Correcciones tras el análisis Java real

| Campo | Valor |
|---|---|
| Fecha | 11/11/2026 (UTC−05; reportes JSON del 12/11 en UTC) |
| Herramienta | OpenCode, asistente GPT-6.1 Sol (OpenAI) |
| Prompt / alcance | Revisar el fallo de Dependency-Check antes de subir el aporte C a una rama; corregir hallazgos dentro del alcance y consultar cambios críticos |
| Evidencia de entrada | Marcelo ejecutó el lanzador privado y descargó NVD; análisis completado con hallazgos. Se conservaron HTML/JSON iniciales antes de repetir |
| Resultado | Parches Commons Lang, Jackson, Log4j, Connector/J, Tomcat y springdoc/Swagger; Boot 3.5/Java 17 conservados; prueba nueva de los recursos Swagger y documentación actualizada |
| Validación | 155 tests y empaquetado correctos; JDBC 26.10.0 conecta con MySQL 8.0.46 mediante consulta de solo lectura. Nuevo Dependency-Check con la misma base NVD recién descargada: 68 → 23 CVE distintos; 33 → 15 CVE con alguna puntuación ≥ 7; control sigue fallando |
| Límites / decisiones no tomadas | Sin migración mayor ni supresiones nuevas, sin cambiar CVSS/failOnError, sin tocar la tarea A4 de Emanuel, sin reconstruir Docker con este último POM, sin Git/push ni CI remoto |
| Pendiente humano | Revisar aplicabilidad por CVE o aprobar una migración coordinada, corregir A4 con su responsable y revisar los cambios antes del PR. [Evidencias y fuentes](seguridad/analisis-dependencias.md) |

## IA-C-04 · Preparación de rama y revisión previa a publicar

| Campo | Valor |
|---|---|
| Fecha | 12/11/2026 |
| Herramienta | OpenCode, asistente GPT-6.1 Sol (OpenAI) |
| Prompt / alcance (resumen) | Marcelo autoriza preparar/publicar su avance C en una rama propia, contrastar el main actual, evitar secretos/datos personales y respetar el reparto y los documentos del curso |
| Resultado generado | Traslado selectivo al clon `mesa-servicio-marcelo`, rama `feat/marcelo-seguridad`; corrección del enlace del repositorio; trazabilidad C1–C6, preparación de commit/PR y documentación de límites |
| ¿Se utilizó? | Incorporado a la rama local; publicación remota pendiente de autenticación GitHub |
| Validación | Base Git coincidente sin archivos faltantes; 155 pruebas backend y empaquetado; 80 frontend, build y npm audit sin vulnerabilidades; 5 pruebas del lanzador; cabeceras HTTP y demo 401 × 5 → 429; Gitleaks del diff sin hallazgos y comparación privada con los secretos locales |
| Modificaciones tras revisar | Lista explícita de transferencia; exclusión de datos/compilados/reportes; identidad pública no-reply; documentación diferencia pruebas locales, SCA bloqueante, despliegue y evidencias remotas |
| Límites | No se resolvieron mediante supresión los 23 CVE de Spring; no hubo migración mayor, corrección de A4, cambios a main, infraestructura cloud ni resultados ZAP/CodeQL inventados. `nginx -t` no ejecutado por falta de CLI Docker |
| Responsable | Marcelo; revisión humana pendiente. La IA no firma por él ni sustituye su comprensión del aporte |
