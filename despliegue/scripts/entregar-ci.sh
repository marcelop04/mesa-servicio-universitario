#!/usr/bin/env bash
# Transporte común de los jobs de entrega. El workflow valida CI/origen antes de invocarlo.
set -Eeuo pipefail
for variable in SOURCE_SHA DEPLOY_HOST DEPLOY_USER SSH_PRIVATE_KEY SSH_KNOWN_HOSTS PRODUCTION_ENV BACKEND_IMAGE FRONTEND_IMAGE GH_TOKEN GITHUB_ACTOR RUNNER_TEMP; do
    [[ -n ${!variable:-} ]] || { echo "Falta la variable de entrega $variable." >&2; exit 1; }
done
[[ $SOURCE_SHA =~ ^[a-f0-9]{40}$ ]]
[[ $DEPLOY_HOST =~ ^[a-zA-Z0-9][a-zA-Z0-9.-]+$ ]]
[[ $DEPLOY_USER =~ ^[a-z_][a-z0-9_-]*$ ]]
for imagen in "$BACKEND_IMAGE" "$FRONTEND_IMAGE"; do
    [[ $imagen =~ ^ghcr\.io/[a-z0-9._/-]+@sha256:[a-f0-9]{64}$ ]]
done
umask 077
temporal="$(mktemp -d "$RUNNER_TEMP/msu.XXXXXX")"
conectado=0
limpiar() {
    if [[ $conectado == 1 ]]; then
        ssh "${opciones[@]}" "$destino" 'docker logout ghcr.io >/dev/null' || true
    fi
    rm -rf -- "$temporal"
}
trap limpiar EXIT
# Normaliza los finales de línea al cargar secretos desde un equipo Windows.
printf '%s\n' "$SSH_PRIVATE_KEY" | tr -d '\r' > "$temporal/clave"
printf '%s\n' "$SSH_KNOWN_HOSTS" | tr -d '\r' > "$temporal/known_hosts"
printf '%s\n' "$PRODUCTION_ENV" | tr -d '\r' > "$temporal/produccion.env"
ssh-keygen -F "$DEPLOY_HOST" -f "$temporal/known_hosts" >/dev/null
opciones=(-i "$temporal/clave" -o "UserKnownHostsFile=$temporal/known_hosts" -o StrictHostKeyChecking=yes -o IdentitiesOnly=yes -o BatchMode=yes -o ConnectTimeout=20)
destino="$DEPLOY_USER@$DEPLOY_HOST"
remoto="/opt/msu/entregas/$SOURCE_SHA"
# SHA/digests validados: estas variables se expanden deliberadamente en el runner.
# shellcheck disable=SC2029
tar -czf - despliegue | ssh "${opciones[@]}" "$destino" "umask 077; mkdir -p '$remoto'; tar -xzf - -C '$remoto'"
scp "${opciones[@]}" "$temporal/produccion.env" "$destino:/opt/msu/shared/produccion.env.nueva"
ssh "${opciones[@]}" "$destino" 'chmod 600 /opt/msu/shared/produccion.env.nueva; mv /opt/msu/shared/produccion.env.nueva /opt/msu/shared/produccion.env'
conectado=1
# shellcheck disable=SC2029
printf '%s' "$GH_TOKEN" | ssh "${opciones[@]}" "$destino" "docker login ghcr.io -u '$GITHUB_ACTOR' --password-stdin"
# shellcheck disable=SC2029
ssh "${opciones[@]}" "$destino" "bash '$remoto/despliegue/scripts/desplegar.sh' '$BACKEND_IMAGE' '$FRONTEND_IMAGE'"
# Backticks Markdown literales.
# shellcheck disable=SC2016
printf '### Entrega HTTPS completada\nCommit probado: `%s`\n' "$SOURCE_SHA" >> "$GITHUB_STEP_SUMMARY"
