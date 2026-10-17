/*
 * MR07 · P07 Bandeja y evaluación del supervisor (Marcelo).
 * HU07 evaluar y priorizar, HU08 asignar y reasignar con carga por técnico, HU09 cancelar.
 * Diseño de Figma Make (docs/diseno/figma-make/capturas/supervision-1366.png). Las acciones
 * envían la versión de la solicitud; un 409 recarga el caso para que el supervisor revise el cambio.
 */
import { useState } from 'react';
import { api } from '../../api/cliente.js';
import { useConsulta } from '../../api/useConsulta.js';
import {
  Campo, Confirmacion, EtiquetaEstado, EtiquetaPlazo, EtiquetaPrioridad, Mensaje, NOMBRE_ESTADO, NOMBRE_PRIORIDAD,
  Paginacion, Tabla,
} from '../../componentes/index.js';
import {
  IMPACTOS, URGENCIAS, calcularPrioridad, fechaLima, recalcularLimites, validarMotivo,
} from '../../reglas/prioridad.js';

const TAMANO = 10;
const FILTROS = { q: '', area_id: '', categoria_id: '', estado: 'PENDIENTES', prioridad: '', responsable: '', orden: 'prioridad' };
const PENDIENTES = ['REGISTRADA', 'EN_EVALUACION', 'ASIGNADA', 'EN_ATENCION'];

