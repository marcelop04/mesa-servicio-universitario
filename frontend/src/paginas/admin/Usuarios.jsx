/*
 * GB06 · P11 Usuarios (Gabriel) · HU20 Administrar usuarios internos.
 * Diseño de Figma Make. Desactivar a un técnico exige que sus casos pendientes se
 * reasignen antes (tabla 22 del informe); el servidor también lo valida (409).
 */
import { useState } from 'react';
import { api } from '../../api/cliente.js';
import { useConsulta } from '../../api/useConsulta.js';
import {
  Avatar, Campo, Confirmacion, EtiquetaActivo, EtiquetaRol, Icono, Mensaje, Paginacion, Tabla,
} from '../../componentes/index.js';
import { NOMBRE_ROL } from '../../layout/navegacion.js';
import { useSesion } from '../../sesion/SesionContext.jsx';

const ROLES_INTERNOS = ['TECNICO', 'SUPERVISOR', 'ADMINISTRADOR'];
const VACIO = { nombre: '', correo: '', password: '', rol: 'TECNICO', area_id: '' };
const TAMANO = 10;

export function validarCuenta(datos, nueva) {
  const errores = {};
  const nombre = datos.nombre.trim();
  if (nombre.length < 2 || nombre.length > 100) errores.nombre = 'El nombre debe tener entre 2 y 100 caracteres.';
  if (nueva) {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(datos.correo.trim())) errores.correo = 'Ingrese un correo válido.';
    if (datos.password.length < 10 || datos.password.length > 64) {
      errores.password = 'La contraseña debe tener entre 10 y 64 caracteres.';
    }
  }
  if (!datos.rol) errores.rol = 'Seleccione el rol.';
  if (datos.rol === 'TECNICO' && !datos.area_id) errores.area_id = 'Un técnico debe pertenecer a un área.';
  return errores;
}

function areaVisible(u) {
  if (u.area_nombre) return u.area_nombre;
  if (u.rol === 'SUPERVISOR') return 'Todas las áreas';
  return 'No aplica';
}

function FormularioCuenta({ cuenta, areas, esPropia, onGuardado, onCancelar, onCambiarActivo }) {
  const nueva = !cuenta;
  const [datos, setDatos] = useState(
    nueva ? VACIO : { ...VACIO, nombre: cuenta.nombre, rol: cuenta.rol, area_id: cuenta.area_id ?? '' },
  );
  const [errores, setErrores] = useState({});
  const [error, setError] = useState(null);
  const [enviando, setEnviando] = useState(false);

  const cambiar = (campo) => (e) => setDatos((d) => ({ ...d, [campo]: e.target.value }));

  const enviar = async (e) => {
    e.preventDefault();
    const locales = validarCuenta(datos, nueva);
    setErrores(locales);
    setError(null);
    if (Object.keys(locales).length) return;
    setEnviando(true);
    const areaId = datos.rol === 'TECNICO' ? Number(datos.area_id) : null;
    try {
      const guardada = nueva
        ? await api.post('/admin/usuarios', { ...datos, nombre: datos.nombre.trim(), correo: datos.correo.trim(), area_id: areaId })
        : await api.put(`/admin/usuarios/${cuenta.id}`, { nombre: datos.nombre.trim(), rol: datos.rol, area_id: areaId });
      onGuardado(guardada, nueva);
    } catch (err) {
      setErrores(err.porCampo ?? {});
      setError(err.message);
    } finally {
      setEnviando(false);
    }
  };

  const roles = nueva || cuenta.rol !== 'SOLICITANTE' ? ROLES_INTERNOS : ['SOLICITANTE', ...ROLES_INTERNOS];

  return (
    <form className="panel" onSubmit={enviar} noValidate aria-labelledby="titulo-formulario">
      <h2 id="titulo-formulario" className="panel__titulo">
        {nueva ? 'Crear usuario interno' : `Editar a ${cuenta.nombre}`}
      </h2>
      {error && <div style={{ marginBottom: 16 }}><Mensaje tipo="error">{error}</Mensaje></div>}
      <div className="formulario__rejilla">
        <Campo id="cuenta-nombre" etiqueta="Nombre completo" obligatorio value={datos.nombre}
          onChange={cambiar('nombre')} error={errores.nombre} maxLength={100} />
        {nueva && (
          <Campo id="cuenta-correo" etiqueta="Correo institucional" type="email" obligatorio value={datos.correo}
            onChange={cambiar('correo')} error={errores.correo} autoComplete="off" />
        )}
        {nueva && (
          <Campo id="cuenta-password" etiqueta="Contraseña inicial" type="password" obligatorio
            value={datos.password} onChange={cambiar('password')} error={errores.password}
            ayuda="Entre 10 y 64 caracteres. Compártala por un canal seguro." autoComplete="new-password" />
        )}
        <Campo id="cuenta-rol" como="select" etiqueta="Rol" obligatorio value={datos.rol}
          onChange={cambiar('rol')} error={errores.rol}
          ayuda={!nueva && datos.rol !== cuenta.rol ? 'Al cambiar el rol, la sesión actual del usuario se cierra.' : undefined}>
          {roles.map((r) => (
            <option key={r} value={r}>
              {NOMBRE_ROL[r]}
            </option>
          ))}
        </Campo>
        {datos.rol === 'TECNICO' && (
          <Campo id="cuenta-area" como="select" etiqueta="Área" obligatorio value={datos.area_id}
            onChange={cambiar('area_id')} error={errores.area_id}>
            <option value="">Seleccione un área</option>
            {areas.map((a) => (
              <option key={a.id} value={a.id}>
                {a.nombre}
              </option>
            ))}
          </Campo>
        )}
      </div>
      {!nueva && !esPropia && (
        <div className="formulario__zona-peligro">
          <span>
            {cuenta.activo
              ? 'Al desactivar la cuenta, el usuario pierde el acceso de inmediato.'
              : 'La cuenta está inactiva y no puede iniciar sesión.'}
          </span>
          <button type="button" className={`boton ${cuenta.activo ? 'boton--peligro-suave' : 'boton--secundario'}`}
            onClick={() => onCambiarActivo(cuenta)}>
            {cuenta.activo ? 'Desactivar cuenta' : 'Reactivar cuenta'}
          </button>
        </div>
      )}
      <div className="formulario__acciones">
        <button type="button" className="boton boton--secundario" onClick={onCancelar} disabled={enviando}>
          Cancelar
        </button>
        <button type="submit" className="boton boton--primario" disabled={enviando}>
          {enviando ? 'Guardando…' : nueva ? 'Crear usuario' : 'Guardar cambios'}
        </button>
      </div>
    </form>
  );
}

