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

resource "aws_vpc" "bad" {
  cidr_block = "10.91.0.0/16"
  tags = merge(var.common_tags, {
    Name          = "finos-ccc-integration-vpc-bad"
    CFIControlSet = "CCC.VPC"
    CFIVpcRole    = "bad"
  })
}

resource "aws_subnet" "bad_public" {
  vpc_id                  = aws_vpc.bad.id
  cidr_block              = "10.91.1.0/24"
  map_public_ip_on_launch = true
  tags = merge(var.common_tags, {
    Name = "finos-ccc-integration-vpc-bad-public"
  })
}

resource "aws_vpc" "cn03_allowed_01" {
  cidr_block = "10.92.0.0/20"
  tags = merge(var.common_tags, {
    Name      = "finos-ccc-integration-vpc-cn03-allowed-01"
    PeerClass = "allowed"
  })
}

resource "aws_vpc" "cn03_allowed_02" {
  cidr_block = "10.92.16.0/20"
  tags = merge(var.common_tags, {
    Name      = "finos-ccc-integration-vpc-cn03-allowed-02"
    PeerClass = "allowed"
  })
}

resource "aws_vpc" "cn03_disallowed_01" {
  cidr_block = "10.93.0.0/20"
  tags = merge(var.common_tags, {
    Name      = "finos-ccc-integration-vpc-cn03-disallowed-01"
    PeerClass = "disallowed"
  })
}

resource "aws_vpc" "cn03_disallowed_02" {
  cidr_block = "10.93.16.0/20"
  tags = merge(var.common_tags, {
    Name      = "finos-ccc-integration-vpc-cn03-disallowed-02"
    PeerClass = "disallowed"
  })
}

resource "aws_vpc" "cn03_non_allowlisted" {
  cidr_block = "10.94.0.0/20"
  tags = merge(var.common_tags, {
    Name = "finos-ccc-integration-vpc-cn03-non-allowlisted-01"
  })
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
