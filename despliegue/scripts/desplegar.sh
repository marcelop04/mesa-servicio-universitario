#!/usr/bin/env bash
# Lo invoca CD con los dos digests inmutables recién publicados en GHCR.
set -Eeuo pipefail
# shellcheck source=comun.sh
source "$(dirname -- "${BASH_SOURCE[0]}")/comun.sh"
if [[ $# != 2 ]]; then
    echo 'Uso: desplegar.sh ghcr.io/...-backend@sha256:... ghcr.io/...-frontend@sha256:...' >&2
    exit 1
fi
for imagen in "$@"; do
    if [[ ! $imagen =~ ^ghcr\.io/[a-z0-9._/-]+@sha256:[a-f0-9]{64}$ ]]; then
        echo 'El despliegue requiere digests sha256 de GHCR.' >&2
        exit 1
    fi
done
bloquear
anterior="$(mktemp "$(dirname -- "$MSU_RELEASE_FILE")/.anterior.XXXXXX")"
tenia_anterior=0
cambio=0
if [[ -f $MSU_RELEASE_FILE ]]; then
    tenia_anterior=1
    cp -- "$MSU_RELEASE_FILE" "$anterior"
    validar_configuracion
    if activo mysql; then
        MSU_LOCK_HELD=1 bash "$DIRECTORIO/scripts/backup.sh"
    fi
fi
finalizar() {
    local estado=$?
    trap - EXIT
    if [[ $estado != 0 && $cambio == 1 && $tenia_anterior == 1 ]]; then
        echo 'Despliegue fallido: se recuperan las imágenes anteriores.' >&2
        cp -- "$anterior" "$MSU_RELEASE_FILE"
        dc up -d --wait --wait-timeout 240 mysql backend frontend caddy || true
        echo 'Si la migración no era retrocompatible, restaurar la copia RNF11.' >&2
    fi
    rm -f -- "$anterior"
    exit "$estado"
}
trap finalizar EXIT
nueva="$(mktemp "$(dirname -- "$MSU_RELEASE_FILE")/.imagenes.XXXXXX")"
printf 'BACKEND_IMAGE=%s\nFRONTEND_IMAGE=%s\n' "$1" "$2" > "$nueva"
mv -- "$nueva" "$MSU_RELEASE_FILE"
cambio=1
validar_configuracion
dc pull mysql backend frontend caddy archivos
commit="$(basename -- "$(dirname -- "$DIRECTORIO")")"
[[ $commit =~ ^[a-f0-9]{40}$ ]] || { echo 'La entrega debe estar en su directorio SHA.' >&2; exit 1; }
for imagen in "$@"; do
    revision="$(docker image inspect --format '{{index .Config.Labels "org.opencontainers.image.revision"}}' "$imagen")"
    [[ $revision == "$commit" ]] || { echo 'La revisión de la imagen no coincide con el SHA probado.' >&2; exit 1; }
done
dc up -d --wait --wait-timeout 300 mysql backend frontend caddy
url="https://$(host_publico)"
python3 "$DIRECTORIO/scripts/verificar-https.py" --url "$url" --reintentos 18
ln -sfn -- "$(dirname -- "$DIRECTORIO")" /opt/msu/actual
sudo install -m 0644 "$DIRECTORIO/systemd/msu-backup.service" "$DIRECTORIO/systemd/msu-backup.timer" /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now msu-backup.timer
printf 'fecha_utc=%s\ncommit=%s\nurl=%s\nbackend=%s\nfrontend=%s\n' \
    "$(date -u +%FT%TZ)" "$commit" "$url" "$1" "$2" > /opt/msu/shared/ultimo-despliegue.txt
echo "Despliegue HTTPS verificado: $url"
