package pe.edu.unmsm.msu.seguridad;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.time.Clock;
import java.time.Instant;
import org.springframework.security.core.Authentication;
import org.springframework.security.web.authentication.logout.LogoutHandler;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import pe.edu.unmsm.msu.identidad.entidad.RevocacionSesion;
import pe.edu.unmsm.msu.identidad.repositorio.RevocacionSesionRepositorio;
import pe.edu.unmsm.msu.identidad.repositorio.UsuarioRepositorio;

/**
 * HU02 · Cerrar sesión: guarda el identificador del token (jti) como revocado hasta que expire y
 * borra la cookie. Así un token copiado antes del cierre ya no autentica.
 */
@Component
public class RevocadorSesion implements LogoutHandler {

    private final TokenJwt tokens;
    private final CookieSesion cookie;
    private final RevocacionSesionRepositorio revocaciones;
    private final UsuarioRepositorio usuarios;
    private final Clock reloj;

    public RevocadorSesion(TokenJwt tokens, CookieSesion cookie, RevocacionSesionRepositorio revocaciones,
                           UsuarioRepositorio usuarios, Clock reloj) {
        this.tokens = tokens;
        this.cookie = cookie;
        this.revocaciones = revocaciones;
        this.usuarios = usuarios;
        this.reloj = reloj;
    }

    @Override
    @Transactional
    public void logout(HttpServletRequest req, HttpServletResponse res, Authentication auth) {
        tokens.verificar(CookieSesion.leer(req))
                .filter(r -> !revocaciones.existsByTokenId(r.jti()) && usuarios.existsById(r.usuarioId()))
                .ifPresent(r -> revocaciones.save(new RevocacionSesion(r.jti(), usuarios.getReferenceById(r.usuarioId()),
                        Instant.now(reloj), r.expira())));
        cookie.borrar(res);
    }
}
