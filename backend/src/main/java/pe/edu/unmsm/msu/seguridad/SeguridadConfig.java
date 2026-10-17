package pe.edu.unmsm.msu.seguridad;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.ProviderManager;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.logout.HttpStatusReturningLogoutSuccessHandler;
import org.springframework.security.web.context.HttpSessionSecurityContextRepository;
import org.springframework.security.web.context.SecurityContextHolderFilter;
import org.springframework.security.web.context.SecurityContextRepository;
import org.springframework.security.web.csrf.CookieCsrfTokenRepository;
import pe.edu.unmsm.msu.identidad.repositorio.UsuarioRepositorio;

/**
 * Seguridad de la API.
 *
 * <p>PROVISIONAL: la sesión usa la cookie de sesión del servidor (HttpOnly) para que las
 * pantallas de administración funcionen de punta a punta. David la reemplaza por JWT en
 * cookie HttpOnly (DV04) sin cambiar las reglas de autorización ni el contrato de CSRF.
 */
@Configuration
public class SeguridadConfig {

    @Bean
    PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    AuthenticationManager authenticationManager(UsuarioRepositorio usuarios, PasswordEncoder encoder) {
        return new ProviderManager(new ProveedorAutenticacion(usuarios, encoder));
    }

    @Bean
    SecurityContextRepository securityContextRepository() {
        return new HttpSessionSecurityContextRepository();
    }

    @Bean
    SecurityFilterChain cadenaSeguridad(HttpSecurity http, ObjectMapper json, UsuarioRepositorio usuarios,
                                        SecurityContextRepository contextos) throws Exception {
        http
                .csrf(csrf -> csrf
                        .csrfTokenRepository(CookieCsrfTokenRepository.withHttpOnlyFalse())
                        .csrfTokenRequestHandler(new ManejadorCsrfSpa()))
                .securityContext(c -> c.securityContextRepository(contextos))
                .httpBasic(AbstractHttpConfigurer::disable)
                .formLogin(AbstractHttpConfigurer::disable)
                .logout(l -> l
                        .logoutUrl("/api/v1/auth/logout")
                        .logoutSuccessHandler(new HttpStatusReturningLogoutSuccessHandler(HttpStatus.NO_CONTENT))
                        .deleteCookies("JSESSIONID"))
                .addFilterAfter(new FiltroVigenciaSesion(usuarios), SecurityContextHolderFilter.class)
                .exceptionHandling(e -> e
                        .authenticationEntryPoint(RespuestasSeguridad.sinSesion(json))
                        .accessDeniedHandler(RespuestasSeguridad.accesoDenegado(json)))
                .authorizeHttpRequests(a -> a
                        .requestMatchers("/api/v1/auth/login", "/api/v1/auth/csrf").permitAll()
                        .requestMatchers("/api/v1/openapi/**", "/swagger-ui/**", "/swagger-ui.html").permitAll()
                        .requestMatchers("/error").permitAll()
                        .requestMatchers("/api/v1/admin/**").hasRole("ADMINISTRADOR")
                        .requestMatchers("/api/v1/**").authenticated()
                        .anyRequest().denyAll());
        return http.build();
    }
}
