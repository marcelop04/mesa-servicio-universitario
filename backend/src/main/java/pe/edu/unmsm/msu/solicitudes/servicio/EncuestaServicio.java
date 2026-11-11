package pe.edu.unmsm.msu.solicitudes.servicio;

import java.time.Clock;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import pe.edu.unmsm.msu.comun.error.ErrorCampo;
import pe.edu.unmsm.msu.comun.error.ExcepcionApi;
import pe.edu.unmsm.msu.identidad.entidad.Rol;
import pe.edu.unmsm.msu.seguridad.UsuarioAutenticado;
import pe.edu.unmsm.msu.solicitudes.dto.EncuestaVista;
import pe.edu.unmsm.msu.solicitudes.dto.NuevaEncuesta;
import pe.edu.unmsm.msu.solicitudes.entidad.Encuesta;
import pe.edu.unmsm.msu.solicitudes.entidad.Solicitud;
import pe.edu.unmsm.msu.solicitudes.repositorio.EncuestaRepositorio;
import pe.edu.unmsm.msu.solicitudes.repositorio.SolicitudRepositorio;

/**
 * HU13 · Calificar el servicio (Emanuel, fase III).
 * <ul>
 *   <li>Solo el solicitante propietario y solo en una solicitud Cerrada (RN12).</li>
 *   <li>Una encuesta por solicitud: un segundo envío responde 409 ENCUESTA_DUPLICADA (BDD 2). La restricción
 *       única de la tabla cubre además dos envíos simultáneos.</li>
 *   <li>No cambia el estado, la resolución ni la versión de la solicitud.</li>
 * </ul>
 */
@Service
public class EncuestaServicio {

    static final int CALIFICACION_MIN = 1;
    static final int CALIFICACION_MAX = 5;
    static final int COMENTARIO_MAX = 500;

    private final SolicitudRepositorio solicitudes;
    private final EncuestaRepositorio encuestas;
    private final Clock reloj;

    public EncuestaServicio(SolicitudRepositorio solicitudes, EncuestaRepositorio encuestas, Clock reloj) {
        this.solicitudes = solicitudes;
        this.encuestas = encuestas;
        this.reloj = reloj;
    }

    /** Mismo acceso que el detalle. Vacío si la solicitud aún no tiene encuesta. */
    @Transactional(readOnly = true)
    public Optional<EncuestaVista> consultar(long id, UsuarioAutenticado sesion) {
        cargarVisible(id, sesion);
        return encuestas.findBySolicitudId(id).map(EncuestaVista::de);
    }

    /** HU13 BDD 1: guarda la encuesta y confirma su recepción. BDD 2: rechaza la duplicación. */
    @Transactional
    public EncuestaVista registrar(long id, NuevaEncuesta datos, UsuarioAutenticado sesion) {
        Permisos.exigirRol(sesion, Rol.SOLICITANTE);
        Solicitud s = cargarVisible(id, sesion);
        if (!Solicitud.CERRADA.equals(s.getEstadoCodigo())) {
            throw ExcepcionApi.conflicto("ENCUESTA_NO_DISPONIBLE", "La encuesta se responde cuando la solicitud "
                    + s.getCodigo() + " está Cerrada; ahora está " + s.getEstado().getNombreVisible() + ".");
        }
        if (encuestas.existsBySolicitudId(id)) {
            throw ExcepcionApi.conflicto("ENCUESTA_DUPLICADA",
                    "Ya calificaste la solicitud " + s.getCodigo() + ". La encuesta se responde una sola vez.");
        }
        List<ErrorCampo> errores = new ArrayList<>();
        Integer calificacion = datos == null ? null : datos.calificacion();
        if (calificacion == null || calificacion < CALIFICACION_MIN || calificacion > CALIFICACION_MAX) {
            errores.add(new ErrorCampo("calificacion", "Elige una calificación entera de 1 a 5."));
        }
        String comentario = datos == null || datos.comentario() == null ? null : datos.comentario().strip();
        if (comentario != null && comentario.isEmpty()) {
            comentario = null;
        }
        if (comentario != null && comentario.length() > COMENTARIO_MAX) {
            errores.add(new ErrorCampo("comentario",
                    "El comentario admite como máximo " + COMENTARIO_MAX + " caracteres (tiene " + comentario.length() + ")."));
        }
        if (!errores.isEmpty()) {
            throw ExcepcionApi.datosInvalidos(errores);
        }
        Encuesta encuesta = encuestas.saveAndFlush(new Encuesta(s, s.getSolicitante(), calificacion, comentario,
                Instant.now(reloj)));
        return EncuestaVista.de(encuesta);
    }

    private Solicitud cargarVisible(long id, UsuarioAutenticado sesion) {
        Solicitud s = solicitudes.findConDetalleById(id)
                .orElseThrow(() -> ExcepcionApi.noEncontrado("La solicitud no existe."));
        if (!Permisos.puedeVer(sesion, s)) {
            throw new AccessDeniedException("Solicitud no autorizada");
        }
        return s;
    }
}
