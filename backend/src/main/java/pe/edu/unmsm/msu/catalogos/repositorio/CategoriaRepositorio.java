package pe.edu.unmsm.msu.catalogos.repositorio;

import org.springframework.data.jpa.repository.JpaRepository;
import pe.edu.unmsm.msu.catalogos.entidad.Categoria;

public interface CategoriaRepositorio extends JpaRepository<Categoria, Long> {

    boolean existsByAreaIdAndNombreIgnoreCase(Long areaId, String nombre);

    boolean existsByAreaIdAndNombreIgnoreCaseAndIdNot(Long areaId, String nombre, Long id);
}
