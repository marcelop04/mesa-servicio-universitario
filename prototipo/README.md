# Prototipo de fase I · Mesa de Servicios Universitarios

Prototipo ejecutable del curso Taller de Construcción de Software Web (UNMSM). Recorre el registro y la consulta de solicitudes con HTML semántico, CSS con variables y media queries, y JavaScript moderno en módulos ES, **sin frameworks**, contra una **API simulada con json-server 0.17.4** que usa las rutas `/api/v1` y los nombres de campo de las secciones 9 y 10 del informe (sección 12, tabla 24).

Todos los nombres, correos y casos son ficticios. La sesión es simulada: no hay contraseñas reales y no equivale a la seguridad del backend de la fase II.

## Requisitos

- Node.js 18 o superior (probado con Node 22.23.1) y npm.
- Navegador moderno basado en Chromium o Firefox.
- Solo para las pruebas de extremo a extremo: Chromium de Playwright (`npx playwright install chromium` si no está en la caché).

## Anexo de ejecución (D14)

```bash
cd prototipo
npm install          # json-server 0.17.4, express y @playwright/test
npm start            # crea db.json desde db.seed.json si falta y levanta todo en el puerto 3001
```

Abre <http://localhost:3001/>, elige una cuenta de demostración y pulsa **Ingresar**.

| Script | Qué hace |
|---|---|
| `npm start` | Prepara `db.json` (si no existe) e inicia el servidor: interfaz estática + API simulada en `http://localhost:3001`. |
| `npm run api` | Igual que `npm start`. Se sirve todo desde un solo puerto para evitar CORS; no hace falta un servidor estático aparte en el 5500. |
| `npm run reset` | Copia `db.seed.json` sobre `db.json` (con el servidor apagado). Con el servidor encendido usa el botón **Restablecer datos**. |
| `npm test` | Pruebas unitarias del módulo de reglas y de la fórmula de indicadores (`node --test`), incluida PV09. |
| `npm run test:e2e` | Pruebas PV01–PV08 y complementarias con Playwright. Levanta su propio servidor en el puerto 3011 con una base temporal (`.tmp/db-e2e.json`), así que no altera los datos de la demostración. Las capturas se guardan en `docs/pruebas/capturas/`. |
| `npm run semilla` | Regenera `db.seed.json` con `scripts/generar-semilla.js` (usa el mismo módulo de reglas). |

Variables de entorno del servidor: `PUERTO` (3001), `DB_ARCHIVO` (`prototipo/db.json`) y `SILENCIOSO=1` (sin registro de peticiones).

`db.json` es la copia de trabajo que modifica json-server y está en `.gitignore`; la fuente versionada es `db.seed.json`.

## Cuentas de demostración

| Rol | Nombre | Correo | Uso en la demostración |
|---|---|---|---|
| Solicitante | Lucía Ramos Quispe (Estudiante) | lucia.ramos@demo.edu.pe | 7 solicitudes en todos los estados. |
| Solicitante | Jorge Mendoza Salas (Docente) | jorge.mendoza@demo.edu.pe | 3 solicitudes; sirve para comprobar que no ve las de Lucía. |
| Solicitante | Sofía León Aguirre (Administrativo) | sofia.leon@demo.edu.pe | Sin solicitudes: muestra la lista vacía. |
| Técnico | Carla Huamán Torres · Soporte informático | carla.huaman@demo.edu.pe | Asignaciones del área 1. |
| Técnico | Diego Salazar Núñez · Soporte informático | diego.salazar@demo.edu.pe | Sin carga; útil para asignar. |
| Técnico | Pedro Vargas Lino · Mantenimiento | pedro.vargas@demo.edu.pe | Área 2. |
| Técnico | Rosa Paredes Cano · Servicios generales | rosa.paredes@demo.edu.pe | Área 3. |
| Supervisor | Ana Castillo Vera | ana.castillo@demo.edu.pe | Bandeja, evaluación, prioridad y asignación. |
| Administrador | Luis Gutiérrez Pinto | luis.gutierrez@demo.edu.pe | Catálogos (baja lógica). |

Miguel Torres Ríos (técnico de Soporte informático) está **inactivo**: no aparece en el acceso ni se ofrece al asignar.

Datos iniciales: 3 áreas, 11 categorías (1 inactiva: «Impresoras y escáneres»), 9 ubicaciones (1 inactiva), política de plazos v1 (tabla 6) y 10 solicitudes `MSU-2026-0001` a `MSU-2026-0010` en los siete estados, con historial y avisos coherentes.

## Recorrido sugerido

1. **PR01** Entra como Lucía: la cabecera muestra nombre y rol, y el menú cambia según el rol.
2. **PR02/PR03** *Nueva solicitud*: elige impacto Medio y urgencia Alta y verás «Prioridad Alta» con 8 h y 48 h. Al registrar se muestran el código, el estado Registrada y las fechas límite en hora de Lima.
3. **PR04** *Mis solicitudes*: filtra por estado o categoría, pagina y abre el detalle.
4. **PR05** Cierra sesión y entra como Ana. Abre la nueva solicitud, pulsa **Iniciar evaluación**, cambia la prioridad con un motivo (los límites se recalculan desde el registro original) y asigna un técnico. Vuelve como Lucía para ver el efecto en el detalle.

