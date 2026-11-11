package pe.edu.unmsm.msu.auditoria.repositorio;

import java.time.Instant;
import java.util.List;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import pe.edu.unmsm.msu.auditoria.entidad.Auditoria;

public interface AuditoriaRepositorio extends JpaRepository<Auditoria, Long> {

    /** HU23 · Filtros opcionales; {@code texto} ya viene en minúsculas y con comodines. */
    @Query(value = """
            SELECT a FROM Auditoria a LEFT JOIN FETCH a.actor u
            WHERE (:accion IS NULL OR a.accion = :accion)
              AND (:entidad IS NULL OR a.entidad = :entidad)
              AND (:texto IS NULL OR LOWER(u.nombre) LIKE :texto OR LOWER(u.correo) LIKE :texto)
              AND (:desde IS NULL OR a.creadaEn >= :desde)
              AND (:hasta IS NULL OR a.creadaEn < :hasta)""",
            countQuery = """
            SELECT COUNT(a) FROM Auditoria a LEFT JOIN a.actor u
            WHERE (:accion IS NULL OR a.accion = :accion)
              AND (:entidad IS NULL OR a.entidad = :entidad)
              AND (:texto IS NULL OR LOWER(u.nombre) LIKE :texto OR LOWER(u.correo) LIKE :texto)
              AND (:desde IS NULL OR a.creadaEn >= :desde)
              AND (:hasta IS NULL OR a.creadaEn < :hasta)""")
    Page<Auditoria> buscar(@Param("accion") String accion, @Param("entidad") String entidad,
                           @Param("texto") String texto, @Param("desde") Instant desde,
                           @Param("hasta") Instant hasta, Pageable pagina);

    @Query("SELECT DISTINCT a.accion FROM Auditoria a ORDER BY a.accion")
    List<String> acciones();

    @Query("SELECT DISTINCT a.entidad FROM Auditoria a ORDER BY a.entidad")
    List<String> entidades();
}
