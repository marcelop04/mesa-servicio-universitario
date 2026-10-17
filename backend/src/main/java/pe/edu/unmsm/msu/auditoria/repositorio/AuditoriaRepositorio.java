package pe.edu.unmsm.msu.auditoria.repositorio;

import org.springframework.data.jpa.repository.JpaRepository;
import pe.edu.unmsm.msu.auditoria.entidad.Auditoria;

public interface AuditoriaRepositorio extends JpaRepository<Auditoria, Long> {
}
