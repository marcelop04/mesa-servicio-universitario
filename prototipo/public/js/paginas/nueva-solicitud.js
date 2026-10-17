/**
 * P04 Nueva solicitud.
 * Responsable: Alex (PR02 formulario y validación; PR03 envío con fetch).
 *
 * PR02: categoría agrupada por área, ubicación, descripción (20 a 2000),
 * impacto y urgencia con ejemplos; prioridad inicial y plazos calculados en vivo
 * con el módulo de reglas; validación por campo conservando los datos válidos.
 * PR03: POST /api/v1/solicitudes con el botón desactivado durante la petición;
 * muestra código, estado Registrada y fechas límite en hora de Lima (UTC guardado).
 * PR06 (Emanuel): errores del servidor junto a los campos y falla de API con Reintentar.
 */
import { iniciarPagina } from '../layout.js';
import { api } from '../api.js';
import { IMPACTOS, URGENCIAS, POLITICA_V1, LIMITES, calcularPrioridad, obtenerPlazos, calcularLimites, validarSolicitud } from '../reglas.js';
import { esc, fechaLima, tiempoHtml, etiquetaEstado, etiquetaPrioridad, horasTexto } from '../formato.js';
import { mostrarErrorApi, mostrarErroresFormulario, limpiarErroresFormulario, quitarErrorCampo, marcarOcupado } from '../ui.js';

const sesion = iniciarPagina({ roles: ['SOLICITANTE'], activa: 'nueva' });

const formulario = document.getElementById('form-solicitud');
const resumen = document.getElementById('resumen-errores');
const errorEnvio = document.getElementById('error-envio');
const resultado = document.getElementById('resultado');
const boton = document.getElementById('boton-registrar');
const selectCategoria = document.getElementById('campo-categoria');
const selectUbicacion = document.getElementById('campo-ubicacion');
const descripcion = document.getElementById('campo-descripcion');
const contador = document.getElementById('contador-descripcion');
const vistaPrioridad = document.getElementById('vista-prioridad');

let politica = POLITICA_V1;
let intentoEnvio = false;

function opcionesRadio(nombre, lista) {
  return lista.map((op) => `
    <label class="opcion">
      <input type="radio" name="${nombre}" value="${op.codigo}" id="${nombre}-${op.codigo.toLowerCase()}">
      <span class="opcion__titulo">${esc(op.nombre)}</span>
      <span class="opcion__ejemplo">${esc(op.ejemplo)}</span>
    </label>`).join('');
}

document.getElementById('opciones-impacto').innerHTML = opcionesRadio('impacto', IMPACTOS);
document.getElementById('opciones-urgencia').innerHTML = opcionesRadio('urgencia', URGENCIAS);

/** Agrupa opciones en <optgroup> según una clave. */
function optgroups(items, grupo, texto) {
  const grupos = new Map();
  items.forEach((item) => {
    const clave = grupo(item);
    if (!grupos.has(clave)) grupos.set(clave, []);
    grupos.get(clave).push(item);
  });
  return [...grupos].map(([nombre, lista]) => `
    <optgroup label="${esc(nombre)}">
      ${lista.map((i) => `<option value="${i.id}">${esc(texto(i))}</option>`).join('')}
    </optgroup>`).join('');
}

async function cargarCatalogos() {
  errorEnvio.innerHTML = '';
  boton.disabled = true;
  try {
    const [categorias, ubicaciones, politicaVigente] = await Promise.all([
      api.get('/catalogos', { tipo: 'categorias' }),
      api.get('/catalogos', { tipo: 'ubicaciones' }),
      api.get('/catalogos', { tipo: 'politica' }),
    ]);
    const seleccionCategoria = selectCategoria.value;
    const seleccionUbicacion = selectUbicacion.value;
    selectCategoria.innerHTML = `<option value="">Selecciona una categoría</option>${optgroups(categorias.items, (c) => c.area_nombre, (c) => c.nombre)}`;
    selectUbicacion.innerHTML = `<option value="">Selecciona una ubicación</option>${optgroups(ubicaciones.items, (u) => u.edificio, (u) => `${u.edificio} — ${u.ambiente}`)}`;
    selectCategoria.value = seleccionCategoria;
    selectUbicacion.value = seleccionUbicacion;
    const detalles = politicaVigente.items[0]?.detalles;
    if (detalles) politica = Object.fromEntries(detalles.map((d) => [d.prioridad_codigo, d]));
    selectCategoria.disabled = false;
    selectUbicacion.disabled = false;
    boton.disabled = false;
    actualizarPrioridad();
  } catch (error) {
    mostrarErrorApi(errorEnvio, error, {
      titulo: 'No se pudieron cargar las categorías y ubicaciones',
      nota: 'El formulario no puede enviarse hasta cargar los catálogos.',
      alReintentar: cargarCatalogos,
    });
  }
}

function leerDatos() {
  const datos = new FormData(formulario);
  return {
    categoria_id: datos.get('categoria_id') ? Number(datos.get('categoria_id')) : null,
    ubicacion_id: datos.get('ubicacion_id') ? Number(datos.get('ubicacion_id')) : null,
    referencia: (datos.get('referencia') ?? '').trim(),
    descripcion: (datos.get('descripcion') ?? '').trim(),
    impacto: datos.get('impacto'),
    urgencia: datos.get('urgencia'),
  };
}

