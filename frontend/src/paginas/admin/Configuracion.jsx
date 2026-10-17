/*
 * GB06 · P12 Configuración y auditoría (Gabriel) · HU21 Mantener los catálogos.
 * Diseño de Figma Make: pestañas y una tarjeta por catálogo. DELETE es una desactivación
 * lógica (D07). Estados y prioridades son fijos: solo cambia su nombre visible.
 * Políticas de plazos (HU22) y auditoría (HU23) se integran en sus pestañas.
 */
import { useState } from 'react';
import { api } from '../../api/cliente.js';
import { useConsulta } from '../../api/useConsulta.js';
import { Campo, Confirmacion, EtiquetaActivo, Icono, Mensaje } from '../../componentes/index.js';

export const TIPOS = [
  { tipo: 'areas', titulo: 'Áreas', singular: 'área', descripcion: 'Equipos responsables de la atención.', campos: ['nombre'] },
  { tipo: 'categorias', titulo: 'Categorías', singular: 'categoría', descripcion: 'Clasificación funcional de solicitudes.', campos: ['nombre', 'area_id'] },
  { tipo: 'ubicaciones', titulo: 'Ubicaciones', singular: 'ubicación', descripcion: 'Relación edificio / ambiente.', campos: ['edificio', 'ambiente'] },
  { tipo: 'estados', titulo: 'Estados', singular: 'estado', descripcion: 'Flujo de atención: solo cambia el nombre visible.', campos: ['nombre'], fijo: true },
  { tipo: 'prioridades', titulo: 'Prioridades', singular: 'prioridad', descripcion: 'Matriz de prioridad: solo cambia el nombre visible.', campos: ['nombre'], fijo: true },
];
const EDITABLES = TIPOS.filter((t) => !t.fijo);
const ETIQUETAS = { nombre: 'Nombre', area_id: 'Área', edificio: 'Edificio', ambiente: 'Ambiente' };

export function validarOpcion(campos, datos) {
  const errores = {};
  campos.forEach((c) => {
    const valor = String(datos[c] ?? '').trim();
    if (!valor) errores[c] = c === 'area_id' ? 'Seleccione el área a la que pertenece.' : 'Este campo es obligatorio.';
    else if (c !== 'area_id' && valor.length > 100) errores[c] = 'Use como máximo 100 caracteres.';
  });
  return errores;
}

