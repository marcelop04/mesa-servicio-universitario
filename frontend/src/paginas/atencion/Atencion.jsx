/*
 * EM05 · P08 Bandeja y atención del técnico (Emanuel).
 * La bandeja solo contiene asignaciones del técnico autenticado (el servidor filtra por sesión).
 * Reutiliza el detalle de solicitud (AX05) con las acciones de inicio y solución.
 */
import { useState } from 'react';
import { api } from '../../api/cliente.js';
import { useConsulta } from '../../api/useConsulta.js';
import {
  Campo, EtiquetaEstado, EtiquetaPlazo, EtiquetaPrioridad, Paginacion, Tabla,
} from '../../componentes/index.js';
import { fechaLima } from '../../reglas/prioridad.js';
import { DetalleSolicitud } from '../solicitudes/DetalleSolicitud.jsx';
import { AccionesTecnico } from './AccionesAtencion.jsx';

const TAMANO = 10;

export function Atencion() {
  const [estado, setEstado] = useState('PENDIENTES');
  const [pagina, setPagina] = useState(1);
  const [seleccion, setSeleccion] = useState(null);
  const listado = useConsulta(() => api.get('/solicitudes', { estado, orden: 'vencimiento', pagina, tamano: TAMANO }), [estado, pagina]);

  const columnas = [
    {
      clave: 'codigo', titulo: 'Solicitud',
      render: (s) => (
        <div className="celda-doble">
          <button type="button" className="enlace-accion" onClick={() => setSeleccion(s.id)} aria-pressed={seleccion === s.id}>
            {s.codigo}<span className="solo-lector"> · atender</span>
          </button>
          <span className="celda-doble__sub">{s.descripcion}</span>
        </div>
      ),
    },
    { clave: 'ubicacion', titulo: 'Ubicación', render: (s) => <div className="celda-doble"><span>{s.ubicacion_nombre}</span><span className="celda-doble__sub">{s.categoria_nombre}</span></div> },
    { clave: 'prioridad', titulo: 'Prioridad', render: (s) => <EtiquetaPrioridad codigo={s.prioridad_codigo} nombre={s.prioridad_nombre} /> },
    { clave: 'estado', titulo: 'Estado', render: (s) => <EtiquetaEstado codigo={s.estado_codigo} nombre={s.estado_nombre} /> },
    { clave: 'plazo', titulo: 'Plazo', render: (s) => <EtiquetaPlazo nivel={s.nivel_plazo} /> },
    { clave: 'limite', titulo: 'Límite de resolución', render: (s) => fechaLima(s.limite_resolucion) },
  ];

  return (
    <section className="pagina" aria-label="Atención técnica">
      <div className="pagina__resumen">
        <p className="pagina__dato"><strong>{listado.datos?.total ?? '…'} asignaciones</strong> {estado === 'PENDIENTES' ? 'pendientes' : ''} · ordenadas por vencimiento</p>
      </div>
      <form className="panel filtros" role="search" onSubmit={(e) => e.preventDefault()}>
        <Campo id="atencion-estado" como="select" etiqueta="Estado" value={estado}
          onChange={(e) => { setEstado(e.target.value); setPagina(1); }}>
          <option value="PENDIENTES">Pendientes</option>
          <option value="ASIGNADA">Asignadas (por iniciar)</option>
          <option value="EN_ATENCION">En atención</option>
          <option value="RESUELTA">Resueltas (esperando conformidad)</option>
          <option value="">Todas</option>
        </Campo>
      </form>
      <div className="panel panel--tabla">
        <Tabla titulo="Mis asignaciones" columnas={columnas} filas={listado.datos?.items} cargando={listado.cargando}
          error={listado.error} onReintentar={listado.recargar} vacio="No tienes asignaciones con este estado." />
        {listado.datos && (
          <Paginacion pagina={listado.datos.pagina} tamano={listado.datos['tamaño']} total={listado.datos.total}
            onCambiar={setPagina} nombre="asignaciones" />
        )}
      </div>
      {seleccion && (
        <DetalleSolicitud key={seleccion} id={seleccion}
          acciones={(s, recargar) => <AccionesTecnico solicitud={s} recargar={recargar} alCambiar={listado.recargar} />} />
      )}
    </section>
  );
}
