package pe.edu.unmsm.msu.solicitudes.servicio;

import java.util.Map;

/**
 * Consultas que administración necesita sobre las solicitudes, sin depender de sus entidades.
 * El módulo de solicitudes (Alex y Marcelo) puede reemplazar la implementación JDBC
 * por una basada en sus repositorios JPA sin cambiar a quien la usa.
 */
public interface ConsultaSolicitudes {

    /** Solicitudes en Registrada, En evaluación, Asignada o En atención a cargo del técnico. */
    long contarPendientesDeTecnico(long tecnicoId);

    /** Carga pendiente de todos los técnicos con al menos un caso pendiente. */
    Map<Long, Long> pendientesPorTecnico();

    /** Indica si alguna solicitud usa la categoría (en ese caso no puede cambiar de área). */
    boolean categoriaUsada(long categoriaId);
}
