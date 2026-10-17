package pe.edu.unmsm.msu.notificaciones.servicio;

import java.time.Clock;
import java.time.Instant;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import pe.edu.unmsm.msu.identidad.entidad.Usuario;
import pe.edu.unmsm.msu.notificaciones.entidad.Notificacion;
import pe.edu.unmsm.msu.notificaciones.repositorio.NotificacionRepositorio;
import pe.edu.unmsm.msu.solicitudes.entidad.Solicitud;

/**
 * Genera avisos internos (RF19) dentro de la misma transacción que la acción que los origina.
 * Se deduplican por tipo, solicitud, destinatario, versión de fechas y versión de la solicitud (RN10).
 * El centro de notificaciones (HU16) lee estos registros.
 */
@Service
@Transactional(propagation = Propagation.MANDATORY)
public class Notificador {

    private final NotificacionRepositorio notificaciones;
    private final Clock reloj;

    public Notificador(NotificacionRepositorio notificaciones, Clock reloj) {
        this.notificaciones = notificaciones;
        this.reloj = reloj;
    }

    /** No avisa al propio autor de la acción (HU16). */
    public void avisar(Usuario destinatario, long actorId, Solicitud s, String tipo, String texto) {
        avisar(destinatario, actorId, s, tipo, texto, null);
    }

    /** {@code evento} distingue avisos que no cambian la versión de la solicitud, como cada comentario. */
    public void avisar(Usuario destinatario, long actorId, Solicitud s, String tipo, String texto, String evento) {
        if (destinatario == null || destinatario.getId() == actorId) {
            return;
        }
        String clave = tipo + ":" + s.getId() + ":" + destinatario.getId() + ":" + s.getVersionFechas() + ":"
                + s.getVersion() + (evento == null ? "" : ":" + evento);
        if (notificaciones.existsByClaveEvento(clave)) {
            return;
        }
        String recortado = texto.length() > 300 ? texto.substring(0, 297) + "..." : texto;
        notificaciones.save(new Notificacion(destinatario, s, tipo, recortado, s.getVersionFechas(), clave,
                Instant.now(reloj)));
    }
}
