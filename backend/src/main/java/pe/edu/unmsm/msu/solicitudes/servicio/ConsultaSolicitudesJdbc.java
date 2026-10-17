package pe.edu.unmsm.msu.solicitudes.servicio;

import java.util.HashMap;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.jdbc.BadSqlGrammarException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

/**
 * Implementación con SQL directo sobre la tabla solicitud. Mientras la migración de
 * solicitudes (MR01) no exista, no hay casos registrados y las consultas devuelven cero.
 */
@Service
public class ConsultaSolicitudesJdbc implements ConsultaSolicitudes {

    private static final Logger log = LoggerFactory.getLogger(ConsultaSolicitudesJdbc.class);
    private static final String PENDIENTES = "('REGISTRADA','EN_EVALUACION','ASIGNADA','EN_ATENCION')";

    private final JdbcTemplate jdbc;

    public ConsultaSolicitudesJdbc(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    @Override
    public long contarPendientesDeTecnico(long tecnicoId) {
        try {
            Long total = jdbc.queryForObject(
                    "SELECT COUNT(*) FROM solicitud WHERE tecnico_id = ? AND estado_codigo IN " + PENDIENTES,
                    Long.class, tecnicoId);
            return total == null ? 0 : total;
        } catch (BadSqlGrammarException e) {
            avisarTablaAusente();
            return 0;
        }
    }

    @Override
    public Map<Long, Long> pendientesPorTecnico() {
        Map<Long, Long> carga = new HashMap<>();
        try {
            jdbc.query("SELECT tecnico_id, COUNT(*) FROM solicitud WHERE tecnico_id IS NOT NULL"
                            + " AND estado_codigo IN " + PENDIENTES + " GROUP BY tecnico_id",
                    rs -> {
                        carga.put(rs.getLong(1), rs.getLong(2));
                    });
        } catch (BadSqlGrammarException e) {
            avisarTablaAusente();
        }
        return carga;
    }

    @Override
    public boolean categoriaUsada(long categoriaId) {
        try {
            Long total = jdbc.queryForObject("SELECT COUNT(*) FROM solicitud WHERE categoria_id = ?",
                    Long.class, categoriaId);
            return total != null && total > 0;
        } catch (BadSqlGrammarException e) {
            avisarTablaAusente();
            return false;
        }
    }

    private void avisarTablaAusente() {
        log.debug("La tabla solicitud aún no existe; se asume que no hay casos registrados.");
    }
}
