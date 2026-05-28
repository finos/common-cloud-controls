output "resource_name" {
  value = google_compute_network.good.name
}

output "receiver_vpc_id" {
  value = google_compute_network.good.id
}

output "bad_vpc_id" {
  value = google_compute_network.bad.id
}

output "non_allowlisted_requester_vpc_id" {
  value = google_compute_network.cn03_non_allowlisted.id
}

output "allowed_requester_vpc_ids" {
  value = [
    google_compute_network.cn03_allowed_01.id,
    google_compute_network.cn03_allowed_02.id,
  ]
}

output "disallowed_requester_vpc_ids" {
  value = [
    google_compute_network.cn03_disallowed_01.id,
    google_compute_network.cn03_disallowed_02.id,
  ]
}
