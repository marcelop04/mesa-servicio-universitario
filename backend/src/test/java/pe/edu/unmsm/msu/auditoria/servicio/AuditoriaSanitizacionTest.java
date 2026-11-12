package pe.edu.unmsm.msu.auditoria.servicio;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;

class AuditoriaSanitizacionTest {

    @Test
    void limpiaSecretosDentroDeMapasListasYArreglos() {
        var limpio = AuditoriaServicio.limpiar(Map.of(
                "password", "no-guardar-1",
                "cambios", List.of(Map.of("nombre", "Nombre visible", "token", "no-guardar-2"),
                        Map.of("anidado", Map.of("secret", "no-guardar-3", "activo", true))),
                "otros", new Object[] {Map.of("cookie", "no-guardar-4", "id", 3)}));
        assertThat(limpio.toString()).contains("Nombre visible", "activo=true", "id=3")
                .doesNotContain("no-guardar", "password", "token", "secret", "cookie");
    }
}
