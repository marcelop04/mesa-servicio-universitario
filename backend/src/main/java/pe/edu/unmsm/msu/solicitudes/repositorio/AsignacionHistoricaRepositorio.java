package pe.edu.unmsm.msu.solicitudes.repositorio;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import pe.edu.unmsm.msu.solicitudes.entidad.AsignacionHistorica;

public interface AsignacionHistoricaRepositorio extends JpaRepository<AsignacionHistorica, Long> {

    List<AsignacionHistorica> findBySolicitudIdOrderByCreadaEnAscIdAsc(Long solicitudId);
}
