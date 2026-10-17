package pe.edu.unmsm.msu;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;

import jakarta.servlet.http.Cookie;
import java.util.ArrayList;
import java.util.List;
import org.springframework.boot.test.autoconfigure.web.servlet.MockMvcBuilderCustomizer;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.mock.web.MockHttpServletRequest;
import pe.edu.unmsm.msu.seguridad.CookieSesion;

/**
 * Las pruebas usan .session(sesion) para indicar con qué cuenta se hace cada petición; aquí esa
 * sesión se convierte en la cookie MSU_SESION con el JWT, igual que la envía el navegador.
 */
@Configuration
public class ConfiguracionPruebas {

    static final String ATRIBUTO_JWT = "prueba.jwt";

    @Bean
    MockMvcBuilderCustomizer cookieDeSesion() {
        return constructor -> constructor.defaultRequest(get("/").with(req -> {
            if (req.getSession(false) != null && req.getSession(false).getAttribute(ATRIBUTO_JWT) != null) {
                agregarCookie(req, new Cookie(CookieSesion.NOMBRE, (String) req.getSession(false).getAttribute(ATRIBUTO_JWT)));
            }
            return req;
        }));
    }

    /** Agrega una cookie sin borrar las que ya tiene la petición. */
    static void agregarCookie(MockHttpServletRequest req, Cookie cookie) {
        List<Cookie> cookies = new ArrayList<>();
        if (req.getCookies() != null) {
            for (Cookie c : req.getCookies()) {
                if (!c.getName().equals(cookie.getName())) {
                    cookies.add(c);
                }
            }
        }
        cookies.add(cookie);
        req.setCookies(cookies.toArray(Cookie[]::new));
    }
}
