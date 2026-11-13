package pe.edu.unmsm.msu.seguridad;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.HashMap;
import java.util.Map;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import pe.edu.unmsm.msu.identidad.entidad.Usuario;

/** C1: contadores acotados, locales a una instancia. No almacena contraseñas ni tokens. */
@Service
public class LimiteIntentosLogin {

    public static final class LimiteExcedido extends RuntimeException {
        private final long segundos;

        LimiteExcedido(long segundos) {
            super("Demasiados intentos. Espere " + Math.max(1, segundos) + " segundos antes de volver a iniciar sesión.");
            this.segundos = Math.max(1, segundos);
        }

        public long segundos() {
            return segundos;
        }
    }

    private record Clave(String ip, String correo) { }

    private static final class Contador {
        private int fallos;
        private int enCurso;
        private final Instant inicio;
        private Instant bloqueo;

        private Contador(Instant inicio) {
            this.inicio = inicio;
        }
    }

    /** Reserva cupo antes del BCrypt para que los intentos concurrentes tampoco evadan el límite. */
    public final class Intento implements AutoCloseable {
        private final Contador cuenta;
        private final Contador direccion;
        private boolean terminado;

        private Intento(Contador cuenta, Contador direccion) {
            this.cuenta = cuenta;
            this.direccion = direccion;
        }

        public void completar(boolean valido) {
            synchronized (LimiteIntentosLogin.this) {
                if (terminado) {
                    return;
                }
                terminado = true;
                cuenta.enCurso--;
                direccion.enCurso--;
                if (valido) {
                    cuenta.fallos = 0;
                } else {
                    registrarFallo(cuenta, maxCuenta);
                    registrarFallo(direccion, maxIp);
                }
            }
        }

        /** Una falla técnica no se cuenta como contraseña incorrecta, pero libera ambos cupos. */
        @Override
        public void close() {
            synchronized (LimiteIntentosLogin.this) {
                if (!terminado) {
                    terminado = true;
                    cuenta.enCurso--;
                    direccion.enCurso--;
                }
            }
        }
    }

    private final Map<Clave, Contador> contadores = new HashMap<>();
    private final Clock reloj;
    private final int maxCuenta;
    private final int maxIp;
    private final int capacidad;
    private final Duration ventana;

    public LimiteIntentosLogin(Clock reloj,
            @Value("${msu.seguridad.login.max-fallos:5}") int maxCuenta,
            @Value("${msu.seguridad.login.max-fallos-ip:50}") int maxIp,
            @Value("${msu.seguridad.login.ventana:PT15M}") Duration ventana,
            @Value("${msu.seguridad.login.max-contadores:10000}") int capacidad) {
        if (maxCuenta < 1 || maxIp < maxCuenta || capacidad < 2 || ventana.compareTo(Duration.ofSeconds(1)) < 0) {
            throw new IllegalArgumentException("Configuración del límite de inicio de sesión inválida.");
        }
        this.reloj = reloj;
        this.maxCuenta = maxCuenta;
        this.maxIp = maxIp;
        this.ventana = ventana;
        this.capacidad = capacidad;
    }

    public synchronized Intento iniciar(String correo, String ip) {
        Instant ahora = reloj.instant();
        // No se expulsan contadores vigentes: llenar la memoria no permite eludir un bloqueo.
        contadores.values().removeIf(c -> c.enCurso == 0 && !ahora.isBefore(expira(c)));
        Clave claveCuenta = new Clave(ip, Usuario.normalizarCorreo(correo));
        Clave claveIp = new Clave(ip, null);
        comprobar(contadores.get(claveCuenta), maxCuenta, ahora);
        comprobar(contadores.get(claveIp), maxIp, ahora);
        int nuevos = (contadores.containsKey(claveCuenta) ? 0 : 1) + (contadores.containsKey(claveIp) ? 0 : 1);
        if (contadores.size() + nuevos > capacidad) {
            throw new LimiteExcedido(ventana.toSeconds());
        }
        Contador cuenta = contadores.computeIfAbsent(claveCuenta, k -> new Contador(ahora));
        Contador direccion = contadores.computeIfAbsent(claveIp, k -> new Contador(ahora));
        cuenta.enCurso++;
        direccion.enCurso++;
        return new Intento(cuenta, direccion);
    }

    private void comprobar(Contador contador, int maximo, Instant ahora) {
        if (contador == null) {
            return;
        }
        if (contador.bloqueo != null && ahora.isBefore(contador.bloqueo)) {
            long millis = Duration.between(ahora, contador.bloqueo).toMillis();
            throw new LimiteExcedido((millis + 999) / 1000);
        }
        if (contador.fallos + contador.enCurso >= maximo) {
            throw new LimiteExcedido(1);
        }
    }

    private void registrarFallo(Contador contador, int maximo) {
        contador.fallos++;
        if (contador.fallos >= maximo && contador.bloqueo == null) {
            contador.bloqueo = reloj.instant().plus(ventana);
        }
    }

    private Instant expira(Contador contador) {
        return contador.bloqueo == null ? contador.inicio.plus(ventana) : contador.bloqueo;
    }
}
