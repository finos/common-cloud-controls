output "resource_name" {
  value = google_compute_network.good.name
}

output "receiver_vpc_id" {
  value = google_compute_network.good.id
}
