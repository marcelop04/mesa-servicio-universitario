package pe.edu.unmsm.msu.identidad.entidad;

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

/**
 * Tabla 15: invalida un JWT antes de que expire (cierre de sesión, DV04). Guarda solo el
 * identificador del token (jti), nunca el token ni la contraseña.
 */
@Entity
@Table(name = "revocacion_sesion")
public class RevocacionSesion {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "token_id", nullable = false, unique = true, length = 64)
    private String tokenId;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "usuario_id")
    private Usuario usuario;

    @Column(name = "revocado_en", nullable = false)
    private Instant revocadoEn;

    @Column(name = "expira_en", nullable = false)
    private Instant expiraEn;

    protected RevocacionSesion() {
    }

    public RevocacionSesion(String tokenId, Usuario usuario, Instant revocadoEn, Instant expiraEn) {
        this.tokenId = tokenId;
        this.usuario = usuario;
        this.revocadoEn = revocadoEn;
        this.expiraEn = expiraEn;
    }

    public Long getId() {
        return id;
    }

    public String getTokenId() {
        return tokenId;
    }

    public Usuario getUsuario() {
        return usuario;
    }

    public Instant getRevocadoEn() {
        return revocadoEn;
    }

    public Instant getExpiraEn() {
        return expiraEn;
    }
}
