package pe.edu.unmsm.msu.solicitudes.servicio;

import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import pe.edu.unmsm.msu.comun.error.ExcepcionApi;
import pe.edu.unmsm.msu.identidad.entidad.Rol;
import pe.edu.unmsm.msu.seguridad.UsuarioAutenticado;
import pe.edu.unmsm.msu.solicitudes.dto.EventoVista;
import pe.edu.unmsm.msu.solicitudes.entidad.Solicitud;
import pe.edu.unmsm.msu.solicitudes.repositorio.EventoOperativoRepositorio;
import pe.edu.unmsm.msu.solicitudes.repositorio.SolicitudRepositorio;

/**
 * EM04 · HU23 Historial operativo (Emanuel). Un evento por cada transición y cambio operativo,
 * en orden cronológico y con el mismo acceso que el detalle. La aplicación no ofrece edición ni borrado.
 */
@Service
public class HistorialServicio {

    private final SolicitudRepositorio solicitudes;
    private final EventoOperativoRepositorio eventos;

    public HistorialServicio(SolicitudRepositorio solicitudes, EventoOperativoRepositorio eventos) {
        this.solicitudes = solicitudes;
        this.eventos = eventos;
    }

    @Transactional(readOnly = true)
    public List<EventoVista> historial(long id, UsuarioAutenticado sesion) {
        Permisos.exigirRol(sesion, Rol.SOLICITANTE, Rol.TECNICO, Rol.SUPERVISOR);
        Solicitud s = solicitudes.findConDetalleById(id)
                .orElseThrow(() -> ExcepcionApi.noEncontrado("La solicitud no existe."));
        Permisos.exigirAcceso(sesion, s);
        return eventos.findBySolicitudIdOrderByCreadoEnAscIdAsc(id).stream().map(EventoVista::de).toList();
    }
}
