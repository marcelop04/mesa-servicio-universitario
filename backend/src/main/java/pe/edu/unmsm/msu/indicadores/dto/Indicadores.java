package pe.edu.unmsm.msu.indicadores.dto;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

/**
 * HU17 y HU18 · Indicadores del periodo (tabla 7 del informe de la fase I). Los porcentajes y las horas
 * llevan un decimal; un denominador cero se devuelve como null y la interfaz muestra «Sin datos».
 */
public record Indicadores(LocalDate desde, LocalDate hasta, Long areaId, Instant generadoEn,
                          Conteos conteos, Tiempos tiempos, Satisfaccion satisfaccion,
                          List<Dato> porEstado, List<Dato> porPrioridad, List<Dato> porCategoria,
                          List<Dato> porTecnico) {

    /** Registradas, pendientes, atendidas, resueltas, cerradas, canceladas y vencidas activas. */
    public record Conteos(long registradas, long pendientes, long atendidas, long resueltas, long cerradas,
                          long canceladas, long vencidasActivas, Double porcentajeSolucionado) {
    }

    /** Tiempo medio de resolución y cumplimiento de plazos, con su base (denominador). */
    public record Tiempos(Double tiempoMedioResolucionHoras, long baseTiempo, Double cumplimientoResolucion,
                          long baseResolucion, Double cumplimientoPrimeraAtencion, long basePrimeraAtencion) {
    }

    public record Satisfaccion(Double promedio, long encuestas) {
    }

    public record Dato(String clave, String etiqueta, long valor) {
    }
}
