package pe.edu.unmsm.msu.seguridad;

import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.time.Duration;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;
import org.springframework.stereotype.Component;

/**
 * DV04 · Cookie de sesión con el JWT: HttpOnly (JavaScript no la lee), SameSite=Lax y Secure en el
 * despliegue con HTTPS (COOKIE_SECURE). El token CSRF sigue en la cookie XSRF-TOKEN legible.
 */
@Component
public class CookieSesion {

    public static final String NOMBRE = "MSU_SESION";

    private final boolean segura;

    public CookieSesion(@Value("${msu.jwt.cookie-segura:false}") boolean segura) {
        this.segura = segura;
    }

    public void escribir(HttpServletResponse res, String token, Duration duracion) {
        res.addHeader(HttpHeaders.SET_COOKIE, base(token).maxAge(duracion).build().toString());
    }

    public void borrar(HttpServletResponse res) {
        res.addHeader(HttpHeaders.SET_COOKIE, base("").maxAge(0).build().toString());
    }

    public static String leer(HttpServletRequest req) {
        if (req.getCookies() == null) {
            return null;
        }
        for (Cookie c : req.getCookies()) {
            if (NOMBRE.equals(c.getName()) && !c.getValue().isBlank()) {
                return c.getValue();
            }
        }
        return null;
    }

    private ResponseCookie.ResponseCookieBuilder base(String valor) {
        return ResponseCookie.from(NOMBRE, valor).httpOnly(true).secure(segura).sameSite("Lax").path("/");
    }
}
