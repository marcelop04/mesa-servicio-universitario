/**
 * Módulo de reglas de negocio reutilizable (sección 5 del informe).
 * Responsable: Alex (PR02) con apoyo de Marcelo (PR05, recálculo RN05).
 *
 * Contiene la matriz de prioridad (tabla 5), los plazos de la política v1
 * (tabla 6), el cálculo de fechas límite en horas corridas (RN01, RN02),
 * el recálculo desde el registro original (RN05), las validaciones de la
 * solicitud (HU04, tabla 16) y la fórmula del porcentaje solucionado (tabla 7).
 *
 * Es un módulo ES sin dependencias: lo usan el navegador, el servidor
 * simulado (json-server) y las pruebas unitarias con `node --test`.
 * En la fase II se reutiliza en el frontend React sin cambios de contrato.
 */

/** Impacto: cuántas personas o actividades se afectan (tabla 5). */
export const IMPACTOS = Object.freeze([
  { codigo: 'ALTO', nombre: 'Alto', ejemplo: 'Varias aulas o un servicio compartido (por ejemplo, la red de todo un pabellón).' },
  { codigo: 'MEDIO', nombre: 'Medio', ejemplo: 'Un aula o un grupo (por ejemplo, el proyector de un aula en clase).' },
  { codigo: 'BAJO', nombre: 'Bajo', ejemplo: 'Una persona, sin interrupción general (por ejemplo, una silla rota).' },
]);

/** Urgencia: cuánto puede esperar la atención (texto debajo de la tabla 5). */
export const URGENCIAS = Object.freeze([
  { codigo: 'ALTA', nombre: 'Alta', ejemplo: 'Actividad detenida sin alternativa.' },
  { codigo: 'MEDIA', nombre: 'Media', ejemplo: 'Actividad degradada, con una alternativa temporal.' },
  { codigo: 'BAJA', nombre: 'Baja', ejemplo: 'Puede programarse sin interrumpir la actividad actual.' },
]);

/** Prioridades con orden estable (tabla 15: CRITICA, ALTA, MEDIA, BAJA). */
export const PRIORIDADES = Object.freeze({
  CRITICA: { codigo: 'CRITICA', nombre: 'Crítica', orden: 1 },
  ALTA: { codigo: 'ALTA', nombre: 'Alta', orden: 2 },
  MEDIA: { codigo: 'MEDIA', nombre: 'Media', orden: 3 },
  BAJA: { codigo: 'BAJA', nombre: 'Baja', orden: 4 },
});

/** Tabla 5. Matriz de prioridad: MATRIZ[impacto][urgencia]. */
export const MATRIZ_PRIORIDAD = Object.freeze({
  ALTO: Object.freeze({ ALTA: 'CRITICA', MEDIA: 'ALTA', BAJA: 'MEDIA' }),
  MEDIO: Object.freeze({ ALTA: 'ALTA', MEDIA: 'MEDIA', BAJA: 'BAJA' }),
  BAJO: Object.freeze({ ALTA: 'MEDIA', MEDIA: 'BAJA', BAJA: 'BAJA' }),
});

/** Tabla 6. Plazos de atención de la política v1, en horas. */
export const POLITICA_V1 = Object.freeze({
  CRITICA: Object.freeze({ horas_primera_atencion: 4, horas_resolucion: 24 }),
  ALTA: Object.freeze({ horas_primera_atencion: 8, horas_resolucion: 48 }),
  MEDIA: Object.freeze({ horas_primera_atencion: 24, horas_resolucion: 120 }),
  BAJA: Object.freeze({ horas_primera_atencion: 48, horas_resolucion: 240 }),
});

/** Siete estados con códigos fijos (sección 4, tabla 15). */
export const ESTADOS = Object.freeze({
  REGISTRADA: 'Registrada',
  EN_EVALUACION: 'En evaluación',
  ASIGNADA: 'Asignada',
  EN_ATENCION: 'En atención',
  RESUELTA: 'Resuelta',
  CERRADA: 'Cerrada',
  CANCELADA: 'Cancelada',
});

/** Pendiente = Registrada, En evaluación, Asignada o En atención (sección 4.3). */
export const ESTADOS_PENDIENTES = Object.freeze(['REGISTRADA', 'EN_EVALUACION', 'ASIGNADA', 'EN_ATENCION']);

export const LIMITES = Object.freeze({
  descripcionMin: 20,
  descripcionMax: 2000,
  referenciaMax: 200,
  motivoMin: 10,
  motivoMax: 1000,
  solucionMin: 20,
  solucionMax: 2000,
});

