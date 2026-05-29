output "resource_name" {
  value = aws_vpc.good.tags["Name"]
}

output "receiver_vpc_id" {
  value = aws_vpc.good.id
}

output "vm_subnet_id" {
  value = aws_subnet.vm.id
}

output "bad_vpc_id" {
  value = aws_vpc.bad.id
}

output "non_allowlisted_requester_vpc_id" {
  value = aws_vpc.bad.id
}

output "allowed_requester_vpc_ids" {
  value = [
    aws_vpc.cn03_allowed_01.id,
    aws_vpc.cn03_allowed_02.id,
  ]
}

output "disallowed_requester_vpc_ids" {
  value = [
    aws_vpc.cn03_disallowed_01.id,
    aws_vpc.bad.id,
  ]
}

output "aws_flow_log_group_name" {
  value = aws_cloudwatch_log_group.flow_logs.name
}
