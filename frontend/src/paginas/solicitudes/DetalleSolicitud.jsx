/*
 * AX05 · Detalle de solicitud reutilizable (Alex). Base de P06 (solicitante) y P08 (técnico):
 * cada pantalla pasa sus acciones por props y el detalle se encarga de datos, plazos,
 * comentarios y evidencias (HU05, HU06). El servidor vuelve a comprobar el acceso en cada petición.
 *
 * Uso: <DetalleSolicitud id={7} acciones={(solicitud, recargar) => <MisBotones … />} />
 */
import { useState } from 'react';
import { api } from '../../api/cliente.js';
import { useConsulta } from '../../api/useConsulta.js';
import {
  Campo, Cargando, EtiquetaEstado, EtiquetaPlazo, EtiquetaPrioridad, Mensaje,
} from '../../componentes/index.js';
import { fechaLima } from '../../reglas/prioridad.js';
import { Historial } from './Historial.jsx';

export const EVIDENCIAS_MAX = 3;
export const BYTES_MAX = 5 * 1024 * 1024;
const TIPOS = ['image/jpeg', 'image/png'];
const ACTIVA = (estado) => !['CERRADA', 'CANCELADA'].includes(estado);
const NOMBRE_IMPACTO = { ALTO: 'Alto', MEDIO: 'Medio', BAJO: 'Bajo' };
const NOMBRE_URGENCIA = { ALTA: 'Alta', MEDIA: 'Media', BAJA: 'Baja' };

/** Validación en el cliente; el servidor revisa además la firma real del archivo. */
export function validarImagen(archivo, cantidadActual = 0) {
  if (!archivo) return 'Seleccione una imagen JPEG o PNG.';
  if (!TIPOS.includes(archivo.type)) return 'Solo se admiten imágenes JPEG o PNG.';
  if (archivo.size > BYTES_MAX) return 'La imagen supera el máximo de 5 MB.';
  if (cantidadActual >= EVIDENCIAS_MAX) return `La solicitud ya tiene ${EVIDENCIAS_MAX} imágenes, el máximo permitido.`;
  return null;
}

