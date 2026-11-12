# C · Resultados de validación local

Fecha: **11/11/2026**. Sistema: Windows, Java Temurin 17.0.21+9 y Node 22.23.5 portátiles.
Ejecutor: asistente de programación, por autorización de Marcelo. Revisión humana pendiente.
Alcance: copia local sin Git ni despliegue cloud. Docker Desktop fue instalado posteriormente por Marcelo,
quien completó el arranque local; las verificaciones de dependencias posteriores se distinguen más abajo.

## Resultados obtenidos (no estimaciones)

| Verificación | Resultado | Evidencia reproducible |
|---|---|---|
| Regresión inicial backend tras primeros controles | 102 pruebas, 0 fallos/errores | `.\mvnw.cmd test`, desde `backend` |
| Verificación backend y empaquetado antes de parches Java | **152 pruebas, 0 fallos, 0 errores, 0 omitidas; BUILD SUCCESS** | `.\mvnw.cmd verify`, desde `backend` |
| Verificación posterior a parches Java | **155 pruebas, 0 fallos, 0 errores, 0 omitidas; BUILD SUCCESS** | `.\mvnw.cmd -B verify`; XML/TXT actuales en `backend/target/surefire-reports`; incluye 3 casos de Swagger |
| Pruebas frontend tras actualizaciones | **80 aprobadas en 12 archivos** | `npm.cmd test` desde `frontend`, Vitest 5.1.0 |
| Compilación frontend | Correcta, 75 módulos transformados | `npm.cmd run build`, Vite 6.4.6 |
| Auditoría npm inicial | 6 paquetes afectados: 3 moderados, 1 alto, 2 críticos | `npm.cmd audit --json`, antes de actualizar |
| Auditoría npm final | **0 vulnerabilidades** (incluye desarrollo) | `npm.cmd audit --json`, `vulnerabilities: {}`, total 0 con lockfile actual |
| Generador `.env` en carpeta temporal aislada | Cuatro secretos aleatorios de 32 bytes; rehúsa sobrescribir; carga al proceso correcta; ningún secreto impreso | `scripts/preparar-entorno.ps1`, `cargar-entorno.ps1`; no se creó ni sobrescribió `.env` en la raíz real |
| Sintaxis de scripts PowerShell / Node | Correcta en comprobación estática | Parser PowerShell y `node --check` |
| Parseo YAML | Correcto para Compose, 3 workflows y 2 configuraciones Spring | SnakeYAML 2.5, parser local; no equivale a ejecutar GitHub Actions o Compose |
| OWASP Dependency-Check 13.0.0 | **Completado, NO aprobado por hallazgos**. Tras parches: 23 CVE distintos en 3 dependencias; 15 con CVSS ≥ 7 | [Comparación, versiones, hashes y pendientes](analisis-dependencias.md); HTML/JSON originales y posteriores conservados localmente |
| Nuevo Connector/J con MySQL local | Conexión y consulta de solo lectura correctas: driver 26.10.0, MySQL 8.0.46 | `SELECT VERSION(), 1`, conexión JDBC con credenciales privadas de `.env`, rollback y sin escrituras |

La sesión del agente se reinició después de las pruebas. El registro de Maven alcanzó el resumen de 152
pruebas y `BUILD SUCCESS`; no se repitieron esas pruebas ya terminadas por el estado de transporte «cancelado».
Los compilados/reportes son salidas locales ignoradas por Git, no sustituyen artifacts y URLs del CI del equipo.

La suite pasa, pero no cubre el fallo del camino programado de limpieza de sesiones observado en el arranque
local. Los tests de Emanuel heredan una transacción y llaman `limpiar()` directamente; no validan
`programado()` sin transacción previa. La corrección de A4 sigue pendiente de coordinación, sin cambios a su código.

## Cobertura nueva de seguridad backend (50 casos iniciales y 3 posteriores)

| Clase | Casos | Qué comprueba |
|---|---:|---|
| `AccesosPorRolTest` | 34 | Roles administrativos/supervisión, escrituras denegadas sin efectos laterales, IDOR de solicitante, admin sin privilegios operativos, técnico sin asignación y descarga, notificaciones privadas |
| `SeguridadWebTest` | 6 | 429 para cuenta real/inexistente incluso con password correcto; cabeceras/HSTS; cookie de sesión; JWT alterado; JSON inválido y tipo de contenido |
| `CookiesHttpsTest` | 1 | CSRF Secure pero legible, y borrado de cookie JWT Secure/HttpOnly con configuración HTTPS |
| `LimiteIntentosLoginTest` | 8 | Expiración exacta sin esperas reales, no prolongar bloqueo, aislamiento, éxito, límite de IP, cupos concurrentes, memoria acotada, proxy explícito y guard de despliegue |
| `AuditoriaSanitizacionTest` | 1 | Secretos eliminados de mapas, listas y arreglos de objetos |
| `SwaggerSeguridadTest` (posterior) | 3 | HTML y ambos bundles disponibles, DOMPurify 3.4.17 realmente servido tras actualizar el WebJar |

Las pruebas frontend añaden tres casos de rutas no administrativas y tres casos de login: sin contraseña
publicada, presentación del bloqueo sin reintento automático y navegación válida conservada.

