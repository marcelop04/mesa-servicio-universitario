#!/usr/bin/env bash
# Prueba destructiva SOLO sobre un proyecto Docker efímero; nunca usa el .env de producción.
set -Eeuo pipefail
RAIZ="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/../.." && pwd)"
trabajo="$(mktemp -d)"
# El entorno del operador no puede seleccionar el proyecto/credenciales de producción.
unset DB_USER DB_PASSWORD MYSQL_ROOT_PASSWORD JWT_SECRET DEMO_PASSWORD APP_HOST ACME_EMAIL
unset DATOS_DEMO DATOS_DEMO_SOLICITUDES TAREAS_HABILITADAS
unset MSU_PERFIL_ESPERADO
export COMPOSE_PROJECT_NAME="msu-recuperacion-$$"
export SPRING_PROFILES_ACTIVE=prueba
export SEGURIDAD_DESPLIEGUE=false
export BACKEND_IMAGE=msu-backend:prueba
export FRONTEND_IMAGE=msu-frontend:prueba
export MSU_LOCK_HELD=0
export MSU_ENV_FILE="$trabajo/prueba.env"
export MSU_RELEASE_FILE="$trabajo/imagenes.env"
export MSU_BACKUP_DIR="$trabajo/backups"
export MSU_LOCK_FILE="$trabajo/operacion.lock"
python3 "$RAIZ/despliegue/scripts/crear-entorno.py" --host prueba.example.org \
    --email pruebas@example.org --perfil prueba --demo --salida "$MSU_ENV_FILE"
printf 'BACKEND_IMAGE=msu-backend:prueba\nFRONTEND_IMAGE=msu-frontend:prueba\n' > "$MSU_RELEASE_FILE"
# shellcheck source=comun.sh
source "$RAIZ/despliegue/scripts/comun.sh"
limpiar() {
    local estado=$?
    trap - EXIT
    if [[ $estado != 0 ]]; then
        dc logs --tail 120 mysql backend frontend >&2 || true
        for servicio in mysql backend frontend; do
            contenedor="$(dc ps --all --quiet "$servicio")"
            if [[ -n $contenedor ]]; then
                docker inspect --format '{{json .State.Health}}' "$contenedor" >&2 || true
            fi
        done
    fi
    dc down --volumes --remove-orphans >/dev/null || true
    rm -rf -- "$trabajo"
    exit "$estado"
}
trap limpiar EXIT
validar_configuracion
# Regresión: un .env de prueba con siembra no puede reutilizarse como prod.
if (export SPRING_PROFILES_ACTIVE=prod SEGURIDAD_DESPLIEGUE=true; validar_configuracion); then
    echo 'ERROR: se aceptó la configuración antigua prod con demo.' >&2
    exit 1
fi
dc up -d --wait --wait-timeout 300 mysql backend frontend
sql() {
    # shellcheck disable=SC2016
    dc exec -T mysql sh -c 'MYSQL_PWD="$MYSQL_PASSWORD" exec mysql --batch --skip-column-names --user="$MYSQL_USER" "$MYSQL_DATABASE"' <<< "$1"
}
sql "CREATE TABLE prueba_recuperacion (id INT PRIMARY KEY, valor VARCHAR(100)); INSERT INTO prueba_recuperacion VALUES (1, 'antes de la copia');"
dc exec -T backend sh -c "printf 'Evidencia RNF11\n' > /app/archivos/prueba-rnf11.txt"
hash_original="$(dc exec -T backend sha256sum /app/archivos/prueba-rnf11.txt)"
bash "$DIRECTORIO/scripts/backup.sh"
copias=("$MSU_BACKUP_DIR"/msu-*)
copia="${copias[0]}"
sql "UPDATE prueba_recuperacion SET valor='dato perdido'; CREATE TABLE posterior_a_la_copia (id INT);"
dc exec -T backend sh -c "printf 'archivo perdido' > /app/archivos/prueba-rnf11.txt; printf 'sobrante' > /app/archivos/sobrante.txt"

# Una copia truncada debe rechazarse ANTES de parar el backend o cambiar la base.
cp -a -- "$copia" "$trabajo/copia-corrupta"
printf 'corrupcion' >> "$trabajo/copia-corrupta/mysql.sql.gz"
if bash "$DIRECTORIO/scripts/restaurar.sh" "$trabajo/copia-corrupta" --confirmar-sustitucion; then
    echo 'ERROR: se aceptó una copia corrupta.' >&2
    exit 1
fi
activo backend
[[ $(sql 'SELECT valor FROM prueba_recuperacion WHERE id=1;') == 'dato perdido' ]]

bash "$DIRECTORIO/scripts/restaurar.sh" "$copia" --confirmar-sustitucion
[[ $(sql 'SELECT valor FROM prueba_recuperacion WHERE id=1;') == 'antes de la copia' ]]
[[ $(sql "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='mesa_servicios' AND table_name='posterior_a_la_copia';") == 0 ]]
[[ $(dc exec -T backend sha256sum /app/archivos/prueba-rnf11.txt) == "$hash_original" ]]
dc exec -T backend test ! -e /app/archivos/sobrante.txt
dc exec -T backend sh -c "printf 'escritura tras restaurar' >> /app/archivos/prueba-rnf11.txt"
[[ $(sql 'SELECT COUNT(*) FROM usuario;') -ge 6 ]]
echo 'RNF11 OK: corrupción rechazada; SQL, archivos y permisos recuperados; aplicación saludable.'
