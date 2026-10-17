package pe.edu.unmsm.msu;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.hasItem;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.cookie;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import jakarta.servlet.http.Cookie;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.ResultActions;
import pe.edu.unmsm.msu.identidad.repositorio.UsuarioRepositorio;
import pe.edu.unmsm.msu.seguridad.CookieSesion;
import pe.edu.unmsm.msu.seguridad.TokenJwt;

/** DV03 a DV06 y DV09 · HU01, HU02, HU03 y HU24 BDD 1 con JWT en cookie HttpOnly. */
class IdentidadTest extends PruebaApi {

    @Autowired
    JdbcTemplate jdbc;

    @Autowired
    UsuarioRepositorio usuarios;

    ResultActions registrar(String json) throws Exception {
        return mvc.perform(post("/api/v1/auth/registro").with(xsrf()).contentType(MediaType.APPLICATION_JSON).content(json));
    }

    MvcResult login(String correo, String password) throws Exception {
        return mvc.perform(post("/api/v1/auth/login").with(xsrf()).contentType(MediaType.APPLICATION_JSON)
                .content("{\"correo\":\"%s\",\"password\":\"%s\"}".formatted(correo, password))).andReturn();
    }

    @Test
    void hu01Bdd1CuentaValidaCreaUnSolicitanteYPuedeIniciarSesion() throws Exception {
        registrar("""
                {"nombre":"  Lucía Pérez ","correo":" Lucia.Perez@UNMSM.edu.pe ","password":"MiClave12345",
                 "vinculo":"ESTUDIANTE","rol":"ADMINISTRADOR"}""")
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.nombre").value("Lucía Pérez"))
                .andExpect(jsonPath("$.correo").value("lucia.perez@unmsm.edu.pe"))
                .andExpect(jsonPath("$.rol").value("SOLICITANTE"))
                .andExpect(jsonPath("$.password_hash").doesNotExist())
                .andExpect(jsonPath("$.password").doesNotExist());
        assertThat(login("lucia.perez@unmsm.edu.pe", "MiClave12345").getResponse().getStatus()).isEqualTo(200);
    }

    @Test
    void hu01Bdd2CorreoDuplicadoSeRechazaSinDuplicar() throws Exception {
        long antes = usuarios.count();
        registrar("""
                {"nombre":"Otra Ana","correo":"SOLICITANTE@msu.test","password":"MiClave12345","vinculo":"DOCENTE"}""")
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.codigo").value("CORREO_DUPLICADO"));
        assertThat(usuarios.count()).isEqualTo(antes);
    }

    @Test
    void registroValidaCamposPorCampo() throws Exception {
        registrar("{\"nombre\":\"A\",\"correo\":\"no-es-correo\",\"password\":\"corta\",\"vinculo\":\"JEFE\"}")
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errores[*].campo", hasItem("nombre")))
                .andExpect(jsonPath("$.errores[*].campo", hasItem("correo")))
                .andExpect(jsonPath("$.errores[*].campo", hasItem("password")))
                .andExpect(jsonPath("$.errores[*].campo", hasItem("vinculo")));
    }

    @Test
    void hu02Bdd1LoginEntregaJwtEnCookieHttpOnlySinSesionDeServidor() throws Exception {
        MvcResult r = login("supervisor@msu.test", PASSWORD);
        assertThat(r.getResponse().getStatus()).isEqualTo(200);
        Cookie c = r.getResponse().getCookie(CookieSesion.NOMBRE);
        assertThat(c).isNotNull();
        assertThat(c.isHttpOnly()).isTrue();
        assertThat(c.getValue().split("\\.")).hasSize(3);
        assertThat(r.getResponse().getHeaders("Set-Cookie")).noneMatch(h -> h.startsWith("JSESSIONID"));
        assertThat(r.getRequest().getSession(false)).isNull();
        mvc.perform(get("/api/v1/me").cookie(c)).andExpect(status().isOk()).andExpect(jsonPath("$.rol").value("SUPERVISOR"));
    }

    @Test
    void hu02CerrarSesionRevocaElTokenAunqueSeReuse() throws Exception {
        Cookie c = login("supervisor@msu.test", PASSWORD).getResponse().getCookie(CookieSesion.NOMBRE);
        mvc.perform(post("/api/v1/auth/logout").cookie(c).with(xsrf()))
                .andExpect(status().isNoContent())
                .andExpect(cookie().maxAge(CookieSesion.NOMBRE, 0));
        mvc.perform(get("/api/v1/me").cookie(c)).andExpect(status().isUnauthorized());
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM revocacion_sesion", Long.class)).isEqualTo(1);
    }

