package pe.edu.unmsm.msu.auditoria.entidad;

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

/** Auditoría administrativa (RF30): sin contraseñas, tokens ni contenido de evidencias. */
@Entity
@Immutable
@Table(name = "auditoria")
public class Auditoria {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "actor_id")
    private Usuario actor;

    @Column(nullable = false, length = 60)
    private String accion;

    @Column(nullable = false, length = 60)
    private String entidad;

    @Column(name = "entidad_id", length = 64)
    private String entidadId;

    @JdbcTypeCode(SqlTypes.JSON)
    private Map<String, Object> metadatos;

    @Column(name = "creada_en", nullable = false)
    private Instant creadaEn;

    protected Auditoria() {
    }

    public Auditoria(Usuario actor, String accion, String entidad, String entidadId, Map<String, Object> metadatos,
                     Instant creadaEn) {
        this.actor = actor;
        this.accion = accion;
        this.entidad = entidad;
        this.entidadId = entidadId;
        this.metadatos = metadatos;
        this.creadaEn = creadaEn;
    }

    public Long getId() {
        return id;
    }

    public Usuario getActor() {
        return actor;
    }

    public String getAccion() {
        return accion;
    }

    public String getEntidad() {
        return entidad;
    }

    public String getEntidadId() {
        return entidadId;
    }

    public Map<String, Object> getMetadatos() {
        return metadatos;
    }

    public Instant getCreadaEn() {
        return creadaEn;
    }
}
