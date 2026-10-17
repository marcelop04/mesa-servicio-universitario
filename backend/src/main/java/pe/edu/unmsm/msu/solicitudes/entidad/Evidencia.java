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

/**
 * HU06: imagen JPEG o PNG de hasta 5 MB, como máximo tres por solicitud. El archivo vive fuera
 * de la carpeta pública; solo se guarda su ruta privada y se descarga revalidando el acceso.
 */
@Entity
@Immutable
@Table(name = "evidencia")
public class Evidencia {

    public static final long BYTES_MAXIMOS = 5L * 1024 * 1024;
    public static final int MAXIMO_POR_SOLICITUD = 3;

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "solicitud_id")
    private Solicitud solicitud;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "autor_id")
    private Usuario autor;

    @Column(name = "nombre_original", nullable = false, length = 255)
    private String nombreOriginal;

    @Column(name = "ruta_privada", nullable = false, unique = true, length = 500)
    private String rutaPrivada;

    @Column(name = "tipo_real", nullable = false, length = 20)
    private String tipoReal;

    @Column(nullable = false)
    private int bytes;

    @Column(name = "creada_en", nullable = false)
    private Instant creadaEn;

    protected Evidencia() {
    }

    public Evidencia(Solicitud solicitud, Usuario autor, String nombreOriginal, String rutaPrivada, String tipoReal,
                     int bytes, Instant creadaEn) {
        this.solicitud = solicitud;
        this.autor = autor;
        this.nombreOriginal = nombreOriginal;
        this.rutaPrivada = rutaPrivada;
        this.tipoReal = tipoReal;
        this.bytes = bytes;
        this.creadaEn = creadaEn;
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

    public String getNombreOriginal() {
        return nombreOriginal;
    }

    public String getRutaPrivada() {
        return rutaPrivada;
    }

    public String getTipoReal() {
        return tipoReal;
    }

    public int getBytes() {
        return bytes;
    }

    public Instant getCreadaEn() {
        return creadaEn;
    }
}
