package pe.edu.unmsm.msu.catalogos.entidad;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

/** Ubicación identificada por edificio y ambiente, únicos en la facultad. */
@Entity
@Table(name = "ubicacion")
public class Ubicacion {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 100)
    private String edificio;

    @Column(nullable = false, length = 100)
    private String ambiente;

    @Column(nullable = false)
    private boolean activo = true;

    protected Ubicacion() {
    }

    public Ubicacion(String edificio, String ambiente) {
        this.edificio = edificio;
        this.ambiente = ambiente;
    }

    public Long getId() {
        return id;
    }

    public String getEdificio() {
        return edificio;
    }

    public void setEdificio(String edificio) {
        this.edificio = edificio;
    }

    public String getAmbiente() {
        return ambiente;
    }

    public void setAmbiente(String ambiente) {
        this.ambiente = ambiente;
    }

    public boolean isActivo() {
        return activo;
    }

    public void setActivo(boolean activo) {
        this.activo = activo;
    }
}
