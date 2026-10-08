data "aws_caller_identity" "current" {}

resource "random_password" "shared_secret" {
  length  = 48
  special = false
}

resource "aws_secretsmanager_secret" "shared" {
  name = "finos-ccc-reachability-probe-shared-secret"
  tags = merge(var.common_tags, {
    Name          = "finos-ccc-reachability-probe-shared-secret"
    CFIControlSet = "CCC.K8S"
  })
}

resource "aws_secretsmanager_secret_version" "shared" {
  secret_id     = aws_secretsmanager_secret.shared.id
  secret_string = random_password.shared_secret.result
}

locals {
  # Built by modules/probes/build.sh (Go lambda bootstrap zip).
  lambda_zip = "${path.module}/../../lambda/probe-lambda.zip"
}

resource "terraform_data" "require_lambda_zip" {
  lifecycle {
    precondition {
      condition     = fileexists(local.lambda_zip)
      error_message = "Missing ${local.lambda_zip}. Run modules/probes/build.sh before terraform apply."
    }
  }
}

resource "aws_iam_role" "lambda" {
  name = "finos-ccc-reachability-probe-lambda"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "lambda.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })
  tags = var.common_tags
}

resource "aws_iam_role_policy_attachment" "basic" {
  role       = aws_iam_role.lambda.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

resource "aws_iam_role_policy" "secret_read" {
  name = "read-shared-secret"
  role = aws_iam_role.lambda.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect   = "Allow"
      Action   = ["secretsmanager:GetSecretValue"]
      Resource = [aws_secretsmanager_secret.shared.arn]
    }]
  })
}

resource "aws_lambda_function" "probe" {
  function_name = "finos-ccc-reachability-probe"
  role          = aws_iam_role.lambda.arn
  handler       = "bootstrap"
  runtime       = "provided.al2023"
  architectures = ["x86_64"]
  filename         = local.lambda_zip
  source_code_hash = filebase64sha256(local.lambda_zip)
  timeout          = 15
  memory_size      = 256

  environment {
    variables = {
      # Fixture-only: secret also lives in Secrets Manager for rotation / external readers.
      SHARED_SECRET     = random_password.shared_secret.result
      OBSERVER_NAME     = var.observer_name
      TARGET_ALLOWLIST  = var.target_allowlist
      PORT_ALLOWLIST    = var.port_allowlist
      MAX_PROBE_TIMEOUT = "10s"
    }
  }

  depends_on = [terraform_data.require_lambda_zip]

  tags = merge(var.common_tags, {
    Name = "finos-ccc-reachability-probe"
  })
}

resource "aws_apigatewayv2_api" "probe" {
  name          = "finos-ccc-reachability-probe"
  protocol_type = "HTTP"
  tags = merge(var.common_tags, {
    Name = "finos-ccc-reachability-probe"
  })
}

resource "aws_apigatewayv2_integration" "probe" {
  api_id                 = aws_apigatewayv2_api.probe.id
  integration_type       = "AWS_PROXY"
  integration_uri        = aws_lambda_function.probe.invoke_arn
  payload_format_version = "2.0"
}

resource "aws_apigatewayv2_route" "probe" {
  api_id    = aws_apigatewayv2_api.probe.id
  route_key = "POST /v1/probes"
  target    = "integrations/${aws_apigatewayv2_integration.probe.id}"
}

resource "aws_apigatewayv2_stage" "default" {
  api_id      = aws_apigatewayv2_api.probe.id
  name        = "$default"
  auto_deploy = true
  tags        = var.common_tags
}

resource "aws_lambda_permission" "apigw" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.probe.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.probe.execution_arn}/*/*"
}
