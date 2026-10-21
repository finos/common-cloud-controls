output "resource_name" {
  value = aws_vpc.good.tags["Name"]
}

output "receiver_vpc_id" {
  value = aws_vpc.good.id
}

output "vm_subnet_id" {
  value = aws_subnet.vm.id
}

output "aws_flow_log_group_name" {
  value = aws_cloudwatch_log_group.flow_logs.name
}
