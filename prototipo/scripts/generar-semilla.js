/**
 * Generador de los datos simulados iniciales (db.seed.json).
 * Responsable: David (base: repositorio y datos ficticios).
 *
 * Todos los nombres, correos y casos son ficticios. Las fechas límite,
 * la prioridad y la matriz aplicada se calculan con el mismo módulo de
 * reglas que usa la aplicación, para que los datos sean coherentes con
 * la sección 5 del informe. Uso: `npm run semilla` (sobrescribe db.seed.json).
 */
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { POLITICA_V1, PRIORIDADES, ESTADOS, calcularPrioridad, calcularLimites, sumarHorasCorridas } from '../public/js/reglas.js';

const destino = fileURLToPath(new URL('../db.seed.json', import.meta.url));

const roles = [
  { id: 1, codigo: 'SOLICITANTE', nombre_visible: 'Solicitante' },
  { id: 2, codigo: 'TECNICO', nombre_visible: 'Técnico' },
  { id: 3, codigo: 'SUPERVISOR', nombre_visible: 'Supervisor' },
  { id: 4, codigo: 'ADMINISTRADOR', nombre_visible: 'Administrador' },
];

const areas = [
  { id: 1, nombre: 'Soporte informático', activo: true },
  { id: 2, nombre: 'Mantenimiento', activo: true },
  { id: 3, nombre: 'Servicios generales', activo: true },
];

const categorias = [
  { id: 1, nombre: 'Equipo de cómputo', area_id: 1, activo: true },
  { id: 2, nombre: 'Proyector y audio', area_id: 1, activo: true },
  { id: 3, nombre: 'Software académico', area_id: 1, activo: true },
  { id: 4, nombre: 'Conectividad y red', area_id: 1, activo: true },
  { id: 5, nombre: 'Impresoras y escáneres', area_id: 1, activo: false },
  { id: 6, nombre: 'Mobiliario', area_id: 2, activo: true },
  { id: 7, nombre: 'Puertas y cerraduras', area_id: 2, activo: true },
  { id: 8, nombre: 'Iluminación y electricidad', area_id: 2, activo: true },
  { id: 9, nombre: 'Gasfitería', area_id: 2, activo: true },
  { id: 10, nombre: 'Limpieza de ambientes', area_id: 3, activo: true },
  { id: 11, nombre: 'Reubicación de mobiliario', area_id: 3, activo: true },
];

const ubicaciones = [
  { id: 1, edificio: 'Pabellón A', ambiente: 'Aula 101', activo: true },
  { id: 2, edificio: 'Pabellón A', ambiente: 'Aula 102', activo: true },
  { id: 3, edificio: 'Pabellón A', ambiente: 'Aula 203', activo: true },
  { id: 4, edificio: 'Pabellón B', ambiente: 'Laboratorio de cómputo 1', activo: true },
  { id: 5, edificio: 'Pabellón B', ambiente: 'Laboratorio de cómputo 2', activo: true },
  { id: 6, edificio: 'Biblioteca', ambiente: 'Sala de lectura', activo: true },
  { id: 7, edificio: 'Edificio administrativo', ambiente: 'Servicios higiénicos del primer piso', activo: true },
  { id: 8, edificio: 'Auditorio', ambiente: 'Sala principal', activo: true },
  { id: 9, edificio: 'Pabellón C', ambiente: 'Aula 305 (en remodelación)', activo: false },
];

