package pe.edu.unmsm.msu.solicitudes.repositorio;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import pe.edu.unmsm.msu.solicitudes.entidad.Comentario;

public interface ComentarioRepositorio extends JpaRepository<Comentario, Long> {

    List<Comentario> findBySolicitudIdOrderByCreadoEnAscIdAsc(Long solicitudId);
}
