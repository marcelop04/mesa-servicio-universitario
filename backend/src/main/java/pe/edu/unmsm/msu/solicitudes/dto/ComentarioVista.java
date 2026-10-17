package pe.edu.unmsm.msu.solicitudes.dto;

import java.time.Instant;
import pe.edu.unmsm.msu.solicitudes.entidad.Comentario;

/** Comentario con autor y fecha fijados por el servidor (HU06). */
public record ComentarioVista(Long id, Long autorId, String autorNombre, String autorRol, String texto,
                              Instant creadoEn) {

    public static ComentarioVista de(Comentario c) {
        return new ComentarioVista(c.getId(), c.getAutor().getId(), c.getAutor().getNombre(),
                c.getAutor().getRol().getCodigo(), c.getTexto(), c.getCreadoEn());
    }
}
