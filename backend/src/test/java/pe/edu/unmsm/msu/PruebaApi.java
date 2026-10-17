package pe.edu.unmsm.msu;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import jakarta.servlet.http.Cookie;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.RequestPostProcessor;
import org.springframework.transaction.annotation.Transactional;
import pe.edu.unmsm.msu.seguridad.CookieSesion;

/** Base de las pruebas de integración: H2 en modo MySQL, migraciones reales y datos de demostración. */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
public abstract class PruebaApi {

    protected static final String PASSWORD = "Demo12345!";

    @Autowired
    protected MockMvc mvc;

    @Autowired
    protected SolicitudesDePrueba pruebas;

    /**
     * Inicia sesión como lo hace el frontend. Devuelve una MockHttpSession que solo transporta la cookie
     * MSU_SESION (JWT): {@link ConfiguracionPruebas} la agrega a cada petición hecha con .session(...).
     */
    protected MockHttpSession sesion(String correo) throws Exception {
        Cookie cookie = mvc.perform(post("/api/v1/auth/login")
                        .with(xsrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"correo\":\"" + correo + "\",\"password\":\"" + PASSWORD + "\"}"))
                .andExpect(status().isOk())
                .andReturn().getResponse().getCookie(CookieSesion.NOMBRE);
        MockHttpSession sesion = new MockHttpSession();
        sesion.setAttribute(ConfiguracionPruebas.ATRIBUTO_JWT, cookie.getValue());
        return sesion;
    }

    /** Envía el token CSRF como el frontend: cookie XSRF-TOKEN y el mismo valor en X-XSRF-TOKEN. */
    protected static RequestPostProcessor xsrf() {
        return req -> {
            String token = UUID.randomUUID().toString();
            ConfiguracionPruebas.agregarCookie(req, new Cookie("XSRF-TOKEN", token));
            req.addHeader("X-XSRF-TOKEN", token);
            return req;
        };
    }
}