## Cómo reproducir los errores de PR06

| Caso | Cómo reproducirlo | Qué se ve |
|---|---|---|
| Datos incompletos | En *Nueva solicitud*, deja la ubicación vacía y escribe una descripción de menos de 20 caracteres. | Un resumen de errores recibe el foco; cada error aparece junto a su campo (`aria-invalid`) y los datos válidos se conservan. El servidor también responde 400 con errores por campo. |
| Lista vacía | Entra como Sofía, o filtra *Resuelta* + *Mobiliario* con Lucía. | «Todavía no registraste solicitudes» o «No hay solicitudes que coincidan con los filtros», con una acción para continuar. |
| Falla de la API (simulada) | Marca **Simular falla de la API** en *Herramientas de demostración* y realiza cualquier acción. También funciona agregando `?simularFalla=1` a la URL de la página o el encabezado `X-Simular-Falla: 1` en la API. | La API responde 503 `SERVICIO_NO_DISPONIBLE` con el formato común. La interfaz muestra «La solicitud no se registró» (o «No se pudo cargar…») y el botón **Reintentar**; nunca afirma éxito y conserva el formulario. Desmarca la casilla y pulsa Reintentar. |
| Falla de la API (real) | Con la página abierta, detén el servidor (Ctrl+C) y pulsa **Actualizar** o **Registrar solicitud**. | «No se pudo conectar con la API simulada…» con Reintentar. Vuelve a ejecutar `npm start` y pulsa Reintentar. |
| Red lenta | Marca **Simular red lenta (2 s)**. | El botón de envío queda desactivado con el texto «Registrando…» mientras dura la petición. |

## API simulada

La base es `http://localhost:3001/api/v1`. La sesión simulada viaja en el encabezado `X-Usuario-Id` (id de la cuenta elegida). Todas las respuestas de error usan el formato común (sección 10.3):

```json
{ "codigo": "VALIDACION", "mensaje": "Revisa los datos marcados…", "errores": [{ "campo": "descripcion", "mensaje": "…" }], "id_correlacion": "…" }
```

Los listados devuelven `{ "items": [...], "pagina": 1, "tamaño": 20, "total": 7 }`. Parámetros: `pagina` y `tamaño` (también se acepta `tamano`; 20 por defecto y 100 como máximo). La interfaz pide 5 por página para que la paginación se vea con los datos de demostración.

| Método y ruta | Rol | Notas |
|---|---|---|
| `POST /auth/login` | Público | `{ correo }`; acceso simulado sin contraseña. 401 genérico si la cuenta no existe o está inactiva. |
| `POST /auth/logout` | Autenticado | 204. |
| `GET /me` | Autenticado | Perfil sin datos secretos. |
| `GET /catalogos?tipo=` | Autenticado | `areas`, `categorias`, `ubicaciones`, `estados`, `prioridades`, `impactos`, `urgencias`, `politica`; `tecnicos&area_id=` (solo supervisor, con `carga_pendiente`). Solo devuelve registros activos. |
| `POST /solicitudes` | Solicitante | 201. El servidor genera el código `MSU-AAAA-NNNN`, la prioridad, las fechas límite (UTC) y la matriz aplicada. 400 con errores por campo. |
| `GET /solicitudes` | Solicitante (propias), técnico (asignadas), supervisor (todas) | Filtros `estado`, `categoria_id`, `area_id`, `prioridad`, `codigo`; `orden` = `recientes`, `antiguedad`, `prioridad` o `vencimiento`. |
| `GET /solicitudes/{id}` | Propietario, técnico asignado o supervisor | 403 si es ajena; 404 si no existe. |
| `GET /solicitudes/{id}/historial` | Igual que el detalle | Eventos con `anterior`, `nuevo`, `motivo` y `actor_nombre`. |
| `POST /solicitudes/{id}/evaluacion` | Supervisor | `{ version }` pasa de Registrada a En evaluación; con `{ impacto, urgencia, motivo, version }` recalcula la prioridad desde `registrada_en` (RN05). 409 si la versión es antigua o la transición no es válida. |
| `POST /solicitudes/{id}/asignaciones` | Supervisor | `{ tecnico_id, version }` (desde En evaluación) o `{ tecnico_id, motivo, version }` para reasignar. Solo técnicos activos del área. |
| `POST /solicitudes/{id}/inicio` | Técnico asignado | Asignada → En atención; registra la primera atención una sola vez. |
| `POST /solicitudes/{id}/resoluciones` | Técnico asignado | `{ solucion, version }` (20 a 2000 caracteres) → Resuelta. |
| `GET /notificaciones` | Autenticado | Solo los avisos propios (json-server). |
| `PUT /notificaciones/{id}/lectura` | Propietario | Marca como leída. |
| `DELETE /notificaciones/{id}` | Propietario | **D07.** Borra un aviso propio: 204; 403 si es ajeno y 404 si no existe. |
| `GET` y `POST /admin/catalogos/{tipo}` | Administrador | `tipo` = `areas`, `categorias` o `ubicaciones` (json-server). |
| `PUT /admin/catalogos/{tipo}/{id}` | Administrador | Actualización parcial, por ejemplo `{ "activo": true }`. Una categoría usada no cambia de área (409). |
| `DELETE /admin/catalogos/{tipo}/{id}` | Administrador | **D07.** Desactivación lógica: responde 200 con `activo: false` y **no borra** el registro (RN11). |
| `GET /admin/politicas` | Administrador | Versiones de la política. |
| `POST /demo/restablecer` | Demostración | Copia `db.seed.json` sobre la base y la recarga en memoria. |
| `GET /demo/cuentas` | Demostración | Cuentas activas para el acceso simulado. |

