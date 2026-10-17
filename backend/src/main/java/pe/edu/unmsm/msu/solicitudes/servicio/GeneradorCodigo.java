package pe.edu.unmsm.msu.solicitudes.servicio;

import java.time.Instant;
import java.time.ZoneId;
import java.util.List;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

/**
 * AX01 · Código único MSU-AAAA-NNNN (RF04). El año es el del registro en America/Lima y el número
 * es correlativo por año. La fila del año se bloquea (SELECT ... FOR UPDATE) hasta el fin de la
 * transacción del registro, así dos altas simultáneas no repiten número.
 */
@Service
@Transactional(propagation = Propagation.MANDATORY)
public class GeneradorCodigo {

    static final ZoneId LIMA = ZoneId.of("America/Lima");

    private final JdbcTemplate jdbc;

    public GeneradorCodigo(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public String siguiente(Instant registro) {
        int anio = registro.atZone(LIMA).getYear();
        String prefijo = "MSU-" + anio + "-";
        List<Integer> fila = jdbc.queryForList("SELECT ultimo FROM secuencia_codigo WHERE anio = ? FOR UPDATE",
                Integer.class, anio);
        int ultimo;
        if (fila.isEmpty()) {
            // Primera alta del año: parte del mayor código existente (p. ej. datos cargados antes).
            ultimo = jdbc.queryForList("SELECT codigo FROM solicitud WHERE codigo LIKE ?", String.class, prefijo + "%")
                    .stream().map(c -> c.substring(prefijo.length())).filter(n -> n.matches("[0-9]+"))
                    .mapToInt(Integer::parseInt).max().orElse(0);
            jdbc.update("INSERT INTO secuencia_codigo (anio, ultimo) VALUES (?, ?)", anio, ultimo + 1);
        } else {
            ultimo = fila.get(0);
            jdbc.update("UPDATE secuencia_codigo SET ultimo = ? WHERE anio = ?", ultimo + 1, anio);
        }
        return String.format("%s%04d", prefijo, ultimo + 1);
    }
}
