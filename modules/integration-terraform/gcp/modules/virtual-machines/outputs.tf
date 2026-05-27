output "instance_id" {
  value = google_compute_instance.good.id
}

output "instance_name" {
  value = google_compute_instance.good.name
}

output "external_ip" {
  value = google_compute_instance.good.network_interface[0].access_config[0].nat_ip
}

output "listener_port" {
  value = 22
}

output "allowed_source_cidr" {
  value = "10.0.0.0/8"
}