## Correcciones de dependencias

| Paquete | Antes | Después |
|---|---|---|
| `vite` | 6.4.1 | 6.4.6 |
| `vitest` | 3.2.4 | 5.1.0 |
| `react-router-dom` | 6.30.6 | 7.18.5 |

Se actualizaron versiones por los hallazgos de npm audit, con autorización para los cambios mayores,
sin `npm audit fix --force`. Se regeneró el lockfile y se verificaron suite y build. React permanece 18.3.1.
Un resultado «0» es una fotografía de esa base de avisos y alcance, no una garantía permanente.

## Verificaciones que NO se hicieron

- Al corte de validación local no hay un resultado CodeQL revisado: la rama ya se publicó; registrar la ejecución real del PR y sus alertas antes de cerrar C2.
- Hay análisis Java completado con hallazgos; no hay aprobación de C2 ni decisión sobre los pendientes de Spring.
- Marcelo construyó/levantó los contenedores antes de los últimos parches Java. No se reconstruyeron con el nuevo POM ni se documentó una verificación integral de Nginx.
- No se verificaron certificado TLS, HSTS y cookies sobre una URL HTTPS real del equipo.
- No se ejecutaron ZAP, Newman, Playwright, k6, estrés, restauración o pruebas de usuario en esta intervención.
- Los scripts HTTP de demo/cabeceras están preparados; necesitan la aplicación levantada para la comprobación real.
- No se crearon cuentas, infraestructura cloud ni evidencias inventadas de los otros paquetes.

Pasos pendientes y comandos en [GUIA_MARCELO.md](GUIA_MARCELO.md). Actualizar este registro con URLs de CI,
release desplegada, versión de ZAP, hallazgos y reprueba cuando existan; no reemplazar pendientes por «aprobado».

## Validación posterior · lanzador privado de NVD

Se añadió `scripts/analizar-dependencias.ps1` tras el intento manual comunicado por Marcelo: se pegaron
instrucciones de PowerShell dentro de la entrada secreta y Maven no recibió una clave utilizable.
El lanzador solicita una única entrada oculta, rechaza errores comunes, ejecuta el perfil `seguridad`
y restaura la variable de entorno previa y la ubicación al finalizar.

Comprobación reproducible, **sin clave real y sin consultas externas**:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\docs\pruebas\comprobar-lanzador-nvd.ps1
```

Resultado: **5 casos aprobados**, con wrapper Maven simulado en una carpeta temporal aislada:

1. Entrada vacía: rechazada antes de invocar Maven.
2. Solo espacios: rechazados antes de invocar Maven.
3. Comando pegado por error: rechazado sin imprimir su contenido.
4. Clave ficticia y Maven con salida 0: se transmite la variable y se reconoce la ejecución correcta.
5. Clave ficticia y Maven con salida 7: se conserva el fallo, sin convertirlo en aprobado.

También se comprueban avisos por stderr, restauración de entorno/ubicación y ausencia de claves ficticias
en la salida. **Esto valida la automatización, no el análisis NVD real**. Posteriormente Marcelo ejecutó
el lanzador con éxito: descargó NVD, generó los reportes y el control falló por vulnerabilidades, no por
autenticación. Las correcciones y el segundo análisis están en [el registro C2](analisis-dependencias.md).

## Revalidación en la rama preparada · 12/11/2026

Se trasladó el aporte C al clon del repositorio público, rama `feat/marcelo-seguridad`, sobre la base
`87afec8`. En esa copia se ejecutaron nuevamente:

| Comprobación | Resultado |
|---|---|
| `mvnw.cmd -B verify` | **155 pruebas, 0 fallos/errores/omitidas; BUILD SUCCESS y JAR empaquetado** |
| `npm.cmd ci`, `npm.cmd test`, `npm.cmd run build` | **80 pruebas en 12 archivos y build correcto** |
| `npm.cmd audit --audit-level=high` | **0 vulnerabilidades** |
| Dependency-Check en el clon, misma caché NVD (`-DautoUpdate=false`) | **Completado, NO aprobado**: 23 CVE distintos, 15 con CVSS ≥ 7; sin supresiones |
| Lanzador NVD con fixture | **5 casos aprobados**, sin clave real |
| Cabeceras sobre el HTTP local ya levantado | `/` y CSRF 200, `/api/v1/me` 401; CSP/antiframe/nosniff/Referrer/Permissions correctos |
| Demo local de login con cuenta inexistente | **401 × 5 → 429; Retry-After 900 segundos** |
| Gitleaks sobre el diff preparado | **Sin hallazgos**, sin supresiones nuevas y salida redactada |

Las comprobaciones HTTP usan los contenedores que ya estaban levantados, no un despliegue nuevo del POM.
El intento adicional de `nginx -t` no se ejecutó porque la CLI Docker no estaba disponible en el proceso.
No se considera ese intento como una prueba aprobada ni se reinstaló/recreó Docker.
Posteriormente se publicó el commit de implementación `55732c8` en la rama remota
`feat/marcelo-seguridad`. Las ejecuciones remotas y su revisión siguen pendientes de registrar; no confundir
el push correcto con checks aprobados. [Alcance, privacidad y trazabilidad](entrega-avance-c.md).
