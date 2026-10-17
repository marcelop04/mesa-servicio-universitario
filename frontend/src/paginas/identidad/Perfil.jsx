/*
 * DV07 · P03 Perfil (David) · HU03 Consultar perfil y cambiar contraseña.
 * El usuario solo cambia su nombre; rol, área y correo los administra la institución.
 * Al cambiar la contraseña se cierran las demás sesiones y la actual continúa con un token nuevo.
 */
import { useState } from 'react';
import { api } from '../../api/cliente.js';
import { Avatar, Campo, EtiquetaRol, Mensaje } from '../../componentes/index.js';
import { useSesion } from '../../sesion/SesionContext.jsx';
import { VINCULOS } from './Registro.jsx';

const SIN_PASSWORD = { actual: '', nueva: '', confirmacion: '' };

export function validarCambioPassword(d) {
  const errores = {};
  if (!d.actual) errores.actual = 'Ingrese su contraseña actual.';
  if (d.nueva.length < 10 || d.nueva.length > 64) errores.nueva = 'La nueva contraseña debe tener entre 10 y 64 caracteres.';
  else if (d.nueva === d.actual) errores.nueva = 'La nueva contraseña debe ser distinta de la actual.';
  if (d.confirmacion !== d.nueva) errores.confirmacion = 'La confirmación no coincide con la nueva contraseña.';
  return errores;
}

function FormularioNombre({ usuario, onGuardado }) {
  const [nombre, setNombre] = useState(usuario.nombre);
  const [error, setError] = useState(null);
  const [aviso, setAviso] = useState(null);
  const [enviando, setEnviando] = useState(false);

  const enviar = async (e) => {
    e.preventDefault();
    const limpio = nombre.trim();
    if (limpio.length < 2 || limpio.length > 100) return setError('El nombre debe tener entre 2 y 100 caracteres.');
    setEnviando(true);
    setError(null);
    try {
      onGuardado(await api.put('/me', { nombre: limpio }));
      setAviso('Nombre actualizado.');
    } catch (err) {
      setError(err.porCampo?.nombre ?? err.message);
    } finally {
      setEnviando(false);
    }
  };

  const vinculo = VINCULOS.find((v) => v.codigo === usuario.vinculo)?.nombre ?? usuario.vinculo;
  return (
    <form className="panel" onSubmit={enviar} noValidate aria-labelledby="titulo-datos-cuenta">
      <div className="persona" style={{ marginBottom: 16 }}>
        <Avatar nombre={usuario.nombre} />
        <div>
          <h2 id="titulo-datos-cuenta" className="panel__titulo" style={{ margin: 0 }}>{usuario.nombre}</h2>
          <span className="persona__correo">{usuario.correo}</span>
        </div>
      </div>
      {aviso && <Mensaje tipo="exito" onCerrar={() => setAviso(null)}>{aviso}</Mensaje>}
      <dl className="datos" style={{ margin: '12px 0 16px' }}>
        <dt>Rol</dt><dd><EtiquetaRol codigo={usuario.rol} nombre={usuario.rol_nombre} /></dd>
        <dt>Vínculo</dt><dd>{vinculo}</dd>
        <dt>Área</dt><dd>{usuario.area_nombre ?? 'No aplica'}</dd>
      </dl>
      <Campo id="perfil-nombre" etiqueta="Nombre completo" obligatorio maxLength={100} value={nombre}
        onChange={(e) => setNombre(e.target.value)} error={error}
        ayuda="El rol, el área y el correo los administra la institución." />
      <button type="submit" className="boton boton--secundario" disabled={enviando || nombre.trim() === usuario.nombre}>
        {enviando ? 'Guardando…' : 'Guardar nombre'}
      </button>
    </form>
  );
}

function FormularioPassword() {
  const [datos, setDatos] = useState(SIN_PASSWORD);
  const [errores, setErrores] = useState({});
  const [aviso, setAviso] = useState(null);
  const [enviando, setEnviando] = useState(false);
  const cambiar = (campo) => (e) => setDatos((d) => ({ ...d, [campo]: e.target.value }));

  const enviar = async (e) => {
    e.preventDefault();
    const locales = validarCambioPassword(datos);
    setErrores(locales);
    setAviso(null);
    if (Object.keys(locales).length) return;
    setEnviando(true);
    try {
      await api.put('/me/password', datos);
      setDatos(SIN_PASSWORD);
      setAviso({ tipo: 'exito', texto: 'Contraseña actualizada. Las demás sesiones abiertas se cerraron.' });
    } catch (err) {
      setErrores(err.porCampo ?? {});
      if (!err.errores?.length) setAviso({ tipo: 'error', texto: err.message });
    } finally {
      setEnviando(false);
    }
  };

  return (
    <form className="panel" onSubmit={enviar} noValidate aria-labelledby="titulo-password">
      <h2 id="titulo-password" className="panel__titulo">Cambiar contraseña</h2>
      {aviso && <Mensaje tipo={aviso.tipo} onCerrar={() => setAviso(null)}>{aviso.texto}</Mensaje>}
      <Campo id="password-actual" etiqueta="Contraseña actual" type="password" obligatorio autoComplete="current-password"
        value={datos.actual} onChange={cambiar('actual')} error={errores.actual} />
      <Campo id="password-nueva" etiqueta="Nueva contraseña" type="password" obligatorio autoComplete="new-password"
        value={datos.nueva} onChange={cambiar('nueva')} error={errores.nueva} ayuda="Entre 10 y 64 caracteres." />
      <Campo id="password-confirmacion" etiqueta="Confirmar nueva contraseña" type="password" obligatorio autoComplete="new-password"
        value={datos.confirmacion} onChange={cambiar('confirmacion')} error={errores.confirmacion} />
      <button type="submit" className="boton boton--primario" disabled={enviando}>
        {enviando ? 'Actualizando…' : 'Cambiar contraseña'}
      </button>
    </form>
  );
}

export function Perfil() {
  const { usuario, actualizarUsuario } = useSesion();
  return (
    <section className="pagina" aria-label="Mi perfil">
      <div className="detalle__rejilla">
        <FormularioNombre usuario={usuario} onGuardado={actualizarUsuario} />
        <FormularioPassword />
      </div>
    </section>
  );
}
