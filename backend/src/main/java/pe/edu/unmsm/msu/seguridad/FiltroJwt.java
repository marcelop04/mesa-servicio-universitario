package pe.edu.unmsm.msu.seguridad;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.filter.OncePerRequestFilter;
import pe.edu.unmsm.msu.identidad.repositorio.RevocacionSesionRepositorio;
import pe.edu.unmsm.msu.identidad.repositorio.UsuarioRepositorio;

/**
 * DV04 · Autentica cada petición con el JWT de la cookie HttpOnly. El token se rechaza si la firma o
 * la vigencia no son válidas, si se revocó al cerrar sesión, si la cuenta está desactivada o si su
 * versión de autorización cambió (cambio de rol, de área o de contraseña; sección 3.1 y HU20).
 */
public class FiltroJwt extends OncePerRequestFilter {

    private final TokenJwt tokens;
    private final UsuarioRepositorio usuarios;
    private final RevocacionSesionRepositorio revocaciones;

    public FiltroJwt(TokenJwt tokens, UsuarioRepositorio usuarios, RevocacionSesionRepositorio revocaciones) {
        this.tokens = tokens;
        this.usuarios = usuarios;
        this.revocaciones = revocaciones;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest req, HttpServletResponse res, FilterChain cadena)
            throws ServletException, IOException {
        tokens.verificar(CookieSesion.leer(req))
                .filter(r -> !revocaciones.existsByTokenId(r.jti()))
                .flatMap(r -> usuarios.findById(r.usuarioId())
                        .filter(u -> u.isActivo() && u.getVersionAutorizacion() == r.version()))
                .ifPresent(u -> {
                    UsuarioAutenticado principal = UsuarioAutenticado.de(u);
                    SecurityContext contexto = SecurityContextHolder.createEmptyContext();
                    contexto.setAuthentication(UsernamePasswordAuthenticationToken.authenticated(principal, null,
                            principal.autoridades()));
                    SecurityContextHolder.setContext(contexto);
                });
        cadena.doFilter(req, res);
    }
}
