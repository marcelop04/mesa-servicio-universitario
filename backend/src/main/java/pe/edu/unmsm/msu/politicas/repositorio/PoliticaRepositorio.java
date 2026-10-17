package pe.edu.unmsm.msu.politicas.repositorio;

import java.time.Instant;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import pe.edu.unmsm.msu.politicas.entidad.Politica;

public interface PoliticaRepositorio extends JpaRepository<Politica, Long> {

    /** La versión vigente para nuevas altas es la de mayor número ya vigente (tabla 15). */
    Optional<Politica> findFirstByVigenteDesdeLessThanEqualOrderByVersionDesc(Instant instante);
}
