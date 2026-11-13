package pe.edu.unmsm.msu.seguridad;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.util.ArrayList;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;

class LimiteIntentosLoginTest {

    static final class RelojMutable extends Clock {
        Instant ahora = Instant.parse("2026-11-11T12:00:00Z");

        @Override public ZoneId getZone() { return ZoneOffset.UTC; }
        @Override public Clock withZone(ZoneId zona) { return this; }
        @Override public Instant instant() { return ahora; }
    }

    final RelojMutable reloj = new RelojMutable();
    final LimiteIntentosLogin limite = new LimiteIntentosLogin(reloj, 5, 10, Duration.ofMinutes(15), 100);

    void fallar(String correo, String ip, int veces) {
        for (int i = 0; i < veces; i++) {
            try (var intento = limite.iniciar(correo, ip)) {
                intento.completar(false);
            }
        }
    }

    @Test
    void cincoFallosBloqueanQuinceMinutosDesdeElUltimoFalloSinAlargarConReintentos() {
        fallar("ana@msu.test", "192.0.2.1", 4);
        reloj.ahora = reloj.ahora.plusSeconds(60);
        fallar("ana@msu.test", "192.0.2.1", 1);
        var error = org.junit.jupiter.api.Assertions.assertThrows(LimiteIntentosLogin.LimiteExcedido.class,
                () -> limite.iniciar(" ANA@msu.test ", "192.0.2.1"));
        assertThat(error.segundos()).isEqualTo(900);
        reloj.ahora = reloj.ahora.plusSeconds(899);
        assertThatThrownBy(() -> limite.iniciar("ana@msu.test", "192.0.2.1"))
                .isInstanceOf(LimiteIntentosLogin.LimiteExcedido.class);
        reloj.ahora = reloj.ahora.plusSeconds(1);
        try (var intento = limite.iniciar("ana@msu.test", "192.0.2.1")) {
            intento.completar(true);
        }
    }

    @Test
    void exitoReiniciaLaCuentaPeroNoLosFallosAcumuladosDeLaIp() {
        fallar("ana@msu.test", "192.0.2.2", 4);
        try (var intento = limite.iniciar("ana@msu.test", "192.0.2.2")) {
            intento.completar(true);
        }
        fallar("ana@msu.test", "192.0.2.2", 4);
        fallar("otra@msu.test", "192.0.2.2", 2);
        assertThatThrownBy(() -> limite.iniciar("tercera@msu.test", "192.0.2.2"))
                .isInstanceOf(LimiteIntentosLogin.LimiteExcedido.class);
    }

    @Test
    void bloqueoDeUnaCuentaNoBloqueaOtraCuentaNiOtraIp() {
        fallar("ana@msu.test", "192.0.2.3", 5);
        try (var otra = limite.iniciar("otra@msu.test", "192.0.2.3");
             var otraIp = limite.iniciar("ana@msu.test", "192.0.2.4")) {
            otra.completar(true);
            otraIp.completar(true);
        }
    }

    @Test
    void intentosEnCursoReservanCupoYLosErroresTecnicosLoLiberan() {
        var pendientes = new ArrayList<LimiteIntentosLogin.Intento>();
        for (int i = 0; i < 5; i++) {
            pendientes.add(limite.iniciar("ana@msu.test", "192.0.2.5"));
        }
        assertThatThrownBy(() -> limite.iniciar("ana@msu.test", "192.0.2.5"))
                .isInstanceOf(LimiteIntentosLogin.LimiteExcedido.class);
        pendientes.forEach(LimiteIntentosLogin.Intento::close);
        fallar("ana@msu.test", "192.0.2.5", 5);
    }

    @Test
    void saturacionNoExpulsaLosBloqueosVigentesYSeRecuperaAlVencer() {
        var acotado = new LimiteIntentosLogin(reloj, 1, 1, Duration.ofSeconds(30), 2);
        try (var intento = acotado.iniciar("a@msu.test", "192.0.2.6")) { intento.completar(false); }
        assertThatThrownBy(() -> acotado.iniciar("b@msu.test", "192.0.2.7"))
                .isInstanceOf(LimiteIntentosLogin.LimiteExcedido.class);
        assertThatThrownBy(() -> acotado.iniciar("a@msu.test", "192.0.2.6"))
                .isInstanceOf(LimiteIntentosLogin.LimiteExcedido.class);
        reloj.ahora = reloj.ahora.plusSeconds(30);
        try (var intento = acotado.iniciar("b@msu.test", "192.0.2.7")) { intento.completar(true); }
    }

    @Test
    void rechazaConfiguracionesInseguras() {
        assertThatThrownBy(() -> new LimiteIntentosLogin(reloj, 0, 50, Duration.ofMinutes(15), 100))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> new LimiteIntentosLogin(reloj, 5, 2, Duration.ofMinutes(15), 100))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void cabecerasDeIpNoSonConfiablesPorDefecto() {
        var req = new MockHttpServletRequest();
        req.setRemoteAddr("192.0.2.10");
        req.addHeader("X-Real-IP", "203.0.113.1");
        req.addHeader("X-Forwarded-For", "203.0.113.2");
        assertThat(new IpCliente("").obtener(req)).isEqualTo("192.0.2.10");
        assertThat(new IpCliente("192.0.2.0/24").obtener(req)).isEqualTo("203.0.113.1");
        req.removeHeader("X-Real-IP");
        req.addHeader("X-Real-IP", "malicioso.example");
        assertThat(new IpCliente("192.0.2.0/24").obtener(req)).isEqualTo("192.0.2.10");
        req.removeHeader("X-Real-IP");
        req.addHeader("X-Real-IP", "deadbeef");
        assertThat(new IpCliente("192.0.2.0/24").obtener(req)).isEqualTo("192.0.2.10");
    }

    @Test
    void despliegueExigeCookiesSegurasYSinCuentasDemo() {
        assertThatThrownBy(() -> new VerificadorSeguridad(true, false, false, false, ""))
                .isInstanceOf(IllegalStateException.class);
        assertThatThrownBy(() -> new VerificadorSeguridad(true, true, true, false, "password-demo"))
                .isInstanceOf(IllegalStateException.class);
        assertThatThrownBy(() -> new VerificadorSeguridad(false, false, true, false, ""))
                .isInstanceOf(IllegalStateException.class);
        assertThatThrownBy(() -> new VerificadorSeguridad(true, true, false, true, ""))
                .isInstanceOf(IllegalStateException.class);
        assertThatCode(() -> new VerificadorSeguridad(true, true, false, false, "")).doesNotThrowAnyException();
    }
}
