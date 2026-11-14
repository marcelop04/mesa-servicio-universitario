package pe.edu.unmsm.msu.seguridad;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.boot.autoconfigure.AutoConfigurations;
import org.springframework.boot.autoconfigure.context.PropertyPlaceholderAutoConfiguration;
import org.springframework.boot.test.context.ConfigDataApplicationContextInitializer;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;

/** C1: carga los perfiles reales; no arranca MySQL ni utiliza secretos de la máquina. */
class SeguridadPerfilesTest {

    private ApplicationContextRunner perfil(String nombre) {
        return new ApplicationContextRunner()
                .withInitializer(new ConfigDataApplicationContextInitializer())
                .withConfiguration(AutoConfigurations.of(PropertyPlaceholderAutoConfiguration.class))
                .withUserConfiguration(VerificadorSeguridad.class)
                .withPropertyValues("spring.profiles.active=" + nombre);
    }

    @Test
    void devNoTieneClavesDeBaseNiJwtPredeterminadas() {
        perfil("dev").withPropertyValues("msu.datos-demo.habilitado=false").run(contexto -> {
            assertThat(contexto).hasNotFailed();
            assertThatThrownBy(() -> contexto.getEnvironment().getRequiredProperty("spring.datasource.password"))
                    .isInstanceOf(IllegalArgumentException.class);
            assertThatThrownBy(() -> contexto.getEnvironment().getRequiredProperty("msu.jwt.secreto"))
                    .isInstanceOf(IllegalArgumentException.class);
        });
    }

    @ParameterizedTest
    @ValueSource(strings = {"msu.datos-demo.habilitado=true", "msu.datos-demo.solicitudes=true",
            "msu.jwt.cookie-segura=false"})
    void prodRechazaSiembraDeCuentasSolicitudesOCookiesInseguras(String cambio) {
        perfil("prod").withPropertyValues(cambio, "msu.datos-demo.password=solo-fixture-ficticio")
                .run(contexto -> {
                    assertThat(contexto).hasFailed();
                    assertThat(contexto.getStartupFailure()).hasRootCauseInstanceOf(IllegalStateException.class)
                            .hasRootCauseMessage("En despliegue se exige COOKIE_SECURE=true, DATOS_DEMO=false "
                                    + "y DATOS_DEMO_SOLICITUDES=false.");
                });
    }

    @Test
    void prodSeguroArrancaElGuardSinDependerDeUnaVariableOptativa() {
        perfil("prod").run(contexto -> {
            assertThat(contexto).hasNotFailed();
            assertThat(contexto.getEnvironment().getProperty("msu.seguridad.despliegue", Boolean.class)).isTrue();
            assertThat(contexto.getEnvironment().getProperty("msu.jwt.cookie-segura", Boolean.class)).isTrue();
        });
    }

    @Test
    void pruebaPermiteDemoSoloConPasswordExplicitaYCookiesSeguras() {
        perfil("prueba").withPropertyValues("msu.datos-demo.habilitado=true")
                .run(contexto -> {
                    assertThat(contexto).hasFailed();
                    assertThat(contexto.getStartupFailure()).hasRootCauseInstanceOf(IllegalStateException.class)
                            .hasRootCauseMessage("Los datos de demostración requieren DEMO_PASSWORD de al menos 10 caracteres.");
                });
        perfil("prueba").withPropertyValues("msu.datos-demo.habilitado=true",
                "msu.datos-demo.password=solo-fixture-ficticio").run(contexto -> {
                    assertThat(contexto).hasNotFailed();
                    assertThat(contexto.getEnvironment().getProperty("msu.jwt.cookie-segura", Boolean.class)).isTrue();
                });
    }
}
