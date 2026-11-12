variable "region" {
  description = "Home region de la cuenta; los recursos gratuitos deben crearse allí."
  type        = string
}

variable "compartment_id" {
  description = "OCID del compartimento en la cuenta Always Free."
  type        = string
}

variable "oci_profile" {
  description = "Perfil local de ~/.oci/config."
  type        = string
  default     = "DEFAULT"
}

variable "usar_creditos_trial" {
  description = "Opt-in para E5 (1 OCPU/8 GB) con créditos temporales Free Trial; false mantiene A1 Always Free (2 OCPU/12 GB). No cambia el plan de facturación."
  type        = bool
  default     = false
}

variable "ssh_public_key" {
  description = "Clave PÚBLICA ed25519/rsa de acceso. Nunca colocar la privada aquí."
  type        = string
  validation {
    condition     = can(regex("^ssh-(ed25519|rsa) ", var.ssh_public_key))
    error_message = "Se necesita una clave SSH pública."
  }
}

variable "ssh_cidr" {
  description = "Origen de SSH. 0.0.0.0/0 permite CD desde runners públicos con IP variable; solo acceso por clave."
  type        = string
  default     = "0.0.0.0/0"
  validation {
    condition     = can(cidrnetmask(var.ssh_cidr))
    error_message = "Debe ser un CIDR IPv4 válido."
  }
}

variable "availability_domain_index" {
  description = "Índice del dominio de disponibilidad (0 inicialmente; cambiar si no hay capacidad A1)."
  type        = number
  default     = 0
  validation {
    condition     = contains([0, 1, 2], var.availability_domain_index)
    error_message = "Usar 0, 1 o 2 según los dominios disponibles en la región."
  }
}
