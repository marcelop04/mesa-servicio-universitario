terraform {
  required_version = ">= 1.9, < 2.0"
  required_providers {
    oci = {
      source  = "oracle/oci"
      version = "~> 7.0"
    }
  }
}

# La autenticación vive en ~/.oci/config, nunca en tfvars ni en Git.
provider "oci" {
  region              = var.region
  config_file_profile = var.oci_profile
}

data "oci_identity_availability_domains" "disponibles" {
  compartment_id = var.compartment_id
}

data "oci_core_images" "ubuntu" {
  compartment_id           = var.compartment_id
  operating_system         = "Canonical Ubuntu"
  operating_system_version = "24.04"
  shape                    = "VM.Standard.A1.Flex"
  sort_by                  = "TIMECREATED"
  sort_order               = "DESC"
}

resource "oci_core_vcn" "msu" {
  compartment_id = var.compartment_id
  cidr_blocks    = ["10.42.0.0/16"]
  display_name   = "msu-gratuito"
  dns_label      = "msu"
}

resource "oci_core_internet_gateway" "publico" {
  compartment_id = var.compartment_id
  vcn_id         = oci_core_vcn.msu.id
  display_name   = "msu-internet"
  enabled        = true
}

resource "oci_core_route_table" "publica" {
  compartment_id = var.compartment_id
  vcn_id         = oci_core_vcn.msu.id
  route_rules {
    destination       = "0.0.0.0/0"
    destination_type  = "CIDR_BLOCK"
    network_entity_id = oci_core_internet_gateway.publico.id
  }
}

resource "oci_core_security_list" "web" {
  compartment_id = var.compartment_id
  vcn_id         = oci_core_vcn.msu.id
  display_name   = "msu-ssh-http-https"

  egress_security_rules {
    protocol    = "all"
    destination = "0.0.0.0/0"
  }

  dynamic "ingress_security_rules" {
    for_each = toset(["80", "443"])
    content {
      protocol = "6"
      source   = "0.0.0.0/0"
      tcp_options {
        min = tonumber(ingress_security_rules.value)
        max = tonumber(ingress_security_rules.value)
      }
    }
  }

  ingress_security_rules {
    protocol = "6"
    source   = var.ssh_cidr
    tcp_options {
      min = 22
      max = 22
    }
  }

  ingress_security_rules {
    protocol = "1"
    source   = "0.0.0.0/0"
    icmp_options {
      type = 3
      code = 4
    }
  }
}

resource "oci_core_subnet" "publica" {
  compartment_id    = var.compartment_id
  vcn_id            = oci_core_vcn.msu.id
  cidr_block        = "10.42.1.0/24"
  dns_label         = "publica"
  display_name      = "msu-publica"
  route_table_id    = oci_core_route_table.publica.id
  security_list_ids = [oci_core_security_list.web.id]
}

# Valores fijos para un único servidor dentro del cupo Always Free consultado.
# Comprobar el cupo libre de TODA la cuenta antes de ejecutar terraform apply.
resource "oci_core_instance" "msu" {
  compartment_id      = var.compartment_id
  availability_domain = data.oci_identity_availability_domains.disponibles.availability_domains[var.availability_domain_index].name
  display_name        = "msu-always-free"
  shape               = "VM.Standard.A1.Flex"
  shape_config {
    ocpus         = 2
    memory_in_gbs = 12
  }
  source_details {
    source_type             = "image"
    source_id               = data.oci_core_images.ubuntu.images[0].id
    boot_volume_size_in_gbs = 50
  }
  create_vnic_details {
    subnet_id        = oci_core_subnet.publica.id
    assign_public_ip = true
    hostname_label   = "msu"
  }
  metadata = {
    ssh_authorized_keys = trimspace(var.ssh_public_key)
    user_data = base64encode("#cloud-config\n${yamlencode({
      write_files = [{
        path        = "/usr/local/sbin/preparar-msu"
        permissions = "0755"
        content     = file("${path.module}/../scripts/preparar-vm.sh")
      }]
      runcmd = [["bash", "/usr/local/sbin/preparar-msu"]]
    })}")
  }
}
