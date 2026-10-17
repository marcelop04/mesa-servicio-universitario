package pe.edu.unmsm.msu.solicitudes.dto;

import java.time.Instant;
import pe.edu.unmsm.msu.solicitudes.entidad.Evidencia;

/** Datos de una evidencia; nunca expone la ruta privada. El archivo se descarga por {@code url}. */
public record EvidenciaVista(Long id, String nombreOriginal, String tipo, int bytes, String autorNombre,
                             Instant creadaEn, String url) {

    public static EvidenciaVista de(Evidencia e) {
        return new EvidenciaVista(e.getId(), e.getNombreOriginal(), e.getTipoReal(), e.getBytes(),
                e.getAutor().getNombre(), e.getCreadaEn(), "/api/v1/evidencias/" + e.getId() + "/archivo");
    }
}
