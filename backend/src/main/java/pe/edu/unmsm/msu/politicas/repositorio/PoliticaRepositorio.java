package pe.edu.unmsm.msu.politicas.repositorio;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import pe.edu.unmsm.msu.politicas.entidad.Politica;

public interface PoliticaRepositorio extends JpaRepository<Politica, Long> {

    /** La versión vigente para nuevas altas es la de mayor número ya vigente (tabla 15). */
    Optional<Politica> findFirstByVigenteDesdeLessThanEqualOrderByVersionDesc(Instant instante);

    /** HU22 · Historial de versiones, la más reciente primero. */
    @Query("SELECT p FROM Politica p JOIN FETCH p.publicadaPor ORDER BY p.version DESC")
    List<Politica> historial();

    @Query("SELECT COALESCE(MAX(p.version), 0) FROM Politica p")
    int ultimaVersion();

    /** Solicitudes que guardaron cada versión (RN04): filas [politica_id, cantidad]. */
    @Query("SELECT s.politica.id, COUNT(s) FROM Solicitud s GROUP BY s.politica.id")
    List<Object[]> solicitudesPorPolitica();
}
