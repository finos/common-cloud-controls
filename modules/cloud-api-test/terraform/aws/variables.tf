variable "region" {
  type    = string
  default = "us-east-1"
}

variable "vm_instance_type" {
  type    = string
  default = "t3.micro"
}

variable "k8s_version" {
  type        = string
  description = "EKS Kubernetes version for the integration cluster."
  default     = "1.31"
}

variable "webhook_probe_image" {
  type        = string
  description = <<-EOT
    Container image for the in-cluster CN11.AR03 admission-webhook probe.
    Default is a pause stand-in so the Deployment exists; pin a real probe digest before behavioural CN11.AR03 runs.
  EOT
  default     = "public.ecr.aws/eks-distro/kubernetes/pause:3.9"
}
