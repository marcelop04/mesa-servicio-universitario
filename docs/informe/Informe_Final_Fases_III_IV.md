# Sistema Web para la Gestión Integral de Servicios Universitarios
## Informe consolidado · fases III y IV

**Estado: BORRADOR DE INTEGRACIÓN, no listo para entregar.** Corte C actualizado sobre main+B `5e83051`: 12/11/2026.
Responsable de consolidación: Marcelo. Equipo: Emanuel, David, Marcelo, Gabriel y Alex.
Los campos pendientes no son resultados: deben completarse con evidencia real y revisión del equipo.

## 1. Problema, objetivo y solución

La atención por correos, formularios y canales independientes puede perder solicitudes, duplicar trabajo
y dificultar el seguimiento de responsables y tiempos. El sistema centraliza registro, priorización,
asignación, atención, seguimiento e indicadores para solicitudes universitarias.

El objetivo es demostrar el ciclo de ingeniería de la rúbrica: especificar, diseñar, construir, integrar,
probar, asegurar, desplegar, monitorear y mejorar; no únicamente mostrar pantallas que funcionan.

Especificación, actores, RN, RF/RNF e historias detalladas se conservan en
[Informe Fase I v1.2](Informe_Fase_I_Mesa_de_Servicios_Universitarios_v1.2.docx).
La construcción y presentación parcial están en
[Informe Fase II v1.0](Informe_Fase_II_Mesa_de_Servicios_Universitarios_v1.0.docx).
Este documento consolida la evolución, sin reemplazar ni alterar esos informes históricos.

## 2. Arquitectura y decisiones

- React 18 con rutas por rol y cliente fetch centralizado; Nginx publica frontend y reenvía `/api` al mismo origen.
- Spring Boot 3.5 / Java 17, monolito modular por dominios y capas controlador–servicio–repositorio.
- MySQL 8, JPA/JDBC parametrizado, migraciones Flyway y control optimista de versión.
- JWT limitado en cookie HttpOnly, CSRF, BCrypt, revocación y comprobaciones de rol/propiedad/asignación.
- Archivos privados en volumen persistente, sin publicación directa ni enlaces que evadan permisos.
- Configuración sensible por variables de entorno; en local, `.env` privado generado sin defaults reutilizables.

La [revisión de arquitectura](../seguridad/revision-arquitectura.md) identifica prácticas presentes,
correcciones y limitaciones. No se afirma una arquitectura de microservicios ni infraestructura aún no creada.

## 3. Alcance de funcionalidades y APIs · Emanuel (A)

La base recibida contiene el avance funcional de fase II, HU15–19 y el paquete A. Evidencia documental:
[avance de Emanuel](../fase-iii-iv-emanuel.md).

- HU13: encuesta de satisfacción por el solicitante propietario, solo tras cierre, nota 1–5 y un único envío.
- HU22: políticas publicadas como versiones nuevas; validación de matriz, control de versión y conservación
  de la política aplicada a solicitudes existentes.
- HU23: auditoría administrativa y consulta restringida; no ofrece edición/borrado.
- HU02: limpieza periódica de revocaciones vencidas, manteniendo tokens vigentes revocados.
- OpenAPI y [panorama GraphQL/gRPC/webhooks/API Gateway](../api/panorama-apis.md).
- [Manual de usuario por rol](../manual/Manual_de_usuario.md).

**Pendiente A:** revisar esta síntesis, confirmar la revisión final de API/ejemplos y adjuntar evidencia de la
versión integrada. Los cambios C en auditoría, documentación y credenciales de recorridos requieren su revisión.
La tarea programada A4 conserva un defecto de transacción documentado en la revisión C5; sus pruebas
actuales no cubren ese camino de ejecución. Su corrección corresponde coordinarla con Emanuel.

## 4. Nube, ambientes y CI/CD · David (B)

Se incorpora el aporte B desde main `5e83051` sin atribuir su implementación a Marcelo.
Fuente: [sección de David](Seccion_David_Nube_CD.md), [bitácora](../fase-iii-iv-david.md) y
[manual técnico](../manual/Manual_tecnico.md). La revisión del responsable y el cierre operacional siguen pendientes.

