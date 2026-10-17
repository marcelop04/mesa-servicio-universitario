/**
 * Acceso simulado por rol (P02 del prototipo).
 * Responsable: Gabriel (PR01).
 *
 * Lista las cuentas de demostración, simula POST /api/v1/auth/login con el
 * correo elegido y guarda el perfil público en sessionStorage.
 */
import { api } from '../api.js';
import { obtenerSesion, guardarSesion, INICIO_POR_ROL } from '../sesion.js';
import { esc } from '../formato.js';
import { mostrarErrorApi, mostrarErroresFormulario, limpiarErroresFormulario, marcarOcupado } from '../ui.js';
import { htmlHerramientasDemo, activarHerramientasDemo } from '../layout.js';

const ORDEN_ROLES = ['SOLICITANTE', 'TECNICO', 'SUPERVISOR', 'ADMINISTRADOR'];
const formulario = document.getElementById('form-acceso');
const contenedorCuentas = document.getElementById('cuentas');
const resumen = document.getElementById('resumen-errores');
const mensaje = document.getElementById('mensaje');
const boton = document.getElementById('boton-ingresar');

const parametros = new URLSearchParams(location.search);
const volverA = parametros.get('volver');

function destinoTrasIngreso(rol) {
  // Solo se acepta volver a una página local del prototipo.
  if (volverA && /^[a-z-]+\.html(\?.*)?$/.test(volverA)) return volverA;
  return INICIO_POR_ROL[rol];
}

const sesionActual = obtenerSesion();
if (sesionActual) location.replace(destinoTrasIngreso(sesionActual.rol));

const panelDemo = document.getElementById('panel-demo');
panelDemo.innerHTML = htmlHerramientasDemo();
activarHerramientasDemo(panelDemo);

async function cargarCuentas() {
  contenedorCuentas.innerHTML = '<p role="status">Cargando cuentas…</p>';
  try {
    const { items } = await api.get('/demo/cuentas');
    const grupos = ORDEN_ROLES.map((rol) => items.filter((c) => c.rol === rol)).filter((g) => g.length);
    contenedorCuentas.innerHTML = grupos.map((grupo) => `
      <h2 class="etiqueta-campo">${esc(grupo[0].rol_nombre)}</h2>
      <div class="cuentas">
        ${grupo.map((c) => `
          <label class="opcion">
            <input type="radio" name="correo" value="${esc(c.correo)}" id="cuenta-${c.id}">
            <span class="opcion__titulo">${esc(c.nombre)}</span>
            <span class="opcion__ejemplo">${esc(c.rol_nombre)}${c.area_nombre ? ` · ${esc(c.area_nombre)}` : ''} · ${esc(c.vinculo)}<br>${esc(c.correo)}</span>
          </label>`).join('')}
      </div>`).join('');
    boton.disabled = false;
  } catch (error) {
    boton.disabled = true;
    mostrarErrorApi(contenedorCuentas, error, { titulo: 'No se pudieron cargar las cuentas de demostración', alReintentar: cargarCuentas });
  }
}

formulario.addEventListener('submit', async (evento) => {
  evento.preventDefault();
  limpiarErroresFormulario(formulario, resumen);
  mensaje.innerHTML = '';
  const correo = formulario.elements.correo?.value;
  if (!correo) {
    mostrarErroresFormulario(formulario, [{ campo: 'correo', mensaje: 'Elige una cuenta de demostración para continuar.' }], resumen, 'No se pudo ingresar');
    return;
  }
  marcarOcupado(boton, true, 'Ingresando…');
  try {
    const perfil = await api.post('/auth/login', { correo });
    guardarSesion(perfil);
    location.href = destinoTrasIngreso(perfil.rol);
  } catch (error) {
    marcarOcupado(boton, false);
    mostrarErrorApi(mensaje, error, { titulo: 'No se pudo ingresar', alReintentar: () => formulario.requestSubmit(), enfocar: true });
  }
});

cargarCuentas();
