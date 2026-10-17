package pe.edu.unmsm.msu.notificaciones.entidad;

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
import pe.edu.unmsm.msu.identidad.entidad.Usuario;
import pe.edu.unmsm.msu.solicitudes.entidad.Solicitud;

/** Aviso interno (RF19, RF21). La clave de evento es única por evento y destinatario (RN10). */
@Entity
@Table(name = "notificacion")
public class Notificacion {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "usuario_id")
    private Usuario usuario;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "solicitud_id")
    private Solicitud solicitud;

    @Column(nullable = false, length = 30)
    private String tipo;

    @Column(nullable = false, length = 300)
    private String texto;

    @Column(name = "version_fechas", nullable = false)
    private int versionFechas;

    @Column(name = "creada_en", nullable = false)
    private Instant creadaEn;

    @Column(name = "leida_en")
    private Instant leidaEn;

    @Column(name = "clave_evento", nullable = false, unique = true, length = 150)
    private String claveEvento;

    protected Notificacion() {
    }

    public Notificacion(Usuario usuario, Solicitud solicitud, String tipo, String texto, int versionFechas,
                        String claveEvento, Instant creadaEn) {
        this.usuario = usuario;
        this.solicitud = solicitud;
        this.tipo = tipo;
        this.texto = texto;
        this.versionFechas = versionFechas;
        this.claveEvento = claveEvento;
        this.creadaEn = creadaEn;
    }

    public void marcarLeida(Instant instante) {
        if (leidaEn == null) {
            leidaEn = instante;
        }
    }

    public Long getId() {
        return id;
    }

    public Usuario getUsuario() {
        return usuario;
    }

    public Solicitud getSolicitud() {
        return solicitud;
    }

    public String getTipo() {
        return tipo;
    }

    public String getTexto() {
        return texto;
    }

    public int getVersionFechas() {
        return versionFechas;
    }

    public Instant getCreadaEn() {
        return creadaEn;
    }

    public Instant getLeidaEn() {
        return leidaEn;
    }

    public String getClaveEvento() {
        return claveEvento;
    }
}
