package pe.edu.unmsm.msu.solicitudes.dto;

import java.time.Instant;
import java.util.Map;
import pe.edu.unmsm.msu.solicitudes.entidad.EventoOperativo;

/** HU23 · Evento del historial operativo: actor (o Sistema), instante, acción, valores y motivo. */
public record EventoVista(Long id, String accion, String actorNombre, String actorRol, Map<String, Object> anterior,
                          Map<String, Object> nuevo, String motivo, Instant creadoEn) {

    public static EventoVista de(EventoOperativo e) {
        return new EventoVista(e.getId(), e.getAccion(), e.getActor() == null ? "Sistema" : e.getActor().getNombre(),
                e.getActor() == null ? null : e.getActor().getRol().getCodigo(), e.getAnterior(), e.getNuevo(),
                e.getMotivo(), e.getCreadoEn());
    }
}
