package pe.edu.unmsm.msu.seguridad;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import java.util.List;
import java.util.Map;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.context.SecurityContextRepository;
import org.springframework.security.web.csrf.CsrfToken;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;
import pe.edu.unmsm.msu.comun.error.ApiError;
import pe.edu.unmsm.msu.comun.web.FiltroCorrelacion;
import pe.edu.unmsm.msu.identidad.entidad.Usuario;
import pe.edu.unmsm.msu.identidad.repositorio.UsuarioRepositorio;

/**
 * PROVISIONAL hasta DV04 (David): inicio de sesión mínimo para probar las pantallas por rol.
 * Mantiene las rutas y respuestas de la tabla 18 del informe.
 */
@RestController
@Tag(name = "Sesión (provisional)", description = "Se reemplaza por la implementación con JWT de DV04")
public class AuthControlador {

    public record Credenciales(@NotBlank(message = "Ingrese el correo.") String correo,
                               @NotBlank(message = "Ingrese la contraseña.") String password) {
    }

    public record Perfil(long id, String nombre, String correo, String vinculo, String rol, String rolNombre,
                         Long areaId, String areaNombre) {

        static Perfil de(Usuario u) {
            return new Perfil(u.getId(), u.getNombre(), u.getCorreo(), u.getVinculo(), u.getRol().getCodigo(),
                    u.getRol().getNombreVisible(), u.getArea() == null ? null : u.getArea().getId(),
                    u.getArea() == null ? null : u.getArea().getNombre());
        }
    }

    private final AuthenticationManager autenticacion;
    private final SecurityContextRepository contextos;
    private final UsuarioRepositorio usuarios;

    public AuthControlador(AuthenticationManager autenticacion, SecurityContextRepository contextos,
                           UsuarioRepositorio usuarios) {
        this.autenticacion = autenticacion;
        this.contextos = contextos;
        this.usuarios = usuarios;
    }

    @GetMapping("/api/v1/auth/csrf")
    @Operation(summary = "Entrega el token CSRF en la cookie XSRF-TOKEN")
    public Map<String, String> csrf(CsrfToken token) {
        return Map.of("cabecera", token.getHeaderName());
    }

    @PostMapping("/api/v1/auth/login")
    @Operation(summary = "Iniciar sesión", description = "Credenciales inválidas o cuenta desactivada: 401 genérico.")
    public ResponseEntity<?> login(@Valid @RequestBody Credenciales credenciales, HttpServletRequest req,
                                   HttpServletResponse res) {
        Authentication auth;
        try {
            auth = autenticacion.authenticate(UsernamePasswordAuthenticationToken.unauthenticated(
                    credenciales.correo(), credenciales.password()));
        } catch (BadCredentialsException e) {
            return ResponseEntity.status(401).body(new ApiError("CREDENCIALES_INVALIDAS",
                    "Correo o contraseña incorrectos.", List.of(), FiltroCorrelacion.idDe(req)));
        }
        if (req.getSession(false) != null) {
            req.changeSessionId();
        }
        SecurityContext contexto = SecurityContextHolder.createEmptyContext();
        contexto.setAuthentication(auth);
        SecurityContextHolder.setContext(contexto);
        contextos.saveContext(contexto, req, res);
        return ResponseEntity.ok(perfilDe((UsuarioAutenticado) auth.getPrincipal()));
    }

    @GetMapping("/api/v1/me")
    @Operation(summary = "Perfil de la sesión actual")
    public Perfil me(@AuthenticationPrincipal UsuarioAutenticado sesion) {
        return perfilDe(sesion);
    }

    private Perfil perfilDe(UsuarioAutenticado sesion) {
        return usuarios.findById(sesion.id()).map(Perfil::de).orElseThrow();
    }
}
