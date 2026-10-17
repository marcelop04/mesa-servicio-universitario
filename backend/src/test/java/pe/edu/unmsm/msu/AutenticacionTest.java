package pe.edu.unmsm.msu;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.cookie;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;

class AutenticacionTest extends PruebaApi {

    @Autowired
    JdbcTemplate jdbc;

    @Test
    void inicioValidoDevuelvePerfilSinHash() throws Exception {
        var sesion = sesion("admin@msu.test");
        mvc.perform(get("/api/v1/me").session(sesion))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.rol").value("ADMINISTRADOR"))
                .andExpect(jsonPath("$.password_hash").doesNotExist());
    }

    @Test
    void credencialesInvalidasDanMensajeGenerico() throws Exception {
        mvc.perform(post("/api/v1/auth/login").with(xsrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"correo\":\"admin@msu.test\",\"password\":\"incorrecta123\"}"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.mensaje").value("Correo o contraseña incorrectos."));
        mvc.perform(post("/api/v1/auth/login").with(xsrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"correo\":\"nadie@msu.test\",\"password\":\"incorrecta123\"}"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.mensaje").value("Correo o contraseña incorrectos."));
    }

    @Test
    void cuentaDesactivadaNoInicia() throws Exception {
        jdbc.update("UPDATE usuario SET activo = FALSE WHERE correo = 'supervisor@msu.test'");
        mvc.perform(post("/api/v1/auth/login").with(xsrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"correo\":\"supervisor@msu.test\",\"password\":\"" + PASSWORD + "\"}"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void sinSesionResponde401ConFormatoComun() throws Exception {
        mvc.perform(get("/api/v1/admin/usuarios"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.codigo").value("SIN_SESION"))
                .andExpect(jsonPath("$.id_correlacion").isNotEmpty());
    }

    @Test
    void entregaCookieCsrfLegibleYLaRequiereEnEscrituras() throws Exception {
        mvc.perform(get("/api/v1/auth/csrf"))
                .andExpect(status().isOk())
                .andExpect(cookie().exists("XSRF-TOKEN"))
                .andExpect(cookie().httpOnly("XSRF-TOKEN", false));
        var sesion = sesion("admin@msu.test");
        mvc.perform(post("/api/v1/admin/catalogos/areas").session(sesion)
                        .contentType(MediaType.APPLICATION_JSON).content("{\"nombre\":\"Laboratorios\"}"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.codigo").value("CSRF_INVALIDO"));
    }
}