const usuarios = [
  { id: 1, nombre: 'Lucía Ramos Quispe', correo: 'lucia.ramos@demo.edu.pe', vinculo: 'Estudiante', rol_id: 1, area_id: null, activo: true },
  { id: 2, nombre: 'Jorge Mendoza Salas', correo: 'jorge.mendoza@demo.edu.pe', vinculo: 'Docente', rol_id: 1, area_id: null, activo: true },
  { id: 3, nombre: 'Sofía León Aguirre', correo: 'sofia.leon@demo.edu.pe', vinculo: 'Administrativo', rol_id: 1, area_id: null, activo: true },
  { id: 4, nombre: 'Carla Huamán Torres', correo: 'carla.huaman@demo.edu.pe', vinculo: 'Administrativo', rol_id: 2, area_id: 1, activo: true },
  { id: 5, nombre: 'Diego Salazar Núñez', correo: 'diego.salazar@demo.edu.pe', vinculo: 'Administrativo', rol_id: 2, area_id: 1, activo: true },
  { id: 6, nombre: 'Pedro Vargas Lino', correo: 'pedro.vargas@demo.edu.pe', vinculo: 'Administrativo', rol_id: 2, area_id: 2, activo: true },
  { id: 7, nombre: 'Rosa Paredes Cano', correo: 'rosa.paredes@demo.edu.pe', vinculo: 'Administrativo', rol_id: 2, area_id: 3, activo: true },
  { id: 8, nombre: 'Miguel Torres Ríos', correo: 'miguel.torres@demo.edu.pe', vinculo: 'Administrativo', rol_id: 2, area_id: 1, activo: false },
  { id: 9, nombre: 'Ana Castillo Vera', correo: 'ana.castillo@demo.edu.pe', vinculo: 'Docente', rol_id: 3, area_id: null, activo: true },
  { id: 10, nombre: 'Luis Gutiérrez Pinto', correo: 'luis.gutierrez@demo.edu.pe', vinculo: 'Administrativo', rol_id: 4, area_id: null, activo: true },
].map((u) => ({ ...u, creado_en: '2026-08-01T13:00:00.000Z', version_autorizacion: 1 }));

const politicas = [
  {
    id: 1,
    version: 1,
    vigente_desde: '2026-08-01T05:00:00.000Z',
    publicada_por: 10,
    detalles: Object.entries(POLITICA_V1).map(([prioridad_codigo, p]) => ({ prioridad_codigo, ...p })),
  },
];

const estados = Object.entries(ESTADOS).map(([codigo, nombre_visible]) => ({ id: codigo, codigo, nombre_visible }));
const prioridades = Object.values(PRIORIDADES).map((p) => ({ id: p.codigo, codigo: p.codigo, nombre_visible: p.nombre, orden: p.orden }));

const SUPERVISORA = 9;
const solicitudes = [];
const eventos = [];
const notificaciones = [];

const horas = (iso, h) => sumarHorasCorridas(iso, h).toISOString();
const categoriaPorId = (id) => categorias.find((c) => c.id === id);

/**
 * Crea una solicitud y su historial de forma coherente con las transiciones de la tabla 4.
 * `pasos` indica hasta dónde avanzó: evaluacion, asignacion, inicio, resolucion, cierre, cancelacion.
 */
