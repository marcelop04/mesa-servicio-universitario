package pe.edu.unmsm.msu.comun.error;

import java.util.List;

/**
 * Formato común de error (informe, sección 10.3): código, mensaje comprensible,
 * errores por campo e identificador de correlación. Nunca incluye trazas internas.
 */
public record ApiError(String codigo, String mensaje, List<ErrorCampo> errores, String idCorrelacion) {
}
