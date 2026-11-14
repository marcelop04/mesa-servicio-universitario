-- Script de limpieza idempotente para datos de prueba de carga y estrés
-- Elimina todas las entidades hijas y solicitudes generadas con el prefijo [CARGA]

DELETE FROM encuesta WHERE solicitud_id IN (SELECT id FROM solicitud WHERE descripcion LIKE '[CARGA]%');
DELETE FROM comentario WHERE solicitud_id IN (SELECT id FROM solicitud WHERE descripcion LIKE '[CARGA]%');
DELETE FROM evidencia WHERE solicitud_id IN (SELECT id FROM solicitud WHERE descripcion LIKE '[CARGA]%');
DELETE FROM evento_operativo WHERE solicitud_id IN (SELECT id FROM solicitud WHERE descripcion LIKE '[CARGA]%');
DELETE FROM notificacion WHERE solicitud_id IN (SELECT id FROM solicitud WHERE descripcion LIKE '[CARGA]%');
DELETE FROM asignacion_historica WHERE solicitud_id IN (SELECT id FROM solicitud WHERE descripcion LIKE '[CARGA]%');
DELETE FROM solicitud WHERE descripcion LIKE '[CARGA]%';

