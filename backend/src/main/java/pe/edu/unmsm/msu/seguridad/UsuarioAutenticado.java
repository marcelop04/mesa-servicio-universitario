package pe.edu.unmsm.msu.seguridad;

import java.io.Serializable;
import java.util.List;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import pe.edu.unmsm.msu.identidad.entidad.Usuario;

/** Identidad guardada en la sesión. No contiene la contraseña ni su hash. */
public record UsuarioAutenticado(long id, String correo, String nombre, String rol, int versionAutorizacion)
        implements Serializable {

    public static UsuarioAutenticado de(Usuario u) {
        return new UsuarioAutenticado(u.getId(), u.getCorreo(), u.getNombre(), u.getRol().getCodigo(),
                u.getVersionAutorizacion());
    }

    public List<GrantedAuthority> autoridades() {
        return List.of(new SimpleGrantedAuthority("ROLE_" + rol));
    }
}
