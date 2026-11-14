package pe.edu.unmsm.msu;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;
import pe.edu.unmsm.msu.seguridad.VerificadorSeguridad;

class ProduccionSinDemoTest {

    private final ApplicationContextRunner contexto = new ApplicationContextRunner()
            .withUserConfiguration(VerificadorSeguridad.class)
            .withPropertyValues("msu.seguridad.despliegue=true", "msu.jwt.cookie-segura=true",
                    "msu.datos-demo.habilitado=false", "msu.datos-demo.solicitudes=false");

    @Test
    void admiteConfiguracionDeDespliegueSinSiembras() {
        contexto.run(c -> assertThat(c).hasNotFailed());
    }

    @ParameterizedTest
    @ValueSource(strings = {"msu.datos-demo.habilitado=true", "msu.datos-demo.solicitudes=true",
            "msu.jwt.cookie-segura=false"})
    void rechazaConfiguracionIncompatibleConProduccion(String cambio) {
        contexto.withPropertyValues(cambio).run(c -> {
            assertThat(c).hasFailed();
            assertThat(c.getStartupFailure()).hasRootCauseMessage("En despliegue se exige COOKIE_SECURE=true, DATOS_DEMO=false "
                    + "y DATOS_DEMO_SOLICITUDES=false.");
        });
    }
}
