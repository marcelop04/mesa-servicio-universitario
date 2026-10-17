/*
 * AX04 · P04 Nueva solicitud (Alex) · HU04 Registrar una solicitud.
 * Valida en el cliente con los mismos límites del servidor, muestra la prioridad en vivo
 * (tabla 5) y, tras registrar, sube las imágenes opcionales (HU06).
 */
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api/cliente.js';
import { useConsulta } from '../../api/useConsulta.js';
import { Campo, EtiquetaPrioridad, Mensaje } from '../../componentes/index.js';
import { fechaLima, calcularPrioridad } from '../../reglas/prioridad.js';
import { EVIDENCIAS_MAX, validarImagen } from './DetalleSolicitud.jsx';

const VACIO = { categoria_id: '', ubicacion_id: '', referencia: '', descripcion: '', impacto: '', urgencia: '' };

const IMPACTOS = [
  { codigo: 'ALTO', nombre: 'Alto', ejemplo: 'Varias aulas o un servicio compartido.' },
  { codigo: 'MEDIO', nombre: 'Medio', ejemplo: 'Un aula o un grupo.' },
  { codigo: 'BAJO', nombre: 'Bajo', ejemplo: 'Una persona, sin interrupción general.' },
];
const URGENCIAS = [
  { codigo: 'ALTA', nombre: 'Alta', ejemplo: 'Actividad detenida sin alternativa.' },
  { codigo: 'MEDIA', nombre: 'Media', ejemplo: 'Actividad degradada con alternativa temporal.' },
  { codigo: 'BAJA', nombre: 'Baja', ejemplo: 'Puede programarse sin interrumpir la actividad.' },
];

export function validarSolicitud(d) {
  const errores = {};
  if (!d.categoria_id) errores.categoria_id = 'Selecciona la categoría del problema.';
  if (!d.ubicacion_id) errores.ubicacion_id = 'Selecciona la ubicación donde ocurre el problema.';
  const descripcion = d.descripcion.trim();
  if (descripcion.length < 20) errores.descripcion = `La descripción debe tener al menos 20 caracteres (tiene ${descripcion.length}).`;
  else if (descripcion.length > 2000) errores.descripcion = 'La descripción supera el máximo de 2000 caracteres.';
  if (d.referencia.trim().length > 200) errores.referencia = 'La referencia admite hasta 200 caracteres.';
  if (!d.impacto) errores.impacto = 'Indica el impacto: Alto, Medio o Bajo.';
  if (!d.urgencia) errores.urgencia = 'Indica la urgencia: Alta, Media o Baja.';
  return errores;
}

function Opciones({ nombre, etiqueta, opciones, valor, onCambiar, error }) {
  return (
    <fieldset className={`opciones${error ? ' campo--error' : ''}`} aria-describedby={error ? `${nombre}-error` : undefined}>
      <legend className="campo__etiqueta">{etiqueta} <span className="campo__obligatorio" aria-hidden="true">*</span></legend>
      {opciones.map((o) => (
        <label key={o.codigo} className={`opcion${valor === o.codigo ? ' opcion--activa' : ''}`}>
          <input type="radio" name={nombre} value={o.codigo} checked={valor === o.codigo} onChange={() => onCambiar(o.codigo)} />
          <span><strong>{o.nombre}</strong><span className="opcion__ejemplo">{o.ejemplo}</span></span>
        </label>
      ))}
      {error && <p id={`${nombre}-error`} className="campo__mensaje-error">{error}</p>}
    </fieldset>
  );
}

