package pe.edu.unmsm.msu;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import jakarta.servlet.http.Cookie;
import java.time.Duration;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockHttpServletResponse;
import pe.edu.unmsm.msu.seguridad.CookieSesion;

class SeguridadWebTest extends PruebaApi {

    @ParameterizedTest
    @ValueSource(strings = {"admin@msu.test", "cuenta-inexistente@msu.test"})
    void cincoFallosDan401YSextoDa429InclusoConPasswordCorrecto(String correo) throws Exception {
        for (int i = 0; i < 5; i++) {
            mvc.perform(post("/api/v1/auth/login").with(xsrf()).with(req -> {
                        req.setRemoteAddr("192.0.2.50"); return req;
                    }).contentType(MediaType.APPLICATION_JSON)
                    .content("{\"correo\":\"" + correo + "\",\"password\":\"incorrecta\"}"))
                    .andExpect(status().isUnauthorized());
        }
        mvc.perform(post("/api/v1/auth/login").with(xsrf()).with(req -> {
                    req.setRemoteAddr("192.0.2.50"); return req;
                }).contentType(MediaType.APPLICATION_JSON)
                .content("{\"correo\":\"" + correo + "\",\"password\":\"" + PASSWORD + "\"}"))
                .andExpect(status().isTooManyRequests())
                .andExpect(header().exists("Retry-After"))
                .andExpect(jsonPath("$.codigo").value("DEMASIADOS_INTENTOS"))
                .andExpect(jsonPath("$.id_correlacion").isNotEmpty());
    }

    @Test
    void erroresYRespuestasTienenCabecerasYHstsSoloEnHttps() throws Exception {
        mvc.perform(get("/api/v1/me"))
                .andExpect(status().isUnauthorized())
                .andExpect(header().string("Content-Security-Policy", org.hamcrest.Matchers.allOf(
                        org.hamcrest.Matchers.containsString("style-src 'self' 'sha256-"),
                        org.hamcrest.Matchers.not(org.hamcrest.Matchers.containsString("unsafe-inline")),
                        org.hamcrest.Matchers.not(org.hamcrest.Matchers.containsString("unsafe-eval")))))
                .andExpect(header().string("Cross-Origin-Opener-Policy", "same-origin"))
                .andExpect(header().string("Cross-Origin-Embedder-Policy", "require-corp"))
                .andExpect(header().string("Cross-Origin-Resource-Policy", "same-origin"))
                .andExpect(header().string("X-Content-Type-Options", "nosniff"))
                .andExpect(header().string("X-Frame-Options", "DENY"))
                .andExpect(header().string("Referrer-Policy", "no-referrer"))
                .andExpect(header().doesNotExist("Strict-Transport-Security"));
        mvc.perform(get("/api/v1/auth/csrf").secure(true))
                .andExpect(status().isOk())
                .andExpect(header().string("Strict-Transport-Security", "max-age=31536000"));
    }

    @Test
    void cookieDeSesionSeguraSeEscribeYSeBorraConMismosAtributos() {
        var respuesta = new MockHttpServletResponse();
        var cookies = new CookieSesion(true);
        cookies.escribir(respuesta, "valor-ficticio", Duration.ofHours(2));
        cookies.borrar(respuesta);
        assertThat(respuesta.getHeaders("Set-Cookie")).allSatisfy(c -> {
            assertThat(c).contains("Secure", "HttpOnly", "SameSite=Lax", "Path=/");
        });
    }

    @Test
    void jwtAlteradoNoDaAccesoNiExponeInformacionTecnica() throws Exception {
        mvc.perform(get("/api/v1/me").cookie(new Cookie("MSU_SESION", "alterado.no.valido")))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.codigo").value("SIN_SESION"))
                .andExpect(jsonPath("$.trace").doesNotExist());
    }

    @Test
    void entradasMalformadasNoSeConviertenEn500NiFiltranElCuerpo() throws Exception {
        mvc.perform(post("/api/v1/auth/login").with(xsrf()).contentType(MediaType.APPLICATION_JSON)
                .content("{\"password\":\"no-debe-exponerse\""))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.codigo").value("FORMATO_INVALIDO"))
                .andExpect(jsonPath("$.trace").doesNotExist());
        mvc.perform(post("/api/v1/auth/login").with(xsrf()).contentType(MediaType.TEXT_PLAIN).content("secreto"))
                .andExpect(status().isUnsupportedMediaType())
                .andExpect(jsonPath("$.codigo").value("TIPO_NO_ADMITIDO"));
    }
}
