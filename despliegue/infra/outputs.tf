output "ip_publica" {
  value = oci_core_instance.msu.public_ip
}

output "hostname_gratuito" {
  value = "msu-${replace(oci_core_instance.msu.public_ip, ".", "-")}.sslip.io"
}

output "ssh" {
  value = "ssh ubuntu@${oci_core_instance.msu.public_ip}"
}
