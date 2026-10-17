/**
 * Formato común de errores de la API simulada (sección 10.3, tabla 20).
 * Responsable: Emanuel (PR06) sobre la base de David.
 *
 * Toda respuesta de error tiene la misma forma, sin trazas internas:
 * {
 *   "codigo": "VALIDACION",
 *   "mensaje": "Texto comprensible para la persona usuaria",
 *   "errores": [{ "campo": "descripcion", "mensaje": "..." }],
 *   "id_correlacion": "c0a8..."
 * }
 */

export const CODIGOS = Object.freeze({
  VALIDACION: { http: 400, mensaje: 'Revisa los datos marcados: hay campos inválidos o incompletos.' },
  JSON_INVALIDO: { http: 400, mensaje: 'El cuerpo de la petición no es un JSON válido.' },
  NO_AUTENTICADO: { http: 401, mensaje: 'Tu sesión no es válida. Vuelve a ingresar con una cuenta de demostración.' },
  CREDENCIALES_INVALIDAS: { http: 401, mensaje: 'No se pudo iniciar sesión con los datos indicados.' },
  PERMISO_DENEGADO: { http: 403, mensaje: 'Tu rol no tiene permiso para realizar esta operación.' },
  NO_ENCONTRADO: { http: 404, mensaje: 'El recurso solicitado no existe.' },
  TRANSICION_INVALIDA: { http: 409, mensaje: 'La acción no está permitida en el estado actual de la solicitud.' },
  CONFLICTO_VERSION: { http: 409, mensaje: 'La solicitud cambió mientras la revisabas. Se recargaron los datos para que revises el cambio.' },
  CONFLICTO: { http: 409, mensaje: 'La operación entra en conflicto con los datos existentes.' },
  SERVICIO_NO_DISPONIBLE: { http: 503, mensaje: 'El servicio no está disponible en este momento. Inténtalo nuevamente en unos segundos.' },
  ERROR_INTERNO: { http: 500, mensaje: 'Ocurrió un error inesperado en el servidor.' },
});

/** Error de aplicación que el manejador global convierte al formato común. */
export class ErrorApi extends Error {
  constructor(codigo, { mensaje, errores = [] } = {}) {
    const definicion = CODIGOS[codigo] ?? CODIGOS.ERROR_INTERNO;
    super(mensaje ?? definicion.mensaje);
    this.codigo = CODIGOS[codigo] ? codigo : 'ERROR_INTERNO';
    this.http = definicion.http;
    this.errores = errores;
  }
}

/** Envía un error con el formato común. */
export function enviarError(req, res, codigo, opciones = {}) {
  const error = codigo instanceof ErrorApi ? codigo : new ErrorApi(codigo, opciones);
  res.status(error.http).json({
    codigo: error.codigo,
    mensaje: error.message,
    errores: error.errores,
    id_correlacion: req.idCorrelacion ?? null,
  });
}

/** Manejador global de errores de Express (última capa). */
export function manejadorGlobal(err, req, res, _next) {
  if (err instanceof ErrorApi) return enviarError(req, res, err);
  if (err?.type === 'entity.parse.failed') return enviarError(req, res, 'JSON_INVALIDO');
  console.error(`[${req.idCorrelacion}]`, err);
  return enviarError(req, res, 'ERROR_INTERNO');
}
