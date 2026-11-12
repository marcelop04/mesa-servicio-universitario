const fs = require('fs');
const path = require('path');

function crearItem(nombre, metodo, urlPath, headers, body, testScript, prerequestScript) {
  const item = {
    name: nombre,
    request: {
      method: metodo,
      header: headers || [],
      url: {
        raw: '{{base_url}}' + urlPath,
        host: ['{{base_url}}'],
        path: urlPath.split('/').filter(Boolean)
      }
    },
    event: []
  };

  if (body) {
    item.request.body = {
      mode: 'raw',
      raw: typeof body === 'string' ? body : JSON.stringify(body, null, 2),
      options: { raw: { language: 'json' } }
    };
    if (!item.request.header.some(h => h.key.toLowerCase() === 'content-type')) {
      item.request.header.push({ key: 'Content-Type', value: 'application/json' });
    }
  }

  if (prerequestScript) {
    item.event.push({
      listen: 'prerequest',
      script: {
        type: 'text/javascript',
        exec: Array.isArray(prerequestScript) ? prerequestScript : prerequestScript.split('\n')
      }
    });
  }

  if (testScript) {
    item.event.push({
      listen: 'test',
      script: {
        type: 'text/javascript',
        exec: Array.isArray(testScript) ? testScript : testScript.split('\n')
      }
    });
  }

  return item;
}

