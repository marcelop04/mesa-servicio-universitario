package pe.edu.unmsm.msu.seguridad;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.ProviderManager;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.logout.HttpStatusReturningLogoutSuccessHandler;
import org.springframework.security.web.context.RequestAttributeSecurityContextRepository;
import org.springframework.security.web.context.SecurityContextHolderFilter;
import org.springframework.security.web.csrf.CookieCsrfTokenRepository;
import org.springframework.security.web.header.writers.ReferrerPolicyHeaderWriter.ReferrerPolicy;
import org.springframework.security.web.header.writers.StaticHeadersWriter;
import pe.edu.unmsm.msu.identidad.repositorio.RevocacionSesionRepositorio;
import pe.edu.unmsm.msu.identidad.repositorio.UsuarioRepositorio;

/**
 * Seguridad de la API (sección 8.3, DV04).
 *
 * <ul>
 *   <li>Sin sesión en el servidor: cada petición se autentica con el JWT de la cookie HttpOnly
 *       {@value CookieSesion#NOMBRE} ({@link FiltroJwt}).</li>
 *   <li>CSRF para SPA: cookie XSRF-TOKEN legible y cabecera X-XSRF-TOKEN en cada escritura.</li>
 *   <li>Cerrar sesión revoca el token (tabla revocacion_sesion) y borra la cookie.</li>
 *   <li>Autorización por rol en las rutas y por propiedad o asignación de la solicitud en los servicios.</li>
 * </ul>
 */
@Configuration
public class SeguridadConfig {

    @Value("${msu.simulacion.habilitada:false}")
    private boolean simulacionHabilitada;

    @Bean
    PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    AuthenticationManager authenticationManager(UsuarioRepositorio usuarios, PasswordEncoder encoder) {
        return new ProviderManager(new ProveedorAutenticacion(usuarios, encoder));
    }

    @Bean
    SecurityFilterChain cadenaSeguridad(HttpSecurity http, ObjectMapper json, UsuarioRepositorio usuarios,
                                        RevocacionSesionRepositorio revocaciones, TokenJwt tokens,
                                        RevocadorSesion revocador,
                                        @Value("${msu.jwt.cookie-segura:false}") boolean cookieSegura) throws Exception {
        CookieCsrfTokenRepository csrfCookies = CookieCsrfTokenRepository.withHttpOnlyFalse();
        csrfCookies.setCookieCustomizer(c -> c.secure(cookieSegura).sameSite("Lax").path("/"));
        http
                .csrf(csrf -> {
                    csrf.csrfTokenRepository(csrfCookies)
                            .csrfTokenRequestHandler(new ManejadorCsrfSpa())
                            .ignoringRequestMatchers("/actuator/**");
                    if (simulacionHabilitada) {
                        csrf.ignoringRequestMatchers("/api/v1/diagnostico/**");
                    }
                })
                .headers(h -> h
                        .contentSecurityPolicy(c -> c.policyDirectives("default-src 'none'; script-src 'self'; "
                                + "style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self'; "
                                + "connect-src 'self'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'; "
                                + "object-src 'none'"))
                        .httpStrictTransportSecurity(s -> s.includeSubDomains(false).maxAgeInSeconds(31536000))
                        .frameOptions(f -> f.deny())
                        .referrerPolicy(r -> r.policy(ReferrerPolicy.NO_REFERRER))
                        .addHeaderWriter(new StaticHeadersWriter("Permissions-Policy",
                                "camera=(), microphone=(), geolocation=()")))
                .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .securityContext(c -> c.securityContextRepository(new RequestAttributeSecurityContextRepository()))
                .httpBasic(AbstractHttpConfigurer::disable)
                .formLogin(AbstractHttpConfigurer::disable)
                .requestCache(AbstractHttpConfigurer::disable)
                .logout(l -> l
                        .logoutUrl("/api/v1/auth/logout")
                        .addLogoutHandler(revocador)
                        .logoutSuccessHandler(new HttpStatusReturningLogoutSuccessHandler(HttpStatus.NO_CONTENT)))
                .addFilterAfter(new FiltroJwt(tokens, usuarios, revocaciones), SecurityContextHolderFilter.class)
                .exceptionHandling(e -> e
                        .authenticationEntryPoint(RespuestasSeguridad.sinSesion(json))
                        .accessDeniedHandler(RespuestasSeguridad.accesoDenegado(json)))
                .authorizeHttpRequests(a -> {
                    a.requestMatchers("/api/v1/auth/login", "/api/v1/auth/csrf", "/api/v1/auth/registro").permitAll()
                            .requestMatchers("/api/v1/openapi/**", "/swagger-ui/**", "/swagger-ui.html").permitAll()
                            .requestMatchers("/actuator/health", "/actuator/info", "/actuator/prometheus").permitAll()
                            .requestMatchers("/error").permitAll();
                    if (simulacionHabilitada) {
                        a.requestMatchers("/api/v1/diagnostico/**").hasRole("ADMINISTRADOR");
                    }
                    a.requestMatchers("/api/v1/admin/**").hasRole("ADMINISTRADOR")
                            .requestMatchers("/api/v1/supervision/**").hasRole("SUPERVISOR")
                            .requestMatchers("/api/v1/indicadores", "/api/v1/reportes/**").hasRole("SUPERVISOR")
                            .requestMatchers("/api/v1/**").authenticated()
                            .anyRequest().denyAll();
                });
        return http.build();
    }
}