/** Prioridad y plazos en vivo (tabla 5 y tabla 6); las fechas definitivas las fija el servidor. */
function actualizarPrioridad() {
  const { impacto, urgencia } = leerDatos();
  const prioridad = calcularPrioridad(impacto, urgencia);
  if (!prioridad) {
    vistaPrioridad.innerHTML = '<p>Selecciona impacto y urgencia para calcular la prioridad y los plazos.</p>';
    return;
  }
  const plazos = obtenerPlazos(prioridad, politica);
  const estimado = calcularLimites(new Date(), prioridad, politica);
  vistaPrioridad.innerHTML = `
    <p>${etiquetaPrioridad(prioridad)}</p>
    <dl class="datos">
      <dt>Primera atención</dt>
      <dd data-prueba="plazo-atencion">${horasTexto(plazos.horas_primera_atencion)} desde el registro (si registras ahora: antes del ${esc(fechaLima(estimado.limite_atencion))})</dd>
      <dt>Resolución</dt>
      <dd data-prueba="plazo-resolucion">${horasTexto(plazos.horas_resolucion)} desde el registro (si registras ahora: antes del ${esc(fechaLima(estimado.limite_resolucion))})</dd>
    </dl>
    <p class="ayuda">Horas corridas, incluidos fines de semana; hora de Lima. El supervisor puede ajustar la prioridad justificando el cambio.</p>`;
}

function actualizarContador() {
  const largo = descripcion.value.trim().length;
  contador.textContent = `${largo} de ${LIMITES.descripcionMax} caracteres (mínimo ${LIMITES.descripcionMin}).`;
}

/** Tras un intento fallido, el error de un campo desaparece cuando se corrige. */
function revisarCampo(campo) {
  if (!intentoEnvio) return;
  const sigueMal = validarSolicitud(leerDatos()).some((e) => e.campo === campo);
  if (!sigueMal) quitarErrorCampo(formulario, campo);
}

formulario.addEventListener('change', (evento) => {
  if (['impacto', 'urgencia'].includes(evento.target.name)) actualizarPrioridad();
  revisarCampo(evento.target.name);
});
descripcion.addEventListener('input', () => {
  actualizarContador();
  revisarCampo('descripcion');
});

function mostrarResultado(solicitud) {
  const plazos = obtenerPlazos(solicitud.prioridad_codigo, solicitud.matriz_aplicada);
  resultado.innerHTML = `
    <section class="aviso aviso--exito" aria-labelledby="titulo-resultado" data-prueba="resultado-registro">
      <h2 id="titulo-resultado" tabindex="-1">Solicitud registrada</h2>
      <p>Guarda el código para hacer seguimiento. El supervisor evaluará tu solicitud.</p>
      <dl class="datos">
        <dt>Código</dt><dd class="codigo-solicitud" data-prueba="codigo">${esc(solicitud.codigo)}</dd>
        <dt>Estado</dt><dd data-prueba="estado">${etiquetaEstado(solicitud.estado_codigo)}</dd>
        <dt>Prioridad inicial</dt><dd data-prueba="prioridad">${etiquetaPrioridad(solicitud.prioridad_codigo)}</dd>
        <dt>Registrada</dt><dd data-prueba="registrada">${tiempoHtml(solicitud.registrada_en)}</dd>
        <dt>Límite de primera atención</dt><dd data-prueba="limite-atencion">${tiempoHtml(solicitud.limite_atencion)} (${horasTexto(plazos.horas_primera_atencion)})</dd>
        <dt>Límite de resolución</dt><dd data-prueba="limite-resolucion">${tiempoHtml(solicitud.limite_resolucion)} (${horasTexto(plazos.horas_resolucion)})</dd>
      </dl>
      <p class="ayuda">Las fechas se guardan en UTC y se muestran en hora de Lima (America/Lima).</p>
      <div class="acciones">
        <a class="boton boton--primario" href="detalle.html?id=${solicitud.id}">Ver detalle</a>
        <a class="boton" href="solicitudes.html">Ir a mis solicitudes</a>
        <a class="boton" href="nueva-solicitud.html">Registrar otra solicitud</a>
      </div>
    </section>`;
  resultado.hidden = false;
  formulario.hidden = true;
  resultado.querySelector('#titulo-resultado').focus();
}

async function enviar() {
  limpiarErroresFormulario(formulario, resumen);
  errorEnvio.innerHTML = '';
  intentoEnvio = true;
  const datos = leerDatos();
  const errores = validarSolicitud(datos);
  if (errores.length) {
    mostrarErroresFormulario(formulario, errores, resumen, 'La solicitud no se registró');
    return;
  }
  marcarOcupado(boton, true, 'Registrando…');
  try {
    const solicitud = await api.post('/solicitudes', datos);
    mostrarResultado(solicitud);
  } catch (error) {
    if (error.esValidacion) {
      mostrarErroresFormulario(formulario, error.errores, resumen, 'La solicitud no se registró');
    } else {
      mostrarErrorApi(errorEnvio, error, {
        titulo: 'La solicitud no se registró',
        nota: 'Tus datos siguen en el formulario. Puedes reintentar el envío sin volver a escribirlos.',
        alReintentar: enviar,
        enfocar: true,
      });
    }
  } finally {
    marcarOcupado(boton, false);
  }
}

formulario.addEventListener('submit', (evento) => {
  evento.preventDefault();
  if (!boton.disabled) enviar();
});

if (sesion) {
  actualizarContador();
  cargarCatalogos();
}
