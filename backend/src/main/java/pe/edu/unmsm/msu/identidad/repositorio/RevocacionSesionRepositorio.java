package pe.edu.unmsm.msu.identidad.repositorio;

import java.time.Instant;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import pe.edu.unmsm.msu.identidad.entidad.RevocacionSesion;

public interface RevocacionSesionRepositorio extends JpaRepository<RevocacionSesion, Long> {

    boolean existsByTokenId(String tokenId);

    /** HU02 · Borra revocaciones de tokens que ya vencieron: el filtro JWT los rechaza por su fecha. */
    @Modifying
    @Query("DELETE FROM RevocacionSesion r WHERE r.expiraEn < :instante")
    int borrarVencidasAntesDe(@Param("instante") Instant instante);
}
