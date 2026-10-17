/*
 * DV07 · P01 Registro (David) · HU01 Registrar una cuenta.
 * El registro público siempre crea una cuenta de solicitante; el servidor asigna el rol.
 * Al terminar, lleva al inicio de sesión con el correo ya escrito (BDD 1).
 */
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../../api/cliente.js';
import { Campo, Marca, Mensaje } from '../../componentes/index.js';

export const VINCULOS = [
  { codigo: 'ESTUDIANTE', nombre: 'Estudiante' },
  { codigo: 'DOCENTE', nombre: 'Docente' },
  { codigo: 'ADMINISTRATIVO', nombre: 'Administrativo' },
];
const VACIO = { nombre: '', correo: '', vinculo: '', password: '', confirmacion: '' };

export function validarRegistro(d) {
  const errores = {};
  const nombre = d.nombre.trim();
  if (nombre.length < 2 || nombre.length > 100) errores.nombre = 'El nombre debe tener entre 2 y 100 caracteres.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.correo.trim())) errores.correo = 'Ingrese un correo válido.';
  if (!d.vinculo) errores.vinculo = 'Seleccione su vínculo con la universidad.';
  if (d.password.length < 10 || d.password.length > 64) errores.password = 'La contraseña debe tener entre 10 y 64 caracteres.';
  if (d.confirmacion !== d.password) errores.confirmacion = 'Las contraseñas no coinciden.';
  return errores;
}

export function Registro() {
  const [datos, setDatos] = useState(VACIO);
  const [errores, setErrores] = useState({});
  const [error, setError] = useState(null);
  const [enviando, setEnviando] = useState(false);
  const navegar = useNavigate();
  const cambiar = (campo) => (e) => setDatos((d) => ({ ...d, [campo]: e.target.value }));

  const enviar = async (e) => {
    e.preventDefault();
    const locales = validarRegistro(datos);
    setErrores(locales);
    setError(null);
    if (Object.keys(locales).length) return;
    setEnviando(true);
    try {
      const cuenta = await api.post('/auth/registro', {
        nombre: datos.nombre.trim(), correo: datos.correo.trim(), vinculo: datos.vinculo, password: datos.password,
      });
      navegar('/login', { state: { registrado: cuenta.correo } });
    } catch (err) {
      const porCampo = err.porCampo ?? {};
      if (err.codigo === 'CORREO_DUPLICADO') porCampo.correo = err.message;
      setErrores(porCampo);
      setError(err.codigo === 'CORREO_DUPLICADO' ? null : err.message);
    } finally {
      setEnviando(false);
    }
  };

  return (
    <main className="acceso__formulario registro" style={{ minHeight: '100vh' }}>
      <section className="acceso__tarjeta" aria-labelledby="titulo-registro">
        <Marca />
        <p className="antetitulo" style={{ marginTop: 24 }}>Nueva cuenta</p>
        <h1 id="titulo-registro" className="acceso__titulo">Crear una cuenta</h1>
        <p className="acceso__subtitulo">Para reportar requerimientos y seguir su atención. Las cuentas del personal las crea la administración.</p>
        {error && <Mensaje tipo="error">{error}</Mensaje>}
        <form onSubmit={enviar} noValidate style={{ marginTop: 16 }}>
          <Campo id="registro-nombre" etiqueta="Nombre completo" obligatorio autoComplete="name" maxLength={100}
            value={datos.nombre} onChange={cambiar('nombre')} error={errores.nombre} />
          <Campo id="registro-correo" etiqueta="Correo institucional" type="email" obligatorio autoComplete="email"
            placeholder="nombre@unmsm.edu.pe" value={datos.correo} onChange={cambiar('correo')} error={errores.correo} />
          <Campo id="registro-vinculo" como="select" etiqueta="Vínculo con la universidad" obligatorio
            value={datos.vinculo} onChange={cambiar('vinculo')} error={errores.vinculo}>
            <option value="">Seleccione</option>
            {VINCULOS.map((v) => <option key={v.codigo} value={v.codigo}>{v.nombre}</option>)}
          </Campo>
          <Campo id="registro-password" etiqueta="Contraseña" type="password" obligatorio autoComplete="new-password"
            value={datos.password} onChange={cambiar('password')} error={errores.password} ayuda="Entre 10 y 64 caracteres." />
          <Campo id="registro-confirmacion" etiqueta="Confirmar contraseña" type="password" obligatorio autoComplete="new-password"
            value={datos.confirmacion} onChange={cambiar('confirmacion')} error={errores.confirmacion} />
          <button type="submit" className="boton boton--primario boton--bloque" disabled={enviando}>
            {enviando ? 'Creando cuenta…' : 'Crear cuenta'}
          </button>
        </form>
        <p className="acceso__registro" style={{ marginTop: 16 }}>
          ¿Ya tienes una cuenta? <Link to="/login">Inicia sesión</Link>
        </p>
      </section>
    </main>
  );
}
