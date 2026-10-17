/**
 * P12 Catálogos (mini vista del administrador).
 * Responsable: Gabriel (estructura) con la API de David (D07).
 *
 * GET /api/v1/admin/catalogos/{tipo} lista activos e inactivos.
 * DELETE /api/v1/admin/catalogos/{tipo}/{id} es una desactivación lógica
 * (activo=false, RN11): el registro se conserva para las solicitudes anteriores.
 * PUT /api/v1/admin/catalogos/{tipo}/{id} con { activo: true } lo reactiva.
 */
import { iniciarPagina } from '../layout.js';
import { api } from '../api.js';
import { esc } from '../formato.js';
import { mostrarCargando, mostrarErrorApi, anunciar, confirmar } from '../ui.js';

const sesion = iniciarPagina({ roles: ['ADMINISTRADOR'], activa: 'catalogos' });
const vista = document.getElementById('vista');
const avisoAccion = document.getElementById('aviso-accion');
document.getElementById('subtitulo').textContent = 'Áreas, categorías y ubicaciones. Los registros usados se desactivan; no se borran.';

const TIPOS = [
  { tipo: 'areas', titulo: 'Áreas', nombre: (r) => r.nombre },
  { tipo: 'categorias', titulo: 'Categorías', nombre: (r, areas) => `${r.nombre} (${areas.get(r.area_id) ?? 'sin área'})` },
  { tipo: 'ubicaciones', titulo: 'Ubicaciones', nombre: (r) => `${r.edificio} — ${r.ambiente}` },
];

async function cargar() {
  mostrarCargando(vista, 'Cargando catálogos…');
  try {
    const datos = await Promise.all(TIPOS.map((t) => api.get(`/admin/catalogos/${t.tipo}`, { 'tamaño': 100 })));
    const areas = new Map(datos[0].items.map((a) => [a.id, a.nombre]));
    vista.innerHTML = TIPOS.map((t, i) => `
      <section class="panel" aria-labelledby="titulo-${t.tipo}">
        <h2 id="titulo-${t.tipo}">${t.titulo}</h2>
        <table class="tabla tabla--tarjetas">
          <thead><tr><th scope="col">Nombre</th><th scope="col">Estado</th><th scope="col">Acción</th></tr></thead>
          <tbody>
            ${datos[i].items.map((r) => `
              <tr data-registro="${t.tipo}-${r.id}">
                <td data-etiqueta="Nombre">${esc(t.nombre(r, areas))}</td>
                <td data-etiqueta="Estado"><span class="etiqueta ${r.activo ? 'etiqueta--estado-RESUELTA' : 'etiqueta--neutra'}">${r.activo ? 'Activo' : 'Inactivo'}</span></td>
                <td data-etiqueta="Acción">
                  ${r.activo
                    ? `<button type="button" class="boton boton--pequeno boton--peligro" data-desactivar="${t.tipo}/${r.id}" data-nombre="${esc(t.nombre(r, areas))}">Desactivar</button>`
                    : `<button type="button" class="boton boton--pequeno" data-reactivar="${t.tipo}/${r.id}">Reactivar</button>`}
                </td>
              </tr>`).join('')}
          </tbody>
        </table>
      </section>`).join('');
    vista.querySelectorAll('[data-desactivar]').forEach((b) => b.addEventListener('click', async () => {
      const ok = await confirmar({ titulo: 'Desactivar registro', mensaje: `«${b.dataset.nombre}» dejará de ofrecerse en nuevas solicitudes, pero seguirá visible en los casos anteriores.`, aceptar: 'Desactivar', peligro: true });
      if (ok) accion(b, () => api.eliminar(`/admin/catalogos/${b.dataset.desactivar}`), 'Registro desactivado (baja lógica).');
    }));
    vista.querySelectorAll('[data-reactivar]').forEach((b) => b.addEventListener('click', () => accion(b, () => api.put(`/admin/catalogos/${b.dataset.reactivar}`, { activo: true }), 'Registro reactivado.')));
  } catch (error) {
    mostrarErrorApi(vista, error, { titulo: 'No se pudieron cargar los catálogos', alReintentar: cargar });
  }
}

async function accion(boton, peticion, mensaje) {
  boton.disabled = true;
  try {
    await peticion();
    await cargar();
    anunciar(avisoAccion, mensaje);
  } catch (error) {
    boton.disabled = false;
    mostrarErrorApi(avisoAccion, error, { titulo: 'No se aplicó el cambio', alReintentar: () => accion(boton, peticion, mensaje), enfocar: true });
  }
}

if (sesion) {
  document.getElementById('actualizar').addEventListener('click', cargar);
  cargar();
}
