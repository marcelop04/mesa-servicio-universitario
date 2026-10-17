package pe.edu.unmsm.msu.solicitudes.servicio;

import static pe.edu.unmsm.msu.solicitudes.entidad.Solicitud.ASIGNADA;
import static pe.edu.unmsm.msu.solicitudes.entidad.Solicitud.CANCELADA;
import static pe.edu.unmsm.msu.solicitudes.entidad.Solicitud.CERRADA;
import static pe.edu.unmsm.msu.solicitudes.entidad.Solicitud.EN_ATENCION;
import static pe.edu.unmsm.msu.solicitudes.entidad.Solicitud.EN_EVALUACION;
import static pe.edu.unmsm.msu.solicitudes.entidad.Solicitud.PENDIENTES;
import static pe.edu.unmsm.msu.solicitudes.entidad.Solicitud.REGISTRADA;
import static pe.edu.unmsm.msu.solicitudes.entidad.Solicitud.RESUELTA;

import java.util.Set;

/**
 * Tabla 4 del informe: transiciones permitidas. Cada una es una operación propia del backend;
 * no existe una operación genérica para cambiar libremente el estado (sección 4.3).
 * La reasignación no es una transición: conserva Asignada o En atención.
 */
public enum Transicion {

    EVALUAR(Set.of(REGISTRADA), EN_EVALUACION),
    ASIGNAR(Set.of(EN_EVALUACION), ASIGNADA),
    INICIAR_ATENCION(Set.of(ASIGNADA), EN_ATENCION),
    RESOLVER(Set.of(EN_ATENCION), RESUELTA),
    CONFIRMAR(Set.of(RESUELTA), CERRADA),
    /** Reabrir con técnico activo vuelve a En atención. */
    REABRIR(Set.of(RESUELTA), EN_ATENCION),
    /** Reabrir cuando el técnico ya está inactivo: requiere nueva asignación. */
    REABRIR_SIN_TECNICO(Set.of(RESUELTA), EN_EVALUACION),
    CERRAR_AUTOMATICO(Set.of(RESUELTA), CERRADA),
    CANCELAR(PENDIENTES, CANCELADA);

    private final Set<String> origenes;
    private final String destino;

    Transicion(Set<String> origenes, String destino) {
        this.origenes = origenes;
        this.destino = destino;
    }

    public boolean permitidaDesde(String estado) {
        return origenes.contains(estado);
    }

    public Set<String> getOrigenes() {
        return origenes;
    }

    public String getDestino() {
        return destino;
    }
}