| Evidencia requerida | Estado en esta consolidación |
|---|---|
| Plataforma elegida y justificación; frontend/backend/DB; origen HTTPS y release identificable | OCI E5 temporal; HTTPS y entrega demo documentados en B. Nueva release con C aún no desplegada |
| Perfiles dev/prueba/prod; secretos privados; cookies Secure, HSTS y proxy confiable | Perfiles integrados; controles C en código/pruebas locales. Validación del servidor actualizado pendiente |
| Main protegida, PR, publicación GHCR y CD bloqueado por pruebas/análisis fallidos (RNF10) | Workflows B incorporados; CD definitivo y bloqueo por CodeQL requieren evidencia/configuración de B |
| Copia y restauración de MySQL/evidencias probada (RNF11) | Ensayo CI con MySQL real documentado por B; recuperación en VM/copia externa pendientes |
| Pruebas de usuario, SUS y revisión 360/1366 px con datos reales de la sesión de prueba | Capturas responsive disponibles; cinco sesiones SUS y resultados reales pendientes |
| Manual técnico e instrucciones reproducibles de instalación/despliegue | Documento B incorporado; nota C sobre perfiles/secretos y transición sin demo |

Dependencias C: URL autorizada para DAST, bootstrap sin cuentas ficticias y controles del borde HTTPS.
No se eligió una plataforma ni se creó infraestructura por Marcelo.

## 5. Seguridad y revisión de calidad · Marcelo (C)

### 5.1 Criterios y controles

Se revisan RNF01 (identidad, rol y recurso por operación/descarga), RNF02 (hash/JWT/CSRF/secretos)
y la seguridad/calidad de fases III y IV mediante [checklist OWASP Top 10:2025](../seguridad/checklist-owasp.md).

Se implementaron:

1. CSP y cabeceras antiframe, tipo de contenido, referentes y permisos; HSTS condicionado a HTTPS.
2. Cookies JWT/CSRF alineadas con Secure/SameSite y guard de configuración de despliegue.
3. Limitador de login por cuenta+IP y por IP, con reservas concurrentes y almacenamiento acotado;
   429 y Retry-After. Parámetros de demo documentados sin endpoint de evasión.
4. Secretos de ejecución sin valores por defecto; generador local no destructivo y documentación de rotación.
5. Pruebas negativas de rutas, casos ajenos, técnico sin asignación, descarga, avisos privados y efectos laterales.
6. Sanitización de auditoría también en colecciones y manejo de errores sin exponer mensajes SQL/cadenas de causas.
7. Actualizaciones específicas por vulnerabilidades npm: Vite 6.4.6, Vitest 5.1.0 y Router 7.18.5;
   React 18 conservado. No se aplicó actualización forzada e indiscriminada.

### 5.2 SAST y análisis de dependencias

CodeQL se configura para Java y JavaScript con consultas `security-extended` en GitHub. npm audit y
OWASP Dependency-Check se incorporan al CI, con artifacts y fallo ante gravedad alta/crítica (npm) o
CVSS ≥ 7 (Java), sin ocultar fallas técnicas.

**Resultados reales/limitaciones:** npm audit posterior a las correcciones no reportó vulnerabilidades.
Marcelo completó la descarga NVD y Dependency-Check generó informes. Se aplicaron parches compatibles sin
migrar Boot 3.5/Java 17: los CVE distintos bajaron de 68 a 23; quedan 15 con CVSS ≥ 7 en Spring y el
control continúa fallando. La regresión y el empaquetado pasan con 155 pruebas. No existe análisis Java
aprobado todavía ni excepciones autorizadas; [evidencia y decisión pendiente](../seguridad/analisis-dependencias.md).
Se revisó la ejecución real de CodeQL del PR #3, head `30bc5b2` y referencia `refs/pull/3/merge`:
Java y JavaScript/TypeScript finalizaron sin errores, con **0 resultados en ambos SARIF** y sin alertas
abiertas para esa referencia. CI confirmó 155 pruebas backend, 80 frontend y npm audit 0; Dependency-Check
reprodujo los 23 CVE, 15 bloqueantes, con NVD consultado correctamente. [Evidencias, URLs y hashes](../seguridad/resultados-ci.md).
El resultado SAST no certifica ausencia absoluta de vulnerabilidades. David debe integrar los controles
con protección de ramas y CD; C2 no se cierra hasta resolver el tratamiento de los hallazgos Java.

### 5.3 DAST

Preparado workflow ZAP baseline manual con autorización, origen HTTPS configurado en un environment y
reportes; sin escaneos automáticos de URLs aportadas por PR ni ataques activos.

**Pendiente:** validar release con C en el ambiente HTTPS ya existente, autorización explícita, ejecución,
revisión de hallazgos, corrección y reprueba. Se exige SHA desplegado y se conserva el artifact de alcance.
No se presenta un
escaneo local de pruebas como resultado DAST de la aplicación publicada. Baseline no prueba toda la SPA
autenticada ni sustituye los casos RNF01.

### 5.4 Revisión y riesgos residuales

