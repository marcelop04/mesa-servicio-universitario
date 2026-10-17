/**
 * Estados de la interfaz: carga, lista vacía, error de API con reintento,
 * errores por campo con resumen enfocable, avisos y confirmaciones.
 * Responsable: Emanuel (PR06).
 *
 * Criterios (11.4 y PR06): mensajes comprensibles, error junto al campo,
 * el foco pasa al resumen de errores, la falla de la API nunca afirma éxito
 * y siempre ofrece "Reintentar".
 */
import { esc } from './formato.js';

export function mostrarCargando(contenedor, texto = 'Cargando…') {
  contenedor.innerHTML = `<p class="estado-vista" role="status" aria-live="polite">${esc(texto)}</p>`;
}

export function mostrarVacio(contenedor, { titulo, texto, accionHtml = '' }) {
  contenedor.innerHTML = `
    <div class="estado-vista" role="status" data-estado="vacio">
      <h2>${esc(titulo)}</h2>
      <p>${esc(texto)}</p>
      ${accionHtml}
    </div>`;
}

/** Texto de ayuda según el tipo de falla. */
function explicacion(error) {
  if (error?.tipo === 'red') return 'Parece que la API simulada está detenida o no hay conexión.';
  if (error?.estado === 503) return 'Si estás en la demostración, desactiva «Simular falla de la API» y pulsa Reintentar.';
  if (error?.estado === 401) return 'La sesión simulada no es válida; vuelve a ingresar.';
  if (error?.estado === 403) return 'Tu rol no tiene permiso para esta información.';
  if (error?.estado === 404) return 'El recurso no existe o fue retirado.';
  return 'Ocurrió un problema al comunicarse con la API simulada.';
}

/**
 * Error de API con botón Reintentar. No afirma éxito: el título dice qué no se pudo hacer.
 * @param {HTMLElement} contenedor
 * @param {Error} error
 * @param {{titulo:string, alReintentar?:Function, nota?:string, enfocar?:boolean}} opciones
 */
export function mostrarErrorApi(contenedor, error, { titulo, alReintentar, nota = '', enfocar = false }) {
  const reintentable = alReintentar && ![401, 403, 404].includes(error?.estado);
  contenedor.innerHTML = `
    <div class="aviso aviso--error" role="alert" tabindex="-1" data-estado="error-api">
      <h2>${esc(titulo)}</h2>
      <p>${esc(error?.message ?? 'Error desconocido.')} ${esc(explicacion(error))}</p>
      ${nota ? `<p>${esc(nota)}</p>` : ''}
      ${error?.idCorrelacion ? `<p class="ayuda">Código de error: ${esc(error.codigo)} · Id. de correlación: ${esc(error.idCorrelacion)}</p>` : ''}
      ${reintentable ? '<div class="acciones"><button type="button" class="boton boton--primario" data-accion="reintentar">Reintentar</button></div>' : ''}
      ${error?.estado === 401 ? '<p><a href="index.html">Ir al acceso de demostración</a></p>' : ''}
    </div>`;
  const aviso = contenedor.firstElementChild;
  aviso.querySelector('[data-accion="reintentar"]')?.addEventListener('click', alReintentar);
  if (enfocar) aviso.focus();
  return aviso;
}

/** Contenedor visual del campo (el elemento con data-campo="nombre"). */
function contenedorCampo(formulario, campo) {
  return formulario.querySelector(`[data-campo="${CSS.escape(campo)}"]`);
}

export function limpiarErroresFormulario(formulario, resumen) {
  formulario.querySelectorAll('.error-campo').forEach((p) => p.remove());
  formulario.querySelectorAll('[aria-invalid="true"]').forEach((el) => {
    el.removeAttribute('aria-invalid');
    const descripciones = (el.getAttribute('aria-describedby') ?? '').split(' ').filter((id) => id && !id.startsWith('error-'));
    if (descripciones.length) el.setAttribute('aria-describedby', descripciones.join(' '));
    else el.removeAttribute('aria-describedby');
  });
  if (resumen) {
    resumen.hidden = true;
    resumen.innerHTML = '';
  }
}

/**
 * Muestra cada error junto a su campo y un resumen con enlaces; el foco va al resumen.
 * @param {HTMLFormElement} formulario
 * @param {Array<{campo:string, mensaje:string}>} errores
 * @param {HTMLElement} resumen
 * @param {string} titulo
 */
