import type { ExampleSource } from "../index";

/** AWS (Secrets Manager) variants of each example. */
export const EXAMPLES: ExampleSource[] = [
  {
    example: "basic",
    description: "A database password stored in Secrets Manager with provider defaults: it is never rotated, and it lives in a region outside the trusted list.",
    code: `provider "aws" {
  region = "us-west-2"
}

variable "db_password" {
  type      = string
  sensitive = true
}

resource "aws_secretsmanager_secret" "db" {
  name = "acme/orders/db-password"
}

resource "aws_secretsmanager_secret_version" "db" {
  secret_id     = aws_secretsmanager_secret.db.id
  secret_string = var.db_password
}
`,
  },
  {
    example: "intermediate",
    description: "The secret sits in a trusted region with a trusted replica and is rotated by a Lambda, but only twice a year, well beyond the 90-day threshold.",
    code: `provider "aws" {
  region = "eu-west-2"
}

variable "db_password" {
  type      = string
  sensitive = true
}

variable "rotation_lambda_arn" {
  type        = string
  description = "Rotation function deployed by the platform team"
}

resource "aws_secretsmanager_secret" "db" {
  name                    = "acme/orders/db-password"
  recovery_window_in_days = 7

  replica {
    region = "eu-west-1"
  }
}

resource "aws_secretsmanager_secret_version" "db" {
  secret_id     = aws_secretsmanager_secret.db.id
  secret_string = var.db_password
}

resource "aws_secretsmanager_secret_rotation" "db" {
  secret_id           = aws_secretsmanager_secret.db.id
  rotation_lambda_arn = var.rotation_lambda_arn

  rotation_rules {
    automatically_after_days = 180
  }
}
`,
  },
  {
    example: "hardened",
    description: "A KMS-encrypted secret rotated every 30 days, replicated only within the trusted regions, with a policy that denies reading the superseded version.",
    code: `provider "aws" {
  region = "eu-west-2" # CCC.SecMgmt.CN02: primary copy in a trusted region
}

variable "db_password" {
  type      = string
  sensitive = true
}

variable "rotation_lambda_arn" {
  type        = string
  description = "Rotation function deployed by the platform team"
}

resource "aws_kms_key" "secrets" {
  description         = "Encrypts acme/orders secrets"
  enable_key_rotation = true
  multi_region        = true
}

resource "aws_kms_replica_key" "secrets" {
  provider        = aws.dr
  primary_key_arn = aws_kms_key.secrets.arn
}

provider "aws" {
  alias  = "dr"
  region = "eu-west-1"
}

resource "aws_secretsmanager_secret" "db" {
  name                    = "acme/orders/db-password"
  kms_key_id              = aws_kms_key.secrets.arn
  recovery_window_in_days = 30

  # CCC.SecMgmt.CN02: replicate only to trusted regions
  replica {
    region     = "eu-west-1"
    kms_key_id = aws_kms_replica_key.secrets.arn
  }
}

resource "aws_secretsmanager_secret_version" "db" {
  secret_id     = aws_secretsmanager_secret.db.id
  secret_string = var.db_password
}

# CCC.SecMgmt.CN01: rotate automatically well within the 90-day threshold
resource "aws_secretsmanager_secret_rotation" "db" {
  secret_id           = aws_secretsmanager_secret.db.id
  rotation_lambda_arn = var.rotation_lambda_arn

  rotation_rules {
    automatically_after_days = 30
  }
}

# CCC.SecMgmt.CN01: the superseded value can't be read once rotation has run
data "aws_iam_policy_document" "db" {
  statement {
    sid       = "DenyPreviousVersion"
    effect    = "Deny"
    actions   = ["secretsmanager:GetSecretValue"]
    resources = ["*"]

    principals {
      type        = "AWS"
      identifiers = ["*"]
    }

    condition {
      test     = "StringEquals"
      variable = "secretsmanager:VersionStage"
      values   = ["AWSPREVIOUS"]
    }
  }
}

resource "aws_secretsmanager_secret_policy" "db" {
  secret_arn = aws_secretsmanager_secret.db.arn
  policy     = data.aws_iam_policy_document.db.json
}
`,
  },
];
