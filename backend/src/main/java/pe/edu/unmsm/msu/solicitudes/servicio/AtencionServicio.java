package pe.edu.unmsm.msu.solicitudes.servicio;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import org.springframework.data.domain.Pageable;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import pe.edu.unmsm.msu.comun.error.ErrorCampo;
import pe.edu.unmsm.msu.comun.error.ExcepcionApi;
import pe.edu.unmsm.msu.identidad.entidad.Rol;
import pe.edu.unmsm.msu.identidad.entidad.Usuario;
import pe.edu.unmsm.msu.identidad.repositorio.UsuarioRepositorio;
import pe.edu.unmsm.msu.notificaciones.servicio.Notificador;
import pe.edu.unmsm.msu.seguridad.UsuarioAutenticado;
import pe.edu.unmsm.msu.solicitudes.dto.ConformidadSolicitud;
import pe.edu.unmsm.msu.solicitudes.dto.SolicitudDetalle;
import pe.edu.unmsm.msu.solicitudes.entidad.Solicitud;
import pe.edu.unmsm.msu.solicitudes.repositorio.SolicitudRepositorio;

/**
 * Épica E04 · Atención y conformidad (Emanuel).
 * <ul>
 *   <li>EM01 · HU10 Iniciar la atención: solo el técnico asignado; la primera atención se registra una vez.</li>
 *   <li>EM02 · HU11 Registrar una solución de 20 a 2000 caracteres; abre la ventana de conformidad.</li>
 *   <li>EM03 · HU12 Confirmar o reabrir dentro de 72 horas desde la última resolución (RN08).</li>
 * </ul>
 * Todas las acciones usan el servicio de transiciones y devuelven la versión nueva (HU24).
 */
@Service
public class AtencionServicio {

    public static final Duration VENTANA_CONFORMIDAD = Duration.ofHours(72);
    static final int SOLUCION_MIN = 20;
    static final int SOLUCION_MAX = 2000;

    private final SolicitudRepositorio solicitudes;
    private final TransicionesServicio transiciones;
    private final UsuarioRepositorio usuarios;
    private final Notificador notificador;
    private final Clock reloj;

    public AtencionServicio(SolicitudRepositorio solicitudes, TransicionesServicio transiciones,
                            UsuarioRepositorio usuarios, Notificador notificador, Clock reloj) {
        this.solicitudes = solicitudes;
        this.transiciones = transiciones;
        this.usuarios = usuarios;
        this.notificador = notificador;
        this.reloj = reloj;
    }

    /** HU10 BDD 1: pasa a En atención y registra la primera atención. BDD 2: otro técnico recibe 403. */
    @Transactional
    public SolicitudDetalle iniciar(long id, Integer version, UsuarioAutenticado sesion) {
        Solicitud s = cargarDelTecnico(id, version, sesion);
        transiciones.aplicar(s, Transicion.INICIAR_ATENCION, sesion.id(), null, null);
        transiciones.guardar(s);
        notificador.avisar(s.getSolicitante(), sesion.id(), s, "ESTADO",
                "Se inició la atención de su solicitud " + s.getCodigo() + ".");
        return SolicitudDetalle.de(s, Instant.now(reloj));
    }

    /** HU11 BDD 1: guarda la solución y avisa. BDD 2: una solución corta se rechaza y sigue En atención. */
    @Transactional
    public SolicitudDetalle resolver(long id, String solucion, Integer version, UsuarioAutenticado sesion) {
        Solicitud s = cargarDelTecnico(id, version, sesion);
        transiciones.exigirEstado(s, Set.of(Solicitud.EN_ATENCION),
                "Solo se resuelve una solicitud En atención; " + s.getCodigo() + " está "
                        + s.getEstado().getNombreVisible() + ".");
        String texto = solucion == null ? "" : solucion.trim();
        if (texto.length() < SOLUCION_MIN) {
            throw ExcepcionApi.datoInvalido("solucion", "Describe la solución con al menos " + SOLUCION_MIN
                    + " caracteres (tiene " + texto.length() + ").");
        }
        if (texto.length() > SOLUCION_MAX) {
            throw ExcepcionApi.datoInvalido("solucion", "La solución supera el máximo de " + SOLUCION_MAX + " caracteres.");
        }
        // La solución se registra como evento de resolución (sección 9.3).
        transiciones.aplicar(s, Transicion.RESOLVER, sesion.id(), texto, null);
        transiciones.guardar(s);
        notificador.avisar(s.getSolicitante(), sesion.id(), s, "RESOLUCION", "Su solicitud " + s.getCodigo()
                + " fue resuelta. Confirme la solución o reábrala dentro de 72 horas.");
        return SolicitudDetalle.de(s, Instant.now(reloj));
    }

