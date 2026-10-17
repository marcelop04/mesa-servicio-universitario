import { Navigate, Route, Routes } from 'react-router-dom';
import { LayoutRol } from './layout/LayoutRol.jsx';
import { inicioDelRol, PANTALLAS } from './layout/navegacion.js';
import { Configuracion } from './paginas/admin/Configuracion.jsx';
import { Usuarios } from './paginas/admin/Usuarios.jsx';
import { EnConstruccion } from './paginas/EnConstruccion.jsx';
import { Login } from './paginas/Login.jsx';
import { Perfil } from './paginas/identidad/Perfil.jsx';
import { Registro } from './paginas/identidad/Registro.jsx';
import { Supervision } from './paginas/supervision/Supervision.jsx';
import { Atencion } from './paginas/atencion/Atencion.jsx';
import { DetallePagina } from './paginas/solicitudes/DetallePagina.jsx';
import { MisSolicitudes } from './paginas/solicitudes/MisSolicitudes.jsx';
import { NuevaSolicitud } from './paginas/solicitudes/NuevaSolicitud.jsx';
import { RutaProtegida } from './sesion/RutaProtegida.jsx';
import { useSesion } from './sesion/SesionContext.jsx';
import { Cargando } from './componentes/index.js';

function Inicio() {
  const { usuario, cargando } = useSesion();
  if (cargando) return <Cargando texto="Verificando la sesión…" />;
  return <Navigate to={usuario ? inicioDelRol(usuario.rol) : '/login'} replace />;
}

/** Pantallas de otros integrantes: quedan enlazadas para integrar cada una en su rama. */
function pendiente(id) {
  return <EnConstruccion id={id} {...PANTALLAS[id]} />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/registro" element={<Registro />} />
      <Route element={<RutaProtegida />}>
        <Route element={<LayoutRol />}>
          <Route path="/perfil" element={<Perfil />} />
          <Route path="/notificaciones" element={pendiente('P09')} />

          <Route element={<RutaProtegida roles={['SOLICITANTE']} />}>
            <Route path="/solicitudes" element={<MisSolicitudes />} />
            <Route path="/solicitudes/nueva" element={<NuevaSolicitud />} />
          </Route>
          <Route element={<RutaProtegida roles={['SOLICITANTE', 'TECNICO', 'SUPERVISOR']} />}>
            <Route path="/solicitudes/:id" element={<DetallePagina />} />
          </Route>
          <Route element={<RutaProtegida roles={['SUPERVISOR']} />}>
            <Route path="/supervision" element={<Supervision />} />
            <Route path="/dashboard" element={pendiente('P10')} />
          </Route>
          <Route element={<RutaProtegida roles={['TECNICO']} />}>
            <Route path="/atencion" element={<Atencion />} />
          </Route>
          <Route element={<RutaProtegida roles={['ADMINISTRADOR']} />}>
            <Route path="/admin/usuarios" element={<Usuarios />} />
            <Route path="/admin/configuracion" element={<Configuracion />} />
          </Route>
        </Route>
      </Route>
      <Route path="*" element={<Inicio />} />
    </Routes>
  );
}
