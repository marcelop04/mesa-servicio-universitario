# Frontend · React

React 18 · React Router 6 · Vite · Vitest.

## Ejecutar en local

```bash
npm install
npm run dev        # http://localhost:5173 (la API debe estar en http://localhost:8080)
npm test           # pruebas con Vitest
npm run build      # versión de producción en dist/
```

Vite reenvía `/api` al backend, así el navegador ve un solo origen y las cookies funcionan sin CORS.
Otro backend: `VITE_BACKEND_URL=http://host:puerto npm run dev`.

Cuentas de prueba (contraseña `Demo12345!`): `admin@msu.test`, `supervisor@msu.test`,
`tecnico.soporte@msu.test`, `tecnico.mantenimiento@msu.test`, `tecnico.servicios@msu.test`,
`solicitante@msu.test`.

## Base común (Gabriel · GB01–GB03)

| Ruta | Qué es | Cómo se usa |
|---|---|---|
| `src/api/cliente.js` | Cliente de API con fetch (GB03) | `api.get('/ruta', params)`, `api.post`, `api.put`, `api.del`. Envía cookie y `X-XSRF-TOKEN`; lanza `ErrorApi` con `estado`, `codigo`, `message`, `porCampo`, `esConflicto`. |
| `src/api/useConsulta.js` | Hook de consulta | `const { datos, cargando, error, recargar } = useConsulta(() => api.get(...), [deps])` |
| `src/componentes/` | Componentes reutilizables (GB02) | `Campo`, `Tabla`, `Paginacion`, `EtiquetaEstado`, `EtiquetaPrioridad`, `Mensaje`, `Cargando`, `Confirmacion` |
| `src/layout/` | Layout por rol y menú (GB01) | Agregue su pantalla en `navegacion.js` y en `App.jsx` |
| `src/sesion/` | Contexto de sesión y rutas protegidas | `useSesion()` → `{ usuario, iniciarSesion, cerrarSesion }`; `<RutaProtegida roles={[...]}/>` |
| `src/estilos/` | Tokens y estilos comunes | Copia de `docs/diseno/tokens.css` |

Ejemplo de una pantalla nueva:

```jsx
import { api } from '../api/cliente.js';
import { useConsulta } from '../api/useConsulta.js';
import { EtiquetaEstado, Paginacion, Tabla } from '../componentes/index.js';

const { datos, cargando, error, recargar } = useConsulta(() => api.get('/solicitudes', { pagina }), [pagina]);
<Tabla columnas={[{ clave: 'codigo', titulo: 'Código' },
                  { clave: 'estado', titulo: 'Estado', render: (s) => <EtiquetaEstado codigo={s.estado} /> }]}
       filas={datos?.items} cargando={cargando} error={error} onReintentar={recargar} />
```

## Pantallas

| Pantalla | Ruta | Estado |
|---|---|---|
| P11 Usuarios (HU20) | `/admin/usuarios` | Gabriel · terminada |
| P12 Configuración (HU21) | `/admin/configuracion` | Gabriel · catálogos terminados; políticas (HU22) y auditoría (HU23) pendientes |
| P01 Registro (HU01) | `/registro` | David · terminada |
| P02 Inicio de sesión (HU02) | `/login` | David · terminada (JWT en cookie HttpOnly) |
| P03 Perfil (HU03) | `/perfil` | David · terminada |
| P04 Nueva solicitud (HU04) | `/solicitudes/nueva` | Alex · terminada |
| P05 Mis solicitudes (HU05) | `/solicitudes` | Alex · terminada (filtros en LocalStorage) |
| P06 Seguimiento (HU05, HU06, HU12, HU23) | `/solicitudes/:id` | Alex (detalle reutilizable) y Emanuel (conformidad e historial) |
| P07 Bandeja de supervisión (HU07 a HU09) | `/supervision` | Marcelo · terminada |
| P08 Atención técnica (HU10, HU11) | `/atencion` | Emanuel · terminada |
| P09 Notificaciones y P10 Dashboard | ver `src/layout/navegacion.js` | Fase III |
