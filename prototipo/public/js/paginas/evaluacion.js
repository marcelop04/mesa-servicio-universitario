/**
 * Acciones del detalle según rol y estado (tabla 4).
 * Responsable: Marcelo (PR05). Inicio y solución del técnico como apoyo al recorrido.
 *
 * Supervisor:
 *  - Registrada → "Iniciar evaluación" (POST /solicitudes/{id}/evaluacion) → En evaluación.
 *  - Pendiente evaluada → "Cambiar prioridad": impacto y urgencia con motivo obligatorio
 *    (10 a 1000); recalcula los límites DESDE LA FECHA DE REGISTRO ORIGINAL (RN05) y
 *    deja un evento con los valores anterior y nuevo.
 *  - En evaluación → "Asignar técnico" activo del área (POST /solicitudes/{id}/asignaciones)
 *    → Asignada; Asignada o En atención → "Reasignar" con motivo, sin reiniciar plazos.
 * Técnico asignado: Asignada → "Iniciar atención"; En atención → "Registrar solución".
 * Las acciones solo se muestran al rol y estado correctos; el servidor vuelve a comprobarlo.
 */
import { api } from '../api.js';
import { IMPACTOS, URGENCIAS, LIMITES, recalcularPorCambioDePrioridad, validarMotivo, validarSolucion } from '../reglas.js';
import { esc, fechaLima, etiquetaPrioridad, tiempoHtml } from '../formato.js';
import {
  mostrarErrorApi, mostrarErroresFormulario, limpiarErroresFormulario, marcarOcupado, confirmar,
} from '../ui.js';

/** Qué acciones ve cada rol en cada estado. */
export function accionesDisponibles(solicitud, sesion) {
  const estado = solicitud.estado_codigo;
  if (sesion.rol === 'SUPERVISOR') {
    return {
      iniciarEvaluacion: estado === 'REGISTRADA',
      cambiarPrioridad: ['EN_EVALUACION', 'ASIGNADA', 'EN_ATENCION'].includes(estado),
      asignar: estado === 'EN_EVALUACION',
      reasignar: ['ASIGNADA', 'EN_ATENCION'].includes(estado),
    };
  }
  if (sesion.rol === 'TECNICO' && solicitud.tecnico_id === sesion.id) {
    return { iniciarAtencion: estado === 'ASIGNADA', resolver: estado === 'EN_ATENCION' };
  }
  return {};
}

const opciones = (lista, actual) => lista.map((o) => `<option value="${o.codigo}" ${o.codigo === actual ? 'selected' : ''}>${esc(o.nombre)}</option>`).join('');

function bloque(id, titulo, cuerpo) {
  return `
    <section class="panel" aria-labelledby="${id}-titulo" data-bloque="${id}">
      <h3 id="${id}-titulo">${esc(titulo)}</h3>
      <div class="aviso aviso--error" tabindex="-1" role="alert" hidden data-resumen></div>
      <div data-error-api></div>
      ${cuerpo}
    </section>`;
}

/**
 * Ejecuta una acción con manejo uniforme de errores.
 * Validación → errores junto a los campos; 409 → recarga; otros → mensaje con Reintentar.
 */
async function ejecutar({ seccion, formulario, boton, textoOcupado, peticion, exito, ctx, tituloError }) {
  const resumen = seccion.querySelector('[data-resumen]');
  const errorApi = seccion.querySelector('[data-error-api]');
  if (formulario) limpiarErroresFormulario(formulario, resumen);
  errorApi.innerHTML = '';
  marcarOcupado(boton, true, textoOcupado);
  try {
    await peticion();
    await ctx.alActualizar(exito);
  } catch (error) {
    marcarOcupado(boton, false);
    if (error.esValidacion && formulario) {
      mostrarErroresFormulario(formulario, error.errores, resumen, tituloError);
    } else if (error.estado === 409) {
      await ctx.alConflicto(error.message);
    } else {
      mostrarErrorApi(errorApi, error, {
        titulo: tituloError,
        nota: 'No se aplicó ningún cambio.',
        alReintentar: () => ejecutar({ seccion, formulario, boton, textoOcupado, peticion, exito, ctx, tituloError }),
        enfocar: true,
      });
    }
  }
}

function contadorMotivo(textarea, salida, min = LIMITES.motivoMin, max = LIMITES.motivoMax) {
  const actualizar = () => {
    salida.textContent = `${textarea.value.trim().length} de ${max} caracteres (mínimo ${min}).`;
  };
  textarea.addEventListener('input', actualizar);
  actualizar();
}

