variable "region" { default = "ap-south-1" }
variable "project" {
  default = "bbd-it457"
  validation {
    condition     = can(regex("^[a-z][a-z0-9-]{2,17}$", var.project))
    error_message = "Use 3-18 lowercase letters/digits/hyphens starting with a letter."
  }
}
variable "instance_type" { default = "t3.micro" }
variable "demo_http" {
  type        = bool
  default     = false
  description = "Domain-free demo: public read-only HTTP, dashboard and compute through SSM tunnels."
}
variable "certificate_arn" {
  type    = string
  default = ""
  validation {
    condition     = var.certificate_arn == "" || can(regex("^arn:aws:acm:", var.certificate_arn))
    error_message = "An issued ACM certificate in the ALB region is required."
  }
}
variable "public_hostname" {
  type    = string
  default = ""
  validation {
    condition     = var.public_hostname == "" || (can(regex("^[a-zA-Z0-9.-]+$", var.public_hostname)) && !strcontains(var.public_hostname, "localhost"))
    error_message = "Supply your DNS hostname, without scheme or path."
  }
}
variable "allowed_cidrs" {
  type        = list(string)
  description = "Who can access HTTPS. Start with the team's public IPv4 CIDRs; widen deliberately for the demo."
  validation {
    condition     = length(var.allowed_cidrs) > 0 && alltrue([for cidr in var.allowed_cidrs : can(cidrnetmask(cidr))])
    error_message = "Supply valid IPv4 CIDRs."
  }
}
variable "images" {
  type = object({ frontend = string, backend = string, dashboard = string, monitoring = string })
  validation {
    condition     = alltrue([for image in values(var.images) : can(regex("^[0-9]{12}\\.dkr\\.ecr\\.[a-z0-9-]+\\.amazonaws\\.com/.+@sha256:[a-f0-9]{64}$", image))])
    error_message = "Use four private ECR image URIs pinned to sha256 digests."
  }
}
variable "backend_parameter_name" {
  type    = string
  default = "/it457/bbd/backend"
}
variable "dashboard_parameter_name" {
  type    = string
  default = "/it457/bbd/dashboard"
}
variable "create_iam" {
  type        = bool
  default     = true
  description = "Use false in restricted labs and supply an approved existing instance profile."
}
variable "existing_instance_profile" {
  type    = string
  default = ""
}
variable "enable_compute" {
  type        = bool
  default     = false
  description = "Enable only during approved load-test windows."
}
variable "backend_max_size" {
  type        = number
  default     = 3
  description = "Maximum backend instances; use 2 with an 8-vCPU account quota and two t3.micro web instances."
  validation {
    condition     = contains([1, 2, 3], var.backend_max_size)
    error_message = "Backend maximum must be 1, 2 or 3."
  }
}
variable "cpu_target" {
  type    = number
  default = 50
  validation {
    condition     = var.cpu_target >= 10 && var.cpu_target <= 90
    error_message = "CPU target must be between 10 and 90 percent."
  }
}
variable "secret_kms_key_arn" {
  type        = string
  default     = ""
  description = "Set only if SSM SecureString uses a customer-managed KMS key."
}
