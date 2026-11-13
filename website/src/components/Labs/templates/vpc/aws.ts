import type { ExampleSource } from "../index";

/** AWS (Amazon VPC) variants of each example: a VPC for a two-tier web application. */
export const EXAMPLES: ExampleSource[] = [
  {
    example: "basic",
    description:
      "A typical first VPC: a public subnet that hands out public IPs, a security group open to SSH and HTTP from anywhere, and no flow logs or audit trail.",
    code: `provider "aws" {
  region = "eu-west-2"
}

resource "aws_vpc" "main" {
  cidr_block           = "10.0.0.0/16"
  enable_dns_hostnames = true

  tags = {
    Name = "acme-app"
  }
}

resource "aws_internet_gateway" "main" {
  vpc_id = aws_vpc.main.id
}

resource "aws_subnet" "public" {
  vpc_id                  = aws_vpc.main.id
  cidr_block              = "10.0.1.0/24"
  availability_zone       = "eu-west-2a"
  map_public_ip_on_launch = true
}

resource "aws_subnet" "private" {
  vpc_id            = aws_vpc.main.id
  cidr_block        = "10.0.2.0/24"
  availability_zone = "eu-west-2a"
}

resource "aws_route_table" "public" {
  vpc_id = aws_vpc.main.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.main.id
  }
}

resource "aws_route_table_association" "public" {
  subnet_id      = aws_subnet.public.id
  route_table_id = aws_route_table.public.id
}

resource "aws_security_group" "web" {
  name   = "acme-app-web"
  vpc_id = aws_vpc.main.id

  ingress {
    description = "SSH"
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    description = "HTTP"
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}
`,
  },
  {
    example: "intermediate",
    description:
      "The same VPC with the obvious holes closed: HTTPS only, SSH from the corporate range, an empty default security group and CloudTrail. But flow logs only record rejected traffic, there's no GuardDuty, and it peers with a partner account's VPC with no allow-list guardrail.",
    code: `provider "aws" {
  region = "eu-west-2"
}

resource "aws_vpc" "main" {
  cidr_block           = "10.0.0.0/16"
  enable_dns_hostnames = true

  tags = {
    Name = "acme-app"
  }
}

resource "aws_subnet" "public" {
  vpc_id                  = aws_vpc.main.id
  cidr_block              = "10.0.1.0/24"
  availability_zone       = "eu-west-2a"
  map_public_ip_on_launch = false
}

resource "aws_subnet" "private" {
  vpc_id            = aws_vpc.main.id
  cidr_block        = "10.0.2.0/24"
  availability_zone = "eu-west-2a"
}

resource "aws_default_security_group" "default" {
  vpc_id = aws_vpc.main.id
}

resource "aws_security_group" "web" {
  name   = "acme-app-web"
  vpc_id = aws_vpc.main.id
}

resource "aws_vpc_security_group_ingress_rule" "https" {
  security_group_id = aws_security_group.web.id
  ip_protocol       = "tcp"
  from_port         = 443
  to_port           = 443
  cidr_ipv4         = "0.0.0.0/0"
}

resource "aws_vpc_security_group_ingress_rule" "ssh_corporate" {
  security_group_id = aws_security_group.web.id
  ip_protocol       = "tcp"
  from_port         = 22
  to_port           = 22
  cidr_ipv4         = "10.200.0.0/16"
}

resource "aws_flow_log" "main" {
  vpc_id               = aws_vpc.main.id
  traffic_type         = "REJECT"
  log_destination_type = "s3"
  log_destination      = "arn:aws:s3:::acme-network-flow-logs"
}

resource "aws_cloudtrail" "main" {
  name                  = "acme-management-events"
  s3_bucket_name        = "acme-cloudtrail-logs"
  is_multi_region_trail = true
}

resource "aws_vpc_peering_connection" "partner" {
  vpc_id        = aws_vpc.main.id
  peer_vpc_id   = "vpc-0a1b2c3d4e5f67890"
  peer_owner_id = "111122223333"
}
`,
  },
  {
    example: "hardened",
    description:
      "A VPC configured to satisfy every statically-checkable requirement at TLP:AMBER, apart from removing the account's default VPCs, which happens outside a workload template.",
    code: `provider "aws" {
  region = "eu-west-2" # CCC.Core.CN06: trusted region
}

resource "aws_vpc" "main" {
  cidr_block           = "10.0.0.0/16"
  enable_dns_hostnames = true

  tags = {
    Name = "acme-app"
  }
}

resource "aws_subnet" "private" {
  vpc_id                  = aws_vpc.main.id
  cidr_block              = "10.0.2.0/24"
  availability_zone       = "eu-west-2a"
  map_public_ip_on_launch = false # CCC.VPC.CN02: no public IPs by default
}

# CCC.Core.CN05: the default security group allows nothing
resource "aws_default_security_group" "default" {
  vpc_id = aws_vpc.main.id
}

data "aws_ec2_managed_prefix_list" "cloudfront" {
  name = "com.amazonaws.global.cloudfront.origin-facing"
}

# CCC.Core.CN05 / CN01: HTTPS only, and only from CloudFront
resource "aws_security_group" "web" {
  name   = "acme-app-web"
  vpc_id = aws_vpc.main.id

  ingress {
    from_port       = 443
    to_port         = 443
    protocol        = "tcp"
    prefix_list_ids = [data.aws_ec2_managed_prefix_list.cloudfront.id]
  }
}

# CCC.VPC.CN04 / CCC.Core.CN07 / CN09: every flow, to a separate log bucket
resource "aws_flow_log" "main" {
  vpc_id               = aws_vpc.main.id
  traffic_type         = "ALL"
  log_destination_type = "s3"
  log_destination      = "arn:aws:s3:::acme-network-flow-logs"
}

# CCC.Core.CN04: record every network configuration change
resource "aws_cloudtrail" "main" {
  name                  = "acme-management-events"
  s3_bucket_name        = "acme-cloudtrail-logs"
  is_multi_region_trail = true
}

# CCC.Core.CN07: alert on port probes and sweeps
resource "aws_guardduty_detector" "main" {
  enable = true
}

# CCC.VPC.CN03: only allow-listed VPCs can be peered (normally applied from the management account)
resource "aws_organizations_policy" "vpc_peering_allowlist" {
  name = "vpc-peering-allowlist"
  type = "SERVICE_CONTROL_POLICY"
  content = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Sid      = "DenyPeeringOutsideAllowList"
      Effect   = "Deny"
      Action   = ["ec2:CreateVpcPeeringConnection", "ec2:AcceptVpcPeeringConnection"]
      Resource = "*"
      Condition = {
        StringNotEquals = {
          "ec2:AccepterVpc"  = ["arn:aws:ec2:eu-west-2:444455556666:vpc/vpc-0shared0services0"]
          "ec2:RequesterVpc" = ["arn:aws:ec2:eu-west-2:444455556666:vpc/vpc-0shared0services0"]
        }
      }
    }]
  })
}

resource "aws_organizations_policy_attachment" "workloads" {
  policy_id = aws_organizations_policy.vpc_peering_allowlist.id
  target_id = "ou-ab12-workload1"
}
`,
  },
];
