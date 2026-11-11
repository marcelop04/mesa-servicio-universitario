package pe.edu.unmsm.msu.notificaciones.servicio;

import java.time.Clock;
import java.time.Instant;
import org.springframework.data.domain.Sort;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import pe.edu.unmsm.msu.comun.error.ExcepcionApi;
import pe.edu.unmsm.msu.comun.web.Pagina;
import pe.edu.unmsm.msu.notificaciones.dto.NotificacionVista;
import pe.edu.unmsm.msu.notificaciones.entidad.Notificacion;
import pe.edu.unmsm.msu.notificaciones.repositorio.NotificacionRepositorio;
import pe.edu.unmsm.msu.seguridad.UsuarioAutenticado;

/**
 * HU16 · Centro de notificaciones. Cada usuario ve, marca y borra solo sus propios avisos.
 * Abrir la solicitud del aviso vuelve a comprobar el acceso actual (BDD 2: acceso retirado).
 */
@Service
public class NotificacionesServicio {

    private static final Sort RECIENTES = Sort.by(Sort.Order.desc("creadaEn"), Sort.Order.desc("id"));

    private final NotificacionRepositorio notificaciones;
    private final Clock reloj;

    public NotificacionesServicio(NotificacionRepositorio notificaciones, Clock reloj) {
        this.notificaciones = notificaciones;
        this.reloj = reloj;
    }

    @Transactional(readOnly = true)
    public Pagina<NotificacionVista> listar(UsuarioAutenticado sesion, boolean soloNoLeidas, Integer pagina,
                                            Integer tamano) {
        var pedido = Pagina.solicitud(pagina, tamano, RECIENTES);
        var pagina_ = soloNoLeidas
                ? notificaciones.findByUsuarioIdAndLeidaEnIsNull(sesion.id(), pedido)
                : notificaciones.findByUsuarioId(sesion.id(), pedido);
        return Pagina.de(pagina_, NotificacionVista::de);
    }

    @Transactional(readOnly = true)
    public long noLeidas(UsuarioAutenticado sesion) {
        return notificaciones.countByUsuarioIdAndLeidaEnIsNull(sesion.id());
    }

    /** BDD 1: deja de contarse como no leída y conserva su contenido. */
    @Transactional
    public NotificacionVista marcarLeida(long id, UsuarioAutenticado sesion) {
        Notificacion n = propia(id, sesion);
        n.marcarLeida(Instant.now(reloj));
        return NotificacionVista.de(n);
    }

    @Transactional
    public int marcarTodas(UsuarioAutenticado sesion) {
        return notificaciones.marcarTodasLeidas(sesion.id(), Instant.now(reloj));
    }

    /** D07 · DELETE /notificaciones/{id}: borra un aviso propio; el historial de la solicitud no cambia. */
    @Transactional
    public void eliminar(long id, UsuarioAutenticado sesion) {
        notificaciones.delete(propia(id, sesion));
    }

    private Notificacion propia(long id, UsuarioAutenticado sesion) {
        Notificacion n = notificaciones.findById(id).orElseThrow(() -> ExcepcionApi.noEncontrado("El aviso no existe."));
        if (!n.getUsuario().getId().equals(sesion.id())) {
            throw new AccessDeniedException("Aviso ajeno");
        }
        return n;
    }
}
