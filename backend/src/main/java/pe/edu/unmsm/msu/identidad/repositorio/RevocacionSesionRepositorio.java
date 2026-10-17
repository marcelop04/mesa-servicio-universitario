package pe.edu.unmsm.msu.identidad.repositorio;

import org.springframework.data.jpa.repository.JpaRepository;
import pe.edu.unmsm.msu.identidad.entidad.RevocacionSesion;

public interface RevocacionSesionRepositorio extends JpaRepository<RevocacionSesion, Long> {

    boolean existsByTokenId(String tokenId);
}
