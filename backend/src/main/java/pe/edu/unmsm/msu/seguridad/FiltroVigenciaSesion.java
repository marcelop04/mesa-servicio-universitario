package pe.edu.unmsm.msu.seguridad;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;
import java.io.IOException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.filter.OncePerRequestFilter;
import pe.edu.unmsm.msu.identidad.repositorio.UsuarioRepositorio;

/**
 * Revoca la sesión si la cuenta fue desactivada o cambió su autorización (rol o área)
 * después de iniciar sesión (sección 3.1 y HU20: un cambio de rol invalida la autorización anterior).
 */
public class FiltroVigenciaSesion extends OncePerRequestFilter {

    private final UsuarioRepositorio usuarios;

    public FiltroVigenciaSesion(UsuarioRepositorio usuarios) {
        this.usuarios = usuarios;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest req, HttpServletResponse res, FilterChain cadena)
            throws ServletException, IOException {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.getPrincipal() instanceof UsuarioAutenticado sesion) {
            boolean vigente = usuarios.findById(sesion.id())
                    .filter(u -> u.isActivo() && u.getVersionAutorizacion() == sesion.versionAutorizacion())
                    .isPresent();
            if (!vigente) {
                SecurityContextHolder.clearContext();
                HttpSession session = req.getSession(false);
                if (session != null) {
                    session.invalidate();
                }
            }
        }
        cadena.doFilter(req, res);
    }
}
