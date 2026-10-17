import { getCollection, escapeHtml } from "./shared.js";
export function initModuloIntegrante2() {}
export function renderMisSolicitudes(container, { user, openDetail }) {
  const list = getCollection("solicitudes").filter(s => s.solicitante_id === user.id);
  container.innerHTML = `
    <section class="card">
      <h2 class="section-title">Mis solicitudes</h2>
      <p class="section-subtitle">Usuario: ${escapeHtml(user.nombre)}</p>
      <div class="table-responsive">
        <table class="table">
          <thead><tr><th>Código</th><th>Prioridad</th><th>Estado</th><th>Descripción</th><th>Acción</th></tr></thead>
          <tbody>
            ${list.length === 0 ? `<tr><td colspan="5">No hay solicitudes registradas.</td></tr>` : list.map(s => `
              <tr>
                <td><strong>${escapeHtml(s.codigo)}</strong></td>
                <td>${escapeHtml(s.prioridad_codigo)}</td>
                <td>${escapeHtml(s.estado_codigo)}</td>
                <td>${escapeHtml(s.descripcion)}</td>
                <td><button class="btn btn-secondary btn-sm" data-id="${s.id}">Ver detalle</button></td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      </div>
    </section>
  `;
  container.querySelectorAll("[data-id]").forEach(b => b.addEventListener("click", () => openDetail(Number(b.getAttribute("data-id")))));
}
export function renderNuevaSolicitud(container) {
  container.innerHTML = `<section class="card"><h2 class="section-title">Nueva solicitud</h2><p class="section-subtitle">Formulario de registro.</p></section>`;
}
