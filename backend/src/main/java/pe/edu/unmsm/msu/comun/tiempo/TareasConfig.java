package pe.edu.unmsm.msu.comun.tiempo;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableScheduling;

/** Tareas programadas del mismo servicio (sección 8.1). Las pruebas las desactivan y las invocan directamente. */
@Configuration
@EnableScheduling
@ConditionalOnProperty(name = "msu.tareas.habilitadas", havingValue = "true", matchIfMissing = true)
public class TareasConfig {
}