function crearCaso({ numero, solicitante, categoria, ubicacion, descripcion, referencia = '', impacto, urgencia, registrada, pasos = {} }) {
  const id = numero;
  const prioridad = calcularPrioridad(impacto, urgencia);
  const limites = calcularLimites(registrada, prioridad, POLITICA_V1);
  const caso = {
    id,
    codigo: `MSU-2026-${String(numero).padStart(4, '0')}`,
    solicitante_id: solicitante,
    categoria_id: categoria,
    area_id: categoriaPorId(categoria).area_id,
    ubicacion_id: ubicacion,
    referencia,
    descripcion,
    impacto,
    urgencia,
    prioridad_codigo: prioridad,
    estado_codigo: 'REGISTRADA',
    tecnico_id: null,
    registrada_en: registrada,
    primera_atencion_en: null,
    ultima_resolucion_en: null,
    cerrada_en: null,
    cancelada_en: null,
    limite_atencion: limites.limite_atencion,
    limite_resolucion: limites.limite_resolucion,
    politica_id: 1,
    matriz_aplicada: POLITICA_V1,
    version_fechas: 1,
    version: 1,
  };
  const evento = (actor_id, accion, anterior, nuevo, motivo, creado_en) => {
    eventos.push({ id: eventos.length + 1, solicitud_id: id, actor_id, accion, anterior, nuevo, motivo, creado_en });
    caso.version += accion === 'REGISTRAR' ? 0 : 1;
  };
  evento(solicitante, 'REGISTRAR', null, { estado_codigo: 'REGISTRADA', prioridad_codigo: prioridad, limite_atencion: caso.limite_atencion, limite_resolucion: caso.limite_resolucion }, null, registrada);

  const cambiarEstado = (actor, accion, nuevoEstado, instante, motivo = null, extra = {}) => {
    const anterior = { estado_codigo: caso.estado_codigo };
    caso.estado_codigo = nuevoEstado;
    evento(actor, accion, anterior, { estado_codigo: nuevoEstado, ...extra }, motivo, instante);
  };

  if (pasos.cancelacion) {
    caso.cancelada_en = horas(registrada, pasos.cancelacion.tras);
    cambiarEstado(SUPERVISORA, 'CANCELAR', 'CANCELADA', caso.cancelada_en, pasos.cancelacion.motivo);
    return caso;
  }
  if (pasos.evaluacion) cambiarEstado(SUPERVISORA, 'INICIAR_EVALUACION', 'EN_EVALUACION', horas(registrada, pasos.evaluacion));
  if (pasos.asignacion) {
    const instante = horas(registrada, pasos.asignacion.tras);
    caso.tecnico_id = pasos.asignacion.tecnico;
    const tecnico = usuarios.find((u) => u.id === caso.tecnico_id);
    cambiarEstado(SUPERVISORA, 'ASIGNAR', 'ASIGNADA', instante, null, { tecnico_id: tecnico.id, tecnico_nombre: tecnico.nombre });
    notificaciones.push({ usuario_id: tecnico.id, solicitud_id: id, tipo: 'ASIGNACION', texto: `Se te asignó la solicitud ${caso.codigo}.`, creada_en: instante, leida_en: horas(instante, 1) });
  }
  if (pasos.inicio) {
    caso.primera_atencion_en = horas(registrada, pasos.inicio);
    cambiarEstado(caso.tecnico_id, 'INICIAR_ATENCION', 'EN_ATENCION', caso.primera_atencion_en);
  }
  if (pasos.resolucion) {
    caso.ultima_resolucion_en = horas(registrada, pasos.resolucion.tras);
    cambiarEstado(caso.tecnico_id, 'RESOLVER', 'RESUELTA', caso.ultima_resolucion_en, null, { solucion: pasos.resolucion.solucion });
    notificaciones.push({ usuario_id: solicitante, solicitud_id: id, tipo: 'RESOLUCION', texto: `Tu solicitud ${caso.codigo} fue resuelta. Confirma la solución o reábrela dentro de 72 horas.`, creada_en: caso.ultima_resolucion_en, leida_en: null });
  }
  if (pasos.cierre) {
    caso.cerrada_en = horas(registrada, pasos.cierre);
    cambiarEstado(solicitante, 'CONFIRMAR', 'CERRADA', caso.cerrada_en);
  }
  if (caso.estado_codigo === 'REGISTRADA') {
    notificaciones.push({ usuario_id: SUPERVISORA, solicitud_id: id, tipo: 'REGISTRO', texto: `Nueva solicitud ${caso.codigo} pendiente de evaluación.`, creada_en: registrada, leida_en: null });
  }
  return caso;
}

