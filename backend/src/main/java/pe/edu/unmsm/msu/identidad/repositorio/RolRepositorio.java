package pe.edu.unmsm.msu.identidad.repositorio;

import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import pe.edu.unmsm.msu.identidad.entidad.Rol;

public interface RolRepositorio extends JpaRepository<Rol, Long> {

    Optional<Rol> findByCodigo(String codigo);
}
