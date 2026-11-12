#!/usr/bin/env bash
# Funciones compartidas; no se carga el .env con source/eval.
set -Eeuo pipefail
umask 077
DIRECTORIO="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
MSU_ENV_FILE="${MSU_ENV_FILE:-/opt/msu/shared/produccion.env}"
MSU_RELEASE_FILE="${MSU_RELEASE_FILE:-/opt/msu/shared/imagenes.env}"
MSU_BACKUP_DIR="${MSU_BACKUP_DIR:-/opt/msu/backups}"
MSU_LOCK_FILE="${MSU_LOCK_FILE:-$(dirname -- "$MSU_ENV_FILE")/operacion.lock}"

dc() {
    docker compose --project-directory "$DIRECTORIO" \
        --env-file "$MSU_ENV_FILE" --env-file "$MSU_RELEASE_FILE" \
        -f "$DIRECTORIO/compose.yml" "$@"
}

bloquear() {
    if [[ ${MSU_LOCK_HELD:-0} != 1 ]]; then
        exec 9>"$MSU_LOCK_FILE"
        flock --exclusive --wait 300 9
    fi
}

activo() {
    dc ps --status running --services "$1" | grep -Fxq "$1"
}

validar_configuracion() {
    # El JSON con secretos solo circula por la tubería, nunca se guarda ni se imprime.
    dc config --format json | python3 -c '
import json, re, sys
c = json.load(sys.stdin)
e = c["services"]["backend"]["environment"]
if e["SPRING_PROFILES_ACTIVE"] not in ("prod", "prueba"):
    sys.exit("El stack de nube requiere el perfil prod o prueba.")
for k in ("DB_PASSWORD", "JWT_SECRET", "DEMO_PASSWORD"):
    v = e[k]
    if len(v) < 24 or "GENERAR" in v or "solo-desarrollo" in v or "Demo12345" in v:
        sys.exit("Falta una clave aleatoria válida en " + k)
root = c["services"]["mysql"]["environment"]["MYSQL_ROOT_PASSWORD"]
if len(root) < 24 or "GENERAR" in root or root == e["DB_PASSWORD"]:
    sys.exit("MYSQL_ROOT_PASSWORD debe ser aleatoria y distinta de DB_PASSWORD.")
host = c["services"]["caddy"]["environment"]["APP_HOST"]
if not re.fullmatch(r"[a-z0-9][a-z0-9.-]+[a-z0-9]", host):
    sys.exit("APP_HOST no es un nombre DNS válido.")
'
}

host_publico() {
    dc config --format json | python3 -c \
        'import json,sys; print(json.load(sys.stdin)["services"]["caddy"]["environment"]["APP_HOST"])'
}
