/**
 * Listado de solicitudes según el rol: Mis solicitudes (P05), Bandeja del
 * supervisor (P07) y Mis asignaciones del técnico (P08).
 * Responsable: Marcelo (PR04). Estados vacío y de error: Emanuel (PR06).
 *
 * Filtros por estado y categoría, orden y paginación con GET /api/v1/solicitudes,
 * que responde { items, pagina, tamaño, total }. Los filtros viven en la URL,
 * de modo que volver desde el detalle conserva la consulta (PV08).
 */
import { iniciarPagina } from '../layout.js';
import { api } from '../api.js';
import { ESTADOS, esPendiente } from '../reglas.js';
import { esc, tiempoHtml, etiquetaEstado, etiquetaPrioridad } from '../formato.js';
import { mostrarCargando, mostrarVacio, mostrarErrorApi } from '../ui.js';

const sesion = iniciarPagina({ roles: ['SOLICITANTE', 'TECNICO', 'SUPERVISOR'], activa: 'solicitudes' });
const TAMANO_INTERFAZ = '5'; // la API usa 20 por defecto; el prototipo muestra 5 para evidenciar la paginación
const CLAVE_ULTIMO_LISTADO = 'msu.ultimoListado';

const TEXTOS = {
  SOLICITANTE: { titulo: 'Mis solicitudes', subtitulo: 'Solicitudes que registraste, con su estado y plazos.' },
  TECNICO: { titulo: 'Mis asignaciones', subtitulo: 'Solicitudes asignadas actualmente a tu cuenta.' },
  SUPERVISOR: { titulo: 'Bandeja de solicitudes', subtitulo: 'Todas las solicitudes de la facultad para evaluar, priorizar y asignar.' },
};

const formulario = document.getElementById('form-filtros');
const resultados = document.getElementById('resultados');

function consultaDesdeUrl() {
  const p = new URLSearchParams(location.search);
  return {
    estado: p.get('estado') ?? '',
    categoria_id: p.get('categoria_id') ?? '',
    orden: p.get('orden') ?? 'recientes',
    'tamaño': p.get('tamaño') ?? TAMANO_INTERFAZ,
    pagina: p.get('pagina') ?? '1',
  };
}

function hayFiltros(consulta) {
  return Boolean(consulta.estado || consulta.categoria_id);
}

function sincronizarFormulario(consulta) {
  formulario.elements.estado.value = consulta.estado;
  formulario.elements.categoria_id.value = consulta.categoria_id;
  formulario.elements.orden.value = consulta.orden;
  formulario.elements['tamaño'].value = consulta['tamaño'];
}

function navegar(consulta, reemplazar = false) {
  const p = new URLSearchParams();
  Object.entries(consulta).forEach(([k, v]) => {
    if (v && !(k === 'pagina' && v === '1') && !(k === 'orden' && v === 'recientes') && !(k === 'tamaño' && v === TAMANO_INTERFAZ)) p.set(k, v);
  });
  const url = `${location.pathname}${p.toString() ? `?${p}` : ''}`;
  if (reemplazar) history.replaceState(null, '', url);
  else history.pushState(null, '', url);
  cargar();
}

function filaHtml(s) {
  const vencida = esPendiente(s.estado_codigo) && new Date(s.limite_resolucion) < new Date();
  return `
    <tr>
      <td data-etiqueta="Código"><a class="codigo-solicitud" href="detalle.html?id=${s.id}">${esc(s.codigo)}</a></td>
      <td data-etiqueta="Categoría">${esc(s.categoria_nombre)}<br><span class="ayuda">${esc(s.area_nombre)}</span></td>
      <td data-etiqueta="Ubicación">${esc(s.ubicacion_nombre)}</td>
      ${sesion.rol === 'SUPERVISOR' ? `<td data-etiqueta="Solicitante">${esc(s.solicitante_nombre)}</td>` : ''}
      <td data-etiqueta="Estado">${etiquetaEstado(s.estado_codigo)}</td>
      <td data-etiqueta="Prioridad">${etiquetaPrioridad(s.prioridad_codigo)}</td>
      <td data-etiqueta="Responsable">${s.tecnico_nombre ? esc(s.tecnico_nombre) : '<span class="etiqueta etiqueta--neutra">Sin asignar</span>'}</td>
      <td data-etiqueta="Registrada">${tiempoHtml(s.registrada_en)}</td>
      <td data-etiqueta="Límite de resolución">${tiempoHtml(s.limite_resolucion)}${vencida ? '<br><span class="etiqueta etiqueta--vencida">Vencida</span>' : ''}</td>
    </tr>`;
}

