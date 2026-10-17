/**
 * Detalle de solicitud reutilizable por rol (P06 solicitante, P07 supervisor, P08 técnico).
 * Responsable: Marcelo (PR04). Acciones del supervisor y del técnico: evaluacion.js (PR05).
 *
 * Muestra código, estado y prioridad antes del detalle; responsable o "Sin asignar";
 * fechas en hora de Lima; plazos con su situación en texto; e historial no editable
 * (GET /api/v1/solicitudes/{id} y GET /api/v1/solicitudes/{id}/historial).
 */
import { iniciarPagina } from '../layout.js';
import { api } from '../api.js';
import { esPendiente, obtenerPlazos } from '../reglas.js';
import {
  esc, tiempoHtml, fechaLima, etiquetaEstado, etiquetaPrioridad, situacionPlazo,
  nombreEstado, nombrePrioridad, nombreImpacto, nombreUrgencia, horasTexto,
} from '../formato.js';
import { mostrarCargando, mostrarErrorApi, anunciar } from '../ui.js';
import { renderAcciones } from './evaluacion.js';

const sesion = iniciarPagina({ roles: ['SOLICITANTE', 'TECNICO', 'SUPERVISOR'], activa: 'solicitudes' });
const contenedor = document.getElementById('detalle');
const avisoAccion = document.getElementById('aviso-accion');
const id = Number(new URLSearchParams(location.search).get('id'));

const volver = document.getElementById('volver');
volver.href = `solicitudes.html${sessionStorage.getItem('msu.ultimoListado') ?? ''}`;

const PROXIMO_PASO = {
  REGISTRADA: 'El supervisor revisará la solicitud e iniciará su evaluación.',
  EN_EVALUACION: 'El supervisor confirmará la prioridad y asignará un técnico del área.',
  ASIGNADA: 'El técnico responsable iniciará la atención.',
  EN_ATENCION: 'El técnico está atendiendo el caso y registrará la solución.',
  RESUELTA: 'El solicitante puede confirmar la solución o reabrir el caso dentro de 72 horas.',
  CERRADA: 'El caso está cerrado. Un problema nuevo se registra como otra solicitud.',
  CANCELADA: 'El caso fue cancelado y no admite cambios.',
};

const ACCIONES_HISTORIAL = {
  REGISTRAR: 'Solicitud registrada',
  INICIAR_EVALUACION: 'Evaluación iniciada',
  CAMBIAR_PRIORIDAD: 'Prioridad cambiada',
  ASIGNAR: 'Técnico asignado',
  REASIGNAR: 'Responsable reasignado',
  INICIAR_ATENCION: 'Atención iniciada',
  RESOLVER: 'Solución registrada',
  CONFIRMAR: 'Solución confirmada y caso cerrado',
  CANCELAR: 'Solicitud cancelada',
};

const CAMPOS_HISTORIAL = {
  estado_codigo: ['Estado', nombreEstado],
  prioridad_codigo: ['Prioridad', nombrePrioridad],
  impacto: ['Impacto', nombreImpacto],
  urgencia: ['Urgencia', nombreUrgencia],
  limite_atencion: ['Límite de primera atención', fechaLima],
  limite_resolucion: ['Límite de resolución', fechaLima],
  tecnico_nombre: ['Responsable', (v) => v ?? 'Sin asignar'],
  primera_atencion_en: ['Primera atención', fechaLima],
  solucion: ['Solución', (v) => v],
};

function cambiosHtml(evento) {
  const anterior = evento.anterior ?? {};
  const nuevo = evento.nuevo ?? {};
  const claves = Object.keys(CAMPOS_HISTORIAL).filter((k) => k in anterior || k in nuevo);
  const lineas = claves.map((k) => {
    const [etiqueta, formato] = CAMPOS_HISTORIAL[k];
    if (!(k in anterior)) return `<li>${esc(etiqueta)}: ${esc(formato(nuevo[k]))}</li>`;
    if (anterior[k] === nuevo[k]) return '';
    return `<li>${esc(etiqueta)}: ${esc(formato(anterior[k]))} → ${esc(formato(nuevo[k]))}</li>`;
  }).join('');
  return lineas ? `<ul class="historial__cambios">${lineas}</ul>` : '';
}

function historialHtml(eventos) {
  if (!eventos.length) return '<p>Sin eventos registrados.</p>';
  return `<ol class="historial" data-prueba="historial">
    ${eventos.map((e) => `
      <li data-accion="${esc(e.accion)}">
        <div class="historial__titulo">${esc(ACCIONES_HISTORIAL[e.accion] ?? e.accion)}</div>
        <div class="historial__meta">${tiempoHtml(e.creado_en)} · ${esc(e.actor_nombre ?? 'Sistema')}</div>
        ${cambiosHtml(e)}
        ${e.motivo ? `<p class="texto-largo"><strong>Motivo:</strong> ${esc(e.motivo)}</p>` : ''}
      </li>`).join('')}
  </ol>`;
}

