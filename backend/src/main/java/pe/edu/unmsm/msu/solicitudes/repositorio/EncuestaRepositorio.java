package pe.edu.unmsm.msu.solicitudes.repositorio;

import org.springframework.data.jpa.repository.JpaRepository;
import pe.edu.unmsm.msu.solicitudes.entidad.Encuesta;

public interface EncuestaRepositorio extends JpaRepository<Encuesta, Long> {

    boolean existsBySolicitudId(Long solicitudId);
}