Las rutas `/demo/*` y `GET /catalogos?tipo=tecnicos` son propias del prototipo y no forman parte del contrato definitivo. Los nombres de campo siguen el diccionario de datos de la sección 9 (`registrada_en`, `limite_atencion`, `estado_codigo`…).

**Cómo encaja json-server.** `servidor/servidor.js` usa json-server como módulo. `servidor/middleware.js` implementa las reglas que json-server no resuelve solo: sesión y permisos, código, prioridad y fechas, transiciones con historial, formato de listas y errores, fallas simuladas y restablecimiento. Las rutas genéricas (notificaciones, catálogos administrativos y políticas) se reescriben con `routes.json` hacia los recursos de json-server. El acceso directo a esos recursos sin `/api/v1` responde 404.

## Mapa de recorrido, archivos y responsables

| Recorrido | Archivos | Responsable |
|---|---|---|
| PR01 Estructura, CSS responsive y acceso por rol | `public/index.html`, `public/js/paginas/acceso.js`, `public/js/sesion.js`, `public/js/layout.js`, `public/css/estilos.css`, `public/css/tokens.css` (copia de `docs/diseno/tokens.css`), `public/catalogos.html`, `public/js/paginas/catalogos.js` | Gabriel |
| PR02 Formulario, prioridad en vivo y validaciones | `public/nueva-solicitud.html`, `public/js/paginas/nueva-solicitud.js`, `public/js/reglas.js` | Alex |
| PR03 Envío con fetch y respuesta con código y fechas | `public/js/paginas/nueva-solicitud.js`, `public/js/api.js`, `servidor/middleware.js` (`POST /solicitudes`) | Alex |
| PR04 Listado, filtros, paginación y detalle | `public/solicitudes.html`, `public/js/paginas/solicitudes.js`, `public/detalle.html`, `public/js/paginas/detalle.js`, `public/js/formato.js` | Marcelo |
| PR05 Evaluación, cambio de prioridad y asignación | `public/js/paginas/evaluacion.js`, `servidor/middleware.js` (evaluación y asignaciones), `recalcularPorCambioDePrioridad` en `public/js/reglas.js` | Marcelo |
| PR06 Datos incompletos, lista vacía y falla de API | `public/js/ui.js`, `public/js/demo.js`, `public/js/api.js`, `servidor/errores.js`, `public/notificaciones.html`, `public/js/paginas/notificaciones.js` | Emanuel |
| Base: repositorio, datos ficticios y restablecer | `db.seed.json`, `scripts/generar-semilla.js`, `scripts/datos.js`, `scripts/restablecer.js`, `scripts/preparar-db.js`, `servidor/servidor.js`, `routes.json` | David |
| D09 Pruebas PV01–PV10 | `tests/unit/*.test.js`, `tests/e2e/*.spec.js`, `playwright.config.js`, `docs/pruebas/` | Emanuel |

Cada módulo tiene un comentario de cabecera con su responsable.

## Estructura

```
prototipo/
├── db.seed.json            datos ficticios iniciales (versionado)
├── routes.json             reescritura /api/v1 → recursos de json-server
├── servidor/               servidor, middleware de reglas y formato de errores
├── scripts/                semilla, preparar y restablecer datos
├── public/                 interfaz estática (HTML, CSS y módulos ES)
│   ├── css/                tokens.css + estilos.css
│   └── js/                 reglas, api, sesión, layout, ui, formato y páginas
└── tests/                  unitarias (node --test) y e2e (Playwright)
```

## Accesibilidad y diseño responsive

Las etiquetas son visibles y los campos obligatorios están marcados. Cada error aparece junto a su campo, con un resumen que recibe el foco. El foco es visible (`:focus-visible`), hay un enlace para saltar al contenido y todo el recorrido funciona con teclado. El estado y la prioridad se muestran siempre con texto; el color solo refuerza. A 1366 px hay un menú lateral y paneles en dos columnas. A 360 px queda una sola columna, el menú se contrae con un botón «Menú» (`aria-expanded`) y la tabla se convierte en tarjetas, sin desplazamiento horizontal de la página (verificado en PV07).

## Paso a la fase II

`public/js/api.js` toma la base de `globalThis.MSU_API_BASE` (por defecto `/api/v1`). Para usar el backend Spring Boot basta con cambiar esa base y sustituir el encabezado `X-Usuario-Id` por la cookie de sesión. `public/js/reglas.js` no tiene dependencias y se reutiliza tal cual en React.