const collection = {
  info: {
    name: 'Mesa de Servicios Universitarios - Suite de API (Newman CI)',
    description: 'Colección completa de pruebas de API para MSU organizada por rol y por HU.\nCubre flujos 200, 201, 204, validaciones 400, no autenticado 401, permisos 403, no encontrado 404 y conflictos 409.',
    schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json'
  },
  event: [
    {
      listen: 'test',
      script: {
        type: 'text/javascript',
        exec: [
          '// Test script de colección: captura de rotación de token CSRF y validación de correlación',
          'if (pm.response.headers.has("X-Correlation-Id")) {',
          '    pm.test("Cabecera X-Correlation-Id presente", function() {',
          '        pm.expect(pm.response.headers.get("X-Correlation-Id")).to.not.be.empty;',
          '    });',
          '}',
          'var sc = pm.response.headers.all().filter(function(h) { return h.key.toLowerCase() === "set-cookie"; });',
          'for (var i = 0; i < sc.length; i++) {',
          '    var m = sc[i].value.match(/XSRF-TOKEN=([^;]+)/);',
          '    if (m) {',
          '        pm.environment.set("csrf_token", m[1]);',
          '    }',
          '}'
        ]
      }
    },
    {
      listen: 'prerequest',
      script: {
        type: 'text/javascript',
        exec: [
          '// Pre-request script de colección: Gestión de cabecera CSRF',
          'var method = pm.request.method;',
          'var csrf = pm.environment.get("csrf_token");',
          'if (["POST", "PUT", "DELETE", "PATCH"].includes(method)) {',
          '    if (pm.request.headers.has("X-CSRF-Invalido")) {',
          '        pm.request.headers.remove("X-CSRF-Invalido");',
          '        pm.request.headers.upsert({ key: "X-XSRF-TOKEN", value: "token-csrf-invalido-12345" });',
          '    } else if (csrf && !pm.request.headers.has("X-Sin-CSRF")) {',
          '        pm.request.headers.upsert({ key: "X-XSRF-TOKEN", value: csrf });',
          '    }',
          '}'
        ]
      }
    }
  ],
  item: [
    // ==========================================
    // 01 - Autenticación y Cuenta (HU01, HU02, HU03)
    // ==========================================
    {
      name: '01 - Autenticación y Cuenta (HU01, HU02, HU03)',
      item: [
        crearItem(
          '01.01 - GET /auth/csrf - Obtener token CSRF inicial',
          'GET',
          '/api/v1/auth/csrf',
          [],
          null,
          [
            'pm.test("Status 200 OK", function() { pm.response.to.have.status(200); });',
            'pm.test("Cabecera X-Correlation-Id presente", function() { pm.response.to.have.header("X-Correlation-Id"); });',
            'pm.test("Token CSRF detectado", function() { pm.expect(pm.environment.get("csrf_token")).to.not.be.empty; });'
          ]
        ),
        crearItem(
          '01.02 - HU01: POST /auth/registro - Registro exitoso solicitante',
          'POST',
          '/api/v1/auth/registro',
          [],
          '{"nombre":"Lucía Solicitante Nueva","correo":"{{registro_correo}}","vinculo":"ESTUDIANTE","password":"{{demo_password}}"}',
          [
            'pm.test("Status 201 Created", function() { pm.response.to.have.status(201); });',
            'var json = pm.response.json();',
            'pm.test("Usuario registrado con rol SOLICITANTE", function() {',
            '    pm.expect(json.rol).to.eql("SOLICITANTE");',
            '    pm.expect(json.correo).to.eql(pm.environment.get("registro_correo"));',
            '});'
          ],
          [
            'pm.environment.set("registro_correo", "lucia.qa." + Date.now() + "@unmsm.edu.pe");'
          ]
        ),
        crearItem(
          '01.03 - HU01: POST /auth/registro - Validación 400 correo inválido',
          'POST',
          '/api/v1/auth/registro',
          [],
          {
            nombre: 'Juan Pérez',
            correo: 'correo-invalido-sin-formato',
            vinculo: 'ESTUDIANTE',
            password: '{{demo_password}}'
          },
          [
            'pm.test("Status 400 Bad Request", function() { pm.response.to.have.status(400); });',
            'var json = pm.response.json();',
            'pm.test("ErrorApi con código DATOS_INVALIDOS", function() {',
            '    pm.expect(json.codigo).to.eql("DATOS_INVALIDOS");',
            '    pm.expect(json.id_correlacion).to.not.be.empty;',
            '});'
          ]
        ),
        crearItem(
          '01.04 - HU02: POST /auth/login - Credenciales inválidas 401',
          'POST',
          '/api/v1/auth/login',
          [],
          {
            correo: 'solicitante@msu.test',
            password: 'ClaveIncorrecta123!'
          },
          [
            'pm.test("Status 401 Unauthorized", function() { pm.response.to.have.status(401); });',
            'var json = pm.response.json();',
            'pm.test("ErrorApi CREDENCIALES_INVALIDAS", function() {',
            '    pm.expect(json.codigo).to.eql("CREDENCIALES_INVALIDAS");',
            '});'
          ]
        ),
        crearItem(
          '01.05 - HU02: POST /auth/login - Validación 400 correo vacío',
          'POST',
          '/api/v1/auth/login',
          [],
          {
            correo: '',
            password: '{{demo_password}}'
          },
          [
            'pm.test("Status 400 Bad Request", function() { pm.response.to.have.status(400); });',
            'var json = pm.response.json();',
            'pm.test("ErrorApi DATOS_INVALIDOS", function() {',
            '    pm.expect(json.codigo).to.eql("DATOS_INVALIDOS");',
            '});'
          ]
        ),
        crearItem(
          '01.06 - HU02: POST /auth/login - Login exitoso como Solicitante',
          'POST',
          '/api/v1/auth/login',
          [],
          {
            correo: '{{solicitante_email}}',
            password: '{{demo_password}}'
          },
          [
            'pm.test("Status 200 OK", function() { pm.response.to.have.status(200); });',
            'var json = pm.response.json();',
            'pm.test("Perfil de solicitante retornado", function() {',
            '    pm.expect(json.correo).to.eql(pm.environment.get("solicitante_email"));',
            '    pm.expect(json.rol).to.eql("SOLICITANTE");',
            '});',
            'pm.test("Cookie HttpOnly MSU_SESION emitida", function() {',
            '    var setCookie = pm.response.headers.get("Set-Cookie");',
            '    pm.expect(setCookie).to.include("MSU_SESION=");',
            '});'
          ]
        ),
        crearItem(
          '01.07 - HU03: GET /me - Consultar perfil de la sesión',
          'GET',
          '/api/v1/me',
          [],
          null,
          [
            'pm.test("Status 200 OK", function() { pm.response.to.have.status(200); });',
            'var json = pm.response.json();',
            'pm.test("Correo coincide con el usuario autenticado", function() {',
            '    pm.expect(json.correo).to.eql(pm.environment.get("solicitante_email"));',
            '});'
          ]
        ),
        crearItem(
          '01.08 - HU03: PUT /me - Actualizar datos de perfil',
          'PUT',
          '/api/v1/me',
          [],
          {
            nombre: 'Ana Solicitante Actualizada',
            vinculo: 'ESTUDIANTE'
          },
          [
            'pm.test("Status 200 OK", function() { pm.response.to.have.status(200); });',
            'var json = pm.response.json();',
            'pm.test("Nombre actualizado", function() {',
            '    pm.expect(json.nombre).to.eql("Ana Solicitante Actualizada");',
            '});'
          ]
        ),
        crearItem(
          '01.09 - HU03: PUT /me/password - Cambiar contraseña exitoso (204)',
          'PUT',
          '/api/v1/me/password',
          [],
          {
            actual: '{{demo_password}}',
            nueva: 'NuevaClaveSegura2026!',
            confirmacion: 'NuevaClaveSegura2026!'
          },
          [
            'pm.test("Status 204 No Content", function() { pm.response.to.have.status(204); });',
            'pm.test("Cookie de sesión renovada tras cambio de password", function() {',
            '    var setCookie = pm.response.headers.get("Set-Cookie");',
            '    pm.expect(setCookie).to.include("MSU_SESION=");',
            '});'
          ]
        ),
        crearItem(
          '01.10 - HU03: PUT /me/password - Restaurar contraseña demo',
          'PUT',
          '/api/v1/me/password',
          [],
          {
            actual: 'NuevaClaveSegura2026!',
            nueva: '{{demo_password}}',
            confirmacion: '{{demo_password}}'
          },
          [
            'pm.test("Status 204 No Content", function() { pm.response.to.have.status(204); });'
          ]
        )
      ]
    },

    // ==========================================
    // 02 - Solicitudes - Solicitante (HU04, HU05, HU06, HU23, HU24)
    // ==========================================
    {
      name: '02 - Solicitudes - Solicitante (HU04, HU05, HU06, HU23, HU24)',
      item: [
        crearItem(
          '02.01 - GET /catalogos - Consultar opciones de catálogo para formulario',
          'GET',
          '/api/v1/catalogos',
          [],
          null,
          [
            'pm.test("Status 200 OK", function() { pm.response.to.have.status(200); });',
            'var json = pm.response.json();',
            'pm.test("Contiene categorias, ubicaciones, prioridades", function() {',
            '    pm.expect(json.categorias).to.be.an("array").that.is.not.empty;',
            '    pm.expect(json.ubicaciones).to.be.an("array").that.is.not.empty;',
            '    pm.expect(json.prioridades).to.be.an("array").that.is.not.empty;',
            '});'
          ]
        ),
        crearItem(
          '02.02 - HU04: POST /solicitudes - Validación 400 descripción menor a 20 caracteres',
          'POST',
          '/api/v1/solicitudes',
          [],
          {
            categoria_id: 2,
            ubicacion_id: 1,
            referencia: 'Aula 101',
            descripcion: 'Muy corta',
            urgencia: 'ALTA',
            impacto: 'ALTO'
          },
          [
            'pm.test("Status 400 Bad Request", function() { pm.response.to.have.status(400); });',
            'var json = pm.response.json();',
            'pm.test("Error en campo descripcion", function() {',
            '    pm.expect(json.codigo).to.eql("DATOS_INVALIDOS");',
            '    var tieneError = json.errores.some(function(e) { return e.campo === "descripcion"; });',
            '    pm.expect(tieneError).to.be.true;',
            '});'
          ]
        ),
        crearItem(
          '02.03 - HU04: POST /solicitudes - Registrar solicitud exitosamente',
          'POST',
          '/api/v1/solicitudes',
          [],
          {
            categoria_id: 2,
            ubicacion_id: 1,
            referencia: 'Junto a la pizarra del aula 101',
            descripcion: 'El proyector interactivo del aula 101 no enciende y se requiere para la clase de la tarde.',
            urgencia: 'ALTA',
            impacto: 'MEDIO'
          },
          [
            'pm.test("Status 201 Created", function() { pm.response.to.have.status(201); });',
            'var json = pm.response.json();',
            'pm.test("Código MSU generado y plazos calculados", function() {',
            '    pm.expect(json.codigo).to.match(/MSU-\\d{4}-\\d{4}/);',
            '    pm.expect(json.estado_codigo).to.eql("REGISTRADA");',
            '    pm.expect(json.id).to.be.a("number");',
            '    pm.environment.set("solicitud_id", json.id);',
            '    pm.environment.set("solicitud_codigo", json.codigo);',
            '    pm.environment.set("solicitud_version", json.version);',
            '});'
          ]
        ),
        crearItem(
          '02.04 - HU05: GET /solicitudes - Listar mis solicitudes con paginación',
          'GET',
          '/api/v1/solicitudes',
          [],
          null,
          [
            'pm.test("Status 200 OK", function() { pm.response.to.have.status(200); });',
            'var json = pm.response.json();',
            'pm.test("Estructura paginada items, pagina, tamaño, total", function() {',
            '    pm.expect(json.items).to.be.an("array");',
            '    pm.expect(json.pagina).to.eql(1);',
            '    pm.expect(json.total).to.be.at.least(1);',
            '});'
          ]
        ),
        crearItem(
          '02.05 - HU05: GET /solicitudes/{id} - Ver detalle de solicitud registrada',
          'GET',
          '/api/v1/solicitudes/{{solicitud_id}}',
          [],
          null,
          [
            'pm.test("Status 200 OK", function() { pm.response.to.have.status(200); });',
            'var json = pm.response.json();',
            'pm.test("Detalle coincide con la solicitud", function() {',
            '    pm.expect(json.id).to.eql(Number(pm.environment.get("solicitud_id")));',
            '    pm.expect(json.codigo).to.eql(pm.environment.get("solicitud_codigo"));',
            '});'
          ]
        ),
        crearItem(
          '02.06 - HU05: GET /solicitudes/{id} - 404 No encontrado ID inexistente',
          'GET',
          '/api/v1/solicitudes/999999',
          [],
          null,
          [
            'pm.test("Status 404 Not Found", function() { pm.response.to.have.status(404); });',
            'var json = pm.response.json();',
            'pm.test("ErrorApi NO_ENCONTRADO", function() {',
            '    pm.expect(json.codigo).to.eql("NO_ENCONTRADO");',
            '});'
          ]
        ),
        crearItem(
          '02.07 - HU06: POST /solicitudes/{id}/comentarios - Agregar comentario',
          'POST',
          '/api/v1/solicitudes/{{solicitud_id}}/comentarios',
          [],
          {
            texto: 'Adjunto información adicional: el cable de poder fue verificado.'
          },
          [
            'pm.test("Status 201 Created", function() { pm.response.to.have.status(201); });',
            'var json = pm.response.json();',
            'pm.test("Comentario creado con autor y fecha", function() {',
            '    pm.expect(json.texto).to.include("el cable de poder fue verificado");',
            '    pm.expect(json.autor_nombre).to.not.be.empty;',
            '    pm.environment.set("comentario_id", json.id);',
            '});'
          ]
        ),
        crearItem(
          '02.08 - HU06: POST /solicitudes/{id}/comentarios - Validación 400 texto vacío',
          'POST',
          '/api/v1/solicitudes/{{solicitud_id}}/comentarios',
          [],
          {
            texto: ''
          },
          [
            'pm.test("Status 400 Bad Request", function() { pm.response.to.have.status(400); });',
            'var json = pm.response.json();',
            'pm.test("ErrorApi DATOS_INVALIDOS", function() {',
            '    pm.expect(json.codigo).to.eql("DATOS_INVALIDOS");',
            '});'
          ]
        ),
        crearItem(
          '02.09 - HU06: GET /solicitudes/{id}/comentarios - Listar comentarios',
          'GET',
          '/api/v1/solicitudes/{{solicitud_id}}/comentarios',
          [],
          null,
          [
            'pm.test("Status 200 OK", function() { pm.response.to.have.status(200); });',
            'var json = pm.response.json();',
            'pm.test("Lista contiene al menos un comentario", function() {',
            '    pm.expect(json).to.be.an("array").that.is.not.empty;',
            '});'
          ]
        ),
        crearItem(
          '02.10 - HU06: GET /solicitudes/{id}/evidencias - Listar evidencias iniciales',
          'GET',
          '/api/v1/solicitudes/{{solicitud_id}}/evidencias',
          [],
          null,
          [
            'pm.test("Status 200 OK", function() { pm.response.to.have.status(200); });',
            'var json = pm.response.json();',
            'pm.test("Respuesta es un arreglo", function() {',
            '    pm.expect(json).to.be.an("array");',
            '});'
          ]
        ),
        crearItem(
          '02.11 - HU23: GET /solicitudes/{id}/historial - Consultar historial de eventos',
          'GET',
          '/api/v1/solicitudes/{{solicitud_id}}/historial',
          [],
          null,
          [
            'pm.test("Status 200 OK", function() { pm.response.to.have.status(200); });',
            'var json = pm.response.json();',
            'pm.test("Historial contiene eventos con acción registrada", function() {',
            '    pm.expect(json).to.be.an("array").that.is.not.empty;',
            '    pm.expect(json[0].accion).to.not.be.empty;',
            '});'
          ]
        ),
        crearItem(
          '02.12 - HU13: GET /solicitudes/{id}/encuesta - 204 No Content en caso aún no cerrado',
          'GET',
          '/api/v1/solicitudes/{{solicitud_id}}/encuesta',
          [],
          null,
          [
            'pm.test("Status 204 No Content (sin encuesta aún)", function() {',
            '    pm.response.to.have.status(204);',
            '});'
          ]
        ),
        crearItem(
          '02.13 - HU13: POST /solicitudes/{id}/encuesta - 409 Conflicto por caso no cerrado',
          'POST',
          '/api/v1/solicitudes/{{solicitud_id}}/encuesta',
          [],
          {
            calificacion: 5,
            comentario: 'Buena atención'
          },
          [
            'pm.test("Status 409 Conflict (no está cerrada)", function() {',
            '    pm.response.to.have.status(409);',
            '});',
            'var json = pm.response.json();',
            'pm.test("Error ENCUESTA_NO_DISPONIBLE", function() {',
            '    pm.expect(json.codigo).to.eql("ENCUESTA_NO_DISPONIBLE");',
            '});'
          ]
        )
      ]
    },

    // ==========================================
    // 03 - Supervisión (HU07, HU08, HU09, HU17, HU18, HU19)
    // ==========================================
    {
      name: '03 - Supervisión (HU07, HU08, HU09, HU17, HU18, HU19)',
      item: [
        crearItem(
          '03.01 - Login como Supervisor',
          'POST',
          '/api/v1/auth/login',
          [],
          {
            correo: '{{supervisor_email}}',
            password: '{{demo_password}}'
          },
          [
            'pm.test("Status 200 OK", function() { pm.response.to.have.status(200); });',
            'var json = pm.response.json();',
            'pm.test("Sesión de SUPERVISOR", function() {',
            '    pm.expect(json.rol).to.eql("SUPERVISOR");',
            '});'
          ]
        ),
        crearItem(
          '03.02 - RF10: GET /supervision/tecnicos - Carga de trabajo por técnico',
          'GET',
          '/api/v1/supervision/tecnicos?area_id=1',
          [],
          null,
          [
            'pm.test("Status 200 OK", function() { pm.response.to.have.status(200); });',
            'var json = pm.response.json();',
            'pm.test("Lista de técnicos devuelta", function() {',
            '    pm.expect(json).to.be.an("array").that.is.not.empty;',
            '    pm.expect(json[0]).to.have.property("nombre");',
            '    pm.expect(json[0]).to.have.property("pendientes");',
            '    var tomas = json.find(function(t) { return t.nombre === "Tomás Soporte"; });',
            '    pm.environment.set("tecnico_soporte_id", tomas ? tomas.id : 2);',
            '});'
          ]
        ),
        crearItem(
          '03.03 - HU07: POST /solicitudes/{id}/evaluacion - Validación 400 motivo obligatorio al cambiar impacto',
          'POST',
          '/api/v1/solicitudes/{{solicitud_id}}/evaluacion',
          [],
          '{"impacto":"ALTO","motivo":"","version":{{solicitud_version}}}',
          [
            'pm.test("Status 400 Bad Request", function() { pm.response.to.have.status(400); });',
            'var json = pm.response.json();',
            'pm.test("DATOS_INVALIDOS", function() {',
            '    pm.expect(json.codigo).to.eql("DATOS_INVALIDOS");',
            '});'
          ]
        ),
        crearItem(
          '03.04 - HU07: POST /solicitudes/{id}/evaluacion - Iniciar evaluación y subir impacto',
          'POST',
          '/api/v1/solicitudes/{{solicitud_id}}/evaluacion',
          [],
          '{"impacto":"ALTO","motivo":"Afecta el dictado continuo de las clases programadas en la tarde.","version":{{solicitud_version}}}',
          [
            'pm.test("Status 200 OK", function() { pm.response.to.have.status(200); });',
            'var json = pm.response.json();',
            'pm.test("Estado EN_EVALUACION y nueva versión", function() {',
            '    pm.expect(json.estado_codigo).to.eql("EN_EVALUACION");',
            '    pm.expect(json.prioridad_codigo).to.eql("CRITICA");',
            '    pm.environment.set("solicitud_version", json.version);',
            '});'
          ]
        ),
        crearItem(
          '03.05 - HU08: POST /solicitudes/{id}/asignaciones - Asignar técnico Tomás Soporte',
          'POST',
          '/api/v1/solicitudes/{{solicitud_id}}/asignaciones',
          [],
          '{"tecnico_id":{{tecnico_soporte_id}},"motivo":"Asignación inmediata por prioridad Crítica.","version":{{solicitud_version}}}',
          [
            'pm.test("Status 200 OK", function() { pm.response.to.have.status(200); });',
            'var json = pm.response.json();',
            'pm.test("Estado ASIGNADA y técnico asociado", function() {',
            '    pm.expect(json.estado_codigo).to.eql("ASIGNADA");',
            '    pm.expect(json.tecnico_id).to.eql(Number(pm.environment.get("tecnico_soporte_id")));',
            '    pm.environment.set("solicitud_version", json.version);',
            '});'
          ]
        ),
        crearItem(
          '03.06 - HU17/HU18: GET /indicadores - Dashboard de indicadores del supervisor',
          'GET',
          '/api/v1/indicadores',
          [],
          null,
          [
            'pm.test("Status 200 OK", function() { pm.response.to.have.status(200); });',
            'var json = pm.response.json();',
            'pm.test("Contiene conteos y tiempos", function() {',
            '    pm.expect(json).to.have.property("conteos");',
            '    pm.expect(json).to.have.property("tiempos");',
            '    pm.expect(json.conteos).to.have.property("registradas");',
            '});'
          ]
        ),
        crearItem(
          '03.07 - HU19: GET /reportes/solicitudes.csv - Exportar CSV de solicitudes',
          'GET',
          '/api/v1/reportes/solicitudes.csv',
          [],
          null,
          [
            'pm.test("Status 200 OK", function() { pm.response.to.have.status(200); });',
            'pm.test("Content-Type text/csv", function() {',
            '    var ct = pm.response.headers.get("Content-Type");',
            '    pm.expect(ct).to.include("text/csv");',
            '});'
          ]
        )
      ]
    },

    // ==========================================
    // 04 - Atención Técnica (HU10, HU11)
    // ==========================================
    {
      name: '04 - Atención Técnica (HU10, HU11)',
      item: [
        crearItem(
          '04.01 - Login como Técnico Tomás Soporte',
          'POST',
          '/api/v1/auth/login',
          [],
          {
            correo: '{{tecnico_soporte_email}}',
            password: '{{demo_password}}'
          },
          [
            'pm.test("Status 200 OK", function() { pm.response.to.have.status(200); });',
            'var json = pm.response.json();',
            'pm.test("Sesión de TECNICO", function() {',
            '    pm.expect(json.rol).to.eql("TECNICO");',
            '});'
          ]
        ),
        crearItem(
          '04.02 - HU10: POST /solicitudes/{id}/inicio - Iniciar atención técnica',
          'POST',
          '/api/v1/solicitudes/{{solicitud_id}}/inicio',
          [],
          '{"version":{{solicitud_version}}}',
          [
            'pm.test("Status 200 OK", function() { pm.response.to.have.status(200); });',
            'var json = pm.response.json();',
            'pm.test("Estado pasa a EN_ATENCION", function() {',
            '    pm.expect(json.estado_codigo).to.eql("EN_ATENCION");',
            '    pm.environment.set("solicitud_version", json.version);',
            '});'
          ]
        ),
        crearItem(
          '04.03 - HU11: POST /solicitudes/{id}/resoluciones - Validación 400 solución muy corta',
          'POST',
          '/api/v1/solicitudes/{{solicitud_id}}/resoluciones',
          [],
          '{"solucion":"Listo","version":{{solicitud_version}}}',
          [
            'pm.test("Status 400 Bad Request", function() { pm.response.to.have.status(400); });',
            'var json = pm.response.json();',
            'pm.test("DATOS_INVALIDOS por solución insuficiente", function() {',
            '    pm.expect(json.codigo).to.eql("DATOS_INVALIDOS");',
            '});'
          ]
        ),
        crearItem(
          '04.04 - HU11: POST /solicitudes/{id}/resoluciones - Registrar solución técnica',
          'POST',
          '/api/v1/solicitudes/{{solicitud_id}}/resoluciones',
          [],
          '{"solucion":"Se sustituyó el cable de señal defectuoso y se ajustaron los conectores de video. El proyector quedó calibrado y operativo.","version":{{solicitud_version}}}',
          [
            'pm.test("Status 200 OK", function() { pm.response.to.have.status(200); });',
            'var json = pm.response.json();',
            'pm.test("Estado pasa a RESUELTA", function() {',
            '    pm.expect(json.estado_codigo).to.eql("RESUELTA");',
            '    pm.environment.set("solicitud_version", json.version);',
            '});'
          ]
        )
      ]
    },

    // ==========================================
    // 05 - Cierre y Encuesta (HU12, HU13)
    // ==========================================
    {
      name: '05 - Cierre y Encuesta (HU12, HU13)',
      item: [
        crearItem(
          '05.01 - Login como Solicitante',
          'POST',
          '/api/v1/auth/login',
          [],
          {
            correo: '{{solicitante_email}}',
            password: '{{demo_password}}'
          },
          [
            'pm.test("Status 200 OK", function() { pm.response.to.have.status(200); });'
          ]
        ),
        crearItem(
          '05.02 - HU12: POST /solicitudes/{id}/conformidad - Confirmar solución',
          'POST',
          '/api/v1/solicitudes/{{solicitud_id}}/conformidad',
          [],
          '{"accion":"CONFIRMAR","motivo":"Verificación exitosa","version":{{solicitud_version}}}',
          [
            'pm.test("Status 200 OK", function() { pm.response.to.have.status(200); });',
            'var json = pm.response.json();',
            'pm.test("Solicitud queda CERRADA", function() {',
            '    pm.expect(json.estado_codigo).to.eql("CERRADA");',
            '    pm.environment.set("solicitud_version", json.version);',
            '});'
          ]
        ),
        crearItem(
          '05.03 - HU13: POST /solicitudes/{id}/encuesta - Registrar calificación 5 estrellas',
          'POST',
          '/api/v1/solicitudes/{{solicitud_id}}/encuesta',
          [],
          {
            calificacion: 5,
            comentario: 'Atención rápida y el técnico explicó claramente la causa del fallo.'
          },
          [
            'pm.test("Status 201 Created", function() { pm.response.to.have.status(201); });',
            'var json = pm.response.json();',
            'pm.test("Encuesta registrada con éxito", function() {',
            '    pm.expect(json.calificacion).to.eql(5);',
            '});'
          ]
        ),
        crearItem(
          '05.04 - HU13: POST /solicitudes/{id}/encuesta - 409 Conflicto por duplicada',
          'POST',
          '/api/v1/solicitudes/{{solicitud_id}}/encuesta',
          [],
          {
            calificacion: 4,
            comentario: 'Intentando enviar otra encuesta'
          },
          [
            'pm.test("Status 409 Conflict", function() { pm.response.to.have.status(409); });',
            'var json = pm.response.json();',
            'pm.test("ENCUESTA_DUPLICADA", function() {',
            '    pm.expect(json.codigo).to.eql("ENCUESTA_DUPLICADA");',
            '});'
          ]
        ),
        crearItem(
          '05.05 - HU13: GET /solicitudes/{id}/encuesta - Consultar encuesta registrada',
          'GET',
          '/api/v1/solicitudes/{{solicitud_id}}/encuesta',
          [],
          null,
          [
            'pm.test("Status 200 OK", function() { pm.response.to.have.status(200); });',
            'var json = pm.response.json();',
            'pm.test("Encuesta consultada tiene calificación 5", function() {',
            '    pm.expect(json.calificacion).to.eql(5);',
            '});'
          ]
        )
      ]
    },

    // ==========================================
    // 06 - Notificaciones (HU15, HU16)
    // ==========================================
    {
      name: '06 - Notificaciones (HU15, HU16)',
      item: [
        crearItem(
          '06.01 - HU16: GET /notificaciones - Listar avisos del usuario',
          'GET',
          '/api/v1/notificaciones',
          [],
          null,
          [
            'pm.test("Status 200 OK", function() { pm.response.to.have.status(200); });',
            'var json = pm.response.json();',
            'pm.test("Items de notificaciones", function() {',
            '    pm.expect(json).to.have.property("items");',
            '    if (json.items && json.items.length > 0) {',
            '        pm.environment.set("notificacion_id", json.items[0].id);',
            '    }',
            '});'
          ]
        ),
        crearItem(
          '06.02 - HU16: GET /notificaciones/no-leidas - Conteo de no leídas',
          'GET',
          '/api/v1/notificaciones/no-leidas',
          [],
          null,
          [
            'pm.test("Status 200 OK", function() { pm.response.to.have.status(200); });',
            'var json = pm.response.json();',
            'pm.test("Propiedad total presente", function() {',
            '    pm.expect(json).to.have.property("total");',
            '});'
          ]
        ),
        crearItem(
          '06.03 - HU16: PUT /notificaciones/lectura - Marcar todas como leídas',
          'PUT',
          '/api/v1/notificaciones/lectura',
          [],
          null,
          [
            'pm.test("Status 200 OK", function() { pm.response.to.have.status(200); });'
          ]
        )
      ]
    },

    // ==========================================
    // 07 - Administración (HU20, HU21, HU22, HU23)
    // ==========================================
    {
      name: '07 - Administración (HU20, HU21, HU22, HU23)',
      item: [
        crearItem(
          '07.01 - Login como Administrador',
          'POST',
          '/api/v1/auth/login',
          [],
          {
            correo: '{{admin_email}}',
            password: '{{demo_password}}'
          },
          [
            'pm.test("Status 200 OK", function() { pm.response.to.have.status(200); });',
            'var json = pm.response.json();',
            'pm.test("Sesión de ADMINISTRADOR", function() {',
            '    pm.expect(json.rol).to.eql("ADMINISTRADOR");',
            '});'
          ]
        ),
        crearItem(
          '07.02 - HU20: GET /admin/usuarios - Listar usuarios internos',
          'GET',
          '/api/v1/admin/usuarios',
          [],
          null,
          [
            'pm.test("Status 200 OK", function() { pm.response.to.have.status(200); });',
            'var json = pm.response.json();',
            'pm.test("Listado de usuarios retornado", function() {',
            '    pm.expect(json.items).to.be.an("array").that.is.not.empty;',
            '});'
          ]
        ),
        crearItem(
          '07.03 - HU20: POST /admin/usuarios - Crear usuario técnico',
          'POST',
          '/api/v1/admin/usuarios',
          [],
          '{"nombre":"Nuevo Técnico QA","correo":"{{nuevo_tecnico_correo}}","rol":"TECNICO","area_id":1,"password":"{{demo_password}}"}',
          [
            'pm.test("Status 201 Created", function() { pm.response.to.have.status(201); });',
            'var json = pm.response.json();',
            'pm.test("Usuario creado", function() {',
            '    pm.expect(json.rol).to.eql("TECNICO");',
            '    pm.environment.set("nuevo_usuario_id", json.id);',
            '});'
          ],
          [
            'pm.environment.set("nuevo_tecnico_correo", "tec.qa." + Date.now() + "@msu.test");'
          ]
        ),
        crearItem(
          '07.04 - HU20: PUT /admin/usuarios/{id} - Modificar usuario interno',
          'PUT',
          '/api/v1/admin/usuarios/{{nuevo_usuario_id}}',
          [],
          {
            nombre: 'Nuevo Técnico QA Modificado',
            rol: 'TECNICO',
            area_id: 1,
            activo: true
          },
          [
            'pm.test("Status 200 OK", function() { pm.response.to.have.status(200); });',
            'var json = pm.response.json();',
            'pm.test("Nombre actualizado", function() {',
            '    pm.expect(json.nombre).to.eql("Nuevo Técnico QA Modificado");',
            '});'
          ]
        ),
        crearItem(
          '07.05 - HU21: GET /admin/catalogos/{tipo} - Listar áreas',
          'GET',
          '/api/v1/admin/catalogos/areas',
          [],
          null,
          [
            'pm.test("Status 200 OK", function() { pm.response.to.have.status(200); });',
            'var json = pm.response.json();',
            'pm.test("Catálogo de áreas retornado", function() {',
            '    pm.expect(json.items).to.be.an("array").that.is.not.empty;',
            '});'
          ]
        ),
        crearItem(
          '07.06 - HU21: POST /admin/catalogos/{tipo} - Crear categoría nueva',
          'POST',
          '/api/v1/admin/catalogos/categorias',
          [],
          '{"nombre":"{{nueva_categoria_nombre}}","area_id":1,"activo":true}',
          [
            'pm.test("Status 201 Created", function() { pm.response.to.have.status(201); });',
            'var json = pm.response.json();',
            'pm.test("Ítem de catálogo creado", function() {',
            '    pm.expect(json.nombre).to.eql(pm.environment.get("nueva_categoria_nombre"));',
            '    pm.environment.set("catalogo_item_id", json.id);',
            '});'
          ],
          [
            'pm.environment.set("nueva_categoria_nombre", "Categoría QA " + Date.now().toString().slice(-4));'
          ]
        ),
        crearItem(
          '07.07 - HU21: DELETE /admin/catalogos/{tipo}/{id} - Desactivar ítem de catálogo (borrado lógico)',
          'DELETE',
          '/api/v1/admin/catalogos/categorias/{{catalogo_item_id}}',
          [],
          null,
          [
            'pm.test("Status 200 OK (desactivación lógica)", function() {',
            '    pm.response.to.have.status(200);',
            '});',
            'var json = pm.response.json();',
            'pm.test("Ítem marcado como inactivo", function() {',
            '    pm.expect(json.activo).to.be.false;',
            '});'
          ]
        ),
        crearItem(
          '07.08 - HU22: GET /admin/politicas - Consultar políticas de plazos',
          'GET',
          '/api/v1/admin/politicas',
          [],
          null,
          [
            'pm.test("Status 200 OK", function() { pm.response.to.have.status(200); });',
            'var json = pm.response.json();',
            'pm.test("Lista de políticas retornada con versión vigente", function() {',
            '    pm.expect(json).to.be.an("array").that.is.not.empty;',
            '    pm.expect(json[0].vigente).to.be.true;',
            '});'
          ]
        ),
        crearItem(
          '07.09 - HU22: POST /admin/politicas - Validación 400 primera atención mayor que resolución',
          'POST',
          '/api/v1/admin/politicas',
          [],
          {
            version_base: 1,
            detalles: [
              { prioridad_codigo: 'CRITICA', horas_primera_atencion: 10, horas_resolucion: 2 },
              { prioridad_codigo: 'ALTA', horas_primera_atencion: 8, horas_resolucion: 48 },
              { prioridad_codigo: 'MEDIA', horas_primera_atencion: 24, horas_resolucion: 120 },
              { prioridad_codigo: 'BAJA', horas_primera_atencion: 48, horas_resolucion: 240 }
            ]
          },
          [
            'pm.test("Status 400 Bad Request", function() { pm.response.to.have.status(400); });',
            'var json = pm.response.json();',
            'pm.test("DATOS_INVALIDOS en matriz", function() {',
            '    pm.expect(json.codigo).to.eql("DATOS_INVALIDOS");',
            '});'
          ]
        ),
        crearItem(
          '07.10 - HU23: GET /admin/auditoria - Consultar bitácora administrativa',
          'GET',
          '/api/v1/admin/auditoria',
          [],
          null,
          [
            'pm.test("Status 200 OK", function() { pm.response.to.have.status(200); });',
            'var json = pm.response.json();',
            'pm.test("Lista de eventos de auditoría", function() {',
            '    pm.expect(json.items).to.be.an("array");',
            '});'
          ]
        ),
        crearItem(
          '07.11 - HU23: GET /admin/auditoria/opciones - Filtros de auditoría',
          'GET',
          '/api/v1/admin/auditoria/opciones',
          [],
          null,
          [
            'pm.test("Status 200 OK", function() { pm.response.to.have.status(200); });',
            'var json = pm.response.json();',
            'pm.test("Acciones y entidades disponibles", function() {',
            '    pm.expect(json).to.have.property("acciones");',
            '    pm.expect(json).to.have.property("entidades");',
            '});'
          ]
        )
      ]
    },

    // ==========================================
    // 08 - Seguridad y Control de Acceso (401, 403, CSRF)
    // ==========================================
    {
      name: '08 - Seguridad y Control de Acceso (401, 403, CSRF)',
      item: [
        crearItem(
          '08.01 - Login como Solicitante para pruebas de RBAC',
          'POST',
          '/api/v1/auth/login',
          [],
          {
            correo: '{{solicitante_email}}',
            password: '{{demo_password}}'
          },
          [
            'pm.test("Status 200 OK", function() { pm.response.to.have.status(200); });'
          ]
        ),
        crearItem(
          '08.02 - RBAC: Solicitante intenta acceder a /admin/usuarios (403 Prohibido)',
          'GET',
          '/api/v1/admin/usuarios',
          [],
          null,
          [
            'pm.test("Status 403 Forbidden", function() { pm.response.to.have.status(403); });',
            'var json = pm.response.json();',
            'pm.test("ErrorApi ACCESO_DENEGADO", function() {',
            '    pm.expect(json.codigo).to.eql("ACCESO_DENEGADO");',
            '});'
          ]
        ),
        crearItem(
          '08.03 - RBAC: Solicitante intenta acceder a /indicadores (403 Prohibido)',
          'GET',
          '/api/v1/indicadores',
          [],
          null,
          [
            'pm.test("Status 403 Forbidden", function() { pm.response.to.have.status(403); });',
            'var json = pm.response.json();',
            'pm.test("ErrorApi ACCESO_DENEGADO", function() {',
            '    pm.expect(json.codigo).to.eql("ACCESO_DENEGADO");',
            '});'
          ]
        ),
        crearItem(
          '08.04 - CSRF: Petición con token CSRF inválido responde 403',
          'POST',
          '/api/v1/solicitudes',
          [{ key: 'X-CSRF-Invalido', value: 'true' }],
          {
            categoria_id: 2,
            ubicacion_id: 1,
            referencia: 'Prueba',
            descripcion: 'Intento con CSRF inválido para verificar rechazo de seguridad.',
            urgencia: 'ALTA',
            impacto: 'MEDIO'
          },
          [
            'pm.test("Status 403 Forbidden", function() { pm.response.to.have.status(403); });',
            'var json = pm.response.json();',
            'pm.test("Rechazo por CSRF inválido", function() {',
            '    pm.expect(json.codigo).to.eql("CSRF_INVALIDO");',
            '});'
          ]
        ),
        crearItem(
          '08.05 - HU02: POST /auth/logout - Cerrar sesión y revocar JWT',
          'POST',
          '/api/v1/auth/logout',
          [],
          null,
          [
            'pm.test("Status 204 No Content", function() { pm.response.to.have.status(204); });'
          ]
        ),
        crearItem(
          '08.06 - HU02: GET /me sin sesión responde 401 Sin Sesión',
          'GET',
          '/api/v1/me',
          [{ key: 'Cookie', value: 'MSU_SESION=token_invalido_expirado' }],
          null,
          [
            'pm.test("Status 401 Unauthorized", function() { pm.response.to.have.status(401); });',
            'var json = pm.response.json();',
            'pm.test("ErrorApi SIN_SESION", function() {',
            '    pm.expect(json.codigo).to.eql("SIN_SESION");',
            '});'
          ]
        )
      ]
    }
  ]
};

const destino = path.join(__dirname, 'colecciones', 'MSU-API.postman_collection.json');
fs.writeFileSync(destino, JSON.stringify(collection, null, 2), 'utf-8');
console.log('Colección generada con éxito en:', destino);
