package pe.edu.unmsm.msu.solicitudes.entidad;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToOne;
import jakarta.persistence.Table;
import java.time.Instant;
import org.hibernate.annotations.Immutable;
import pe.edu.unmsm.msu.identidad.entidad.Usuario;

/** HU13: una encuesta opcional por caso cerrado, calificación de 1 a 5 y comentario de hasta 500. */
@Entity
@Immutable
@Table(name = "encuesta")
public class Encuesta {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "solicitud_id", unique = true)
    private Solicitud solicitud;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "solicitante_id")
    private Usuario solicitante;

    @Column(nullable = false)
    private int calificacion;

    @Column(length = 500)
    private String comentario;

    @Column(name = "creada_en", nullable = false)
    private Instant creadaEn;

    protected Encuesta() {
    }

    public Encuesta(Solicitud solicitud, Usuario solicitante, int calificacion, String comentario, Instant creadaEn) {
        this.solicitud = solicitud;
        this.solicitante = solicitante;
        this.calificacion = calificacion;
        this.comentario = comentario;
        this.creadaEn = creadaEn;
    }

    public Long getId() {
        return id;
    }

    public Solicitud getSolicitud() {
        return solicitud;
    }

    public int getCalificacion() {
        return calificacion;
    }

    public String getComentario() {
        return comentario;
    }

    public Instant getCreadaEn() {
        return creadaEn;
    }
}
