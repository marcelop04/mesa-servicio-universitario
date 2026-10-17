package pe.edu.unmsm.msu.catalogos.repositorio;

import org.springframework.data.jpa.repository.JpaRepository;
import pe.edu.unmsm.msu.catalogos.entidad.Ubicacion;

public interface UbicacionRepositorio extends JpaRepository<Ubicacion, Long> {

    boolean existsByEdificioIgnoreCaseAndAmbienteIgnoreCase(String edificio, String ambiente);

    boolean existsByEdificioIgnoreCaseAndAmbienteIgnoreCaseAndIdNot(String edificio, String ambiente, Long id);
}
