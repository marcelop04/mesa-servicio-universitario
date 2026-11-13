# Avance C sobre main con B · 12/11/2026

Referencias: reparto de fases III–IV del 11/11 y propuesta/rúbrica aportados por Marcelo.
**Solo paquete C. No es una release aprobada ni una declaración de C1–C6 terminados.**

## Base y límites

- Rama de trabajo/PR: `feat/marcelo-seguridad`, PR #3; avance anterior `c0c4c91`.
- Main recibido: `5e830512b5acc25dbcad80af3a9756b9be92c377` (B integrado).
- Se combinan ambos historiales sin reemplazar el trabajo A/B, ni incorporar los PR D/E.
- Se conservan CI/CD, recuperación RNF11, Terraform, perfiles, healthcheck Nginx y registros IA de David.
- No se modifica `main`, no se cambia la VM ni los Secrets, no se ejecuta CD/ZAP ni se borran datos.

## Cambios verificables de C

| Tarea | Avance de esta revisión | Límite que permanece |
|---|---|---|
| C1 | `.env.example` sin claves reutilizables y `dev` sin defaults DB/JWT/demo. `prod` activa el guard y rechaza cookies inseguras y las dos siembras demo | David debe revisar el entorno existente, rotar cuentas si corresponde y resolver la provisión segura sin demo |
| C1 | CSP/HSTS, antiframe, nosniff, Referrer/Permissions-Policy y no-store también en el borde Caddy. Se reemplazan headers del upstream para evitar duplicados. Se elimina Forwarded y se sobrescribe X-Real-IP | TLS local no acredita certificado, red, IP real ni release del servidor público |
| C2 | CI conserva npm audit/Dependency-Check junto con los checks B. Auditoría npm incluye ahora `docs/pruebas`. Compose usa credenciales efímeras en CI, no defaults publicados | Dependency-Check continúa bloqueando; CodeQL separado y su integración con CD requieren revisión B |
| C3 | Validador probado sin red, autorización explícita, origen controlado, SHA desplegado obligatorio y artifact de alcance separado | No se ha ejecutado ZAP; declarar un SHA no comprueba por sí mismo qué binario corre en el servidor |
| C4/C5 | Nuevas pruebas de perfiles reales y ampliación del rechazo 401/cookies detrás de proxy; se repiten las pruebas negativas de roles existentes | Revisión humana, nueva regresión al integrar D/E y validación de la release pública pendientes |
| C6 | Sección B del informe consolidado actualizada desde los documentos existentes, sin inventar SUS ni resultados finales | Faltan aportes/evidencias D/E y aprobación del equipo |

## Evidencias locales de esta revisión

- Backend: `mvnw.cmd -B verify`, **163 pruebas aprobadas**, 0 fallos/errores/omitidas y empaquetado correcto.
- Incluye **6 pruebas nuevas de perfiles**; verifican causa/mensaje del rechazo del guard y ausencia de defaults.
- Frontend: **80 pruebas en 12 archivos**, build correcto y `npm audit` con **0 vulnerabilidades**.
- `npm audit --prefix docs/pruebas`: **0 vulnerabilidades** con el lockfile incorporado por B.
- Herramientas Python: **4 pruebas C3** y **8 pruebas B** aprobadas. Las pruebas C3 no hacen tráfico de red.
- `caddy validate`: configuración válida; no se solicitaron certificados públicos.
- `actionlint 1.7.7`: workflows válidos; sin comprobadores externos ShellCheck/pyflakes en esta ejecución.
- Gitleaks 8.30.1 sobre líneas añadidas del diff contra main: **sin hallazgos**, sin supresiones.
  El diff completo señala dos valores anteriores en líneas eliminadas (`.env.example` y un fixture
  JWT de pruebas sustituido). No se introducen esos valores; la rotación donde se hayan usado
  sigue siendo una tarea operacional explícita, no se considera realizada por eliminarlos del código.
