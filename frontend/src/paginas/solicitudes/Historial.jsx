/*
 * EM04 · HU23 Historial operativo visible en el detalle (Emanuel).
 * Muestra actor, instante, acción, valores anterior y nuevo y motivo. Es de solo lectura.
 */
import { api } from '../../api/cliente.js';
import { useConsulta } from '../../api/useConsulta.js';
import { Cargando, Mensaje, NOMBRE_ESTADO, NOMBRE_PRIORIDAD } from '../../componentes/index.js';
import { fechaLima } from '../../reglas/prioridad.js';

export const ACCIONES = {
  REGISTRAR: 'Registró la solicitud',
  EVALUAR: 'Inició la evaluación',
  CAMBIAR_PRIORIDAD: 'Cambió la prioridad',
  CAMBIAR_CATEGORIA: 'Cambió la categoría',
  ASIGNAR: 'Asignó un técnico',
  REASIGNAR: 'Reasignó el responsable',
  INICIAR_ATENCION: 'Inició la atención',
  RESOLVER: 'Registró la solución',
  CONFIRMAR: 'Confirmó la solución',
  REABRIR: 'Reabrió la solicitud',
  REABRIR_SIN_TECNICO: 'Reabrió la solicitud (requiere nuevo técnico)',
  CERRAR_AUTOMATICO: 'Cerró la solicitud automáticamente',
  CANCELAR: 'Canceló la solicitud',
  COMENTAR: 'Agregó un comentario',
  ADJUNTAR_EVIDENCIA: 'Adjuntó una imagen',
};

/** Resume el cambio principal de un evento en una línea legible. */
export function describirCambio(e) {
  const a = e.anterior ?? {};
  const n = e.nuevo ?? {};
  if ('tecnico_nombre' in n && e.accion === 'REASIGNAR') return `${a.tecnico_nombre ?? 'Sin asignar'} → ${n.tecnico_nombre}`;
  if (n.tecnico_nombre) return `Responsable: ${n.tecnico_nombre}`;
  if (n.prioridad_codigo && a.prioridad_codigo && n.prioridad_codigo !== a.prioridad_codigo) {
    return `Prioridad ${NOMBRE_PRIORIDAD[a.prioridad_codigo]} → ${NOMBRE_PRIORIDAD[n.prioridad_codigo]}`;
  }
  if (n.categoria_nombre) return `${a.categoria_nombre} → ${n.categoria_nombre}`;
  if (n.duplicada_de) return `Duplicado de ${n.duplicada_de}`;
  if (n.estado_codigo && a.estado_codigo) return `${NOMBRE_ESTADO[a.estado_codigo]} → ${NOMBRE_ESTADO[n.estado_codigo]}`;
  if (n.nombre) return n.nombre;
  return null;
}

export function Historial({ id }) {
  const historial = useConsulta(() => api.get(`/solicitudes/${id}/historial`), [id]);
  return (
    <section className="panel detalle__bloque" aria-labelledby="titulo-historial">
      <h2 id="titulo-historial" className="panel__titulo">Historial</h2>
      {historial.cargando && !historial.datos ? <Cargando /> : historial.error ? (
        <Mensaje tipo="error">{historial.error.message}</Mensaje>
      ) : (
        <ol className="historial">
          {(historial.datos ?? []).map((e) => {
            const cambio = describirCambio(e);
            return (
              <li key={e.id} className="historial__evento">
                <p className="historial__cabecera">
                  <strong>{e.actor_nombre}</strong> · {ACCIONES[e.accion] ?? e.accion}
                  <time className="texto-secundario" dateTime={e.creado_en}> · {fechaLima(e.creado_en)}</time>
                </p>
                {cambio && <p className="historial__cambio">{cambio}</p>}
                {e.motivo && <p className="historial__motivo">{e.accion === 'RESOLVER' ? 'Solución: ' : 'Motivo: '}{e.motivo}</p>}
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