function FormularioOpcion({ inicial, opcion, areas, onGuardada, onCancelar }) {
  const nueva = !opcion;
  const [tipo, setTipo] = useState(inicial);
  const config = TIPOS.find((t) => t.tipo === tipo);
  const campos = config.campos;
  const [datos, setDatos] = useState(() =>
    Object.fromEntries(['nombre', 'area_id', 'edificio', 'ambiente'].map((c) => [c, opcion?.[c] ?? ''])),
  );
  const [errores, setErrores] = useState({});
  const [error, setError] = useState(null);
  const [enviando, setEnviando] = useState(false);

  const enviar = async (e) => {
    e.preventDefault();
    const locales = validarOpcion(campos, datos);
    setErrores(locales);
    setError(null);
    if (Object.keys(locales).length) return;
    const cuerpo = Object.fromEntries(
      campos.map((c) => [c, c === 'area_id' ? Number(datos[c]) : String(datos[c]).trim()]),
    );
    setEnviando(true);
    try {
      const guardada = nueva
        ? await api.post(`/admin/catalogos/${tipo}`, cuerpo)
        : await api.put(`/admin/catalogos/${tipo}/${opcion.id}`, cuerpo);
      onGuardada(tipo, guardada, nueva);
    } catch (err) {
      setErrores(err.porCampo ?? {});
      setError(err.message);
    } finally {
      setEnviando(false);
    }
  };

  return (
    <form className="panel" onSubmit={enviar} noValidate aria-labelledby="titulo-opcion">
      <h2 id="titulo-opcion" className="panel__titulo">
        {nueva ? 'Nuevo elemento' : `Editar ${config.singular}: ${opcion.nombre}`}
      </h2>
      {error && <div style={{ marginBottom: 16 }}><Mensaje tipo="error">{error}</Mensaje></div>}
      <div className="formulario__rejilla">
        {nueva && (
          <Campo id="opcion-tipo" como="select" etiqueta="Catálogo" obligatorio value={tipo}
            onChange={(e) => { setTipo(e.target.value); setErrores({}); }}>
            {EDITABLES.map((t) => (
              <option key={t.tipo} value={t.tipo}>
                {t.titulo}
              </option>
            ))}
          </Campo>
        )}
        {campos.map((c) =>
          c === 'area_id' ? (
            <Campo key={c} id={`opcion-${c}`} como="select" etiqueta={ETIQUETAS[c]} obligatorio value={datos[c]}
              error={errores[c]} onChange={(e) => setDatos((d) => ({ ...d, [c]: e.target.value }))}
              ayuda={!nueva ? 'Una categoría ya usada en solicitudes no puede cambiar de área.' : undefined}>
              <option value="">Seleccione un área</option>
              {areas.filter((a) => a.activo).map((a) => (
                <option key={a.id} value={a.id}>
                  {a.nombre}
                </option>
              ))}
            </Campo>
          ) : (
            <Campo key={c} id={`opcion-${c}`} etiqueta={config.fijo ? 'Nombre visible' : ETIQUETAS[c]} obligatorio
              value={datos[c]} maxLength={100} error={errores[c]}
              onChange={(e) => setDatos((d) => ({ ...d, [c]: e.target.value }))}
              ayuda={config.fijo ? `El código ${opcion.id} no cambia; solo el nombre que ven los usuarios.` : undefined} />
          ),
        )}
      </div>
      <div className="formulario__acciones">
        <button type="button" className="boton boton--secundario" onClick={onCancelar} disabled={enviando}>
          Cancelar
        </button>
        <button type="submit" className="boton boton--primario" disabled={enviando}>
          {enviando ? 'Guardando…' : 'Guardar'}
        </button>
      </div>
    </form>
  );
}

function detalleDe(config, o, categoriasPorArea) {
  if (config.tipo === 'areas') {
    const n = categoriasPorArea[o.id] ?? 0;
    return `${n} ${n === 1 ? 'categoría' : 'categorías'}`;
  }
  if (config.tipo === 'categorias') return o.area_nombre;
  if (config.tipo === 'ubicaciones') return 'Edificio / Ambiente';
  return `Código ${o.id}`;
}

