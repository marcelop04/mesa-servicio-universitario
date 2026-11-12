#!/usr/bin/env bash
# Ejecutar como root en Ubuntu 24.04 (cloud-init también lo utiliza).
set -Eeuo pipefail
if [[ ${EUID} -ne 0 ]]; then
    echo 'Ejecutar con sudo.' >&2
    exit 1
fi
export DEBIAN_FRONTEND=noninteractive
apt-get update
apt-get install -y ca-certificates curl gnupg python3 openssl
install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
chmod a+r /etc/apt/keyrings/docker.asc
# shellcheck disable=SC1091
source /etc/os-release
printf 'deb [arch=%s signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu %s stable\n' \
    "$(dpkg --print-architecture)" "$VERSION_CODENAME" > /etc/apt/sources.list.d/docker.list
apt-get update
apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
systemctl enable --now docker
usermod -aG docker ubuntu
install -d -m 0750 -o ubuntu -g ubuntu /opt/msu /opt/msu/entregas /opt/msu/shared
install -d -m 0700 -o ubuntu -g ubuntu /opt/msu/backups

# OCI Ubuntu puede tener un REJECT final en INPUT además de la Security List.
# Solo se abren los puertos HTTP/HTTPS; SSH ya viene habilitado en la imagen.
for puerto in 80 443; do
    if command -v iptables >/dev/null && ! iptables -C INPUT -p tcp --dport "$puerto" -j ACCEPT 2>/dev/null; then
        iptables -I INPUT 1 -p tcp --dport "$puerto" -j ACCEPT
    fi
done
if command -v netfilter-persistent >/dev/null; then
    netfilter-persistent save
fi
if command -v ufw >/dev/null && ufw status | grep -q 'Status: active'; then
    ufw allow 80/tcp
    ufw allow 443/tcp
fi
echo 'VM lista. Reconectar por SSH para activar el grupo docker del usuario ubuntu.'
