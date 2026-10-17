import { getDb, getActiveUser, setActiveUser } from "./storage.js";
const routes = [];

export function registerEndpoint(method, pathPattern, handler, options = { authRequired: true, roles: null }) {
  const paramNames = [];
  const regexPath = pathPattern.replace(/\{([^}]+)\}/g, (_, name) => { paramNames.push(name); return "([^/]+)"; });
  routes.push({ method: method.toUpperCase(), regex: new RegExp(`^${regexPath}$`), paramNames, handler, options });
}

export function createApiError(status, codigo, mensaje, erroresCampo = null) {
  return { isApiError: true, status, codigo, mensaje, erroresCampo, correlacionId: `corr-${Date.now()}` };
}

export async function apiFetch(url, options = {}) {
  const method = (options.method || "GET").toUpperCase();
  const parsed = new URL(url, window.location.origin);
  const pathname = parsed.pathname;
  await new Promise(r => setTimeout(r, 100));

  const matched = routes.find(r => r.method === method && r.regex.test(pathname));
  if (!matched) throw createApiError(404, "RUTA_NO_ENCONTRADA", `Operación no registrada: ${method} ${pathname}`);

  const match = pathname.match(matched.regex);
  const params = {};
  matched.paramNames.forEach((n, i) => { params[n] = match[i + 1]; });

  const user = getActiveUser();
  if (matched.options.authRequired && !user) throw createApiError(401, "NO_AUTENTICADO", "Debe iniciar sesión.");
  if (matched.options.roles && (!user || !matched.options.roles.includes(user.rol_codigo))) {
    throw createApiError(403, "ACCESO_DENEGADO", "No tiene permisos para esta operación.");
  }

  let body = options.body ? (typeof options.body === "string" ? JSON.parse(options.body) : options.body) : null;
  try {
    return await matched.handler({ params, query: Object.fromEntries(parsed.searchParams.entries()), body, user });
  } catch (err) {
    if (err && err.isApiError) throw err;
    throw createApiError(500, "ERROR_INTERNO", err?.message || "Error inesperado.");
  }
}

export function registerCoreEndpoints() {
  registerEndpoint("POST", "/api/v1/auth/login", ({ body }) => {
    const correo = (body?.correo || "").trim().toLowerCase();
    const pass = body?.password || "";
    if (!correo || !pass) throw createApiError(400, "DATOS_INVALIDOS", "Ingrese correo y contraseña.");
    const db = getDb();
    const user = db.usuarios.find(u => u.correo.toLowerCase() === correo);
    if (!user || user.password_demo !== pass) throw createApiError(401, "CREDENCIALES_INVALIDAS", "Correo o contraseña incorrectos.");
    if (!user.activo) throw createApiError(403, "CUENTA_DESACTIVADA", "Cuenta desactivada.");
    setActiveUser(user.id);
    const { password_demo, ...safe } = user;
    return { usuario: safe };
  }, { authRequired: false });

  registerEndpoint("POST", "/api/v1/auth/logout", () => { setActiveUser(null); return { ok: true }; }, { authRequired: true });
}
