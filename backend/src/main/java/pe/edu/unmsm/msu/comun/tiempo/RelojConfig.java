package pe.edu.unmsm.msu.comun.tiempo;

import java.time.Clock;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/** RN03: el backend es la autoridad del tiempo y trabaja en UTC. Las pruebas pueden fijar el reloj. */
@Configuration
public class RelojConfig {

    @Bean
    Clock reloj() {
        return Clock.systemUTC();
    }
}
