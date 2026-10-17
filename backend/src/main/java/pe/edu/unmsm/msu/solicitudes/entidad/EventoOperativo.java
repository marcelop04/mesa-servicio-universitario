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
import java.util.Map;
import org.hibernate.annotations.Immutable;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
import pe.edu.unmsm.msu.identidad.entidad.Usuario;

/**
 * Historial operativo (RF29, HU23): actor, instante, acción, valores anterior y nuevo y motivo.
 * Es inmutable: la aplicación no ofrece edición ni borrado. Actor nulo solo en acciones del sistema.
 */
@Entity
@Immutable
@Table(name = "evento_operativo")
public class EventoOperativo {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "solicitud_id")
    private Solicitud solicitud;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "actor_id")
    private Usuario actor;

    @Column(nullable = false, length = 40)
    private String accion;

    @JdbcTypeCode(SqlTypes.JSON)
    private Map<String, Object> anterior;

    @JdbcTypeCode(SqlTypes.JSON)
    private Map<String, Object> nuevo;

    @Column(length = 2000)
    private String motivo;

    @Column(name = "creado_en", nullable = false)
    private Instant creadoEn;

    protected EventoOperativo() {
    }

    public EventoOperativo(Solicitud solicitud, Usuario actor, String accion, Map<String, Object> anterior,
                           Map<String, Object> nuevo, String motivo, Instant creadoEn) {
        this.solicitud = solicitud;
        this.actor = actor;
        this.accion = accion;
        this.anterior = anterior;
        this.nuevo = nuevo;
        this.motivo = motivo;
        this.creadoEn = creadoEn;
    }

    public Long getId() {
        return id;
    }

    public Solicitud getSolicitud() {
        return solicitud;
    }

    public Usuario getActor() {
        return actor;
    }

    public String getAccion() {
        return accion;
    }

    public Map<String, Object> getAnterior() {
        return anterior;
    }

    public Map<String, Object> getNuevo() {
        return nuevo;
    }

    public String getMotivo() {
        return motivo;
    }

    public Instant getCreadoEn() {
        return creadoEn;
    }
}
