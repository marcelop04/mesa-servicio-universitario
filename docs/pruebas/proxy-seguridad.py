"""C1: prueba Nginx/Caddy reales con upstream ficticio, TLS local y recursos Docker propios.

No usa MySQL, cuentas, .env, puertos ni volúmenes existentes. No es DAST ni prueba de nube.
Ejecutar desde la raíz: python docs/pruebas/proxy-seguridad.py --frontend msu-frontend:prueba
"""
import argparse
from contextlib import ExitStack
import json
from pathlib import Path
import ssl
import subprocess
import tempfile
import time
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen
from uuid import uuid4

RAIZ = Path(__file__).resolve().parents[2]
SERVIDOR = '''
from http.server import BaseHTTPRequestHandler, HTTPServer
import json
class Api(BaseHTTPRequestHandler):
    def do_GET(self):
        self.send_response(401 if self.path == '/api/v1/me' else 200)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Content-Security-Policy', "default-src *; script-src 'unsafe-inline'")
        self.send_header('Referrer-Policy', 'unsafe-url')
        self.end_headers()
        self.wfile.write(json.dumps({'real_ip': self.headers.get('X-Real-IP'),
            'forwarded': self.headers.get('Forwarded'),
            'forwarded_for': self.headers.get('X-Forwarded-For'),
            'proto': self.headers.get('X-Forwarded-Proto')}).encode())
    def log_message(self, *args): pass
HTTPServer(('0.0.0.0', 8080), Api).serve_forever()
'''


def docker(*args):
    return subprocess.run(['docker', *args], check=True, capture_output=True, text=True).stdout.strip()


def quitar(*args):
    subprocess.run(['docker', *args], capture_output=True, check=False)


def comprobar_cabeceras(respuesta):
    esperado = {'X-Frame-Options': 'DENY', 'X-Content-Type-Options': 'nosniff',
                'Referrer-Policy': 'no-referrer', 'Cache-Control': 'no-store'}
    for nombre, valor in esperado.items():
        assert respuesta.headers.get_all(nombre) == [valor], f'Cabecera ausente/duplicada: {nombre}'
    csp = respuesta.headers.get_all('Content-Security-Policy', [])
    assert len(csp) == 1 and "frame-ancestors 'none'" in csp[0], 'CSP ausente/duplicada'
    assert "script-src 'self';" in csp[0] and "'unsafe-eval'" not in csp[0], 'CSP de scripts insegura'
    assert respuesta.headers.get('Permissions-Policy'), 'Falta Permissions-Policy'


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--frontend', default='msu-frontend:seguridad-c')
    args = parser.parse_args()
    prefijo = 'msu-c-' + uuid4().hex[:12]
    with ExitStack() as limpieza, tempfile.TemporaryDirectory(prefix='msu-proxy-c-') as tmp:
        temporal = Path(tmp)
        (temporal / 'api.py').write_text(SERVIDOR, encoding='utf-8')
        # Única diferencia respecto al proxy real: CA local en lugar de ACME público.
        config = (RAIZ / 'despliegue/Caddyfile').read_text(encoding='utf-8')
        config = config.replace('{$APP_HOST} {', '{$APP_HOST} {\n\ttls internal')
        (temporal / 'Caddyfile').write_text(config, encoding='utf-8')
        docker('network', 'create', prefijo)
        limpieza.callback(quitar, 'network', 'rm', prefijo)

        def iniciar(nombre, *opciones):
            completo = prefijo + '-' + nombre
            docker('run', '--rm', '-d', '--name', completo, '--network', prefijo, *opciones)
            limpieza.callback(quitar, 'rm', '-f', completo)
            return completo

        iniciar('api', '--network-alias', 'backend', '--mount',
                f'type=bind,source={temporal / "api.py"},target=/api.py,readonly',
                'python:3.12-alpine', 'python', '/api.py')
        nginx = iniciar('web', '--network-alias', 'frontend', '-p', '127.0.0.1::80', args.frontend)
        caddy = iniciar('tls', '-p', '127.0.0.1::443', '-e', 'APP_HOST=localhost',
                        '-e', 'ACME_EMAIL=pruebas@example.org', '--mount',
                        f'type=bind,source={temporal / "Caddyfile"},target=/etc/caddy/Caddyfile,readonly',
                        'caddy:2-alpine')
        puerto_http = docker('port', nginx, '80/tcp').rsplit(':', 1)[1]
        puerto_tls = docker('port', caddy, '443/tcp').rsplit(':', 1)[1]
        certificado = temporal / 'root.crt'
        for intento in range(30):
            try:
                docker('cp', f'{caddy}:/data/caddy/pki/authorities/local/root.crt', str(certificado))
                break
            except subprocess.CalledProcessError:
                if intento == 29:
                    raise
                time.sleep(1)
        contexto = ssl.create_default_context(cafile=str(certificado))
        for esquema, puerto in [('http', puerto_http), ('https', puerto_tls)]:
            for ruta in ['/', '/healthz', '/api/v1/auth/csrf', '/api/v1/me']:
                req = Request(f'{esquema}://localhost:{puerto}{ruta}', headers={
                    'X-Real-IP': '203.0.113.250', 'Forwarded': 'for=203.0.113.250;proto=http',
                    'X-Forwarded-For': '203.0.113.250', 'X-Forwarded-Proto': 'http'})
                for intento in range(30):
                    try:
                        respuesta = urlopen(req, context=contexto, timeout=10)
                        break
                    except HTTPError as error:
                        if error.code == 502 and intento < 29:
                            error.close()
                            time.sleep(1)
                            continue
                        respuesta = error
                        break
                    except URLError:
                        if intento == 29:
                            raise
                        time.sleep(1)
                with respuesta:
                    assert respuesta.status == (401 if ruta.endswith('/me') else 200), f'Estado: {ruta}'
                    comprobar_cabeceras(respuesta)
                    if esquema == 'https':
                        assert respuesta.headers.get_all('Strict-Transport-Security') == ['max-age=31536000']
                    if ruta.startswith('/api/') and esquema == 'https':
                        recibido = json.load(respuesta)
                        assert recibido['forwarded'] is None, 'Forwarded del cliente llegó al backend'
                        assert recibido['real_ip'] != '203.0.113.250', 'Se confió en X-Real-IP del cliente'
                        assert '203.0.113.250' not in recibido['forwarded_for'], 'Se confió en X-Forwarded-For del cliente'
                        assert recibido['proto'] == 'https', 'Protocolo falsificado'
                print(f'OK {esquema} {ruta}: cabeceras únicas y política de seguridad')
        print('C1 proxy local aprobado. TLS confía solo en la CA efímera de esta prueba.')


if __name__ == '__main__':
    main()
