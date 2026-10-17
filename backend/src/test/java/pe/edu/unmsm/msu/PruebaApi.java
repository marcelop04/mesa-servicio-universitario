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

/** Base de las pruebas de integración: H2 en modo MySQL, migraciones reales y datos de demostración. */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
public abstract class PruebaApi {

    protected static final String PASSWORD = "Demo12345!";

    @Autowired
    protected MockMvc mvc;

    /** Inicia sesión como lo hace el frontend y devuelve la sesión para las siguientes peticiones. */
    protected MockHttpSession sesion(String correo) throws Exception {
        return (MockHttpSession) mvc.perform(post("/api/v1/auth/login")
                        .with(xsrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"correo\":\"" + correo + "\",\"password\":\"" + PASSWORD + "\"}"))
                .andExpect(status().isOk())
                .andReturn().getRequest().getSession(false);
    }

    /** Envía el token CSRF como el frontend: cookie XSRF-TOKEN y el mismo valor en X-XSRF-TOKEN. */
    protected static RequestPostProcessor xsrf() {
        return req -> {
            String token = UUID.randomUUID().toString();
            req.setCookies(new Cookie("XSRF-TOKEN", token));
            req.addHeader("X-XSRF-TOKEN", token);
            return req;
        };
    }
}