function montarIniciarEvaluacion(raiz, s, ctx) {
  raiz.insertAdjacentHTML('beforeend', bloque('accion-evaluar', 'Evaluación', `
    <p>Revisa la categoría, el impacto y la urgencia indicados por el solicitante. Al iniciar la evaluación podrás ajustar la prioridad y asignar un técnico.</p>
    <button type="button" class="boton boton--primario" data-accion="iniciar-evaluacion">Iniciar evaluación</button>`));
  const seccion = raiz.lastElementChild;
  const boton = seccion.querySelector('button');
  boton.addEventListener('click', () => ejecutar({
    seccion, boton, ctx, textoOcupado: 'Iniciando…', tituloError: 'No se inició la evaluación',
    peticion: () => api.post(`/solicitudes/${s.id}/evaluacion`, { version: s.version }),
    exito: 'Evaluación iniciada: la solicitud pasó a En evaluación.',
  }));
}

function montarCambioPrioridad(raiz, s, ctx) {
  raiz.insertAdjacentHTML('beforeend', bloque('accion-prioridad', 'Cambiar prioridad', `
    <form class="formulario" novalidate data-form="prioridad">
      <p class="ayuda">Prioridad actual: ${etiquetaPrioridad(s.prioridad_codigo)}. Los nuevos límites se calculan desde el registro original (${tiempoHtml(s.registrada_en)}), no desde ahora.</p>
      <div class="dos-columnas">
        <div class="campo" data-campo="impacto">
          <label for="prioridad-impacto">Impacto</label>
          <select id="prioridad-impacto" name="impacto">${opciones(IMPACTOS, s.impacto)}</select>
        </div>
        <div class="campo" data-campo="urgencia">
          <label for="prioridad-urgencia">Urgencia</label>
          <select id="prioridad-urgencia" name="urgencia">${opciones(URGENCIAS, s.urgencia)}</select>
        </div>
      </div>
      <div class="resultado-prioridad" aria-live="polite" data-prueba="vista-recalculo"></div>
      <div class="campo" data-campo="motivo">
        <label for="prioridad-motivo">Motivo del cambio <span class="obligatorio" aria-hidden="true">*</span><span class="solo-lectores">(obligatorio)</span></label>
        <p class="ayuda" id="prioridad-motivo-ayuda">Entre ${LIMITES.motivoMin} y ${LIMITES.motivoMax} caracteres. Queda en el historial.</p>
        <textarea id="prioridad-motivo" name="motivo" rows="3" maxlength="${LIMITES.motivoMax}" aria-describedby="prioridad-motivo-ayuda prioridad-motivo-contador"></textarea>
        <p class="contador" id="prioridad-motivo-contador"></p>
      </div>
      <button type="submit" class="boton boton--primario">Guardar cambio de prioridad</button>
    </form>`));
  const seccion = raiz.lastElementChild;
  const formulario = seccion.querySelector('form');
  const vista = seccion.querySelector('[data-prueba="vista-recalculo"]');
  const boton = formulario.querySelector('button[type="submit"]');
  contadorMotivo(formulario.elements.motivo, seccion.querySelector('#prioridad-motivo-contador'));

  const previsualizar = () => {
    const { impacto, urgencia } = formulario.elements;
    if (impacto.value === s.impacto && urgencia.value === s.urgencia) {
      vista.innerHTML = '<p>Sin cambios: modifica el impacto o la urgencia para ver la nueva prioridad.</p>';
      return;
    }
    const nuevo = recalcularPorCambioDePrioridad(s, impacto.value, urgencia.value);
    vista.innerHTML = `
      <p>Nueva prioridad: ${etiquetaPrioridad(nuevo.prioridad_codigo)}</p>
      <dl class="datos">
        <dt>Límite de primera atención</dt><dd>${esc(fechaLima(s.limite_atencion))} → <strong>${esc(fechaLima(nuevo.limite_atencion))}</strong></dd>
        <dt>Límite de resolución</dt><dd>${esc(fechaLima(s.limite_resolucion))} → <strong>${esc(fechaLima(nuevo.limite_resolucion))}</strong></dd>
      </dl>`;
  };
  formulario.addEventListener('change', previsualizar);
  previsualizar();

  formulario.addEventListener('submit', async (evento) => {
    evento.preventDefault();
    const datos = { impacto: formulario.elements.impacto.value, urgencia: formulario.elements.urgencia.value, motivo: formulario.elements.motivo.value.trim() };
    const resumen = seccion.querySelector('[data-resumen]');
    const errores = [];
    if (datos.impacto === s.impacto && datos.urgencia === s.urgencia) errores.push({ campo: 'impacto', mensaje: 'No hay cambios: modifica el impacto o la urgencia.' });
    errores.push(...validarMotivo(datos.motivo));
    if (errores.length) {
      mostrarErroresFormulario(formulario, errores, resumen, 'No se cambió la prioridad');
      return;
    }
    const nuevo = recalcularPorCambioDePrioridad(s, datos.impacto, datos.urgencia);
    const ok = await confirmar({
      titulo: 'Confirmar cambio de prioridad',
      mensaje: `La prioridad pasará a ${etiquetaTexto(nuevo.prioridad_codigo)} y los límites se recalcularán desde el registro original. El cambio quedará en el historial.`,
      aceptar: 'Cambiar prioridad',
    });
    if (!ok) return;
    ejecutar({
      seccion, formulario, boton, ctx, textoOcupado: 'Guardando…', tituloError: 'No se cambió la prioridad',
      peticion: () => api.post(`/solicitudes/${s.id}/evaluacion`, { ...datos, version: s.version }),
      exito: `Prioridad actualizada a ${etiquetaTexto(nuevo.prioridad_codigo)}; límites recalculados desde el registro.`,
    });
  });
}

