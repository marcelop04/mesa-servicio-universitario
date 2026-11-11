/*
 * P09 · Centro de notificaciones (HU16). Avisos internos del usuario: asignaciones, cambios de estado,
 * comentarios y alertas de plazos (HU15). No se envían por correo. Al abrir la solicitud el servidor
 * vuelve a comprobar el acceso actual.
 */
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api/cliente.js';
import { useConsulta } from '../../api/useConsulta.js';
import { Confirmacion, Etiqueta, Mensaje, Paginacion, Cargando } from '../../componentes/index.js';
import { fechaLima } from '../../reglas/prioridad.js';

/** Avisa al encabezado para que actualice el contador de la campana. */
export const EVENTO_AVISOS = 'msu:avisos';
const avisarCambio = () => window.dispatchEvent(new Event(EVENTO_AVISOS));

const TIPOS = {
  VENCIMIENTO: { tono: 'peligro', texto: 'Plazo vencido' },
  ALERTA_PLAZO: { tono: 'aviso', texto: 'Plazo al 80 %' },
  REGISTRO: { tono: 'info', texto: 'Nueva solicitud' },
  ASIGNACION: { tono: 'info', texto: 'Asignación' },
  REASIGNACION: { tono: 'info', texto: 'Reasignación' },
  PRIORIDAD: { tono: 'info', texto: 'Prioridad' },
  ESTADO: { tono: 'info', texto: 'Estado' },
  RESOLUCION: { tono: 'exito', texto: 'Resuelta' },
  CIERRE: { tono: 'exito', texto: 'Cierre' },
  REAPERTURA: { tono: 'aviso', texto: 'Reapertura' },
  CANCELACION: { tono: 'neutro', texto: 'Cancelación' },
  COMENTARIO: { tono: 'neutro', texto: 'Comentario' },
};
const TAMANO = 15;

export function Notificaciones() {
  const [soloNoLeidas, setSoloNoLeidas] = useState(false);
  const [pagina, setPagina] = useState(1);
  const [borrar, setBorrar] = useState(null);
  const [error, setError] = useState(null);
  const lista = useConsulta(() => api.get('/notificaciones', { no_leidas: soloNoLeidas || undefined, pagina, tamano: TAMANO }),
    [soloNoLeidas, pagina]);
  const avisos = lista.datos?.items ?? [];

  const ejecutar = async (accion) => {
    setError(null);
    try {
      await accion();
      lista.recargar();
      avisarCambio();
    } catch (err) {
      setError(err.message);
    }
  };

  const filtrar = (valor) => {
    setSoloNoLeidas(valor);
    setPagina(1);
  };

  return (
    <section className="pagina" aria-label="Centro de notificaciones">
      <div className="pagina__resumen">
        <div className="segmentos__grupo segmentos__grupo--compacto" role="group" aria-label="Filtrar avisos">
          <button type="button" className={`segmentos__opcion${!soloNoLeidas ? ' segmentos__opcion--activa' : ''}`}
            aria-pressed={!soloNoLeidas} onClick={() => filtrar(false)}>Todos</button>
          <button type="button" className={`segmentos__opcion${soloNoLeidas ? ' segmentos__opcion--activa' : ''}`}
            aria-pressed={soloNoLeidas} onClick={() => filtrar(true)}>No leídos</button>
        </div>
        <button type="button" className="boton boton--secundario" disabled={!avisos.some((a) => !a.leida)}
          onClick={() => ejecutar(() => api.put('/notificaciones/lectura'))}>
          Marcar todos como leídos
        </button>
      </div>

      {error && <Mensaje tipo="error" onCerrar={() => setError(null)}>{error}</Mensaje>}

      <div className="panel">
        {lista.cargando && !lista.datos ? <Cargando /> : lista.error ? (
          <Mensaje tipo="error" titulo="No se pudieron cargar los avisos.">{lista.error.message}</Mensaje>
        ) : avisos.length === 0 ? (
          <p className="tabla__vacia">{soloNoLeidas ? 'No tienes avisos sin leer.' : 'Aún no tienes avisos.'}</p>
        ) : (
          <ul className="avisos">
            {avisos.map((a) => {
              const tipo = TIPOS[a.tipo] ?? { tono: 'neutro', texto: a.tipo };
              return (
                <li key={a.id} className={`aviso${a.leida ? '' : ' aviso--nuevo'}`}>
                  <div className="aviso__cuerpo">
                    <p className="aviso__cabecera">
                      <Etiqueta tono={tipo.tono}>{tipo.texto}</Etiqueta>
                      {!a.leida && <span className="aviso__punto">No leído</span>}
                      <time className="texto-secundario" dateTime={a.creada_en}>{fechaLima(a.creada_en)}</time>
                    </p>
                    <p className="aviso__texto">{a.texto}</p>
                  </div>
                  <div className="aviso__acciones">
                    <Link className="enlace-accion" to={`/solicitudes/${a.solicitud_id}`}
                      onClick={() => !a.leida && api.put(`/notificaciones/${a.id}/lectura`).then(avisarCambio).catch(() => {})}>
                      Ver {a.solicitud_codigo}
                    </Link>
                    {!a.leida && (
                      <button type="button" className="enlace-accion"
                        onClick={() => ejecutar(() => api.put(`/notificaciones/${a.id}/lectura`))}>
                        Marcar como leído
                      </button>
                    )}
                    <button type="button" className="enlace-accion enlace-accion--peligro" onClick={() => setBorrar(a)}>
                      Eliminar<span className="solo-lector"> aviso de {a.solicitud_codigo}</span>
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
        {lista.datos && (
          <Paginacion pagina={lista.datos.pagina} tamano={lista.datos['tamaño']} total={lista.datos.total}
            onCambiar={setPagina} nombre="avisos" />
        )}
      </div>

      <Confirmacion abierto={Boolean(borrar)} peligro titulo="Eliminar aviso" textoConfirmar="Eliminar"
        onCancelar={() => setBorrar(null)}
        onConfirmar={() => { const a = borrar; setBorrar(null); ejecutar(() => api.del(`/notificaciones/${a.id}`)); }}>
        <p>Se borra solo este aviso. El historial de la solicitud {borrar?.solicitud_codigo} no cambia.</p>
      </Confirmacion>
    </section>
  );
}
