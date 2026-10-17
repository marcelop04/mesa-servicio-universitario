export const INITIAL_DATA = {
  roles: [
    { id: 1, codigo: "SOLICITANTE", nombre_visible: "Solicitante" },
    { id: 2, codigo: "TECNICO", nombre_visible: "Técnico" },
    { id: 3, codigo: "SUPERVISOR", nombre_visible: "Supervisor" },
    { id: 4, codigo: "ADMINISTRADOR", nombre_visible: "Administrador" }
  ],
  areas: [
    { id: 1, nombre: "Soporte informático", activo: true },
    { id: 2, nombre: "Mantenimiento", activo: true },
    { id: 3, nombre: "Servicios generales", activo: true }
  ],
  categorias: [
    { id: 1, nombre: "Soporte informático / Proyectores y equipos", area_id: 1, activo: true },
    { id: 2, nombre: "Soporte informático / Conectividad y software", area_id: 1, activo: true },
    { id: 3, nombre: "Mantenimiento / Mobiliario e infraestructura", area_id: 2, activo: true },
    { id: 4, nombre: "Mantenimiento / Luminarias y electricidad", area_id: 2, activo: true },
    { id: 5, nombre: "Servicios generales / Limpieza de aula", area_id: 3, activo: true },
    { id: 6, nombre: "Servicios generales / Acondicionamiento de espacio", area_id: 3, activo: true }
  ],
  ubicaciones: [
    { id: 1, edificio: "Edificio A", ambiente: "Aula 204", activo: true },
    { id: 2, edificio: "Edificio A", ambiente: "Laboratorio 102", activo: true },
    { id: 3, edificio: "Edificio B", ambiente: "Aula 301", activo: true },
    { id: 4, edificio: "Pabellón Central", ambiente: "Auditorio Principal", activo: true }
  ],
  estados: [
    { codigo: "REGISTRADA", nombre_visible: "Registrada" },
    { codigo: "EN_EVALUACION", nombre_visible: "En evaluación" },
    { codigo: "ASIGNADA", nombre_visible: "Asignada" },
    { codigo: "EN_ATENCION", nombre_visible: "En atención" },
    { codigo: "RESUELTA", nombre_visible: "Resuelta" },
    { codigo: "CERRADA", nombre_visible: "Cerrada" },
    { codigo: "CANCELADA", nombre_visible: "Cancelada" }
  ],
  prioridades: [
    { codigo: "CRITICA", nombre_visible: "Crítica", orden: 1 },
    { codigo: "ALTA", nombre_visible: "Alta", orden: 2 },
    { codigo: "MEDIA", nombre_visible: "Media", orden: 3 },
    { codigo: "BAJA", nombre_visible: "Baja", orden: 4 }
  ],
  usuarios: [
    { id: 1, nombre: "Ana Solicitante", correo: "solicitante@unmsm.edu.pe", password_demo: "Demo123456", vinculo: "Estudiante", rol_codigo: "SOLICITANTE", area_id: null, activo: true },
    { id: 2, nombre: "Carlos Supervisor", correo: "supervisor@unmsm.edu.pe", password_demo: "Demo123456", vinculo: "Administrativo", rol_codigo: "SUPERVISOR", area_id: null, activo: true },
    { id: 3, nombre: "Técnico A (Informática)", correo: "tecnico@unmsm.edu.pe", password_demo: "Demo123456", vinculo: "Administrativo", rol_codigo: "TECNICO", area_id: 1, activo: true },
    { id: 4, nombre: "Técnico B (Mantenimiento)", correo: "tecnico.mant@unmsm.edu.pe", password_demo: "Demo123456", vinculo: "Administrativo", rol_codigo: "TECNICO", area_id: 2, activo: true },
    { id: 5, nombre: "Técnico C (Servicios Generales)", correo: "tecnico.serv@unmsm.edu.pe", password_demo: "Demo123456", vinculo: "Administrativo", rol_codigo: "TECNICO", area_id: 3, activo: true },
    { id: 6, nombre: "Usuario Inactivo", correo: "inactivo@unmsm.edu.pe", password_demo: "Demo123456", vinculo: "Docente", rol_codigo: "TECNICO", area_id: 1, activo: false }
  ],
  solicitudes: [
    {
      id: 1,
      codigo: "MSU-000123",
      solicitante_id: 1,
      categoria_id: 1,
      area_id: 1,
      ubicacion_id: 1,
      referencia: "Frente a la pizarra acrílica",
      descripcion: "El proyector no enciende y la clase no puede usar la presentación programada.",
      impacto: "MEDIO",
      urgencia: "ALTA",
      prioridad_codigo: "ALTA",
      estado_codigo: "EN_ATENCION",
      tecnico_id: 3,
      registrada_en: "2026-10-15T13:00:00.000Z",
      primera_atencion_en: "2026-10-15T15:00:00.000Z",
      limite_atencion: "2026-10-15T21:00:00.000Z",
      limite_resolucion: "2026-10-17T13:00:00.000Z",
      version: 2
    }
  ],
  historial: [
    { id: 1, solicitud_id: 1, actor_id: 1, accion: "CREACION", anterior: null, nuevo: "REGISTRADA", motivo: "Registro inicial", creado_en: "2026-10-15T13:00:00.000Z" }
  ],
  secuencia_codigo: 124
};
