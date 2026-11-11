package pe.edu.unmsm.msu;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.sql.Timestamp;
import java.time.Duration;
import java.time.Instant;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mock.web.MockHttpSession;
import pe.edu.unmsm.msu.seguridad.LimpiezaRevocacionesServicio;

/** HU02 · Limpieza periódica de tokens revocados ya vencidos (Emanuel, fase III). */
class LimpiezaRevocacionesTest extends PruebaApi {

    @Autowired
    JdbcTemplate jdbc;

    @Autowired
    LimpiezaRevocacionesServicio limpieza;

    long revocaciones() {
        return jdbc.queryForObject("SELECT COUNT(*) FROM revocacion_sesion", Long.class);
    }

    void revocacionVencida(String jti, Instant expira) {
        jdbc.update("INSERT INTO revocacion_sesion (token_id, usuario_id, revocado_en, expira_en) VALUES (?, ?, ?, ?)",
                jti, pruebas.usuarioId("solicitante@msu.test"), Timestamp.from(expira.minus(Duration.ofHours(2))),
                Timestamp.from(expira));
    }

    @Test
    void borraSoloLasRevocacionesVencidasYLaSesionCerradaSigueRechazada() throws Exception {
        MockHttpSession sesion = sesion("solicitante@msu.test");
        mvc.perform(post("/api/v1/auth/logout").session(sesion).with(xsrf())).andExpect(status().isNoContent());
        long inicial = revocaciones();
        revocacionVencida("vencida-hace-un-dia", Instant.now().minus(Duration.ofDays(1)));
        revocacionVencida("vencida-hace-una-hora", Instant.now().minus(Duration.ofHours(1)));
        revocacionVencida("dentro-del-margen", Instant.now().minus(Duration.ofMinutes(1)));

        assertThat(limpieza.limpiar(Instant.now())).isEqualTo(2);
        assertThat(revocaciones()).isEqualTo(inicial + 1);
        // La revocación del cierre de sesión aún vigente se conserva: el token copiado sigue sin autenticar.
        mvc.perform(get("/api/v1/me").session(sesion)).andExpect(status().isUnauthorized());
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM auditoria WHERE accion = 'TOKENS_LIMPIEZA'", Long.class))
                .isEqualTo(1);
    }

    @Test
    void repetirLaLimpiezaNoBorraNadaMas() {
        revocacionVencida("vencida", Instant.now().minus(Duration.ofDays(2)));
        assertThat(limpieza.limpiar(Instant.now())).isEqualTo(1);
        assertThat(limpieza.limpiar(Instant.now())).isZero();
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM auditoria WHERE accion = 'TOKENS_LIMPIEZA'", Long.class))
                .isEqualTo(1);
    }
}
