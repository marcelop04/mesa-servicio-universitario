package pe.edu.unmsm.msu.identidad.controlador;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import java.net.URI;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;
import pe.edu.unmsm.msu.identidad.dto.CambioPassword;
import pe.edu.unmsm.msu.identidad.dto.CambioPerfil;
import pe.edu.unmsm.msu.identidad.dto.Perfil;
import pe.edu.unmsm.msu.identidad.dto.RegistroCuenta;
import pe.edu.unmsm.msu.identidad.entidad.Usuario;
import pe.edu.unmsm.msu.identidad.servicio.CuentaServicio;
import pe.edu.unmsm.msu.seguridad.CookieSesion;
import pe.edu.unmsm.msu.seguridad.TokenJwt;
import pe.edu.unmsm.msu.seguridad.UsuarioAutenticado;

/** DV03 y DV05 · Registro público, perfil y cambio de contraseña (HU01, HU03). */
@RestController
@Tag(name = "Cuenta", description = "Registro de solicitantes, perfil y contraseña")
public class CuentaControlador {

    private final CuentaServicio servicio;
    private final TokenJwt tokens;
    private final CookieSesion cookie;

    public CuentaControlador(CuentaServicio servicio, TokenJwt tokens, CookieSesion cookie) {
        this.servicio = servicio;
        this.tokens = tokens;
        this.cookie = cookie;
    }

    @PostMapping("/api/v1/auth/registro")
    @Operation(summary = "Registrar una cuenta de solicitante (HU01)",
            description = "Público. Nombre de 2 a 100, correo único, contraseña de 10 a 64 y vínculo ESTUDIANTE, DOCENTE "
                    + "o ADMINISTRATIVO. El rol siempre es Solicitante. Correo duplicado: 409 CORREO_DUPLICADO.")
    public ResponseEntity<Perfil> registrar(@Valid @RequestBody RegistroCuenta datos) {
        Perfil creado = servicio.registrar(datos);
        return ResponseEntity.created(URI.create("/api/v1/me")).body(creado);
    }

    @PutMapping("/api/v1/me")
    @Operation(summary = "Cambiar el nombre del perfil (HU03)", description = "Otros campos, como el rol, se ignoran.")
    public Perfil cambiarPerfil(@Valid @RequestBody CambioPerfil datos, @AuthenticationPrincipal UsuarioAutenticado sesion) {
        return servicio.cambiarPerfil(sesion.id(), datos);
    }

    @PutMapping("/api/v1/me/password")
    @Operation(summary = "Cambiar la contraseña (HU03)",
            description = "Exige la contraseña actual. Revoca las demás sesiones y renueva la cookie de la sesión actual. 204.")
    public ResponseEntity<Void> cambiarPassword(@Valid @RequestBody CambioPassword datos,
                                                @AuthenticationPrincipal UsuarioAutenticado sesion,
                                                HttpServletResponse res) {
        Usuario u = servicio.cambiarPassword(sesion.id(), datos);
        cookie.escribir(res, tokens.emitir(u), tokens.getDuracion());
        return ResponseEntity.noContent().build();
    }
}
