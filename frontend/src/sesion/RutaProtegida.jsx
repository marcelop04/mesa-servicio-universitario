import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { Cargando } from '../componentes/index.js';
import { inicioDelRol } from '../layout/navegacion.js';
import { useSesion } from './SesionContext.jsx';

/** Solo deja pasar a usuarios con sesión y, si se indica, con alguno de los roles permitidos. */
export function RutaProtegida({ roles }) {
  const { usuario, cargando } = useSesion();
  const ubicacion = useLocation();

  if (cargando) return <Cargando texto="Verificando la sesión…" />;
  if (!usuario) return <Navigate to="/login" replace state={{ desde: ubicacion.pathname }} />;
  if (roles && !roles.includes(usuario.rol)) return <Navigate to={inicioDelRol(usuario.rol)} replace />;
  return <Outlet />;
}