function mostrarLista({ items, pagina, total, ...resto }, consulta) {
  const tamano = resto['tamaño'];
  if (total === 0) {
    if (hayFiltros(consulta)) {
      mostrarVacio(resultados, {
        titulo: 'No hay solicitudes que coincidan con los filtros',
        texto: 'Prueba con otro estado o categoría, o limpia los filtros para ver todas.',
        accionHtml: '<button type="button" class="boton" data-accion="limpiar">Limpiar filtros</button>',
      });
    } else if (sesion.rol === 'SOLICITANTE') {
      mostrarVacio(resultados, {
        titulo: 'Todavía no registraste solicitudes',
        texto: 'Cuando registres un problema aparecerá aquí con su código, estado y plazos.',
        accionHtml: '<a class="boton boton--primario" href="nueva-solicitud.html">Registrar una solicitud</a>',
      });
    } else {
      mostrarVacio(resultados, {
        titulo: sesion.rol === 'TECNICO' ? 'No tienes solicitudes asignadas' : 'No hay solicitudes registradas',
        texto: 'La lista se actualizará cuando haya casos para atender.',
      });
    }
    resultados.querySelector('[data-accion="limpiar"]')?.addEventListener('click', limpiar);
    return;
  }
  const paginas = Math.max(1, Math.ceil(total / tamano));
  const desde = (pagina - 1) * tamano + 1;
  const hasta = desde + items.length - 1;
  resultados.innerHTML = `
    <div class="tabla-contenedor">
      <table class="tabla tabla--tarjetas">
        <caption>${total === 1 ? '1 solicitud' : `${total} solicitudes`} · mostrando ${desde} a ${hasta}</caption>
        <thead>
          <tr>
            <th scope="col">Código</th><th scope="col">Categoría</th><th scope="col">Ubicación</th>
            ${sesion.rol === 'SUPERVISOR' ? '<th scope="col">Solicitante</th>' : ''}
            <th scope="col">Estado</th><th scope="col">Prioridad</th><th scope="col">Responsable</th>
            <th scope="col">Registrada</th><th scope="col">Límite de resolución</th>
          </tr>
        </thead>
        <tbody>${items.map(filaHtml).join('')}</tbody>
      </table>
    </div>
    <nav class="paginacion" aria-label="Paginación">
      <button type="button" class="boton" data-pagina="${pagina - 1}" ${pagina <= 1 ? 'disabled' : ''}>Anterior</button>
      <span>Página ${pagina} de ${paginas}</span>
      <button type="button" class="boton" data-pagina="${pagina + 1}" ${pagina >= paginas ? 'disabled' : ''}>Siguiente</button>
    </nav>`;
  resultados.querySelectorAll('[data-pagina]').forEach((b) => b.addEventListener('click', () => {
    navegar({ ...consulta, pagina: b.dataset.pagina });
    document.getElementById('titulo-resultados').scrollIntoView();
  }));
}

async function cargar() {
  const consulta = consultaDesdeUrl();
  sincronizarFormulario(consulta);
  sessionStorage.setItem(CLAVE_ULTIMO_LISTADO, location.search);
  mostrarCargando(resultados, 'Cargando solicitudes…');
  try {
    const respuesta = await api.get('/solicitudes', consulta);
    if (respuesta.total > 0 && respuesta.items.length === 0 && respuesta.pagina > 1) {
      navegar({ ...consulta, pagina: '1' }, true); // la página pedida ya no existe
      return;
    }
    mostrarLista(respuesta, consulta);
  } catch (error) {
    mostrarErrorApi(resultados, error, {
      titulo: 'No se pudo cargar el listado',
      nota: 'No se modificó ninguna solicitud.',
      alReintentar: cargar,
    });
  }
}

function limpiar() {
  navegar({ orden: formulario.elements.orden.value, 'tamaño': formulario.elements['tamaño'].value });
}

async function cargarFiltros() {
  document.getElementById('filtro-estado').insertAdjacentHTML('beforeend',
    Object.entries(ESTADOS).map(([codigo, nombre]) => `<option value="${codigo}">${esc(nombre)}</option>`).join(''));
  try {
    const { items } = await api.get('/catalogos', { tipo: 'categorias' });
    const porArea = Map.groupBy ? Map.groupBy(items, (c) => c.area_nombre) : items.reduce((m, c) => m.set(c.area_nombre, [...(m.get(c.area_nombre) ?? []), c]), new Map());
    document.getElementById('filtro-categoria').insertAdjacentHTML('beforeend', [...porArea].map(([area, lista]) => `
      <optgroup label="${esc(area)}">${lista.map((c) => `<option value="${c.id}">${esc(c.nombre)}</option>`).join('')}</optgroup>`).join(''));
  } catch {
    /* sin categorías se puede seguir filtrando por estado; el error se ve al cargar el listado */
  }
}

if (sesion) {
  const textos = TEXTOS[sesion.rol];
  document.title = `${textos.titulo} · Mesa de Servicios Universitarios`;
  document.getElementById('titulo-listado').textContent = textos.titulo;
  document.getElementById('subtitulo-listado').textContent = textos.subtitulo;
  if (sesion.rol === 'SOLICITANTE') {
    document.getElementById('acciones-listado').innerHTML = '<a class="boton boton--primario" href="nueva-solicitud.html">Nueva solicitud</a>';
  }
  formulario.addEventListener('submit', (evento) => {
    evento.preventDefault();
    const datos = Object.fromEntries(new FormData(formulario));
    navegar({ ...datos, pagina: '1' });
  });
  document.getElementById('limpiar-filtros').addEventListener('click', limpiar);
  document.getElementById('actualizar').addEventListener('click', cargar);
  window.addEventListener('popstate', cargar);
  await cargarFiltros();
  cargar();
}
