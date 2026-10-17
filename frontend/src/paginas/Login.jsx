/*
 * Inicio de sesión con el diseño de Figma Make (P02).
 * Mínimo y provisional en su lógica: la P02 definitiva es de David (DV07). Mantiene el
 * mensaje de error genérico de HU02. La recuperación de contraseña está fuera de alcance (2.3).
 */
import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Campo, Icono, Marca, Mensaje } from '../componentes/index.js';
import { inicioDelRol } from '../layout/navegacion.js';
import { useSesion } from '../sesion/SesionContext.jsx';

const CUENTAS_DEMO = [
  ['Administrador', 'Adán Administrador', 'admin@msu.test'],
  ['Supervisora', 'Sara Supervisora', 'supervisor@msu.test'],
  ['Técnico', 'Tomás Soporte', 'tecnico.soporte@msu.test'],
  ['Solicitante', 'Ana Solicitante', 'solicitante@msu.test'],
];

export function Login() {
  const { usuario, iniciarSesion } = useSesion();
  const [correo, setCorreo] = useState('');
  const [password, setPassword] = useState('');
  const [verPassword, setVerPassword] = useState(false);
  const [error, setError] = useState(null);
  const [enviando, setEnviando] = useState(false);
  const navegar = useNavigate();
  const desde = useLocation().state?.desde;

  if (usuario) return <Navigate to={inicioDelRol(usuario.rol)} replace />;

  const enviar = async (e) => {
    e.preventDefault();
    setError(null);
    setEnviando(true);
    try {
      const perfil = await iniciarSesion(correo.trim(), password);
      navegar(desde ?? inicioDelRol(perfil.rol), { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="acceso">
      <section className="acceso__presentacion" aria-label="Presentación">
        <Marca clara />
        <div className="acceso__mensaje">
          <span className="acceso__etiqueta">SOPORTE UNIVERSITARIO</span>
          <p className="acceso__lema">Conectamos tus consultas con las soluciones.</p>
          <p>Un solo lugar para registrar, seguir y resolver tus solicitudes de servicio en la universidad.</p>
        </div>
        <p className="acceso__pie">© 2026 Universidad Nacional Mayor de San Marcos</p>
      </section>

      <main className="acceso__formulario">
        <section className="acceso__tarjeta" aria-labelledby="titulo-acceso">
          <p className="antetitulo">Identidad</p>
          <h1 id="titulo-acceso" className="acceso__titulo">Bienvenido de nuevo</h1>
          <p className="acceso__subtitulo">Ingresa tus credenciales institucionales para continuar.</p>
          {error && <Mensaje tipo="error">{error}</Mensaje>}
          <form onSubmit={enviar} noValidate style={{ marginTop: error ? 16 : 0 }}>
            <div className="campo">
              <label htmlFor="correo" className="campo__etiqueta">Correo institucional</label>
              <div className="control-icono">
                <Icono nombre="correo" tamano={18} />
                <input id="correo" name="correo" className="campo__control" type="email" autoComplete="username"
                  placeholder="nombre@unmsm.edu.pe" required value={correo} onChange={(e) => setCorreo(e.target.value)} />
              </div>
            </div>
            <div className="campo">
              <label htmlFor="password" className="campo__etiqueta">Contraseña</label>
              <div className="control-icono">
                <Icono nombre="candado" tamano={18} />
                <input id="password" name="password" className="campo__control" type={verPassword ? 'text' : 'password'}
                  autoComplete="current-password" placeholder="Ingresa tu contraseña" required value={password}
                  onChange={(e) => setPassword(e.target.value)} />
                <button type="button" className="control-icono__ver" onClick={() => setVerPassword((v) => !v)}
                  aria-label={verPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'} aria-pressed={verPassword}>
                  <Icono nombre="ojo" tamano={18} />
                </button>
              </div>
            </div>
            <button type="submit" className="boton boton--primario boton--bloque" disabled={enviando}>
              {enviando ? 'Ingresando…' : 'Iniciar sesión'}
            </button>
          </form>
          {import.meta.env.DEV && (
            <div className="acceso__demo">
              <p className="acceso__demo-titulo">CUENTAS DE PRUEBA · CONTRASEÑA Demo12345!</p>
              <div className="acceso__cuentas">
                {CUENTAS_DEMO.map(([rol, nombre, c]) => (
                  <button key={c} type="button" className="acceso__cuenta" onClick={() => setCorreo(c)}>
                    <strong>{rol}</strong>
                    <span>{nombre}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </section>
        <p className="acceso__registro">
          ¿Aún no tienes una cuenta? <Link to="/registro">Crear una cuenta</Link>
        </p>
      </main>
    </div>
  );
}
