/*
 * GB01 · Layout por rol (Gabriel), según el diseño de Figma Make.
 * Escritorio: barra lateral con la marca, el menú del rol y la cuenta abajo.
 * Móvil: cabecera con título, avisos y avatar, y navegación inferior fija.
 */
import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Avatar, Icono, Marca } from '../componentes/index.js';
import { useSesion } from '../sesion/SesionContext.jsx';
import { menuDelRol, NOMBRE_ROL, pantallaDeRuta, seccionDelRol } from './navegacion.js';

function descripcionCuenta(usuario) {
  const rol = NOMBRE_ROL[usuario.rol] ?? usuario.rol;
  return usuario.area_nombre ? `${rol} · ${usuario.area_nombre}` : rol;
}

function MenuCuenta({ usuario, onSalir, clase }) {
  return (
    <div className={`menu-cuenta ${clase}`} role="menu">
      <div className="menu-cuenta__datos">
        <p className="menu-cuenta__nombre">{usuario.nombre}</p>
        <p className="menu-cuenta__rol">{descripcionCuenta(usuario)}</p>
      </div>
      <Link to="/perfil" className="menu-cuenta__opcion" role="menuitem">
        <Icono nombre="perfil" tamano={17} /> Mi perfil
      </Link>
      <button type="button" className="menu-cuenta__opcion menu-cuenta__opcion--peligro" role="menuitem" onClick={onSalir}>
        <Icono nombre="salir" tamano={17} /> Cerrar sesión
      </button>
    </div>
  );
}

export function LayoutRol() {
  const { usuario, cerrarSesion } = useSesion();
  const [cuentaAbierta, setCuentaAbierta] = useState(null); // null | 'lateral' | 'cabecera'
  const ubicacion = useLocation();
  const navegar = useNavigate();
  const contenedor = useRef(null);
  const menu = menuDelRol(usuario.rol);
  const actual = pantallaDeRuta(ubicacion.pathname);

  useEffect(() => setCuentaAbierta(null), [ubicacion.pathname]);

  useEffect(() => {
    if (!cuentaAbierta) return undefined;
    const cerrar = (e) => {
      if (e.key === 'Escape' || (e.type === 'mousedown' && !contenedor.current?.contains(e.target))) setCuentaAbierta(null);
    };
    document.addEventListener('keydown', cerrar);
    document.addEventListener('mousedown', cerrar);
    return () => {
      document.removeEventListener('keydown', cerrar);
      document.removeEventListener('mousedown', cerrar);
    };
  }, [cuentaAbierta]);

  const salir = async () => {
    await cerrarSesion();
    navegar('/login', { replace: true });
  };
  const alternar = (donde) => setCuentaAbierta((v) => (v === donde ? null : donde));

  return (
    <div className="app" ref={contenedor}>
      <a className="saltar" href="#contenido">
        Saltar al contenido
      </a>

      <aside className="lateral">
        <div className="lateral__marca">
          <Marca />
        </div>
        <nav className="lateral__nav" aria-label="Menú principal">
          <p className="lateral__seccion">{seccionDelRol(usuario.rol)}</p>
          <ul>
            {menu.map((item) => (
              <li key={item.id}>
                <NavLink to={item.ruta} className="lateral__enlace" end>
                  <Icono nombre={item.icono} tamano={19} />
                  <span>{item.menu}</span>
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
        <div className="lateral__cuenta">
          {cuentaAbierta === 'lateral' && <MenuCuenta usuario={usuario} onSalir={salir} clase="menu-cuenta--lateral" />}
          <button type="button" className="cuenta" aria-expanded={cuentaAbierta === 'lateral'} aria-haspopup="menu"
            onClick={() => alternar('lateral')}>
            <Avatar nombre={usuario.nombre} />
            <span className="cuenta__texto">
              <span className="cuenta__nombre">{usuario.nombre}</span>
              <span className="cuenta__rol">{descripcionCuenta(usuario)}</span>
            </span>
            <Icono nombre="flecha" tamano={16} />
          </button>
        </div>
      </aside>

      <div className="principal">
        <header className="cabecera">
          <div className="cabecera__titulos">
            <h1 className="cabecera__titulo">{actual?.titulo ?? 'Mesa de Servicios'}</h1>
            {actual?.subtitulo && <p className="cabecera__subtitulo">{actual.subtitulo}</p>}
          </div>
          <div className="cabecera__acciones">
            <Link to="/notificaciones" className="cabecera__aviso" aria-label="Notificaciones">
              <Icono nombre="campana" tamano={20} />
            </Link>
            <button type="button" className="cabecera__avatar" aria-expanded={cuentaAbierta === 'cabecera'} aria-haspopup="menu"
              aria-label={`Abrir menú de ${usuario.nombre}`} onClick={() => alternar('cabecera')}>
              <Avatar nombre={usuario.nombre} tamano="chico" />
            </button>
            {cuentaAbierta === 'cabecera' && <MenuCuenta usuario={usuario} onSalir={salir} clase="menu-cuenta--cabecera" />}
          </div>
        </header>
        <main id="contenido" className="contenido" tabIndex={-1}>
          <Outlet />
        </main>
      </div>

      <nav className="nav-movil" aria-label="Menú principal móvil">
        {[...menu, ...(usuario.rol === 'SOLICITANTE' ? [{ id: 'P03', ruta: '/perfil', movil: 'Perfil', icono: 'perfil' }] : [])].map((item) => (
          <NavLink key={item.id} to={item.ruta} className="nav-movil__enlace" end>
            <Icono nombre={item.icono} tamano={21} />
            <span>{item.movil}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
