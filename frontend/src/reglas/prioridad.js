/*
 * Reglas de prioridad y plazos (sección 5 del informe), las mismas del backend y del prototipo.
 * Marcelo (MR07). Alex puede reutilizarlas en P04 para mostrar la prioridad en vivo.
 */
export const IMPACTOS = [
  { codigo: 'ALTO', nombre: 'Alto' },
  { codigo: 'MEDIO', nombre: 'Medio' },
  { codigo: 'BAJO', nombre: 'Bajo' },
];

export const URGENCIAS = [
  { codigo: 'ALTA', nombre: 'Alta' },
  { codigo: 'MEDIA', nombre: 'Media' },
  { codigo: 'BAJA', nombre: 'Baja' },
];

/** Tabla 5: MATRIZ[impacto][urgencia]. */
export const MATRIZ = {
  ALTO: { ALTA: 'CRITICA', MEDIA: 'ALTA', BAJA: 'MEDIA' },
  MEDIO: { ALTA: 'ALTA', MEDIA: 'MEDIA', BAJA: 'BAJA' },
  BAJO: { ALTA: 'MEDIA', MEDIA: 'BAJA', BAJA: 'BAJA' },
};

export const MOTIVO_MIN = 10;
export const MOTIVO_MAX = 1000;

export function calcularPrioridad(impacto, urgencia) {
  return MATRIZ[impacto]?.[urgencia] ?? null;
}

/** RN05: límites recalculados desde el registro con la matriz guardada en el caso. */
export function recalcularLimites(registradaEn, prioridad, matriz) {
  const plazo = matriz?.[prioridad];
  if (!plazo) return null;
  const base = Date.parse(registradaEn);
  const hora = 3600 * 1000;
  return {
    horas_primera_atencion: plazo.horas_primera_atencion,
    horas_resolucion: plazo.horas_resolucion,
    limite_atencion: new Date(base + plazo.horas_primera_atencion * hora).toISOString(),
    limite_resolucion: new Date(base + plazo.horas_resolucion * hora).toISOString(),
  };
}

export function validarMotivo(texto) {
  const motivo = (texto ?? '').trim();
  if (!motivo) return `El motivo es obligatorio (entre ${MOTIVO_MIN} y ${MOTIVO_MAX} caracteres).`;
  if (motivo.length < MOTIVO_MIN) return `El motivo es muy corto: tiene ${motivo.length} caracteres y el mínimo es ${MOTIVO_MIN}.`;
  if (motivo.length > MOTIVO_MAX) return `El motivo supera el máximo de ${MOTIVO_MAX} caracteres.`;
  return null;
}

const FORMATO_LIMA = new Intl.DateTimeFormat('es-PE', {
  timeZone: 'America/Lima', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', hour12: false,
});

/** RN03: fechas guardadas en UTC y mostradas en America/Lima. */
export function fechaLima(iso) {
  return iso ? FORMATO_LIMA.format(new Date(iso)) : '—';
}