Se conservaron capas, DTO, inyección, repositorios, transiciones y reloj testeable. Se revisaron errores,
gestión de secretos y prácticas reales del código; no se añadieron patrones nominales sin uso.

Persisten límites explícitos: contadores de una instancia, confianza/configuración de proxies, provisión
segura de administrador/política sin demo, controles cloud, validación limitada de imágenes y ejecución de
escáneres externos. Detalle y responsables en la [revisión C5](../seguridad/revision-arquitectura.md).

## 6. Observabilidad · Gabriel (D)

**Pendiente de aporte y validación del responsable:** Actuator/Micrometer/Prometheus, logs JSON sin secretos
con correlación, OpenTelemetry y Jaeger/Tempo, Grafana, alertas demostrables, Compose de observabilidad
y simulacro de incidente RNF08. El filtro de correlación existente no acredita por sí solo estas tareas.

Adjuntar dashboards, consultas reproducibles, condiciones/umbrales de alerta y secuencia de diagnóstico
con petición, identificación y resolución, evitando incluir datos sensibles.

## 7. Pruebas funcionales, seguridad, carga y usuario · Alex (E) y David (B)

Resultados locales de seguridad y regresión disponibles en
[resultados-locales.md](../seguridad/resultados-locales.md). No equivalen a resultados de carga o nube.

**Pendiente E:** colección Newman en CI; E2E BDD por historia; k6 con 2000 casos/20 VU; p95 y criterios
RNF06, estrés hasta el límite con recursos medidos; revisión humana de pruebas asistidas por IA y
consolidación del informe de pruebas, incluyendo seguridad aportada por C y usuario aportado por B.

No rellenar percentiles, puntuaciones SUS, tasas de error o «cero vulnerabilidades» sin evidencia de la
versión y alcance correspondientes. Registrar ambiente, herramientas, fecha, tamaño de muestra y limitaciones.

## 8. Resultados y trazabilidad de la entrega

| Requisito / producto | Fuente actual | Cierre pendiente |
|---|---|---|
| HU y RN/RF detallados | Informes I/II y avances por integrante | Validación del equipo sobre release final |
| RNF01/RNF02 y calidad C | Checklist, código y pruebas C | Borde HTTPS, escáneres externos, aceptación humana |
| RNF06 rendimiento | Por aportar Alex | Mediciones k6 y análisis de estrés |
| RNF08 operación/observabilidad | Por aportar Gabriel | Simulacro y evidencias |
| RNF10 CI/CD | CI y workflows preparados | Ejecuciones y despliegue condicionado por David |
| RNF11 restauración | Ensayo CI y scripts B incorporados | Recuperación en VM/copia externa y revisión del responsable |
| Manual de usuario | Documento de Emanuel enlazado arriba | Revisión de la release |
| Manual técnico, repositorio y URL final | Aporte B incorporado | Release definitiva, permisos y validación del procedimiento |
| Informe de pruebas | Aportes de seguridad disponibles | Consolidación de Alex |
| Presentación/demo y registro IA | Aportes C disponibles | Consolidación de Gabriel y aportes de todos |

## 9. Uso responsable de IA y lecciones de seguridad

Registro nuevo de C: [uso de IA](../registro-uso-ia.md). Los registros anteriores permanecen en informes
y avances originales. Gabriel consolida el registro del equipo, sin afirmar validaciones humanas no realizadas.

Lecciones comprobadas: una aplicación funcional puede conservar dependencias vulnerables; un job que no
pudo consultar su base no es un análisis aprobado; HTTP local no verifica TLS; proteger rutas de React
no sustituye autorización del servidor; quitar un secreto del código no lo rota en un servidor o en Git.

**Pendiente de cada integrante:** resultados, dificultades y lecciones propias, revisión de sus pruebas
generadas por IA y aprobación explícita de su sección.

## 10. Lista para cerrar y entregar

- [ ] A/B/C/D/E revisaron sus secciones y aportaron `docs/fase-iii-iv-<nombre>.md`.
- [ ] Identificados commit/release, URL de pruebas y URL de demostración final.
- [ ] CI y CodeQL ejecutados, alertas revisadas y Dependency-Check con NVD actualizado.
- [ ] DAST autorizado, hallazgos/correcciones y reprueba adjuntos.
- [ ] Resultados Newman/E2E/k6/estrés/usuario y restauración adjuntos.
- [ ] Observabilidad y simulacro demostrados; manuales revisados.
- [ ] Registro de IA consolidado y validación humana registrada.
- [ ] Informe revisado sin secretos ni pendientes, exportado al formato acordado y subido al aula.

Hasta completar esta lista, no cambiar la portada de «borrador» a «informe final aprobado».
