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
import java.util.Locale;
import pe.edu.unmsm.msu.catalogos.entidad.Area;

@Entity
@Table(name = "usuario")
public class Usuario {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 100)
    private String nombre;

    @Column(nullable = false, unique = true, length = 254)
    private String correo;

    @Column(name = "password_hash", nullable = false, length = 100)
    private String passwordHash;

    @Column(nullable = false, length = 20)
    private String vinculo;

    @ManyToOne(fetch = FetchType.EAGER, optional = false)
    @JoinColumn(name = "rol_id")
    private Rol rol;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "area_id")
    private Area area;

    @Column(nullable = false)
    private boolean activo = true;

    @Column(name = "creado_en", nullable = false)
    private Instant creadoEn;

    /** Se incrementa al cambiar el rol o desactivar la cuenta para revocar sesiones anteriores. */
    @Column(name = "version_autorizacion", nullable = false)
    private int versionAutorizacion;

    protected Usuario() {
    }

    public Usuario(String nombre, String correo, String passwordHash, String vinculo, Rol rol, Area area) {
        this.nombre = nombre;
        this.correo = normalizarCorreo(correo);
        this.passwordHash = passwordHash;
        this.vinculo = vinculo;
        this.rol = rol;
        this.area = area;
        this.creadoEn = Instant.now();
    }

    public static String normalizarCorreo(String correo) {
        return correo == null ? null : correo.trim().toLowerCase(Locale.ROOT);
    }

    public boolean esTecnico() {
        return Rol.TECNICO.equals(rol.getCodigo());
    }

    public void revocarAutorizacion() {
        versionAutorizacion++;
    }

    public Long getId() {
        return id;
    }

    public String getNombre() {
        return nombre;
    }

    public void setNombre(String nombre) {
        this.nombre = nombre;
    }

    public String getCorreo() {
        return correo;
    }

    public String getPasswordHash() {
        return passwordHash;
    }

    public String getVinculo() {
        return vinculo;
    }

    public Rol getRol() {
        return rol;
    }

    public void setRol(Rol rol) {
        this.rol = rol;
    }

    public Area getArea() {
        return area;
    }

    public void setArea(Area area) {
        this.area = area;
    }

    public boolean isActivo() {
        return activo;
    }

    public void setActivo(boolean activo) {
        this.activo = activo;
    }

    public Instant getCreadoEn() {
        return creadoEn;
    }

    public int getVersionAutorizacion() {
        return versionAutorizacion;
    }
}
