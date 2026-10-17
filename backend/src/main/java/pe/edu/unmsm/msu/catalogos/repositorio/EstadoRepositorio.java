package pe.edu.unmsm.msu.catalogos.repositorio;

import org.springframework.data.jpa.repository.JpaRepository;
import pe.edu.unmsm.msu.catalogos.entidad.Estado;

public interface EstadoRepositorio extends JpaRepository<Estado, String> {
}