export function mostrarErroresFormulario(formulario, errores, resumen, titulo) {
  limpiarErroresFormulario(formulario, resumen);
  const enlaces = [];
  errores.forEach(({ campo, mensaje }) => {
    const caja = contenedorCampo(formulario, campo);
    const idError = `error-${campo}`;
    const control = caja?.querySelector('input, select, textarea');
    if (caja && !caja.querySelector(`#${CSS.escape(idError)}`)) {
      const parrafo = document.createElement('p');
      parrafo.className = 'error-campo';
      parrafo.id = idError;
      parrafo.textContent = mensaje;
      const ancla = caja.querySelector('[data-ancla-error]');
      if (ancla) ancla.after(parrafo);
      else caja.append(parrafo);
      caja.querySelectorAll('input, select, textarea').forEach((el) => {
        el.setAttribute('aria-invalid', 'true');
        const actuales = (el.getAttribute('aria-describedby') ?? '').split(' ').filter(Boolean);
        el.setAttribute('aria-describedby', [...actuales, idError].join(' '));
      });
    }
    enlaces.push(`<li><a href="#${esc(control?.id ?? '')}" data-campo-destino="${esc(campo)}">${esc(mensaje)}</a></li>`);
  });
  resumen.innerHTML = `
    <h2>${esc(titulo)}</h2>
    <p>Revisa ${errores.length === 1 ? 'el siguiente campo' : `los siguientes ${errores.length} campos`}. Los datos válidos se conservaron.</p>
    <ul>${enlaces.join('')}</ul>`;
  resumen.hidden = false;
  resumen.querySelectorAll('a[data-campo-destino]').forEach((a) => {
    a.addEventListener('click', (evento) => {
      evento.preventDefault();
      contenedorCampo(formulario, a.dataset.campoDestino)?.querySelector('input, select, textarea')?.focus();
    });
  });
  resumen.focus();
}

/** Quita el error de un campo cuando la persona lo corrige (sin mover el foco). */
export function quitarErrorCampo(formulario, campo) {
  const caja = contenedorCampo(formulario, campo);
  if (!caja) return;
  caja.querySelector(`#error-${CSS.escape(campo)}`)?.remove();
  caja.querySelectorAll('[aria-invalid="true"]').forEach((el) => {
    el.removeAttribute('aria-invalid');
    const resto = (el.getAttribute('aria-describedby') ?? '').split(' ').filter((id) => id && id !== `error-${campo}`);
    if (resto.length) el.setAttribute('aria-describedby', resto.join(' '));
    else el.removeAttribute('aria-describedby');
  });
}

/** Mensaje de resultado en una región viva (éxito o información). */
export function anunciar(contenedor, mensaje, tipo = 'exito', enfocar = true) {
  contenedor.innerHTML = `<div class="aviso aviso--${tipo}" role="status" tabindex="-1"><p>${esc(mensaje)}</p></div>`;
  if (enfocar) contenedor.firstElementChild.focus();
}

/** Desactiva un botón durante una petición e indica el progreso. */
export function marcarOcupado(boton, ocupado, textoOcupado = 'Enviando…') {
  if (ocupado) {
    boton.dataset.textoOriginal = boton.textContent;
    boton.textContent = textoOcupado;
    boton.disabled = true;
    boton.setAttribute('aria-busy', 'true');
  } else {
    boton.textContent = boton.dataset.textoOriginal ?? boton.textContent;
    boton.disabled = false;
    boton.removeAttribute('aria-busy');
  }
}

/**
 * Confirmación accesible con <dialog> (Esc o "Cancelar" la rechazan).
 * @returns {Promise<boolean>}
 */
export function confirmar({ titulo, mensaje, aceptar = 'Confirmar', peligro = false }) {
  return new Promise((resolver) => {
    const dialogo = document.createElement('dialog');
    dialogo.setAttribute('aria-labelledby', 'dialogo-titulo');
    dialogo.innerHTML = `
      <form method="dialog">
        <h2 id="dialogo-titulo">${esc(titulo)}</h2>
        <p>${esc(mensaje)}</p>
        <div class="acciones">
          <button value="si" class="boton ${peligro ? 'boton--peligro' : 'boton--primario'}">${esc(aceptar)}</button>
          <button value="no" class="boton" autofocus>Cancelar</button>
        </div>
      </form>`;
    document.body.append(dialogo);
    dialogo.addEventListener('close', () => {
      resolver(dialogo.returnValue === 'si');
      dialogo.remove();
    });
    dialogo.showModal();
  });
}
