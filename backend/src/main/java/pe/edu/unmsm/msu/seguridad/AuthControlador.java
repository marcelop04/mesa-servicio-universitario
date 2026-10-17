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
import org.springframework.security.web.csrf.CsrfToken;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;
import pe.edu.unmsm.msu.comun.error.ApiError;
import pe.edu.unmsm.msu.comun.web.FiltroCorrelacion;
import pe.edu.unmsm.msu.identidad.dto.Perfil;
import pe.edu.unmsm.msu.identidad.entidad.Usuario;
import pe.edu.unmsm.msu.identidad.repositorio.UsuarioRepositorio;

/**
 * DV04 · HU02 Iniciar y cerrar sesión con JWT en cookie HttpOnly (tabla 18).
 * El cierre de sesión lo atiende Spring Security en POST /auth/logout con {@link RevocadorSesion}.
 */
@RestController
@Tag(name = "Sesión", description = "Inicio de sesión con JWT en cookie HttpOnly y token CSRF")
public class AuthControlador {

    public record Credenciales(@NotBlank(message = "Ingrese el correo.") String correo,
                               @NotBlank(message = "Ingrese la contraseña.") String password) {
    }

    private final AuthenticationManager autenticacion;
    private final UsuarioRepositorio usuarios;
    private final TokenJwt tokens;
    private final CookieSesion cookie;

    public AuthControlador(AuthenticationManager autenticacion, UsuarioRepositorio usuarios, TokenJwt tokens,
                           CookieSesion cookie) {
        this.autenticacion = autenticacion;
        this.usuarios = usuarios;
        this.tokens = tokens;
        this.cookie = cookie;
    }

    @GetMapping("/api/v1/auth/csrf")
    @Operation(summary = "Entrega el token CSRF en la cookie XSRF-TOKEN")
    public Map<String, String> csrf(CsrfToken token) {
        return Map.of("cabecera", token.getHeaderName());
    }

    @PostMapping("/api/v1/auth/login")
    @Operation(summary = "Iniciar sesión (HU02)",
            description = "Devuelve el perfil y la cookie HttpOnly MSU_SESION con el JWT (2 horas). Credenciales "
                    + "inválidas o cuenta desactivada: 401 con mensaje genérico.")
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
        Usuario usuario = usuarios.findById(((UsuarioAutenticado) auth.getPrincipal()).id()).orElseThrow();
        cookie.escribir(res, tokens.emitir(usuario), tokens.getDuracion());
        return ResponseEntity.ok(Perfil.de(usuario));
    }

    @GetMapping("/api/v1/me")
    @Operation(summary = "Perfil de la sesión actual (HU03)")
    public Perfil me(@AuthenticationPrincipal UsuarioAutenticado sesion) {
        return usuarios.findById(sesion.id()).map(Perfil::de).orElseThrow();
    }
}
