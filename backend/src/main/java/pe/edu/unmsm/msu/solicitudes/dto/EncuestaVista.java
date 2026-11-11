package pe.edu.unmsm.msu.solicitudes.dto;

import java.time.Instant;
import pe.edu.unmsm.msu.solicitudes.entidad.Encuesta;

/** HU13 · Encuesta registrada de una solicitud cerrada. */
public record EncuestaVista(Long id, Long solicitudId, int calificacion, String comentario, Instant creadaEn) {

    public static EncuestaVista de(Encuesta e) {
        return new EncuestaVista(e.getId(), e.getSolicitud().getId(), e.getCalificacion(), e.getComentario(),
                e.getCreadaEn());
    }
}
