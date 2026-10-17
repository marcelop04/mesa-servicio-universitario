package pe.edu.unmsm.msu.solicitudes.servicio;

import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import pe.edu.unmsm.msu.comun.error.ErrorCampo;
import pe.edu.unmsm.msu.comun.error.ExcepcionApi;
import pe.edu.unmsm.msu.comun.web.Pagina;
import pe.edu.unmsm.msu.identidad.entidad.Rol;
import pe.edu.unmsm.msu.politicas.servicio.MatrizPrioridad;
import pe.edu.unmsm.msu.seguridad.UsuarioAutenticado;
import pe.edu.unmsm.msu.solicitudes.dto.SolicitudDetalle;
import pe.edu.unmsm.msu.solicitudes.dto.SolicitudResumen;
import pe.edu.unmsm.msu.solicitudes.entidad.Solicitud;
import pe.edu.unmsm.msu.solicitudes.repositorio.SolicitudRepositorio;

/**
 * GET /solicitudes y GET /solicitudes/{id} según rol (tabla 18). El supervisor ve todas (RF07, P07);
 * el solicitante solo las propias (RF05, P05) y el técnico solo las asignadas (P08). Las pantallas
 * P05 y P08 pueden reutilizar este servicio.
 */
@Service
public class ListadoSolicitudesServicio {

    /** Valor del filtro de estado que agrupa Registrada, En evaluación, Asignada y En atención. */
    public static final String PENDIENTES = "PENDIENTES";
    /** Valor del filtro de responsable para los casos sin técnico. */
    public static final String SIN_ASIGNAR = "SIN_ASIGNAR";

    private static final Map<String, Sort> ORDENES = Map.of(
            "recientes", Sort.by(Sort.Order.desc("registradaEn"), Sort.Order.desc("id")),
            "antiguedad", Sort.by(Sort.Order.asc("registradaEn"), Sort.Order.asc("id")),
            "prioridad", Sort.by(Sort.Order.asc("prioridad.orden"), Sort.Order.asc("registradaEn"), Sort.Order.asc("id")),
            "vencimiento", Sort.by(Sort.Order.asc("limiteResolucion"), Sort.Order.asc("id")));

    private static final ZoneId LIMA = ZoneId.of("America/Lima");

    private final SolicitudRepositorio solicitudes;
    private final Clock reloj;

    public ListadoSolicitudesServicio(SolicitudRepositorio solicitudes, Clock reloj) {
        this.solicitudes = solicitudes;
        this.reloj = reloj;
    }

    /** desde y hasta son fechas de registro en America/Lima; hasta incluye todo ese día (sección 5.5). */
    public record Filtros(String estado, Long areaId, Long categoriaId, String prioridad, String responsable,
                          String q, LocalDate desde, LocalDate hasta, String orden, Integer pagina, Integer tamano) {
    }

    @Transactional(readOnly = true)
    public Pagina<SolicitudResumen> listar(Filtros f, UsuarioAutenticado sesion) {
        Permisos.exigirRol(sesion, Rol.SOLICITANTE, Rol.TECNICO, Rol.SUPERVISOR);
        List<ErrorCampo> errores = new ArrayList<>();

        String estado = vacio(f.estado()) ? null : f.estado().trim().toUpperCase(Locale.ROOT);
        boolean soloPendientes = PENDIENTES.equals(estado);
        if (estado != null && !soloPendientes && !Solicitud.PENDIENTES.contains(estado)
                && !List.of(Solicitud.RESUELTA, Solicitud.CERRADA, Solicitud.CANCELADA).contains(estado)) {
            errores.add(new ErrorCampo("estado", "Estado desconocido."));
        }
        String prioridad = vacio(f.prioridad()) ? null : f.prioridad().trim().toUpperCase(Locale.ROOT);
        if (prioridad != null && !MatrizPrioridad.PRIORIDADES.contains(prioridad)) {
            errores.add(new ErrorCampo("prioridad", "Prioridad desconocida."));
        }
        boolean sinAsignar = false;
        Long tecnicoId = null;
        if (!vacio(f.responsable())) {
            if (SIN_ASIGNAR.equalsIgnoreCase(f.responsable().trim())) {
                sinAsignar = true;
            } else {
                try {
                    tecnicoId = Long.valueOf(f.responsable().trim());
                } catch (NumberFormatException e) {
                    errores.add(new ErrorCampo("responsable", "Indique un técnico o SIN_ASIGNAR."));
                }
            }
        }
        String orden = vacio(f.orden()) ? "recientes" : f.orden().trim().toLowerCase(Locale.ROOT);
        if (!ORDENES.containsKey(orden)) {
            errores.add(new ErrorCampo("orden", "Orden no admitido: use recientes, antiguedad, prioridad o vencimiento."));
        }
        if (f.desde() != null && f.hasta() != null && f.hasta().isBefore(f.desde())) {
            errores.add(new ErrorCampo("hasta", "La fecha final no puede ser anterior a la inicial."));
        }
        if (!errores.isEmpty()) {
            throw ExcepcionApi.datosInvalidos(errores);
        }

        Instant desde = f.desde() == null ? null : f.desde().atStartOfDay(LIMA).toInstant();
        Instant hasta = f.hasta() == null ? null : f.hasta().plusDays(1).atStartOfDay(LIMA).toInstant();
        Long solicitanteId = Rol.SOLICITANTE.equals(sesion.rol()) ? sesion.id() : null;
        Long asignadoA = Rol.TECNICO.equals(sesion.rol()) ? sesion.id() : null;
        String texto = vacio(f.q()) ? null : f.q().trim().toLowerCase(Locale.ROOT);
        Instant ahora = Instant.now(reloj);
        return Pagina.de(solicitudes.buscar(solicitanteId, asignadoA, soloPendientes ? null : estado, soloPendientes,
                        f.areaId(), f.categoriaId(), prioridad, tecnicoId, sinAsignar, texto, desde, hasta,
                        Pagina.solicitud(f.pagina(), f.tamano(), ORDENES.get(orden))),
                s -> SolicitudResumen.de(s, ahora));
    }

    /** HU24 BDD 1: una solicitud ajena se deniega sin devolver datos. */
    @Transactional(readOnly = true)
    public SolicitudDetalle detalle(long id, UsuarioAutenticado sesion) {
        Permisos.exigirRol(sesion, Rol.SOLICITANTE, Rol.TECNICO, Rol.SUPERVISOR);
        Solicitud s = solicitudes.findConDetalleById(id)
                .orElseThrow(() -> ExcepcionApi.noEncontrado("La solicitud no existe."));
        Permisos.exigirAcceso(sesion, s);
        return SolicitudDetalle.de(s, Instant.now(reloj));
    }

    private static boolean vacio(String texto) {
        return texto == null || texto.isBlank();
    }
}
