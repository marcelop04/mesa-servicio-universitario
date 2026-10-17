/*
 * EM05 · Acciones del técnico (HU10, HU11) y del solicitante (HU12) que se pasan al detalle
 * reutilizable como prop `acciones`. Envían la versión; un 409 recarga el caso.
 */
import { useState } from 'react';
import { api } from '../../api/cliente.js';
import { Campo, Confirmacion, Mensaje } from '../../componentes/index.js';
import { fechaLima, validarMotivo } from '../../reglas/prioridad.js';

const VENTANA_MS = 72 * 3600 * 1000;

export function validarSolucion(texto) {
  const t = (texto ?? '').trim();
  if (t.length < 20) return `Describe la solución con al menos 20 caracteres (tiene ${t.length}).`;
  if (t.length > 2000) return 'La solución supera el máximo de 2000 caracteres.';
  return null;
}

/** Ejecuta la acción y devuelve true si se aplicó; muestra el error o el conflicto de versión. */
function useAccion(solicitud, recargar, alCambiar) {
  const [estado, setEstado] = useState({ ocupado: false, aviso: null });
  const ejecutar = async (ruta, cuerpo, exito) => {
    setEstado({ ocupado: true, aviso: null });
    try {
      await api.post(`/solicitudes/${solicitud.id}/${ruta}`, { ...cuerpo, version: solicitud.version });
      setEstado({ ocupado: false, aviso: { tipo: 'exito', texto: exito } });
      recargar();
      alCambiar?.();
      return true;
    } catch (err) {
      setEstado({
        ocupado: false,
        aviso: { tipo: err.esConflicto ? 'aviso' : 'error', texto: err.esConflicto ? `${err.message} Se recargó el caso.` : err.message, campos: err.porCampo },
      });
      if (err.esConflicto) recargar();
      return false;
    }
  };
  return { ...estado, ejecutar, limpiar: () => setEstado({ ocupado: false, aviso: null }) };
}

/** HU10 y HU11 · Solo el técnico asignado ve estas acciones (el servidor también lo valida). */
export function AccionesTecnico({ solicitud, recargar, alCambiar }) {
  const [solucion, setSolucion] = useState('');
  const [error, setError] = useState(null);
  const accion = useAccion(solicitud, recargar, alCambiar);

  if (!['ASIGNADA', 'EN_ATENCION'].includes(solicitud.estado_codigo)) {
    return accion.aviso ? <Mensaje tipo={accion.aviso.tipo}>{accion.aviso.texto}</Mensaje> : null;
  }

  const resolver = async (e) => {
    e.preventDefault();
    const problema = validarSolucion(solucion);
    setError(problema);
    if (problema) return;
    if (await accion.ejecutar('resoluciones', { solucion: solucion.trim() }, 'Solución registrada: la solicitud quedó Resuelta.')) {
      setSolucion('');
    } else if (accion.aviso?.campos?.solucion) {
      setError(accion.aviso.campos.solucion);
    }
  };

  return (
    <section className="panel acciones-caso" aria-labelledby="titulo-atencion">
      <h2 id="titulo-atencion" className="panel__titulo">Atención técnica</h2>
      {accion.aviso && <Mensaje tipo={accion.aviso.tipo} onCerrar={accion.limpiar}>{accion.aviso.texto}</Mensaje>}
      {solicitud.estado_codigo === 'ASIGNADA' ? (
        <div className="acciones-caso__fila">
          <p>Al iniciar se registra la primera atención (límite: {fechaLima(solicitud.limite_atencion)}).</p>
          <button type="button" className="boton boton--primario" disabled={accion.ocupado}
            onClick={() => accion.ejecutar('inicio', {}, 'Atención iniciada: la solicitud pasó a En atención.')}>
            {accion.ocupado ? 'Iniciando…' : 'Iniciar atención'}
          </button>
        </div>
      ) : (
        <form onSubmit={resolver} noValidate>
          <Campo id="solucion" como="textarea" etiqueta="Solución aplicada" obligatorio rows={4} maxLength={2000}
            value={solucion} onChange={(e) => setSolucion(e.target.value)} error={error}
            ayuda={`${solucion.trim().length} de 2000 caracteres (mínimo 20). Puedes adjuntar una imagen en Evidencias.`} />
          <button type="submit" className="boton boton--primario" disabled={accion.ocupado}>
            {accion.ocupado ? 'Registrando…' : 'Registrar solución'}
          </button>
        </form>
      )}
    </section>
  );
}

/** HU12 · El solicitante confirma o reabre dentro de 72 horas desde la última resolución. */
export function AccionesConformidad({ solicitud, recargar, ahora = Date.now() }) {
  const [reabrir, setReabrir] = useState(false);
  const [motivo, setMotivo] = useState('');
  const [error, setError] = useState(null);
  const accion = useAccion(solicitud, recargar);

  if (solicitud.estado_codigo !== 'RESUELTA') {
    return accion.aviso ? <Mensaje tipo={accion.aviso.tipo}>{accion.aviso.texto}</Mensaje> : null;
  }
  const limite = Date.parse(solicitud.ultima_resolucion_en) + VENTANA_MS;
  const vigente = ahora < limite;

  const confirmarReapertura = async () => {
    const problema = validarMotivo(motivo);
    setError(problema);
    if (problema) return;
    if (await accion.ejecutar('conformidad', { accion: 'REABRIR', motivo: motivo.trim() }, 'Solicitud reabierta: el técnico retomará la atención.')) {
      setReabrir(false);
    }
  };

  return (
    <section className="panel acciones-caso" aria-labelledby="titulo-conformidad">
      <h2 id="titulo-conformidad" className="panel__titulo">¿Se solucionó el problema?</h2>
      {accion.aviso && <Mensaje tipo={accion.aviso.tipo} onCerrar={accion.limpiar}>{accion.aviso.texto}</Mensaje>}
      {vigente ? (
        <>
          <p>Puedes confirmar o reabrir hasta el {fechaLima(new Date(limite).toISOString())}. Si no respondes, el caso se cerrará automáticamente.</p>
          <div className="acciones">
            <button type="button" className="boton boton--primario" disabled={accion.ocupado}
              onClick={() => accion.ejecutar('conformidad', { accion: 'CONFIRMAR' }, 'Gracias: la solicitud quedó cerrada.')}>
              Confirmar solución
            </button>
            <button type="button" className="boton boton--peligro-suave" disabled={accion.ocupado} onClick={() => setReabrir(true)}>
              El problema persiste
            </button>
          </div>
        </>
      ) : (
        <Mensaje tipo="info">Terminó el periodo de 72 horas para responder. El caso se cerrará automáticamente.</Mensaje>
      )}
      <Confirmacion abierto={reabrir} titulo="Reabrir la solicitud" textoConfirmar="Reabrir" ocupado={accion.ocupado}
        onConfirmar={confirmarReapertura} onCancelar={() => setReabrir(false)}>
        <Campo id="motivo-reapertura" como="textarea" etiqueta="¿Qué sigue fallando?" obligatorio rows={3} maxLength={1000}
          value={motivo} onChange={(e) => setMotivo(e.target.value)} error={error}
          ayuda="Entre 10 y 1000 caracteres. Se conservan la primera atención y los plazos originales." />
      </Confirmacion>
    </section>
  );
}
