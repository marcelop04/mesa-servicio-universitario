package pe.edu.unmsm.msu.solicitudes.repositorio;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import pe.edu.unmsm.msu.solicitudes.entidad.EventoOperativo;

public interface EventoOperativoRepositorio extends JpaRepository<EventoOperativo, Long> {

    List<EventoOperativo> findBySolicitudIdOrderByCreadoEnAscIdAsc(Long solicitudId);
}