export function Usuarios() {
  const { usuario: actual } = useSesion();
  const [filtros, setFiltros] = useState({ q: '', rol: '', activo: '' });
  const [pagina, setPagina] = useState(1);
  const [edicion, setEdicion] = useState(null); // null | 'nueva' | cuenta
  const [confirmar, setConfirmar] = useState(null);
  const [procesando, setProcesando] = useState(false);
  const [aviso, setAviso] = useState(null);

  const listado = useConsulta(
    () => api.get('/admin/usuarios', { ...filtros, pagina, tamano: TAMANO }),
    [filtros, pagina],
  );
  const resumen = useConsulta(
    () => Promise.all([
      api.get('/admin/usuarios', { tamano: 1 }),
      api.get('/admin/usuarios', { activo: true, tamano: 1 }),
    ]).then(([todos, activos]) => ({ total: todos?.total ?? 0, activos: activos?.total ?? 0 })),
    [],
  );
  const catalogo = useConsulta(() => api.get('/catalogos', { tipo: 'areas' }), []);
  const areas = catalogo.datos ?? [];

  const filtrar = (campo) => (e) => {
    setFiltros((f) => ({ ...f, [campo]: e.target.value }));
    setPagina(1);
  };

  const recargarTodo = () => {
    listado.recargar();
    resumen.recargar();
  };

  const alGuardar = (cuenta, nueva) => {
    setEdicion(null);
    setAviso({ tipo: 'exito', texto: nueva ? `Se creó la cuenta de ${cuenta.nombre}.` : `Se actualizó la cuenta de ${cuenta.nombre}.` });
    recargarTodo();
  };

  const cambiarActivo = async () => {
    const { cuenta, activo } = confirmar;
    setProcesando(true);
    try {
      await api.put(`/admin/usuarios/${cuenta.id}`, { activo });
      setAviso({ tipo: 'exito', texto: `${cuenta.nombre} quedó ${activo ? 'activo' : 'inactivo'}.` });
      setEdicion(null);
      recargarTodo();
    } catch (err) {
      setAviso({ tipo: 'error', texto: err.message });
    } finally {
      setProcesando(false);
      setConfirmar(null);
    }
  };

  const columnas = [
    {
      clave: 'nombre', titulo: 'Usuario',
      render: (u) => (
        <div className="persona">
          <Avatar nombre={u.nombre} tamano="suave" />
          <div>
            <span className="persona__nombre">{u.nombre}</span>
            <span className="persona__correo">{u.correo}</span>
          </div>
        </div>
      ),
    },
    { clave: 'rol', titulo: 'Rol', render: (u) => <EtiquetaRol codigo={u.rol} nombre={u.rol_nombre} /> },
    { clave: 'area_nombre', titulo: 'Área', render: areaVisible },
    { clave: 'activo', titulo: 'Estado', render: (u) => <EtiquetaActivo activo={u.activo} punto /> },
    {
      clave: 'pendientes', titulo: 'Pendientes', clase: 'tabla__centro',
      render: (u) => <strong>{u.rol === 'TECNICO' ? u.pendientes : '—'}</strong>,
    },
    {
      clave: 'acciones', titulo: 'Acciones', clase: 'tabla__acciones',
      render: (u) => (
        <button type="button" className="enlace-accion" onClick={() => setEdicion(u)}>
          Editar<span className="solo-lector"> {u.nombre}</span>
        </button>
      ),
    },
  ];

  const conCarga = confirmar && !confirmar.activo && confirmar.cuenta.rol === 'TECNICO' && confirmar.cuenta.pendientes > 0;

  return (
    <section className="pagina" aria-label="Usuarios internos">
      <div className="pagina__resumen">
        <div>
          <p className="pagina__dato">
            <strong>{resumen.datos?.total ?? '…'} usuarios</strong> · {resumen.datos?.activos ?? '…'} activos
          </p>
          <p className="pagina__nota">Cambiar el rol o desactivar una cuenta cierra la sesión que el usuario tenga abierta.</p>
        </div>
        {edicion === null && (
          <button type="button" className="boton boton--primario" onClick={() => setEdicion('nueva')}>
            <Icono nombre="mas" tamano={18} /> Crear usuario
          </button>
        )}
      </div>

      {aviso && (
        <Mensaje tipo={aviso.tipo} onCerrar={() => setAviso(null)}>
          {aviso.texto}
        </Mensaje>
      )}

      {edicion !== null && (
        <FormularioCuenta key={edicion === 'nueva' ? 'nueva' : edicion.id} cuenta={edicion === 'nueva' ? null : edicion}
          areas={areas} esPropia={edicion !== 'nueva' && edicion.id === actual?.id} onGuardado={alGuardar}
          onCancelar={() => setEdicion(null)} onCambiarActivo={(c) => setConfirmar({ cuenta: c, activo: !c.activo })} />
      )}

      <form className="panel filtros" role="search" onSubmit={(e) => e.preventDefault()}>
        <Campo id="filtro-texto" etiqueta="Buscar usuario" type="search" placeholder="Nombre o correo institucional…"
          value={filtros.q} onChange={filtrar('q')} />
        <Campo id="filtro-rol" como="select" etiqueta="Rol" value={filtros.rol} onChange={filtrar('rol')}>
          <option value="">Todos</option>
          {Object.entries(NOMBRE_ROL).map(([codigo, nombre]) => (
            <option key={codigo} value={codigo}>
              {nombre}
            </option>
          ))}
        </Campo>
        <Campo id="filtro-estado" como="select" etiqueta="Estado" value={filtros.activo} onChange={filtrar('activo')}>
          <option value="">Todos</option>
          <option value="true">Activos</option>
          <option value="false">Inactivos</option>
        </Campo>
      </form>

      <div className="panel panel--tabla">
        <Tabla titulo="Cuentas" columnas={columnas} filas={listado.datos?.items} cargando={listado.cargando}
          error={listado.error} onReintentar={listado.recargar}
          vacio="No hay cuentas que coincidan con los filtros." />
        {listado.datos && (
          <Paginacion pagina={listado.datos.pagina} tamano={listado.datos['tamaño']} total={listado.datos.total}
            onCambiar={setPagina} nombre="usuarios" />
        )}
      </div>

      <Confirmacion abierto={Boolean(confirmar)} peligro={confirmar && !confirmar.activo}
        titulo={confirmar?.activo ? 'Reactivar cuenta' : 'Desactivar cuenta'}
        textoConfirmar={confirmar?.activo ? 'Reactivar' : 'Desactivar'}
        ocupado={procesando} deshabilitado={conCarga}
        onConfirmar={cambiarActivo} onCancelar={() => setConfirmar(null)}>
        {conCarga ? (
          <p>
            {confirmar.cuenta.nombre} tiene {confirmar.cuenta.pendientes}{' '}
            {confirmar.cuenta.pendientes === 1 ? 'caso pendiente' : 'casos pendientes'}. El supervisor debe
            reasignarlos antes de desactivar la cuenta.
          </p>
        ) : confirmar?.activo ? (
          <p>{confirmar?.cuenta.nombre} podrá volver a iniciar sesión.</p>
        ) : (
          <p>{confirmar?.cuenta.nombre} perderá el acceso de inmediato. La cuenta y su historial se conservan.</p>
        )}
      </Confirmacion>
    </section>
  );
}
