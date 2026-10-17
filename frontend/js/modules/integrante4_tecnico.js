import { getCollection, escapeHtml } from "./shared.js";
export function initModuloIntegrante4() {}
export function renderBandejaTecnico(container, { user, openDetail }) {
  const list = getCollection("solicitudes").filter(s => s.tecnico_id === user.id);
  container.innerHTML = `
    <section class="card">
      <h2 class="section-title">Bandeja de atención técnica</h2>
      <p class="section-subtitle">Asignaciones para ${escapeHtml(user.nombre)}</p>
      <div class="table-responsive">
        <table class="table">
          <thead><tr><th>Código</th><th>Estado</th><th>Prioridad</th><th>Acción</th></tr></thead>
          <tbody>
            ${list.length === 0 ? `<tr><td colspan="4">Sin asignaciones.</td></tr>` : list.map(s => `
              <tr>
                <td><strong>${escapeHtml(s.codigo)}</strong></td>
                <td>${escapeHtml(s.estado_codigo)}</td>
                <td>${escapeHtml(s.prioridad_codigo)}</td>
                <td><button class="btn btn-secondary btn-sm" data-id="${s.id}">Atender</button></td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      </div>
    </section>
  `;
  container.querySelectorAll("[data-id]").forEach(b => b.addEventListener("click", () => openDetail(Number(b.getAttribute("data-id")))));
}