function render(s, eventos) {
  document.title = `${s.codigo} · Mesa de Servicios Universitarios`;
  const plazos = obtenerPlazos(s.prioridad_codigo, s.matriz_aplicada);
  const vencida = esPendiente(s.estado_codigo) && new Date(s.limite_resolucion) < new Date();
  contenedor.innerHTML = `
    <div class="encabezado-pagina">
      <div>
        <h1>Solicitud <span class="codigo-solicitud" data-prueba="codigo">${esc(s.codigo)}</span></h1>
        <p class="acciones">
          <span data-prueba="estado">${etiquetaEstado(s.estado_codigo)}</span>
          <span data-prueba="prioridad">${etiquetaPrioridad(s.prioridad_codigo)}</span>
          ${vencida ? '<span class="etiqueta etiqueta--vencida">Resolución vencida</span>' : ''}
        </p>
      </div>
    </div>
    <div class="aviso aviso--info"><p><strong>Próximo paso:</strong> ${esc(PROXIMO_PASO[s.estado_codigo])}</p></div>
    <div class="rejilla-paneles">
      <section class="panel" aria-labelledby="titulo-datos">
        <h2 id="titulo-datos">Datos de la solicitud</h2>
        <dl class="datos">
          <dt>Categoría</dt><dd>${esc(s.categoria_nombre)}</dd>
          <dt>Área responsable</dt><dd>${esc(s.area_nombre)}</dd>
          <dt>Ubicación</dt><dd>${esc(s.ubicacion_nombre)}</dd>
          ${s.referencia ? `<dt>Referencia</dt><dd>${esc(s.referencia)}</dd>` : ''}
          <dt>Solicitante</dt><dd>${esc(s.solicitante_nombre)}</dd>
          <dt>Impacto</dt><dd data-prueba="impacto">${esc(nombreImpacto(s.impacto))}</dd>
          <dt>Urgencia</dt><dd data-prueba="urgencia">${esc(nombreUrgencia(s.urgencia))}</dd>
          <dt>Descripción</dt><dd class="texto-largo">${esc(s.descripcion)}</dd>
        </dl>
      </section>
      <section class="panel" aria-labelledby="titulo-plazos">
        <h2 id="titulo-plazos">Responsable y plazos</h2>
        <dl class="datos">
          <dt>Responsable</dt><dd data-prueba="responsable">${s.tecnico_nombre ? esc(s.tecnico_nombre) : '<span class="etiqueta etiqueta--neutra">Sin asignar</span>'}</dd>
          <dt>Registrada</dt><dd data-prueba="registrada">${tiempoHtml(s.registrada_en)}</dd>
          <dt>Límite de primera atención</dt>
          <dd data-prueba="limite-atencion">${tiempoHtml(s.limite_atencion)} (${horasTexto(plazos.horas_primera_atencion)})<br>${situacionPlazo(s.limite_atencion, s.primera_atencion_en, s.estado_codigo)}</dd>
          <dt>Primera atención</dt><dd>${tiempoHtml(s.primera_atencion_en)}</dd>
          <dt>Límite de resolución</dt>
          <dd data-prueba="limite-resolucion">${tiempoHtml(s.limite_resolucion)} (${horasTexto(plazos.horas_resolucion)})<br>${situacionPlazo(s.limite_resolucion, s.ultima_resolucion_en, s.estado_codigo)}</dd>
          <dt>Última resolución</dt><dd>${tiempoHtml(s.ultima_resolucion_en)}</dd>
          ${s.cerrada_en ? `<dt>Cerrada</dt><dd>${tiempoHtml(s.cerrada_en)}</dd>` : ''}
          ${s.cancelada_en ? `<dt>Cancelada</dt><dd>${tiempoHtml(s.cancelada_en)}</dd>` : ''}
        </dl>
        <p class="ayuda">Horas corridas desde el registro, según la política v${esc(s.politica_id)} guardada en el caso. Hora de Lima (America/Lima).</p>
      </section>
      <section class="panel panel--ancho" id="panel-acciones" aria-labelledby="titulo-acciones" hidden>
        <h2 id="titulo-acciones">Acciones</h2>
        <div id="acciones"></div>
      </section>
      <section class="panel panel--ancho" aria-labelledby="titulo-historial">
        <h2 id="titulo-historial">Historial</h2>
        <p class="ayuda">Registro no editable de los cambios, con actor, fecha y motivo.</p>
        ${historialHtml(eventos)}
      </section>
    </div>`;

  const hayAcciones = renderAcciones(document.getElementById('acciones'), s, sesion, {
    alActualizar: async (mensaje) => {
      await cargar();
      anunciar(avisoAccion, mensaje, 'exito');
    },
    alConflicto: async (mensaje) => {
      await cargar();
      anunciar(avisoAccion, mensaje, 'atencion');
    },
  });
  document.getElementById('panel-acciones').hidden = !hayAcciones;
}

async function cargar() {
  if (!Number.isInteger(id) || id <= 0) {
    contenedor.innerHTML = '<div class="aviso aviso--error" role="alert"><h1>Solicitud no indicada</h1><p>Abre el detalle desde el listado.</p></div>';
    return;
  }
  if (!contenedor.innerHTML) mostrarCargando(contenedor, 'Cargando solicitud…');
  try {
    const [solicitud, historial] = await Promise.all([
      api.get(`/solicitudes/${id}`),
      api.get(`/solicitudes/${id}/historial`),
    ]);
    render(solicitud, historial.items);
  } catch (error) {
    avisoAccion.innerHTML = '';
    mostrarErrorApi(contenedor, error, { titulo: 'No se pudo cargar la solicitud', alReintentar: cargar });
  }
}

if (sesion) cargar();
