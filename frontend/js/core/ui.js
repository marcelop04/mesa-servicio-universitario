const ROLE_NAVIGATION = {
  SOLICITANTE: [{ id: "mis-solicitudes", label: "Mis solicitudes" }, { id: "nueva-solicitud", label: "Nueva solicitud" }],
  SUPERVISOR: [{ id: "bandeja-supervisor", label: "Bandeja de supervisión" }],
  TECNICO: [{ id: "bandeja-tecnico", label: "Mis asignaciones" }]
};

const ROLE_LABELS = { SOLICITANTE: "Solicitante", SUPERVISOR: "Supervisor", TECNICO: "Técnico", ADMINISTRADOR: "Administrador" };

export function showGlobalMessage(text, type = "info", autoHideMs = 4500) {
  const container = document.getElementById("global-alert-container");
  if (!container) return;
  const cls = type === "error" ? "alert-error" : type === "success" ? "alert-success" : "alert-warning";
  const el = document.createElement("div");
  el.className = `alert ${cls}`;
  el.innerHTML = `<span>${escapeHtml(text)}</span><button type="button" class="btn btn-sm">✕</button>`;
  el.querySelector("button").addEventListener("click", () => el.remove());
  container.innerHTML = "";
  container.appendChild(el);
  if (autoHideMs > 0) setTimeout(() => { if (el.parentNode) el.remove(); }, autoHideMs);
}

export function clearGlobalMessages() {
  const c = document.getElementById("global-alert-container");
  if (c) c.innerHTML = "";
}

export function renderHeaderAndNav(user, currentViewId, onNavigate) {
  const userBadge = document.getElementById("user-badge");
  const userName = document.getElementById("user-name");
  const userRole = document.getElementById("user-role");
  const sidebar = document.getElementById("app-sidebar");
  const navList = document.getElementById("nav-list");
  const menuToggle = document.getElementById("btn-menu-toggle");

  if (!user) {
    userBadge.hidden = true;
    sidebar.hidden = true;
    sidebar.classList.remove("open");
    menuToggle.hidden = true;
    navList.innerHTML = "";
    return;
  }

  userBadge.hidden = false;
  userName.textContent = user.nombre;
  userRole.textContent = ROLE_LABELS[user.rol_codigo] || user.rol_codigo;

  const items = ROLE_NAVIGATION[user.rol_codigo] || [];
  sidebar.hidden = false;
  menuToggle.hidden = false;

  navList.innerHTML = items.map(i => `<li><button type="button" class="nav-btn ${i.id === currentViewId ? "active" : ""}" data-view="${i.id}">${escapeHtml(i.label)}</button></li>`).join("");
  navList.querySelectorAll(".nav-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      sidebar.classList.remove("open");
      menuToggle.setAttribute("aria-expanded", "false");
      onNavigate(btn.getAttribute("data-view"));
    });
  });
}

export function renderLoginView(container, onLoginSubmit) {
  container.innerHTML = `
    <section class="card login-wrapper">
      <h2 class="section-title">Iniciar sesión</h2>
      <p class="section-subtitle">Ingrese con su cuenta universitaria o seleccione una cuenta demo.</p>
      <div id="login-error-box" hidden></div>
      <form id="login-form">
        <div class="form-group">
          <label class="form-label" for="login-correo">Correo electrónico</label>
          <input type="email" id="login-correo" class="form-control" placeholder="usuario@unmsm.edu.pe" required />
        </div>
        <div class="form-group">
          <label class="form-label" for="login-password">Contraseña</label>
          <input type="password" id="login-password" class="form-control" placeholder="••••••••••" required />
        </div>
        <button type="submit" class="btn btn-primary" style="width: 100%;">Iniciar sesión</button>
      </form>
      <div class="demo-accounts">
        <p class="form-label">Cuentas rápidas de demostración:</p>
        <div class="demo-grid">
          <button type="button" class="btn btn-secondary btn-sm" data-email="solicitante@unmsm.edu.pe">Solicitante</button>
          <button type="button" class="btn btn-secondary btn-sm" data-email="supervisor@unmsm.edu.pe">Supervisor</button>
          <button type="button" class="btn btn-secondary btn-sm" data-email="tecnico@unmsm.edu.pe">Técnico Info.</button>
          <button type="button" class="btn btn-secondary btn-sm" data-email="inactivo@unmsm.edu.pe">Inactivo</button>
        </div>
      </div>
    </section>
  `;

  const form = container.querySelector("#login-form");
  const email = container.querySelector("#login-correo");
  const pass = container.querySelector("#login-password");
  const errBox = container.querySelector("#login-error-box");

  container.querySelectorAll("[data-email]").forEach(b => {
    b.addEventListener("click", () => {
      email.value = b.getAttribute("data-email");
      pass.value = "Demo123456";
      errBox.hidden = true;
    });
  });

  form.addEventListener("submit", async e => {
    e.preventDefault();
    errBox.hidden = true;
    try {
      await onLoginSubmit(email.value, pass.value);
    } catch (err) {
      errBox.hidden = false;
      errBox.className = "alert alert-error";
      errBox.textContent = err?.mensaje || "Error al iniciar sesión.";
    }
  });
}

export function escapeHtml(str) {
  return String(str ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}