function Segmentos({ nombre, etiqueta, opciones, valor, onCambiar, deshabilitado }) {
  return (
    <fieldset className="segmentos" disabled={deshabilitado}>
      <legend className="campo__etiqueta">{etiqueta}</legend>
      <div className="segmentos__grupo">
        {opciones.map((o) => (
          <label key={o.codigo} className={`segmentos__opcion${valor === o.codigo ? ' segmentos__opcion--activa' : ''}`}>
            <input type="radio" name={nombre} value={o.codigo} checked={valor === o.codigo}
              onChange={() => onCambiar(o.codigo)} />
            {o.nombre}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

/** Paso 1 · HU07. Desde Registrada inicia la evaluación; corregir impacto o urgencia exige motivo. */
function PasoPrioridad({ caso, onAccion }) {
  const [impacto, setImpacto] = useState(caso.impacto);
  const [urgencia, setUrgencia] = useState(caso.urgencia);
  const [motivo, setMotivo] = useState('');
  const [error, setError] = useState(null);
  const registrada = caso.estado_codigo === 'REGISTRADA';
  const cambia = impacto !== caso.impacto || urgencia !== caso.urgencia;
  const prioridad = calcularPrioridad(impacto, urgencia);
  const limites = recalcularLimites(caso.registrada_en, prioridad, caso.matriz_aplicada);

  const enviar = async (e) => {
    e.preventDefault();
    if (!cambia && !registrada) return setError('Modifique el impacto o la urgencia para cambiar la prioridad.');
    const errorMotivo = cambia ? validarMotivo(motivo) : null;
    setError(errorMotivo);
    if (errorMotivo) return;
    const cuerpo = cambia ? { impacto, urgencia, motivo: motivo.trim(), version: caso.version } : { version: caso.version };
    const ok = await onAccion('evaluacion', cuerpo,
      cambia ? `Prioridad actualizada a ${NOMBRE_PRIORIDAD[prioridad]}; límites recalculados desde el registro.`
        : 'Evaluación iniciada: la solicitud pasó a En evaluación.');
    if (ok === false) return;
    setMotivo('');
  };

  return (
    <form className="paso" onSubmit={enviar} noValidate aria-labelledby="paso-prioridad">
      <div className="paso__cabecera">
        <span className="paso__numero paso__numero--aviso" aria-hidden="true">1</span>
        <div>
          <h3 id="paso-prioridad" className="paso__titulo">Prioridad</h3>
          <p className="paso__ayuda">Revisa el impacto y la urgencia declarados.</p>
        </div>
      </div>
      <div className="paso__segmentos">
        <Segmentos nombre="impacto" etiqueta="Impacto seleccionado" opciones={IMPACTOS} valor={impacto} onCambiar={setImpacto} />
        <Segmentos nombre="urgencia" etiqueta="Urgencia seleccionada" opciones={URGENCIAS} valor={urgencia} onCambiar={setUrgencia} />
      </div>
      <div className={`resultado-prioridad resultado-prioridad--${prioridad?.toLowerCase()}`} aria-live="polite">
        <div className="resultado-prioridad__fila">
          <div>
            <span className="resultado-prioridad__titulo">Prioridad resultante</span>
            <strong className="resultado-prioridad__valor">{NOMBRE_PRIORIDAD[prioridad]}</strong>
          </div>
          {limites && (
            <dl className="resultado-prioridad__horas">
              <div><dt>1.ª atención</dt><dd>{limites.horas_primera_atencion} h</dd></div>
              <div><dt>Resolución</dt><dd>{limites.horas_resolucion} h</dd></div>
            </dl>
          )}
        </div>
        {cambia && limites ? (
          <p className="resultado-prioridad__nota">
            Nuevos límites: atención {fechaLima(limites.limite_atencion)} · resolución {fechaLima(limites.limite_resolucion)}.
            Se recalculan sin modificar la fecha de registro original: {fechaLima(caso.registrada_en)}.
          </p>
        ) : (
          <p className="resultado-prioridad__nota">
            Límites actuales: atención {fechaLima(caso.limite_atencion)} · resolución {fechaLima(caso.limite_resolucion)}.
          </p>
        )}
      </div>
      {cambia && (
        <Campo id="motivo-prioridad" como="textarea" etiqueta="Motivo del cambio de prioridad" obligatorio rows={3}
          placeholder="Sustenta la evaluación realizada…" value={motivo} onChange={(e) => setMotivo(e.target.value)}
          error={error} ayuda="Entre 10 y 1000 caracteres. Visible en el historial del caso." maxLength={1000} />
      )}
      {!cambia && error && <p className="campo__mensaje-error">{error}</p>}
      <button type="submit" className="boton boton--primario boton--bloque">
        {registrada && !cambia ? 'Iniciar evaluación' : registrada ? 'Iniciar evaluación y cambiar prioridad' : 'Guardar cambio de prioridad'}
      </button>
    </form>
  );
}

/** Paso 2 · HU08. Técnico activo del área; la carga es apoyo, la asignación es manual. */
function PasoResponsable({ caso, onAccion }) {
  const [tecnicoId, setTecnicoId] = useState('');
  const [motivo, setMotivo] = useState('');
  const [errores, setErrores] = useState({});
  const tecnicos = useConsulta(() => api.get('/supervision/tecnicos', { area_id: caso.area_id }), [caso.area_id]);
  const reasignar = ['ASIGNADA', 'EN_ATENCION'].includes(caso.estado_codigo);
  const bloqueado = caso.estado_codigo === 'REGISTRADA';

  const enviar = async (e) => {
    e.preventDefault();
    const locales = {};
    if (!tecnicoId) locales.tecnico_id = 'Seleccione un técnico.';
    if (reasignar) {
      const m = validarMotivo(motivo);
      if (m) locales.motivo = m;
    }
    setErrores(locales);
    if (Object.keys(locales).length) return;
    const cuerpo = { tecnico_id: Number(tecnicoId), version: caso.version, ...(reasignar ? { motivo: motivo.trim() } : {}) };
    const resultado = await onAccion('asignaciones', cuerpo, reasignar ? 'Responsable reasignado.' : 'Técnico asignado.');
    if (resultado?.porCampo) setErrores(resultado.porCampo);
  };

  return (
    <form className="paso" onSubmit={enviar} noValidate aria-labelledby="paso-responsable">
      <div className="paso__cabecera">
        <span className="paso__numero" aria-hidden="true">2</span>
        <div>
          <h3 id="paso-responsable" className="paso__titulo">Responsable</h3>
          <p className="paso__ayuda">Asigna un técnico activo considerando su carga.</p>
        </div>
      </div>
      {bloqueado && <Mensaje tipo="info">Inicia la evaluación para poder asignar un técnico.</Mensaje>}
      <Campo id="tecnico" como="select" etiqueta="Técnico activo del área" obligatorio value={tecnicoId}
        onChange={(e) => setTecnicoId(e.target.value)} error={errores.tecnico_id} disabled={bloqueado}>
        <option value="">Seleccionar técnico</option>
        {(tecnicos.datos ?? []).filter((t) => t.id !== caso.tecnico_id).map((t) => (
          <option key={t.id} value={t.id}>{t.nombre} ({t.pendientes} pendientes)</option>
        ))}
      </Campo>
      <div className="carga">
        <p className="carga__titulo"><strong>Carga de trabajo por técnico</strong><span>Solicitudes pendientes activas · {caso.area_nombre}</span></p>
        <Tabla titulo="Carga por técnico" filas={tecnicos.datos} cargando={tecnicos.cargando} error={tecnicos.error}
          onReintentar={tecnicos.recargar} vacio="No hay técnicos activos en esta área."
          columnas={[
            { clave: 'nombre', titulo: 'Técnico', render: (t) => <strong>{t.nombre}{t.id === caso.tecnico_id ? ' (actual)' : ''}</strong> },
            { clave: 'pendientes', titulo: 'Pendientes', clase: 'tabla__centro', render: (t) => <span className="contador-circulo">{t.pendientes}</span> },
          ]} />
      </div>
      {reasignar && (
        <Campo id="motivo-reasignacion" como="textarea" etiqueta="Motivo de la reasignación" obligatorio rows={2}
          value={motivo} onChange={(e) => setMotivo(e.target.value)} error={errores.motivo} maxLength={1000}
          ayuda="Reasignar no reinicia fechas ni plazos." />
      )}
      <button type="submit" className="boton boton--primario boton--bloque" disabled={bloqueado}>
        {reasignar ? 'Reasignar' : 'Asignar'}
      </button>
      <p className="paso__nota">El técnico recibirá una notificación inmediata.</p>
    </form>
  );
}

/** HU09 · Cancelación con motivo y, si es duplicado, código del caso original. */
function DialogoCancelar({ caso, abierto, onCerrar, onAccion }) {
  const [motivo, setMotivo] = useState('');
  const [duplicado, setDuplicado] = useState(false);
  const [codigo, setCodigo] = useState('');
  const [errores, setErrores] = useState({});
  const [ocupado, setOcupado] = useState(false);

  const confirmar = async () => {
    const locales = {};
    const m = validarMotivo(motivo);
    if (m) locales.motivo = m;
    if (duplicado && !codigo.trim()) locales.codigo_original = 'Indique el código de la solicitud original.';
    setErrores(locales);
    if (Object.keys(locales).length) return;
    setOcupado(true);
    const resultado = await onAccion('cancelacion',
      { motivo: motivo.trim(), duplicado, codigo_original: duplicado ? codigo.trim() : null, version: caso.version },
      `La solicitud ${caso.codigo} quedó cancelada.`);
    setOcupado(false);
    if (resultado?.porCampo) setErrores(resultado.porCampo);
    else onCerrar();
  };

  return (
    <Confirmacion abierto={abierto} peligro titulo={`Cancelar ${caso.codigo}`} textoConfirmar="Cancelar solicitud"
      ocupado={ocupado} onConfirmar={confirmar} onCancelar={onCerrar}>
      <p>La cancelación queda registrada en el historial y no puede deshacerse.</p>
      <Campo id="motivo-cancelacion" como="textarea" etiqueta="Motivo" obligatorio rows={3} value={motivo}
        onChange={(e) => setMotivo(e.target.value)} error={errores.motivo} maxLength={1000} />
      <label className="casilla">
        <input type="checkbox" checked={duplicado} onChange={(e) => setDuplicado(e.target.checked)} /> Es un duplicado de otra solicitud
      </label>
      {duplicado && (
        <Campo id="codigo-original" etiqueta="Código de la solicitud original" obligatorio placeholder="MSU-2026-0001"
          value={codigo} onChange={(e) => setCodigo(e.target.value)} error={errores.codigo_original} />
      )}
    </Confirmacion>
  );
}

function PanelCaso({ id, onCambio }) {
  const caso = useConsulta(() => api.get(`/solicitudes/${id}`), [id]);
  const [aviso, setAviso] = useState(null);
  const [cancelar, setCancelar] = useState(false);
  const d = caso.datos;

  /** Ejecuta una acción; devuelve el error para mostrarlo junto a los campos. */
  const accion = async (ruta, cuerpo, exito) => {
    try {
      await api.post(`/solicitudes/${id}/${ruta}`, cuerpo);
      setAviso({ tipo: 'exito', texto: exito });
      caso.recargar();
      onCambio();
      return true;
    } catch (err) {
      if (err.esConflicto) {
        setAviso({ tipo: 'aviso', texto: `${err.message} Se recargaron los datos del caso.` });
        caso.recargar();
        onCambio();
      } else {
        setAviso({ tipo: 'error', texto: err.message });
      }
      return err;
    }
  };

  if (!d) return caso.error ? <Mensaje tipo="error">{caso.error.message}</Mensaje> : null;
  const pendiente = PENDIENTES.includes(d.estado_codigo);

  return (
    <section className="caso" aria-labelledby="caso-titulo">
      <header className="caso__cabecera">
        <div>
          <p className="caso__antetitulo">Caso seleccionado · {d.codigo}</p>
          <h2 id="caso-titulo" className="caso__titulo">Evaluación y asignación</h2>
        </div>
        <div className="acciones">
          <EtiquetaPrioridad codigo={d.prioridad_codigo} nombre={d.prioridad_nombre} />
          <EtiquetaEstado codigo={d.estado_codigo} nombre={d.estado_nombre} />
          <EtiquetaPlazo nivel={d.nivel_plazo} />
        </div>
      </header>
      <div className="caso__resumen">
        <p>{d.descripcion}</p>
        <p className="texto-secundario">
          {d.categoria_nombre} · {d.area_nombre} · {d.ubicacion_nombre} · Solicitante: {d.solicitante_nombre} ·
          Registro: {fechaLima(d.registrada_en)} · Responsable: {d.tecnico_nombre ?? 'Sin asignar'}
        </p>
      </div>
      {aviso && <div className="caso__aviso"><Mensaje tipo={aviso.tipo} onCerrar={() => setAviso(null)}>{aviso.texto}</Mensaje></div>}
      {pendiente ? (
        <>
          <div className="caso__pasos" key={d.version}>
            <PasoPrioridad caso={d} onAccion={accion} />
            <PasoResponsable caso={d} onAccion={accion} />
          </div>
          <footer className="caso__pie">
            <div>
              <strong>¿La solicitud no debe continuar?</strong>
              <p className="texto-secundario">La cancelación queda registrada y no puede deshacerse.</p>
            </div>
            <button type="button" className="boton boton--peligro-suave" onClick={() => setCancelar(true)}>Cancelar solicitud</button>
          </footer>
          <DialogoCancelar key={`c-${d.version}`} caso={d} abierto={cancelar} onCerrar={() => setCancelar(false)} onAccion={accion} />
        </>
      ) : (
        <div className="caso__aviso">
          <Mensaje tipo="info">
            Esta solicitud está {d.estado_nombre?.toLowerCase()} y no admite cambios operativos.
            {d.duplicada_de_codigo && ` Duplicado de ${d.duplicada_de_codigo}.`}
          </Mensaje>
        </div>
      )}
    </section>
  );
}

export function Supervision() {
  const [filtros, setFiltros] = useState(FILTROS);
  const [pagina, setPagina] = useState(1);
  const [seleccion, setSeleccion] = useState(null);

  const listado = useConsulta(() => api.get('/solicitudes', { ...filtros, pagina, tamano: TAMANO }), [filtros, pagina]);
  const catalogos = useConsulta(() => api.get('/catalogos'), []);
  const tecnicos = useConsulta(() => api.get('/supervision/tecnicos'), []);
  const areas = catalogos.datos?.areas ?? [];
  const categorias = (catalogos.datos?.categorias ?? []).filter((c) => !filtros.area_id || String(c.area_id) === filtros.area_id);

  const filtrar = (campo) => (e) => {
    const valor = e.target.value;
    setFiltros((f) => ({ ...f, [campo]: valor, ...(campo === 'area_id' ? { categoria_id: '' } : {}) }));
    setPagina(1);
  };

  const columnas = [
    {
      clave: 'codigo', titulo: 'Solicitud',
      render: (s) => (
        <div className="celda-doble">
          <button type="button" className="enlace-accion" onClick={() => setSeleccion(s.id)} aria-pressed={seleccion === s.id}>
            {s.codigo}<span className="solo-lector"> · evaluar</span>
          </button>
          <span className="celda-doble__sub">{s.descripcion}</span>
        </div>
      ),
    },
    { clave: 'area', titulo: 'Área', render: (s) => <div className="celda-doble"><span>{s.area_nombre}</span><span className="celda-doble__sub">{s.categoria_nombre}</span></div> },
    { clave: 'prioridad', titulo: 'Prioridad', render: (s) => <EtiquetaPrioridad codigo={s.prioridad_codigo} nombre={s.prioridad_nombre} /> },
    { clave: 'estado', titulo: 'Estado', render: (s) => <EtiquetaEstado codigo={s.estado_codigo} nombre={s.estado_nombre} /> },
    { clave: 'tecnico', titulo: 'Responsable', render: (s) => s.tecnico_nombre ?? 'Sin asignar' },
    { clave: 'plazo', titulo: 'Plazo', render: (s) => <EtiquetaPlazo nivel={s.nivel_plazo} /> },
    { clave: 'registro', titulo: 'Registro', render: (s) => fechaLima(s.registrada_en) },
  ];

  return (
    <section className="pagina" aria-label="Bandeja de supervisión">
      <div className="pagina__resumen">
        <p className="pagina__dato">
          <strong>{listado.datos?.total ?? '…'} solicitudes</strong> {filtros.estado === 'PENDIENTES' ? 'pendientes' : 'en la consulta'} · horario America/Lima
        </p>
      </div>

      <form className="panel filtros filtros--supervision" role="search" onSubmit={(e) => e.preventDefault()}>
        <Campo id="filtro-q" etiqueta="Código o descripción" type="search" placeholder="Buscar solicitud…" value={filtros.q} onChange={filtrar('q')} />
        <Campo id="filtro-area" como="select" etiqueta="Área" value={filtros.area_id} onChange={filtrar('area_id')}>
          <option value="">Todas las áreas</option>
          {areas.map((a) => <option key={a.id} value={a.id}>{a.nombre}</option>)}
        </Campo>
        <Campo id="filtro-categoria" como="select" etiqueta="Categoría" value={filtros.categoria_id} onChange={filtrar('categoria_id')}>
          <option value="">Todas</option>
          {categorias.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
        </Campo>
        <Campo id="filtro-estado" como="select" etiqueta="Estado" value={filtros.estado} onChange={filtrar('estado')}>
          <option value="PENDIENTES">Pendientes</option>
          <option value="">Todos</option>
          {Object.entries(NOMBRE_ESTADO).map(([c, n]) => <option key={c} value={c}>{n}</option>)}
        </Campo>
        <Campo id="filtro-prioridad" como="select" etiqueta="Prioridad" value={filtros.prioridad} onChange={filtrar('prioridad')}>
          <option value="">Todas</option>
          {Object.entries(NOMBRE_PRIORIDAD).map(([c, n]) => <option key={c} value={c}>{n}</option>)}
        </Campo>
        <Campo id="filtro-responsable" como="select" etiqueta="Responsable" value={filtros.responsable} onChange={filtrar('responsable')}>
          <option value="">Todos</option>
          <option value="SIN_ASIGNAR">Sin asignar</option>
          {(tecnicos.datos ?? []).map((t) => <option key={t.id} value={t.id}>{t.nombre}</option>)}
        </Campo>
        <Campo id="filtro-orden" como="select" etiqueta="Ordenar por" value={filtros.orden} onChange={filtrar('orden')}>
          <option value="prioridad">Prioridad</option>
          <option value="vencimiento">Vencimiento</option>
          <option value="antiguedad">Antigüedad</option>
          <option value="recientes">Más recientes</option>
        </Campo>
        <div className="filtros__acciones">
          <button type="button" className="boton boton--enlace" onClick={() => { setFiltros(FILTROS); setPagina(1); }}>Limpiar filtros</button>
        </div>
      </form>

      <div className="panel panel--tabla">
        <div className="panel__encabezado">
          <div>
            <h2 className="panel__titulo">Solicitudes de la facultad</h2>
            <p className="texto-secundario">Selecciona un caso para evaluar y asignar.</p>
          </div>
        </div>
        <Tabla titulo="Solicitudes de la facultad" columnas={columnas} filas={listado.datos?.items}
          cargando={listado.cargando} error={listado.error} onReintentar={listado.recargar}
          vacio="No hay solicitudes que coincidan con los filtros." />
        {listado.datos && (
          <Paginacion pagina={listado.datos.pagina} tamano={listado.datos['tamaño']} total={listado.datos.total}
            onCambiar={setPagina} nombre="solicitudes" />
        )}
      </div>

      {seleccion && <PanelCaso key={seleccion} id={seleccion} onCambio={() => { listado.recargar(); tecnicos.recargar(); }} />}
    </section>
  );
}
