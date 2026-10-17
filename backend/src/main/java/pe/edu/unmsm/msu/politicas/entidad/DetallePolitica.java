package pe.edu.unmsm.msu.politicas.entidad;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import jakarta.persistence.EmbeddedId;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.MapsId;
import jakarta.persistence.Table;
import java.io.Serializable;
import java.util.Objects;

/** Una fila por prioridad: horas de primera atención y de resolución (tabla 6). */
@Entity
@Table(name = "detalle_politica")
public class DetallePolitica {

    @Embeddable
    public static class Clave implements Serializable {

        @Column(name = "politica_id")
        private Long politicaId;

        @Column(name = "prioridad_codigo", length = 20)
        private String prioridadCodigo;

        protected Clave() {
        }

        Clave(Long politicaId, String prioridadCodigo) {
            this.politicaId = politicaId;
            this.prioridadCodigo = prioridadCodigo;
        }

        @Override
        public boolean equals(Object o) {
            return o instanceof Clave c && Objects.equals(politicaId, c.politicaId)
                    && Objects.equals(prioridadCodigo, c.prioridadCodigo);
        }

        @Override
        public int hashCode() {
            return Objects.hash(politicaId, prioridadCodigo);
        }
    }

    @EmbeddedId
    private Clave clave;

    @MapsId("politicaId")
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "politica_id")
    private Politica politica;

    @Column(name = "horas_primera_atencion", nullable = false)
    private int horasPrimeraAtencion;

    @Column(name = "horas_resolucion", nullable = false)
    private int horasResolucion;

    protected DetallePolitica() {
    }

    DetallePolitica(Politica politica, String prioridadCodigo, int horasPrimeraAtencion, int horasResolucion) {
        this.clave = new Clave(null, prioridadCodigo);
        this.politica = politica;
        this.horasPrimeraAtencion = horasPrimeraAtencion;
        this.horasResolucion = horasResolucion;
    }

    public String getPrioridadCodigo() {
        return clave.prioridadCodigo;
    }

    public int getHorasPrimeraAtencion() {
        return horasPrimeraAtencion;
    }

    public int getHorasResolucion() {
        return horasResolucion;
    }
}
