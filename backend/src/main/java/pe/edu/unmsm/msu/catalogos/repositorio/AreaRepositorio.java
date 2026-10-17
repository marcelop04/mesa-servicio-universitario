package pe.edu.unmsm.msu.catalogos.repositorio;

import org.springframework.data.jpa.repository.JpaRepository;
import pe.edu.unmsm.msu.catalogos.entidad.Area;

public interface AreaRepositorio extends JpaRepository<Area, Long> {

    boolean existsByNombreIgnoreCase(String nombre);

    boolean existsByNombreIgnoreCaseAndIdNot(String nombre, Long id);
}
