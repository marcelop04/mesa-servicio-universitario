package pe.edu.unmsm.msu.seguridad;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.util.function.Supplier;
import org.springframework.security.web.csrf.CsrfToken;
import org.springframework.security.web.csrf.CsrfTokenRequestAttributeHandler;
import org.springframework.security.web.csrf.CsrfTokenRequestHandler;
import org.springframework.security.web.csrf.XorCsrfTokenRequestAttributeHandler;
import org.springframework.util.StringUtils;

/**
 * Protección CSRF para una SPA: el token viaja en la cookie XSRF-TOKEN (legible por el
 * frontend) y React lo devuelve en la cabecera X-XSRF-TOKEN. La sesión sigue en una
 * cookie HttpOnly que JavaScript no puede leer.
 */
final class ManejadorCsrfSpa implements CsrfTokenRequestHandler {

    private final CsrfTokenRequestHandler plano = new CsrfTokenRequestAttributeHandler();
    private final CsrfTokenRequestHandler xor = new XorCsrfTokenRequestAttributeHandler();

    @Override
    public void handle(HttpServletRequest req, HttpServletResponse res, Supplier<CsrfToken> token) {
        xor.handle(req, res, token);
        // Fuerza a generar el token para que la cookie llegue al navegador en cada respuesta.
        token.get();
    }

    @Override
    public String resolveCsrfTokenValue(HttpServletRequest req, CsrfToken token) {
        String cabecera = req.getHeader(token.getHeaderName());
        return (StringUtils.hasText(cabecera) ? plano : xor).resolveCsrfTokenValue(req, token);
    }
}
