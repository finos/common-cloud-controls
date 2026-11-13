# Single cheap VPC for cloud-api driver coverage (VM subnet + flow logs).
# Multi-VPC / non-compliant topologies belong in external CFI fixtures.

resource "aws_vpc" "good" {
  cidr_block = "10.90.0.0/16"
  tags = merge(var.common_tags, {
    Name          = "finos-ccc-integration-vpc"
    CFIControlSet = "CCC.VPC"
  })
}

resource "aws_subnet" "good_public" {
  vpc_id                  = aws_vpc.good.id
  cidr_block              = "10.90.1.0/24"
  map_public_ip_on_launch = false
  tags = merge(var.common_tags, {
    Name = "finos-ccc-integration-vpc-public"
  })
}

resource "aws_internet_gateway" "good" {
  vpc_id = aws_vpc.good.id
  tags   = var.common_tags
}

# Pin the AZ: left unset, AWS can place this in a constrained zone (us-east-1e)
# that does not offer the VM instance type.
data "aws_ec2_instance_type_offerings" "vm" {
  location_type = "availability-zone"
  filter {
    name   = "instance-type"
    values = [var.vm_instance_type]
  }
}

resource "aws_subnet" "vm" {
  vpc_id                  = aws_vpc.good.id
  cidr_block              = "10.90.2.0/24"
  map_public_ip_on_launch = true
  availability_zone       = sort(data.aws_ec2_instance_type_offerings.vm.locations)[0]
  tags = merge(var.common_tags, {
    Name = "finos-ccc-integration-vm-subnet"
  })
}

resource "aws_route_table" "good_public" {
  vpc_id = aws_vpc.good.id
  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.good.id
  }
  tags = var.common_tags
}

resource "aws_route_table_association" "good_public" {
  subnet_id      = aws_subnet.good_public.id
  route_table_id = aws_route_table.good_public.id
}

resource "aws_route_table_association" "vm" {
  subnet_id      = aws_subnet.vm.id
  route_table_id = aws_route_table.good_public.id
}

resource "aws_cloudwatch_log_group" "flow_logs" {
  name              = "/aws/vpc/flow-logs/${aws_vpc.good.tags["Name"]}"
  retention_in_days = 7
  tags              = var.common_tags
}

resource "aws_iam_role" "flow_logs" {
  name = "finos-ccc-integration-cn04-flowlogs-role"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Principal = {
        Service = "vpc-flow-logs.amazonaws.com"
      }
      Action = "sts:AssumeRole"
    }]
  })
  tags = var.common_tags
}

resource "aws_iam_role_policy" "flow_logs" {
  name = "finos-ccc-integration-cn04-flowlogs-policy"
  role = aws_iam_role.flow_logs.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Action = [
        "logs:CreateLogStream",
        "logs:DescribeLogGroups",
        "logs:DescribeLogStreams",
        "logs:PutLogEvents"
      ]
      Resource = [
        aws_cloudwatch_log_group.flow_logs.arn,
        "${aws_cloudwatch_log_group.flow_logs.arn}:*"
      ]
    }]
  })
}

resource "aws_flow_log" "good" {
  vpc_id               = aws_vpc.good.id
  log_destination_type = "cloud-watch-logs"
  log_destination      = aws_cloudwatch_log_group.flow_logs.arn
  iam_role_arn         = aws_iam_role.flow_logs.arn
  traffic_type         = "ALL"
  tags                 = var.common_tags
}
