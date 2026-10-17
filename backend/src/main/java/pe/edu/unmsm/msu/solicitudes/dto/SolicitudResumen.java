package pe.edu.unmsm.msu.solicitudes.dto;

import java.time.Instant;
import pe.edu.unmsm.msu.solicitudes.entidad.Solicitud;
import pe.edu.unmsm.msu.solicitudes.servicio.NivelPlazo;

/** Fila de los listados (P05, P07, P08). Las fechas se devuelven en UTC; la interfaz las muestra en Lima. */
public record SolicitudResumen(Long id, String codigo, String descripcion, Long categoriaId, String categoriaNombre,
                               Long areaId, String areaNombre, String ubicacionNombre, String prioridadCodigo,
                               String prioridadNombre, String estadoCodigo, String estadoNombre, Long tecnicoId,
                               String tecnicoNombre, String solicitanteNombre, Instant registradaEn,
                               Instant limiteAtencion, Instant limiteResolucion, String nivelPlazo, int version) {

    public static SolicitudResumen de(Solicitud s, Instant ahora) {
        return new SolicitudResumen(s.getId(), s.getCodigo(), s.getDescripcion(), s.getCategoria().getId(),
                s.getCategoria().getNombre(), s.getArea().getId(), s.getArea().getNombre(),
                SolicitudDetalle.ubicacion(s), s.getPrioridadCodigo(), s.getPrioridad().getNombreVisible(),
                s.getEstadoCodigo(), s.getEstado().getNombreVisible(),
                s.getTecnico() == null ? null : s.getTecnico().getId(),
                s.getTecnico() == null ? null : s.getTecnico().getNombre(), s.getSolicitante().getNombre(),
                s.getRegistradaEn(), s.getLimiteAtencion(), s.getLimiteResolucion(), NivelPlazo.de(s, ahora),
                s.getVersion());
    }
}