- Frontend Docker nuevo `msu-frontend:seguridad-c` construido; `nginx -t` aprobado.
- `python docs/pruebas/proxy-seguridad.py`: **8 comprobaciones** HTTP/HTTPS sobre Nginx y Caddy,
  cabeceras únicas en HTML, healthcheck, API ficticia y 401; rechaza IP/protocolo enviados por el cliente.
  Usa CA efímera local confiada solo por el proceso de prueba, upstream ficticio, puertos aleatorios en
  localhost y recursos Docker propios que se eliminan al terminar. No toca la aplicación ya levantada.

Los tests Java usan H2/fixtures; la prueba de proxy **no prueba el backend completo ni MySQL**.
Las ejecuciones CI/CodeQL anteriores no se atribuyen a este cambio: debe revisarse el nuevo run del PR.

## Dependency-Check: bloqueo conservado

Se repitió `mvnw.cmd -B -Pseguridad -DautoUpdate=false dependency-check:check` exclusivamente con
la base NVD local ya existente. **No fue una nueva consulta NVD** y no se leyó la clave de GitHub.

- Reporte: `2026-11-13T01:11:21.201778600Z` (12/11 en UTC−05).
- NVD local, última comprobación: `2026-11-11T22:48:07-05`.
- **23 CVE distintos, 15 bloqueantes, BUILD FAILURE por vulnerabilidades**, no por clave ausente.
- SHA-256 del JSON: `ab6c59ad670842afc6744bb3675fdef29d45980e070fc429bfb2b9db1ef03bfd`.
- Se conserva CVSS ≥ 7, `failOnError=true`, sin excepciones nuevas ni cambios de versiones Java.
- Consulta de metadatos públicos de Maven Central: últimas versiones estables de las ramas actuales,
  Boot 3.5.16, Framework 6.2.19, Security 6.5.11 y Data JPA 3.5.13; coinciden con las ya usadas.
  Esto no aprueba los CVE ni autoriza migrar a ramas mayores.

Los reportes completos quedan en `backend/target`, fuera de Git. CI mantiene la actualización normal
de NVD con el Secret existente. Decisión pendiente: migración coordinada, parches compatibles disponibles
o evaluación de aplicabilidad por CVE con evidencia/revisión humana. No se ocultan hallazgos.

## Lo que aún requiere información o trabajo del equipo

1. **Spring/C2:** acordar tratamiento de los CVE; no forzar Framework/Security mayores dentro de Boot 3.5.
2. **David/C1:** no desplegar un `.env` antiguo de `prod` con demo. Confirmar bootstrap/rotaciones,
   backend aislado, cabeceras del borde y origen/commit de pruebas. Los CIDR no se adivinan.
3. **David/C3:** confirmar autorización, ventana, alcance y SHA realmente desplegado. Solo después
   ejecutar ZAP, analizar/corregir y repetir sobre la misma release identificable.
4. **B3:** comprobar protección y condicionamiento de CD a seguridad, incluyendo resultados de CodeQL.
   El workflow CD y la configuración remota no se modifican en este avance C.
5. **A4:** corregido por Emanuel el 12/11/2026 con una prueba sin transacción previa; ver la [revisión](revision-arquitectura.md).
6. **D/E/C6:** recibir aportes aceptados y evidencias finales para consolidar sin declarar validaciones ajenas.

## Repetir las verificaciones

Activar Java 17 y Node 22.12+ según `GUIA_MARCELO.md`. Desde la raíz:

```powershell
Push-Location backend
.\mvnw.cmd -B verify
Pop-Location
Push-Location frontend
npm.cmd ci
npm.cmd test
npm.cmd run build
npm.cmd audit --audit-level=high
Pop-Location
npm.cmd audit --audit-level=high --prefix docs/pruebas
python -m unittest discover -s docs/pruebas -p "test_seguridad_*.py" -v
python -m unittest discover -s despliegue/tests -v
docker build -t msu-frontend:seguridad-c ./frontend
python docs/pruebas/proxy-seguridad.py
```

La prueba de proxy requiere Docker y descarga imágenes públicas si faltan; no inicia el Compose
de producción. Para NVD actualizado usar el lanzador privado existente; no pasar claves por argumentos.