    @Test
    void tokenAlteradoNoAutentica() throws Exception {
        String valor = login("solicitante@msu.test", PASSWORD).getResponse().getCookie(CookieSesion.NOMBRE).getValue();
        String[] partes = valor.split("\\.");
        // Se cambia el rol en la carga sin poder recalcular la firma.
        String carga = new String(java.util.Base64.getUrlDecoder().decode(partes[1])).replace("SOLICITANTE", "ADMINISTRADOR");
        String alterado = partes[0] + "." + java.util.Base64.getUrlEncoder().withoutPadding().encodeToString(carga.getBytes())
                + "." + partes[2];
        mvc.perform(get("/api/v1/admin/usuarios").cookie(new Cookie(CookieSesion.NOMBRE, alterado)))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void tokenVencidoOConOtraFirmaNoSeAcepta() {
        var admin = usuarios.findByCorreo("admin@msu.test").orElseThrow();
        Instant ahora = Instant.parse("2026-10-17T10:00:00Z");
        TokenJwt emisor = new TokenJwt("secreto-de-prueba-con-mas-de-32-bytes!!", Duration.ofHours(2), Clock.fixed(ahora, ZoneOffset.UTC));
        String token = emisor.emitir(admin);
        assertThat(emisor.verificar(token)).isPresent();
        TokenJwt despues = new TokenJwt("secreto-de-prueba-con-mas-de-32-bytes!!", Duration.ofHours(2),
                Clock.fixed(ahora.plusSeconds(2 * 3600), ZoneOffset.UTC));
        assertThat(despues.verificar(token)).isEmpty();
        TokenJwt otro = new TokenJwt("otro-secreto-distinto-de-mas-de-32-bytes", Duration.ofHours(2), Clock.fixed(ahora, ZoneOffset.UTC));
        assertThat(otro.verificar(token)).isEmpty();
        assertThat(emisor.verificar("eyJhbGciOiJub25lIn0.e30.")).isEmpty();
    }

    @Test
    void hu03Bdd1CambioDeContrasenaInvalidaLaAnteriorYRenuevaLaSesion() throws Exception {
        MockHttpSession sesion = sesion("solicitante@msu.test");
        mvc.perform(put("/api/v1/me/password").session(sesion).with(xsrf()).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"actual\":\"equivocada1\",\"nueva\":\"NuevaClave2026\",\"confirmacion\":\"Otra\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errores[*].campo", hasItem("actual")))
                .andExpect(jsonPath("$.errores[*].campo", hasItem("confirmacion")));

        MvcResult r = mvc.perform(put("/api/v1/me/password").session(sesion).with(xsrf()).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"actual\":\"%s\",\"nueva\":\"NuevaClave2026\",\"confirmacion\":\"NuevaClave2026\"}".formatted(PASSWORD)))
                .andExpect(status().isNoContent())
                .andReturn();
        Cookie nueva = r.getResponse().getCookie(CookieSesion.NOMBRE);
        mvc.perform(get("/api/v1/me").session(sesion)).andExpect(status().isUnauthorized());
        mvc.perform(get("/api/v1/me").cookie(nueva)).andExpect(status().isOk());
        assertThat(login("solicitante@msu.test", PASSWORD).getResponse().getStatus()).isEqualTo(401);
        assertThat(login("solicitante@msu.test", "NuevaClave2026").getResponse().getStatus()).isEqualTo(200);
    }

    @Test
    void hu03Bdd2ElPerfilIgnoraElIntentoDeElevarPrivilegios() throws Exception {
        MockHttpSession sesion = sesion("solicitante@msu.test");
        mvc.perform(put("/api/v1/me").session(sesion).with(xsrf()).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"nombre\":\"Ana María Solicitante\",\"rol\":\"ADMINISTRADOR\",\"area_id\":1}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.nombre").value("Ana María Solicitante"))
                .andExpect(jsonPath("$.rol").value("SOLICITANTE"))
                .andExpect(jsonPath("$.area_id").doesNotExist());
        mvc.perform(get("/api/v1/admin/usuarios").session(sesion)).andExpect(status().isForbidden());
    }
}