function TarjetaCatalogo({ config, consulta, categoriasPorArea, onNueva, onEditar, onCambiarActivo, ancha }) {
  const items = consulta.datos?.items ?? [];
  return (
    <section className={`tarjeta-catalogo${ancha ? ' tarjeta-catalogo--ancha' : ''}`} aria-labelledby={`tarjeta-${config.tipo}`}>
      <div className="tarjeta-catalogo__cabecera">
        <div>
          <h3 id={`tarjeta-${config.tipo}`} className="tarjeta-catalogo__titulo">{config.titulo}</h3>
          <p className="tarjeta-catalogo__descripcion">{config.descripcion}</p>
        </div>
        {!config.fijo && (
          <button type="button" className="boton boton--icono" onClick={() => onNueva(config.tipo)}
            aria-label={`Agregar ${config.singular}`}>
            <Icono nombre="mas" tamano={18} />
          </button>
        )}
      </div>
      {consulta.error ? (
        <div style={{ padding: 16 }}>
          <Mensaje tipo="error" titulo="No se pudo cargar la información."
            accion={<button type="button" className="boton boton--secundario" onClick={consulta.recargar}>Reintentar</button>}>
            {consulta.error.message}
          </Mensaje>
        </div>
      ) : consulta.cargando && !items.length ? (
        <p className="cargando" role="status">Cargando…</p>
      ) : !items.length ? (
        <p className="tabla__vacia">Aún no hay {config.titulo.toLowerCase()}.</p>
      ) : (
        <ul className={`tarjeta-catalogo__lista${ancha ? ' tarjeta-catalogo__lista--columnas' : ''}`}>
          {items.map((o) => (
            <li key={o.id} className={`opcion${o.activo ? '' : ' opcion--inactiva'}`}>
              <div className="opcion__fila">
                <div>
                  <p className="opcion__nombre">
                    {config.tipo === 'ubicaciones' ? `${o.edificio} / ${o.ambiente}` : o.nombre}
                  </p>
                  <p className="opcion__detalle">{detalleDe(config, o, categoriasPorArea)}</p>
                </div>
                {config.fijo ? <span className="etiqueta etiqueta--neutro">Fijo</span> : <EtiquetaActivo activo={o.activo} />}
              </div>
              <div className="acciones">
                <button type="button" className="enlace-accion" onClick={() => onEditar(config.tipo, o)}>
                  {config.fijo ? 'Renombrar' : 'Editar'}<span className="solo-lector"> {o.nombre}</span>
                </button>
                {!config.fijo && (
                  <button type="button" className={`enlace-accion${o.activo ? ' enlace-accion--peligro' : ''}`}
                    onClick={() => onCambiarActivo(config, o)}>
                    {o.activo ? 'Desactivar' : 'Reactivar'}<span className="solo-lector"> {o.nombre}</span>
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function Catalogos() {
  const consultas = {
    areas: useConsulta(() => api.get('/admin/catalogos/areas', { tamano: 100 }), []),
    categorias: useConsulta(() => api.get('/admin/catalogos/categorias', { tamano: 100 }), []),
    ubicaciones: useConsulta(() => api.get('/admin/catalogos/ubicaciones', { tamano: 100 }), []),
    estados: useConsulta(() => api.get('/admin/catalogos/estados', { tamano: 100 }), []),
    prioridades: useConsulta(() => api.get('/admin/catalogos/prioridades', { tamano: 100 }), []),
  };
  const [edicion, setEdicion] = useState(null); // { tipo, opcion|null }
  const [confirmar, setConfirmar] = useState(null);
  const [procesando, setProcesando] = useState(false);
  const [aviso, setAviso] = useState(null);

  const categoriasPorArea = (consultas.categorias.datos?.items ?? []).reduce((acc, c) => {
    acc[c.area_id] = (acc[c.area_id] ?? 0) + 1;
    return acc;
  }, {});

  const recargar = (tipo) => {
    consultas[tipo].recargar();
    if (tipo === 'categorias') consultas.areas.recargar();
    if (tipo === 'areas') consultas.categorias.recargar();
  };

  const alGuardar = (tipo, opcion, nueva) => {
    setEdicion(null);
    setAviso({ tipo: 'exito', texto: `${nueva ? 'Se creó' : 'Se actualizó'} «${opcion.nombre}».` });
    recargar(tipo);
  };

  const cambiarActivo = async () => {
    const { config, opcion } = confirmar;
    const activar = !opcion.activo;
    setProcesando(true);
    try {
      if (activar) await api.put(`/admin/catalogos/${config.tipo}/${opcion.id}`, { activo: true });
      else await api.del(`/admin/catalogos/${config.tipo}/${opcion.id}`);
      setAviso({ tipo: 'exito', texto: `«${opcion.nombre}» quedó ${activar ? 'activa' : 'desactivada'}.` });
      recargar(config.tipo);
    } catch (err) {
      setAviso({ tipo: 'error', texto: err.message });
    } finally {
      setProcesando(false);
      setConfirmar(null);
    }
  };

  const activar = confirmar && !confirmar.opcion.activo;
  const props = {
    categoriasPorArea,
    onNueva: (tipo) => setEdicion({ tipo, opcion: null }),
    onEditar: (tipo, opcion) => setEdicion({ tipo, opcion }),
    onCambiarActivo: (config, opcion) => setConfirmar({ config, opcion }),
  };

  return (
    <div className="panel-pestanas__cuerpo">
      <div className="pagina__resumen">
        <div>
          <p className="antetitulo">Datos maestros</p>
          <h2 className="panel__titulo" style={{ margin: '4px 0' }}>Gestión de catálogos</h2>
          <p className="texto-secundario">Mantén actualizadas las opciones disponibles al registrar solicitudes.</p>
        </div>
        {edicion === null && (
          <button type="button" className="boton boton--primario" onClick={() => setEdicion({ tipo: 'areas', opcion: null })}>
            <Icono nombre="mas" tamano={18} /> Nuevo elemento
          </button>
        )}
      </div>
      <Mensaje tipo="info">Para preservar el historial, los elementos solo pueden desactivarse. No existe borrado físico.</Mensaje>
      {aviso && (
        <Mensaje tipo={aviso.tipo} onCerrar={() => setAviso(null)}>
          {aviso.texto}
        </Mensaje>
      )}
      {edicion !== null && (
        <FormularioOpcion key={`${edicion.tipo}-${edicion.opcion?.id ?? 'nueva'}`} inicial={edicion.tipo} opcion={edicion.opcion}
          areas={consultas.areas.datos?.items ?? []} onGuardada={alGuardar} onCancelar={() => setEdicion(null)} />
      )}
      <div className="catalogos">
        {EDITABLES.map((t) => (
          <TarjetaCatalogo key={t.tipo} config={t} consulta={consultas[t.tipo]} {...props} />
        ))}
        {TIPOS.filter((t) => t.fijo).map((t) => (
          <TarjetaCatalogo key={t.tipo} config={t} consulta={consultas[t.tipo]} ancha {...props} />
        ))}
      </div>
      <Confirmacion abierto={Boolean(confirmar)} peligro={!activar} ocupado={procesando}
        titulo={`${activar ? 'Reactivar' : 'Desactivar'} ${confirmar?.config.singular ?? ''}`}
        textoConfirmar={activar ? 'Reactivar' : 'Desactivar'}
        onConfirmar={cambiarActivo} onCancelar={() => setConfirmar(null)}>
        {activar ? (
          <p>«{confirmar?.opcion.nombre}» volverá a ofrecerse en los formularios.</p>
        ) : (
          <p>
            «{confirmar?.opcion.nombre}» dejará de ofrecerse en nuevas solicitudes. No se borra: los casos anteriores la
            siguen mostrando.
          </p>
        )}
      </Confirmacion>
    </div>
  );
}

const PESTANAS = [
  { id: 'catalogos', titulo: 'Catálogos' },
  { id: 'politicas', titulo: 'Políticas de plazos' },
  { id: 'auditoria', titulo: 'Auditoría administrativa' },
];

function Pendiente({ historia, texto }) {
  return (
    <div className="panel-pestanas__cuerpo">
      <Mensaje tipo="info" titulo={`Se integra con ${historia}.`}>{texto}</Mensaje>
    </div>
  );
}

export function Configuracion() {
  const [actual, setActual] = useState('catalogos');

  const moverConTeclado = (e) => {
    const i = PESTANAS.findIndex((t) => t.id === actual);
    const destino = { ArrowRight: i + 1, ArrowLeft: i - 1, Home: 0, End: PESTANAS.length - 1 }[e.key];
    if (destino === undefined) return;
    e.preventDefault();
    const siguiente = PESTANAS[(destino + PESTANAS.length) % PESTANAS.length];
    setActual(siguiente.id);
    document.getElementById(`pestana-${siguiente.id}`)?.focus();
  };

  return (
    <section className="pagina" aria-label="Configuración y auditoría">
      <div className="panel panel-pestanas">
        <div className="pestanas" role="tablist" aria-label="Secciones de configuración" onKeyDown={moverConTeclado}>
          {PESTANAS.map((t) => (
            <button key={t.id} id={`pestana-${t.id}`} type="button" role="tab" aria-selected={t.id === actual}
              aria-controls="panel-configuracion" tabIndex={t.id === actual ? 0 : -1} className="pestanas__pestana"
              onClick={() => setActual(t.id)}>
              {t.titulo}
            </button>
          ))}
        </div>
        <div id="panel-configuracion" role="tabpanel" aria-labelledby={`pestana-${actual}`}>
          {actual === 'catalogos' && <Catalogos />}
          {actual === 'politicas' && (
            <Pendiente historia="HU22 Versionar políticas de plazos"
              texto="La política vigente (v1) ya existe en la base con los plazos de la tabla 6. La publicación de nuevas versiones se agrega en esta pestaña." />
          )}
          {actual === 'auditoria' && (
            <Pendiente historia="HU23 Consultar trazabilidad"
              texto="Los eventos administrativos se mostrarán aquí, sin contraseñas ni tokens." />
          )}
        </div>
      </div>
    </section>
  );
}
