import type { ExampleSource } from "../index";

/** AWS (Amazon EC2) variants of each example: a Linux application server. */
export const EXAMPLES: ExampleSource[] = [
  {
    example: "basic",
    description: "An EC2 instance in the default VPC with a public IP and SSH open to the world, relying on AWS defaults for everything else.",
    code: `provider "aws" {
  region = "eu-west-2"
}

data "aws_ami" "al2023" {
  most_recent = true
  owners      = ["amazon"]

  filter {
    name   = "name"
    values = ["al2023-ami-*-x86_64"]
  }
}

resource "aws_key_pair" "admin" {
  key_name   = "admin"
  public_key = file("~/.ssh/id_ed25519.pub")
}

resource "aws_security_group" "app" {
  name = "app-server"

  ingress {
    from_port   = 22
    to_port     = 22
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

resource "aws_instance" "app" {
  ami                         = data.aws_ami.al2023.id
  instance_type               = "t3.micro"
  key_name                    = aws_key_pair.admin.key_name
  vpc_security_group_ids      = [aws_security_group.app.id]
  associate_public_ip_address = true

  tags = {
    Name = "app-server"
  }
}
`,
  },
  {
    example: "intermediate",
    description:
      "The instance gets its own VPC, an encrypted root volume, IMDSv2 and the CloudWatch agent, and SSH is limited to the office range. It still has a public IP serving HTTPS to the internet, no customer-managed key, no CloudTrail and no backups.",
    code: `provider "aws" {
  region = "eu-west-2"
}

data "aws_ami" "al2023" {
  most_recent = true
  owners      = ["amazon"]

  filter {
    name   = "name"
    values = ["al2023-ami-*-x86_64"]
  }
}

resource "aws_vpc" "main" {
  cidr_block = "10.20.0.0/16"
}

resource "aws_subnet" "public" {
  vpc_id                  = aws_vpc.main.id
  cidr_block              = "10.20.1.0/24"
  map_public_ip_on_launch = true
}

resource "aws_security_group" "app" {
  name   = "app-server"
  vpc_id = aws_vpc.main.id

  ingress {
    description = "SSH from the office"
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = ["203.0.113.0/24"]
  }

  ingress {
    description = "HTTPS from anywhere"
    from_port   = 443
    to_port     = 443
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

resource "aws_iam_role" "app" {
  name = "app-server"
  assume_role_policy = jsonencode({
    Version   = "2012-10-17"
    Statement = [{ Effect = "Allow", Action = "sts:AssumeRole", Principal = { Service = "ec2.amazonaws.com" } }]
  })
}

resource "aws_iam_role_policy_attachment" "cloudwatch_agent" {
  role       = aws_iam_role.app.name
  policy_arn = "arn:aws:iam::aws:policy/CloudWatchAgentServerPolicy"
}

resource "aws_iam_instance_profile" "app" {
  name = "app-server"
  role = aws_iam_role.app.name
}

resource "aws_instance" "app" {
  ami                    = data.aws_ami.al2023.id
  instance_type          = "t3.micro"
  subnet_id              = aws_subnet.public.id
  vpc_security_group_ids = [aws_security_group.app.id]
  iam_instance_profile   = aws_iam_instance_profile.app.name
  key_name               = "admin"

  root_block_device {
    encrypted   = true
    volume_type = "gp3"
  }

  metadata_options {
    http_tokens = "required"
  }

  tags = {
    Name = "app-server"
  }
}
`,
  },
  {
    example: "hardened",
    description: "A private instance with no inbound access (administered through Session Manager), customer-managed EBS encryption, IMDSv2, CloudTrail, the CloudWatch agent and cross-region AWS Backup copies.",
    code: `provider "aws" {
  region = "eu-west-2"
}

# Backup copies go to a second trusted region (CCC.Core.CN08)
provider "aws" {
  alias  = "dr"
  region = "eu-west-1"
}

data "aws_ami" "al2023" {
  most_recent = true
  owners      = ["amazon"]

  filter {
    name   = "name"
    values = ["al2023-ami-*-x86_64"]
  }
}

resource "aws_kms_key" "ebs" {
  description             = "EBS volumes for app servers"
  enable_key_rotation     = true # CCC.Core.CN11: rotate the key...
  rotation_period_in_days = 90   # ...well within 180 days
}

resource "aws_vpc" "main" {
  cidr_block = "10.20.0.0/16"
}

resource "aws_subnet" "private" {
  vpc_id     = aws_vpc.main.id
  cidr_block = "10.20.1.0/24"
}

# No ingress rules: no SSH or RDP from anywhere (CCC.Core.CN05)
resource "aws_security_group" "app" {
  name   = "app-server"
  vpc_id = aws_vpc.main.id

  egress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

resource "aws_iam_role" "app" {
  name = "app-server"
  assume_role_policy = jsonencode({
    Version   = "2012-10-17"
    Statement = [{ Effect = "Allow", Action = "sts:AssumeRole", Principal = { Service = "ec2.amazonaws.com" } }]
  })
}

# Session Manager instead of SSH keys (CCC.Core.CN03)
resource "aws_iam_role_policy_attachment" "ssm" {
  role       = aws_iam_role.app.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore"
}

# CloudWatch agent ships OS and login logs off the instance (CCC.Core.CN09)
resource "aws_iam_role_policy_attachment" "cloudwatch_agent" {
  role       = aws_iam_role.app.name
  policy_arn = "arn:aws:iam::aws:policy/CloudWatchAgentServerPolicy"
}

resource "aws_iam_instance_profile" "app" {
  name = "app-server"
  role = aws_iam_role.app.name
}

resource "aws_instance" "app" {
  ami                         = data.aws_ami.al2023.id
  instance_type               = "t3.micro"
  subnet_id                   = aws_subnet.private.id
  vpc_security_group_ids      = [aws_security_group.app.id]
  iam_instance_profile        = aws_iam_instance_profile.app.name
  associate_public_ip_address = false # CCC.Core.CN05: not reachable from the internet

  root_block_device {
    encrypted  = true                # CCC.Core.CN02
    kms_key_id = aws_kms_key.ebs.arn # CCC.Core.CN11: customer-managed key
  }

  metadata_options {
    http_tokens                 = "required" # IMDSv2 (CCC.Core.CN03)
    http_put_response_hop_limit = 1
  }

  tags = {
    Name = "app-server"
  }
}

# Management events kept beyond 90 days (CCC.Core.CN04)
resource "aws_cloudtrail" "main" {
  name                  = "management-events"
  s3_bucket_name        = "acme-cloudtrail-logs"
  is_multi_region_trail = true
}

resource "aws_backup_vault" "primary" {
  name = "app-primary"
}

resource "aws_backup_vault" "dr" {
  provider = aws.dr
  name     = "app-dr"
}

resource "aws_backup_plan" "daily" {
  name = "app-daily"

  rule {
    rule_name         = "daily"
    target_vault_name = aws_backup_vault.primary.name
    schedule          = "cron(0 3 * * ? *)"

    copy_action {
      destination_vault_arn = aws_backup_vault.dr.arn # CCC.Core.CN08
    }
  }
}

resource "aws_backup_selection" "app" {
  name         = "app-servers"
  plan_id      = aws_backup_plan.daily.id
  iam_role_arn = "arn:aws:iam::123456789012:role/service-role/AWSBackupDefaultServiceRole"
  resources    = [aws_instance.app.arn]
}
`,
  },
];
