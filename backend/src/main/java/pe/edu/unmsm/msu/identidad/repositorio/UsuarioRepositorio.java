package pe.edu.unmsm.msu.identidad.repositorio;

import java.util.Optional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import pe.edu.unmsm.msu.identidad.entidad.Usuario;

public interface UsuarioRepositorio extends JpaRepository<Usuario, Long> {

    Optional<Usuario> findByCorreo(String correo);

    boolean existsByCorreo(String correo);

    @Query("""
            select u from Usuario u
            where (:rol is null or u.rol.codigo = :rol)
              and (:activo is null or u.activo = :activo)
              and (:texto is null
                   or lower(u.nombre) like concat('%', :texto, '%')
                   or u.correo like concat('%', :texto, '%'))
            """)
    Page<Usuario> buscar(@Param("rol") String rol, @Param("activo") Boolean activo,
                         @Param("texto") String texto, Pageable pageable);
}
