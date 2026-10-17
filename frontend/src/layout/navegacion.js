/*
 * Menú por rol (tabla 21 del informe) con los títulos del diseño de Figma Make.
 * Cada entrada indica la pantalla y su responsable en la fase II.
 */
export const PANTALLAS = {
  P03: { ruta: '/perfil', titulo: 'Mi perfil', subtitulo: 'Datos de tu cuenta y cambio de contraseña.', menu: 'Mi perfil', movil: 'Perfil', icono: 'perfil', responsable: 'David', tarea: 'DV07' },
  P04: { ruta: '/solicitudes/nueva', titulo: 'Nueva solicitud', subtitulo: 'Describe el problema para que el área responsable lo evalúe.', menu: 'Nueva solicitud', movil: 'Nueva', icono: 'mas', responsable: 'Alex', tarea: 'AX04' },
  P05: { ruta: '/solicitudes', titulo: 'Mis solicitudes', subtitulo: 'Consulta el estado y los plazos de tus solicitudes.', menu: 'Mis solicitudes', movil: 'Solicitudes', icono: 'archivo', responsable: 'Alex', tarea: 'AX04' },
  P07: { ruta: '/supervision', titulo: 'Bandeja de supervisión', subtitulo: 'Evalúa, prioriza y asigna las solicitudes de la facultad.', menu: 'Bandeja de supervisión', movil: 'Bandeja', icono: 'archivo', responsable: 'Marcelo', tarea: 'MR07' },
  P08: { ruta: '/atencion', titulo: 'Atención técnica', subtitulo: 'Tus asignaciones, avances y soluciones.', menu: 'Atención técnica', movil: 'Atención', icono: 'archivo', responsable: 'Emanuel', tarea: 'EM05' },
  P09: { ruta: '/notificaciones', titulo: 'Centro de notificaciones', subtitulo: 'Avisos internos sobre tus solicitudes.', menu: 'Notificaciones', movil: 'Avisos', icono: 'campana', responsable: 'Por asignar', tarea: 'HU16' },
  P10: { ruta: '/dashboard', titulo: 'Dashboard', subtitulo: 'Volumen, cumplimiento y satisfacción del servicio.', menu: 'Dashboard', movil: 'Indicadores', icono: 'inicio', responsable: 'Por asignar', tarea: 'HU17' },
  P11: { ruta: '/admin/usuarios', titulo: 'Administración de usuarios internos', subtitulo: 'Administra accesos, roles y disponibilidad del personal interno.', menu: 'Usuarios internos', movil: 'Usuarios', icono: 'usuario', responsable: 'Gabriel', tarea: 'GB06' },
  P12: { ruta: '/admin/configuracion', titulo: 'Configuración y auditoría', subtitulo: 'Gestiona datos maestros, plazos institucionales y trazabilidad.', menu: 'Configuración y auditoría', movil: 'Configuración', icono: 'escudo', responsable: 'Gabriel', tarea: 'GB06' },
};

const MENU = {
  SOLICITANTE: { seccion: 'GESTIÓN', pantallas: ['P05', 'P04', 'P09'] },
  TECNICO: { seccion: 'ATENCIÓN TÉCNICA', pantallas: ['P08', 'P09'] },
  SUPERVISOR: { seccion: 'SUPERVISIÓN', pantallas: ['P07', 'P10', 'P09'] },
  ADMINISTRADOR: { seccion: 'ADMINISTRACIÓN', pantallas: ['P11', 'P12'] },
};

export const NOMBRE_ROL = {
  SOLICITANTE: 'Solicitante',
  TECNICO: 'Técnico',
  SUPERVISOR: 'Supervisor',
  ADMINISTRADOR: 'Administrador',
};

export function seccionDelRol(rol) {
  return MENU[rol]?.seccion ?? '';
}

export function menuDelRol(rol) {
  return (MENU[rol]?.pantallas ?? []).map((id) => ({ id, ...PANTALLAS[id] }));
}

export function inicioDelRol(rol) {
  return menuDelRol(rol)[0]?.ruta ?? '/perfil';
}

export function pantallaDeRuta(ruta) {
  return Object.entries(PANTALLAS)
    .map(([id, p]) => ({ id, ...p }))
    .find((p) => p.ruta === ruta);
}
