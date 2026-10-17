/**
 * Middleware de la API simulada (json-server 0.17.4).
 * Responsables: David (base, restablecer, catálogos), Alex (PR03 registro),
 * Marcelo (PR04 listado y detalle, PR05 evaluación y asignación),
 * Emanuel (PR06 formato de error y simulación de fallas).
 *
 * json-server guarda los datos en db.json y atiende las rutas genéricas
 * (notificaciones y catálogos administrativos) mediante routes.json.
 * Este middleware agrega lo que json-server no hace solo: sesión simulada,
 * permisos por rol, código MSU, prioridad y fechas calculadas en el servidor,
 * transiciones de estado con historial, listados con el formato
 * { items, pagina, tamaño, total }, errores con el formato común,
 * simulación de fallas y restablecimiento de datos.
 *
 * La sesión es simulada: el navegador envía el encabezado X-Usuario-Id de la
 * cuenta de demostración elegida. No equivale a la seguridad del backend real
 * (fase II: JWT en cookie HttpOnly).
 */
import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import express from 'express';
import {
  ESTADOS, PRIORIDADES, IMPACTOS, URGENCIAS, ESTADOS_PENDIENTES,
  calcularPrioridad, calcularLimites, recalcularPorCambioDePrioridad,
  validarSolicitud, validarMotivo, validarSolucion, limpiarTexto, esImpactoValido, esUrgenciaValida,
} from '../public/js/reglas.js';
import { ErrorApi, enviarError } from './errores.js';
import { RUTA_SEMILLA, restablecerArchivo } from '../scripts/datos.js';

const PREFIJO = '/api/v1';
const TIPOS_CATALOGO_ADMIN = ['areas', 'categorias', 'ubicaciones'];
const TAMANO_POR_DEFECTO = 20; // HU05: 20 por defecto
const TAMANO_MAXIMO = 100; // HU05: máximo 100

/** Lee un parámetro de tamaño aceptando "tamaño" (contrato) o "tamano" (sin eñe). */
function leerTamano(query) {
  return query['tamaño'] ?? query.tamano;
}

function leerPaginacion(query) {
  const errores = [];
  const pagina = query.pagina === undefined ? 1 : Number(query.pagina);
  const tamanoBruto = leerTamano(query);
  const tamano = tamanoBruto === undefined ? TAMANO_POR_DEFECTO : Number(tamanoBruto);
  if (!Number.isInteger(pagina) || pagina < 1) errores.push({ campo: 'pagina', mensaje: 'La página debe ser un entero mayor o igual a 1.' });
  if (!Number.isInteger(tamano) || tamano < 1 || tamano > TAMANO_MAXIMO) errores.push({ campo: 'tamaño', mensaje: `El tamaño de página debe estar entre 1 y ${TAMANO_MAXIMO}.` });
  if (errores.length) throw new ErrorApi('VALIDACION', { errores });
  return { pagina, tamano };
}

function paginar(lista, { pagina, tamano }) {
  const inicio = (pagina - 1) * tamano;
  return { items: lista.slice(inicio, inicio + tamano), pagina, 'tamaño': tamano, total: lista.length };
}

