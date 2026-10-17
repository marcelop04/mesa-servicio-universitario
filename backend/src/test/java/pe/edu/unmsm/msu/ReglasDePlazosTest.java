package pe.edu.unmsm.msu;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.time.Instant;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import pe.edu.unmsm.msu.politicas.servicio.MatrizPrioridad;
import pe.edu.unmsm.msu.politicas.servicio.Plazo;
import pe.edu.unmsm.msu.solicitudes.entidad.Solicitud;
import pe.edu.unmsm.msu.solicitudes.servicio.Transicion;

/** MR08 · Pruebas unitarias de la matriz de prioridad (tabla 5), los plazos (tabla 6) y las transiciones (tabla 4). */
class ReglasDePlazosTest {

    @ParameterizedTest(name = "impacto {0} y urgencia {1} dan {2}")
    @CsvSource({
            "ALTO, ALTA, CRITICA", "ALTO, MEDIA, ALTA", "ALTO, BAJA, MEDIA",
            "MEDIO, ALTA, ALTA", "MEDIO, MEDIA, MEDIA", "MEDIO, BAJA, BAJA",
            "BAJO, ALTA, MEDIA", "BAJO, MEDIA, BAJA", "BAJO, BAJA, BAJA"})
    void matrizDePrioridad(String impacto, String urgencia, String prioridad) {
        assertThat(MatrizPrioridad.calcular(impacto, urgencia)).isEqualTo(prioridad);
    }

    @Test
    void matrizRechazaValoresDesconocidos() {
        assertThatThrownBy(() -> MatrizPrioridad.calcular("ENORME", "ALTA")).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> MatrizPrioridad.calcular("ALTO", null)).isInstanceOf(IllegalArgumentException.class);
    }

    /** HU14 BDD 1: prioridad Alta registrada a las 08:00 vence en 8 h (atención) y 48 h (resolución). */
    @Test
    void hu14Bdd1LimitesEnHorasCorridas() {
        Instant registro = Instant.parse("2026-10-16T13:00:00Z"); // 08:00 en America/Lima
        Plazo alta = new Plazo(8, 48);
        assertThat(alta.limiteAtencion(registro)).isEqualTo(Instant.parse("2026-10-16T21:00:00Z"));
        // RN02: incluye el fin de semana (sábado 17 y domingo 18).
        assertThat(alta.limiteResolucion(registro)).isEqualTo(Instant.parse("2026-10-18T13:00:00Z"));
    }

    @Test
    void plazoIncoherenteSeRechaza() {
        assertThatThrownBy(() -> new Plazo(48, 8)).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> new Plazo(0, 8)).isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void transicionesDeLaTabla4() {
        assertThat(Transicion.EVALUAR.permitidaDesde(Solicitud.REGISTRADA)).isTrue();
        assertThat(Transicion.ASIGNAR.permitidaDesde(Solicitud.REGISTRADA)).isFalse();
        assertThat(Transicion.CANCELAR.getOrigenes()).containsExactlyInAnyOrderElementsOf(Solicitud.PENDIENTES);
        assertThat(Transicion.CANCELAR.permitidaDesde(Solicitud.RESUELTA)).isFalse();
        assertThat(Transicion.CANCELAR.permitidaDesde(Solicitud.CERRADA)).isFalse();
        assertThat(Transicion.REABRIR_SIN_TECNICO.getDestino()).isEqualTo(Solicitud.EN_EVALUACION);
    }
}
