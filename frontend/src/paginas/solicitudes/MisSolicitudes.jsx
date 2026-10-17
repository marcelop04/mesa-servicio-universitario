/*
 * AX04 · P05 Mis solicitudes (Alex) · HU05 Consultar solicitudes propias.
 * AX06: los filtros se guardan en LocalStorage y se recuperan al volver a la pantalla.
 * El servidor solo devuelve solicitudes propias (el filtro por usuario no depende del cliente).
 */
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api/cliente.js';
import { useConsulta } from '../../api/useConsulta.js';
import {
  Campo, EtiquetaEstado, EtiquetaPlazo, EtiquetaPrioridad, Icono, NOMBRE_ESTADO, NOMBRE_PRIORIDAD, Paginacion, Tabla,
} from '../../componentes/index.js';
import { fechaLima } from '../../reglas/prioridad.js';

export const CLAVE_FILTROS = 'msu.misSolicitudes.filtros';
export const FILTROS_INICIALES = { q: '', estado: '', categoria_id: '', prioridad: '', desde: '', hasta: '' };
const TAMANO = 10;

/** Lectura tolerante: una sesión privada o datos corruptos vuelven a los filtros iniciales. */
export function leerFiltros() {
  try {
    const guardados = JSON.parse(window.localStorage.getItem(CLAVE_FILTROS) ?? 'null');
    return guardados && typeof guardados === 'object' ? { ...FILTROS_INICIALES, ...guardados } : FILTROS_INICIALES;
  } catch {
    return FILTROS_INICIALES;
  }
}

function guardarFiltros(filtros) {
  try {
    window.localStorage.setItem(CLAVE_FILTROS, JSON.stringify(filtros));
  } catch {
    // Sin almacenamiento disponible los filtros solo duran mientras la pantalla está abierta.
  }
}

export function MisSolicitudes() {
  const [filtros, setFiltros] = useState(leerFiltros);
  const [pagina, setPagina] = useState(1);
  const listado = useConsulta(() => api.get('/solicitudes', { ...filtros, pagina, tamano: TAMANO }), [filtros, pagina]);
  const catalogos = useConsulta(() => api.get('/catalogos', { tipo: 'categorias' }), []);
  const hayFiltros = Object.entries(filtros).some(([c, v]) => v !== FILTROS_INICIALES[c]);

  useEffect(() => guardarFiltros(filtros), [filtros]);

  const filtrar = (campo) => (e) => {
    setFiltros((f) => ({ ...f, [campo]: e.target.value }));
    setPagina(1);
  };

  const columnas = [
    {
      clave: 'codigo', titulo: 'Solicitud',
      render: (s) => (
        <div className="celda-doble">
          <Link to={`/solicitudes/${s.id}`}>{s.codigo}</Link>
          <span className="celda-doble__sub">{s.descripcion}</span>
        </div>
      ),
    },
    { clave: 'categoria', titulo: 'Categoría', render: (s) => <div className="celda-doble"><span>{s.categoria_nombre}</span><span className="celda-doble__sub">{s.ubicacion_nombre}</span></div> },
    { clave: 'estado', titulo: 'Estado', render: (s) => <EtiquetaEstado codigo={s.estado_codigo} nombre={s.estado_nombre} /> },
    { clave: 'prioridad', titulo: 'Prioridad', render: (s) => <EtiquetaPrioridad codigo={s.prioridad_codigo} nombre={s.prioridad_nombre} /> },
    { clave: 'tecnico', titulo: 'Responsable', render: (s) => s.tecnico_nombre ?? 'Sin asignar' },
    { clave: 'plazo', titulo: 'Plazo', render: (s) => <EtiquetaPlazo nivel={s.nivel_plazo} /> },
    { clave: 'registro', titulo: 'Registro', render: (s) => fechaLima(s.registrada_en) },
  ];

  return (
    <section className="pagina" aria-label="Mis solicitudes">
      <div className="pagina__resumen">
        <p className="pagina__dato"><strong>{listado.datos?.total ?? '…'} solicitudes</strong> {hayFiltros ? 'con los filtros aplicados' : 'registradas'}</p>
        <Link className="boton boton--primario" to="/solicitudes/nueva"><Icono nombre="mas" tamano={18} /> Nueva solicitud</Link>
      </div>

      <form className="panel filtros filtros--supervision" role="search" onSubmit={(e) => e.preventDefault()}>
        <Campo id="mis-q" etiqueta="Código o descripción" type="search" placeholder="MSU-2026-…" value={filtros.q} onChange={filtrar('q')} />
        <Campo id="mis-estado" como="select" etiqueta="Estado" value={filtros.estado} onChange={filtrar('estado')}>
          <option value="">Todos</option>
          <option value="PENDIENTES">Pendientes</option>
          {Object.entries(NOMBRE_ESTADO).map(([c, n]) => <option key={c} value={c}>{n}</option>)}
        </Campo>
        <Campo id="mis-categoria" como="select" etiqueta="Categoría" value={filtros.categoria_id} onChange={filtrar('categoria_id')}>
          <option value="">Todas</option>
          {(catalogos.datos ?? []).map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
        </Campo>
        <Campo id="mis-prioridad" como="select" etiqueta="Prioridad" value={filtros.prioridad} onChange={filtrar('prioridad')}>
          <option value="">Todas</option>
          {Object.entries(NOMBRE_PRIORIDAD).map(([c, n]) => <option key={c} value={c}>{n}</option>)}
        </Campo>
        <Campo id="mis-desde" etiqueta="Registrada desde" type="date" value={filtros.desde} onChange={filtrar('desde')} />
        <Campo id="mis-hasta" etiqueta="Registrada hasta" type="date" value={filtros.hasta} onChange={filtrar('hasta')} />
        <div className="filtros__acciones">
          {hayFiltros && (
            <button type="button" className="boton boton--enlace" onClick={() => { setFiltros(FILTROS_INICIALES); setPagina(1); }}>
              Limpiar filtros
            </button>
          )}
        </div>
      </form>

      <div className="panel panel--tabla">
        <Tabla titulo="Mis solicitudes" columnas={columnas} filas={listado.datos?.items} cargando={listado.cargando}
          error={listado.error} onReintentar={listado.recargar}
          vacio={hayFiltros ? 'Ninguna solicitud coincide con los filtros. Prueba con otros criterios.'
            : 'Aún no registraste solicitudes. Usa «Nueva solicitud» para reportar un problema.'} />
        {listado.datos && (
          <Paginacion pagina={listado.datos.pagina} tamano={listado.datos['tamaño']} total={listado.datos.total}
            onCambiar={setPagina} nombre="solicitudes" />
        )}
      </div>
    </section>
  );
}
