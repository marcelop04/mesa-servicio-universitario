package pe.edu.unmsm.msu.solicitudes.dto;

/** RF10: técnico activo con su carga pendiente, como apoyo a la asignación manual. */
public record TecnicoCarga(Long id, String nombre, Long areaId, String areaNombre, long pendientes) {
}
