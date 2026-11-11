package pe.edu.unmsm.msu.notificaciones.dto;

import java.time.Instant;
import pe.edu.unmsm.msu.notificaciones.entidad.Notificacion;

/** HU16 · Aviso con fecha, tipo, vínculo a la solicitud y estado de lectura. */
public record NotificacionVista(Long id, String tipo, String texto, Long solicitudId, String solicitudCodigo,
                                Instant creadaEn, Instant leidaEn, boolean leida) {

    public static NotificacionVista de(Notificacion n) {
        return new NotificacionVista(n.getId(), n.getTipo(), n.getTexto(), n.getSolicitud().getId(),
                n.getSolicitud().getCodigo(), n.getCreadaEn(), n.getLeidaEn(), n.getLeidaEn() != null);
    }
}