solicitudes.push(
  crearCaso({
    numero: 1, solicitante: 1, categoria: 5, ubicacion: 4, impacto: 'MEDIO', urgencia: 'MEDIA', registrada: '2026-10-01T14:10:00.000Z',
    descripcion: 'La impresora compartida del laboratorio no imprime y muestra un error de atasco aunque no hay papel trabado.',
    pasos: { evaluacion: 1, asignacion: { tras: 2, tecnico: 4 }, inicio: 5, resolucion: { tras: 20, solucion: 'Se limpió el rodillo de alimentación y se reinstaló el controlador de la impresora. Imprime con normalidad.' }, cierre: 30 },
  }),
  crearCaso({
    numero: 2, solicitante: 1, categoria: 3, ubicacion: 4, impacto: 'MEDIO', urgencia: 'MEDIA', registrada: '2026-10-12T15:30:00.000Z', referencia: 'Equipos de la fila 3',
    descripcion: 'El programa de estadística no abre en los equipos de la fila 3; aparece un mensaje de licencia vencida.',
    pasos: { evaluacion: 2, asignacion: { tras: 3, tecnico: 4 }, inicio: 10, resolucion: { tras: 70, solucion: 'Se renovó la licencia de red del programa de estadística y se verificó el acceso en los seis equipos de la fila.' } },
  }),
  crearCaso({
    numero: 3, solicitante: 1, categoria: 8, ubicacion: 3, impacto: 'MEDIO', urgencia: 'MEDIA', registrada: '2026-10-13T13:00:00.000Z',
    descripcion: 'Dos fluorescentes del aula parpadean constantemente y dificultan la lectura en la pizarra durante las clases.',
    pasos: { evaluacion: 3, asignacion: { tras: 4, tecnico: 6 }, inicio: 20 },
  }),
  crearCaso({
    numero: 4, solicitante: 1, categoria: 4, ubicacion: 6, impacto: 'ALTO', urgencia: 'MEDIA', registrada: '2026-10-15T14:00:00.000Z',
    descripcion: 'La red inalámbrica de la sala de lectura se desconecta cada pocos minutos; los estudiantes usan los datos del celular.',
    pasos: { evaluacion: 1, asignacion: { tras: 2, tecnico: 4 } },
  }),
  crearCaso({
    numero: 5, solicitante: 1, categoria: 6, ubicacion: 2, impacto: 'BAJO', urgencia: 'BAJA', registrada: '2026-10-15T16:20:00.000Z',
    descripcion: 'Una carpeta de la última fila tiene el tablero suelto y se inclina al apoyarse; se puede usar otra mientras tanto.',
    pasos: { evaluacion: 18 },
  }),
  crearCaso({
    numero: 6, solicitante: 1, categoria: 1, ubicacion: 5, impacto: 'MEDIO', urgencia: 'ALTA', registrada: '2026-10-16T13:45:00.000Z',
    descripcion: 'La computadora del docente en el laboratorio 2 no enciende y la clase práctica de las 10:00 no puede comenzar.',
  }),
  crearCaso({
    numero: 7, solicitante: 1, categoria: 10, ubicacion: 1, impacto: 'BAJO', urgencia: 'MEDIA', registrada: '2026-10-09T12:00:00.000Z',
    descripcion: 'El aula 101 quedó con restos de pintura en el piso después del mantenimiento de las ventanas.',
    pasos: { cancelacion: { tras: 3, motivo: 'Duplicado de un pedido registrado por la oficina de mantenimiento el mismo día; se atiende allí.' } },
  }),
  crearCaso({
    numero: 8, solicitante: 2, categoria: 9, ubicacion: 7, impacto: 'ALTO', urgencia: 'ALTA', registrada: '2026-10-16T14:30:00.000Z',
    descripcion: 'Hay una fuga de agua en los servicios higiénicos del primer piso y el agua llega al pasillo principal.',
  }),
  crearCaso({
    numero: 9, solicitante: 2, categoria: 11, ubicacion: 8, impacto: 'BAJO', urgencia: 'BAJA', registrada: '2026-10-14T15:00:00.000Z',
    descripcion: 'Se necesita reubicar veinte sillas del auditorio hacia el escenario para la ceremonia del próximo viernes.',
    pasos: { evaluacion: 4, asignacion: { tras: 5, tecnico: 7 } },
  }),
  crearCaso({
    numero: 10, solicitante: 2, categoria: 2, ubicacion: 8, impacto: 'ALTO', urgencia: 'MEDIA', registrada: '2026-10-16T12:10:00.000Z',
    descripcion: 'El sistema de audio del auditorio produce un zumbido fuerte; la conferencia de la tarde podría usar micrófono portátil.',
    pasos: { evaluacion: 1 },
  }),
);

const notificacionesConId = notificaciones
  .sort((a, b) => a.creada_en.localeCompare(b.creada_en))
  .map((n, i) => ({ id: i + 1, ...n, version_fechas: 1, clave_evento: `${n.tipo}:${n.solicitud_id}:${n.usuario_id}:1` }));

const db = { roles, areas, categorias, ubicaciones, estados, prioridades, politicas, usuarios, solicitudes, eventos, notificaciones: notificacionesConId };
writeFileSync(destino, `${JSON.stringify(db, null, 2)}\n`);
console.log(`Semilla escrita en ${destino}: ${solicitudes.length} solicitudes, ${eventos.length} eventos, ${notificacionesConId.length} notificaciones.`);
