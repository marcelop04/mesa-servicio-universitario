package pe.edu.unmsm.msu.solicitudes.dto;

/**
 * HU13 · POST /solicitudes/{id}/encuesta. Calificación entera de 1 a 5 y comentario opcional de hasta 500
 * caracteres. Los límites se validan en el servicio para responder con el error junto al campo.
 */
public record NuevaEncuesta(Integer calificacion, String comentario) {
}