const HORA_MS = 60 * 60 * 1000;

export function esImpactoValido(codigo) {
  return Object.hasOwn(MATRIZ_PRIORIDAD, codigo);
}

export function esUrgenciaValida(codigo) {
  return Object.hasOwn(MATRIZ_PRIORIDAD.ALTO, codigo);
}

/**
 * Prioridad resultante de cruzar impacto y urgencia (tabla 5).
 * @returns {string|null} código de prioridad, o null si algún dato falta o no es válido.
 */
export function calcularPrioridad(impacto, urgencia) {
  if (!esImpactoValido(impacto) || !esUrgenciaValida(urgencia)) return null;
  return MATRIZ_PRIORIDAD[impacto][urgencia];
}

/**
 * Plazos de una prioridad según la política aplicada (por defecto la v1).
 * La política es la copia guardada en la solicitud (RN04, "matriz aplicada").
 */
export function obtenerPlazos(prioridad, politica = POLITICA_V1) {
  const plazos = politica?.[prioridad];
  if (!plazos) return null;
  return { horas_primera_atencion: plazos.horas_primera_atencion, horas_resolucion: plazos.horas_resolucion };
}

/**
 * Suma horas corridas a una fecha (RN02: incluye fines de semana, sin feriados ni pausas).
 * Opera sobre el instante UTC, por lo que el resultado no depende de la zona horaria.
 */
export function sumarHorasCorridas(fecha, horas) {
  const base = fecha instanceof Date ? fecha.getTime() : Date.parse(fecha);
  if (Number.isNaN(base)) throw new TypeError('Fecha inválida');
  if (!Number.isFinite(horas) || horas <= 0) throw new RangeError('Las horas deben ser positivas');
  return new Date(base + horas * HORA_MS);
}

/**
 * Límites de primera atención y resolución desde el instante de registro (RN01).
 * Las fechas se devuelven en ISO 8601 UTC (RN03: se guardan en UTC).
 */
export function calcularLimites(registradaEn, prioridad, politica = POLITICA_V1) {
  const plazos = obtenerPlazos(prioridad, politica);
  if (!plazos) return null;
  return {
    limite_atencion: sumarHorasCorridas(registradaEn, plazos.horas_primera_atencion).toISOString(),
    limite_resolucion: sumarHorasCorridas(registradaEn, plazos.horas_resolucion).toISOString(),
  };
}

/**
 * RN05. Cambio de prioridad: recalcula desde el registro original con la matriz
 * guardada en el caso, sin reiniciar la fecha de registro.
 * @returns {{prioridad_codigo:string, limite_atencion:string, limite_resolucion:string}|null}
 */
export function recalcularPorCambioDePrioridad(solicitud, impacto, urgencia) {
  const prioridad = calcularPrioridad(impacto, urgencia);
  if (!prioridad) return null;
  const limites = calcularLimites(solicitud.registrada_en, prioridad, solicitud.matriz_aplicada ?? POLITICA_V1);
  return { prioridad_codigo: prioridad, ...limites };
}

/** Recorta espacios externos (sección 6.3) y devuelve '' si no es texto. */
export function limpiarTexto(valor) {
  return typeof valor === 'string' ? valor.trim() : '';
}

/**
 * Validación de los datos de una nueva solicitud (HU04, tabla 16).
 * Se usa igual en el cliente y en el servidor simulado.
 * @param {object} datos categoria_id, ubicacion_id, descripcion, impacto, urgencia, referencia
 * @param {{categoriasActivas?:Set<number>, ubicacionesActivas?:Set<number>}} [catalogos]
 * @returns {Array<{campo:string, mensaje:string}>} lista vacía si los datos son válidos
 */