const etiquetaTexto = (codigo) => ({ CRITICA: 'Crítica', ALTA: 'Alta', MEDIA: 'Media', BAJA: 'Baja' })[codigo];

function montarAsignacion(raiz, s, ctx, esReasignacion) {
  const titulo = esReasignacion ? 'Reasignar responsable' : 'Asignar técnico';
  raiz.insertAdjacentHTML('beforeend', bloque('accion-asignar', titulo, `
    <form class="formulario" novalidate data-form="asignacion">
      <p class="ayuda">Solo se muestran técnicos activos del área ${esc(s.area_nombre)}. La carga es un apoyo: la asignación es manual.${esReasignacion ? ' Reasignar no reinicia fechas ni plazos.' : ''}</p>
      <div data-carga><p role="status">Cargando técnicos…</p></div>
      <div class="campo" data-campo="tecnico_id">
        <label for="asignar-tecnico">Técnico <span class="obligatorio" aria-hidden="true">*</span><span class="solo-lectores">(obligatorio)</span></label>
        <select id="asignar-tecnico" name="tecnico_id" disabled><option value="">Cargando…</option></select>
      </div>
      ${esReasignacion ? `
      <div class="campo" data-campo="motivo">
        <label for="asignar-motivo">Motivo de la reasignación <span class="obligatorio" aria-hidden="true">*</span><span class="solo-lectores">(obligatorio)</span></label>
        <textarea id="asignar-motivo" name="motivo" rows="3" maxlength="${LIMITES.motivoMax}" aria-describedby="asignar-motivo-contador"></textarea>
        <p class="contador" id="asignar-motivo-contador"></p>
      </div>` : ''}
      <button type="submit" class="boton boton--primario" disabled>${esReasignacion ? 'Reasignar' : 'Asignar técnico'}</button>
    </form>`));
  const seccion = raiz.lastElementChild;
  const formulario = seccion.querySelector('form');
  const select = formulario.elements.tecnico_id;
  const boton = formulario.querySelector('button[type="submit"]');
  if (esReasignacion) contadorMotivo(formulario.elements.motivo, seccion.querySelector('#asignar-motivo-contador'));

  const cargarTecnicos = async () => {
    const carga = seccion.querySelector('[data-carga]');
    carga.innerHTML = '<p role="status">Cargando técnicos…</p>';
    try {
      const { items } = await api.get('/catalogos', { tipo: 'tecnicos', area_id: s.area_id });
      const disponibles = items.filter((t) => t.id !== s.tecnico_id);
      carga.innerHTML = `
        <table class="tabla" data-prueba="carga-tecnicos">
          <caption>Carga pendiente por técnico del área</caption>
          <thead><tr><th scope="col">Técnico</th><th scope="col">Solicitudes pendientes</th></tr></thead>
          <tbody>${items.map((t) => `<tr><td>${esc(t.nombre)}${t.id === s.tecnico_id ? ' (responsable actual)' : ''}</td><td>${t.carga_pendiente}</td></tr>`).join('')}</tbody>
        </table>`;
      select.innerHTML = `<option value="">Selecciona un técnico</option>${disponibles.map((t) => `<option value="${t.id}">${esc(t.nombre)} — ${t.carga_pendiente} pendientes</option>`).join('')}`;
      select.disabled = false;
      boton.disabled = disponibles.length === 0;
      if (!disponibles.length) carga.insertAdjacentHTML('beforeend', '<p class="aviso aviso--atencion">No hay otro técnico activo en esta área.</p>');
    } catch (error) {
      mostrarErrorApi(carga, error, { titulo: 'No se pudieron cargar los técnicos', alReintentar: cargarTecnicos });
    }
  };
  cargarTecnicos();

  formulario.addEventListener('submit', async (evento) => {
    evento.preventDefault();
    const resumen = seccion.querySelector('[data-resumen]');
    const datos = { tecnico_id: Number(select.value) || null };
    const errores = [];
    if (!datos.tecnico_id) errores.push({ campo: 'tecnico_id', mensaje: 'Selecciona un técnico.' });
    if (esReasignacion) {
      datos.motivo = formulario.elements.motivo.value.trim();
      errores.push(...validarMotivo(datos.motivo));
    }
    if (errores.length) {
      mostrarErroresFormulario(formulario, errores, resumen, `No se pudo ${esReasignacion ? 'reasignar' : 'asignar'}`);
      return;
    }
    const nombre = select.selectedOptions[0].textContent.split(' — ')[0];
    if (esReasignacion) {
      const ok = await confirmar({ titulo: 'Confirmar reasignación', mensaje: `El nuevo responsable será ${nombre}. Las fechas y plazos no cambian.`, aceptar: 'Reasignar' });
      if (!ok) return;
    }
    ejecutar({
      seccion, formulario, boton, ctx, textoOcupado: 'Asignando…', tituloError: `No se pudo ${esReasignacion ? 'reasignar' : 'asignar'}`,
      peticion: () => api.post(`/solicitudes/${s.id}/asignaciones`, { ...datos, version: s.version }),
      exito: esReasignacion ? `Responsable reasignado a ${nombre}.` : `Solicitud asignada a ${nombre}: estado Asignada.`,
    });
  });
}

