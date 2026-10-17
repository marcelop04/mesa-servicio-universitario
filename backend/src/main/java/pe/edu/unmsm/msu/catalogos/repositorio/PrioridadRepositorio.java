package pe.edu.unmsm.msu.catalogos.repositorio;

import org.springframework.data.jpa.repository.JpaRepository;
import pe.edu.unmsm.msu.catalogos.entidad.Prioridad;

public interface PrioridadRepositorio extends JpaRepository<Prioridad, String> {
}
