package pe.edu.unmsm.msu.solicitudes.entidad;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.time.Instant;
import org.hibernate.annotations.Immutable;
import pe.edu.unmsm.msu.identidad.entidad.Usuario;

/** Conserva cada cambio de responsable (RF09); el responsable actual queda en la solicitud. */
@Entity
@Immutable
@Table(name = "asignacion_historica")
public class AsignacionHistorica {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "solicitud_id")
    private Solicitud solicitud;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "tecnico_anterior_id")
    private Usuario tecnicoAnterior;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "tecnico_nuevo_id")
    private Usuario tecnicoNuevo;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "actor_id")
    private Usuario actor;

    @Column(length = 1000)
    private String motivo;

    @Column(name = "creada_en", nullable = false)
    private Instant creadaEn;

    protected AsignacionHistorica() {
    }

    public AsignacionHistorica(Solicitud solicitud, Usuario tecnicoAnterior, Usuario tecnicoNuevo, Usuario actor,
                               String motivo, Instant creadaEn) {
        this.solicitud = solicitud;
        this.tecnicoAnterior = tecnicoAnterior;
        this.tecnicoNuevo = tecnicoNuevo;
        this.actor = actor;
        this.motivo = motivo;
        this.creadaEn = creadaEn;
    }

    public Long getId() {
        return id;
    }

    public Usuario getTecnicoAnterior() {
        return tecnicoAnterior;
    }

    public Usuario getTecnicoNuevo() {
        return tecnicoNuevo;
    }

    public Usuario getActor() {
        return actor;
    }

    public String getMotivo() {
        return motivo;
    }

    public Instant getCreadaEn() {
        return creadaEn;
    }
}