function montarInicio(raiz, s, ctx) {
  raiz.insertAdjacentHTML('beforeend', bloque('accion-inicio', 'Iniciar atención', `
    <p>Registra el comienzo real del trabajo. La primera atención se guarda una sola vez.</p>
    <button type="button" class="boton boton--primario">Iniciar atención</button>`));
  const seccion = raiz.lastElementChild;
  const boton = seccion.querySelector('button');
  boton.addEventListener('click', () => ejecutar({
    seccion, boton, ctx, textoOcupado: 'Iniciando…', tituloError: 'No se inició la atención',
    peticion: () => api.post(`/solicitudes/${s.id}/inicio`, { version: s.version }),
    exito: 'Atención iniciada: la solicitud pasó a En atención.',
  }));
}

function montarResolucion(raiz, s, ctx) {
  raiz.insertAdjacentHTML('beforeend', bloque('accion-resolver', 'Registrar solución', `
    <form class="formulario" novalidate>
      <div class="campo" data-campo="solucion">
        <label for="resolver-solucion">Descripción de la solución <span class="obligatorio" aria-hidden="true">*</span><span class="solo-lectores">(obligatorio)</span></label>
        <textarea id="resolver-solucion" name="solucion" rows="4" maxlength="${LIMITES.solucionMax}" aria-describedby="resolver-contador"></textarea>
        <p class="contador" id="resolver-contador"></p>
      </div>
      <button type="submit" class="boton boton--primario">Registrar solución</button>
    </form>`));
  const seccion = raiz.lastElementChild;
  const formulario = seccion.querySelector('form');
  const boton = formulario.querySelector('button');
  contadorMotivo(formulario.elements.solucion, seccion.querySelector('#resolver-contador'), LIMITES.solucionMin, LIMITES.solucionMax);
  formulario.addEventListener('submit', (evento) => {
    evento.preventDefault();
    const solucion = formulario.elements.solucion.value.trim();
    const errores = validarSolucion(solucion);
    if (errores.length) {
      mostrarErroresFormulario(formulario, errores, seccion.querySelector('[data-resumen]'), 'No se registró la solución');
      return;
    }
    ejecutar({
      seccion, formulario, boton, ctx, textoOcupado: 'Registrando…', tituloError: 'No se registró la solución',
      peticion: () => api.post(`/solicitudes/${s.id}/resoluciones`, { solucion, version: s.version }),
      exito: 'Solución registrada: la solicitud pasó a Resuelta.',
    });
  });
}

/**
 * Dibuja las acciones permitidas y devuelve si hay alguna.
 * @param {{alActualizar:(mensaje:string)=>Promise, alConflicto:(mensaje:string)=>Promise}} ctx
 */
export function renderAcciones(raiz, solicitud, sesion, ctx) {
  const a = accionesDisponibles(solicitud, sesion);
  raiz.innerHTML = '';
  if (a.iniciarEvaluacion) montarIniciarEvaluacion(raiz, solicitud, ctx);
  if (a.cambiarPrioridad) montarCambioPrioridad(raiz, solicitud, ctx);
  if (a.asignar) montarAsignacion(raiz, solicitud, ctx, false);
  if (a.reasignar) montarAsignacion(raiz, solicitud, ctx, true);
  if (a.iniciarAtencion) montarInicio(raiz, solicitud, ctx);
  if (a.resolver) montarResolucion(raiz, solicitud, ctx);
  return raiz.children.length > 0;
}
