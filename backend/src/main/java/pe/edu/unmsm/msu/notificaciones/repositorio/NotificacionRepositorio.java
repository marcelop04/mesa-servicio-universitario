package pe.edu.unmsm.msu.notificaciones.repositorio;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import pe.edu.unmsm.msu.notificaciones.entidad.Notificacion;

public interface NotificacionRepositorio extends JpaRepository<Notificacion, Long> {

    boolean existsByClaveEvento(String claveEvento);

    List<Notificacion> findByUsuarioIdOrderByCreadaEnDesc(Long usuarioId);
}
