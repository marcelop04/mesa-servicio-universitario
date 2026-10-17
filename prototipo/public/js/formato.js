/**
 * Formato de fechas, estados y prioridades para la interfaz.
 * Responsable: Marcelo (PR04).
 *
 * RN03: las fechas llegan en UTC y se muestran en America/Lima.
 * Estado y prioridad se muestran siempre con texto; el color solo refuerza.
 */
import { ESTADOS, PRIORIDADES, IMPACTOS, URGENCIAS, esPendiente } from './reglas.js';

export const ZONA_HORARIA = 'America/Lima';

const formatoFecha = new Intl.DateTimeFormat('es-PE', {
  timeZone: ZONA_HORARIA, day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false,
});

/** Escapa texto para insertarlo en HTML. */
export function esc(valor) {
  return String(valor ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
}

/** Fecha en hora de Lima, por ejemplo "16 oct 2026, 08:45". */
export function fechaLima(iso) {
  if (!iso) return '—';
  return formatoFecha.format(new Date(iso)).replace(/\./g, '');
}

/** <time> con el instante UTC en datetime y el texto en hora de Lima. */
export function tiempoHtml(iso, vacio = 'Sin registrar') {
  if (!iso) return `<span class="etiqueta--neutra">${esc(vacio)}</span>`;
  return `<time datetime="${esc(iso)}" title="UTC: ${esc(iso)}">${esc(fechaLima(iso))}</time>`;
}

export const nombreEstado = (codigo) => ESTADOS[codigo] ?? codigo;
export const nombrePrioridad = (codigo) => PRIORIDADES[codigo]?.nombre ?? codigo;
export const nombreImpacto = (codigo) => IMPACTOS.find((i) => i.codigo === codigo)?.nombre ?? codigo;
export const nombreUrgencia = (codigo) => URGENCIAS.find((u) => u.codigo === codigo)?.nombre ?? codigo;

export function etiquetaEstado(codigo) {
  return `<span class="etiqueta etiqueta--estado-${esc(codigo)}">${esc(nombreEstado(codigo))}</span>`;
}

export function etiquetaPrioridad(codigo) {
  return `<span class="etiqueta etiqueta--prioridad-${esc(codigo)}">Prioridad ${esc(nombrePrioridad(codigo))}</span>`;
}

/** Situación de un plazo pendiente, expresada con texto. */
export function situacionPlazo(limiteIso, cumplidoEn, estadoCodigo, ahora = new Date()) {
  if (cumplidoEn) {
    return new Date(cumplidoEn) <= new Date(limiteIso)
      ? '<span class="etiqueta etiqueta--estado-RESUELTA">Cumplido a tiempo</span>'
      : '<span class="etiqueta etiqueta--vencida">Cumplido fuera de plazo</span>';
  }
  if (!esPendiente(estadoCodigo)) return '<span class="etiqueta etiqueta--neutra">No aplica</span>';
  return new Date(limiteIso) < ahora
    ? '<span class="etiqueta etiqueta--vencida">Vencido</span>'
    : '<span class="etiqueta etiqueta--neutra">Dentro del plazo</span>';
}

export function horasTexto(horas) {
  return `${horas} h`;
}
