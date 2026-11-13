#!/usr/bin/env bash
# Sustituye la base y las evidencias del proyecto indicado por MSU_ENV_FILE.
set -Eeuo pipefail
# shellcheck source=comun.sh
source "$(dirname -- "${BASH_SOURCE[0]}")/comun.sh"
if [[ $# != 2 || $2 != --confirmar-sustitucion ]]; then
    echo 'Uso: restaurar.sh DIRECTORIO_COPIA --confirmar-sustitucion' >&2
    exit 1
fi
copia="$(cd -- "$1" && pwd)"
bloquear
validar_configuracion
for archivo in mysql.sql.gz evidencias.tar.gz imagenes.env metadatos.txt SHA256SUMS; do
    [[ -f "$copia/$archivo" ]] || { echo "Falta $archivo en la copia." >&2; exit 1; }
done
(
    cd -- "$copia"
    sha256sum --check --status SHA256SUMS
)
gzip --test "$copia/mysql.sql.gz"
tar -tzf "$copia/evidencias.tar.gz" >/dev/null

# La restauración requiere las imágenes de la copia para respetar su versión de Flyway.
cp -- "$MSU_RELEASE_FILE" "$MSU_RELEASE_FILE.antes-restaurar"
dc stop --timeout 40 backend >/dev/null
trap 'echo "La restauración falló: backend detenido; revisar antes de reanudar." >&2' ERR
dc up -d --wait --wait-timeout 240 mysql
# MYSQL_* se expande en el contenedor, no en el host.
# shellcheck disable=SC2016
dc exec -T mysql sh -c \
    'MYSQL_PWD="$MYSQL_ROOT_PASSWORD" exec mysql --user=root --execute="DROP DATABASE IF EXISTS mesa_servicios; CREATE DATABASE mesa_servicios CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"'
# shellcheck disable=SC2016
gzip -dc "$copia/mysql.sql.gz" | dc exec -T mysql sh -c \
    'MYSQL_PWD="$MYSQL_PASSWORD" exec mysql --user="$MYSQL_USER" "$MYSQL_DATABASE"'
dc run --rm --no-deps -T archivos sh -c \
    'find /evidencias -mindepth 1 -delete && tar -xzpf - -C /evidencias' < "$copia/evidencias.tar.gz"
cp -- "$copia/imagenes.env" "$MSU_RELEASE_FILE"
dc up -d --wait --wait-timeout 240 backend frontend
trap - ERR
echo 'Restauración terminada: SQL, evidencias y versión de imágenes recuperados.'
