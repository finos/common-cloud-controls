output "instance_id" {
  value = aws_instance.good.id
}

output "instance_name" {
  value = aws_instance.good.tags["Name"]
}

output "public_ip" {
  value = aws_instance.good.public_ip
}

output "listener_port" {
  value = 22
}

output "allowed_source_cidr" {
  value = "10.0.0.0/8"
}
