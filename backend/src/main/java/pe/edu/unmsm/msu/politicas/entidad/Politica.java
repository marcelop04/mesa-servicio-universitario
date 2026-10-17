package pe.edu.unmsm.msu.politicas.entidad;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToMany;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import pe.edu.unmsm.msu.identidad.entidad.Usuario;

/** Versión publicada de los plazos por prioridad (tabla 15). Publicar crea otra versión; no se edita. */
@Entity
@Table(name = "politica")
public class Politica {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private int version;

    @Column(name = "vigente_desde", nullable = false)
    private Instant vigenteDesde;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "publicada_por")
    private Usuario publicadaPor;

    @OneToMany(mappedBy = "politica", cascade = CascadeType.PERSIST, fetch = FetchType.EAGER)
    private List<DetallePolitica> detalles = new ArrayList<>();

    protected Politica() {
    }

    public Politica(int version, Instant vigenteDesde, Usuario publicadaPor) {
        this.version = version;
        this.vigenteDesde = vigenteDesde;
        this.publicadaPor = publicadaPor;
    }

    public void agregarDetalle(String prioridadCodigo, int horasPrimeraAtencion, int horasResolucion) {
        detalles.add(new DetallePolitica(this, prioridadCodigo, horasPrimeraAtencion, horasResolucion));
    }

    public Long getId() {
        return id;
    }

    public int getVersion() {
        return version;
    }

    public Instant getVigenteDesde() {
        return vigenteDesde;
    }

    public List<DetallePolitica> getDetalles() {
        return detalles;
    }
}
