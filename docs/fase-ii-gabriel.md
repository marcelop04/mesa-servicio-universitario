# Fase II · Parte de Gabriel (arquitectura del frontend y administración)

Estado al 16/10/2026. Cada tarea se compara con su criterio de «Terminado cuando» del plan de trabajo.

| ID | Tarea | Terminado cuando | Estado | Evidencia |
|---|---|---|---|---|
| GB01 | Proyecto React con React Router, layout por rol y estilos según los mockups | Todas las pantallas comparten el mismo diseño | Hecho, con el diseño de Figma Make (`docs/diseno/figma-make`) | `frontend/src/layout/`, `frontend/src/estilos/`; capturas 02, 08, 09, 11 |
| GB02 | Componentes reutilizables: tabla, campo con error, etiqueta de estado y prioridad, paginación, mensajes y confirmación | Los demás los usan con props, sin duplicarlos | Hecho (falta que los demás los adopten) | `frontend/src/componentes/`; `componentes.test.jsx` |
| GB03 | Cliente de API con fetch: cookie, token CSRF y manejo de 401, 403 y 409 | Todas las pantallas llaman a la API a través de él | Hecho | `frontend/src/api/cliente.js`; `cliente.test.js` (10 pruebas) |
| GB04 | HU20 Administrar usuarios internos | Cumple BDD 1 y 2 de HU20 | Hecho | `AdminUsuariosTest` (9 pruebas); capturas 03 a 05 |
| GB05 | HU21 Catálogos con CRUD completo (DELETE como desactivación lógica) | Cumple BDD 1 y 2 de HU21 | Hecho | `AdminCatalogosTest` (9 pruebas); capturas 06 a 08 |
| GB06 | Pantallas P11 Usuarios y P12 Catálogos | El administrador gestiona usuarios y catálogos desde la interfaz | Hecho para catálogos; políticas (HU22) y auditoría (HU23) quedan para su responsable | `frontend/src/paginas/admin/` |
| GB07 | Datos iniciales: áreas, categorías, ubicaciones, política y una cuenta por rol | La demo funciona en una base recién creada | Hecho y verificado en MySQL 8.4 vacío | `V2__datos_iniciales_catalogos.sql`, `DatosIniciales.java` |
| GB08 | Diapositivas de la semana 10 | Cada integrante tiene su parte en la presentación | Borrador: parte de Gabriel completa; una diapositiva reservada por integrante | `docs/presentacion/Presentacion_Semana_10.pptx` |

## Verificación realizada

- Backend: `./mvnw test` → 23 pruebas, 0 fallas (H2 en modo MySQL con las migraciones reales).
- Frontend: `npm test` → 30 pruebas, 0 fallas. `npm run build` sin errores.
- Integración: backend contra **MySQL 8.4** recién creado (Flyway aplicó V1 y V2) y frontend en Vite;
  recorrido en Chromium con Playwright, 11 pasos aprobados: error genérico de login, cookie de sesión no
  legible desde JavaScript, validación por campo, alta de técnico, desactivación con confirmación,
  DELETE lógico de categoría y reactivación, conflicto por duplicado, estados fijos, 360 px sin
  desborde horizontal, cierre de sesión con 401 posterior y bloqueo de `/admin` para el supervisor.
- Capturas en `docs/evidencias/fase-ii-gabriel/`.

## Contrato JSON

Los campos usan `snake_case` (`area_id`, `id_correlacion`), igual que el diccionario de datos y la API
simulada del prototipo, para que React pase de una a otra sin cambiar contratos (sección 12.4).

## Dependencias con otros integrantes

- **David (DV01–DV04, DV07, DV08):** el backend ya tiene la estructura por capas, el manejador global de
  errores y la paginación; el inicio de sesión es **provisional** (sesión de servidor en cookie HttpOnly).
  DV04 lo cambia por JWT manteniendo el CSRF y las reglas de `SeguridadConfig`. El login de React es
  mínimo; la pantalla P02 definitiva es de DV07.
- **Marcelo (MR01):** las tablas de identidad y catálogos están en `V1`. Las de solicitudes empiezan en
  `V3`. `ConsultaSolicitudes` ya consulta la tabla `solicitud` para la carga de técnicos: al crearla,
  usar las columnas `tecnico_id`, `categoria_id` y `estado_codigo` del diccionario.
- **Alex (AX07):** usar `mysql:8.0` en Docker Compose; Flyway advierte que no probó oficialmente 8.4.
- **DELETE /notificaciones/{id}** (D07): queda documentado en el informe y funciona en la API simulada
  del prototipo; en Spring Boot se implementa junto con el módulo de notificaciones (HU16), que aún no
  tiene responsable en la fase II.
