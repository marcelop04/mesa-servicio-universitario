package pe.edu.unmsm.msu.solicitudes.repositorio;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import pe.edu.unmsm.msu.solicitudes.entidad.Solicitud;

public interface SolicitudRepositorio extends JpaRepository<Solicitud, Long> {

    Optional<Solicitud> findByCodigoIgnoreCase(String codigo);

    /** HU12: Resueltas cuya última resolución es anterior al límite (ventana de 72 horas vencida). */
    @Query("select s.id from Solicitud s where s.estado.codigo = 'RESUELTA' and s.ultimaResolucionEn <= :limite")
    List<Long> idsResueltasAntesDe(@Param("limite") Instant limite);

    @EntityGraph(attributePaths = {"categoria", "area", "ubicacion", "prioridad", "estado", "tecnico", "solicitante",
            "politica", "duplicadaDe"})
    Optional<Solicitud> findConDetalleById(Long id);

    /**
     * Listado según rol y filtros (RF05, RF07). {@code solicitanteId} y {@code asignadoA} limitan el
     * alcance por rol; el resto son filtros de la interfaz. {@code soloPendientes} agrupa los cuatro
     * estados previos a Resuelta y {@code sinAsignar} los casos sin responsable.
     */
    @EntityGraph(attributePaths = {"categoria", "area", "ubicacion", "prioridad", "estado", "tecnico", "solicitante"})
    @Query(value = """
            select s from Solicitud s
            where (:solicitanteId is null or s.solicitante.id = :solicitanteId)
              and (:asignadoA is null or s.tecnico.id = :asignadoA)
              and (:estado is null or s.estado.codigo = :estado)
              and (:soloPendientes = false
                   or s.estado.codigo in ('REGISTRADA', 'EN_EVALUACION', 'ASIGNADA', 'EN_ATENCION'))
              and (:areaId is null or s.area.id = :areaId)
              and (:categoriaId is null or s.categoria.id = :categoriaId)
              and (:prioridad is null or s.prioridad.codigo = :prioridad)
              and (:tecnicoId is null or s.tecnico.id = :tecnicoId)
              and (:sinAsignar = false or s.tecnico is null)
              and (:desde is null or s.registradaEn >= :desde)
              and (:hasta is null or s.registradaEn < :hasta)
              and (:texto is null
                   or lower(s.codigo) like concat('%', :texto, '%')
                   or lower(s.descripcion) like concat('%', :texto, '%'))
            """,
            countQuery = """
            select count(s) from Solicitud s
            where (:solicitanteId is null or s.solicitante.id = :solicitanteId)
              and (:asignadoA is null or s.tecnico.id = :asignadoA)
              and (:estado is null or s.estado.codigo = :estado)
              and (:soloPendientes = false
                   or s.estado.codigo in ('REGISTRADA', 'EN_EVALUACION', 'ASIGNADA', 'EN_ATENCION'))
              and (:areaId is null or s.area.id = :areaId)
              and (:categoriaId is null or s.categoria.id = :categoriaId)
              and (:prioridad is null or s.prioridad.codigo = :prioridad)
              and (:tecnicoId is null or s.tecnico.id = :tecnicoId)
              and (:sinAsignar = false or s.tecnico is null)
              and (:desde is null or s.registradaEn >= :desde)
              and (:hasta is null or s.registradaEn < :hasta)
              and (:texto is null
                   or lower(s.codigo) like concat('%', :texto, '%')
                   or lower(s.descripcion) like concat('%', :texto, '%'))
            """)
    Page<Solicitud> buscar(@Param("solicitanteId") Long solicitanteId, @Param("asignadoA") Long asignadoA,
                           @Param("estado") String estado, @Param("soloPendientes") boolean soloPendientes,
                           @Param("areaId") Long areaId, @Param("categoriaId") Long categoriaId,
                           @Param("prioridad") String prioridad, @Param("tecnicoId") Long tecnicoId,
                           @Param("sinAsignar") boolean sinAsignar, @Param("texto") String texto,
                           @Param("desde") Instant desde, @Param("hasta") Instant hasta, Pageable pageable);
}
