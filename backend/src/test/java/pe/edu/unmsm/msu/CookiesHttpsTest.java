package pe.edu.unmsm.msu;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.cookie;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.springframework.test.context.TestPropertySource;

@TestPropertySource(properties = "msu.jwt.cookie-segura=true")
class CookiesHttpsTest extends PruebaApi {

    @Test
    void httpsMarcaSecureEnAmbasCookiesSinOcultarElTokenCsrfAlCliente() throws Exception {
        mvc.perform(get("/api/v1/auth/csrf").secure(true))
                .andExpect(status().isOk())
                .andExpect(cookie().secure("XSRF-TOKEN", true))
                .andExpect(cookie().httpOnly("XSRF-TOKEN", false));
        var sesion = sesion("admin@msu.test");
        mvc.perform(post("/api/v1/auth/logout").session(sesion).with(xsrf()).secure(true))
                .andExpect(status().isNoContent())
                .andExpect(cookie().secure("MSU_SESION", true))
                .andExpect(cookie().httpOnly("MSU_SESION", true));
    }
}
