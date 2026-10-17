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

/** HU06: comentario de 1 a 1000 caracteres; sin edición ni borrado. */
@Entity
@Immutable
@Table(name = "comentario")
public class Comentario {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "solicitud_id")
    private Solicitud solicitud;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "autor_id")
    private Usuario autor;

    @Column(nullable = false, length = 1000)
    private String texto;

    @Column(name = "creado_en", nullable = false)
    private Instant creadoEn;

    protected Comentario() {
    }

    public Comentario(Solicitud solicitud, Usuario autor, String texto, Instant creadoEn) {
        this.solicitud = solicitud;
        this.autor = autor;
        this.texto = texto;
        this.creadoEn = creadoEn;
    }

    public Long getId() {
        return id;
    }

    public Solicitud getSolicitud() {
        return solicitud;
    }

    public Usuario getAutor() {
        return autor;
    }

    public String getTexto() {
        return texto;
    }

    public Instant getCreadoEn() {
        return creadoEn;
    }
}