function tamano(bytes) {
  return bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

function Comentarios({ id, activa }) {
  const lista = useConsulta(() => api.get(`/solicitudes/${id}/comentarios`), [id]);
  const [texto, setTexto] = useState('');
  const [error, setError] = useState(null);
  const [enviando, setEnviando] = useState(false);

  const enviar = async (e) => {
    e.preventDefault();
    const limpio = texto.trim();
    if (!limpio || limpio.length > 1000) return setError('El comentario debe tener entre 1 y 1000 caracteres.');
    setEnviando(true);
    setError(null);
    try {
      await api.post(`/solicitudes/${id}/comentarios`, { texto: limpio });
      setTexto('');
      lista.recargar();
    } catch (err) {
      setError(err.porCampo?.texto ?? err.message);
    } finally {
      setEnviando(false);
    }
  };

  return (
    <section className="panel detalle__bloque" aria-labelledby="titulo-comentarios">
      <h2 id="titulo-comentarios" className="panel__titulo">Comentarios</h2>
      {lista.cargando && !lista.datos ? <Cargando /> : lista.error ? <Mensaje tipo="error">{lista.error.message}</Mensaje> : (
        lista.datos?.length ? (
          <ol className="comentarios">
            {lista.datos.map((c) => (
              <li key={c.id} className="comentario">
                <p className="comentario__autor"><strong>{c.autor_nombre}</strong> · {fechaLima(c.creado_en)}</p>
                <p className="comentario__texto">{c.texto}</p>
              </li>
            ))}
          </ol>
        ) : <p className="texto-secundario">Aún no hay comentarios.</p>
      )}
      {activa && (
        <form onSubmit={enviar} noValidate className="comentario__formulario">
          <Campo id="nuevo-comentario" como="textarea" etiqueta="Agregar comentario" rows={3} maxLength={1000}
            value={texto} onChange={(e) => setTexto(e.target.value)} error={error}
            ayuda="Los comentarios no se editan ni se eliminan." />
          <button type="submit" className="boton boton--primario" disabled={enviando}>
            {enviando ? 'Enviando…' : 'Comentar'}
          </button>
        </form>
      )}
    </section>
  );
}

function Evidencias({ id, activa }) {
  const lista = useConsulta(() => api.get(`/solicitudes/${id}/evidencias`), [id]);
  const [error, setError] = useState(null);
  const [subiendo, setSubiendo] = useState(false);
  const cantidad = lista.datos?.length ?? 0;

  const subir = async (e) => {
    const archivo = e.target.files?.[0];
    e.target.value = '';
    const problema = validarImagen(archivo, cantidad);
    setError(problema);
    if (problema) return;
    setSubiendo(true);
    try {
      await api.subir(`/solicitudes/${id}/evidencias`, { archivo });
      lista.recargar();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubiendo(false);
    }
  };

  return (
    <section className="panel detalle__bloque" aria-labelledby="titulo-evidencias">
      <h2 id="titulo-evidencias" className="panel__titulo">Evidencias ({cantidad} de {EVIDENCIAS_MAX})</h2>
      {lista.datos?.length ? (
        <ul className="evidencias">
          {lista.datos.map((ev) => (
            <li key={ev.id}>
              <a href={ev.url} target="_blank" rel="noopener noreferrer">{ev.nombre_original}</a>
              <span className="texto-secundario"> · {tamano(ev.bytes)} · {ev.autor_nombre}</span>
            </li>
          ))}
        </ul>
      ) : !lista.cargando && <p className="texto-secundario">Sin imágenes adjuntas.</p>}
      {error && <Mensaje tipo="error">{error}</Mensaje>}
      {activa && cantidad < EVIDENCIAS_MAX && (
        <label className="boton boton--secundario evidencias__subir">
          {subiendo ? 'Subiendo…' : 'Adjuntar imagen'}
          <input type="file" accept="image/jpeg,image/png" onChange={subir} disabled={subiendo} className="solo-lector" />
        </label>
      )}
      <p className="campo__ayuda">JPEG o PNG de hasta 5 MB. Los archivos solo se descargan con una sesión autorizada.</p>
    </section>
  );
}

export function DetalleSolicitud({ id, acciones }) {
  const detalle = useConsulta(() => api.get(`/solicitudes/${id}`), [id]);
  const s = detalle.datos;

  if (detalle.cargando && !s) return <Cargando texto="Cargando la solicitud…" />;
  if (detalle.error) {
    return (
      <Mensaje tipo="error" titulo="No se pudo abrir la solicitud."
        accion={<button type="button" className="boton boton--secundario" onClick={detalle.recargar}>Reintentar</button>}>
        {detalle.error.message}
      </Mensaje>
    );
  }

  const activa = ACTIVA(s.estado_codigo);
  return (
    <div className="detalle">
      <section className="panel detalle__cabecera" aria-labelledby="titulo-detalle">
        <div>
          <p className="antetitulo">Solicitud</p>
          <h2 id="titulo-detalle" className="detalle__codigo">{s.codigo}</h2>
          <p className="detalle__descripcion">{s.descripcion}</p>
        </div>
        <div className="acciones">
          <EtiquetaEstado codigo={s.estado_codigo} nombre={s.estado_nombre} />
          <EtiquetaPrioridad codigo={s.prioridad_codigo} nombre={s.prioridad_nombre} />
          <EtiquetaPlazo nivel={s.nivel_plazo} />
        </div>
      </section>

      {acciones && <div className="detalle__acciones">{acciones(s, detalle.recargar)}</div>}

      <div className="detalle__rejilla">
        <section className="panel detalle__bloque" aria-labelledby="titulo-datos">
          <h2 id="titulo-datos" className="panel__titulo">Datos del caso</h2>
          <dl className="datos">
            <dt>Categoría</dt><dd>{s.categoria_nombre} · {s.area_nombre}</dd>
            <dt>Ubicación</dt><dd>{s.ubicacion_nombre}{s.referencia ? ` (${s.referencia})` : ''}</dd>
            <dt>Impacto y urgencia</dt><dd>{NOMBRE_IMPACTO[s.impacto]} · {NOMBRE_URGENCIA[s.urgencia]}</dd>
            <dt>Solicitante</dt><dd>{s.solicitante_nombre}</dd>
            <dt>Responsable</dt><dd>{s.tecnico_nombre ?? 'Sin asignar'}</dd>
            {s.duplicada_de_codigo && (<><dt>Duplicado de</dt><dd>{s.duplicada_de_codigo}</dd></>)}
          </dl>
        </section>
        <section className="panel detalle__bloque" aria-labelledby="titulo-plazos">
          <h2 id="titulo-plazos" className="panel__titulo">Fechas y plazos</h2>
          <dl className="datos">
            <dt>Registro</dt><dd>{fechaLima(s.registrada_en)}</dd>
            <dt>Límite de primera atención</dt><dd>{fechaLima(s.limite_atencion)}</dd>
            <dt>Primera atención</dt><dd>{s.primera_atencion_en ? fechaLima(s.primera_atencion_en) : 'Pendiente'}</dd>
            <dt>Límite de resolución</dt><dd>{fechaLima(s.limite_resolucion)}</dd>
            {s.ultima_resolucion_en && (<><dt>Resolución</dt><dd>{fechaLima(s.ultima_resolucion_en)}</dd></>)}
            {s.cerrada_en && (<><dt>Cierre</dt><dd>{fechaLima(s.cerrada_en)}</dd></>)}
            {s.cancelada_en && (<><dt>Cancelación</dt><dd>{fechaLima(s.cancelada_en)}</dd></>)}
          </dl>
          <p className="campo__ayuda">Horas corridas desde el registro, según la política v{s.politica_version}. Hora de Lima.</p>
        </section>
      </div>

      <div className="detalle__rejilla">
        <Comentarios id={s.id} activa={activa} />
        <Evidencias id={s.id} activa={activa} />
      </div>

      <Historial key={s.version} id={s.id} />
    </div>
  );
}
