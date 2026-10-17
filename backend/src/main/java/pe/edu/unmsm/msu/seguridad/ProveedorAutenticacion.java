package pe.edu.unmsm.msu.seguridad;

import org.springframework.security.authentication.AuthenticationProvider;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.transaction.annotation.Transactional;
import pe.edu.unmsm.msu.identidad.entidad.Usuario;
import pe.edu.unmsm.msu.identidad.repositorio.UsuarioRepositorio;

/**
 * Valida correo y contraseña. Responde siempre con el mismo error genérico (HU02) y compara
 * un hash aunque el correo no exista, para no revelar qué cuentas existen por el tiempo de respuesta.
 */
public class ProveedorAutenticacion implements AuthenticationProvider {

    private final UsuarioRepositorio usuarios;
    private final PasswordEncoder encoder;
    private final String hashFicticio;

    public ProveedorAutenticacion(UsuarioRepositorio usuarios, PasswordEncoder encoder) {
        this.usuarios = usuarios;
        this.encoder = encoder;
        this.hashFicticio = encoder.encode("contrasena-ficticia-para-igualar-tiempos");
    }

    @Override
    @Transactional(readOnly = true)
    public Authentication authenticate(Authentication solicitud) {
        String correo = Usuario.normalizarCorreo(solicitud.getName());
        String password = String.valueOf(solicitud.getCredentials());
        Usuario usuario = usuarios.findByCorreo(correo).orElse(null);
        boolean coincide = encoder.matches(password, usuario == null ? hashFicticio : usuario.getPasswordHash());
        if (usuario == null || !coincide || !usuario.isActivo()) {
            throw new BadCredentialsException("Correo o contraseña incorrectos.");
        }
        UsuarioAutenticado principal = UsuarioAutenticado.de(usuario);
        return UsernamePasswordAuthenticationToken.authenticated(principal, null, principal.autoridades());
    }

    @Override
    public boolean supports(Class<?> tipo) {
        return UsernamePasswordAuthenticationToken.class.isAssignableFrom(tipo);
    }
}
