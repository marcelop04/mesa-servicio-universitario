/*
 * HU13 · Encuesta de satisfacción en P06 (Emanuel, fase III).
 * Aparece solo al solicitante cuando la solicitud está Cerrada. Es opcional y única: una vez enviada
 * muestra la respuesta registrada. No cambia el estado del caso, por eso no envía la versión.
 */
import { useState } from 'react';
import { api } from '../../api/cliente.js';
import { useConsulta } from '../../api/useConsulta.js';
import { Campo, Mensaje } from '../../componentes/index.js';
import { fechaLima } from '../../reglas/prioridad.js';

export const COMENTARIO_MAX = 500;
export const NIVELES = [
  { valor: 1, texto: 'Muy insatisfecho' },
  { valor: 2, texto: 'Insatisfecho' },
  { valor: 3, texto: 'Regular' },
  { valor: 4, texto: 'Satisfecho' },
  { valor: 5, texto: 'Muy satisfecho' },
];

export function validarEncuesta({ calificacion, comentario }) {
  const errores = {};
  if (!Number.isInteger(calificacion) || calificacion < 1 || calificacion > 5) {
    errores.calificacion = 'Elige una calificación de 1 a 5.';
  }
  const texto = (comentario ?? '').trim();
  if (texto.length > COMENTARIO_MAX) {
    errores.comentario = `El comentario admite como máximo ${COMENTARIO_MAX} caracteres (tiene ${texto.length}).`;
  }
  return errores;
}

function Estrellas({ valor }) {
  return (
    <span className="encuesta__estrellas" aria-hidden="true">
      {'★'.repeat(valor)}
      <span className="encuesta__estrellas-vacias">{'★'.repeat(5 - valor)}</span>
    </span>
  );
}

function Respuesta({ encuesta, recienEnviada }) {
  const nivel = NIVELES.find((n) => n.valor === encuesta.calificacion);
  return (
    <>
      {recienEnviada && <Mensaje tipo="exito">Gracias: recibimos tu calificación.</Mensaje>}
      <p className="encuesta__resultado">
        <Estrellas valor={encuesta.calificacion} />
        <span>
          Calificaste con <strong>{encuesta.calificacion} de 5</strong> ({nivel?.texto}) el {fechaLima(encuesta.creada_en)}.
        </span>
      </p>
      {encuesta.comentario && <blockquote className="encuesta__comentario">{encuesta.comentario}</blockquote>}
    </>
  );
}

export function EncuestaSatisfaccion({ solicitud }) {
  const cerrada = solicitud.estado_codigo === 'CERRADA';
  const consulta = useConsulta(
    () => (cerrada ? api.get(`/solicitudes/${solicitud.id}/encuesta`) : Promise.resolve(null)),
    [solicitud.id, cerrada],
  );
  const [calificacion, setCalificacion] = useState(null);
  const [comentario, setComentario] = useState('');
  const [errores, setErrores] = useState({});
  const [error, setError] = useState(null);
  const [enviando, setEnviando] = useState(false);
  const [enviada, setEnviada] = useState(null);

  if (!cerrada) return null;

  const enviar = async (e) => {
    e.preventDefault();
    const locales = validarEncuesta({ calificacion, comentario });
    setErrores(locales);
    setError(null);
    if (Object.keys(locales).length) return;
    setEnviando(true);
    try {
      const texto = comentario.trim();
      setEnviada(await api.post(`/solicitudes/${solicitud.id}/encuesta`, { calificacion, comentario: texto || null }));
    } catch (err) {
      setErrores(err.porCampo ?? {});
      setError(err.message);
      if (err.codigo === 'ENCUESTA_DUPLICADA') consulta.recargar();
    } finally {
      setEnviando(false);
    }
  };

  const registrada = enviada ?? consulta.datos;

  return (
    <section className="panel encuesta" aria-labelledby="titulo-encuesta">
      <h2 id="titulo-encuesta" className="panel__titulo">¿Cómo calificas la atención?</h2>
      {consulta.cargando && !registrada ? (
        <p className="cargando" role="status">Cargando…</p>
      ) : consulta.error ? (
        <Mensaje tipo="error" titulo="No se pudo cargar la encuesta."
          accion={<button type="button" className="boton boton--secundario" onClick={consulta.recargar}>Reintentar</button>}>
          {consulta.error.message}
        </Mensaje>
      ) : registrada ? (
        <Respuesta encuesta={registrada} recienEnviada={Boolean(enviada)} />
      ) : (
        <form onSubmit={enviar} noValidate>
          <p className="texto-secundario">
            Es opcional y se responde una sola vez. Tu opinión no cambia la solución ni el estado de la solicitud.
          </p>
          {error && <div style={{ margin: '12px 0' }}><Mensaje tipo="error">{error}</Mensaje></div>}
          <fieldset className={`encuesta__opciones${errores.calificacion ? ' campo--error' : ''}`}
            aria-describedby={errores.calificacion ? 'encuesta-calificacion-error' : undefined}>
            <legend className="campo__etiqueta">
              Calificación <span className="campo__obligatorio" aria-hidden="true">*</span>
              <span className="solo-lector"> (obligatorio)</span>
            </legend>
            <div className="encuesta__niveles">
              {NIVELES.map((n) => (
                <label key={n.valor} className={`encuesta__nivel${calificacion === n.valor ? ' encuesta__nivel--activo' : ''}`}>
                  <input type="radio" name="calificacion" value={n.valor} checked={calificacion === n.valor}
                    onChange={() => { setCalificacion(n.valor); setErrores(({ calificacion: _, ...resto }) => resto); }} />
                  <span className="encuesta__numero">{n.valor}</span>
                  <span className="encuesta__texto">{n.texto}</span>
                </label>
              ))}
            </div>
            {errores.calificacion && (
              <p id="encuesta-calificacion-error" className="campo__mensaje-error">{errores.calificacion}</p>
            )}
          </fieldset>
          <Campo id="encuesta-comentario" como="textarea" etiqueta="Comentario (opcional)" rows={3}
            maxLength={COMENTARIO_MAX} value={comentario} error={errores.comentario}
            onChange={(e) => setComentario(e.target.value)}
            ayuda={`Hasta ${COMENTARIO_MAX} caracteres. Quedan ${COMENTARIO_MAX - comentario.length}.`} />
          <div className="formulario__acciones">
            <button type="submit" className="boton boton--primario" disabled={enviando}>
              {enviando ? 'Enviando…' : 'Enviar calificación'}
            </button>
          </div>
        </form>
      )}
    </section>
  );
}
