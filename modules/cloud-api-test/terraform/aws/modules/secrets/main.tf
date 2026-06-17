resource "aws_secretsmanager_secret" "main" {
  name = "finos-ccc-integration-secret-main"
  tags = merge(var.common_tags, {
    CFIControlSet = "CCC.SecMgmt"
  })
}

resource "aws_secretsmanager_secret_version" "v1" {
  secret_id     = aws_secretsmanager_secret.main.id
  secret_string = "ccc-integration-secret-v1"
}

resource "aws_secretsmanager_secret_version" "v2" {
  secret_id     = aws_secretsmanager_secret.main.id
  secret_string = "ccc-integration-secret-v2"
  depends_on    = [aws_secretsmanager_secret_version.v1]
}

data "aws_iam_policy_document" "deny_stale_version" {
  statement {
    sid    = "DenyGetStaleVersion"
    effect = "Deny"
    principals {
      type        = "AWS"
      identifiers = ["*"]
    }
    actions   = ["secretsmanager:GetSecretValue"]
    resources = [aws_secretsmanager_secret.main.arn]
    condition {
      test     = "StringEquals"
      variable = "secretsmanager:VersionId"
      values   = [aws_secretsmanager_secret_version.v1.version_id]
    }
  }
}

resource "aws_secretsmanager_secret_policy" "deny_stale" {
  secret_arn = aws_secretsmanager_secret.main.arn
  policy     = data.aws_iam_policy_document.deny_stale_version.json
}
