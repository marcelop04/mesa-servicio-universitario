/*
 * Etiquetas de estado y prioridad. El texto siempre está presente; el color solo refuerza
 * la información (sección 11.3 del informe).
 */
export const NOMBRE_ESTADO = {
  REGISTRADA: 'Registrada',
  EN_EVALUACION: 'En evaluación',
  ASIGNADA: 'Asignada',
  EN_ATENCION: 'En atención',
  RESUELTA: 'Resuelta',
  CERRADA: 'Cerrada',
  CANCELADA: 'Cancelada',
};

export const NOMBRE_PRIORIDAD = { CRITICA: 'Crítica', ALTA: 'Alta', MEDIA: 'Media', BAJA: 'Baja' };

export function Etiqueta({ tono = 'neutro', children, titulo }) {
  return (
    <span className={`etiqueta etiqueta--${tono}`} title={titulo}>
      {children}
    </span>
  );
}

export function EtiquetaEstado({ codigo, nombre }) {
  return (
    <span className={`etiqueta etiqueta--estado etiqueta--${String(codigo).toLowerCase()}`}>
      {nombre ?? NOMBRE_ESTADO[codigo] ?? codigo}
    </span>
  );
}

export function EtiquetaPrioridad({ codigo, nombre }) {
  return (
    <span className={`etiqueta etiqueta--prioridad etiqueta--prioridad-${String(codigo).toLowerCase()}`}>
      <span className="solo-lector">Prioridad </span>
      {nombre ?? NOMBRE_PRIORIDAD[codigo] ?? codigo}
    </span>
  );
}

export function EtiquetaActivo({ activo, punto = false }) {
  return (
    <span className={`etiqueta etiqueta--${activo ? 'exito' : 'apagado'}${punto ? ' etiqueta--punto' : ''}`}>
      {activo ? 'Activo' : 'Inactivo'}
    </span>
  );
}

const TONO_ROL = { TECNICO: 'neutro', SUPERVISOR: 'info', ADMINISTRADOR: 'morado', SOLICITANTE: 'turquesa' };

export function EtiquetaRol({ codigo, nombre }) {
  return <Etiqueta tono={TONO_ROL[codigo] ?? 'neutro'}>{nombre ?? codigo}</Etiqueta>;
}
