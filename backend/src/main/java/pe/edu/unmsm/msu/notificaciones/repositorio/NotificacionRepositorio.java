package pe.edu.unmsm.msu.notificaciones.repositorio;

import java.time.Instant;
import java.util.List;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import pe.edu.unmsm.msu.notificaciones.entidad.Notificacion;

public interface NotificacionRepositorio extends JpaRepository<Notificacion, Long> {

    boolean existsByClaveEvento(String claveEvento);

    List<Notificacion> findByUsuarioIdOrderByCreadaEnDesc(Long usuarioId);

    @EntityGraph(attributePaths = {"solicitud"})
    Page<Notificacion> findByUsuarioId(Long usuarioId, Pageable pageable);

    @EntityGraph(attributePaths = {"solicitud"})
    Page<Notificacion> findByUsuarioIdAndLeidaEnIsNull(Long usuarioId, Pageable pageable);

    long countByUsuarioIdAndLeidaEnIsNull(Long usuarioId);

    @Modifying
    @Query("update Notificacion n set n.leidaEn = :ahora where n.usuario.id = :usuarioId and n.leidaEn is null")
    int marcarTodasLeidas(@Param("usuarioId") Long usuarioId, @Param("ahora") Instant ahora);
}
