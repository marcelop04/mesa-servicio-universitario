package pe.edu.unmsm.msu.solicitudes.dto;

import java.time.Instant;
import java.util.Map;
import pe.edu.unmsm.msu.solicitudes.entidad.Solicitud;
import pe.edu.unmsm.msu.solicitudes.servicio.NivelPlazo;

/**
 * Detalle de una solicitud autorizada (RF06). Incluye la matriz aplicada para que la interfaz
 * muestre el recálculo de plazos antes de confirmar un cambio de prioridad, y la versión que
 * deben devolver todas las acciones (HU24).
 */
public record SolicitudDetalle(Long id, String codigo, Long solicitanteId, String solicitanteNombre,
                               Long categoriaId, String categoriaNombre, Long areaId, String areaNombre,
                               Long ubicacionId, String ubicacionNombre, String referencia, String descripcion,
                               String impacto, String urgencia, String prioridadCodigo, String prioridadNombre,
                               String estadoCodigo, String estadoNombre, Long tecnicoId, String tecnicoNombre,
                               String duplicadaDeCodigo, Instant registradaEn, Instant primeraAtencionEn,
                               Instant ultimaResolucionEn, Instant cerradaEn, Instant canceladaEn,
                               Instant limiteAtencion, Instant limiteResolucion, String nivelPlazo,
                               int politicaVersion, Map<String, Map<String, Integer>> matrizAplicada,
                               int versionFechas, int version) {

    public static SolicitudDetalle de(Solicitud s, Instant ahora) {
        return new SolicitudDetalle(s.getId(), s.getCodigo(), s.getSolicitante().getId(),
                s.getSolicitante().getNombre(), s.getCategoria().getId(), s.getCategoria().getNombre(),
                s.getArea().getId(), s.getArea().getNombre(), s.getUbicacion().getId(), ubicacion(s),
                s.getReferencia(), s.getDescripcion(), s.getImpacto(), s.getUrgencia(), s.getPrioridadCodigo(),
                s.getPrioridad().getNombreVisible(), s.getEstadoCodigo(), s.getEstado().getNombreVisible(),
                s.getTecnico() == null ? null : s.getTecnico().getId(),
                s.getTecnico() == null ? null : s.getTecnico().getNombre(),
                s.getDuplicadaDe() == null ? null : s.getDuplicadaDe().getCodigo(), s.getRegistradaEn(),
                s.getPrimeraAtencionEn(), s.getUltimaResolucionEn(), s.getCerradaEn(), s.getCanceladaEn(),
                s.getLimiteAtencion(), s.getLimiteResolucion(), NivelPlazo.de(s, ahora),
                s.getPolitica().getVersion(), s.getMatrizAplicada(), s.getVersionFechas(), s.getVersion());
    }

    static String ubicacion(Solicitud s) {
        return s.getUbicacion().getEdificio() + " · " + s.getUbicacion().getAmbiente();
    }
}