export function NuevaSolicitud() {
  const catalogos = useConsulta(() => api.get('/catalogos'), []);
  const [datos, setDatos] = useState(VACIO);
  const [archivos, setArchivos] = useState([]);
  const [errores, setErrores] = useState({});
  const [error, setError] = useState(null);
  const [enviando, setEnviando] = useState(false);
  const [creada, setCreada] = useState(null);

  const cambiar = (campo) => (e) => setDatos((d) => ({ ...d, [campo]: e.target.value }));
  const fijar = (campo) => (valor) => setDatos((d) => ({ ...d, [campo]: valor }));
  const prioridad = calcularPrioridad(datos.impacto, datos.urgencia);
  const areas = catalogos.datos?.areas ?? [];
  const categorias = catalogos.datos?.categorias ?? [];

  const elegirArchivos = (e) => {
    const lista = Array.from(e.target.files ?? []).slice(0, EVIDENCIAS_MAX);
    const problema = lista.map((a, i) => validarImagen(a, i)).find(Boolean);
    setErrores((x) => ({ ...x, archivos: problema ?? undefined }));
    setArchivos(problema ? [] : lista);
  };

  const enviar = async (e) => {
    e.preventDefault();
    const locales = validarSolicitud(datos);
    setErrores(locales);
    setError(null);
    if (Object.keys(locales).length) return;
    setEnviando(true);
    try {
      const solicitud = await api.post('/solicitudes', {
        categoria_id: Number(datos.categoria_id), ubicacion_id: Number(datos.ubicacion_id),
        referencia: datos.referencia.trim() || null, descripcion: datos.descripcion.trim(),
        impacto: datos.impacto, urgencia: datos.urgencia,
      });
      const fallidas = [];
      for (const archivo of archivos) {
        try {
          await api.subir(`/solicitudes/${solicitud.id}/evidencias`, { archivo });
        } catch (err) {
          fallidas.push(`${archivo.name}: ${err.message}`);
        }
      }
      setCreada({ solicitud, fallidas });
      setDatos(VACIO);
      setArchivos([]);
    } catch (err) {
      setErrores(err.porCampo ?? {});
      setError(err.message);
    } finally {
      setEnviando(false);
    }
  };

  if (creada) {
    const { solicitud, fallidas } = creada;
    return (
      <section className="pagina" aria-label="Solicitud registrada">
        <Mensaje tipo="exito" titulo={`Solicitud ${solicitud.codigo} registrada.`}>
          Prioridad inicial {solicitud.prioridad_nombre}. Primera atención hasta {fechaLima(solicitud.limite_atencion)} y
          resolución hasta {fechaLima(solicitud.limite_resolucion)} (hora de Lima).
        </Mensaje>
        {fallidas.length > 0 && (
          <Mensaje tipo="aviso" titulo="Algunas imágenes no se adjuntaron.">
            {fallidas.join(' · ')} Puedes adjuntarlas desde el detalle.
          </Mensaje>
        )}
        <div className="acciones">
          <Link className="boton boton--primario" to={`/solicitudes/${solicitud.id}`}>Ver el seguimiento</Link>
          <button type="button" className="boton boton--secundario" onClick={() => setCreada(null)}>Registrar otra</button>
        </div>
      </section>
    );
  }

  return (
    <section className="pagina" aria-label="Nueva solicitud">
      <form className="panel" onSubmit={enviar} noValidate aria-labelledby="titulo-nueva">
        <h2 id="titulo-nueva" className="panel__titulo">Datos del problema</h2>
        {error && <div style={{ marginBottom: 16 }}><Mensaje tipo="error">{error}</Mensaje></div>}
        {catalogos.error && <Mensaje tipo="error">No se pudieron cargar las categorías y ubicaciones. {catalogos.error.message}</Mensaje>}
        <div className="formulario__rejilla">
          <Campo id="categoria_id" como="select" etiqueta="Categoría" obligatorio value={datos.categoria_id}
            onChange={cambiar('categoria_id')} error={errores.categoria_id}>
            <option value="">Selecciona una categoría</option>
            {areas.map((a) => (
              <optgroup key={a.id} label={a.nombre}>
                {categorias.filter((c) => c.area_id === a.id).map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
              </optgroup>
            ))}
          </Campo>
          <Campo id="ubicacion_id" como="select" etiqueta="Ubicación" obligatorio value={datos.ubicacion_id}
            onChange={cambiar('ubicacion_id')} error={errores.ubicacion_id}>
            <option value="">Selecciona la ubicación</option>
            {(catalogos.datos?.ubicaciones ?? []).map((u) => <option key={u.id} value={u.id}>{u.nombre}</option>)}
          </Campo>
          <Campo id="referencia" etiqueta="Referencia (opcional)" value={datos.referencia} maxLength={200}
            onChange={cambiar('referencia')} error={errores.referencia} placeholder="Ej.: junto a la puerta principal" />
        </div>
        <Campo id="descripcion" como="textarea" etiqueta="Descripción" obligatorio rows={5} maxLength={2000}
          value={datos.descripcion} onChange={cambiar('descripcion')} error={errores.descripcion}
          ayuda={`${datos.descripcion.trim().length} de 2000 caracteres (mínimo 20).`} />
        <div className="formulario__rejilla">
          <Opciones nombre="impacto" etiqueta="Impacto" opciones={IMPACTOS} valor={datos.impacto} onCambiar={fijar('impacto')} error={errores.impacto} />
          <Opciones nombre="urgencia" etiqueta="Urgencia" opciones={URGENCIAS} valor={datos.urgencia} onCambiar={fijar('urgencia')} error={errores.urgencia} />
        </div>
        <p className="prioridad-en-vivo" aria-live="polite">
          Prioridad estimada: {prioridad ? <EtiquetaPrioridad codigo={prioridad} /> : <span className="texto-secundario">elige impacto y urgencia</span>}
          <span className="texto-secundario"> · El supervisor puede ajustarla con un motivo.</span>
        </p>
        <div className={`campo${errores.archivos ? ' campo--error' : ''}`}>
          <label htmlFor="archivos" className="campo__etiqueta">Imágenes (opcional)</label>
          <input id="archivos" type="file" accept="image/jpeg,image/png" multiple onChange={elegirArchivos} />
          <p className="campo__ayuda">Hasta {EVIDENCIAS_MAX} imágenes JPEG o PNG de 5 MB como máximo.{archivos.length ? ` Seleccionadas: ${archivos.map((a) => a.name).join(', ')}.` : ''}</p>
          {errores.archivos && <p className="campo__mensaje-error">{errores.archivos}</p>}
        </div>
        <div className="formulario__acciones">
          <Link className="boton boton--secundario" to="/solicitudes">Cancelar</Link>
          <button type="submit" className="boton boton--primario" disabled={enviando}>
            {enviando ? 'Registrando…' : 'Registrar solicitud'}
          </button>
        </div>
      </form>
    </section>
  );
}