export function validarSolicitud(datos = {}, catalogos = {}) {
  const errores = [];
  const categoria = Number(datos.categoria_id);
  const ubicacion = Number(datos.ubicacion_id);
  const descripcion = limpiarTexto(datos.descripcion);
  const referencia = limpiarTexto(datos.referencia);

  if (!datos.categoria_id || !Number.isInteger(categoria) || categoria <= 0) {
    errores.push({ campo: 'categoria_id', mensaje: 'Selecciona la categoría del problema.' });
  } else if (catalogos.categoriasActivas && !catalogos.categoriasActivas.has(categoria)) {
    errores.push({ campo: 'categoria_id', mensaje: 'La categoría seleccionada no existe o ya no está activa.' });
  }

  if (!datos.ubicacion_id || !Number.isInteger(ubicacion) || ubicacion <= 0) {
    errores.push({ campo: 'ubicacion_id', mensaje: 'Selecciona la ubicación donde ocurre el problema.' });
  } else if (catalogos.ubicacionesActivas && !catalogos.ubicacionesActivas.has(ubicacion)) {
    errores.push({ campo: 'ubicacion_id', mensaje: 'La ubicación seleccionada no existe o ya no está activa.' });
  }

  if (descripcion.length === 0) {
    errores.push({ campo: 'descripcion', mensaje: `Describe el problema (entre ${LIMITES.descripcionMin} y ${LIMITES.descripcionMax} caracteres).` });
  } else if (descripcion.length < LIMITES.descripcionMin) {
    errores.push({ campo: 'descripcion', mensaje: `La descripción es muy corta: tiene ${descripcion.length} caracteres y el mínimo es ${LIMITES.descripcionMin}.` });
  } else if (descripcion.length > LIMITES.descripcionMax) {
    errores.push({ campo: 'descripcion', mensaje: `La descripción supera el máximo de ${LIMITES.descripcionMax} caracteres (tiene ${descripcion.length}).` });
  }

  if (referencia.length > LIMITES.referenciaMax) {
    errores.push({ campo: 'referencia', mensaje: `La referencia admite hasta ${LIMITES.referenciaMax} caracteres.` });
  }

  if (!esImpactoValido(datos.impacto)) {
    errores.push({ campo: 'impacto', mensaje: 'Indica el impacto: Alto, Medio o Bajo.' });
  }
  if (!esUrgenciaValida(datos.urgencia)) {
    errores.push({ campo: 'urgencia', mensaje: 'Indica la urgencia: Alta, Media o Baja.' });
  }
  return errores;
}

/** Valida un motivo de cambio operativo (10 a 1000 caracteres, sección 9.3). */
export function validarMotivo(texto, campo = 'motivo') {
  const motivo = limpiarTexto(texto);
  if (motivo.length === 0) return [{ campo, mensaje: `El motivo es obligatorio (entre ${LIMITES.motivoMin} y ${LIMITES.motivoMax} caracteres).` }];
  if (motivo.length < LIMITES.motivoMin) return [{ campo, mensaje: `El motivo es muy corto: tiene ${motivo.length} caracteres y el mínimo es ${LIMITES.motivoMin}.` }];
  if (motivo.length > LIMITES.motivoMax) return [{ campo, mensaje: `El motivo supera el máximo de ${LIMITES.motivoMax} caracteres.` }];
  return [];
}

/** Valida la descripción de la solución (20 a 2000 caracteres, HU11). */
export function validarSolucion(texto) {
  const solucion = limpiarTexto(texto);
  if (solucion.length < LIMITES.solucionMin) return [{ campo: 'solucion', mensaje: `Describe la solución con al menos ${LIMITES.solucionMin} caracteres.` }];
  if (solucion.length > LIMITES.solucionMax) return [{ campo: 'solucion', mensaje: `La solución supera el máximo de ${LIMITES.solucionMax} caracteres.` }];
  return [];
}

export function esPendiente(estadoCodigo) {
  return ESTADOS_PENDIENTES.includes(estadoCodigo);
}

/** Redondea a un decimal (tabla 7: porcentajes y horas con un decimal). */
export function redondearUnDecimal(valor) {
  return Math.round(valor * 10) / 10;
}

/**
 * Tabla 7. Conteos base y porcentaje solucionado.
 * Porcentaje solucionado = 100 × (resueltas + cerradas) / (registradas − canceladas).
 * Un denominador cero devuelve null ("Sin datos").
 * @param {{pendientes:number, solucionadas:number, canceladas:number}} conteos
 */
export function calcularIndicadoresBase({ pendientes, solucionadas, canceladas }) {
  const registradas = pendientes + solucionadas + canceladas;
  const base = registradas - canceladas;
  return {
    registradas,
    pendientes,
    solucionadas,
    canceladas,
    porcentaje_solucionado: base === 0 ? null : redondearUnDecimal((100 * solucionadas) / base),
  };
}

/** Formato peruano de un porcentaje con un decimal: 69.6 → "69,6 %"; null → "Sin datos". */
export function formatearPorcentaje(valor) {
  if (valor === null || valor === undefined) return 'Sin datos';
  return `${valor.toFixed(1).replace('.', ',')} %`;
}
