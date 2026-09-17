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

data "archive_file" "probe" {
  type        = "zip"
  source_file = "${path.module}/../../lambda/probe.py"
  output_path = "${path.module}/../../lambda/probe.zip"
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
  function_name    = "finos-ccc-reachability-probe"
  role             = aws_iam_role.lambda.arn
  handler          = "probe.handler"
  runtime          = "python3.12"
  filename         = data.archive_file.probe.output_path
  source_code_hash = data.archive_file.probe.output_base64sha256
  timeout          = 15
  memory_size      = 256

  environment {
    variables = {
      REACHABILITY_PROBE_SECRET_ARN = aws_secretsmanager_secret.shared.arn
      REACHABILITY_PROBE_OBSERVER   = var.observer_name
    }
  }

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
