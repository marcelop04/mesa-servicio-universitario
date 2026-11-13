/**
 * Helper para preparación de datos conocidos en pruebas E2E.
 * Permite instanciar solicitudes en cualquier estado del ciclo de vida
 * para verificar acciones esenciales sin condiciones `if` ni falsos positivos.
 */

const BASE_URL = process.env.BASE_URL || 'http://localhost:8081';
const API_URL = `${BASE_URL.replace(/\/$/, '')}/api/v1`;

const CLAVE_DEMO = process.env.DEMO_PASSWORD || 'Demo12345!';

/**
 * Autentica un usuario contra la API y retorna cabeceras con CSRF y JWT.
 */
export async function autenticarApi(correo, password = CLAVE_DEMO) {
  const csrfRes = await fetch(`${API_URL}/auth/csrf`);
  const csrfCookie = csrfRes.headers.get('set-cookie');
  const csrfToken = csrfCookie ? csrfCookie.split(';')[0].split('=')[1] : '';

  const loginRes = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-XSRF-TOKEN': csrfToken,
      'Cookie': `XSRF-TOKEN=${csrfToken}`,
    },
    body: JSON.stringify({ correo, password }),
  });

  const cookies = loginRes.headers.get('set-cookie') || '';
  const jwt = cookies.split(',').map((s) => s.trim().split(';')[0]).find((s) => s.startsWith('MSU_SESION='));

  return {
    headers: {
      'Content-Type': 'application/json',
      'X-XSRF-TOKEN': csrfToken,
      'Cookie': `XSRF-TOKEN=${csrfToken}; ${jwt || ''}`,
    },
  };
}

/**
 * Crea una solicitud y la transiciona opcionalmente hasta el estado deseado.
 * Estados soportados: 'REGISTRADA', 'EN_EVALUACION', 'ASIGNADA', 'EN_ATENCION', 'RESUELTA', 'CERRADA'.
 */
export async function prepararSolicitud(estadoDeseado = 'REGISTRADA', opciones = {}) {
  const solSesion = await autenticarApi('solicitante@msu.test');
  const supSesion = await autenticarApi('supervisor@msu.test');
  const tecCorreo = opciones.tecnico_correo || 'tecnico.soporte@msu.test';
  const tecId = opciones.tecnico_id || 2;
  const tecSesion = await autenticarApi(tecCorreo);

  const stamp = Date.now();
  const res = await fetch(`${API_URL}/solicitudes`, {
    method: 'POST',
    headers: solSesion.headers,
    body: JSON.stringify({
      categoria_id: opciones.categoria_id || 1,
      ubicacion_id: opciones.ubicacion_id || 1,
      descripcion: opciones.descripcion || `Solicitud QA E2E ${estadoDeseado} ${stamp}`,
      urgencia: opciones.urgencia || 'MEDIA',
      impacto: opciones.impacto || 'MEDIO',
    }),
  });

  if (!res.ok) {
    throw new Error(`Error al crear solicitud inicial: ${res.status} ${await res.text()}`);
  }

  let solicitud = await res.json();
  if (estadoDeseado === 'REGISTRADA') return solicitud;

  // 1. Evaluación -> EN_EVALUACION
  const evRes = await fetch(`${API_URL}/solicitudes/${solicitud.id}/evaluacion`, {
    method: 'POST',
    headers: supSesion.headers,
    body: JSON.stringify({ version: solicitud.version }),
  });
  if (!evRes.ok) throw new Error(`Error en evaluación: ${evRes.status}`);
  solicitud = await evRes.json();
  if (estadoDeseado === 'EN_EVALUACION') return solicitud;

  // 2. Asignación -> ASIGNADA
  const asRes = await fetch(`${API_URL}/solicitudes/${solicitud.id}/asignaciones`, {
    method: 'POST',
    headers: supSesion.headers,
    body: JSON.stringify({ tecnico_id: tecId, version: solicitud.version }),
  });
  if (!asRes.ok) throw new Error(`Error en asignación: ${asRes.status}`);
  solicitud = await asRes.json();
  if (estadoDeseado === 'ASIGNADA') return solicitud;

  // 3. Inicio atención -> EN_ATENCION
  const inRes = await fetch(`${API_URL}/solicitudes/${solicitud.id}/inicio`, {
    method: 'POST',
    headers: tecSesion.headers,
    body: JSON.stringify({ version: solicitud.version }),
  });
  if (!inRes.ok) throw new Error(`Error en inicio atención: ${inRes.status}`);
  solicitud = await inRes.json();
  if (estadoDeseado === 'EN_ATENCION') return solicitud;

  // 4. Resolución -> RESUELTA
  const reRes = await fetch(`${API_URL}/solicitudes/${solicitud.id}/resoluciones`, {
    method: 'POST',
    headers: tecSesion.headers,
    body: JSON.stringify({
      solucion: 'Mantenimiento correctivo ejecutado con reemplazo de partes dañadas.',
      version: solicitud.version,
    }),
  });
  if (!reRes.ok) throw new Error(`Error en resolución: ${reRes.status}`);
  solicitud = await reRes.json();
  if (estadoDeseado === 'RESUELTA') return solicitud;

  // 5. Cierre -> CERRADA
  const ciRes = await fetch(`${API_URL}/solicitudes/${solicitud.id}/conformidad`, {
    method: 'POST',
    headers: solSesion.headers,
    body: JSON.stringify({ accion: 'CONFIRMAR', version: solicitud.version }),
  });
  if (!ciRes.ok) throw new Error(`Error en conformidad: ${ciRes.status}`);
  solicitud = await ciRes.json();
  return solicitud;
}

/**
 * Obtiene de forma trazable una solicitud con alerta de plazo activa (vencida o al 80%)
 * garantizando que los escenarios E2E (@HU15) verifiquen los datos sobre esa misma solicitud.
 */
export async function obtenerCasoConAlerta() {
  const supSesion = await autenticarApi('supervisor@msu.test');
  const notifRes = await fetch(`${API_URL}/notificaciones?tamano=50`, { headers: supSesion.headers });
  if (notifRes.ok) {
    const data = await notifRes.json();
    const aviso = (data.items || []).find((n) => n.tipo === 'VENCIMIENTO' || n.tipo === 'ALERTA_PLAZO');
    if (aviso) {
      return {
        id: aviso.solicitud_id,
        codigo: aviso.solicitud_codigo,
        tipo: aviso.tipo,
        texto: aviso.texto,
        nivelEsperado: aviso.tipo === 'VENCIMIENTO' ? 'Vencida' : 'Plazo al 80 %',
      };
    }
  }

  // Fallback: buscar caso pendiente antiguo con nivel de plazo calculado
  const solRes = await fetch(`${API_URL}/solicitudes?orden=antiguedad&tamano=20`, { headers: supSesion.headers });
  if (solRes.ok) {
    const data = await solRes.json();
    const caso = (data.items || []).find((s) => s.nivel_plazo === 'VENCIDA' || s.nivel_plazo === 'ALERTA');
    if (caso) {
      return {
        id: caso.id,
        codigo: caso.codigo,
        tipo: caso.nivel_plazo === 'VENCIDA' ? 'VENCIMIENTO' : 'ALERTA_PLAZO',
        texto: `La solicitud ${caso.codigo} superó el plazo`,
        nivelEsperado: caso.nivel_plazo === 'VENCIDA' ? 'Vencida' : 'Plazo al 80 %',
      };
    }
  }

  throw new Error('No se encontró un caso con alerta de plazo en la base de datos');
}


