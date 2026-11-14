package pe.edu.unmsm.msu;

import static org.assertj.core.api.Assertions.assertThat;

import java.net.HttpCookie;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.security.crypto.password.PasswordEncoder;
import pe.edu.unmsm.msu.identidad.entidad.Rol;
import pe.edu.unmsm.msu.identidad.entidad.Usuario;
import pe.edu.unmsm.msu.identidad.repositorio.RolRepositorio;
import pe.edu.unmsm.msu.identidad.repositorio.UsuarioRepositorio;

/** DV-B02: verifica por HTTP real el perfil prod detrás de un terminador TLS como Caddy. */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT, properties = {
        "spring.datasource.url=jdbc:h2:mem:despliegue;MODE=MySQL;DATABASE_TO_LOWER=TRUE;DB_CLOSE_DELAY=-1",
        "spring.datasource.username=sa",
        "spring.datasource.password=",
        "msu.jwt.secreto=solo-pruebas-despliegue-clave-ficticia-de-32-bytes",
        "msu.datos-demo.habilitado=false",
        "msu.datos-demo.solicitudes=false",
        "msu.tareas.habilitadas=false"
})
@ActiveProfiles("prod")
class DespliegueHttpsTest {

    @LocalServerPort
    int puerto;

    private final HttpClient cliente = HttpClient.newHttpClient();

    @Autowired
    UsuarioRepositorio usuarios;

    @Autowired
    RolRepositorio roles;

    @Autowired
    PasswordEncoder encoder;

    @BeforeEach
    void prepararFixtureSinActivarDemoEnProduccion() {
        if (!usuarios.existsByCorreo("fixture.https@msu.test")) {
            usuarios.save(new Usuario("Fixture HTTPS", "fixture.https@msu.test",
                    encoder.encode("Fixture-Https9!"), "ESTUDIANTE",
                    roles.findByCodigo(Rol.SOLICITANTE).orElseThrow(), null));
        }
    }

    @Test
    void proxyHttpsConservaCsrfYEmiteSesionSecureHttpOnly() throws Exception {
        HttpResponse<String> csrf = cliente.send(peticion("/api/v1/auth/csrf").GET().build(),
                HttpResponse.BodyHandlers.ofString());
        assertThat(csrf.statusCode()).isEqualTo(200);
        String cabeceraCsrf = csrf.headers().allValues("set-cookie").stream()
                .filter(c -> c.startsWith("XSRF-TOKEN=")).findFirst().orElseThrow();
        assertThat(cabeceraCsrf).containsIgnoringCase("secure");
        assertThat(cabeceraCsrf).containsIgnoringCase("SameSite=Lax").doesNotContain("HttpOnly");
        assertThat(csrf.headers().firstValue("content-security-policy")).hasValueSatisfying(
                valor -> assertThat(valor).contains("frame-ancestors 'none'").doesNotContain("'unsafe-eval'"));
        assertThat(csrf.headers().firstValue("strict-transport-security")).isPresent();
        String token = HttpCookie.parse(cabeceraCsrf).get(0).getValue();

        HttpResponse<String> login = cliente.send(peticion("/api/v1/auth/login")
                .header("Content-Type", "application/json")
                .header("Cookie", "XSRF-TOKEN=" + token)
                .header("X-XSRF-TOKEN", token)
                .POST(HttpRequest.BodyPublishers.ofString(
                        "{\"correo\":\"fixture.https@msu.test\",\"password\":\"Fixture-Https9!\"}"))
                .build(), HttpResponse.BodyHandlers.ofString());
        assertThat(login.statusCode()).isEqualTo(200);
        String cabeceraSesion = login.headers().allValues("set-cookie").stream()
                .filter(c -> c.startsWith("MSU_SESION=")).findFirst().orElseThrow();
        assertThat(cabeceraSesion).containsIgnoringCase("Secure").containsIgnoringCase("HttpOnly")
                .containsIgnoringCase("SameSite=Lax");
        String jwt = HttpCookie.parse(cabeceraSesion).get(0).getValue();
        HttpResponse<String> perfil = cliente.send(peticion("/api/v1/me")
                .header("Cookie", "MSU_SESION=" + jwt).GET().build(), HttpResponse.BodyHandlers.ofString());
        assertThat(perfil.statusCode()).isEqualTo(200);
        assertThat(perfil.body()).contains("fixture.https@msu.test");
    }

    @Test
    void errorSinSesionDetrasDeProxyMantieneCabecerasSinExponerDatos() throws Exception {
        HttpResponse<String> respuesta = cliente.send(peticion("/api/v1/me").GET().build(),
                HttpResponse.BodyHandlers.ofString());
        assertThat(respuesta.statusCode()).isEqualTo(401);
        assertThat(respuesta.headers().firstValue("strict-transport-security")).hasValue("max-age=31536000");
        assertThat(respuesta.headers().firstValue("x-frame-options")).hasValue("DENY");
        assertThat(respuesta.headers().firstValue("referrer-policy")).hasValue("no-referrer");
        assertThat(respuesta.body()).contains("SIN_SESION").doesNotContain("password", "stackTrace");
    }

    private HttpRequest.Builder peticion(String ruta) {
        return HttpRequest.newBuilder(URI.create("http://localhost:" + puerto + ruta))
                .header("X-Forwarded-Proto", "https")
                .header("X-Forwarded-Host", "msu.example.org");
    }
}