    /**
     * HU12. CONFIRMAR cierra el caso; REABRIR exige motivo y vuelve a En atención con el mismo técnico
     * (o a En evaluación si ya está inactivo). Fuera de la ventana de 72 horas se rechaza aunque el
     * proceso periódico aún no haya cerrado el caso (RN08, BDD 2).
     */
    @Transactional
    public SolicitudDetalle conformidad(long id, ConformidadSolicitud datos, UsuarioAutenticado sesion) {
        Permisos.exigirRol(sesion, Rol.SOLICITANTE);
        Solicitud s = cargarConVersion(id, datos.version(), sesion);
        transiciones.exigirEstado(s, Set.of(Solicitud.RESUELTA), "Solo se confirma o reabre una solicitud "
                + "Resuelta; " + s.getCodigo() + " está " + s.getEstado().getNombreVisible() + ".");
        Instant ahora = Instant.now(reloj);
        if (!ahora.isBefore(s.getUltimaResolucionEn().plus(VENTANA_CONFORMIDAD))) {
            throw ExcepcionApi.conflicto("VENTANA_VENCIDA", "Terminó el periodo de 72 horas para confirmar o reabrir "
                    + "la solicitud " + s.getCodigo() + ". El caso se cerrará automáticamente.");
        }
        String accion = datos.accion() == null ? "" : datos.accion().trim().toUpperCase(Locale.ROOT);
        Usuario tecnico = s.getTecnico();
        switch (accion) {
            case "CONFIRMAR" -> {
                transiciones.aplicar(s, Transicion.CONFIRMAR, sesion.id(), null, null);
                transiciones.guardar(s);
                notificador.avisar(tecnico, sesion.id(), s, "CIERRE",
                        "El solicitante confirmó la solución de " + s.getCodigo() + ".");
            }
            case "REABRIR" -> {
                List<ErrorCampo> errores = new ArrayList<>();
                String motivo = SupervisionServicio.limpiar(datos.motivo());
                SupervisionServicio.validarMotivo(motivo, "motivo", errores);
                if (!errores.isEmpty()) {
                    throw ExcepcionApi.datosInvalidos(errores);
                }
                boolean tecnicoActivo = tecnico != null && tecnico.isActivo();
                Map<String, Object> extra = new LinkedHashMap<>();
                if (tecnicoActivo) {
                    transiciones.aplicar(s, Transicion.REABRIR, sesion.id(), motivo, extra);
                    notificador.avisar(tecnico, sesion.id(), s, "REAPERTURA",
                            "El solicitante reabrió la solicitud " + s.getCodigo() + ": el problema persiste.");
                } else {
                    // El técnico ya no está activo: vuelve a evaluación para una nueva asignación.
                    extra.put("tecnico_anterior", tecnico == null ? null : tecnico.getNombre());
                    s.asignar(null);
                    transiciones.aplicar(s, Transicion.REABRIR_SIN_TECNICO, sesion.id(), motivo, extra);
                    for (Usuario supervisor : usuarios.buscar(Rol.SUPERVISOR, true, null, Pageable.unpaged())) {
                        notificador.avisar(supervisor, sesion.id(), s, "REAPERTURA", "La solicitud " + s.getCodigo()
                                + " fue reabierta y necesita un nuevo técnico.");
                    }
                }
                transiciones.guardar(s);
            }
            default -> throw ExcepcionApi.datoInvalido("accion", "Indique CONFIRMAR o REABRIR.");
        }
        return SolicitudDetalle.de(s, Instant.now(reloj));
    }

    /** Técnico asignado actualmente; el acceso se comprueba antes que la versión. */
    private Solicitud cargarDelTecnico(long id, Integer version, UsuarioAutenticado sesion) {
        Permisos.exigirRol(sesion, Rol.TECNICO);
        return cargarConVersion(id, version, sesion);
    }

    private Solicitud cargarConVersion(long id, Integer version, UsuarioAutenticado sesion) {
        Solicitud s = solicitudes.findConDetalleById(id)
                .orElseThrow(() -> ExcepcionApi.noEncontrado("La solicitud no existe."));
        if (!Permisos.puedeVer(sesion, s)) {
            throw new AccessDeniedException("Solicitud no autorizada");
        }
        if (version == null) {
            throw ExcepcionApi.datoInvalido("version", "Falta la versión de la solicitud. Recargue los datos.");
        }
        transiciones.exigirVersion(s, version);
        return s;
    }
}
