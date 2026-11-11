package pe.edu.unmsm.msu.auditoria.dto;

import java.time.Instant;
import java.util.Map;
import pe.edu.unmsm.msu.auditoria.entidad.Auditoria;

/** HU23 · Fila de la auditoría administrativa. Sin contraseñas, tokens ni contenido de evidencias. */
public record AuditoriaVista(Long id, Long actorId, String actorNombre, String actorCorreo, String accion,
                             String entidad, String entidadId, Map<String, Object> metadatos, Instant creadaEn) {

    public static AuditoriaVista de(Auditoria a) {
        return new AuditoriaVista(a.getId(), a.getActor() == null ? null : a.getActor().getId(),
                a.getActor() == null ? null : a.getActor().getNombre(),
                a.getActor() == null ? null : a.getActor().getCorreo(), a.getAccion(), a.getEntidad(),
                a.getEntidadId(), a.getMetadatos(), a.getCreadaEn());
    }
}
