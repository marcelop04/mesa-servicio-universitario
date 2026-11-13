#!/usr/bin/env bash
# RNF11: pausa todas las escrituras de la aplicación para que SQL y archivos coincidan.
set -Eeuo pipefail
# shellcheck source=comun.sh
source "$(dirname -- "${BASH_SOURCE[0]}")/comun.sh"
bloquear
validar_configuracion
mkdir -p -- "$MSU_BACKUP_DIR"
chmod 700 "$MSU_BACKUP_DIR"
temporal="$(mktemp -d "$MSU_BACKUP_DIR/.en-curso.XXXXXX")"
reanudar=0
finalizar() {
    local estado=$?
    trap - EXIT
    if [[ $reanudar == 1 ]]; then
        if ! dc start backend >/dev/null; then
            echo 'La copia terminó, pero no se pudo reanudar el backend.' >&2
            estado=1
        fi
    fi
    [[ ! -d $temporal ]] || rm -rf -- "$temporal"
    exit "$estado"
}
trap finalizar EXIT
if activo backend; then
    reanudar=1
    dc stop --timeout 40 backend >/dev/null
fi

# MYSQL_* se expande en el contenedor, no en el host.
# shellcheck disable=SC2016
dc exec -T mysql sh -c \
    'MYSQL_PWD="$MYSQL_PASSWORD" exec mysqldump --user="$MYSQL_USER" --single-transaction --triggers --hex-blob --no-tablespaces --set-gtid-purged=OFF "$MYSQL_DATABASE"' \
    | gzip > "$temporal/mysql.sql.gz"
dc run --rm --no-deps -T archivos tar -czpf - -C /evidencias . > "$temporal/evidencias.tar.gz"
cp -- "$MSU_RELEASE_FILE" "$temporal/imagenes.env"
printf 'formato=1\nfecha_utc=%s\nbase=mesa_servicios\n' "$(date -u +%FT%TZ)" > "$temporal/metadatos.txt"
(
    cd -- "$temporal"
    sha256sum mysql.sql.gz evidencias.tar.gz imagenes.env metadatos.txt > SHA256SUMS
)
destino="$MSU_BACKUP_DIR/msu-$(date -u +%Y%m%dT%H%M%SZ)-$RANDOM"
mv -- "$temporal" "$destino"

# Solo elimina copias completadas creadas por este script, después de una copia exitosa.
dias="${MSU_BACKUP_KEEP_DAYS:-7}"
if [[ ! $dias =~ ^[1-9][0-9]*$ ]]; then
    echo 'MSU_BACKUP_KEEP_DAYS debe ser un entero positivo.' >&2
    exit 1
fi
find "$MSU_BACKUP_DIR" -mindepth 1 -maxdepth 1 -type d -name 'msu-*' -mtime "+$dias" -exec rm -rf -- {} +
echo "Copia verificada por SHA-256: $destino"
