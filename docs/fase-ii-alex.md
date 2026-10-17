# Fase II · Parte de Alex (solicitudes y DevOps)

Estado al 17/10/2026. Cada tarea se compara con su criterio de «Terminado cuando» del plan de trabajo.

| ID | Tarea | Terminado cuando | Estado | Evidencia |
|---|---|---|---|---|
| AX01 | HU04 Registrar una solicitud con código MSU, prioridad inicial y plazos | Cumple BDD 1 y 2 de HU04 | Hecho | `POST /solicitudes`; `RegistroSolicitudServicio`, `GeneradorCodigo`, `V4__secuencia_codigo.sql`; `SolicitudesTest.hu04…` |
| AX02 | HU05 Listar solicitudes propias con filtros y paginación, y ver el detalle | Cumple BDD 1 y 2 de HU05 | Hecho | `GET /solicitudes` (código, estado, categoría, prioridad, fechas desde/hasta) y `GET /solicitudes/{id}`; `SolicitudesTest.hu05…`, `hu24Bdd1…` |
| AX03 | HU06 Comentarios y evidencias: subida de imágenes y descarga protegida | Cumple BDD 1 y 2 de HU06 | Hecho | `AportesServicio`, `AportesControlador`; `SolicitudesTest.hu06…`, `evidenciaValida…` |
| AX04 | Pantallas P04 Nueva solicitud y P05 Mis solicitudes | Registran y listan contra la API real | Hecho | `frontend/src/paginas/solicitudes/NuevaSolicitud.jsx`, `MisSolicitudes.jsx` |
| AX05 | Componente de detalle reutilizable (base de P06 y P08) | Se reutiliza sin copiar código | Hecho | `DetalleSolicitud.jsx` (prop `acciones`); P06 en `DetallePagina.jsx` |
| AX06 | Guardar los filtros de P05 en LocalStorage | Al volver a la pantalla se conservan los filtros | Hecho | clave `msu.misSolicitudes.filtros`; `solicitudes.test.jsx` |
| AX07 | Docker Compose con MySQL, backend y frontend | Cualquier integrante levanta todo con un solo comando | Hecho | `docker-compose.yml`, `backend/Dockerfile`, `frontend/Dockerfile`, `frontend/nginx.conf` |
| AX08 | Pipeline en GitHub Actions | Un PR con pruebas fallidas queda en rojo | Hecho (se activa al subir a GitHub) | `.github/workflows/ci.yml` |
| AX09 | README con instalación y ejecución | Un compañero lo sigue sin ayuda | Hecho | `README.md` |

## Reglas implementadas

- **Código MSU-AAAA-NNNN:** correlativo por año de Lima; la fila del año en `secuencia_codigo` se bloquea
  durante el registro para que dos altas simultáneas no repitan número.
- **Registro (HU04):** el solicitante, la fecha, la prioridad (tabla 5) y los límites (política vigente)
  los fija el servidor. Descripción de 20 a 2000 caracteres y referencia de hasta 200, recortando espacios.
  Un error de campo no deja registros (una transacción). Los supervisores reciben un aviso.
- **Listado (HU05):** el servidor solo devuelve solicitudes propias; tamaño 20 por defecto y máximo 100.
  Las fechas `desde` y `hasta` se interpretan en America/Lima e incluyen el día final.
- **Comentarios (HU06):** de 1 a 1000 caracteres, sin edición ni borrado, solo en casos no cerrados ni
  cancelados. Avisan a los demás participantes, no al autor.
- **Evidencias (HU06):** hasta 3 por solicitud, JPEG o PNG reales (se revisa la firma del archivo, no la
  extensión), máximo 5 MB (413), tipo no admitido (415). Se guardan fuera de la carpeta pública con un
  nombre aleatorio; la respuesta nunca incluye la ruta. La descarga revalida el acceso en cada petición.
  Si la transacción falla, el archivo escrito se elimina.

## Para los demás integrantes

- **P08 (atención técnica):** reutilice `<DetalleSolicitud id={…} acciones={(s, recargar) => …} />`.
- **P06 (conformidad):** agregue los botones de confirmar o reabrir con la misma prop `acciones`.
- **Cliente de API:** `api.subir(ruta, { archivo })` envía multipart con el token CSRF.
