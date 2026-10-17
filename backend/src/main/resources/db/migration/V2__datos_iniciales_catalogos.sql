-- GB07. Datos iniciales ficticios: roles, estados, prioridades, áreas, categorías y ubicaciones.
-- Las cuentas de prueba y la política de plazos v1 se crean en DatosIniciales.java,
-- porque necesitan el hash de la contraseña y el administrador que publica la política.

INSERT INTO rol (codigo, nombre_visible) VALUES
    ('SOLICITANTE', 'Solicitante'),
    ('TECNICO', 'Técnico'),
    ('SUPERVISOR', 'Supervisor'),
    ('ADMINISTRADOR', 'Administrador');

INSERT INTO estado (codigo, nombre_visible) VALUES
    ('REGISTRADA', 'Registrada'),
    ('EN_EVALUACION', 'En evaluación'),
    ('ASIGNADA', 'Asignada'),
    ('EN_ATENCION', 'En atención'),
    ('RESUELTA', 'Resuelta'),
    ('CERRADA', 'Cerrada'),
    ('CANCELADA', 'Cancelada');

INSERT INTO prioridad (codigo, nombre_visible, orden) VALUES
    ('CRITICA', 'Crítica', 1),
    ('ALTA', 'Alta', 2),
    ('MEDIA', 'Media', 3),
    ('BAJA', 'Baja', 4);

INSERT INTO area (nombre) VALUES
    ('Soporte informático'),
    ('Mantenimiento'),
    ('Servicios generales');

INSERT INTO categoria (nombre, area_id)
SELECT c.nombre, a.id
FROM (
    SELECT 'Equipo de cómputo' AS nombre, 'Soporte informático' AS area UNION ALL
    SELECT 'Proyector y multimedia', 'Soporte informático' UNION ALL
    SELECT 'Software académico', 'Soporte informático' UNION ALL
    SELECT 'Conectividad y red', 'Soporte informático' UNION ALL
    SELECT 'Mobiliario', 'Mantenimiento' UNION ALL
    SELECT 'Puertas y ventanas', 'Mantenimiento' UNION ALL
    SELECT 'Iluminación y electricidad', 'Mantenimiento' UNION ALL
    SELECT 'Gasfitería', 'Mantenimiento' UNION ALL
    SELECT 'Limpieza de ambiente', 'Servicios generales' UNION ALL
    SELECT 'Acondicionamiento de espacio', 'Servicios generales'
) c
JOIN area a ON a.nombre = c.area;

INSERT INTO ubicacion (edificio, ambiente) VALUES
    ('Pabellón A', 'Aula 101'),
    ('Pabellón A', 'Aula 102'),
    ('Pabellón A', 'Aula 201'),
    ('Pabellón B', 'Laboratorio de cómputo 1'),
    ('Pabellón B', 'Laboratorio de cómputo 2'),
    ('Biblioteca', 'Sala de lectura'),
    ('Auditorio', 'Sala principal'),
    ('Administración', 'Secretaría académica');