export function crearApi(router) {
  const db = router.db;
  const tabla = (nombre) => db.get(nombre);
  const buscar = (nombre, id) => tabla(nombre).find({ id: Number(id) }).value();
  const siguienteId = (nombre) => tabla(nombre).map('id').max().value() + 1 || 1;
  const ahora = () => new Date().toISOString();

  const rolDe = (usuario) => tabla('roles').find({ id: usuario.rol_id }).value()?.codigo;

  /** Perfil público: nunca incluye contraseñas ni hashes. */
  function perfil(usuario) {
    const rol = tabla('roles').find({ id: usuario.rol_id }).value();
    const area = usuario.area_id ? buscar('areas', usuario.area_id) : null;
    return {
      id: usuario.id,
      nombre: usuario.nombre,
      correo: usuario.correo,
      vinculo: usuario.vinculo,
      rol: rol.codigo,
      rol_nombre: rol.nombre_visible,
      area_id: usuario.area_id,
      area_nombre: area?.nombre ?? null,
      activo: usuario.activo,
    };
  }

  /** Solicitud con nombres legibles de sus referencias, para listado y detalle. */
  function vistaSolicitud(s) {
    const categoria = buscar('categorias', s.categoria_id);
    const area = buscar('areas', s.area_id);
    const ubicacion = buscar('ubicaciones', s.ubicacion_id);
    const tecnico = s.tecnico_id ? buscar('usuarios', s.tecnico_id) : null;
    const solicitante = buscar('usuarios', s.solicitante_id);
    return {
      ...s,
      categoria_nombre: categoria?.nombre ?? null,
      area_nombre: area?.nombre ?? null,
      ubicacion_nombre: ubicacion ? `${ubicacion.edificio} — ${ubicacion.ambiente}` : null,
      solicitante_nombre: solicitante?.nombre ?? null,
      tecnico_nombre: tecnico?.nombre ?? null,
      estado_nombre: ESTADOS[s.estado_codigo],
      prioridad_nombre: PRIORIDADES[s.prioridad_codigo]?.nombre,
    };
  }

  function registrarEvento(solicitud, actorId, accion, anterior, nuevo, motivo = null) {
    const evento = { id: siguienteId('eventos'), solicitud_id: solicitud.id, actor_id: actorId, accion, anterior, nuevo, motivo, creado_en: ahora() };
    tabla('eventos').push(evento).value();
    return evento;
  }

  /** Aviso interno deduplicado por clave de evento (RN10). */
  function notificar(usuarioId, solicitud, tipo, texto) {
    const clave = `${tipo}:${solicitud.id}:${usuarioId}:${solicitud.version_fechas}:${solicitud.version}`;
    if (tabla('notificaciones').find({ clave_evento: clave }).value()) return;
    tabla('notificaciones').push({
      id: siguienteId('notificaciones'), usuario_id: usuarioId, solicitud_id: solicitud.id, tipo, texto,
      version_fechas: solicitud.version_fechas, creada_en: ahora(), leida_en: null, clave_evento: clave,
    }).value();
  }

  /** Código MSU-AAAA-NNNN con el año en America/Lima y correlativo anual. */
  function generarCodigo(instante) {
    const anio = new Intl.DateTimeFormat('en', { timeZone: 'America/Lima', year: 'numeric' }).format(new Date(instante));
    const prefijo = `MSU-${anio}-`;
    const ultimo = tabla('solicitudes').map('codigo').filter((c) => c.startsWith(prefijo)).map((c) => Number(c.slice(prefijo.length))).max().value() || 0;
    return `${prefijo}${String(ultimo + 1).padStart(4, '0')}`;
  }

  // ---------------------------------------------------------------- base
  /** Correlación, simulación de fallas o demoras y sesión simulada. */
  function base(req, res, next) {
    req.idCorrelacion = req.get('X-Correlation-Id') || randomUUID();
    res.set('X-Correlation-Id', req.idCorrelacion);
    req.esApi = req.path === PREFIJO || req.path.startsWith(`${PREFIJO}/`);
    if (!req.esApi) return next();

    const esDemo = req.path.startsWith(`${PREFIJO}/demo/`);
    const demora = Math.min(Number(req.get('X-Simular-Demora') || req.query.simularDemora || 0), 5000);
    const continuar = () => {
      // PR06: falla controlada de la API para reproducir el mensaje y el reintento.
      if (!esDemo && (req.get('X-Simular-Falla') === '1' || req.query.simularFalla === '1')) {
        return enviarError(req, res, 'SERVICIO_NO_DISPONIBLE');
      }
      const idUsuario = Number(req.get('X-Usuario-Id'));
      if (idUsuario) {
        const usuario = buscar('usuarios', idUsuario);
        if (usuario?.activo) {
          req.usuario = usuario;
          req.rol = rolDe(usuario);
        }
      }
      next();
    };
    if (demora > 0) setTimeout(continuar, demora);
    else continuar();
  }

  const requiereSesion = (req) => {
    if (!req.usuario) throw new ErrorApi('NO_AUTENTICADO');
  };
  const requiereRol = (req, ...roles) => {
    requiereSesion(req);
    if (!roles.includes(req.rol)) throw new ErrorApi('PERMISO_DENEGADO');
  };

  /** RF03 / HU24: propietario, técnico asignado actualmente o supervisor. */
  function solicitudAutorizada(req, id) {
    requiereSesion(req);
    const solicitud = buscar('solicitudes', id);
    if (!solicitud) throw new ErrorApi('NO_ENCONTRADO', { mensaje: 'La solicitud no existe.' });
    const permitido =
      (req.rol === 'SOLICITANTE' && solicitud.solicitante_id === req.usuario.id) ||
      (req.rol === 'TECNICO' && solicitud.tecnico_id === req.usuario.id) ||
      req.rol === 'SUPERVISOR';
    if (!permitido) throw new ErrorApi('PERMISO_DENEGADO', { mensaje: 'No tienes acceso a esta solicitud.' });
    return solicitud;
  }

  /** Control optimista de versión (RNF03, HU24). */
  function comprobarVersion(solicitud, version) {
    if (version === undefined || version === null || version === '') {
      throw new ErrorApi('VALIDACION', { errores: [{ campo: 'version', mensaje: 'Falta la versión de la solicitud.' }] });
    }
    if (Number(version) !== solicitud.version) throw new ErrorApi('CONFLICTO_VERSION');
  }

  const transicionInvalida = (mensaje) => new ErrorApi('TRANSICION_INVALIDA', { mensaje });

  // ---------------------------------------------------------------- rutas propias
  const rutas = express.Router();
  const manejar = (fn) => (req, res, next) => {
    try {
      const resultado = fn(req, res, next);
      if (resultado !== undefined) db.write();
    } catch (error) {
      next(error);
    }
  };

  // Demo: restablecer datos (copia db.seed.json → db.json y recarga la memoria).
  rutas.post('/demo/restablecer', manejar((req, res) => {
    restablecerArchivo(router.dbArchivo);
    db.setState(JSON.parse(readFileSync(RUTA_SEMILLA, 'utf8')));
    res.json({ mensaje: 'Datos simulados restablecidos a su estado inicial.', restablecido_en: ahora() });
    return true;
  }));

  // Demo: cuentas activas para el acceso simulado (no forma parte del contrato definitivo).
  rutas.get('/demo/cuentas', manejar((req, res) => {
    const items = tabla('usuarios').filter({ activo: true }).value().map(perfil);
    res.json({ items, pagina: 1, 'tamaño': items.length, total: items.length });
  }));

  // Autenticación simulada: solo se identifica la cuenta por correo; no hay contraseñas reales.
  rutas.post('/auth/login', manejar((req, res) => {
    const correo = limpiarTexto(req.body?.correo).toLowerCase();
    if (!correo) throw new ErrorApi('VALIDACION', { errores: [{ campo: 'correo', mensaje: 'Indica el correo de la cuenta.' }] });
    const usuario = tabla('usuarios').find((u) => u.correo === correo).value();
    if (!usuario || !usuario.activo) throw new ErrorApi('CREDENCIALES_INVALIDAS');
    res.json(perfil(usuario));
  }));

  rutas.post('/auth/logout', manejar((req, res) => {
    res.status(204).end();
  }));

  rutas.get('/me', manejar((req, res) => {
    requiereSesion(req);
    res.json(perfil(req.usuario));
  }));

  // Catálogos activos por tipo.
  rutas.get('/catalogos', manejar((req, res) => {
    requiereSesion(req);
    const tipo = req.query.tipo;
    let items;
    switch (tipo) {
      case 'areas':
        items = tabla('areas').filter({ activo: true }).value();
        break;
      case 'categorias':
        items = tabla('categorias').filter({ activo: true }).value()
          .filter((c) => buscar('areas', c.area_id)?.activo)
          .map((c) => ({ ...c, area_nombre: buscar('areas', c.area_id).nombre }));
        break;
      case 'ubicaciones':
        items = tabla('ubicaciones').filter({ activo: true }).value();
        break;
      case 'estados':
        items = tabla('estados').value();
        break;
      case 'prioridades':
        items = tabla('prioridades').sortBy('orden').value();
        break;
      case 'impactos':
        items = [...IMPACTOS];
        break;
      case 'urgencias':
        items = [...URGENCIAS];
        break;
      case 'politica':
        items = [tabla('politicas').maxBy('version').value()];
        break;
      case 'tecnicos': {
        // RF10: técnicos activos del área con su carga pendiente (apoyo a la asignación manual).
        requiereRol(req, 'SUPERVISOR');
        const areaId = Number(req.query.area_id);
        const tecnicoRol = tabla('roles').find({ codigo: 'TECNICO' }).value().id;
        items = tabla('usuarios').filter((u) => u.rol_id === tecnicoRol && u.activo && (!areaId || u.area_id === areaId)).value()
          .map((u) => ({
            ...perfil(u),
            carga_pendiente: tabla('solicitudes').filter((s) => s.tecnico_id === u.id && ESTADOS_PENDIENTES.includes(s.estado_codigo)).size().value(),
          }));
        break;
      }
      default:
        throw new ErrorApi('VALIDACION', { errores: [{ campo: 'tipo', mensaje: 'Indica un tipo de catálogo: areas, categorias, ubicaciones, estados, prioridades, impactos, urgencias, politica o tecnicos.' }] });
    }
    res.json({ items, pagina: 1, 'tamaño': items.length, total: items.length });
  }));

  // PR03 / HU04: registrar una solicitud.
  rutas.post('/solicitudes', manejar((req, res) => {
    requiereRol(req, 'SOLICITANTE');
    const cuerpo = req.body ?? {};
    const categoriasActivas = new Set(tabla('categorias').filter((c) => c.activo && buscar('areas', c.area_id)?.activo).map('id').value());
    const ubicacionesActivas = new Set(tabla('ubicaciones').filter({ activo: true }).map('id').value());
    const errores = validarSolicitud(cuerpo, { categoriasActivas, ubicacionesActivas });
    if (errores.length) throw new ErrorApi('VALIDACION', { errores });

    const registradaEn = ahora();
    const politica = tabla('politicas').maxBy('version').value();
    const matriz = Object.fromEntries(politica.detalles.map((d) => [d.prioridad_codigo, { horas_primera_atencion: d.horas_primera_atencion, horas_resolucion: d.horas_resolucion }]));
    const prioridad = calcularPrioridad(cuerpo.impacto, cuerpo.urgencia);
    const limites = calcularLimites(registradaEn, prioridad, matriz);
    const categoria = buscar('categorias', cuerpo.categoria_id);
    const solicitud = {
      id: siguienteId('solicitudes'),
      codigo: generarCodigo(registradaEn),
      solicitante_id: req.usuario.id, // tomado de la sesión, nunca del cuerpo
      categoria_id: categoria.id,
      area_id: categoria.area_id,
      ubicacion_id: Number(cuerpo.ubicacion_id),
      referencia: limpiarTexto(cuerpo.referencia),
      descripcion: limpiarTexto(cuerpo.descripcion),
      impacto: cuerpo.impacto,
      urgencia: cuerpo.urgencia,
      prioridad_codigo: prioridad,
      estado_codigo: 'REGISTRADA',
      tecnico_id: null,
      registrada_en: registradaEn,
      primera_atencion_en: null,
      ultima_resolucion_en: null,
      cerrada_en: null,
      cancelada_en: null,
      limite_atencion: limites.limite_atencion,
      limite_resolucion: limites.limite_resolucion,
      politica_id: politica.id,
      matriz_aplicada: matriz,
      version_fechas: 1,
      version: 1,
    };
    tabla('solicitudes').push(solicitud).value();
    registrarEvento(solicitud, req.usuario.id, 'REGISTRAR', null, {
      estado_codigo: 'REGISTRADA', prioridad_codigo: prioridad, limite_atencion: solicitud.limite_atencion, limite_resolucion: solicitud.limite_resolucion,
    });
    const supervisorRol = tabla('roles').find({ codigo: 'SUPERVISOR' }).value().id;
    tabla('usuarios').filter({ rol_id: supervisorRol, activo: true }).value()
      .forEach((sup) => notificar(sup.id, solicitud, 'REGISTRO', `Nueva solicitud ${solicitud.codigo} pendiente de evaluación.`));
    res.status(201).location(`${PREFIJO}/solicitudes/${solicitud.id}`).json(vistaSolicitud(solicitud));
    return true;
  }));

  // PR04 / HU05 / RF07 / HU10: listado según rol con filtros, orden y paginación.
  rutas.get('/solicitudes', manejar((req, res) => {
    requiereRol(req, 'SOLICITANTE', 'TECNICO', 'SUPERVISOR');
    const paginacion = leerPaginacion(req.query);
    const { estado, categoria_id: categoriaId, area_id: areaId, prioridad, codigo, orden = 'recientes' } = req.query;
    const errores = [];
    if (estado && !ESTADOS[estado]) errores.push({ campo: 'estado', mensaje: 'Estado desconocido.' });
    if (prioridad && !PRIORIDADES[prioridad]) errores.push({ campo: 'prioridad', mensaje: 'Prioridad desconocida.' });
    if (!['recientes', 'antiguedad', 'prioridad', 'vencimiento'].includes(orden)) errores.push({ campo: 'orden', mensaje: 'Orden no admitido: usa recientes, antiguedad, prioridad o vencimiento.' });
    if (errores.length) throw new ErrorApi('VALIDACION', { errores });

    let lista = tabla('solicitudes').value().filter((s) => {
      if (req.rol === 'SOLICITANTE' && s.solicitante_id !== req.usuario.id) return false;
      if (req.rol === 'TECNICO' && s.tecnico_id !== req.usuario.id) return false;
      if (estado && s.estado_codigo !== estado) return false;
      if (categoriaId && s.categoria_id !== Number(categoriaId)) return false;
      if (areaId && s.area_id !== Number(areaId)) return false;
      if (prioridad && s.prioridad_codigo !== prioridad) return false;
      if (codigo && !s.codigo.toLowerCase().includes(String(codigo).trim().toLowerCase())) return false;
      return true;
    });
    const comparadores = {
      recientes: (a, b) => b.registrada_en.localeCompare(a.registrada_en),
      antiguedad: (a, b) => a.registrada_en.localeCompare(b.registrada_en),
      prioridad: (a, b) => PRIORIDADES[a.prioridad_codigo].orden - PRIORIDADES[b.prioridad_codigo].orden || a.registrada_en.localeCompare(b.registrada_en),
      vencimiento: (a, b) => a.limite_resolucion.localeCompare(b.limite_resolucion),
    };
    lista = lista.sort(comparadores[orden]).map(vistaSolicitud);
    res.json(paginar(lista, paginacion));
  }));

  rutas.get('/solicitudes/:id', manejar((req, res) => {
    res.json(vistaSolicitud(solicitudAutorizada(req, req.params.id)));
  }));

  rutas.get('/solicitudes/:id/historial', manejar((req, res) => {
    const solicitud = solicitudAutorizada(req, req.params.id);
    const items = tabla('eventos').filter({ solicitud_id: solicitud.id }).sortBy(['creado_en', 'id']).value()
      .map((e) => ({ ...e, actor_nombre: e.actor_id ? buscar('usuarios', e.actor_id)?.nombre ?? null : 'Sistema' }));
    res.json({ items, pagina: 1, 'tamaño': items.length, total: items.length });
  }));

  // PR05 / HU07: iniciar evaluación y cambiar prioridad con motivo (RN05).
  rutas.post('/solicitudes/:id/evaluacion', manejar((req, res) => {
    requiereRol(req, 'SUPERVISOR');
    const solicitud = solicitudAutorizada(req, req.params.id);
    const { impacto, urgencia, motivo, version } = req.body ?? {};
    comprobarVersion(solicitud, version);
    if (!ESTADOS_PENDIENTES.includes(solicitud.estado_codigo)) {
      throw transicionInvalida(`No se puede evaluar una solicitud en estado ${ESTADOS[solicitud.estado_codigo]}.`);
    }
    const nuevoImpacto = impacto ?? solicitud.impacto;
    const nuevaUrgencia = urgencia ?? solicitud.urgencia;
    const errores = [];
    if (!esImpactoValido(nuevoImpacto)) errores.push({ campo: 'impacto', mensaje: 'Indica el impacto: Alto, Medio o Bajo.' });
    if (!esUrgenciaValida(nuevaUrgencia)) errores.push({ campo: 'urgencia', mensaje: 'Indica la urgencia: Alta, Media o Baja.' });
    const hayCambio = nuevoImpacto !== solicitud.impacto || nuevaUrgencia !== solicitud.urgencia;
    if (hayCambio) errores.push(...validarMotivo(motivo));
    if (!hayCambio && solicitud.estado_codigo !== 'REGISTRADA') {
      errores.push({ campo: 'impacto', mensaje: 'No hay cambios: modifica el impacto o la urgencia para recalcular la prioridad.' });
    }
    // HU07 BDD 2: un cambio sin motivo se rechaza y se conservan prioridad y límites.
    if (errores.length) throw new ErrorApi('VALIDACION', { errores });

    if (solicitud.estado_codigo === 'REGISTRADA') {
      solicitud.estado_codigo = 'EN_EVALUACION';
      registrarEvento(solicitud, req.usuario.id, 'INICIAR_EVALUACION', { estado_codigo: 'REGISTRADA' }, { estado_codigo: 'EN_EVALUACION' });
    }
    if (hayCambio) {
      const anterior = {
        impacto: solicitud.impacto, urgencia: solicitud.urgencia, prioridad_codigo: solicitud.prioridad_codigo,
        limite_atencion: solicitud.limite_atencion, limite_resolucion: solicitud.limite_resolucion,
      };
      const recalculo = recalcularPorCambioDePrioridad(solicitud, nuevoImpacto, nuevaUrgencia);
      Object.assign(solicitud, { impacto: nuevoImpacto, urgencia: nuevaUrgencia, ...recalculo });
      if (recalculo.prioridad_codigo !== anterior.prioridad_codigo) solicitud.version_fechas += 1;
      registrarEvento(solicitud, req.usuario.id, 'CAMBIAR_PRIORIDAD', anterior, {
        impacto: solicitud.impacto, urgencia: solicitud.urgencia, prioridad_codigo: solicitud.prioridad_codigo,
        limite_atencion: solicitud.limite_atencion, limite_resolucion: solicitud.limite_resolucion,
      }, limpiarTexto(motivo));
    }
    solicitud.version += 1;
    if (hayCambio) {
      notificar(solicitud.solicitante_id, solicitud, 'PRIORIDAD', `La prioridad de tu solicitud ${solicitud.codigo} ahora es ${PRIORIDADES[solicitud.prioridad_codigo].nombre}.`);
    }
    res.json(vistaSolicitud(solicitud));
    return true;
  }));

  // PR05 / HU08: asignar (desde En evaluación) o reasignar con motivo.
  rutas.post('/solicitudes/:id/asignaciones', manejar((req, res) => {
    requiereRol(req, 'SUPERVISOR');
    const solicitud = solicitudAutorizada(req, req.params.id);
    const { tecnico_id: tecnicoId, motivo, version } = req.body ?? {};
    comprobarVersion(solicitud, version);
    const esReasignacion = ['ASIGNADA', 'EN_ATENCION'].includes(solicitud.estado_codigo);
    if (solicitud.estado_codigo === 'REGISTRADA') throw transicionInvalida('Primero inicia la evaluación de la solicitud; luego asigna un técnico.');
    if (!esReasignacion && solicitud.estado_codigo !== 'EN_EVALUACION') {
      throw transicionInvalida(`No se puede asignar una solicitud en estado ${ESTADOS[solicitud.estado_codigo]}.`);
    }
    const errores = [];
    const tecnico = buscar('usuarios', tecnicoId);
    if (!tecnicoId) errores.push({ campo: 'tecnico_id', mensaje: 'Selecciona un técnico.' });
    else if (!tecnico || rolDe(tecnico) !== 'TECNICO') errores.push({ campo: 'tecnico_id', mensaje: 'La persona seleccionada no es un técnico.' });
    else if (!tecnico.activo) errores.push({ campo: 'tecnico_id', mensaje: 'El técnico seleccionado está inactivo.' });
    else if (tecnico.area_id !== solicitud.area_id) errores.push({ campo: 'tecnico_id', mensaje: 'El técnico no pertenece al área de la categoría de la solicitud.' });
    else if (tecnico.id === solicitud.tecnico_id) errores.push({ campo: 'tecnico_id', mensaje: 'El técnico seleccionado ya es el responsable.' });
    if (esReasignacion) errores.push(...validarMotivo(motivo));
    if (errores.length) throw new ErrorApi('VALIDACION', { errores });

    const anteriorTecnico = solicitud.tecnico_id ? buscar('usuarios', solicitud.tecnico_id) : null;
    const anterior = { estado_codigo: solicitud.estado_codigo, tecnico_id: anteriorTecnico?.id ?? null, tecnico_nombre: anteriorTecnico?.nombre ?? null };
    solicitud.tecnico_id = tecnico.id;
    if (!esReasignacion) solicitud.estado_codigo = 'ASIGNADA'; // reasignar conserva el estado y las fechas
    solicitud.version += 1;
    registrarEvento(solicitud, req.usuario.id, esReasignacion ? 'REASIGNAR' : 'ASIGNAR', anterior,
      { estado_codigo: solicitud.estado_codigo, tecnico_id: tecnico.id, tecnico_nombre: tecnico.nombre }, esReasignacion ? limpiarTexto(motivo) : null);
    notificar(tecnico.id, solicitud, 'ASIGNACION', `Se te asignó la solicitud ${solicitud.codigo}.`);
    notificar(solicitud.solicitante_id, solicitud, 'ASIGNACION', `Tu solicitud ${solicitud.codigo} tiene como responsable a ${tecnico.nombre}.`);
    res.json(vistaSolicitud(solicitud));
    return true;
  }));

  // HU10: el técnico asignado inicia la atención (la primera atención se registra una sola vez).
  rutas.post('/solicitudes/:id/inicio', manejar((req, res) => {
    requiereRol(req, 'TECNICO');
    const solicitud = solicitudAutorizada(req, req.params.id);
    comprobarVersion(solicitud, req.body?.version);
    if (solicitud.estado_codigo !== 'ASIGNADA') throw transicionInvalida('Solo se inicia la atención de una solicitud Asignada.');
    solicitud.estado_codigo = 'EN_ATENCION';
    solicitud.primera_atencion_en ??= ahora();
    solicitud.version += 1;
    registrarEvento(solicitud, req.usuario.id, 'INICIAR_ATENCION', { estado_codigo: 'ASIGNADA' }, { estado_codigo: 'EN_ATENCION', primera_atencion_en: solicitud.primera_atencion_en });
    notificar(solicitud.solicitante_id, solicitud, 'ESTADO', `Se inició la atención de tu solicitud ${solicitud.codigo}.`);
    res.json(vistaSolicitud(solicitud));
    return true;
  }));

  // HU11: el técnico asignado registra la solución.
  rutas.post('/solicitudes/:id/resoluciones', manejar((req, res) => {
    requiereRol(req, 'TECNICO');
    const solicitud = solicitudAutorizada(req, req.params.id);
    comprobarVersion(solicitud, req.body?.version);
    if (solicitud.estado_codigo !== 'EN_ATENCION') throw transicionInvalida('Solo se resuelve una solicitud En atención.');
    const errores = validarSolucion(req.body?.solucion);
    if (errores.length) throw new ErrorApi('VALIDACION', { errores });
    solicitud.estado_codigo = 'RESUELTA';
    solicitud.ultima_resolucion_en = ahora();
    solicitud.version += 1;
    registrarEvento(solicitud, req.usuario.id, 'RESOLVER', { estado_codigo: 'EN_ATENCION' }, { estado_codigo: 'RESUELTA', solucion: limpiarTexto(req.body.solucion) });
    notificar(solicitud.solicitante_id, solicitud, 'RESOLUCION', `Tu solicitud ${solicitud.codigo} fue resuelta. Confirma la solución o reábrela dentro de 72 horas.`);
    res.json(vistaSolicitud(solicitud));
    return true;
  }));

  // Notificaciones: solo el propietario (las lecturas y borrados genéricos los resuelve json-server).
  const notificacionPropia = (req) => {
    requiereSesion(req);
    const aviso = buscar('notificaciones', req.params.id);
    if (!aviso) throw new ErrorApi('NO_ENCONTRADO', { mensaje: 'El aviso no existe.' });
    if (aviso.usuario_id !== req.usuario.id) throw new ErrorApi('PERMISO_DENEGADO', { mensaje: 'El aviso pertenece a otra persona.' });
    return aviso;
  };

  rutas.put('/notificaciones/:id/lectura', manejar((req, res) => {
    const aviso = notificacionPropia(req);
    aviso.leida_en ??= ahora();
    res.json(aviso);
    return true;
  }));

  rutas.get('/notificaciones', manejar((req, _res, next) => {
    requiereSesion(req);
    next(); // json-server filtra por usuario (ver prepararPasoAJsonServer)
  }));

  // D07: DELETE /notificaciones/{id} borra un aviso propio (lo ejecuta json-server).
  rutas.delete('/notificaciones/:id', manejar((req, _res, next) => {
    notificacionPropia(req);
    next();
  }));

  // Administración de catálogos: listado, alta y actualización vía json-server; baja lógica aquí.
  rutas.use('/admin', manejar((req, _res, next) => {
    requiereRol(req, 'ADMINISTRADOR');
    next();
  }));

  const tipoAdmin = (req) => {
    if (!TIPOS_CATALOGO_ADMIN.includes(req.params.tipo)) {
      throw new ErrorApi('NO_ENCONTRADO', { mensaje: `Catálogo desconocido. Tipos admitidos: ${TIPOS_CATALOGO_ADMIN.join(', ')}.` });
    }
    return req.params.tipo;
  };

  function validarCatalogo(tipo, datos, parcial) {
    const errores = [];
    const texto = (campo, etiqueta) => {
      if (datos[campo] === undefined && parcial) return;
      const valor = limpiarTexto(datos[campo]);
      if (valor.length < 2 || valor.length > 100) errores.push({ campo, mensaje: `${etiqueta} debe tener entre 2 y 100 caracteres.` });
      else datos[campo] = valor;
    };
    if (tipo === 'ubicaciones') {
      texto('edificio', 'El edificio');
      texto('ambiente', 'El ambiente');
    } else {
      texto('nombre', 'El nombre');
    }
    if (tipo === 'categorias' && !(parcial && datos.area_id === undefined) && !buscar('areas', datos.area_id)) {
      errores.push({ campo: 'area_id', mensaje: 'Selecciona un área existente.' });
    }
    if (datos.activo !== undefined && typeof datos.activo !== 'boolean') errores.push({ campo: 'activo', mensaje: 'El campo activo debe ser verdadero o falso.' });
    if (errores.length) throw new ErrorApi('VALIDACION', { errores });
  }

  rutas.post('/admin/catalogos/:tipo', manejar((req, _res, next) => {
    const tipo = tipoAdmin(req);
    const datos = { ...req.body };
    delete datos.id;
    validarCatalogo(tipo, datos, false);
    req.body = { ...datos, activo: datos.activo ?? true };
    next();
  }));

  rutas.put('/admin/catalogos/:tipo/:id', manejar((req, _res, next) => {
    const tipo = tipoAdmin(req);
    const actual = buscar(tipo, req.params.id);
    if (!actual) throw new ErrorApi('NO_ENCONTRADO');
    const datos = { ...req.body };
    delete datos.id;
    validarCatalogo(tipo, datos, true);
    if (tipo === 'categorias' && datos.area_id !== undefined && Number(datos.area_id) !== actual.area_id &&
      tabla('solicitudes').some({ categoria_id: actual.id }).value()) {
      throw new ErrorApi('CONFLICTO', { mensaje: 'La categoría ya fue usada: no cambia de área. Crea una categoría nueva.' });
    }
    req.body = datos;
    req.method = 'PATCH'; // actualización parcial en json-server
    next();
  }));

  // D07 / RN11: DELETE /admin/catalogos/{tipo}/{id} es una desactivación lógica, nunca un borrado.
  rutas.delete('/admin/catalogos/:tipo/:id', manejar((req, res) => {
    const tipo = tipoAdmin(req);
    const registro = buscar(tipo, req.params.id);
    if (!registro) throw new ErrorApi('NO_ENCONTRADO');
    registro.activo = false;
    res.json(registro);
    return true;
  }));

  // ---------------------------------------------------------------- paso a json-server
  /**
   * Traduce la paginación del contrato (pagina, tamaño) a la de json-server (_page, _limit)
   * y limita los avisos al usuario actual.
   */
  function prepararPasoAJsonServer(req, _res, next) {
    if (!req.esApi || req.method !== 'GET') return next();
    const url = new URL(req.url, 'http://local');
    if (!url.pathname.startsWith(`${PREFIJO}/notificaciones`) && !url.pathname.startsWith(`${PREFIJO}/admin/`)) return next();
    const p = url.searchParams;
    try {
      const { pagina, tamano } = leerPaginacion(Object.fromEntries(p));
      req.paginacion = { pagina, tamano };
      ['pagina', 'tamaño', 'tamano'].forEach((k) => p.delete(k));
      p.set('_page', String(pagina));
      p.set('_limit', String(tamano));
    } catch (error) {
      return next(error);
    }
    if (url.pathname === `${PREFIJO}/notificaciones`) {
      p.set('usuario_id', String(req.usuario.id));
      p.set('_sort', 'creada_en,id');
      p.set('_order', 'desc,desc');
    }
    req.url = `${url.pathname}?${p.toString()}`;
    req.query = Object.fromEntries(p);
    next();
  }

  /** Rutas no reescritas o acceso directo a recursos internos: 404 con formato común. */
  function soloRutasDelContrato(req, res, next) {
    if (!req.esApi || req.url.startsWith(PREFIJO)) return enviarError(req, res, 'NO_ENCONTRADO', { mensaje: 'La ruta solicitada no existe en la API simulada.' });
    next();
  }

  /** Respuesta de json-server: listas con { items, pagina, tamaño, total } y 404 con formato común. */
  function render(req, res) {
    const datos = res.locals.data;
    if (res.statusCode === 404) return enviarError(req, res, 'NO_ENCONTRADO');
    if (req.method === 'DELETE') return res.status(204).end();
    if (Array.isArray(datos)) {
      const total = Number(res.get('X-Total-Count') ?? datos.length);
      const { pagina = 1, tamano = datos.length } = req.paginacion ?? {};
      return res.json({ items: datos, pagina, 'tamaño': tamano, total });
    }
    return res.json(datos);
  }

  return { base, rutas, prepararPasoAJsonServer, soloRutasDelContrato, render };
}
